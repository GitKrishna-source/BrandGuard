import React, { useState } from 'react';
import {
  Feather,
  Palette,
  Megaphone,
  Scale,
  Check,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Layers,
} from 'lucide-react';

export type RoleTabId = 'writers' | 'creatives' | 'marketers' | 'reviewers';

interface RoleContent {
  id: RoleTabId;
  tabLabel: string;
  tabIcon: React.ElementType;
  heading: string;
  description: string;
  checklist: string[];
}

// Preserve original role names: Writers, Creatives, Marketers, Reviewers
const ROLES: RoleContent[] = [
  {
    id: 'writers',
    tabLabel: 'Writers',
    tabIcon: Feather,
    heading: 'For the writers.',
    description: 'Every sentence should sound like your brand.',
    checklist: [
      'Brand voice and tone',
      'Approved terminology',
      'Messaging consistency',
    ],
  },
  {
    id: 'creatives',
    tabLabel: 'Creatives',
    tabIcon: Palette,
    heading: 'For the creatives.',
    description: 'Make every visual feel unmistakably yours.',
    checklist: [
      'Approved brand assets',
      'Visual consistency',
      'Image accessibility',
    ],
  },
  {
    id: 'marketers',
    tabLabel: 'Marketers',
    tabIcon: Megaphone,
    heading: 'For the marketers.',
    description: 'Make every claim worth trusting.',
    checklist: [
      'Promotional claims',
      'Product facts',
      'Evidence verification',
    ],
  },
  {
    id: 'reviewers',
    tabLabel: 'Reviewers',
    tabIcon: Scale,
    heading: 'For the reviewers.',
    description: 'Keep every decision accountable.',
    checklist: [
      'Review submissions',
      'Request revisions',
      'Approve or reject content',
    ],
  },
];

export default function TrustedBy() {
  const [activeTab, setActiveTab] = useState<RoleTabId>('writers');

  const currentRole = ROLES.find((r) => r.id === activeTab) || ROLES[0];

  return (
    <section
      id="roles-section"
      aria-label="For every person behind your brand."
      className="w-full bg-[#0D0F15] py-24 border-b border-[#1D212C]"
    >
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* LEFT COLUMN: Large Heading */}
          <div className="lg:col-span-5 lg:sticky lg:top-28">
            <h2 className="text-3xl sm:text-4xl lg:text-[46px] font-medium leading-[1.12] tracking-tight text-[#F5F5F7] font-display">
              For every person
              <br />
              behind your brand.
            </h2>

            {/* Short lavender underline */}
            <div
              className="w-9 h-[2px] bg-[#A5B4FC] rounded-full mt-6"
              aria-hidden="true"
            />
          </div>

          {/* RIGHT COLUMN: Interactive role-switching workspace */}
          <div className="lg:col-span-7">
            {/* Horizontal Tabs: Writers, Creatives, Marketers, Reviewers */}
            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar pb-1">
              {ROLES.map((role) => {
                const Icon = role.tabIcon;
                const isActive = activeTab === role.id;

                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setActiveTab(role.id)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-[#A5B4FC] text-[#0D0F15] font-medium shadow-[0_0_15px_rgba(165,180,252,0.25)]'
                        : 'bg-transparent text-[#929BAD] hover:text-[#F5F5F7]'
                    }`}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 ${
                        isActive ? 'text-[#0D0F15]' : 'text-[#929BAD]'
                      }`}
                      strokeWidth={2}
                    />
                    <span>{role.tabLabel}</span>
                  </button>
                );
              })}
            </div>

            {/* ONE large dark workspace panel */}
            <div className="mt-5 rounded-2xl bg-[#13161F] border border-[#232734] p-6 sm:p-8 relative overflow-hidden shadow-2xl transition-all duration-300">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center min-h-[220px]">
                {/* Left side of panel: Heading, description, and checklist */}
                <div className="md:col-span-6 flex flex-col justify-center">
                  <h3 className="text-lg sm:text-xl font-semibold text-[#F5F5F7] tracking-tight">
                    {currentRole.heading}
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm text-[#929BAD] leading-relaxed">
                    {currentRole.description}
                  </p>

                  <ul className="mt-6 space-y-3">
                    {currentRole.checklist.map((item) => (
                      <li
                        key={item}
                        className="flex items-center gap-2.5 text-xs sm:text-sm text-[#E2E8F0]"
                      >
                        <Check
                          className="w-4 h-4 text-[#A5B4FC] shrink-0"
                          strokeWidth={2.5}
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Right side of panel: Contextual visual illustration mockup */}
                <div className="md:col-span-6 flex items-center justify-center">
                  <div className="relative w-full max-w-[320px]">
                    {/* Background depth layer card */}
                    <div
                      className="absolute -inset-2 rounded-2xl bg-[#161922] border border-[#232838] -z-10 shadow-lg"
                      aria-hidden="true"
                    />

                    {/* WRITERS ILLUSTRATION */}
                    {activeTab === 'writers' && (
                      <div className="w-full rounded-xl bg-[#1D212C] border border-[#2B3142] p-5 sm:p-6 shadow-2xl">
                        {/* Highlighted lavender sentence block with blinking cursor */}
                        <div className="rounded-md bg-[#A5B4FC] h-7 px-3 flex items-center justify-end shadow-[0_0_20px_rgba(165,180,252,0.35)]">
                          <span className="w-[2px] h-4 bg-[#0D0F15] animate-pulse rounded-full" />
                        </div>
                        {/* Skeleton text lines */}
                        <div className="mt-4 space-y-2.5">
                          <div className="h-2 rounded-full bg-[#272D3D] w-[85%]" />
                          <div className="h-2 rounded-full bg-[#272D3D] w-[60%]" />
                        </div>
                      </div>
                    )}

                    {/* CREATIVES ILLUSTRATION */}
                    {activeTab === 'creatives' && (
                      <div className="w-full rounded-xl bg-[#1D212C] border border-[#2B3142] p-4 sm:p-5 shadow-2xl">
                        {/* Design Canvas Visual */}
                        <div className="rounded-lg bg-[#141722] border border-dashed border-[#818CF8]/40 p-3.5 relative overflow-hidden">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-mono text-[#A5B4FC] uppercase tracking-wider">
                              Asset 16:9 · Canvas
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#A5B4FC]" />
                              <span className="w-2.5 h-2.5 rounded-full bg-[#818CF8]" />
                              <span className="w-2.5 h-2.5 rounded-full bg-[#F4B183]" />
                            </div>
                          </div>
                          <div className="h-10 rounded bg-[#1D212C] border border-[#2B3142] flex items-center justify-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-[#A5B4FC]" />
                            <span className="text-[11px] text-[#CBD5E1]">
                              Brand Guidelines Matched
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-[11px] text-[#929BAD]">
                          <span>Grid: 8px Baseline</span>
                          <span className="text-[#A5B4FC] font-medium">100% Consistent</span>
                        </div>
                      </div>
                    )}

                    {/* MARKETERS ILLUSTRATION */}
                    {activeTab === 'marketers' && (
                      <div className="w-full rounded-xl bg-[#1D212C] border border-[#2B3142] p-5 shadow-2xl">
                        {/* Marketing Claims Document */}
                        <div className="flex items-center justify-between pb-2.5 border-b border-[#2B3142] mb-3">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[#929BAD]">
                            Campaign Copy · v2.4
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#141722] text-[#A5B4FC] border border-[#818CF8]/30">
                            <Sparkles className="w-2.5 h-2.5" />
                            Verified
                          </span>
                        </div>
                        {/* Highlighted claim sentence */}
                        <div className="rounded bg-[#A5B4FC]/15 border border-[#818CF8]/40 p-2.5 mb-2.5">
                          <p className="text-[11px] text-[#F5F5F7] font-medium">
                            &ldquo;99.9% Uptime Guarantee&rdquo;
                          </p>
                          <span className="text-[9px] text-[#A5B4FC] block mt-0.5">
                            ✓ Backed by Vault Fact #12
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[#2B3142] w-3/4" />
                      </div>
                    )}

                    {/* REVIEWERS ILLUSTRATION */}
                    {activeTab === 'reviewers' && (
                      <div className="w-full rounded-xl bg-[#1D212C] border border-[#2B3142] p-5 shadow-2xl">
                        {/* Approval Decision Visual */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[#929BAD]">
                            Audit #BR-204
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] text-[#A5B4FC]">
                            <ShieldCheck className="w-3 h-3" />
                            Ready
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[#141722] border border-[#2B3142] mb-3">
                          <p className="text-[11px] text-[#F5F5F7] font-medium">
                            Status: Awaiting Human Nod
                          </p>
                          <p className="text-[9px] text-[#929BAD] mt-0.5">
                            3 Policies verified · 0 Flags
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-full py-1.5 rounded-md bg-[#A5B4FC] text-[#0D0F15] text-[11px] font-medium flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(165,180,252,0.3)]">
                            <CheckCircle2 className="w-3 h-3" />
                            Approve
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
