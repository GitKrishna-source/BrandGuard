import { Feather, Megaphone, Palette, Scale, Sparkles } from 'lucide-react';

export default function TrustedBy() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-20 pt-7 text-center sm:px-7">
      <p className="mb-6 text-[10px] font-medium uppercase tracking-[.2em] text-[#80728f]">For every person behind your brand</p>
      <div className="flex flex-wrap items-center justify-center gap-x-9 gap-y-4 text-sm text-[#b2a3c5]">
        {[{ icon: Feather, label: 'Writers' }, { icon: Palette, label: 'Creatives' }, { icon: Megaphone, label: 'Marketers' }, { icon: Scale, label: 'Reviewers' }].map(({ icon: Icon, label }) => <span key={label} className="flex items-center gap-2.5 transition-colors hover:text-violet-200"><Icon className="h-4 w-4 text-violet-300/60" strokeWidth={1.5} />{label}</span>)}
        <Sparkles className="h-4 w-4 text-violet-300/70" aria-hidden="true" />
      </div>
    </section>
  );
}
