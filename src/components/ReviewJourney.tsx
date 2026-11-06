import React from 'react';
import {
  FileText,
  Sparkles,
  SquarePen,
  CheckCircle2,
  BrainCircuit,
  Fingerprint,
  UsersRound,
} from 'lucide-react';

interface Stage {
  number: string;
  name: string;
  description: string;
  icon: React.ElementType;
}

const STAGES: Stage[] = [
  {
    number: '01',
    name: 'Create',
    description: 'Submit your draft or upload content.',
    icon: FileText,
  },
  {
    number: '02',
    name: 'Audit',
    description: 'AI checks it against approved brand sources.',
    icon: Sparkles,
  },
  {
    number: '03',
    name: 'Refine',
    description: 'Review findings and apply suggested fixes.',
    icon: SquarePen,
  },
  {
    number: '04',
    name: 'Approve',
    description: 'An authorised reviewer makes the final decision.',
    icon: CheckCircle2,
  },
];

// Original BrandGuard approach items preserved 100%
const APPROACH_ITEMS = [
  {
    icon: BrainCircuit,
    title: 'AI with context',
    detail: 'Reviews against the policy you define.',
  },
  {
    icon: Fingerprint,
    title: 'A voice that is yours',
    detail: 'Your guidelines lead every review.',
  },
  {
    icon: UsersRound,
    title: 'People stay in control',
    detail: 'Suggestions from AI. Decisions from you.',
  },
];

export default function ReviewJourney() {
  return (
    <section
      id="review-journey"
      aria-label="The Review Journey"
      className="w-full bg-[#0D0F15] py-24 border-b border-[#1D212C]"
    >
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-16">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-semibold tracking-[0.2em] text-[#A5B4FC] uppercase font-mono">
              THE REVIEW JOURNEY
            </h2>
            <span className="h-[1px] w-10 bg-[#818CF8]/40" aria-hidden="true" />
          </div>
          <p className="text-sm text-[#929BAD] sm:text-right">
            From first draft to final approval.
          </p>
        </div>

        {/* Workflow Timeline */}
        <div className="relative mb-16">
          {/* Continuous thin horizontal connecting line through icon centers on md+ screens */}
          <div className="hidden md:block absolute top-[28px] -translate-y-1/2 left-[12%] right-[12%] h-[1px] bg-gradient-to-r from-[#818CF8]/20 via-[#818CF8]/50 to-[#818CF8]/20 z-0 pointer-events-none">
            {/* Glowing lavender lens flare dot at the exact center between Audit (02) and Refine (03) */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
              {/* Horizontal optical light flare streak */}
              <div
                className="w-28 lg:w-40 h-[2px] bg-gradient-to-r from-transparent via-[#A5B4FC] to-transparent blur-[0.5px]"
                aria-hidden="true"
              />
              {/* Soft purple radial bloom */}
              <div
                className="absolute w-8 h-8 rounded-full bg-[#818CF8]/35 blur-md"
                aria-hidden="true"
              />
              {/* Bright center star/core */}
              <div
                className="absolute w-2 h-2 rounded-full bg-[#FFFFFF] shadow-[0_0_12px_3px_rgba(165,180,252,0.9),0_0_24px_6px_rgba(129,140,248,0.5)]"
                aria-hidden="true"
              />
            </div>
          </div>

          {/* 4 Stages: Create -> Audit -> Refine -> Approve */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 md:gap-6 relative z-10">
            {STAGES.map((stage) => {
              const Icon = stage.icon;
              return (
                <div
                  key={stage.number}
                  className="group flex flex-col items-center text-center cursor-default"
                >
                  {/* Circular icon container with lavender outline */}
                  <div className="w-14 h-14 rounded-full bg-[#151821] border border-[#818CF8]/40 flex items-center justify-center text-[#A5B4FC] transition-all duration-300 group-hover:scale-105 group-hover:border-[#A5B4FC] group-hover:shadow-[0_0_20px_rgba(165,180,252,0.35)] group-hover:bg-[#1C202C]">
                    <Icon className="w-5 h-5" strokeWidth={1.75} />
                  </div>

                  {/* Stage heading in white */}
                  <h3 className="mt-5 text-sm sm:text-base font-medium text-[#F5F5F7] tracking-tight transition-colors duration-200 group-hover:text-white">
                    {stage.number} {stage.name}
                  </h3>

                  {/* Description in muted blue-grey */}
                  <p className="mt-1.5 text-xs sm:text-sm text-[#929BAD] max-w-[200px] leading-relaxed transition-colors duration-200 group-hover:text-[#CBD5E1]">
                    {stage.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Original BrandGuard approach items preserved 100% */}
        <div className="pt-10 border-t border-[#1D212C] grid grid-cols-1 md:grid-cols-3 gap-6">
          {APPROACH_ITEMS.map(({ icon: Icon, title, detail }) => (
            <div
              key={title}
              className="flex items-start gap-4 p-4 rounded-xl bg-[#13161F]/60 border border-[#232734]/50"
            >
              <div className="w-9 h-9 rounded-lg bg-[#1D212C] flex items-center justify-center shrink-0 border border-[#818CF8]/20">
                <Icon className="w-4 h-4 text-[#A5B4FC]" strokeWidth={1.6} />
              </div>
              <div>
                <h4 className="text-sm font-medium text-[#F5F5F7]">{title}</h4>
                <p className="text-xs text-[#929BAD] mt-0.5 leading-relaxed">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
