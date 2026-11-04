import React from 'react';
import type { VoidHandler } from '../types';

interface FooterProps { onOpenWhitepaper: VoidHandler; onOpenDocs: VoidHandler; onOpenStatus: VoidHandler }
export default function Footer({ onOpenWhitepaper, onOpenDocs, onOpenStatus }: FooterProps) {
  return (
    <footer className="border-t border-slate-900 bg-[#050810] py-8 text-xs font-mono text-slate-500">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left Copy */}
        <div className="flex items-center gap-2 text-center sm:text-left">
          <span className="font-semibold text-slate-300">BrandGuard AI Inc.</span>
          <span className="text-slate-600">—</span>
          <span>Pre-publication governance and verifiable communications.</span>
        </div>

        {/* Right Links */}
        <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-6">
          <button 
            onClick={onOpenWhitepaper} 
            className="hover:text-cyan-400 transition-colors focus:outline-none"
          >
            Security Whitepaper
          </button>
          
          <button 
            onClick={() => alert("BrandGuard Zero-Data-Retention Privacy Policy: No customer prompts or scanned drafts are logged or used for LLM retraining.")}
            className="hover:text-cyan-400 transition-colors focus:outline-none"
          >
            Privacy Policy
          </button>
          
          <button 
            onClick={onOpenDocs} 
            className="hover:text-cyan-400 transition-colors focus:outline-none"
          >
            API Docs
          </button>
          
          <button 
            onClick={onOpenStatus} 
            className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-colors focus:outline-none"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Status (99.99%)</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
