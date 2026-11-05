import { useRef, useState } from 'react';
import { ArrowRight, Check, KeyRound, LoaderCircle, X } from 'lucide-react';
import type { ModalProps, Role } from '../../types';

interface SignInModalProps extends ModalProps {
  activeRole?: Role;
  onSignIn: (role: Role) => Promise<void>;
}

const roles: Array<{ id: Role; name: string; badge: string; desc: string; permissions: string[] }> = [
  {
    id: 'creator',
    name: 'Content Creator / Agency',
    badge: 'Editor Role',
    desc: 'Write a draft, upload a document, and see how BrandGuard reviews your content.',
    permissions: ['Draft & Upload Content', 'Run AI Audits', 'Revise Content', 'Request Review'],
  },
  {
    id: 'manager',
    name: 'Brand & Communications Manager',
    badge: 'Reviewer Role',
    desc: 'Explore brand guidelines, review submissions, and approve content without high-risk findings.',
    permissions: ['Edit Brand Guidelines', 'Review Submissions', 'Approve Revisions', 'View Analytics'],
  },
  {
    id: 'legal',
    name: 'Legal & Regulatory Counsel',
    badge: 'Gatekeeper Role',
    desc: 'Review flagged claims and give final approval to content with high-risk findings.',
    permissions: ['Review High-Risk Claims', 'Approve High-Risk Content', 'Add Feedback', 'View Review History'],
  },
];

export default function SignInModal({ isOpen, onClose, activeRole, onSignIn }: SignInModalProps) {
  const [signingInRole, setSigningInRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  if (!isOpen) return null;

  async function enterDemo(role: Role) {
    if (busy.current) return;
    busy.current = true;
    setSigningInRole(role);
    setError(null);
    try {
      await onSignIn(role);
    } catch {
      setError('Could not start the demo. Please try your role again in a moment.');
    } finally {
      busy.current = false;
      setSigningInRole(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <section role="dialog" aria-modal="true" aria-labelledby="demo-login-title" aria-describedby="demo-login-description" className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#090e1a] text-slate-200 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 bg-[#0a101f] p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-950/60 text-cyan-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 id="demo-login-title" className="text-lg font-bold text-white">Choose your demo role</h2>
              <p id="demo-login-description" className="mt-1 text-sm text-slate-400">
                One click to explore BrandGuard. No email or password needed.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={signingInRole !== null} aria-label="Close demo login" className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:opacity-50">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto p-5" aria-busy={signingInRole !== null}>
          {roles.map((role) => {
            const isActive = activeRole === role.id;
            const isLoading = signingInRole === role.id;
            return (
              <button
                type="button"
                key={role.id}
                onClick={() => void enterDemo(role.id)}
                disabled={signingInRole !== null}
                aria-label={'Enter demo as ' + role.name}
                aria-pressed={isActive}
                className={'group w-full rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-wait disabled:opacity-60 ' + (isActive ? 'border-cyan-400/60 bg-[#10182c]' : 'border-slate-800 bg-[#080d19] hover:border-cyan-400/60 hover:bg-[#10182c]')}
              >
                <span className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold text-white">{role.name}</span>
                  <span className="flex items-center gap-2">
                    <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-300">{role.badge}</span>
                    {isActive && <span className="flex items-center gap-1 text-xs text-cyan-400"><Check className="h-3.5 w-3.5" />Active</span>}
                  </span>
                </span>
                <span className="mb-3 block text-xs leading-relaxed text-slate-400">{role.desc}</span>
                <span className="mb-3 flex flex-wrap gap-1.5">
                  {role.permissions.map((permission) => (
                    <span key={permission} className="rounded border border-slate-800 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-300">{permission}</span>
                  ))}
                </span>
                <span className="flex items-center gap-2 text-xs font-semibold text-cyan-400">
                  {isLoading ? <><LoaderCircle className="h-4 w-4 animate-spin" />Opening demo...</> : <>Enter demo<ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></>}
                </span>
              </button>
            );
          })}
          {error && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-950/30 p-3 text-sm text-rose-300">{error}</p>}
        </div>

        <div className="border-t border-slate-800 bg-[#0a101f] px-5 py-3 text-xs leading-relaxed text-slate-400">
          Hackathon demo · Your role stays active after refresh. Use the demo account button to explore another role.
        </div>
      </section>
    </div>
  );
}
