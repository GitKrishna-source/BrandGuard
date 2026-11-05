import { useState } from 'react';
import { Download, FileCheck2 } from 'lucide-react';
import type { GuidelineDocumentResponse, Role } from '../types';
import { downloadGuidelinePdf, importGuidelinePdf, loadBootwearDemo } from '../lib/api';

interface Props {
  document: GuidelineDocumentResponse | null;
  onChange: (document: GuidelineDocumentResponse | null) => void;
  role: Role;
  disabled: boolean;
  onLoadingChange: (loading: boolean) => void;
}

export default function GuidelineSourcePanel({ document, onChange, role, disabled, onLoadingChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [brandName, setBrandName] = useState('Bootwear');
  const blocked = busy || disabled;

  async function load(task: () => Promise<GuidelineDocumentResponse>) {
    setBusy(true);
    onLoadingChange(true);
    setError('');
    try {
      onChange(await task());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load guideline PDF.');
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
    <section aria-label="PDF brand guidelines" className="mx-5 my-4 space-y-3 rounded-xl border border-emerald-500/25 bg-emerald-950/15 p-4">
      <div className="flex items-start gap-3">
        <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white">{document ? `Auditing for ${document.brand_name}` : 'Try Bootwear, our shoe brand demo'}</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">{document
            ? `${document.filename} · ${document.page_count} pages · ${document.chunk_count} searchable passages. Findings cite the PDF evidence used.`
            : 'Load the Bootwear guideline PDF, then audit copy against its voice, terminology, product facts, and claims policy.'}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button disabled={blocked} onClick={() => void load(loadBootwearDemo)} className="rounded-lg bg-emerald-300 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-50">{busy ? 'Working…' : 'Use Bootwear PDF'}</button>
        <button disabled={blocked} onClick={() => void download()} className="flex items-center gap-2 rounded-lg border border-emerald-500/30 px-3 py-2 text-xs text-emerald-200 disabled:opacity-50"><Download className="h-3.5 w-3.5" />Download guideline PDF</button>
        {document && <button disabled={blocked} onClick={() => onChange(null)} className="rounded-lg px-3 py-2 text-xs text-slate-300 disabled:opacity-50">Return to general audit</button>}
      </div>
      {role !== 'creator' ? (
        <details className="text-xs text-slate-300">
          <summary className="cursor-pointer">Import an approved guideline PDF</summary>
          <div className="mt-3 space-y-3">
            <label className="block">Brand name<input disabled={blocked} maxLength={160} value={brandName} onChange={(event) => setBrandName(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-white" /></label>
            <label className="block">Approved source PDF<input disabled={blocked || !brandName.trim()} type="file" accept=".pdf,application/pdf" className="mt-2 block w-full" onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void load(() => importGuidelinePdf(brandName.trim(), file));
            }} /></label>
            <p className="text-slate-400">Import only a source you approve. Text-based PDFs up to 10 MB and 100 pages. Every import creates a separate, immutable source version.</p>
          </div>
        </details>
      ) : <p className="text-[11px] text-slate-400">Creators can use the demo. Manager and Legal roles can import approved guideline PDFs.</p>}
      <p className="text-[11px] leading-relaxed text-slate-500">Bootwear data is fictional. Source PDFs and audit results are retained. Relevant passages and your draft may be sent to the configured AI provider. Human review remains required.</p>
      {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
    </section>
  );
}
