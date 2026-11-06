import { ArrowUpRight, BookOpen, GitPullRequest, LockKeyhole, ScanLine, TrendingUp } from 'lucide-react';
import type { Role, VoidHandler } from '../types';

interface FourPillarsProps { onOpenVault: VoidHandler; onOpenApprovals: VoidHandler; onOpenAnalytics: VoidHandler; onOpenAudit: VoidHandler; currentRole: Role }
export default function FourPillars({ onOpenVault, onOpenApprovals, onOpenAnalytics, onOpenAudit, currentRole }: FourPillarsProps) {
  const canReview = currentRole !== 'creator';
  const features = [
    { title: 'Your brand’s source of truth.', description: 'A home for the voice, words, and approved facts that make your brand unmistakable.', detail: 'Confident. Clear. Consistently you.', action: 'Explore the brand vault', icon: BookOpen, handler: onOpenVault, disabled: false },
    { title: 'A thoughtful second look.', description: 'Catch off-brand language and unsupported claims, with suggestions that preserve your intent.', detail: 'Try an evidence-backed statement.', action: 'Give your draft a review', icon: ScanLine, handler: onOpenAudit, disabled: false },
    { title: 'Human judgment. Always.', description: 'Give creators, managers, and legal reviewers their place in the conversation.', detail: 'Create. Review. Approve.', action: canReview ? 'Open the review queue' : 'Explore with a reviewer demo role', icon: GitPullRequest, handler: onOpenApprovals, disabled: !canReview },
    { title: 'See the bigger picture.', description: 'Spot recurring issues across your audits. Turn the patterns into clearer guidance for your next draft.', detail: 'Claims, terminology, and brand voice.', action: canReview ? 'Explore your audit insights' : 'Explore with a reviewer demo role', icon: TrendingUp, handler: onOpenAnalytics, disabled: !canReview },
  ];
  return (
    <section id="architecture-section" className="workflow-section page-container">
      <div className="workflow-intro"><h2 className="section-heading">One workspace.<br />Every detail considered.</h2><p>From a first draft to the final nod. Keep your brand’s voice close, and your team on the same page.</p></div>
      <div>{features.map(({ title, description, detail, action, icon: Icon, handler, disabled }, index) => {
        const content = <>
          <Icon strokeWidth={1.5} aria-hidden="true" />
          <div><h3>{title}</h3><p>{description}</p><small>{detail}</small><span className="workflow-action">{action}</span></div>
          {disabled ? <LockKeyhole size={17} aria-hidden="true" /> : <ArrowUpRight size={19} aria-hidden="true" />}
        </>;
        if (index === 2) return <button key={title} type="button" onClick={canReview ? onOpenApprovals : undefined} disabled={!canReview} className="workflow-row" aria-label={action}>{content}</button>;
        if (index === 3) return <button key={title} type="button" onClick={canReview ? onOpenAnalytics : undefined} disabled={!canReview} className="workflow-row" aria-label={action}>{content}</button>;
        return <button key={title} type="button" onClick={handler} className="workflow-row" aria-label={action}>{content}</button>;
      })}</div>
    </section>
  );
}
