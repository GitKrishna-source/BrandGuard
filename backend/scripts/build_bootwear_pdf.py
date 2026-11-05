"""Rebuild the fictional Bootwear guideline source and its judge handout."""

from pathlib import Path
from shutil import copyfile
from xml.sax.saxutils import escape

import reportlab
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output" / "pdf" / "bootwear-brand-guidelines.pdf"
ASSET = ROOT / "backend" / "app" / "assets" / OUT.name
INK = colors.HexColor("#142D27")
SAGE = colors.HexColor("#DCE6D5")
STONE = colors.HexColor("#F3EFE7")
CLAY = colors.HexColor("#C66B46")
font_dir = Path(reportlab.__file__).parent / "fonts"
pdfmetrics.registerFont(TTFont("BootBody", str(font_dir / "Vera.ttf")))
pdfmetrics.registerFont(TTFont("BootBold", str(font_dir / "VeraBd.ttf")))
pdfmetrics.registerFontFamily("BootBody", normal="BootBody", bold="BootBold")
BODY = ParagraphStyle("body", fontName="BootBody", fontSize=10, leading=15,
                      textColor=INK, spaceAfter=10)
SMALL = ParagraphStyle("small", parent=BODY, fontSize=8, leading=12,
                       textColor=colors.HexColor("#52645B"))
TITLE = ParagraphStyle("title", parent=BODY, fontName="BootBold", fontSize=33,
                       leading=39, spaceAfter=22)
HEAD = ParagraphStyle("head", parent=BODY, fontName="BootBold", fontSize=13,
                      leading=19, spaceBefore=16, spaceAfter=8, keepWithNext=True)
RULE = ParagraphStyle("rule", parent=BODY, fontName="BootBold", fontSize=9.2,
                      leading=14, backColor=STONE, borderPadding=9,
                      spaceBefore=5, spaceAfter=14)


def p(text, style=BODY):
    return Paragraph(escape(text), style)


def section(number, title, intro):
    return [p(f"BOOTWEAR / BRAND SOURCE / {number}", SMALL), p(title, TITLE), p(intro)]


def block(code, title, text, rules=()):
    items = [p(f"{code} / {title}", HEAD), p(text)]
    items.extend(p(line, RULE) for line in rules)
    return items


def build():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    ASSET.parent.mkdir(parents=True, exist_ok=True)
    story = [p("BRANDGUARD / FICTIONAL DEMO BRAND", SMALL), Spacer(1, 38),
             p("BOOTWEAR", ParagraphStyle("wordmark", parent=TITLE, fontSize=48, leading=56)),
             p("Made for the everyday.", ParagraphStyle("strap", parent=TITLE, fontSize=25, leading=32)),
             Spacer(1, 16), p("Brand guidelines & approved source book", HEAD),
             p("A practical source of truth for shoe copy, claims, visuals, and human review."),
             Spacer(1, 22), p("VERSION 1.0 / 05 NOVEMBER 2026", RULE),
             p("Fictional hackathon material. Bootwear, its catalogue, prices, policies, and source "
               "records in this document are invented for a controlled demonstration. They are "
               "approved inputs within this demo, not verified real-world facts.", BODY),
             Spacer(1, 22)]
    story += block("BW-01", "How to use this source", "Audit the draft against these written rules. "
                   "Use only relevant passages and cite the PDF page and passage. Missing evidence "
                   "means clarification is needed; it does not prove a claim false. A passing AI "
                   "score never replaces a human approval.")
    story += [PageBreak()]
    story += section("02", "Voice, words & purpose", "Bootwear is a fictional everyday shoe brand. "
                     "Its purpose is to make daily footwear choices feel simple, practical, and welcoming.")
    story += block("BW-02", "Voice and tone", "Use clear, warm, grounded language. Explain the product "
                   "without shaming a wearer, exaggerating performance, or implying medical benefits. "
                   "Prefer short sentences and helpful descriptions over pressure and hype.",
                   ["TONE: dirt cheap => fairly priced"])
    story += block("BW-03", "Approved terminology", "Use the product and category names consistently. "
                   "The name is Bootwear; the product is Bootwear Everyday. The term replacements below "
                   "are language rules, not permission to invent a new product benefit.",
                   ["TERM: kicks => shoes", "TERM: shoe addicts => shoe enthusiasts"])
    story += block("BW-04", "Positioning and messaging", "Bootwear Everyday is for everyday walking. "
                   "Do not position it as racing equipment. Other brands may be mentioned fairly; "
                   "this policy does not ban third-party names. Comparisons still need evidence.",
                   ["MESSAGING: performance racing shoes => everyday walking shoes"])
    story += [PageBreak()]
    story += section("03", "The demo factsheet", "These are the only catalogue and service statements "
                     "approved for this fictional demo. Do not extend them into broader guarantees.")
    story += block("BW-05", "Product and price", "Source record: fictional Bootwear product sheet, "
                   "BW-CATALOG-01, version 1.0. All prices use INR; do not invent a discount or another currency.",
                   ["FACT: Bootwear Everyday is an everyday walking shoe.",
                    "FACT: Bootwear Everyday costs INR 2,499."])
    story += block("BW-06", "Materials, sizes and colours", "Source record: fictional product sheet "
                   "BW-CATALOG-01. A rubber outsole does not establish waterproof construction. "
                   "Textile does not establish recycled content or a sustainability certification.",
                   ["FACT: Bootwear Everyday has a textile upper and a rubber outsole.",
                    "FACT: Bootwear Everyday comes in sizes UK 6 to UK 11.",
                    "FACT: Bootwear Everyday comes in Slate, Sand, and Forest."])
    story += block("BW-07", "Returns", "Source record: fictional service policy BW-RETURNS-01. "
                   "Preserve both the unworn condition and the delivery-based window. Do not claim "
                   "a 30-day return period, free returns, or guaranteed delivery dates.",
                   ["FACT: Bootwear accepts unworn shoes within 14 days of delivery."])
    story += [PageBreak()]
    story += section("04", "Claims need evidence", "Do not turn a missing source into a fabricated "
                     "replacement claim. Ask for clarification or remove the unsupported assertion while "
                     "preserving the creator's purpose.")
    story += block("BW-08", "Waterproof and medical claims", "No supplied test establishes that Bootwear "
                   "Everyday is waterproof, 100% waterproof, orthopaedic, pain-relieving, or a cure for foot pain. "
                   "A comfort-oriented tone is not medical evidence. Request a relevant test or approved "
                   "clinical evidence before making these claims. Do not replace a cure claim with another "
                   "unverified health benefit.")
    story += block("BW-09", "Rankings and comparisons", "No supplied evidence establishes number 1, #1, "
                   "best in the world, fastest, or superior-to-every-competitor rankings. Request the "
                   "measurement, market, study source, and timeframe. Do not assume a comparison is "
                   "prohibited merely because it names another brand.")
    story += block("BW-10", "Environmental and absolute promises", "No recycled-material percentage, "
                   "carbon-neutral certification, lifetime durability, or zero-defect guarantee is supplied. "
                   "The catalogue's material description does not establish those claims. Claims such as "
                   "100% sustainable or lasts forever need appropriate supporting evidence.")
    story += block("BW-11", "Correct facts without changing meaning", "If a draft gives a price or return "
                   "window different from this source, explain the discrepancy and cite the factsheet. "
                   "A suggested correction must retain material conditions. Do not turn 'unworn shoes "
                   "within 14 days of delivery' into an unconditional refund promise.")
    story += [PageBreak()]
    story += section("05", "Visuals & accessibility", "Apply these rules to creative assets. "
                     "Text-only extraction cannot establish the original PDF layout, image contrast, "
                     "logo positioning, or accessibility of a finished design.")
    story += block("BW-12", "Brand palette and wordmark", "Use the BOOTWEAR wordmark without stretching "
                   "or rotating it. Allow clear space at least the height of its B. Use Forest Ink for "
                   "core text, Stone for light backgrounds, Sage for supporting surfaces, and Clay for accents. "
                   "Product photographs may contain natural colours outside the palette.",
                   ["PALETTE: #142D27, #F3EFE7, #DCE6D5, #C66B46"])
    story += block("BW-13", "Legibility and meaning", "Keep text readable at its intended display size. "
                   "Review text/background contrast and avoid placing key copy on busy photographs. "
                   "Do not use colour alone to communicate a warning, size availability, or approval.")
    story += block("BW-14", "Image descriptions", "Give meaningful product images descriptive alternative "
                   "text. Example: 'Bootwear Everyday shoe in Forest, side view.' Do not put unverified "
                   "claims into alt text. Mark purely decorative graphics as decorative.")
    story += block("BW-15", "Human publishing gate", "Creators may draft and revise. Managers review "
                   "ordinary copy. Legal or authorised reviewers decide high-risk factual, health, or "
                   "promotional claims. Record the comment and decision on the specific revision. A score "
                   "of 100 does not authorise publication.")
    story += [PageBreak()]
    story += section("06", "Judge walkthrough", "This page is an evaluation exercise, not additional "
                     "approved brand evidence. Deliberately incorrect draft wording is identified below.")
    story += block("BW-16", "Step 1 - load the source", "Open the Bootwear demo in BrandGuard, download "
                   "this PDF, and use the bundled source or import it as a Manager or Legal reviewer. "
                   "The app extracts page-labelled passages and retrieves relevant ones for each draft.")
    story += block("BW-17", "Step 2 - audit this deliberately incorrect draft", "Bootwear Everyday is "
                   "the #1 performance racing shoe. These kicks are 100% waterproof and cure foot pain. "
                   "Buy them for INR 1,999 with returns on worn shoes for 30 days.")
    story += block("BW-18", "Expected review questions", "Check the product positioning and terminology "
                   "against page 2; the price and conditional return policy against page 3; and the ranking, "
                   "waterproof, and medical promises against page 4. Findings should cite retrieved PDF "
                   "passages. Ask for missing evidence instead of manufacturing a replacement fact.")
    story += block("BW-19", "Step 3 - test this source-consistent revision", "Bootwear Everyday is an "
                   "everyday walking shoe. Bootwear Everyday costs INR 2,499. Bootwear accepts unworn "
                   "shoes within 14 days of delivery.")
    story += block("BW-20", "Step 4 - review the evidence and decision", "Compare the retrieved passages "
                   "and actual findings. Save a revision and re-audit it, then obtain the required human "
                   "review. Download the audit report to inspect the saved source excerpts and review trail. "
                   "Source-consistent wording is not independent verification of this fictional brand.")

    def page(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(INK)
        canvas.rect(0, A4[1] - 10, A4[0], 10, fill=1, stroke=0)
        canvas.setFillColor(CLAY)
        canvas.rect(42, A4[1] - 37, 27, 4, fill=1, stroke=0)
        canvas.setFont("BootBody", 7)
        canvas.setFillColor(INK)
        canvas.drawString(44, 27, "BOOTWEAR / FICTIONAL HACKATHON SOURCE / V1.0")
        canvas.drawRightString(A4[0] - 44, 27, f"Page {doc.page}")
        canvas.restoreState()

    SimpleDocTemplate(str(OUT), pagesize=A4, leftMargin=46, rightMargin=46,
                      topMargin=55, bottomMargin=50, title="Bootwear Brand Guidelines - Fictional Demo",
                      author="BrandGuard / Bootwear Demo").build(story, onFirstPage=page, onLaterPages=page)
    copyfile(OUT, ASSET)
    print(OUT)


if __name__ == "__main__":
    build()
