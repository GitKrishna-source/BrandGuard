import { ShieldCheck, Sparkles } from 'lucide-react';
import type { VoidHandler } from '../types';

interface FooterProps { onOpenWhitepaper: VoidHandler; onOpenDocs: VoidHandler; onOpenStatus: VoidHandler }
export default function Footer({ onOpenWhitepaper, onOpenDocs, onOpenStatus }: FooterProps) {
  return (
    <footer className="border-t border-violet-300/10 bg-[#0c0812]/60 py-8">
      <div className="mx-auto flex max-w-6xl flex-col justify-between gap-6 px-5 sm:flex-row sm:items-center sm:px-7">
        <div><span className="mb-2 flex items-center gap-2 text-sm font-semibold tracking-tight text-[#e7dcf7]"><ShieldCheck className="h-4 w-4 text-violet-300" />BrandGuard<span className="text-violet-400">.</span></span><p className="text-xs text-[#80728f]">More creativity. Less second-guessing.</p></div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-[#9f8db4]">
          <button onClick={onOpenWhitepaper} className="transition-colors hover:text-violet-200">Audit reports</button>
          <button onClick={onOpenDocs} className="transition-colors hover:text-violet-200">Brand rules</button>
          <button onClick={onOpenStatus} className="inline-flex items-center gap-2 transition-colors hover:text-violet-200"><Sparkles className="h-3.5 w-3.5 text-violet-300" />Hackathon edition</button>
        </div>
      </div>
    </footer>
  );
}
