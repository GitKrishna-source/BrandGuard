import { useState } from 'react';
import { Download, FileCheck2 } from 'lucide-react';
import type { GuidelineDocumentResponse, Role } from '../types';
import { downloadGuidelinePdf, loadBootwearDemo } from '../lib/api';
import GuidelineUploadWorkflow from './GuidelineUploadWorkflow';

interface Props {
  document: GuidelineDocumentResponse | null;
  onChange: (document: GuidelineDocumentResponse | null) => void;
  role: Role;
  disabled: boolean;
  onLoadingChange: (loading: boolean) => void;
}

function summarizeSourceKind(document: GuidelineDocumentResponse): string {
  const kind = document.detected_kind;
  const avgConf =
    document.average_ocr_confidence !== null && document.average_ocr_confidence !== undefined
      ? ` (${Math.round(document.average_ocr_confidence * 100)}% avg OCR)`
      : '';
  if (kind === 'mixed_pdf') {
    return `Mixed PDF: ${document.native_page_count ?? 0} native + ${document.ocr_page_count ?? 0} OCR${avgConf}`;
  }
  if (kind === 'scanned_pdf') {
    return `Scanned PDF (OCR)${avgConf}`;
  }
  if (kind === 'image') {
    return `Image guideline (OCR)${avgConf}`;
  }
  return 'Native text PDF';
}

export default function GuidelineSourcePanel({ document, onChange, role, disabled, onLoadingChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const blocked = busy || disabled;

  async function load(task: () => Promise<GuidelineDocumentResponse>) {
    setBusy(true);
    onLoadingChange(true);
    setError('');
    try {
      onChange(await task());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load guideline source.');
    } finally {
      setBusy(false);
      onLoadingChange(false);
    }
  }

  async function download() {
    setBusy(true);
    setError('');
    try {
      const blob = await downloadGuidelinePdf(document?.id);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document?.filename || 'Bootwear_Brand_Guidelines.pdf';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to download guidelines.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Brand guidelines source" className="mx-5 my-4 space-y-3 rounded-xl border border-accent/25 bg-accent-soft/15 p-4">
      <div className="flex items-start gap-3">
        <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-ink">
              {document ? `Auditing for ${document.brand_name}` : 'Add brand guidelines to this audit'}
            </h3>
            {document && (
              <span className="rounded-full border border-accent/35 bg-surface px-2 py-0.5 text-[10px] font-medium text-accent">
                {summarizeSourceKind(document)}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {document
              ? `${document.filename} / ${document.page_count} page${document.page_count === 1 ? '' : 's'} / ${document.chunk_count} searchable passages. Edit the draft below, then run the audit for page citations and evidence checks.`
              : 'General review is active. Choose Use Bootwear PDF or upload scanned PDF/image guidelines to enable source-backed page citations.'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button disabled={blocked} onClick={() => void load(loadBootwearDemo)} className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-dark disabled:opacity-50">
          {busy ? 'Working…' : 'Use Bootwear PDF'}
        </button>
        <button disabled={blocked} onClick={() => void download()} className="flex items-center gap-2 rounded-lg border border-accent/30 px-3 py-2 text-xs text-accent disabled:opacity-50">
          <Download className="h-3.5 w-3.5" />
          {document && document.source_type && document.source_type !== 'pdf' ? 'Download guideline image' : 'Download guideline PDF'}
        </button>
        {document && (
          <button disabled={blocked} onClick={() => onChange(null)} className="rounded-lg px-3 py-2 text-xs text-secondary disabled:opacity-50">
            Return to general audit
          </button>
        )}
      </div>

      {document?.pages && document.pages.length > 0 && (
        <details className="rounded-lg border border-line bg-surface/70 p-3 text-xs">
          <summary className="cursor-pointer font-medium text-accent">
            Inspect indexed source content by page ({document.pages.length} page{document.pages.length === 1 ? '' : 's'})
          </summary>
          <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
            {document.pages.map((page) => (
              <div key={page.page} className="rounded-lg border border-line bg-surface-deep/50 p-2.5">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-accent">Page {page.page}</span>
                  <span className="rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] text-secondary">
                    {page.extraction_method === 'ocr' ? 'OCR' : 'Native PDF'}
                  </span>
                  {page.ocr_confidence !== null && page.ocr_confidence !== undefined && (
                    <span className="text-[10px] text-muted">{Math.round(page.ocr_confidence * 100)}% confidence</span>
                  )}
                </div>
                <p className="whitespace-pre-wrap break-words text-[11px] leading-relaxed text-secondary">{page.text}</p>
              </div>
            ))}
          </div>
        </details>
      )}

      <details className="text-xs text-secondary" open={role !== 'creator' && !document}>
        <summary className={role !== 'creator' ? 'cursor-pointer font-bold' : 'cursor-pointer font-medium'}>
          {role !== 'creator' ? 'Import or select scanned PDF / image guidelines and OCR' : 'Select saved brand guideline sources'}
        </summary>
        <div className="mt-3">
          <GuidelineUploadWorkflow
            role={role}
            disabled={disabled}
            activeDocument={document}
            onSelectDocument={(selected) => {
              setError('');
              onChange(selected);
            }}
            onBusyChange={onLoadingChange}
          />
        </div>
      </details>

      <p className="text-[11px] leading-relaxed text-muted">
        Bootwear data is fictional. Imported guidelines (PDF and OCR text) and audit results are retained. Relevant passages and your draft may be sent to the configured AI provider. Human review remains required.
      </p>
      {error && <p role="alert" className="text-xs text-open">{error}</p>}
    </section>
  );
}
