import React from 'react';
import { Shield, ArrowRight, Sparkles } from 'lucide-react';
import type { Role, VoidHandler } from '../types';

interface NavbarProps { onOpenAudit: VoidHandler; onOpenVault: VoidHandler; onOpenApprovals: VoidHandler; onOpenAnalytics: VoidHandler; onOpenSignIn: VoidHandler; currentRole: Role }
export default function Navbar({ onOpenAudit, onOpenVault, onOpenApprovals, onOpenAnalytics, onOpenSignIn, currentRole }: NavbarProps) {
  const canReview = currentRole !== 'creator';
  const scrollToArchitecture = () => {
    const el = document.getElementById('architecture-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToHero = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#070a13]/85 border-b border-slate-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={scrollToHero}>
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-950/40 border border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
            <Shield className="w-4 h-4 fill-cyan-400/20" />
            <div className="absolute inset-0 rounded-lg bg-cyan-400/10 animate-pulse" />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="font-bold text-base sm:text-lg tracking-tight text-white flex items-center">
              BrandGuard<span className="text-cyan-400">.ai</span>
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700/80 text-slate-400">
              v1.4 PROTO
            </span>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center space-x-7 text-xs font-medium tracking-wide text-slate-300">
          {canReview && <button onClick={onOpenApprovals} className="hover:text-cyan-300 transition-colors focus:outline-none">Solutions</button>}
          
          <button 
            onClick={onOpenVault}
            className="hover:text-cyan-300 transition-colors focus:outline-none"
          >
            Engine & Rules
          </button>
          
          <button 
            onClick={onOpenAudit}
            className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 transition-colors focus:outline-none font-semibold"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span className="relative">Live Audit Demo</span>
          </button>
          
          <button 
            onClick={scrollToArchitecture}
            className="hover:text-cyan-300 transition-colors focus:outline-none"
          >
            Architecture
          </button>
          
          {canReview && <button onClick={onOpenAnalytics} className="hover:text-cyan-300 transition-colors focus:outline-none">Governance</button>}
        </nav>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-4">
          <button 
            onClick={onOpenSignIn}
            className="text-xs font-medium text-slate-300 hover:text-white transition-colors hidden sm:block focus:outline-none"
          >
            Sign In / Log In
          </button>
          
          <button 
            onClick={onOpenAudit}
            className="group relative inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:scale-95 transition-all rounded-lg shadow-[0_0_20px_rgba(34,211,238,0.35)] focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
          >
            <span>Launch Audit</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </header>
  );
}
