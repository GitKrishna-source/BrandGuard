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
import type { Preset, Role, VoidHandler } from '../types';

interface LiveAuditStudioProps { preset: Preset; onExportAudit: VoidHandler; onPushToCMS: VoidHandler; onOpenVault: VoidHandler; currentRole: Role }
export default function LiveAuditStudio({ 
  preset, 
  onExportAudit, 
  onPushToCMS, 
  onOpenVault,
  currentRole
}: LiveAuditStudioProps) {
  const canApprove = currentRole !== 'creator';
  const [fixedF1, setFixedF1] = useState(false);
  const [fixedF2, setFixedF2] = useState(false);
  const [isFixingF1, setIsFixingF1] = useState(false);
  const [isFixingF2, setIsFixingF2] = useState(false);

  // Reset fix states whenever the active preset changes
  useEffect(() => {
    setFixedF1(false);
    setFixedF2(false);
  }, [preset.id]);

  // Trigger celebration when both issues are fixed
  useEffect(() => {
    if (fixedF1 && fixedF2 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['--color-confetti-accent', '--color-confetti-open', '--color-confetti-ink'].map((token) => getComputedStyle(document.documentElement).getPropertyValue(token).trim())
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
    <section id="live-audit-studio" className="studio-section page-container">
      <div className="section-intro">
        <div><h2 className="section-heading text-ink">Small edits. Big confidence.</h2></div>
        <p className="max-w-xs text-xs leading-6 text-secondary">Explore a sample review below, or launch an audit to try your own content.</p>
      </div>
      {/* Outer Mac-like Terminal Frame */}
      <div className="studio-frame">
        
        {/* Terminal Header Bar */}
        <div className="studio-toolbar flex flex-wrap items-center justify-between px-6 py-4 gap-3">
          {/* Left: Window Controls + Workspace filename */}
          <div className="flex items-center gap-3">
            <FileText className="h-4 w-4 text-accent" aria-hidden="true" />
            
            <div className="h-4 w-px bg-elevated mx-1 hidden sm:block" />
            
            <span className="text-[11px] sm:text-xs font-sans font-medium text-secondary ">
              {preset.workspace}
            </span>
          </div>

          {/* Right: Engine Status Badges */}
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-soft/50 border border-accent/30 text-[10px] font-sans text-accent">
              <span>Interactive sample</span>
            </div>
            
            <span className="text-[10px] font-sans text-muted bg-surface/80 px-2 py-0.5 rounded border border-line">
              Demo workspace
            </span>

            {(fixedF1 || fixedF2) && (
              <button
                onClick={handleReset}
                title="Reset simulation to initial draft"
                className="text-[10px] font-sans text-muted hover:text-accent flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-line/80">
          
          {/* ======================================================== */}
          {/* LEFT COLUMN: LIVE DRAFT CONTENT STREAM (7 columns)       */}
          {/* ======================================================== */}
          <div className="studio-document lg:col-span-7 flex flex-col justify-between">
            <div>
              {/* Draft Section Header */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-line/60">
                <div className="flex items-center gap-2 text-accent font-sans text-xs font-semibold  ">
                  <FileText className="w-3.5 h-3.5 text-accent" />
                  <span>Sample draft</span>
                </div>
                
                <span className={`text-[10px] font-sans px-2 py-0.5 rounded border transition-colors ${
                  activeFlagsCount === 0 
                    ? 'bg-accent-soft/60 border-accent/40 text-accent'
                    : 'bg-open-soft/60 border-open/40 text-open'
                }`}>
                  {activeFlagsCount === 0 ? '0 Flags Detected' : `${activeFlagsCount} Flags Detected`}
                </span>
              </div>

              {/* Document Text Body */}
              <div className="space-y-4 font-sans text-xs sm:text-[13px] leading-relaxed text-secondary">
                {/* Paragraph 1 */}
                <p>{preset.p1}</p>

                {/* FLAG 01 BOX */}
                <div className={`p-3.5 rounded-lg border transition-colors duration-300 ${
                  fixedF1 
                    ? 'bg-accent-soft/20 border-accent/40' 
                    : 'bg-open-soft/25 border-open/40 glow-border-red'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10px] font-bold font-sans px-2 py-0.5 rounded   ${
                      fixedF1 
                        ? 'bg-accent-soft/60 text-accent border border-accent/30' 
                        : 'bg-open-soft/60 text-open border border-open/30'
                    }`}>
                      {fixedF1 ? 'Flag 01: Remediated & verified' : preset.flag1.badge}
                    </span>
                    {fixedF1 && (
                      <span className="text-[10px] text-accent font-sans flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Audited
                      </span>
                    )}
                  </div>

                  <p className={`text-xs sm:text-[13px] leading-normal ${
                    fixedF1 ? 'text-accent font-medium' : 'text-ink'
                  }`}>
                    {fixedF1 ? (
                      <span>"{preset.flag1.approvedFixText}"</span>
                    ) : (
                      <span>
                        "<span className="squiggly-red text-open">{preset.flag1.flaggedSnippet}</span>"
                      </span>
                    )}
                  </p>
                </div>

                {/* Paragraph 2 */}
                <p>{preset.p2}</p>

                {/* FLAG 02 BOX */}
                <div className={`p-3.5 rounded-lg border transition-colors duration-300 ${
                  fixedF2 
                    ? 'bg-accent-soft/20 border-accent/40' 
                    : 'bg-open-soft/25 border-open/40 glow-border-amber'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10px] font-bold font-sans px-2 py-0.5 rounded   ${
                      fixedF2 
                        ? 'bg-accent-soft/60 text-accent border border-accent/30' 
                        : 'bg-open-soft/60 text-open border border-open/30'
                    }`}>
                      {fixedF2 ? 'FLAG 02: NOMENCLATURE ALIGNED' : preset.flag2.badge}
                    </span>
                    {fixedF2 && (
                      <span className="text-[10px] text-accent font-sans flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Approved
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-[13px] text-ink leading-normal">
                    <span>{preset.flag2.prefix}</span>
                    {fixedF2 ? (
                      <span className="text-accent bg-accent-soft/60 px-1 py-0.5 rounded border border-accent/30 font-semibold">
                        {preset.flag2.approvedFixText}
                      </span>
                    ) : (
                      <span className="squiggly-amber text-open bg-open-soft/40 px-1 py-0.5 rounded">
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
            <div className="mt-6 pt-4 border-t border-line/80 flex flex-wrap items-center justify-between text-[11px] font-sans text-muted gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-muted">Source:</span>
                <span className="text-secondary">{preset.source}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted">Target Persona:</span>
                <span className="text-accent">{preset.persona}</span>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* RIGHT COLUMN: BrandGuard Intelligence Inspector (5 cols)  */}
          {/* ======================================================== */}
          <div className="studio-review lg:col-span-5 flex flex-col justify-between bg-surface p-4 sm:p-6">
            <div className="space-y-4">
              {/* Inspector Header & Readiness Meter */}
              <div className="flex items-start justify-between pb-3 border-b border-line/80">
                <div>
                  <h3 className="text-sm font-semibold text-ink tracking-tight">
                    BrandGuard Intelligence Inspector
                  </h3>
                  <p className="text-[11px] font-sans text-muted mt-0.5">
                    Rule-set: {preset.ruleSet}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-sans text-muted ">Readiness:</div>
                  <div className="flex items-center gap-1.5 justify-end mt-0.5">
                    <span className={`text-base font-bold font-sans ${
                      readinessScore === 100 
                        ? 'text-accent' 
                        : readinessScore >= 80 
                        ? 'text-accent'
                        : 'text-open'
                    }`}>
                      {readinessScore} / 100
                    </span>
                    <span className={`w-2 h-2 rounded-full ${
                      readinessScore === 100 
                        ? 'bg-accent animate-ping' 
                        : 'bg-open'
                    }`} />
                  </div>
                </div>
              </div>

              {/* ---------------- CARD 1: HIGH SEVERITY ---------------- */}
              <div className={`review-finding p-3.5 rounded-xl border transition-colors ${
                fixedF1 
                  ? 'bg-surface/40 border-line opacity-60' 
                  : 'bg-surface border-open/30 shadow-lg'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold font-sans px-2 py-0.5 rounded bg-open-soft text-open border border-open/40 ">
                    {preset.flag1.title}
                  </span>
                  <span className="text-[10px] font-sans text-muted">
                    {preset.flag1.guideline}
                  </span>
                </div>

                <div className="text-xs text-secondary mb-2 font-sans">
                  <span className="text-muted">Flagged: </span>
                  <span className={fixedF1 ? 'line-through text-muted' : 'text-open'}>
                    {preset.flag1.flaggedShort}
                  </span>
                </div>

                <p className="text-[11px] text-muted leading-snug mb-3">
                  {preset.flag1.explanation}
                </p>

                <div className="pt-2 border-t border-line/80 flex items-center justify-between gap-2">
                  <div className="text-[11px] font-sans text-accent truncate max-w-[210px] sm:max-w-[250px]">
                    <span className="text-muted text-[10px]  block">Verified fix:</span>
                    {preset.flag1.approvedFixLabel}
                  </div>
                  
                  {fixedF1 ? (
                    <span className="text-[11px] font-sans text-accent font-semibold flex items-center gap-1 bg-accent-soft/60 px-2.5 py-1 rounded border border-accent/30">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Applied
                    </span>
                  ) : (
                    <button
                      onClick={handleApplyFix1}
                      disabled={isFixingF1}
                      className="px-3 py-1 bg-accent hover:bg-accent active:scale-95 text-dark font-bold text-xs rounded transition-colors  flex-shrink-0"
                    >
                      {isFixingF1 ? 'Applying...' : 'Apply Fix'}
                    </button>
                  )}
                </div>
              </div>

              {/* ---------------- CARD 2: STYLE DRIFT ---------------- */}
              <div className={`review-finding p-3.5 rounded-xl border transition-colors ${
                fixedF2 
                  ? 'bg-surface/40 border-line opacity-60' 
                  : 'bg-surface border-open/30 shadow-lg'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold font-sans px-2 py-0.5 rounded bg-open-soft text-open border border-open/40 ">
                    {preset.flag2.title}
                  </span>
                  <span className="text-[10px] font-sans text-muted">
                    {preset.flag2.guideline}
                  </span>
                </div>

                <div className="text-xs text-secondary mb-2 font-sans">
                  <span className="text-muted">Banned Term: </span>
                  <span className={fixedF2 ? 'line-through text-muted' : 'text-open'}>
                    {preset.flag2.bannedTerm}
                  </span>
                </div>

                <p className="text-[11px] text-muted leading-snug mb-3">
                  {preset.flag2.explanation}
                </p>

                <div className="pt-2 border-t border-line/80 flex items-center justify-between gap-2">
                  <div className="text-[11px] font-sans text-open truncate max-w-[210px] sm:max-w-[250px]">
                    <span className="text-muted text-[10px]  block">Approved:</span>
                    {preset.flag2.approvedFixLabel}
                  </div>

                  {fixedF2 ? (
                    <span className="text-[11px] font-sans text-accent font-semibold flex items-center gap-1 bg-accent-soft/60 px-2.5 py-1 rounded border border-accent/30">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Applied
                    </span>
                  ) : (
                    <button
                      onClick={handleApplyFix2}
                      disabled={isFixingF2}
                      className="px-3 py-1 bg-open hover:bg-open active:scale-95 text-dark font-bold text-xs rounded transition-colors  flex-shrink-0"
                    >
                      {isFixingF2 ? 'Applying...' : 'Apply Fix'}
                    </button>
                  )}
                </div>
              </div>

              {/* ---------------- GAUGES & METRICS ---------------- */}
              <div className="pt-2 space-y-2.5 font-sans text-xs">
                {/* Voice-Tone gauge */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-muted">Voice-Tone: {preset.voiceTone}</span>
                    <span className="text-accent font-semibold">{preset.voiceToneScore}</span>
                  </div>
                  <div className="w-full h-1.5 bg-elevated rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full transition-colors duration-500" style={{ width: '91%' }} />
                  </div>
                </div>

                {/* Source-Grounding gauge */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-muted">Source-Grounding: {preset.sourceGrounding}</span>
                    <span className="text-accent font-semibold">
                      {fixedF1 && fixedF2 ? '100% Verified' : preset.sourceGroundingScore}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-elevated rounded-full overflow-hidden">
                    <div className="h-full bg-accent   rounded-full transition-colors duration-500" style={{ width: '100%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* ---------------- BOTTOM ACTIONS BAR ---------------- */}
            <div className="pt-5 mt-4 border-t border-line/80 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={onExportAudit}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-sans font-medium rounded-lg bg-surface border border-line/80 hover:border-line text-ink hover:text-ink transition-colors active:scale-95"
              >
                <Download className="w-3.5 h-3.5 text-muted" />
                <span>Saved audit reports</span>
              </button>

              <button
                onClick={onPushToCMS}
                className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-lg transition-colors active:scale-95 ${
                  readinessScore === 100
                    ? 'bg-accent hover:bg-accent text-dark  animate-pulse'
                    : 'bg-accent/90 hover:bg-accent text-dark shadow-md'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>{canApprove ? 'Open Review Queue' : 'Open My Reviews'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
