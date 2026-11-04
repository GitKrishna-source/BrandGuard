import React, { useState } from 'react';
import { ArrowUpRight, Search, ShieldAlert, Sparkles, Terminal } from 'lucide-react';

export default function Hero({ activePresetId, onSelectPreset, onScanQuery }) {
  const [query, setQuery] = useState('Our new release is guaranteed 10x faster than legacy enterprise to');

  const presets = [
    { id: 'press-release', label: 'Press Release ($4.2M Metric Claim)', sampleQuery: 'Our flagship deployment generated $4.2M in instantaneous net savings' },
    { id: 'launch-copy', label: 'Product Launch Copy', sampleQuery: 'Our new release is guaranteed 10x faster than legacy enterprise to' },
    { id: 'banned-terms', label: 'Banned Terminology Check', sampleQuery: 'Stop using trash legacy tools and growth-hack your brand' },
    { id: 'source-fact', label: 'Source-Fact Verification', sampleQuery: 'BrandGuard holds certified ISO-99999 Quantum Cryptography endorsement' },
  ];

  const handlePresetClick = (preset) => {
    setQuery(preset.sampleQuery);
    onSelectPreset(preset.id);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onScanQuery) {
      onScanQuery(query);
    }
  };

  return (
    <section className="relative pt-12 pb-8 sm:pt-16 sm:pb-12 text-center max-w-5xl mx-auto px-4 sm:px-6">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Pill Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-cyan-500/30 text-[10px] sm:text-xs font-mono font-medium text-cyan-300 tracking-wider uppercase mb-7 shadow-[0_0_20px_rgba(56,189,248,0.15)]">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        <span>ZERO HALLUCINATION</span>
        <span className="text-slate-600">•</span>
        <span>PRE-PUBLICATION GOVERNANCE</span>
        <span className="text-slate-600">•</span>
        <span>FACT AUDITING</span>
      </div>

      {/* Main Headline */}
      <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6 leading-[1.1]">
        Guard Your Brand<br />
        Before You <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-200">Publish.</span>
      </h1>

      {/* Subtitle */}
      <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-400 leading-relaxed font-normal mb-8">
        The real-time pre-publication AI governance engine for high-velocity teams.
        <br className="hidden sm:inline" />
        {' '}Catch unapproved claims, factual discrepancies, tone breaches, and
        <br className="hidden sm:inline" />
        {' '}regulatory drift in milliseconds.
      </p>

      {/* Interactive Scan Input Bar */}
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-6">
        <div className="relative flex items-center bg-[#0b101d]/90 border border-slate-700/80 hover:border-cyan-500/50 rounded-xl p-1.5 shadow-2xl backdrop-blur-md transition-all focus-within:border-cyan-400 focus-within:shadow-[0_0_25px_rgba(56,189,248,0.2)]">
          <div className="pl-3 pr-2 text-slate-400">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type any claim or sentence to audit against corporate brand truth..."
            className="w-full bg-transparent text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none font-mono py-1 px-1"
          />
          <button
            type="submit"
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 text-slate-950 font-semibold text-xs rounded-lg transition-all active:scale-95 shadow-sm"
          >
            <span>SCAN NOW</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* Preset Checks Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-mono text-slate-400">
        <span className="text-slate-500 text-[11px] font-sans pr-1">Preset checks:</span>
        {presets.map((preset) => {
          const isActive = activePresetId === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => handlePresetClick(preset)}
              className={`px-3 py-1 rounded-md text-[11px] transition-all border ${
                isActive
                  ? 'bg-slate-800 text-cyan-300 border-cyan-500/50 shadow-[0_0_12px_rgba(56,189,248,0.2)] font-medium'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
