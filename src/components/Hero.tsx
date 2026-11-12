import { useState } from 'react';
import { Check, FileText, ScanLine, ShieldCheck } from 'lucide-react';
import type { FormEvent } from 'react';

interface HeroProps {
  activePresetId: string;
  onSelectPreset: (id: string) => void;
  onScanQuery: (query: string) => void;
  onTrySample: () => void;
  isPreparingSample: boolean;
  sampleError: string | null;
}
const presets = [
  { id: 'press-release', label: 'Press release', sampleQuery: 'Our flagship deployment generated $4.2M in instantaneous net savings.' },
  { id: 'launch-copy', label: 'Product launch', sampleQuery: 'Our new release is guaranteed 10x faster than legacy enterprise tools.' },
  { id: 'banned-terms', label: 'Brand terminology', sampleQuery: 'Stop using trash legacy tools and growth-hack your brand.' },
  { id: 'source-fact', label: 'Fact check', sampleQuery: 'BrandGuard holds certified ISO-99999 Quantum Cryptography endorsement.' },
];

export default function Hero({ activePresetId, onSelectPreset, onScanQuery, onTrySample, isPreparingSample, sampleError }: HeroProps) {
  const [query, setQuery] = useState('');
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (query.trim()) onScanQuery(query);
  }
  return (
    <section className="hero-section">
      <img className="hero-landscape" src="/images/dusk-valley.jpg" alt="" aria-hidden="true" fetchPriority="high" width="1920" height="1280" />
      <div className="hero-scrim" aria-hidden="true" />
      <div className="hero-layout page-container">
        <div className="lead-copy">
          <h1 className="display-title">Big ideas.<br />Zero brand drift.</h1>
          <p className="hero-description">Review drafts for brand voice, facts, and the details that matter.</p>
          <button type="button" onClick={onTrySample} disabled={isPreparingSample} aria-busy={isPreparingSample} aria-describedby="bootwear-demo-description" className="purple-button sample-action">
            <ScanLine size={17} aria-hidden="true" />Try the Bootwear PDF demo
          </button>
          <p id="bootwear-demo-description" role="status" className="hero-caption">{isPreparingSample ? 'Preparing the Bootwear demo…' : 'Opens a sample draft with the Bootwear guidelines loaded. Run the audit to see page citations and evidence checks.'}</p>
          {sampleError && <p role="alert" className="hero-caption">{sampleError}</p>}
          <div className="hero-principles">
            <span><Check size={15} aria-hidden="true" />Your rules. Your voice.</span>
            <span><Check size={15} aria-hidden="true" />Human decisions.</span>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="scan-composer glass-panel">
          <div className="composer-heading">
            <FileText size={22} strokeWidth={1.5} aria-hidden="true" />
            <div><h2>Review your own draft</h2><p>Starts with a general check for clarity, tone, grammar, and unsupported claims.</p></div>
          </div>
          <label htmlFor="hero-draft" className="composer-field">Draft for review</label>
          <textarea id="hero-draft" value={query} onChange={(event) => setQuery(event.target.value)} rows={4} placeholder="Paste a claim, headline, or a few lines of your draft…" className="draft-input" />
          <div className="hero-submit-row">
            <span id="draft-audit-description" className="hero-assurance"><ShieldCheck size={15} aria-hidden="true" />Select a guideline PDF in the studio to get page citations.</span>
            <button type="submit" disabled={!query.trim()} aria-describedby="draft-audit-description" className="purple-button">Audit my draft</button>
          </div>
          <div className="hero-preset-row">
            <p className="hero-preset-label">General review examples</p>
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="hero-presets"
                data-active={activePresetId === preset.id}
                aria-pressed={activePresetId === preset.id}
                aria-controls="live-audit-studio"
                onClick={() => {
                  setQuery(preset.sampleQuery);
                  onSelectPreset(preset.id);
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </form>
      </div>
      <div className="hero-foot page-container"><span>Made for the way your team creates</span><span>Good ideas, better wording.</span></div>
    </section>
  );
}
