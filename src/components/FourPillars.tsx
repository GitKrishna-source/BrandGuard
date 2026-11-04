import React from 'react';
import { Database, ShieldCheck, UserCheck, TrendingUp, ArrowUpRight } from 'lucide-react';
import type { Role, VoidHandler } from '../types';

interface FourPillarsProps { onOpenVault: VoidHandler; onOpenApprovals: VoidHandler; onOpenAnalytics: VoidHandler; onOpenAudit: VoidHandler; currentRole: Role }
export default function FourPillars({ onOpenVault, onOpenApprovals, onOpenAnalytics, onOpenAudit, currentRole }: FourPillarsProps) {
  const canReview = currentRole !== 'creator';
  const pillars = [
    {
      title: 'Guidelines & Facts Vault',
      icon: Database,
      iconColor: 'text-cyan-400',
      bgColor: 'bg-cyan-950/40 border-cyan-500/30',
      description: 'Index your latest product specs, SEC disclosures, brand dictionaries, and tone archetypes directly from Notion, Figma, or GitHub.',
      action: onOpenVault,
      actionLabel: 'Inspect Vault'
    },
    {
      title: 'Real-Time Source Citation',
      icon: ShieldCheck,
      iconColor: 'text-sky-400',
      bgColor: 'bg-sky-950/40 border-sky-500/30',
      description: 'Zero black-box hallucinations. Every flagged sentence links directly with immutable paragraph-level citations back to verified legal collateral.',
      action: onOpenAudit,
      actionLabel: 'Try Live Scan'
    },
    {
      title: 'Tiered Approvals & Roles',
      icon: UserCheck,
      iconColor: 'text-indigo-400',
      bgColor: 'bg-indigo-950/40 border-indigo-500/30',
      description: 'Creator-to-Legal signoff pipelines. Set hard publishing gates for unreviewed high-risk statements with cryptographic audit trails.',
      action: canReview ? onOpenApprovals : undefined,
      actionLabel: canReview ? 'View Signoff Queue' : 'Reviewer access required'
    },
    {
      title: 'Governance Insights',
      icon: TrendingUp,
      iconColor: 'text-emerald-400',
      bgColor: 'bg-emerald-950/40 border-emerald-500/30',
      description: 'Pinpoint recurring messaging divergence, confusion hotspots, and metric misuse across department silos before PR fallout occurs.',
      action: canReview ? onOpenAnalytics : undefined,
      actionLabel: canReview ? 'View Analytics' : 'Reviewer access required'
    }
  ];

  return (
    <section id="architecture-section" className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-12">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-semibold mb-3">
          ENTERPRISE GOVERNANCE ARCHITECTURE
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
          Four pillars of immutable brand confidence.
        </h2>
        <p className="text-sm sm:text-base text-slate-400 leading-relaxed font-normal">
          Designed for enterprise comms, product marketing, legal teams, and high-cadence PR engines.
        </p>
      </div>

      {/* Grid of 4 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {pillars.map((pillar, idx) => {
          const Icon = pillar.icon;
          return (
            <div
              key={idx}
              onClick={pillar.action}
              className={`group relative flex flex-col justify-between p-6 rounded-2xl bg-[#090e1a]/90 border border-slate-800/90 transition-all duration-300 ${pillar.action ? 'hover:border-cyan-500/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-950/30 cursor-pointer' : 'opacity-70 cursor-not-allowed'}`}
            >
              <div>
                {/* Icon box */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border mb-5 ${pillar.bgColor}`}>
                  <Icon className={`w-5 h-5 ${pillar.iconColor}`} />
                </div>

                {/* Card Title */}
                <h3 className="text-base font-semibold text-white tracking-tight mb-3 group-hover:text-cyan-300 transition-colors flex items-center justify-between">
                  <span>{pillar.title}</span>
                  {pillar.action && <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400" />}
                </h3>

                {/* Card Description */}
                <p className="text-xs sm:text-[13px] text-slate-400 leading-relaxed font-normal">
                  {pillar.description}
                </p>
              </div>

              {/* Bottom Micro-CTA */}
              <div className="mt-5 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-400 group-hover:text-cyan-300 transition-colors">
                <span>{pillar.actionLabel}</span>
                <span className="text-slate-600 group-hover:text-cyan-400">→</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
