import { ArrowUpRight, BookOpen, Check, Fingerprint, GitPullRequest, LockKeyhole, Sparkles, TrendingUp } from 'lucide-react';
import type { Role, VoidHandler } from '../types';

interface FourPillarsProps { onOpenVault: VoidHandler; onOpenApprovals: VoidHandler; onOpenAnalytics: VoidHandler; onOpenAudit: VoidHandler; currentRole: Role }
export default function FourPillars({ onOpenVault, onOpenApprovals, onOpenAnalytics, onOpenAudit, currentRole }: FourPillarsProps) {
  const canReview = currentRole !== 'creator';
  return (
    <section id="architecture-section" className="mx-auto max-w-6xl px-5 py-16 sm:px-7 sm:py-24">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
        <div><span className="eyebrow mb-4"><Sparkles className="h-3.5 w-3.5" />Everything, in harmony</span><h2 className="section-heading text-white">One workspace.<br /><span className="text-[#9d8bb1]">Every detail considered.</span></h2></div>
        <p className="max-w-xs text-sm leading-6 text-[#a193b3]">From a first draft to the final nod. Keep your brand's voice close, and your team on the same page.</p>
      </div>
      <div className="bento-grid">
        <button onClick={onOpenVault} className="bento-card bento-wide glass-panel group">
          <span className="mb-6 flex items-center justify-between"><span className="bento-icon"><BookOpen className="h-5 w-5" /></span><span className="bento-arrow"><ArrowUpRight className="h-4 w-4" /></span></span>
          <h3 className="mb-2 text-xl font-semibold tracking-tight text-white">Your brand's source of truth.</h3>
          <p className="mb-6 max-w-sm text-sm leading-6 text-[#a99aba]">A home for the voice, words, and approved facts that make your brand unmistakable.</p>
          <div className="rule-preview flex flex-wrap items-center gap-3">
            <span className="flex -space-x-1.5" aria-hidden="true">{['#8b5cf6', '#c4b5fd', '#e9d5ff', '#4c1d95'].map((color) => <span key={color} style={{ background: color }} className="h-7 w-7 rounded-full border-2 border-[#1b1227]" />)}</span>
            <span className="ml-1 text-[10px] text-[#b7a6ca]">Confident. Clear. Consistently you.</span>
            <Fingerprint className="ml-auto h-5 w-5 text-violet-300/60" />
          </div>
          <span className="mt-5 block text-xs text-violet-300">Explore the brand vault →</span>
        </button>
        <button onClick={onOpenAudit} className="bento-card bento-narrow glass-panel group">
          <span className="mb-6 flex items-center justify-between"><span className="bento-icon"><Sparkles className="h-5 w-5" /></span><span className="bento-arrow"><ArrowUpRight className="h-4 w-4" /></span></span>
          <h3 className="mb-2 text-xl font-semibold tracking-tight text-white">A thoughtful second look.</h3>
          <p className="mb-6 text-sm leading-6 text-[#a99aba]">Catch off-brand language and unsupported claims, with suggestions that preserve your intent.</p>
          <div className="rule-preview space-y-2 text-xs"><span className="block text-[#b79aaa] line-through decoration-rose-300/50">Our platform is guaranteed to...</span><span className="flex items-center gap-2 text-violet-200"><Sparkles className="h-3 w-3" />Try an evidence-backed statement.</span></div>
          <span className="mt-5 block text-xs text-violet-300">Give your draft a review →</span>
        </button>
        <button onClick={canReview ? onOpenApprovals : undefined} disabled={!canReview} className="bento-card bento-narrow glass-panel group disabled:opacity-70">
          <span className="mb-6 flex items-center justify-between"><span className="bento-icon"><GitPullRequest className="h-5 w-5" /></span><span className="bento-arrow">{canReview ? <ArrowUpRight className="h-4 w-4" /> : <LockKeyhole className="h-3.5 w-3.5" />}</span></span>
          <h3 className="mb-2 text-xl font-semibold tracking-tight text-white">Human judgment. Always.</h3>
          <p className="mb-6 text-sm leading-6 text-[#a99aba]">Give creators, managers, and legal reviewers their place in the conversation.</p>
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#b6a7c7]">{['Create', 'Review', 'Approve'].map((label, index) => <span key={label} className="flex items-center gap-2"><span className="rule-preview !px-3 !py-2">{label}</span>{index < 2 && <span className="text-violet-400">→</span>}</span>)}</div>
          <span className="mt-5 block text-xs text-violet-300">{canReview ? 'Open the review queue →' : 'Explore with a reviewer demo role'}</span>
        </button>
        <button onClick={canReview ? onOpenAnalytics : undefined} disabled={!canReview} className="bento-card bento-wide glass-panel group disabled:opacity-70">
          <span className="mb-6 flex items-center justify-between"><span className="bento-icon"><TrendingUp className="h-5 w-5" /></span><span className="bento-arrow">{canReview ? <ArrowUpRight className="h-4 w-4" /> : <LockKeyhole className="h-3.5 w-3.5" />}</span></span>
          <h3 className="mb-2 text-xl font-semibold tracking-tight text-white">See the bigger picture.</h3>
          <p className="mb-6 max-w-sm text-sm leading-6 text-[#a99aba]">Spot recurring issues across your audits. Turn the patterns into clearer guidance for your next draft.</p>
          <div className="rule-preview grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 text-[10px] text-[#aa98bf]">
            <span>Claims</span><span className="mini-bar w-4/5" /><span>Terminology</span><span className="mini-bar w-3/5 opacity-75" /><span>Brand voice</span><span className="mini-bar w-2/5 opacity-50" />
          </div>
          <span className="mt-5 flex items-center gap-2 text-xs text-violet-300"><Check className="h-3.5 w-3.5" />{canReview ? 'Explore your audit insights →' : 'Explore with a reviewer demo role'}</span>
        </button>
      </div>
    </section>
  );
}
