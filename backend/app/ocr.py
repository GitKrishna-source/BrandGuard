from __future__ import annotations

import hashlib
import inspect
import re
import threading
from collections.abc import Iterator
from dataclasses import dataclass
from io import BytesIO
from statistics import median
from typing import Any, Literal

import pypdfium2 as pdfium
from PIL import Image, ImageEnhance, ImageOps, UnidentifiedImageError
from pypdf import PdfReader

from app.schemas import DuplicateDocumentInfo, ExtractedPage, GuidelineExtractionPreview

SourceType = Literal["pdf", "jpg", "jpeg", "png"]
DetectedKind = Literal["native_pdf", "scanned_pdf", "mixed_pdf", "image"]
ExtractionMethod = Literal["native_pdf", "ocr"]

MAX_PDF_PAGES = 100
LOW_CONFIDENCE_THRESHOLD = 0.65
NATIVE_TEXT_ALNUM_THRESHOLD = 40
NO_IMAGE_NATIVE_ALNUM_THRESHOLD = 8
DEFAULT_RENDER_DPI = 200
ENHANCED_RENDER_DPI = 280
MIN_IMAGE_LONG_EDGE = 1200
MAX_IMAGE_DIMENSION = 3200

_OCR_LOCK = threading.Lock()
_OCR_ENGINE: Any | None = None


class OcrEngineUnavailableError(RuntimeError):
    """Raised when the OCR engine or its runtime dependencies cannot be initialized."""


@dataclass
class OcrPassResult:
    text: str
    confidence: float | None
    line_count: int = 0


def normalize_extracted_text(text: str) -> str:
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.replace("\r\n", "\n").replace("\r", "\n").splitlines()]
    collapsed: list[str] = []
    previous_blank = False
    for line in lines:
        if not line:
            if collapsed and not previous_blank:
                collapsed.append("")
            previous_blank = True
            continue
        collapsed.append(line)
        previous_blank = False
    return "\n".join(collapsed).strip()


def _alnum_count(text: str) -> int:
    return sum(1 for char in text if char.isalnum())


def _configure_cls_flag(engine: Any, enabled: bool) -> None:
    if hasattr(engine, "use_angle_cls"):
        engine.use_angle_cls = enabled
    if hasattr(engine, "use_cls"):
        engine.use_cls = enabled


def _get_ocr_engine() -> Any:
    global _OCR_ENGINE
    with _OCR_LOCK:
        if _OCR_ENGINE is None:
            try:
                from rapidocr_onnxruntime import RapidOCR

                _OCR_ENGINE = RapidOCR()
                _configure_cls_flag(_OCR_ENGINE, False)
            except Exception as error:
                raise OcrEngineUnavailableError("OCR engine could not be initialized on the server.") from error
        return _OCR_ENGINE


def _page_has_images(page: Any) -> bool:
    try:
        if len(page.images) > 0:
            return True
    except Exception:
        pass
    try:
        resources = page.get("/Resources")
        if resources and "/XObject" in resources:
            xobjects = resources["/XObject"].get_object()
            for obj in xobjects.values():
                resolved = obj.get_object()
                if resolved.get("/Subtype") == "/Image":
                    return True
    except Exception:
        return False
    return False


def detect_source_type(filename: str, data: bytes) -> SourceType:
    if not data:
        raise ValueError("Uploaded file is empty.")
    clean_name = (filename or "").strip().lower()
    suffix = clean_name.rsplit(".", 1)[-1] if "." in clean_name else ""
    if suffix == "pdf":
        if not data.lstrip().startswith(b"%PDF-"):
            raise ValueError("Corrupted or invalid PDF file (missing %PDF header).")
        return "pdf"
    if suffix in {"jpg", "jpeg"}:
        if not data.startswith(b"\xff\xd8\xff"):
            raise ValueError("Corrupted or invalid JPEG image.")
        _verify_pil_image(data, {"JPEG"}, "JPEG")
        return "jpg" if suffix == "jpg" else "jpeg"
    if suffix == "png":
        if not data.startswith(b"\x89PNG\r\n\x1a\n"):
            raise ValueError("Corrupted or invalid PNG image.")
        _verify_pil_image(data, {"PNG"}, "PNG")
        return "png"
    raise ValueError("Unsupported file format. Upload a PDF, JPG, JPEG, or PNG guideline document.")


def _verify_pil_image(data: bytes, expected_formats: set[str], label: str) -> None:
    try:
        with Image.open(BytesIO(data)) as img:
            detected = (img.format or "").upper()
            img.verify()
        if expected_formats and detected not in expected_formats:
            raise ValueError(f"File content does not match {label} format.")
    except ValueError:
        raise
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError) as error:
        raise ValueError(f"Corrupted or unreadable {label} image.") from error


def _prepare_pil_image(image: Image.Image, *, enhanced: bool = False) -> Image.Image:
    oriented = ImageOps.exif_transpose(image)
    if oriented.mode in {"RGBA", "LA"} or (oriented.mode == "P" and "transparency" in oriented.info):
        rgba = oriented.convert("RGBA")
        background = Image.new("RGB", rgba.size, (255, 255, 255))
        background.paste(rgba, mask=rgba.getchannel("A"))
        rgb = background
    else:
        rgb = oriented.convert("RGB")

    width, height = rgb.size
    if width <= 0 or height <= 0:
        raise ValueError("Image has zero dimensions.")

    long_edge = max(width, height)
    target_min_long_edge = 1800 if enhanced else MIN_IMAGE_LONG_EDGE
    if long_edge < target_min_long_edge:
        scale = min(3.0 if enhanced else 2.2, target_min_long_edge / long_edge)
        new_size = (max(1, int(round(width * scale))), max(1, int(round(height * scale))))
        rgb = rgb.resize(new_size, Image.Resampling.BICUBIC)
    elif long_edge > MAX_IMAGE_DIMENSION:
        scale = MAX_IMAGE_DIMENSION / long_edge
        new_size = (max(1, int(round(width * scale))), max(1, int(round(height * scale))))
        rgb = rgb.resize(new_size, Image.Resampling.LANCZOS)

    if enhanced:
        grayscale = ImageOps.grayscale(rgb)
        contrasted = ImageOps.autocontrast(grayscale, cutoff=1)
        sharpened = ImageEnhance.Sharpness(contrasted).enhance(1.6)
        return sharpened.convert("RGB")
    return rgb


def _parse_ocr_boxes(raw_result: Any) -> OcrPassResult:
    if not raw_result:
        return OcrPassResult(text="", confidence=None, line_count=0)

    items: list[tuple[float, float, float, str, float]] = []
    for entry in raw_result:
        if not isinstance(entry, (list, tuple)) or len(entry) < 2:
            continue
        box = entry[0]
        raw_text = str(entry[1] or "").strip()
        if not raw_text:
            continue
        conf_val = entry[2] if len(entry) > 2 else None
        try:
            confidence = float(conf_val) if conf_val is not None else 0.85
        except (TypeError, ValueError):
            confidence = 0.85
        confidence = min(1.0, max(0.0, confidence))
        try:
            xs = [float(point[0]) for point in box]
            ys = [float(point[1]) for point in box]
            min_x = min(xs)
            min_y = min(ys)
            max_y = max(ys)
            center_y = (min_y + max_y) / 2.0
            height = max(8.0, max_y - min_y)
        except Exception:
            min_x = 0.0
            center_y = float(len(items) * 20)
            height = 16.0
        items.append((center_y, min_x, height, raw_text, confidence))

    if not items:
        return OcrPassResult(text="", confidence=None, line_count=0)

    items.sort(key=lambda item: (item[0], item[1]))
    typical_height = median(item[2] for item in items)
    line_tolerance = max(8.0, typical_height * 0.65)

    lines: list[list[tuple[float, float, float, str, float]]] = []
    line_y_anchors: list[float] = []
    for item in items:
        center_y = item[0]
        if lines and abs(center_y - line_y_anchors[-1]) <= line_tolerance:
            lines[-1].append(item)
            line_y_anchors[-1] = sum(elem[0] for elem in lines[-1]) / len(lines[-1])
        else:
            lines.append([item])
            line_y_anchors.append(center_y)

    rendered_lines: list[str] = []
    weighted_sum = 0.0
    total_chars = 0
    for line in lines:
        line.sort(key=lambda elem: elem[1])
        joined = " ".join(elem[3] for elem in line).strip()
        if not joined:
            continue
        rendered_lines.append(joined)
        for elem in line:
            weight = max(1, len(elem[3]))
            weighted_sum += elem[4] * weight
            total_chars += weight

    text = normalize_extracted_text("\n".join(rendered_lines))
    avg_conf = round(weighted_sum / total_chars, 4) if total_chars > 0 else None
    return OcrPassResult(text=text, confidence=avg_conf, line_count=len(rendered_lines))


def _pil_to_bgr_array(np_module: Any, image: Image.Image) -> Any:
    rgb_array = np_module.asarray(image, dtype=np_module.uint8)
    # RapidOCR's LoadImage treats ndarray inputs as OpenCV BGR rather than RGB.
    return np_module.ascontiguousarray(rgb_array[..., ::-1])


def _invoke_ocr(engine: Any, image_array: Any, *, use_angle_cls: bool = False) -> OcrPassResult:
    with _OCR_LOCK:
        prev_angle_cls = getattr(engine, "use_angle_cls", None)
        prev_cls = getattr(engine, "use_cls", None)
        _configure_cls_flag(engine, use_angle_cls)
        try:
            try:
                params = inspect.signature(engine).parameters
            except (TypeError, ValueError):
                params = {}
            if "use_cls" in params:
                raw_result, _ = engine(image_array, use_cls=use_angle_cls)
            else:
                raw_result, _ = engine(image_array)
        finally:
            if hasattr(engine, "use_angle_cls") and prev_angle_cls is not None:
                engine.use_angle_cls = prev_angle_cls
            if hasattr(engine, "use_cls") and prev_cls is not None:
                engine.use_cls = prev_cls
    return _parse_ocr_boxes(raw_result)


def run_ocr_on_pil(image: Image.Image, *, enhanced: bool = False) -> OcrPassResult:
    try:
        import numpy as np
    except Exception as error:
        raise OcrEngineUnavailableError("OCR numerical dependency (numpy) is not installed on the server.") from error

    engine = _get_ocr_engine()
    prepared = _prepare_pil_image(image, enhanced=enhanced)
    primary = _invoke_ocr(engine, _pil_to_bgr_array(np, prepared), use_angle_cls=False)

    # Automatically try an enhanced + orientation-aware pass when upright OCR finds nothing or reads poorly.
    if _alnum_count(primary.text) == 0 or (primary.confidence is not None and primary.confidence < 0.55):
        enhanced_img = _prepare_pil_image(image, enhanced=True) if not enhanced else prepared
        secondary = _invoke_ocr(engine, _pil_to_bgr_array(np, enhanced_img), use_angle_cls=True)
        if _pick_better_ocr_result(primary, secondary) is secondary:
            return secondary
    return primary


def _pick_better_ocr_result(first: OcrPassResult, second: OcrPassResult) -> OcrPassResult:
    first_chars = _alnum_count(first.text)
    second_chars = _alnum_count(second.text)
    if second_chars == 0:
        return first
    if first_chars == 0:
        return second
    if second_chars > first_chars * 1.25:
        return second
    first_conf = first.confidence or 0.0
    second_conf = second.confidence or 0.0
    if second_chars >= int(first_chars * 0.85) and second_conf > first_conf + 0.05:
        return second
    return first


def _open_pdf_reader(data: bytes) -> PdfReader:
    try:
        reader = PdfReader(BytesIO(data))
    except Exception as error:
        raise ValueError("Corrupted or unreadable PDF document.") from error
    if reader.is_encrypted:
        raise ValueError("Encrypted PDFs are not supported. Upload an unencrypted PDF.")
    page_count = len(reader.pages)
    if page_count < 1:
        raise ValueError("PDF contains no pages.")
    if page_count > MAX_PDF_PAGES:
        raise ValueError(f"PDF has {page_count} pages, exceeding the {MAX_PDF_PAGES}-page limit.")
    return reader


def _render_pdfium_page(pdfium_doc: Any, page_index: int, *, dpi: int) -> Image.Image:
    page = pdfium_doc[page_index]
    bitmap = None
    try:
        bitmap = page.render(scale=dpi / 72.0)
        return bitmap.to_pil().copy()
    finally:
        if bitmap is not None:
            try:
                bitmap.close()
            except Exception:
                pass
        try:
            page.close()
        except Exception:
            pass


def _build_ocr_page(
    page_number: int,
    ocr_result: OcrPassResult,
    *,
    has_images: bool,
    fallback_native_text: str = "",
) -> ExtractedPage:
    text = ocr_result.text
    if _alnum_count(text) == 0 and _alnum_count(fallback_native_text) >= NO_IMAGE_NATIVE_ALNUM_THRESHOLD:
        return ExtractedPage(
            page=page_number,
            text=fallback_native_text,
            extraction_method="native_pdf",
            ocr_confidence=None,
            low_confidence=False,
            status="extracted",
            error=None,
            has_images=has_images,
            char_count=len(fallback_native_text),
            retryable=has_images,
        )

    if _alnum_count(text) == 0:
        status: Literal["unreadable", "empty"] = "unreadable" if has_images else "empty"
        return ExtractedPage(
            page=page_number,
            text="",
            extraction_method="ocr",
            ocr_confidence=None,
            low_confidence=False,
            status=status,
            error=(
                "No readable text could be extracted from this page. "
                "It may be blank, very blurry, or low resolution. Try Retry Enhanced OCR."
            ),
            has_images=has_images,
            char_count=0,
            retryable=True,
        )

    conf = ocr_result.confidence
    is_low = conf is not None and conf < LOW_CONFIDENCE_THRESHOLD
    warning = (
        f"Low OCR confidence ({round(conf * 100)}%). Review text or retry with enhanced OCR."
        if is_low and conf is not None
        else None
    )
    return ExtractedPage(
        page=page_number,
        text=text,
        extraction_method="ocr",
        ocr_confidence=conf,
        low_confidence=is_low,
        status="low_confidence" if is_low else "extracted",
        error=warning,
        has_images=has_images,
        char_count=len(text),
        retryable=True,
    )


def _should_use_native_directly(native_text: str, has_images: bool) -> bool:
    alnum = _alnum_count(native_text)
    if alnum >= NATIVE_TEXT_ALNUM_THRESHOLD:
        return True
    if not has_images and alnum >= NO_IMAGE_NATIVE_ALNUM_THRESHOLD:
        return True
    return False


def _extract_pdf_page(
    reader_page: Any,
    pdfium_doc: Any,
    page_number: int,
    *,
    force_ocr: bool = False,
    enhanced: bool = False,
) -> ExtractedPage:
    try:
        native_text = normalize_extracted_text(reader_page.extract_text() or "")
    except Exception:
        native_text = ""
    has_images = _page_has_images(reader_page)

    if not force_ocr and _should_use_native_directly(native_text, has_images):
        return ExtractedPage(
            page=page_number,
            text=native_text,
            extraction_method="native_pdf",
            ocr_confidence=None,
            low_confidence=False,
            status="extracted",
            error=None,
            has_images=has_images,
            char_count=len(native_text),
            retryable=has_images,
        )

    dpi = ENHANCED_RENDER_DPI if enhanced else DEFAULT_RENDER_DPI
    try:
        rendered = _render_pdfium_page(pdfium_doc, page_number - 1, dpi=dpi)
        ocr_res = run_ocr_on_pil(rendered, enhanced=enhanced)
    except OcrEngineUnavailableError:
        raise
    except Exception as error:
        if _alnum_count(native_text) >= NO_IMAGE_NATIVE_ALNUM_THRESHOLD:
            return ExtractedPage(
                page=page_number,
                text=native_text,
                extraction_method="native_pdf",
                ocr_confidence=None,
                low_confidence=False,
                status="extracted",
                error=None,
                has_images=has_images,
                char_count=len(native_text),
                retryable=True,
            )
        return ExtractedPage(
            page=page_number,
            text="",
            extraction_method="ocr",
            ocr_confidence=None,
            low_confidence=False,
            status="failed",
            error=f"OCR processing failed on page {page_number}: {error}",
            has_images=has_images,
            char_count=0,
            retryable=True,
        )

    native_alnum = _alnum_count(native_text)
    ocr_alnum = _alnum_count(ocr_res.text)
    if not force_ocr and native_alnum >= 12 and ocr_alnum <= native_alnum + 20:
        return ExtractedPage(
            page=page_number,
            text=native_text,
            extraction_method="native_pdf",
            ocr_confidence=None,
            low_confidence=False,
            status="extracted",
            error=None,
            has_images=has_images,
            char_count=len(native_text),
            retryable=has_images,
        )

    return _build_ocr_page(page_number, ocr_res, has_images=has_images, fallback_native_text=native_text)


def extract_single_page(
    data: bytes,
    filename: str,
    page_number: int,
    *,
    enhanced: bool = True,
) -> ExtractedPage:
    source_type = detect_source_type(filename, data)
    if source_type in {"jpg", "jpeg", "png"}:
        if page_number != 1:
            raise ValueError("Image guidelines have only page 1.")
        with Image.open(BytesIO(data)) as img:
            ocr_res = run_ocr_on_pil(img, enhanced=enhanced)
        return _build_ocr_page(1, ocr_res, has_images=True)

    reader = _open_pdf_reader(data)
    if not 1 <= page_number <= len(reader.pages):
        raise ValueError(f"Page {page_number} is out of range (1 to {len(reader.pages)}).")
    pdfium_doc = pdfium.PdfDocument(data)
    try:
        return _extract_pdf_page(reader.pages[page_number - 1], pdfium_doc, page_number, force_ocr=True, enhanced=enhanced)
    finally:
        try:
            pdfium_doc.close()
        except Exception:
            pass


def build_preview(
    filename: str,
    sha256: str,
    source_type: SourceType,
    pages: list[ExtractedPage],
    duplicate_of: DuplicateDocumentInfo | None = None,
) -> GuidelineExtractionPreview:
    methods: list[ExtractionMethod] = []
    for method in ("native_pdf", "ocr"):
        if any(page.extraction_method == method and _alnum_count(page.text) > 0 for page in pages):
            methods.append(method)
    if not methods and pages:
        methods = [pages[0].extraction_method]

    native_pages = sum(1 for page in pages if page.extraction_method == "native_pdf" and _alnum_count(page.text) > 0)
    ocr_pages = sum(1 for page in pages if page.extraction_method == "ocr" and _alnum_count(page.text) > 0)
    usable_pages = sum(1 for page in pages if _alnum_count(page.text) > 0)
    failed_pages = sum(1 for page in pages if page.status in {"unreadable", "empty", "failed"} or _alnum_count(page.text) == 0)
    low_conf_pages = sum(1 for page in pages if page.low_confidence and _alnum_count(page.text) > 0)

    ocr_confidences = [page.ocr_confidence for page in pages if page.ocr_confidence is not None and _alnum_count(page.text) > 0]
    avg_conf = round(sum(ocr_confidences) / len(ocr_confidences), 4) if ocr_confidences else None

    if source_type in {"jpg", "jpeg", "png"}:
        detected_kind: DetectedKind = "image"
    elif ocr_pages > 0 and native_pages > 0:
        detected_kind = "mixed_pdf"
    elif ocr_pages > 0 or (usable_pages == 0 and any(page.extraction_method == "ocr" for page in pages)):
        detected_kind = "scanned_pdf"
    else:
        detected_kind = "native_pdf"

    warnings: list[str] = []
    if duplicate_of is not None:
        warnings.append(
            f"Duplicate file detected: matches existing guideline '{duplicate_of.brand_name}' ({duplicate_of.filename})."
        )
    if failed_pages > 0:
        failed_nums = ", ".join(str(page.page) for page in pages if _alnum_count(page.text) == 0)
        warnings.append(f"No readable text found on page(s): {failed_nums}. Review or retry OCR.")
    if low_conf_pages > 0:
        low_nums = ", ".join(str(page.page) for page in pages if page.low_confidence and _alnum_count(page.text) > 0)
        warnings.append(f"Low OCR confidence on page(s): {low_nums}. Review extracted text carefully.")

    clean_name = (filename or "document").replace("\\", "/").rsplit("/", 1)[-1][:240]
    return GuidelineExtractionPreview(
        filename=clean_name,
        sha256=sha256,
        source_type=source_type,
        detected_kind=detected_kind,
        page_count=len(pages),
        usable_page_count=usable_pages,
        failed_page_count=failed_pages,
        low_confidence_page_count=low_conf_pages,
        native_page_count=native_pages,
        ocr_page_count=ocr_pages,
        extraction_methods=methods,
        average_ocr_confidence=avg_conf,
        warnings=warnings,
        duplicate_of=duplicate_of,
        pages=pages,
    )


def iter_extract_guideline_document(
    data: bytes,
    filename: str,
    *,
    duplicate_of: DuplicateDocumentInfo | None = None,
    excluded_pages: set[int] | None = None,
) -> Iterator[dict[str, Any]]:
    yield {
        "stage": "detecting",
        "progress": 10,
        "message": "Detecting document type and validating file structure...",
    }
    source_type = detect_source_type(filename, data)
    sha256 = hashlib.sha256(data).hexdigest()

    if source_type in {"jpg", "jpeg", "png"}:
        yield {
            "stage": "ocr",
            "page": 1,
            "total_pages": 1,
            "method": "ocr",
            "progress": 45,
            "message": f"Applying OCR to {source_type.upper()} image...",
        }
        try:
            with Image.open(BytesIO(data)) as img:
                ocr_res = run_ocr_on_pil(img, enhanced=False)
            page = _build_ocr_page(1, ocr_res, has_images=True)
        except OcrEngineUnavailableError:
            raise
        except Exception as error:
            page = ExtractedPage(
                page=1,
                text="",
                extraction_method="ocr",
                ocr_confidence=None,
                low_confidence=False,
                status="failed",
                error=f"OCR processing failed: {error}",
                has_images=True,
                char_count=0,
                retryable=True,
            )
        preview = build_preview(filename, sha256, source_type, [page], duplicate_of=duplicate_of)
        yield {
            "stage": "completed",
            "progress": 100,
            "message": "OCR extraction completed.",
            "result": preview.model_dump(),
        }
        return

    reader = _open_pdf_reader(data)
    total_pages = len(reader.pages)
    skip = excluded_pages or set()
    pages: list[ExtractedPage] = []
    pdfium_doc = None
    try:
        for index, reader_page in enumerate(reader.pages, start=1):
            if index in skip:
                continue
            try:
                native_text = normalize_extracted_text(reader_page.extract_text() or "")
            except Exception:
                native_text = ""
            has_images = _page_has_images(reader_page)
            pct = 15 + int((index - 1) / max(1, total_pages) * 75)

            if _should_use_native_directly(native_text, has_images):
                yield {
                    "stage": "extracting",
                    "page": index,
                    "total_pages": total_pages,
                    "method": "native_pdf",
                    "progress": pct,
                    "message": f"Extracted selectable text from page {index} of {total_pages}.",
                }
                pages.append(
                    ExtractedPage(
                        page=index,
                        text=native_text,
                        extraction_method="native_pdf",
                        ocr_confidence=None,
                        low_confidence=False,
                        status="extracted",
                        error=None,
                        has_images=has_images,
                        char_count=len(native_text),
                        retryable=has_images,
                    )
                )
            else:
                yield {
                    "stage": "ocr",
                    "page": index,
                    "total_pages": total_pages,
                    "method": "ocr",
                    "progress": pct,
                    "message": f"Running OCR on scanned page {index} of {total_pages}...",
                }
                if pdfium_doc is None:
                    pdfium_doc = pdfium.PdfDocument(data)
                pages.append(_extract_pdf_page(reader_page, pdfium_doc, index, force_ocr=False, enhanced=False))
    finally:
        if pdfium_doc is not None:
            try:
                pdfium_doc.close()
            except Exception:
                pass

    preview = build_preview(filename, sha256, source_type, pages, duplicate_of=duplicate_of)
    yield {
        "stage": "completed",
        "progress": 100,
        "message": "Document extraction completed.",
        "result": preview.model_dump(),
    }


def extract_guideline_document(
    data: bytes,
    filename: str,
    *,
    duplicate_of: DuplicateDocumentInfo | None = None,
    excluded_pages: set[int] | None = None,
) -> GuidelineExtractionPreview:
    last_result: dict[str, Any] | None = None
    for event in iter_extract_guideline_document(
        data,
        filename,
        duplicate_of=duplicate_of,
        excluded_pages=excluded_pages,
    ):
        if event.get("stage") == "completed":
            last_result = event["result"]
    if last_result is None:
        raise ValueError("Unable to extract document content.")
    return GuidelineExtractionPreview(**last_result)


def extract_document_text_with_ocr(filename: str, data: bytes) -> str:
    """Extract readable draft text from uploaded PDFs or images, using OCR when PDF pages lack digital text."""
    preview = extract_guideline_document(data, filename)
    usable = [f"[Page {page.page}]\n{page.text}" for page in preview.pages if _alnum_count(page.text) > 0]
    if not usable:
        raise ValueError("No readable text could be extracted from the uploaded document.")
    return "\n\n".join(usable)
