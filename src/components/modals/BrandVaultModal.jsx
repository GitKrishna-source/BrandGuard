import React, { useState } from 'react';
import { 
  X, 
  Database, 
  Palette, 
  Volume2, 
  FileCheck2, 
  ShieldCheck, 
  Copy, 
  Check, 
  Plus, 
  ExternalLink 
} from 'lucide-react';
import { BRAND_VAULT } from '../../data/brandVault';

export default function BrandVaultModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('colors'); // 'colors' | 'facts' | 'lexicon' | 'tone'
  const [copiedHex, setCopiedHex] = useState(null);

  const handleCopy = (hex) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#090e1a] border border-slate-800 shadow-2xl text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#0a101f]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Brand & Facts Truth Vault
              </h2>
              <p className="text-xs font-mono text-slate-400">
                Single Source of Truth for Brand Colors, Tone, SEC Facts, and Banned Lexicon
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

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-[#080d19] px-5 pt-3 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('colors')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'colors'
                ? 'border-cyan-400 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Brand Colors ({BRAND_VAULT.colorPalette.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('facts')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'facts'
                ? 'border-cyan-400 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Verified Corporate Facts ({BRAND_VAULT.verifiedFacts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('lexicon')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'lexicon'
                ? 'border-cyan-400 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Banned & Approved Lexicon ({BRAND_VAULT.bannedLexicon.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tone')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'tone'
                ? 'border-cyan-400 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Tone Archetypes ({BRAND_VAULT.toneArchetypes.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* 1. Brand Colors */}
          {activeTab === 'colors' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400 font-mono mb-3">
                Official approved brand color palette tokens. Used to detect off-brand graphics and non-compliant hex values.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {BRAND_VAULT.colorPalette.map((col, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#080d19] border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg border border-slate-700 shadow-sm"
                        style={{ backgroundColor: col.hex }}
                      />
                      <div>
                        <div className="text-xs font-semibold text-white">{col.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{col.role}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{col.usage}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCopy(col.hex)}
                      className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors"
                      title="Copy Hex"
                    >
                      {copiedHex === col.hex ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Verified Corporate Facts */}
          {activeTab === 'facts' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400 font-mono mb-3">
                Ground-truth corporate database indexed with vector embeddings. AI compares marketing and PR claims directly against these verifiable records.
              </div>
              <div className="space-y-3">
                {BRAND_VAULT.verifiedFacts.map((fact, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-[#080d19] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 font-bold">
                          {fact.claimId}
                        </span>
                        <span className="text-xs font-semibold text-white">{fact.topic}</span>
                      </div>
                      <p className="text-xs font-mono text-slate-300">{fact.verifiedData}</p>
                    </div>

                    <div className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded self-start sm:self-center flex-shrink-0">
                      Citation: {fact.citation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Banned & Approved Lexicon */}
          {activeTab === 'lexicon' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400 font-mono mb-3">
                Automated substitution dictionary preventing brand dilution, legal liability, and outdated naming conventions.
              </div>
              <div className="space-y-2.5">
                {BRAND_VAULT.bannedLexicon.map((lex, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#080d19] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-rose-300 bg-rose-950/60 border border-rose-500/40 px-2.5 py-1 rounded line-through">
                        "{lex.forbidden}"
                      </span>
                      <span className="text-slate-600">→</span>
                      <span className="text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 rounded font-semibold">
                        "{lex.approved}"
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-500">{lex.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Tone Archetypes */}
          {activeTab === 'tone' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400 font-mono mb-3">
                Target linguistic parameters enforced on every drafted article or announcement.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {BRAND_VAULT.toneArchetypes.map((tone, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-[#080d19] border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{tone.attribute}</span>
                      <span className="text-[11px] font-mono text-cyan-400 font-semibold">{tone.target}</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{tone.description}</p>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-400 rounded-full" style={{ width: '92%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#0a101f] border-t border-slate-800 flex justify-between items-center text-xs font-mono text-slate-500">
          <span>Synced with Notion Brand Hub & Figma Design Tokens</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            Close Vault
          </button>
        </div>
      </div>
    </div>
  );
}
