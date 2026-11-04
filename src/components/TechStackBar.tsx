import React from 'react';
import { Cpu, ShieldCheck } from 'lucide-react';

export default function TechStackBar() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 my-10">
      <div className="py-4 px-5 rounded-xl bg-[#090e1a]/80 border border-slate-800/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        
        {/* Left Label */}
        <div className="flex items-center gap-2 text-xs font-mono font-medium text-cyan-400 tracking-wider uppercase">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse inline-block" />
          <span>PRODUCTION ARCHITECTURE & LATENCY BENCHMARK</span>
        </div>

        {/* Right Badges Strip */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
            FastAPI
          </span>
          <span className="text-slate-700 hidden sm:inline">•</span>

          <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
            Pydantic AI
          </span>
          <span className="text-slate-700 hidden sm:inline">•</span>

          <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
            PostgreSQL + pgvector
          </span>
          <span className="text-slate-700 hidden sm:inline">•</span>

          <span className="px-2.5 py-1 rounded-md bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 font-semibold shadow-[0_0_12px_rgba(20,241,149,0.2)]">
            Zero Data Retention
          </span>
          <span className="text-slate-700 hidden sm:inline">•</span>

          <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
            React Vite
          </span>
        </div>
      </div>
    </section>
  );
}
