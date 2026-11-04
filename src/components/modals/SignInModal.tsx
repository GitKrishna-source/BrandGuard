import React, { useState } from 'react';
import { X, ShieldCheck, User, Check, KeyRound } from 'lucide-react';
import type { Role, ModalProps } from '../../types';

interface SignInModalProps extends ModalProps {
  currentRole: Role;
  onSelectRole: (role: Role) => void;
  onSignIn: (role: Role, username: string, password: string) => Promise<void>;
}
export default function SignInModal({ isOpen, onClose, currentRole, onSelectRole, onSignIn }: SignInModalProps) {
  const [username, setUsername] = useState('creator@brandguard.local');
  const [password, setPassword] = useState('creator-demo');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!isOpen) return null;

  const roles: Array<{ id: Role; name: string; badge: string; desc: string; permissions: string[] }> = [
    {
      id: 'creator',
      name: 'Content Creator / Agency',
      badge: 'Editor Role',
      desc: 'Can draft announcements, upload imagery, run AI scans, and request reviews.',
      permissions: ['Draft & Edit Content', 'Run Real-Time AI Checks', 'Apply AI Remediations', 'Submit for Review']
    },
    {
      id: 'manager',
      name: 'Brand & Communications Manager',
      badge: 'Reviewer Role',
      desc: 'Oversees brand voice consistency, approves tone drifts, and reviews team submissions.',
      permissions: ['Edit Brand Guidelines & Vault', 'Approve / Reject Submissions', 'Manage Lexicon Rules', 'View Governance Heatmaps']
    },
    {
      id: 'legal',
      name: 'Legal & Regulatory Counsel',
      badge: 'Gatekeeper Role',
      desc: 'Final sign-off authority on SEC disclosures, comparative performance claims, and high-risk liabilities.',
      permissions: ['Sole Authority to Publish High-Risk Claims', 'Cryptographic Signoff Stamp', 'SEC Safe Harbor Enforcement', 'CMS Push Authorization']
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-[#090e1a] border border-slate-800 shadow-2xl text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#0a101f]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Stakeholder Persona & Access Control
              </h2>
              <p className="text-xs font-mono text-slate-400">
                Select your active persona to inspect permissions & approval privileges
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Roles List */}
        <div className="p-6 space-y-3">
          {roles.map((r) => {
            const isCurrent = currentRole === r.id;
            return (
              <div
                key={r.id}
                onClick={() => {
                  onSelectRole(r.id);
                  setUsername(`${r.id}@brandguard.local`);
                  setPassword(`${r.id}-demo`);
                }}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isCurrent
                    ? 'bg-[#10182c] border-cyan-400/60 shadow-lg shadow-cyan-950/40'
                    : 'bg-[#080d19] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{r.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {r.badge}
                    </span>
                  </div>
                  {isCurrent && (
                    <span className="text-xs font-mono text-cyan-400 flex items-center gap-1 font-semibold">
                      <Check className="w-3.5 h-3.5" />
                      Active
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 mb-3">{r.desc}</p>

                <div className="flex flex-wrap gap-1.5">
                  {r.permissions.map((perm, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300"
                    >
                      ✓ {perm}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <form
          id="sign-in-form"
          onSubmit={async (event) => {
            event.preventDefault();
            setIsSigningIn(true);
            setError(null);
            try {
              await onSignIn(currentRole, username, password);
            } catch (signInError) {
              setError(signInError instanceof Error ? signInError.message : 'Unable to sign in.');
            } finally {
              setIsSigningIn(false);
            }
          }}
          className="px-6 pt-5 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Work email"
              type="email"
              required
              className="bg-[#070a13] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
            />
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              type="password"
              required
              className="bg-[#070a13] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
            />
          </div>
          {error && <p className="text-xs text-rose-300">{error}</p>}
        </form>

        {/* Footer */}
        <div className="p-4 bg-[#0a101f] border-t border-slate-800 flex justify-between items-center text-xs font-mono text-slate-500">
          <span>Enterprise SAML / Okta SSO Compatible</span>
          <div className="flex gap-2">
            <button type="submit" form="sign-in-form" disabled={isSigningIn} className="px-4 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold transition-colors">
              {isSigningIn ? 'Signing in...' : 'Sign in'}
            </button>
            <button onClick={onClose} type="button" className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
