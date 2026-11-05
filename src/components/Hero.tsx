import { useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, FileText, Fingerprint, ScanLine, ShieldCheck, Sparkles, WandSparkles } from 'lucide-react';
import type { FormEvent } from 'react';

interface HeroProps { activePresetId: string; onSelectPreset: (id: string) => void; onScanQuery: (query: string) => void }
const presets = [
  { id: 'press-release', label: 'Press release', sampleQuery: 'Our flagship deployment generated $4.2M in instantaneous net savings.' },
  { id: 'launch-copy', label: 'Product launch', sampleQuery: 'Our new release is guaranteed 10x faster than legacy enterprise tools.' },
  { id: 'banned-terms', label: 'Brand terminology', sampleQuery: 'Stop using trash legacy tools and growth-hack your brand.' },
  { id: 'source-fact', label: 'Fact check', sampleQuery: 'BrandGuard holds certified ISO-99999 Quantum Cryptography endorsement.' },
];

export default function Hero({ activePresetId, onSelectPreset, onScanQuery }: HeroProps) {
  const [query, setQuery] = useState('Our new release is guaranteed 10x faster than legacy enterprise tools.');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (query.trim()) onScanQuery(query);
  }

  return (
    <section className="mx-auto max-w-6xl px-5 sm:px-7">
      <div className="hero-layout">
        <div className="hero-copy relative z-10">
          <div className="hero-eyebrow mb-7 flex flex-wrap items-center gap-3">
            <span className="hero-label inline-flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-violet-300" />A little intelligence. A lot of confidence.</span>
          </div>
          <h1 className="hero-title mb-6 text-white">
            Big ideas.<br /><span className="gradient-text">Zero brand drift.</span>
          </h1>
          <p className="mb-7 max-w-lg text-[15px] leading-7 text-[#a69bb7] sm:text-base">
            Create boldly. Publish confidently. Give every draft a second pair of eyes for brand voice, facts, and the details that matter.
          </p>
          <form onSubmit={handleSubmit} className="scan-composer glass-panel mb-4 text-left">
            <label htmlFor="hero-draft" className="mb-2 flex items-center gap-2 text-[11px] font-medium text-[#d1c2e7]"><FileText className="h-3.5 w-3.5 text-violet-300" />Your next great draft starts here</label>
            <textarea id="hero-draft" value={query} onChange={(event) => setQuery(event.target.value)} rows={2} placeholder="Paste a claim, headline, or a few lines of your draft..." className="mb-3 w-full resize-none bg-transparent text-sm leading-6 text-[#c6bdd5] placeholder:text-[#796b8f] focus:outline-none" />
            <div className="hero-submit-row flex items-center justify-between gap-3 border-t border-violet-300/10 pt-3">
              <span className="hero-assurance inline-flex items-center gap-1.5 whitespace-nowrap text-[10px] text-[#9586aa]"><ShieldCheck className="h-3.5 w-3.5" />Your rules. Your voice.</span>
              <button type="submit" disabled={!query.trim()} className="purple-button shrink-0 whitespace-nowrap px-4 py-2.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"><Sparkles className="h-3.5 w-3.5" />Audit my draft<ArrowUpRight className="h-3.5 w-3.5" /></button>
            </div>
          </form>
          <div className="hero-preset-row flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[10px] text-[#7d708f]">Or try:</span>
            {presets.map((preset) => <button type="button" key={preset.id} data-active={activePresetId === preset.id} className="hero-presets" onClick={() => { setQuery(preset.sampleQuery); onSelectPreset(preset.id); }}>{preset.label}</button>)}
          </div>
        </div>

        <div className="hero-art" aria-label="Illustration of a draft moving through brand review">
          <div className="hero-art-glow" aria-hidden="true" />
          <div className="orbit-ring" aria-hidden="true" /><div className="orbit-ring orbit-ring-outer" aria-hidden="true" />
          <Sparkles className="sparkle-decor right-10 top-9 h-6 w-6" aria-hidden="true" />
          <Sparkles className="sparkle-decor bottom-20 left-1 h-4 w-4" aria-hidden="true" />
          <div className="hero-core" aria-hidden="true"><ShieldCheck className="h-14 w-14" strokeWidth={1.2} /></div>
          <div className="float-card float-card-top glass-panel">
            <div className="mb-3 flex items-center gap-2"><span className="mini-icon"><ScanLine className="h-4 w-4" /></span><div><p className="text-xs font-semibold text-[#efe7fa]">A fresh perspective</p><p className="text-[10px] text-[#8f7fa5]">Before you hit publish</p></div></div>
            <div className="space-y-2"><div className="h-1.5 w-full rounded bg-violet-200/10" /><div className="h-1.5 w-4/5 rounded bg-violet-200/10" /><div className="h-1.5 w-3/5 rounded bg-gradient-to-r from-violet-400/50 to-fuchsia-300/30" /></div>
          </div>
          <div className="float-card float-card-side glass-panel">
            <div className="mb-3 flex items-center gap-2"><Fingerprint className="h-5 w-5 text-violet-300" /><span className="text-xs font-semibold text-[#e6daf6]">Uniquely your brand.</span></div>
            <div className="space-y-2 text-[10px] text-[#aa9aba]">{['Voice & tone', 'Approved terminology', 'Evidence-backed claims'].map((text) => <p key={text} className="flex items-center gap-2"><Check className="h-3 w-3 text-violet-300" />{text}</p>)}</div>
          </div>
          <div className="float-card float-card-bottom glass-panel">
            <div className="flex items-center gap-2.5"><span className="mini-icon"><WandSparkles className="h-4 w-4" /></span><div><p className="text-xs font-semibold text-[#efe7fa]">Good ideas, better wording.</p><p className="mt-1 text-[10px] text-[#a697b8]">Thoughtful suggestions. Human decisions.</p></div></div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 border-t border-violet-300/10 py-5 text-[11px] text-[#8a7b9e]">
        <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-violet-300 shadow-[0_0_10px_#c4b5fd]" />Made for the way your team creates</span>
        <span className="ml-auto hidden items-center gap-2 text-[#baa4d7] sm:flex">A smarter review starts below<ArrowRight className="h-3.5 w-3.5" /></span>
      </div>
    </section>
  );
}
