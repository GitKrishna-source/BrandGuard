import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink, 
  Download, 
  Send, 
  Sparkles, 
  RefreshCw, 
  FileText, 
  Zap,
  Lock,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function LiveAuditStudio({ 
  preset, 
  onExportAudit, 
  onPushToCMS, 
  onOpenVault 
}) {
  const [fixedF1, setFixedF1] = useState(false);
  const [fixedF2, setFixedF2] = useState(false);
  const [isFixingF1, setIsFixingF1] = useState(false);
  const [isFixingF2, setIsFixingF2] = useState(false);
  const [latency, setLatency] = useState(46);

  // Reset fix states whenever the active preset changes
  useEffect(() => {
    setFixedF1(false);
    setFixedF2(false);
    setLatency(Math.floor(Math.random() * 15) + 38);
  }, [preset.id]);

  // Trigger celebration when both issues are fixed
  useEffect(() => {
    if (fixedF1 && fixedF2) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#14f195', '#38bdf8', '#ffffff']
      });
    }
  }, [fixedF1, fixedF2]);

  // Compute live readiness score
  const readinessScore = (() => {
    let score = preset.initialScore;
    if (fixedF1) score += 16;
    if (fixedF2) score += 12;
    return Math.min(score, 100);
  })();

  const activeFlagsCount = (fixedF1 ? 0 : 1) + (fixedF2 ? 0 : 1);

  const handleApplyFix1 = () => {
    setIsFixingF1(true);
    setTimeout(() => {
      setFixedF1(true);
      setIsFixingF1(false);
    }, 280);
  };

  const handleApplyFix2 = () => {
    setIsFixingF2(true);
    setTimeout(() => {
      setFixedF2(true);
      setIsFixingF2(false);
    }, 280);
  };

  const handleReset = () => {
    setFixedF1(false);
    setFixedF2(false);
  };

  return (
    <section id="live-audit-studio" className="max-w-6xl mx-auto px-4 sm:px-6 my-10">
      {/* Outer Mac-like Terminal Frame */}
      <div className="rounded-2xl border border-slate-800 bg-[#080d19] shadow-2xl shadow-cyan-950/20 overflow-hidden backdrop-blur-xl">
        
        {/* Terminal Header Bar */}
        <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-[#0a101f] border-b border-slate-800/90 gap-2">
          {/* Left: Window Controls + Workspace filename */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#ef4444]/90 inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#f59e0b]/90 inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#10b981]/90 inline-block" />
            </div>
            
            <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />
            
            <span className="text-[11px] sm:text-xs font-mono font-medium text-slate-300 tracking-wide">
              {preset.workspace}
            </span>
          </div>

          {/* Right: Engine Status Badges */}
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-[10px] font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Real-time Engine Active</span>
            </div>
            
            <span className="text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
              Lat: {latency}ms
            </span>

            {(fixedF1 || fixedF2) && (
              <button
                onClick={handleReset}
                title="Reset simulation to initial draft"
                className="text-[10px] font-mono text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800/80">
          
          {/* ======================================================== */}
          {/* LEFT COLUMN: LIVE DRAFT CONTENT STREAM (7 columns)       */}
          {/* ======================================================== */}
          <div className="lg:col-span-7 flex flex-col justify-between bg-[#080d19]/95 p-4 sm:p-6">
            <div>
              {/* Draft Section Header */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/60">
                <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-semibold tracking-wider uppercase">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>LIVE DRAFT CONTENT STREAM</span>
                </div>
                
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                  activeFlagsCount === 0 
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                }`}>
                  {activeFlagsCount === 0 ? '0 Flags Detected' : `${activeFlagsCount} Flags Detected`}
                </span>
              </div>

              {/* Document Text Body */}
              <div className="space-y-4 font-mono text-xs sm:text-[13px] leading-relaxed text-slate-300">
                {/* Paragraph 1 */}
                <p>{preset.p1}</p>

                {/* FLAG 01 BOX */}
                <div className={`p-3.5 rounded-lg border transition-all duration-300 ${
                  fixedF1 
                    ? 'bg-emerald-950/20 border-emerald-500/40' 
                    : 'bg-rose-950/25 border-rose-500/40 glow-border-red'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded uppercase tracking-wider ${
                      fixedF1 
                        ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/30' 
                        : 'bg-rose-900/60 text-rose-300 border border-rose-500/30'
                    }`}>
                      {fixedF1 ? 'FLAG 01: REMEDIATED & VERIFIED' : preset.flag1.badge}
                    </span>
                    {fixedF1 && (
                      <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Audited
                      </span>
                    )}
                  </div>

                  <p className={`text-xs sm:text-[13px] leading-normal ${
                    fixedF1 ? 'text-emerald-200 font-medium' : 'text-slate-200'
                  }`}>
                    {fixedF1 ? (
                      <span>"{preset.flag1.approvedFixText}"</span>
                    ) : (
                      <span>
                        "<span className="squiggly-red text-rose-200">{preset.flag1.flaggedSnippet}</span>"
                      </span>
                    )}
                  </p>
                </div>

                {/* Paragraph 2 */}
                <p>{preset.p2}</p>

                {/* FLAG 02 BOX */}
                <div className={`p-3.5 rounded-lg border transition-all duration-300 ${
                  fixedF2 
                    ? 'bg-emerald-950/20 border-emerald-500/40' 
                    : 'bg-amber-950/25 border-amber-500/40 glow-border-amber'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded uppercase tracking-wider ${
                      fixedF2 
                        ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/30' 
                        : 'bg-amber-900/60 text-amber-300 border border-amber-500/30'
                    }`}>
                      {fixedF2 ? 'FLAG 02: NOMENCLATURE ALIGNED' : preset.flag2.badge}
                    </span>
                    {fixedF2 && (
                      <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Approved
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-[13px] text-slate-200 leading-normal">
                    <span>{preset.flag2.prefix}</span>
                    {fixedF2 ? (
                      <span className="text-emerald-300 bg-emerald-950/60 px-1 py-0.5 rounded border border-emerald-500/30 font-semibold">
                        {preset.flag2.approvedFixText}
                      </span>
                    ) : (
                      <span className="squiggly-amber text-amber-200 bg-amber-950/40 px-1 py-0.5 rounded">
                        {preset.flag2.bannedWord}
                      </span>
                    )}
                    <span>{preset.flag2.suffix}</span>
                  </p>
                </div>

                {/* Paragraph 3 */}
                <p>{preset.p3}</p>
              </div>
            </div>

            {/* Left Footer Metadata Strip */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Source:</span>
                <span className="text-slate-300">{preset.source}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Target Persona:</span>
                <span className="text-cyan-400">{preset.persona}</span>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* RIGHT COLUMN: BrandGuard Intelligence Inspector (5 cols)  */}
          {/* ======================================================== */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-[#0a101f] p-4 sm:p-6">
            <div className="space-y-4">
              {/* Inspector Header & Readiness Meter */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-800/80">
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-tight">
                    BrandGuard Intelligence Inspector
                  </h3>
                  <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                    Rule-set: {preset.ruleSet}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Readiness:</div>
                  <div className="flex items-center gap-1.5 justify-end mt-0.5">
                    <span className={`text-base font-bold font-mono ${
                      readinessScore === 100 
                        ? 'text-emerald-400' 
                        : readinessScore >= 80 
                        ? 'text-cyan-400' 
                        : 'text-amber-400'
                    }`}>
                      {readinessScore} / 100
                    </span>
                    <span className={`w-2 h-2 rounded-full ${
                      readinessScore === 100 
                        ? 'bg-emerald-400 animate-ping' 
                        : 'bg-amber-400'
                    }`} />
                  </div>
                </div>
              </div>

              {/* ---------------- CARD 1: HIGH SEVERITY ---------------- */}
              <div className={`p-3.5 rounded-xl border transition-all ${
                fixedF1 
                  ? 'bg-slate-900/40 border-slate-800 opacity-60' 
                  : 'bg-[#101729] border-rose-500/30 shadow-lg'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-600/40 uppercase">
                    {preset.flag1.title}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {preset.flag1.guideline}
                  </span>
                </div>

                <div className="text-xs text-slate-300 mb-2 font-mono">
                  <span className="text-slate-400">Flagged: </span>
                  <span className={fixedF1 ? 'line-through text-slate-500' : 'text-rose-200'}>
                    {preset.flag1.flaggedShort}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-snug mb-3">
                  {preset.flag1.explanation}
                </p>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="text-[11px] font-mono text-emerald-400 truncate max-w-[210px] sm:max-w-[250px]">
                    <span className="text-slate-500 text-[10px] uppercase block">VERIFIED FIX:</span>
                    {preset.flag1.approvedFixLabel}
                  </div>
                  
                  {fixedF1 ? (
                    <span className="text-[11px] font-mono text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Applied
                    </span>
                  ) : (
                    <button
                      onClick={handleApplyFix1}
                      disabled={isFixingF1}
                      className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs rounded transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)] flex-shrink-0"
                    >
                      {isFixingF1 ? 'Applying...' : 'Apply Fix'}
                    </button>
                  )}
                </div>
              </div>

              {/* ---------------- CARD 2: STYLE DRIFT ---------------- */}
              <div className={`p-3.5 rounded-xl border transition-all ${
                fixedF2 
                  ? 'bg-slate-900/40 border-slate-800 opacity-60' 
                  : 'bg-[#101729] border-amber-500/30 shadow-lg'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-600/40 uppercase">
                    {preset.flag2.title}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {preset.flag2.guideline}
                  </span>
                </div>

                <div className="text-xs text-slate-300 mb-2 font-mono">
                  <span className="text-slate-400">Banned Term: </span>
                  <span className={fixedF2 ? 'line-through text-slate-500' : 'text-amber-200'}>
                    {preset.flag2.bannedTerm}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-snug mb-3">
                  {preset.flag2.explanation}
                </p>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="text-[11px] font-mono text-amber-300 truncate max-w-[210px] sm:max-w-[250px]">
                    <span className="text-slate-500 text-[10px] uppercase block">APPROVED:</span>
                    {preset.flag2.approvedFixLabel}
                  </div>

                  {fixedF2 ? (
                    <span className="text-[11px] font-mono text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Applied
                    </span>
                  ) : (
                    <button
                      onClick={handleApplyFix2}
                      disabled={isFixingF2}
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs rounded transition-all shadow-[0_0_12px_rgba(245,158,11,0.3)] flex-shrink-0"
                    >
                      {isFixingF2 ? 'Applying...' : 'Apply Fix'}
                    </button>
                  )}
                </div>
              </div>

              {/* ---------------- GAUGES & METRICS ---------------- */}
              <div className="pt-2 space-y-2.5 font-mono text-xs">
                {/* Voice-Tone gauge */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Voice-Tone: {preset.voiceTone}</span>
                    <span className="text-cyan-400 font-semibold">{preset.voiceToneScore}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-400 rounded-full transition-all duration-500" style={{ width: '91%' }} />
                  </div>
                </div>

                {/* Source-Grounding gauge */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Source-Grounding: {preset.sourceGrounding}</span>
                    <span className="text-emerald-400 font-semibold">
                      {fixedF1 && fixedF2 ? '100% Verified' : preset.sourceGroundingScore}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full transition-all duration-500" style={{ width: '100%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* ---------------- BOTTOM ACTIONS BAR ---------------- */}
            <div className="pt-5 mt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={onExportAudit}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-mono font-medium rounded-lg bg-slate-900 border border-slate-700/80 hover:border-slate-500 text-slate-200 hover:text-white transition-all active:scale-95"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>Export Audit (JSON/PDF)</span>
              </button>

              <button
                onClick={onPushToCMS}
                className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-lg transition-all active:scale-95 ${
                  readinessScore === 100
                    ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-[0_0_20px_rgba(20,241,149,0.4)] animate-pulse'
                    : 'bg-emerald-500/90 hover:bg-emerald-400 text-slate-950 shadow-md'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Approve & Push to CMS</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
