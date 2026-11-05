import { ArrowUpRight, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import type { Role, VoidHandler } from '../types';

interface NavbarProps { onOpenAudit: VoidHandler; onOpenVault: VoidHandler; onOpenApprovals: VoidHandler; onOpenAnalytics: VoidHandler; onOpenSignIn: VoidHandler; currentRole: Role; isAuthenticated: boolean }
export default function Navbar({ onOpenAudit, onOpenVault, onOpenApprovals, onOpenAnalytics, onOpenSignIn, currentRole, isAuthenticated }: NavbarProps) {
  const canReview = currentRole !== 'creator';
  const accountLabel = currentRole === 'manager' ? 'Manager Demo' : currentRole === 'legal' ? 'Legal Demo' : 'Creator Demo';
  return (
    <header className="sticky top-3 z-40">
      <div className="site-nav flex h-[68px] items-center justify-between gap-3 px-4 sm:px-6">
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="BrandGuard home" className="flex items-center gap-2.5">
          <span className="brand-mark"><ShieldCheck className="h-5 w-5" strokeWidth={1.7} /></span>
          <span className="text-sm font-semibold tracking-[-.04em] text-white sm:text-lg">BrandGuard<span className="text-violet-300">.</span></span>
          <span className="ml-1 hidden rounded-full border border-violet-300/15 px-2 py-0.5 text-[9px] font-medium tracking-wider text-violet-300 sm:inline">DEMO</span>
        </button>
        <nav aria-label="Main navigation" className="hidden items-center gap-7 text-xs text-[#aaa0ba] lg:flex">
          <button onClick={onOpenAudit} className="transition-colors hover:text-white">The studio</button>
          <button onClick={onOpenVault} className="transition-colors hover:text-white">Brand vault</button>
          <button onClick={() => document.getElementById('architecture-section')?.scrollIntoView({ behavior: 'smooth' })} className="transition-colors hover:text-white">How it works</button>
          {canReview && <button onClick={onOpenApprovals} className="transition-colors hover:text-white">Reviews</button>}
          {canReview && <button onClick={onOpenAnalytics} className="transition-colors hover:text-white">Insights</button>}
        </nav>
        <div className="flex items-center gap-3 sm:gap-5">
          <button onClick={onOpenSignIn} className="flex items-center gap-1.5 whitespace-nowrap text-[10px] text-[#c3b4d8] transition-colors hover:text-white sm:text-xs"><UserRound className="hidden h-3.5 w-3.5 sm:block" /><span>{isAuthenticated ? accountLabel : 'Demo Login'}</span></button>
          <button onClick={onOpenAudit} className="purple-button px-3 py-2.5 text-[10px] font-semibold sm:px-4 sm:text-xs"><Sparkles className="h-3.5 w-3.5" /><span className="hidden sm:inline">Launch Audit</span><span className="sm:hidden">Audit</span><ArrowUpRight className="hidden h-3.5 w-3.5 sm:inline" /></button>
        </div>
      </div>
    </header>
  );
}
