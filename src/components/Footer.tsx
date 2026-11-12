import React from 'react';
import { ShieldCheck } from 'lucide-react';
import type { VoidHandler } from '../types';

interface FooterProps {
  onOpenWhitepaper: VoidHandler;
  onOpenDocs: VoidHandler;
  onOpenStatus: VoidHandler;
}

export default function Footer({
  onOpenWhitepaper,
  onOpenDocs,
  onOpenStatus,
}: FooterProps) {
  return (
    <footer className="w-full bg-[#0D0F15] border-t border-[#1D212C] pt-8 pb-6 text-[#F5F5F7]">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
          {/* LEFT SIDE: Brand identity, Demo badge, Separator, Tagline */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-4">
            {/* Logo + Wordmark */}
            <div className="flex items-center gap-2">
              <ShieldCheck
                className="w-5 h-5 text-[#A5B4FC]"
                strokeWidth={1.8}
                aria-hidden="true"
              />
              <span className="font-display font-semibold text-base sm:text-lg text-[#F5F5F7] tracking-tight">
                BrandGuard
              </span>
            </div>

            {/* DEMO badge */}
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono tracking-widest text-[#A5B4FC] bg-[#151821] border border-[#818CF8]/30 uppercase">
              DEMO
            </span>

            {/* Subtle vertical separator */}
            <span
              className="hidden sm:inline-block h-3.5 w-[1px] bg-[#2A2F3D] mx-1"
              aria-hidden="true"
            />

            {/* EXACT original tagline preserved 100% */}
            <p className="text-xs sm:text-sm text-[#929BAD] whitespace-nowrap">
              More creativity. Less second-guessing.
            </p>
          </div>

          {/* RIGHT SIDE: EXACT original navigation labels and handlers preserved 100% */}
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-6 sm:gap-8 text-xs sm:text-sm">
            {/* Original label & exact handler: Audit reports -> onOpenWhitepaper (opens ExportReportModal) */}
            <button
              type="button"
              onClick={onOpenWhitepaper}
              className="text-[#929BAD] hover:text-[#F5F5F7] transition-colors cursor-pointer"
            >
              Audit reports
            </button>

            {/* Original label & exact handler: Brand rules -> onOpenDocs (opens BrandVaultModal) */}
            <button
              type="button"
              onClick={onOpenDocs}
              className="text-[#929BAD] hover:text-[#F5F5F7] transition-colors cursor-pointer"
            >
              Brand rules
            </button>

            {/* Original label & exact handler: Hackathon edition -> onOpenStatus (opens Hackathon status dialog) */}
            <button
              type="button"
              onClick={onOpenStatus}
              className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-medium text-[#A5B4FC] bg-[#242838] hover:bg-[#2F344A] border border-[#818CF8]/30 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-[0_0_15px_rgba(165,180,252,0.2)]"
            >
              Hackathon edition
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
