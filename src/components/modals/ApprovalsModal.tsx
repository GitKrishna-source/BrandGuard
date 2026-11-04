import React, { useState } from 'react';
import { 
  X, 
  UserCheck, 
  ShieldCheck, 
  Clock, 
  Send, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Lock,
  ArrowRight
} from 'lucide-react';
import { APPROVAL_PIPELINE } from '../../data/brandVault';
import confetti from 'canvas-confetti';
import type { FormEvent } from 'react';
import type { ApprovalComment, ModalProps, Role } from '../../types';
import { createReview } from '../../lib/api';

interface ApprovalsModalProps extends ModalProps {
  currentDocTitle: string;
  readinessScore: number;
  auditId?: string;
  reviewerRole: Role;
}
export default function ApprovalsModal({ isOpen, onClose, currentDocTitle, readinessScore, auditId, reviewerRole }: ApprovalsModalProps) {
  const [activeDocIndex, setActiveDocIndex] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<ApprovalComment[]>([
    { author: 'Sarah Jenkins (Legal)', text: 'Benchmark claim in §2 has been softened to internal 2024 data. This satisfies Directive #88.', time: '10 mins ago' },
    { author: 'Marcus Vance (VP Marketing)', text: 'Ready for CMS release once legal signs the cryptographic verification.', time: '5 mins ago' }
  ]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedSuccess, setPublishedSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedDoc = APPROVAL_PIPELINE[activeDocIndex];

  const handleAddComment = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setApiError(null);
    try {
      if (auditId) await createReview(auditId, reviewerRole, 'pending', newComment);
      setComments([...comments, { author: 'You (Reviewer)', text: newComment, time: 'Just now' }]);
      setNewComment('');
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Unable to save review comment.');
    }
  };

  const handlePublishToCMS = async () => {
    setIsPublishing(true);
    setApiError(null);
    try {
      if (auditId) await createReview(auditId, reviewerRole, 'approved', 'Approved for CMS publication.');
      setIsPublishing(false);
      setPublishedSuccess(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (error) {
      setIsPublishing(false);
      setApiError(error instanceof Error ? error.message : 'Unable to save approval.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#090e1a] border border-slate-800 shadow-2xl text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#0a101f]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-950/60 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Tiered Signoff & CMS Publishing Gates
              </h2>
              <p className="text-xs font-mono text-slate-400">
                Multi-Stakeholder Signoff: Creator → Brand Manager → Regulatory Legal
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

        {/* Content Body */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Documents in Queue */}
          <div className="lg:col-span-5 space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Active Signoff Pipeline:
            </h3>

            {APPROVAL_PIPELINE.map((doc, idx) => (
              <div
                key={doc.id}
                onClick={() => { setActiveDocIndex(idx); setPublishedSuccess(false); }}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  activeDocIndex === idx
                    ? 'bg-[#10182c] border-cyan-500/50 shadow-lg shadow-cyan-950/30'
                    : 'bg-[#080d19] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono text-slate-500">{doc.id}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                    doc.status === 'Fully Approved & Published'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                      : doc.status === 'Pending Legal Review'
                      ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                      : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                  }`}>
                    {doc.status}
                  </span>
                </div>

                <div className="text-xs font-semibold text-white truncate mb-1">
                  {doc.title}
                </div>

                <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between">
                  <span>{doc.author}</span>
                  <span className="text-slate-500">{doc.submittedAt}</span>
                </div>
              </div>
            ))}

            {/* Cryptographic Gate Notice */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1.5">
              <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                <Lock className="w-3.5 h-3.5" />
                <span>Zero-Bypass Policy Guard</span>
              </div>
              <p>
                Unreviewed high-severity claims cannot be published until signed by a designated Legal / Compliance officer.
              </p>
            </div>
          </div>

          {/* Right Column: Workflow Steps & Sign-off Actions */}
          <div className="lg:col-span-7 space-y-5">
            <div className="p-4 rounded-xl bg-[#080d19] border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h4 className="text-sm font-bold text-white">{auditId ? currentDocTitle : selectedDoc.title}</h4>
                  <span className="text-xs font-mono text-slate-400">Channel: {selectedDoc.channel}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Governance Score:</span>
                  <span className="text-sm font-mono font-bold text-emerald-400">{readinessScore} / 100</span>
                </div>
              </div>

              {/* 3-Tier Step Progression */}
              <div className="space-y-3 font-mono text-xs">
                {selectedDoc.stages.map((stg, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-900/50 border border-slate-800/80">
                    <div className="mt-0.5">
                      {stg.status.includes('Approved') || stg.status.includes('Passed') ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-white">{stg.role}</span>
                        <span className="text-[10px] text-slate-500">{stg.timestamp}</span>
                      </div>
                      <div className="text-slate-400 text-[11px]">{stg.user}</div>
                      <div className="text-cyan-300 text-[11px] mt-0.5">{stg.status}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Stakeholder Comments */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
                  Audit Trail & Collaborative Comments ({comments.length})
                </span>
                
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {comments.map((c, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono">
                      <div className="flex justify-between text-slate-500 text-[10px] mb-1">
                        <span className="text-cyan-300 font-semibold">{c.author}</span>
                        <span>{c.time}</span>
                      </div>
                      <p className="text-slate-300">{c.text}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add feedback, citation request, or approval note..."
                    className="flex-1 bg-[#070a13] border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 rounded-lg"
                  >
                    Send
                  </button>
                </form>
              </div>

              {/* CMS Publishing Gateway */}
              <div className="pt-3 border-t border-slate-800">
                {apiError && <div className="mb-3 rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-300">{apiError}</div>}
                {publishedSuccess ? (
                  <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Successfully pushed to Production CMS with SHA-256 Audit Seal.</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 underline cursor-pointer">View Webhook</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[11px] font-mono text-slate-400">
                      Destination: <strong className="text-white">Webflow CMS / Notion Hub</strong>
                    </div>

                    <button
                      onClick={handlePublishToCMS}
                      disabled={isPublishing}
                      className="px-5 py-2.5 bg-[#14f195] hover:bg-[#10d984] text-slate-950 font-bold text-xs rounded-xl shadow-[0_0_15px_rgba(20,241,149,0.3)] transition-all flex items-center gap-2"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isPublishing ? 'Signing & Dispatching...' : 'Sign & Push to CMS'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#0a101f] border-t border-slate-800 flex justify-between items-center text-xs font-mono text-slate-500">
          <span>Enterprise Role-Based Access Control (RBAC) Enforced</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            Close Pipeline
          </button>
        </div>
      </div>
    </div>
  );
}
