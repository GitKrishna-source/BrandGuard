import { ShieldCheck, UserRound } from 'lucide-react';
import type { Role, VoidHandler } from '../types';

interface NavbarProps { onOpenAudit: VoidHandler; onOpenVault: VoidHandler; onOpenApprovals: VoidHandler; onOpenAnalytics: VoidHandler; onOpenSignIn: VoidHandler; currentRole: Role; isAuthenticated: boolean }
export default function Navbar({ onOpenAudit, onOpenVault, onOpenApprovals, onOpenAnalytics, onOpenSignIn, currentRole, isAuthenticated }: NavbarProps) {
  const canReview = currentRole !== 'creator';
  const accountLabel = currentRole === 'manager' ? 'Manager Demo' : currentRole === 'legal' ? 'Legal Demo' : 'Creator Demo';
  return (
    <header className="site-header">
      <div className="site-nav page-container">
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="BrandGuard home" className="brand-home">
          <span className="brand-mark"><ShieldCheck strokeWidth={1.6} aria-hidden="true" /></span>BrandGuard
        </button>
        <nav aria-label="Main navigation" className="nav-links">
          <button onClick={onOpenAudit}>The studio</button>
          <button onClick={onOpenVault}>Brand vault</button>
          <button onClick={() => document.getElementById('architecture-section')?.scrollIntoView({ behavior: 'smooth' })}>How it works</button>
          {canReview && <button onClick={onOpenApprovals}>Reviews</button>}
          {canReview && <button onClick={onOpenAnalytics}>Insights</button>}
        </nav>
        <div className="nav-actions">
          <button onClick={onOpenSignIn} className="nav-account"><UserRound size={15} aria-hidden="true" />{isAuthenticated ? accountLabel : 'Demo Login'}</button>
          <button onClick={onOpenAudit} className="purple-button"><span className="hidden sm:inline">Launch Audit</span><span className="sm:hidden">Audit</span></button>
        </div>
      </div>
    </header>
  );
}
