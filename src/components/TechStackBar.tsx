import { BrainCircuit, Fingerprint, UsersRound } from 'lucide-react';

export default function TechStackBar() {
  return (
    <section aria-label="The BrandGuard approach" className="mx-auto max-w-6xl px-5 pb-10 sm:px-7">
      <div className="grid gap-4 border-y border-violet-300/10 py-7 sm:grid-cols-3">
        {[{ icon: BrainCircuit, title: 'AI with context', detail: 'Reviews against the policy you define.' }, { icon: Fingerprint, title: 'A voice that is yours', detail: 'Your guidelines lead every review.' }, { icon: UsersRound, title: 'People stay in control', detail: 'Suggestions from AI. Decisions from you.' }].map(({ icon: Icon, title, detail }) => (
          <div key={title} className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-violet-400/5"><Icon className="h-5 w-5 shrink-0 text-violet-300/70" strokeWidth={1.5} /><div><p className="mb-1 text-xs font-medium text-[#d4c7e5]">{title}</p><p className="text-[11px] text-[#8c7b9f]">{detail}</p></div></div>
        ))}
      </div>
    </section>
  );
}
