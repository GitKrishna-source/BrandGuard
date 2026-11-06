import { useEffect, useState } from 'react';
import { Check, Copy, Download, FileText, LoaderCircle, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { downloadAuditPdf, getAuditReport, listAudits } from '../../lib/api';
import type { ApiAuditReport, ApiAuditResponse, ModalProps } from '../../types';

interface Props extends ModalProps { auditId?: string; onStartAudit: () => void }
const label = (value: string) => value.replace(/_/g, ' ').replace(/^./, (char) => char.toUpperCase());
const date = (value: string) => new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : value + 'Z').toLocaleString();

function saveFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ExportReportModal({ isOpen, onClose, auditId, onStartAudit }: Props) {
  const [audits, setAudits] = useState<ApiAuditResponse[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [report, setReport] = useState<ApiAuditReport | null>(null);
  const [format, setFormat] = useState<'report' | 'json'>('report');
  const [loadingList, setLoadingList] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoadingList(true);
    setAudits([]);
    setSelectedId('');
    setReport(null);
    setError('');
    setFormat('report');
    listAudits().then((rows) => {
      if (!active) return;
      setAudits(rows);
      setSelectedId(rows.find((row) => row.id === auditId)?.id ?? rows[0]?.id ?? '');
    }).catch(() => { if (active) setError('Could not load saved audits. Check your demo session and try again.'); })
      .finally(() => { if (active) setLoadingList(false); });
    return () => { active = false; };
  }, [isOpen, auditId, refresh]);

  useEffect(() => {
    setReport(null);
    setCopied(false);
    if (!isOpen || !selectedId) return;
    let active = true;
    setLoadingReport(true);
    setError('');
    getAuditReport(selectedId).then((data) => { if (active) setReport(data); })
      .catch(() => { if (active) setError('Could not load this report. Refresh to try again.'); })
      .finally(() => { if (active) setLoadingReport(false); });
    return () => { active = false; };
  }, [isOpen, selectedId, refresh]);

  if (!isOpen) return null;
  const json = report ? JSON.stringify(report, null, 2) : '';
  async function downloadPdf() {
    if (!report) return;
    setDownloading(true);
    setError('');
    try {
      saveFile(await downloadAuditPdf(report.audit.id), 'BrandGuard_Audit_' + report.audit.id + '.pdf');
    } catch {
      setError('PDF download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  }
  async function copyJson() {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
    } catch {
      setError('Clipboard unavailable. You can download the JSON instead.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-surface-deep/80 p-4 backdrop-blur-md">
      <section role="dialog" aria-modal="true" aria-labelledby="report-title" className="demo-glass flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl text-ink">
        <header className="flex items-start justify-between gap-4 border-b border-accent/10 p-5">
          <div className="flex gap-3"><span className="mini-icon shrink-0"><FileText className="h-4 w-4" /></span><div><h2 id="report-title" className="text-lg font-semibold text-ink">Audit report</h2><p className="mt-1 text-xs text-muted">Saved findings and recorded review decisions for one revision.</p></div></div>
          <button aria-label="Close audit report" onClick={onClose} className="rounded-lg p-1 text-muted hover:text-ink"><X className="h-5 w-5" /></button>
        </header>

        <div className="space-y-5 overflow-y-auto p-5 sm:p-6">
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-0 flex-1 space-y-2 text-xs text-muted"><span className="block">Saved audit revision</span><select value={selectedId} disabled={loadingList || downloading || !audits.length} onChange={(event) => setSelectedId(event.target.value)} className="w-full min-w-0 max-w-full rounded-xl border border-accent/20 bg-surface p-3 text-xs text-ink">
              {!audits.length && <option value="">No saved audits</option>}
              {audits.map((audit) => <option key={audit.id} value={audit.id}>{label(audit.content_type)} / {audit.score}/100 / {date(audit.created_at)} / {audit.id.slice(0, 8)}</option>)}
            </select></label>
            <button disabled={loadingList || loadingReport || downloading} onClick={() => setRefresh((value) => value + 1)} className="flex items-center gap-2 rounded-xl border border-accent/20 px-3 py-3 text-xs text-accent disabled:opacity-40"><RefreshCw className="h-4 w-4" />Refresh</button>
          </div>
          {error && <p role="alert" className="rounded-xl border border-open/30 bg-open-soft/20 p-3 text-sm text-open">{error}</p>}
          {(loadingList || loadingReport) && <p role="status" className="flex items-center gap-2 py-8 text-sm text-muted"><LoaderCircle className="h-4 w-4 animate-spin" />Loading saved report...</p>}
          {!loadingList && !error && !audits.length && <div className="rounded-2xl border border-accent/10 p-7 text-center"><FileText className="mx-auto mb-3 h-7 w-7 text-accent" /><h3 className="mb-2 font-semibold text-ink">Your first report starts with an audit.</h3><p className="mb-5 text-sm text-muted">Run an audit on your own draft, then export its actual results here.</p><button onClick={onStartAudit} className="purple-button px-4 py-2.5 text-xs font-semibold">Start an audit</button></div>}
          {report && !loadingList && !loadingReport && <>
            <div className="flex gap-2 border-b border-accent/10 pb-3">
              <button onClick={() => setFormat('report')} aria-pressed={format === 'report'} className={'rounded-lg px-3 py-2 text-xs ' + (format === 'report' ? 'bg-accent/20 text-accent' : 'text-muted')}>Report preview</button>
              <button onClick={() => setFormat('json')} aria-pressed={format === 'json'} className={'rounded-lg px-3 py-2 text-xs ' + (format === 'json' ? 'bg-accent/20 text-accent' : 'text-muted')}>JSON</button>
            </div>
            {format === 'json' ? <div><div className="mb-2 flex justify-end"><button onClick={() => void copyJson()} className="flex items-center gap-1.5 text-xs text-accent">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? 'Copied' : 'Copy JSON'}</button></div><pre className="max-h-96 overflow-auto rounded-xl border border-accent/10 bg-surface p-4 text-xs leading-6 text-accent">{json}</pre></div> : <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rule-preview"><p className="mb-2 text-xs text-muted">Automated readiness</p><p className="text-2xl font-semibold text-ink">{report.audit.score}<span className="text-sm text-muted"> / 100</span></p><p className="mt-2 text-[11px] text-muted">{report.audit.findings.length} recorded finding(s)</p></div>
                <div className="rule-preview"><p className="mb-2 text-xs text-muted">Human review</p><p className={'text-base font-semibold ' + (report.audit.status === 'approved' ? 'text-accent' : 'text-open')}>{label(report.audit.status)}</p><p className="mt-2 text-[11px] text-muted">Required: {report.required_reviewer === 'legal' ? 'Legal reviewer' : 'Manager or legal reviewer'}</p></div>
                <div className="rule-preview"><p className="mb-2 text-xs text-muted">Analysis</p><p className="text-sm text-accent">{report.automated_assessment === 'ai_review' ? 'AI review' : label(report.automated_assessment)}</p><p className="mt-2 break-words text-[11px] text-muted">{report.audit.analysis_engine}</p></div>
              </div>
              <dl className="grid gap-4 rounded-xl border border-accent/10 p-4 text-xs sm:grid-cols-2">
                {[['Audit ID', report.audit.id], ['Audited', date(report.audit.created_at)], ['Owner', report.owner || 'Not recorded'], ['Source', report.source_filename || (report.audit.content_type === 'text' ? 'Text draft' : 'Upload')], ['Policy', report.policy_snapshot?.name || 'Historical snapshot not recorded'], ['Parent revision', report.audit.parent_audit_id || 'Original audit']].map(([key, value]) => <div key={key} className="min-w-0"><dt className="mb-1 text-muted">{key}</dt><dd className="break-words text-secondary">{value}</dd></div>)}
              </dl>
              <section aria-label="Recorded findings"><h3 className="mb-3 text-sm font-semibold text-ink">Automated findings</h3>{!report.audit.findings.length && <p className="text-sm text-muted">No findings recorded. Human approval is shown separately above.</p>}<div className="space-y-3">{report.audit.findings.map((finding, index) => <article key={index} className="rule-preview space-y-2 text-xs leading-5"><p className="font-semibold text-accent">{label(finding.category)} / {finding.severity}</p><p className="text-secondary">{finding.message}</p><p className="break-words text-muted">Evidence: “{finding.evidence}”</p><p className="text-secondary">Suggestion: {finding.suggestion}</p><p className="text-muted">Source: {finding.source}</p></article>)}</div></section>
              <section aria-label="Recorded human reviews"><h3 className="mb-3 text-sm font-semibold text-ink">Human review history</h3>{!report.reviews.length && <p className="text-sm text-muted">No human reviews recorded for this revision.</p>}<div className="space-y-3">{report.reviews.map((review) => <article key={review.id} className="rule-preview space-y-2 text-xs"><p className="font-semibold text-accent">{label(review.reviewer_role)} / {label(review.status)}</p><p className="break-words text-muted">{review.reviewer_username || 'Reviewer identity not recorded'} / {date(review.created_at)}</p>{review.comment && <p className="whitespace-pre-wrap break-words text-secondary">{review.comment}</p>}</article>)}</div></section>
              <details className="rule-preview text-xs"><summary className="cursor-pointer text-accent">Saved content and text checksum</summary><p className="my-3 text-muted">Coverage: {label(report.content_coverage)}</p>{report.content_sha256 && <p className="mb-3 break-all font-sans text-[10px] text-muted">SHA-256 of saved UTF-8 text: {report.content_sha256}</p>}<pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs leading-6 text-secondary">{report.content || 'No source text retained.'}</pre></details>
              <details className="rule-preview text-xs"><summary className="cursor-pointer text-accent">Policy snapshot used for this audit</summary><pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words leading-6 text-muted">{report.policy_snapshot ? JSON.stringify(report.policy_snapshot, null, 2) : 'A historical policy snapshot is unavailable for this older audit.'}</pre></details>
              <div className="rounded-xl border border-accent/10 p-4 text-[11px] leading-5 text-muted"><ul className="list-disc space-y-1 pl-4">{report.notes.map((note) => <li key={note}>{note}</li>)}</ul><p className="mt-3">{report.audit.data_handling}</p></div>
            </>}
            <p className="text-[10px] text-muted">Report generated {date(report.generated_at)}</p>
          </>}
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-accent/10 p-4">
          <p className="flex max-w-xs items-center gap-2 text-[10px] leading-4 text-muted"><ShieldCheck className="h-3.5 w-3.5 shrink-0 text-accent" />Audit record / Automated checks and human approval are recorded separately.</p>
          {report && !loadingList && !loadingReport && <div className="flex flex-wrap gap-2">
            <button disabled={downloading} onClick={() => saveFile(new Blob([json], { type: 'application/json;charset=utf-8' }), 'BrandGuard_Audit_' + report.audit.id + '.json')} className="flex items-center gap-2 rounded-xl border border-accent/20 px-3 py-2.5 text-xs text-accent"><Download className="h-3.5 w-3.5" />Download JSON</button>
            <button disabled={downloading} onClick={() => void downloadPdf()} className="purple-button px-4 py-2.5 text-xs font-semibold disabled:opacity-50">{downloading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}Download PDF</button>
          </div>}
        </footer>
      </section>
    </div>
  );
}
