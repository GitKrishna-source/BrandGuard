import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileImage,
  FileText,
  LoaderCircle,
  RefreshCw,
  ScanText,
  Upload,
} from 'lucide-react';
import type {
  ExtractedPage,
  GuidelineDocumentResponse,
  GuidelineExtractionPreview,
  GuidelineProcessingStage,
  ReviewedPageInput,
  Role,
} from '../types';
import {
  extractGuidelineDocument,
  importGuidelineDocument,
  listGuidelines,
  retryGuidelinePageOcr,
} from '../lib/api';

interface Props {
  role: Role;
  disabled?: boolean;
  activeDocument?: GuidelineDocumentResponse | null;
  onSelectDocument: (document: GuidelineDocumentResponse) => void;
  onBusyChange?: (busy: boolean) => void;
  defaultBrandName?: string;
}

const MAX_UPLOAD_BYTES = 10_000_000;
const SUPPORTED_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png']);

const PIPELINE_STEPS: Array<{ key: Exclude<GuidelineProcessingStage, 'idle' | 'failed'>; label: string }> = [
  { key: 'uploading', label: 'Uploading' },
  { key: 'detecting', label: 'Detecting document type' },
  { key: 'extracting', label: 'Extracting text' },
  { key: 'ocr', label: 'OCR processing' },
  { key: 'completed', label: 'Completed' },
];

const KIND_LABELS: Record<string, string> = {
  native_pdf: 'Native PDF',
  scanned_pdf: 'Scanned PDF (OCR)',
  mixed_pdf: 'Mixed PDF (Text + OCR)',
  image: 'Image Document (OCR)',
};

function formatConfidence(conf?: number | null): string | null {
  if (conf === null || conf === undefined) return null;
  return `${Math.round(conf * 100)}% confidence`;
}

export default function GuidelineUploadWorkflow({
  role,
  disabled = false,
  activeDocument,
  onSelectDocument,
  onBusyChange,
  defaultBrandName = 'Custom Brand Guidelines',
}: Props) {
  const [brandName, setBrandName] = useState(defaultBrandName);
  const [savedDocs, setSavedDocs] = useState<GuidelineDocumentResponse[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [stage, setStage] = useState<GuidelineProcessingStage>('idle');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<GuidelineExtractionPreview | null>(null);
  const [editedPages, setEditedPages] = useState<Record<number, string>>({});
  const [retryingPage, setRetryingPage] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const isProcessing =
    saving || retryingPage !== null || stage === 'uploading' || stage === 'detecting' || stage === 'extracting' || stage === 'ocr';
  const blocked = disabled || isProcessing;

  useEffect(() => {
    onBusyChange?.(isProcessing);
  }, [isProcessing, onBusyChange]);

  useEffect(() => {
    let active = true;
    listGuidelines()
      .then((docs) => {
        if (active) setSavedDocs(docs);
      })
      .catch(() => {
        // Silent fallback when signed-out or offline; panel shows errors on interactive actions
      });
    return () => {
      active = false;
    };
  }, [activeDocument?.id]);

  async function processFile(file: File) {
    setError('');
    setPreview(null);
    setEditedPages({});
    setSelectedFile(file);

    const suffix = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() || '' : '';
    if (!SUPPORTED_EXTENSIONS.has(suffix)) {
      setStage('failed');
      setProgress(100);
      setStatusMessage('Unsupported document format.');
      setError(`Unsupported file "${file.name}". Please upload a PDF, JPG, JPEG, or PNG document.`);
      return;
    }
    if (file.size === 0) {
      setStage('failed');
      setProgress(100);
      setStatusMessage('Uploaded file is empty.');
      setError(`"${file.name}" is empty (0 bytes). Choose a readable guideline file.`);
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setStage('failed');
      setProgress(100);
      setStatusMessage('File exceeds size limit.');
      setError(`"${file.name}" exceeds the 10 MB upload limit.`);
      return;
    }

    const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
    if (baseName && (!brandName.trim() || brandName === defaultBrandName)) {
      setBrandName(baseName.slice(0, 120));
    }

    setStage('uploading');
    setProgress(5);
    setStatusMessage(`Uploading ${file.name}…`);

    try {
      const result = await extractGuidelineDocument(file, (event) => {
        setStage(event.stage);
        setProgress(event.progress);
        setStatusMessage(event.message);
      });
      const initialTexts: Record<number, string> = {};
      for (const page of result.pages) {
        initialTexts[page.page] = page.text;
      }
      setEditedPages(initialTexts);
      setPreview(result);
      setStage('completed');
      setProgress(100);
      setStatusMessage(`Extracted ${result.usable_page_count} of ${result.page_count} page(s) ready for review.`);
    } catch (cause) {
      setStage('failed');
      setProgress(100);
      const message = cause instanceof Error ? cause.message : 'Unable to extract document text.';
      setStatusMessage(message);
      setError(message);
    }
  }

  async function handleRetryPage(pageNumber: number) {
    if (!selectedFile || blocked) return;
    setRetryingPage(pageNumber);
    setError('');
    try {
      const updated: ExtractedPage = await retryGuidelinePageOcr(selectedFile, pageNumber, true);
      setPreview((current) => {
        if (!current) return null;
        const nextPages = current.pages.map((item) => (item.page === pageNumber ? updated : item));
        const usable = nextPages.filter((p) => p.text.trim().length > 0);
        const confs = usable.map((p) => p.ocr_confidence).filter((c): c is number => c !== null && c !== undefined);
        return {
          ...current,
          pages: nextPages,
          usable_page_count: usable.length,
          failed_page_count: nextPages.length - usable.length,
          low_confidence_page_count: usable.filter((p) => p.low_confidence).length,
          ocr_page_count: usable.filter((p) => p.extraction_method === 'ocr').length,
          native_page_count: usable.filter((p) => p.extraction_method === 'native_pdf').length,
          average_ocr_confidence: confs.length ? Math.round((confs.reduce((a, b) => a + b, 0) / confs.length) * 10000) / 10000 : null,
        };
      });
      setEditedPages((current) => ({ ...current, [pageNumber]: updated.text }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Failed to retry OCR on page ${pageNumber}.`);
    } finally {
      setRetryingPage(null);
    }
  }

  async function handleConfirmSave() {
    if (!selectedFile || !preview || !brandName.trim() || blocked) return;
    const reviewedPages: ReviewedPageInput[] = preview.pages
      .map((page) => ({
        page: page.page,
        text: (editedPages[page.page] ?? page.text).trim(),
        extraction_method: page.extraction_method,
        ocr_confidence: page.ocr_confidence ?? null,
      }))
      .filter((page) => page.text.length > 0);

    if (reviewedPages.length === 0) {
      setError('No readable page text is available to save. Retry OCR or enter text on at least one page.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const saved = await importGuidelineDocument(brandName.trim(), selectedFile, reviewedPages);
      setSavedDocs((prev) => [saved, ...prev.filter((d) => d.id !== saved.id)]);
      setPreview(null);
      setSelectedFile(null);
      setStage('idle');
      setEditedPages({});
      onSelectDocument(saved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save guideline document.');
    } finally {
      setSaving(false);
    }
  }

  const usableReviewedCount = preview
    ? preview.pages.filter((page) => (editedPages[page.page] ?? page.text).trim().length > 0).length
    : 0;

  const activeStageIdx =
    stage === 'idle'
      ? -1
      : stage === 'failed'
      ? -1
      : PIPELINE_STEPS.findIndex((step) => step.key === stage);

  return (
    <div className="space-y-4">
      {savedDocs.length > 0 && (
        <div className="rounded-xl border border-line bg-surface-deep/60 p-3 text-xs">
          <label className="block space-y-1.5">
            <span className="font-medium text-secondary">Saved guideline sources ({savedDocs.length})</span>
            <select
              disabled={blocked}
              value={activeDocument?.id || ''}
              onChange={(event) => {
                const chosen = savedDocs.find((item) => item.id === event.target.value);
                if (chosen) onSelectDocument(chosen);
              }}
              className="w-full rounded-lg border border-line bg-surface p-2 text-xs text-ink"
            >
              {!activeDocument && <option value="">Select a saved guideline source…</option>}
              {savedDocs.map((doc) => {
                const ocrNote = doc.ocr_page_count ? ` · ${doc.ocr_page_count} OCR` : '';
                return (
                  <option key={doc.id} value={doc.id}>
                    {doc.brand_name} — {doc.filename} ({doc.page_count} pg{doc.page_count === 1 ? '' : 's'}{ocrNote})
                  </option>
                );
              })}
            </select>
          </label>
        </div>
      )}

      {role !== 'creator' ? (
        <div className="space-y-3 rounded-xl border border-line bg-surface-deep/40 p-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ScanText className="h-4 w-4 text-accent" />
              <span className="font-semibold text-ink">Upload Scanned PDF, Text PDF, or Image Guidelines</span>
            </div>
            <span className="rounded-full border border-accent/30 bg-accent-soft/20 px-2.5 py-0.5 text-[10px] font-medium text-accent">
              PDF · JPG · JPEG · PNG (max 10 MB)
            </span>
          </div>

          <label className="block text-secondary">
            Brand or source name
            <input
              disabled={blocked}
              maxLength={160}
              value={brandName}
              onChange={(event) => setBrandName(event.target.value)}
              placeholder="e.g. Acme 2026 Brand Guidelines"
              className="mt-1 block w-full rounded-lg border border-line bg-surface p-2 text-xs text-ink"
            />
          </label>

          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-accent/35 bg-surface/60 p-4 text-center transition-colors hover:border-accent/60">
            <input
              disabled={blocked}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void processFile(file);
              }}
            />
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/25 bg-accent-soft/30 text-accent">
              {isProcessing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            </div>
            <div>
              <p className="font-medium text-ink">
                {selectedFile ? `Selected: ${selectedFile.name}` : 'Select scanned PDF, digital PDF, JPG, or PNG guideline'}
              </p>
              <p className="mt-0.5 text-[11px] text-muted">
                Automatically detects digital text pages and applies OCR to scanned pages while preserving exact page numbers.
              </p>
            </div>
          </label>

          {stage !== 'idle' && (
            <div aria-live="polite" className="space-y-2.5 rounded-xl border border-line bg-surface p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`font-semibold ${stage === 'failed' ? 'text-open' : 'text-accent'}`}>
                  {stage === 'failed' ? 'Processing Failed' : statusMessage || 'Processing document…'}
                </span>
                <span className="text-[11px] text-muted">{progress}%</span>
              </div>

              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-deep">
                <div
                  className={`h-full transition-all duration-300 ${stage === 'failed' ? 'bg-open' : 'bg-accent'}`}
                  style={{ width: `${Math.max(4, progress)}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
                {PIPELINE_STEPS.map((step, index) => {
                  const isCurrent = stage === step.key;
                  const isDone = stage === 'completed' || (activeStageIdx > index && stage !== 'failed');
                  return (
                    <div
                      key={step.key}
                      className={`rounded-md border px-2 py-1 text-[10px] font-medium ${
                        stage === 'failed' && index === 0
                          ? 'border-open/40 bg-open-soft/20 text-open'
                          : isDone
                          ? 'border-accent/40 bg-accent-soft/25 text-accent'
                          : isCurrent
                          ? 'border-accent bg-accent/15 text-ink'
                          : 'border-line bg-surface-deep/40 text-muted'
                      }`}
                    >
                      {step.label}
                    </div>
                  );
                })}
              </div>

              {stage === 'failed' && selectedFile && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={blocked}
                    onClick={() => void processFile(selectedFile)}
                    className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent-soft/20 px-3 py-1.5 text-[11px] font-medium text-accent disabled:opacity-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retry extraction
                  </button>
                </div>
              )}
            </div>
          )}

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-open/40 bg-open-soft/25 p-3 text-xs text-open">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {preview && (
            <div className="space-y-3 rounded-xl border border-accent/35 bg-surface p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line pb-3">
                <div className="flex items-start gap-2.5">
                  {preview.source_type === 'pdf' ? (
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  ) : (
                    <FileImage className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  )}
                  <div>
                    <h4 className="font-semibold text-ink">Extraction Preview — {preview.filename}</h4>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {KIND_LABELS[preview.detected_kind] || preview.detected_kind} · {preview.page_count} page{preview.page_count === 1 ? '' : 's'}
                      {preview.native_page_count > 0 && ` · ${preview.native_page_count} native PDF`}
                      {preview.ocr_page_count > 0 && ` · ${preview.ocr_page_count} OCR`}
                      {formatConfidence(preview.average_ocr_confidence) && ` · ${formatConfidence(preview.average_ocr_confidence)}`}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-accent-soft/30 px-2.5 py-0.5 text-[10px] font-semibold text-accent">
                  Review before adding
                </span>
              </div>

              {preview.duplicate_of && (
                <div className="flex items-start gap-2 rounded-lg border border-accent/35 bg-accent-soft/20 p-2.5 text-[11px] text-secondary">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                  <span>
                    Duplicate upload noticed: matches existing source <strong>{preview.duplicate_of.brand_name}</strong> ({preview.duplicate_of.filename}). Adding will create an immutable separate version.
                  </span>
                </div>
              )}

              {preview.warnings.length > 0 && (
                <div className="space-y-1 rounded-lg border border-open/35 bg-open-soft/20 p-2.5 text-[11px] text-open">
                  {preview.warnings
                    .filter((warning) => !warning.startsWith('Duplicate file detected:'))
                    .map((warning) => (
                      <p key={warning}>{warning}</p>
                    ))}
                </div>
              )}

              <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
                {preview.pages.map((page) => {
                  const currentText = editedPages[page.page] ?? page.text;
                  const confLabel = formatConfidence(page.ocr_confidence);
                  const isUnreadable = !currentText.trim() || page.status === 'unreadable' || page.status === 'failed' || page.status === 'empty';
                  return (
                    <article
                      key={page.page}
                      className={`space-y-2 rounded-lg border p-3 ${
                        isUnreadable || page.low_confidence ? 'border-open/40 bg-open-soft/10' : 'border-line bg-surface-deep/40'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-accent/20 px-2 py-0.5 text-[11px] font-bold text-accent">
                            Page {page.page}
                          </span>
                          <span className="rounded border border-line bg-surface px-2 py-0.5 text-[10px] text-secondary">
                            {page.extraction_method === 'ocr' ? 'OCR' : 'Native PDF'}
                          </span>
                          {confLabel && (
                            <span className={`text-[10px] font-medium ${page.low_confidence ? 'text-open' : 'text-muted'}`}>
                              {confLabel}
                            </span>
                          )}
                        </div>
                        {page.retryable && (
                          <button
                            type="button"
                            disabled={blocked}
                            onClick={() => void handleRetryPage(page.page)}
                            className="flex items-center gap-1 rounded border border-accent/35 px-2 py-1 text-[10px] font-medium text-accent hover:bg-accent-soft/20 disabled:opacity-50"
                          >
                            {retryingPage === page.page ? (
                              <LoaderCircle className="h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3" />
                            )}
                            Retry Enhanced OCR
                          </button>
                        )}
                      </div>

                      {page.error && <p className="text-[11px] text-open">{page.error}</p>}

                      <textarea
                        rows={3}
                        disabled={blocked}
                        aria-label={`Extracted text for page ${page.page}`}
                        value={currentText}
                        placeholder={`No text detected for Page ${page.page}. Retry OCR or enter guideline text manually if needed.`}
                        onChange={(event) =>
                          setEditedPages((current) => ({ ...current, [page.page]: event.target.value }))
                        }
                        className="w-full rounded-lg border border-line bg-surface p-2 font-sans text-xs leading-relaxed text-ink"
                      />
                    </article>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                <span className="text-[11px] text-muted">
                  {usableReviewedCount} of {preview.page_count} page{preview.page_count === 1 ? '' : 's'} with text will be indexed for auditing.
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={blocked}
                    onClick={() => {
                      setPreview(null);
                      setSelectedFile(null);
                      setStage('idle');
                      setError('');
                    }}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs text-secondary disabled:opacity-50"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    disabled={blocked || !brandName.trim() || usableReviewedCount === 0}
                    onClick={() => void handleConfirmSave()}
                    className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-xs font-semibold text-dark disabled:opacity-50"
                  >
                    {saving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    {saving ? 'Adding to Brand Sources…' : 'Confirm & Add to Brand Sources'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-[11px] text-muted">
          Creators can audit against Bootwear or approved sources. Manager and Legal roles can upload and OCR new scanned PDFs or guideline images.
        </p>
      )}
    </div>
  );
}
