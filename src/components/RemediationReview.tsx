import { useState } from 'react';
import type { RemediateResponse } from '../types';
import { applyRemediationEdits } from '../lib/remediation';

interface Props {
  proposal: RemediateResponse;
  disabled: boolean;
  onUse: (content: string, acceptedCount: number) => void;
  onDismiss: () => void;
}

export default function RemediationReview({ proposal, disabled, onUse, onDismiss }: Props) {
  const [decisions, setDecisions] = useState<Record<string, 'accepted' | 'rejected'>>({});
  const accepted = new Set(proposal.edits.filter((edit) => decisions[edit.id] === 'accepted').map((edit) => edit.id));
  const preview = applyRemediationEdits(proposal.original, proposal.edits, accepted);
  const pending = proposal.edits.filter((edit) => !decisions[edit.id]).length;

  return (
    <section aria-label="Review Auto-Fix edits" className="rounded-xl border border-accent/35 bg-accent-soft/15 p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">Review proposed edits</h3>
          <p className="mt-1 text-xs leading-relaxed text-secondary">Your draft stays unchanged until you use accepted edits. Review each change for meaning and evidence.</p>
        </div>
        <button type="button" disabled={disabled} onClick={onDismiss} className="text-xs text-secondary hover:text-ink disabled:opacity-50">Discard review</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="min-w-0 rounded-lg border border-line bg-surface p-3">
          <h4 className="text-[11px] font-semibold text-muted mb-2">Before</h4>
          <p className="text-xs leading-relaxed whitespace-pre-wrap break-words text-secondary">{proposal.original}</p>
        </div>
        <div className="min-w-0 rounded-lg border border-accent/30 bg-surface p-3">
          <h4 className="text-[11px] font-semibold text-accent mb-2">Proposed after · all edits</h4>
          <p className="text-xs leading-relaxed whitespace-pre-wrap break-words text-secondary">{proposal.fixed_content}</p>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-secondary">{proposal.changes_summary}</p>
      <p className="text-[11px] leading-relaxed text-muted">Proposed by: {proposal.analysis_engine}. {proposal.data_handling}</p>
      {proposal.edits.length === 0 ? (
        <p role="status" className="rounded-lg border border-line p-3 text-xs text-secondary">No automatic edits were proposed. Your draft is unchanged; unresolved findings may need manual revision.</p>
      ) : (
        <>
          <ol className="space-y-3">
            {proposal.edits.map((edit, index) => (
              <li key={edit.id} className="rounded-lg border border-line bg-surface p-3 space-y-3">
                <div className="flex flex-wrap justify-between gap-2 text-[11px]">
                  <span className="font-semibold text-ink">Edit {index + 1}</span>
                  <span className={decisions[edit.id] === 'accepted' ? 'text-accent' : 'text-muted'}>{decisions[edit.id] === 'accepted' ? 'Accepted' : decisions[edit.id] === 'rejected' ? 'Rejected' : 'Awaiting your choice'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="min-w-0 rounded border border-open/25 p-2"><span className="block text-[10px] text-muted mb-1">Remove</span><p className="whitespace-pre-wrap break-words text-open">{edit.original || '(nothing — insertion)'}</p></div>
                  <div className="min-w-0 rounded border border-accent/25 p-2"><span className="block text-[10px] text-muted mb-1">Replace with</span><p className="whitespace-pre-wrap break-words text-accent">{edit.replacement || '(nothing — deletion)'}</p></div>
                </div>
                <p className="text-xs leading-relaxed text-secondary"><strong className="font-semibold text-ink">Why: </strong>{edit.explanation}</p>
                {edit.source && <p className="text-[11px] leading-relaxed break-words text-muted">Source: {edit.source}</p>}
                <div className="flex gap-2">
                  <button type="button" disabled={disabled} aria-pressed={decisions[edit.id] === 'accepted'} aria-label={`Accept edit ${index + 1}`} onClick={() => setDecisions((previous) => ({ ...previous, [edit.id]: 'accepted' }))} className="rounded-lg border border-accent/40 bg-accent-soft/40 px-3 py-1.5 text-xs text-accent disabled:opacity-50">Accept edit</button>
                  <button type="button" disabled={disabled} aria-pressed={decisions[edit.id] === 'rejected'} aria-label={`Reject edit ${index + 1}`} onClick={() => setDecisions((previous) => ({ ...previous, [edit.id]: 'rejected' }))} className="rounded-lg border border-line px-3 py-1.5 text-xs text-secondary disabled:opacity-50">Reject edit</button>
                </div>
              </li>
            ))}
          </ol>
          <div className="rounded-lg border border-line bg-surface p-3">
            <h4 className="text-[11px] font-semibold text-ink mb-2">Your draft with accepted edits</h4>
            <p className="text-xs leading-relaxed whitespace-pre-wrap break-words text-secondary">{preview || '(empty draft)'}</p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p role="status" className="text-[11px] text-muted">{accepted.size} accepted · {pending} undecided. Rejected and undecided edits keep the original wording.</p>
            <button type="button" disabled={disabled || accepted.size === 0 || preview === proposal.original} onClick={() => onUse(preview, accepted.size)} className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-dark disabled:opacity-50">Use accepted edits</button>
          </div>
          <p className="text-[11px] leading-relaxed text-muted">Accepting an edit does not verify the copy or update its score. Save the revised draft and re-audit when ready.</p>
        </>
      )}
    </section>
  );
}
