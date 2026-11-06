import React from 'react';
import { Feather, Layers, ShieldCheck, Layout, Users } from 'lucide-react';

interface StandardItem {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
}

const STANDARD_ITEMS: StandardItem[] = [
  {
    id: 'voice',
    label: 'VOICE',
    description: 'Consistent and on-brand.',
    icon: Feather,
  },
  {
    id: 'facts',
    label: 'FACTS',
    description: 'From approved sources.',
    icon: Layers,
  },
  {
    id: 'claims',
    label: 'CLAIMS',
    description: 'Evidence-backed only.',
    icon: ShieldCheck,
  },
  {
    id: 'style',
    label: 'STYLE',
    description: 'Visually and textually aligned.',
    icon: Layout,
  },
  {
    id: 'approval',
    label: 'APPROVAL',
    description: 'Always human-led.',
    icon: Users,
  },
];

export default function BrandguardStandard() {
  return (
    <section
      id="brandguard-standard"
      aria-label="The BrandGuard Standard"
      className="w-full bg-[#0D0F15] py-20 border-b border-[#1D212C]"
    >
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-14">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-semibold tracking-[0.2em] text-[#A5B4FC] uppercase font-mono">
              THE BRANDGUARD STANDARD
            </h2>
            <span className="h-[1px] w-8 bg-[#818CF8]/40 hidden sm:inline-block" aria-hidden="true" />
          </div>
          <p className="text-sm text-[#929BAD] sm:text-right">
            Your content, checked across what truly matters.
          </p>
        </div>

        {/* Visual Brand-Quality Framework */}
        <div className="relative">
          {/* Subtle curved connecting line passing precisely through icon centers on md+ screens */}
          <div className="hidden md:block absolute top-[28px] -translate-y-1/2 left-[10%] right-[10%] h-8 pointer-events-none z-0">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 1000 32"
              fill="none"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="standard-line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#818CF8" stopOpacity="0.15" />
                  <stop offset="25%" stopColor="#A5B4FC" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#C7D2FE" stopOpacity="0.95" />
                  <stop offset="75%" stopColor="#A5B4FC" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#818CF8" stopOpacity="0.15" />
                </linearGradient>
                <filter id="standard-glow" x="-20%" y="-100%" width="140%" height="300%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {/* Gentle curved sinusoidal path weaving through center */}
              <path
                d="M 0 16 Q 125 4, 250 16 T 500 16 T 750 16 T 1000 16"
                stroke="url(#standard-line-grad)"
                strokeWidth="1.75"
                filter="url(#standard-glow)"
              />
            </svg>
          </div>

          {/* 5 Evenly Spaced Elements */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 sm:gap-8 relative z-10">
            {STANDARD_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="group flex flex-col items-center text-center cursor-default"
                >
                  {/* Dark square with subtle lavender border */}
                  <div className="w-14 h-14 rounded-xl bg-[#151821] border border-[#818CF8]/30 flex items-center justify-center transition-all duration-300 group-hover:border-[#A5B4FC] group-hover:shadow-[0_0_20px_rgba(165,180,252,0.35)] group-hover:scale-105 group-hover:bg-[#1D212C]">
                    <Icon
                      className="w-5 h-5 text-[#A5B4FC] transition-transform duration-300 group-hover:scale-110"
                      strokeWidth={1.8}
                    />
                  </div>

                  {/* Lavender section label */}
                  <span className="mt-4 text-xs font-semibold tracking-wider text-[#A5B4FC] uppercase font-mono">
                    {item.label}
                  </span>

                  {/* Smaller muted description, brightens on hover */}
                  <p className="mt-1.5 text-xs text-[#929BAD] max-w-[140px] leading-relaxed transition-colors duration-200 group-hover:text-[#F5F5F7]">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
