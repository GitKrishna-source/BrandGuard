import { BrainCircuit, Fingerprint, UsersRound } from 'lucide-react';
export default function TechStackBar() {
  return <section aria-label="The BrandGuard approach" className="approach-band page-container"><div className="approach-grid">
    {[{ icon: BrainCircuit, title: 'AI with context', detail: 'Reviews against the policy you define.' }, { icon: Fingerprint, title: 'A voice that is yours', detail: 'Your guidelines lead every review.' }, { icon: UsersRound, title: 'People stay in control', detail: 'Suggestions from AI. Decisions from you.' }].map(({ icon: Icon, title, detail }) => <div key={title} className="approach-item"><Icon strokeWidth={1.5} aria-hidden="true" /><h3>{title}</h3><p>{detail}</p></div>)}
  </div></section>;
}
