import { useState } from 'react';
import { Download, Footprints, ScanText, X } from 'lucide-react';
import { downloadGuidelinePdf } from '../../lib/api';
import type { GuidelineDocumentResponse, ModalProps, Role } from '../../types';
import GuidelineUploadWorkflow from '../GuidelineUploadWorkflow';

interface Props extends ModalProps {
  onOpenAudit: () => void;
  onUseGuideline?: (document: GuidelineDocumentResponse) => void;
  onSelectGuideline?: (document: GuidelineDocumentResponse) => void;
  onOpenSignIn?: () => void;
  currentRole?: Role;
  isAuthenticated?: boolean;
  activeGuideline?: GuidelineDocumentResponse | null;
}

export default function BrandVaultModal({
  isOpen,
  onClose,
  onOpenAudit,
  onUseGuideline,
  onSelectGuideline,
  onOpenSignIn,
  currentRole = 'creator',
  isAuthenticated = false,
  activeGuideline = null,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<GuidelineDocumentResponse | null>(activeGuideline);
  if (!isOpen) return null;

  const activeDoc = selectedDoc ?? activeGuideline;

  async function download() {
    setBusy(true);
    setError('');
    try {
      const blob = await downloadGuidelinePdf(activeDoc?.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = activeDoc?.filename || 'Bootwear_Brand_Guidelines.pdf';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to download guidelines.');
    } finally {
      setBusy(false);
    }
  }

  const sections = [
    ['Voice & terminology', 'Clear, warm, grounded language. Consistent shoe and product names, with explicit wording rules.'],
    ['Catalogue & service facts', 'The fictional product sheet defines price, materials, sizes, colours, and a conditional return window.'],
    ['Claims & evidence', 'Rankings, waterproof promises, medical claims, and environmental claims require appropriate evidence.'],
    ['Visuals & accessibility', 'A defined palette and wordmark, readable text, meaningful image descriptions, and manual visual checks.'],
    ['Human review', 'Creators draft and revise; managers and authorised reviewers record decisions on each revision.'],
    ['Judge walkthrough', 'A deliberately incorrect draft, a source-consistent revision, and a step-by-step review exercise.'],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-deep/80 p-4 backdrop-blur-md">
      <div role="dialog" aria-modal="true" aria-labelledby="bootwear-vault-title" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-line bg-surface text-ink shadow-2xl">
        <div className="flex items-center justify-between border-b border-line bg-surface p-5">
          <div className="flex items-center gap-3"><Footprints className="h-6 w-6 text-accent" /><div><h2 id="bootwear-vault-title" className="font-bold text-ink">Bootwear Brand Vault</h2><p className="mt-1 text-xs text-muted">Fictional shoe brand / Hackathon demo</p></div></div>
          <button aria-label="Close brand vault" onClick={onClose} className="rounded-lg p-2 hover:bg-elevated"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-5 p-5">
          <div className="rounded-xl border border-accent/25 bg-accent-soft/20 p-5">
            <p className="text-xs font-semibold   text-accent">Made for the everyday.</p>
            <h3 className="mt-2 text-xl font-bold text-ink">One PDF. A traceable source of brand truth.</h3>
            <p className="mt-3 text-sm leading-relaxed text-secondary">Download the six-page Bootwear source book, select <strong>Use Bootwear PDF</strong> in the audit studio, or upload your own scanned PDF/image brand guidelines below with page references preserved.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button disabled={busy} onClick={() => void download()} className="flex items-center gap-2 rounded-lg border border-accent/40 px-4 py-2 text-xs text-accent disabled:opacity-50"><Download className="h-4 w-4" />{busy ? 'Downloading…' : activeDoc ? `Download ${activeDoc.filename}` : 'Download Bootwear guidelines'}</button>
              <button onClick={() => (activeDoc && onUseGuideline ? onUseGuideline(activeDoc) : onOpenAudit())} className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-dark">{activeDoc ? `Audit with ${activeDoc.brand_name}` : 'Open audit studio'}</button>
            </div>
          </div>

          <section aria-label="Scanned & OCR Guideline Sources" className="space-y-3 rounded-xl border border-accent/25 bg-surface-deep/35 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ScanText className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-semibold text-ink">Brand Guideline Sources (PDF & OCR)</h3>
              </div>
              {activeDoc && (
                <span className="rounded-full border border-accent/30 bg-accent-soft/20 px-2.5 py-0.5 text-[11px] text-accent">
                  Active: {activeDoc.brand_name} ({activeDoc.page_count} pg{activeDoc.page_count === 1 ? '' : 's'})
                </span>
              )}
            </div>

            {isAuthenticated ? (
              <GuidelineUploadWorkflow
                role={currentRole}
                activeDocument={activeDoc}
                onSelectDocument={(doc) => {
                  setSelectedDoc(doc);
                  onSelectGuideline?.(doc);
                }}
              />
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface p-3 text-xs text-secondary">
                <span>Sign in as Manager or Legal to upload scanned PDFs or guideline images and inspect extracted pages.</span>
                {onOpenSignIn && (
                  <button
                    type="button"
                    onClick={onOpenSignIn}
                    className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-dark"
                  >
                    Sign in / Switch role
                  </button>
                )}
              </div>
            )}

            {activeDoc && activeDoc.pages && activeDoc.pages.length > 0 && (
              <details className="rounded-lg border border-line bg-surface p-3 text-xs">
                <summary className="cursor-pointer font-medium text-accent">
                  Preview indexed pages for {activeDoc.brand_name} ({activeDoc.pages.length} page{activeDoc.pages.length === 1 ? '' : 's'})
                </summary>
                <div className="mt-2.5 max-h-48 space-y-2 overflow-y-auto pr-1">
                  {activeDoc.pages.map((page) => (
                    <div key={page.page} className="rounded border border-line bg-surface-deep/40 p-2">
                      <p className="mb-1 text-[11px] font-semibold text-accent">
                        Page {page.page} · {page.extraction_method === 'ocr' ? 'OCR' : 'Native PDF'}
                        {page.ocr_confidence !== null && page.ocr_confidence !== undefined ? ` (${Math.round(page.ocr_confidence * 100)}%)` : ''}
                      </p>
                      <p className="whitespace-pre-wrap break-words text-[11px] text-secondary">{page.text}</p>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </section>

          <div className="grid gap-3 sm:grid-cols-2">{sections.map(([title, description]) => <div key={title} className="rounded-xl border border-line bg-surface-deep/40 p-4"><h4 className="text-sm font-semibold text-ink">{title}</h4><p className="mt-2 text-xs leading-relaxed text-muted">{description}</p></div>)}</div>
          <p className="text-xs leading-relaxed text-muted">Bootwear and its catalogue facts are fictional approved inputs for this demo, not independently verified real-world facts. The judge exercise is excluded from the evidence index. Manager and Legal roles may import scanned PDFs, image guidelines, or text PDFs right in Brand Vault or the audit studio.</p>
          <p className="text-xs text-muted">General content audits remain available. Source-backed audits still require human review before publication.</p>
          {error && <p role="alert" className="text-xs text-open">{error}</p>}
        </div>
      </div>
    </div>
  );
}
