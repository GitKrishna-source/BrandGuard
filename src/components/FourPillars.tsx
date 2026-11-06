import React, { useState } from 'react';
import { ArrowRight, BookOpen, GitPullRequest, LockKeyhole, ScanLine, TrendingUp } from 'lucide-react';
import type { Role, VoidHandler } from '../types';

export interface FourPillarsProps {
  onOpenVault: VoidHandler;
  onOpenApprovals: VoidHandler;
  onOpenAnalytics: VoidHandler;
  onOpenAudit: VoidHandler;
  currentRole: Role;
}

interface FeatureItem {
  number: string;
  title: string;
  description: string;
  detail: string;
  action: string;
  icon: React.ElementType;
  handler: VoidHandler;
  disabled: boolean;
}

export default function FourPillars({
  onOpenVault,
  onOpenApprovals,
  onOpenAnalytics,
  onOpenAudit,
  currentRole,
}: FourPillarsProps) {
  const canReview = currentRole !== 'creator';

  // Default highlighted row is 02 (A thoughtful second look.) per reference screenshot
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const activeRowId = hoveredRow ?? '02';

  // EXACT original feature titles, descriptions, details, actions, and handlers preserved 100%
  const features: FeatureItem[] = [
    {
      number: '01',
      title: 'Your brand’s source of truth.',
      description: 'A home for the voice, words, and approved facts that make your brand unmistakable.',
      detail: 'Confident. Clear. Consistently you.',
      action: 'Explore the brand vault',
      icon: BookOpen,
      handler: onOpenVault,
      disabled: false,
    },
    {
      number: '02',
      title: 'A thoughtful second look.',
      description: 'Catch off-brand language and unsupported claims, with suggestions that preserve your intent.',
      detail: 'Try an evidence-backed statement.',
      action: 'Give your draft a review',
      icon: ScanLine,
      handler: onOpenAudit,
      disabled: false,
    },
    {
      number: '03',
      title: 'Human judgment. Always.',
      description: 'Give creators, managers, and legal reviewers their place in the conversation.',
      detail: 'Create. Review. Approve.',
      action: canReview ? 'Open the review queue' : 'Explore with a reviewer demo role',
      icon: GitPullRequest,
      handler: onOpenApprovals,
      disabled: !canReview,
    },
    {
      number: '04',
      title: 'See the bigger picture.',
      description: 'Spot recurring issues across your audits. Turn the patterns into clearer guidance for your next draft.',
      detail: 'Claims, terminology, and brand voice.',
      action: canReview ? 'Explore your audit insights' : 'Explore with a reviewer demo role',
      icon: TrendingUp,
      handler: onOpenAnalytics,
      disabled: !canReview,
    },
  ];

  return (
    <section
      id="architecture-section"
      aria-label="One workspace. Every detail considered."
      className="w-full bg-[#0D0F15] py-28 lg:py-32 border-b border-[#1D212C]"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 xl:gap-24 items-start">
          {/* LEFT COLUMN: Original editorial heading & introductory paragraph */}
          <div className="lg:col-span-5 lg:sticky lg:top-28">
            <h2 className="text-3xl sm:text-4xl lg:text-[46px] xl:text-[48px] font-medium leading-[1.22] lg:leading-[1.2] tracking-tight text-[#F5F5F7] font-display">
              One workspace.
              <br />
              Every detail
              <br />
              considered.
            </h2>

            {/* Short lavender decorative line */}
            <div
              className="w-10 h-[2px] bg-[#A5B4FC] rounded-full mt-7 mb-7"
              aria-hidden="true"
            />

            <p className="text-base sm:text-[17px] text-[#929BAD] leading-[1.7] max-w-[420px]">
              From a first draft to the final nod. Keep your brand’s voice close, and your team on the same page.
            </p>
          </div>

          {/* RIGHT COLUMN: Four horizontally stacked interactive rows */}
          <div
            className="lg:col-span-7 flex flex-col space-y-1"
            onMouseLeave={() => setHoveredRow(null)}
          >
            {features.map((feature, index) => {
              const isActive = activeRowId === feature.number;
              const isNextActive = activeRowId === features[index + 1]?.number;
              const showDivider = !isActive && !isNextActive && index < features.length - 1;

              return (
                <div key={feature.number} className="relative">
                  <button
                    type="button"
                    onClick={feature.disabled ? undefined : feature.handler}
                    onMouseEnter={() => setHoveredRow(feature.number)}
                    onFocus={() => setHoveredRow(feature.number)}
                    disabled={feature.disabled}
                    className={`group w-full text-left flex items-center justify-between px-6 py-5 rounded-2xl transition-all duration-300 relative ${
                      feature.disabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                    } ${
                      isActive
                        ? 'bg-[#171B26]/90 border border-[#818CF8]/35 shadow-[0_0_30px_rgba(129,140,248,0.12)]'
                        : 'bg-transparent border border-transparent hover:bg-[#151924]/60'
                    }`}
                    aria-label={feature.action}
                  >
                    <div className="flex items-center gap-6 sm:gap-8 min-w-0 pr-4">
                      {/* Large background number (01–04) on the left */}
                      <span
                        className={`text-3xl sm:text-4xl tabular-nums tracking-tight transition-colors duration-300 shrink-0 font-display ${
                          isActive
                            ? 'text-[#A5B4FC] font-medium'
                            : 'text-[#929BAD]/35 font-light group-hover:text-[#A5B4FC]'
                        }`}
                      >
                        {feature.number}
                      </span>

                      {/* Original feature title and exact description */}
                      <div className="min-w-0">
                        <h3
                          className={`text-base sm:text-[17px] font-medium tracking-tight transition-colors duration-300 ${
                            isActive
                              ? 'text-[#F5F5F7]'
                              : 'text-[#E2E8F0] group-hover:text-[#F5F5F7]'
                          }`}
                        >
                          {feature.title}
                        </h3>
                        <p
                          className={`text-xs sm:text-sm mt-1 transition-colors duration-300 ${
                            isActive
                              ? 'text-[#929BAD]'
                              : 'text-[#929BAD]/80 group-hover:text-[#929BAD]'
                          }`}
                        >
                          {feature.description}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          <span className="text-[#A5B4FC]/80 font-mono tracking-tight text-[11px]">
                            {feature.detail}
                          </span>
                          <span className="text-[#818CF8] underline underline-offset-4 text-[11px] font-medium hidden sm:inline-block">
                            {feature.action}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Far right icon: lock if disabled, arrow if active */}
                    <div className="shrink-0 pl-2">
                      {feature.disabled ? (
                        <LockKeyhole
                          className="w-4 h-4 text-[#929BAD]/40"
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />
                      ) : (
                        <ArrowRight
                          className={`w-4 h-4 transition-all duration-300 ${
                            isActive
                              ? 'text-[#A5B4FC] translate-x-1'
                              : 'text-[#929BAD]/40 group-hover:text-[#A5B4FC] group-hover:translate-x-1'
                          }`}
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </button>

                  {/* Thin horizontal divider between inactive rows */}
                  {showDivider && (
                    <div
                      className="mx-6 h-[1px] bg-[#1D212C]"
                      aria-hidden="true"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
