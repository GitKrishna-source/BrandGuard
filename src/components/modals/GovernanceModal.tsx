import { useEffect, useState } from 'react';
import { getGovernanceInsights } from '../../lib/api';
import type { GovernanceInsightsResponse, ModalProps } from '../../types';

export default function GovernanceModal({ isOpen, onClose }: ModalProps) {
  const [data, setData] = useState<GovernanceInsightsResponse>();
  const [error, setError] = useState('');
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setError('');
    setData(undefined);
    getGovernanceInsights().then((result) => { if (active) setData(result); })
      .catch((error: Error) => { if (active) setError(error.message); });
    return () => { active = false; };
  }, [isOpen]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-surface-deep/80 p-4">
      <section role="dialog" aria-modal="true" aria-label="Governance insights" className="w-full max-w-2xl max-h-[90vh] overflow-auto rounded-xl border border-line bg-surface p-6 space-y-4">
        <button className="float-right" onClick={onClose}>Close</button>
        <h2 className="text-lg font-bold">Governance insights</h2>
        {error && <p role="alert">{error}</p>}
        {!data && !error && <p>Loading audit history…</p>}
        {data && <>
          <p>{data.total_audits} audits / {data.flagged_audits} flagged / {data.total_audits ? `Average score ${data.average_score}/100` : 'No scores yet'}</p>
          <h3 className="font-semibold">Most common findings</h3>
          <ul>{data.top_violations.map((item) => <li key={item.category}>{item.category.replace(/_/g, ' ')} / {item.occurrences}</li>)}</ul>
          <h3 className="font-semibold">By content format</h3>
          <ul>{data.content_types.map((item) => <li key={item.content_type}>{item.content_type} / {item.audits} audits / {item.average_score}/100</li>)}</ul>
          {data.unclear_guidelines.length > 0 && <p>Consider adding examples to guidance for {data.unclear_guidelines.join(', ').replace(/_/g, ' ')}. These categories were flagged repeatedly.</p>}
        </>}
      </section>
    </div>
  );
}
