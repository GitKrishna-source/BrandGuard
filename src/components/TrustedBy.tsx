import React from 'react';
import { Layers, Box, Compass, Hexagon, ShieldAlert } from 'lucide-react';

export default function TrustedBy() {
  const logos = [
    { name: 'FormBold', icon: Layers },
    { name: 'Uldeck', icon: Box },
    { name: 'FormBold', icon: Layers },
    { name: 'Uldeck', icon: Box },
    { name: 'FormBold', icon: Layers },
  ];

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-14 text-center">
      <div className="text-[11px] font-mono tracking-widest text-slate-500 uppercase mb-8">
        — TRUSTED BY FAST-MOVING MARKETING & COMMS TEAMS —
      </div>

      <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 md:gap-16 opacity-75 hover:opacity-100 transition-opacity">
        {logos.map((logo, idx) => {
          const Icon = logo.icon;
          return (
            <div 
              key={idx} 
              className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer group"
            >
              <Icon className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
              <span className="text-base sm:text-lg font-bold tracking-tight text-slate-300 group-hover:text-white">
                {logo.name}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
