import { Feather, Megaphone, Palette, Scale } from 'lucide-react';
export default function TrustedBy() {
  return <section className="team-section page-container"><h2 className="section-heading">For every person<br />behind your brand.</h2><div className="team-roles">
    {[{ icon: Feather, label: 'Writers' }, { icon: Palette, label: 'Creatives' }, { icon: Megaphone, label: 'Marketers' }, { icon: Scale, label: 'Reviewers' }].map(({ icon: Icon, label }) => <span key={label}><Icon strokeWidth={1.5} aria-hidden="true" />{label}</span>)}
  </div></section>;
}
