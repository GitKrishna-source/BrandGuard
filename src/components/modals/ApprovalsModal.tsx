import { useEffect, useState } from 'react';
import { createReview, listAudits, listReviews } from '../../lib/api';
import type { ApiAuditResponse, ModalProps, ReviewResponse, Role } from '../../types';

interface Props extends ModalProps { auditId?: string; reviewerRole: Role; onExportAudit: (id: string) => void }

export default function ApprovalsModal({ isOpen, onClose, auditId, reviewerRole, onExportAudit }: Props) {
  const [audits, setAudits] = useState<ApiAuditResponse[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setError('');
    listAudits().then((rows) => {
      if (!active) return;
      setAudits(rows);
      setSelectedId(rows.find((row) => row.id === auditId)?.id ?? rows[0]?.id ?? '');
    }).catch((error: Error) => { if (active) setError(error.message); });
    return () => { active = false; };
  }, [isOpen, auditId]);
  useEffect(() => {
    setReviews([]);
    if (!isOpen || !selectedId) return;
    let active = true;
    listReviews(selectedId).then((rows) => { if (active) setReviews(rows); })
      .catch((error: Error) => { if (active) setError(error.message); });
    return () => { active = false; };
  }, [isOpen, selectedId]);
  if (!isOpen) return null;
  const selected = audits.find((row) => row.id === selectedId);
  async function save(status: ReviewResponse['status']) {
    setBusy(true);
    setError('');
    try {
      const review = await createReview(selectedId, reviewerRole, status, comment.trim() || undefined);
      setReviews((rows) => [...rows, review]);
      if (status !== 'pending') setAudits((rows) => rows.map((row) => row.id === selectedId ? { ...row, status } : row));
      setComment('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to save review.');
    } finally {
      setBusy(false);
    }
  }
  const canApprove = reviewerRole === 'legal' || (reviewerRole === 'manager' && !selected?.findings.some((finding) => finding.severity === 'high'));
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4">
      <section role="dialog" aria-modal="true" aria-label="Audit reviews" className="w-full max-w-3xl max-h-[90vh] overflow-auto rounded-xl border border-slate-800 bg-[#130f20] p-6 space-y-4">
        <button className="float-right" onClick={onClose}>Close</button>
        <h2 className="text-lg font-bold">Audit reviews</h2>
        {error && <p role="alert">{error}</p>}
        {selected ? <>
          <label>Audit <select className="bg-slate-900 p-2" value={selectedId} disabled={busy} onChange={(event) => setSelectedId(event.target.value)}>
            {audits.map((row) => <option key={row.id} value={row.id}>{row.content_type} · {row.score}/100 · {row.id.slice(0, 8)}</option>)}
          </select></label>
          <p>Status · {selected.status.replace(/_/g, ' ')}</p>
          <button disabled={busy} className="text-sm text-violet-300" onClick={() => onExportAudit(selected.id)}>Export this audit</button>
          {selected.parent_audit_id && <button className="text-violet-300" disabled={busy} onClick={() => setSelectedId(selected.parent_audit_id!)}>View previous revision</button>}
          {selected.content_preview && <pre className="whitespace-pre-wrap rounded bg-slate-900 p-3">{selected.content_preview}</pre>}
          <ul>{selected.findings.map((finding, index) => <li key={index}>{finding.message} ({finding.source})</li>)}</ul>
          <h3 className="font-semibold">Review history</h3>
          <ul>{reviews.map((review) => <li key={review.id}>{review.reviewer_role} · {review.status.replace(/_/g, ' ')}{review.comment && ` · ${review.comment}`}</li>)}</ul>
          <textarea aria-label="Review comment" placeholder="Add feedback" className="w-full rounded bg-slate-900 p-3" value={comment} onChange={(event) => setComment(event.target.value)} />
          <div className="flex flex-wrap gap-4 text-violet-300">
            <button disabled={busy || !comment.trim()} onClick={() => void save('pending')}>Add comment</button>
            {reviewerRole === 'creator' && <button disabled={busy} onClick={() => void save('pending')}>Request review</button>}
            {reviewerRole !== 'creator' && <button disabled={busy} onClick={() => void save('changes_requested')}>Request changes</button>}
            {canApprove && <button disabled={busy} onClick={() => void save('approved')}>Approve revision</button>}
          </div>
        </> : <p>Run an audit to start a review.</p>}
      </section>
    </div>
  );
}
