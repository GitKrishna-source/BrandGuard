import type { EvidenceStatus, EvidenceVerification } from '../types';

const labels: Record<EvidenceStatus, string> = {
  supported: 'Supported by cited evidence',
  weak: 'Weak evidence',
  unsupported: 'Unsupported by cited evidence',
  unverified: 'Evidence check incomplete',
  uncited: 'No guideline citation',
};

export default function FindingEvidence({ verification }: { verification?: EvidenceVerification | null }) {
  if (!verification) return null;
  const color = verification.status === 'supported' ? 'text-accent'
    : verification.status === 'uncited' ? 'text-muted' : 'text-open';

  return (
    <details className="my-2 rounded-lg border border-line bg-surface/70 p-2.5 text-xs leading-relaxed">
      <summary className={`cursor-pointer font-semibold ${color}`}>{labels[verification.status]}</summary>
      <p className="mt-2 text-secondary">{verification.reason}</p>
      {verification.citations.length > 0 && (
        <ul className="mt-2 space-y-2">
          {verification.citations.map((citation) => (
            <li key={citation.citation_id} className="border-l border-accent/30 pl-2.5">
              <p className="font-semibold text-ink">[{citation.citation_id}] {labels[citation.status]}</p>
              <p className="text-secondary">{citation.reason}</p>
              {citation.quote && <blockquote className="mt-1 whitespace-pre-wrap break-words text-muted">“{citation.quote}”</blockquote>}
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
