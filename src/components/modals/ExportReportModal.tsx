import React, { useState } from 'react';
import { 
  X, 
  Download, 
  FileCheck, 
  ShieldCheck, 
  Copy, 
  Check, 
  Code, 
  FileText 
} from 'lucide-react';
import type { ModalProps, Preset } from '../../types';

interface ExportReportModalProps extends ModalProps { preset: Preset }
export default function ExportReportModal({ isOpen, onClose, preset }: ExportReportModalProps) {
  const [activeFormat, setActiveFormat] = useState('certificate'); // 'certificate' | 'json'
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const auditReportData = {
    auditId: 'AUDIT-2026-99824B',
    timestamp: '2026-11-04T08:24:19.492Z',
    engineVersion: 'BrandGuard Core v1.4-PROTO',
    ruleSet: preset.ruleSet,
    workspace: preset.workspace,
    sourceCollateral: preset.source,
    targetAudience: preset.persona,
    cryptographicHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    complianceSummary: {
      finalReadinessScore: '100 / 100',
      status: 'VERIFIED_COMPLIANT_FOR_PUBLICATION',
      unsupportedClaimsDetected: 1,
      unsupportedClaimsRemediated: 1,
      styleDriftTermsDetected: 1,
      styleDriftTermsRemediated: 1,
      toneAlignment: '9.1 / 10 (Compliant)',
      factualGrounding: '100% Grounded against Corporate Factsheet v4'
    },
    signoffRequirements: [
      { role: 'Author / Creator', signed: true, signatory: 'Internal Team' },
      { role: 'Brand & Communications Lead', signed: true, signatory: 'Marcus Vance' },
      { role: 'Legal & Regulatory Counsel', signed: true, signatory: 'Sarah Jenkins, Esq.' }
    ]
  };

  const jsonString = JSON.stringify(auditReportData, null, 2);

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownloadJSON = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BrandGuard_Audit_${auditReportData.auditId}.json`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#090e1a] border border-slate-800 shadow-2xl text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#0a101f]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Verified Governance Audit Certificate
              </h2>
              <p className="text-xs font-mono text-slate-400">
                Official Compliance Attestation & Cryptographic Audit Trail
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

        {/* Format Selector Tabs */}
        <div className="flex border-b border-slate-800 bg-[#080d19] px-5 pt-3 gap-2">
          <button
            onClick={() => setActiveFormat('certificate')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border-b-2 transition-all ${
              activeFormat === 'certificate'
                ? 'border-cyan-400 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Formal Certificate (PDF View)</span>
          </button>

          <button
            onClick={() => setActiveFormat('json')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border-b-2 transition-all ${
              activeFormat === 'json'
                ? 'border-cyan-400 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Raw Audit Payload (JSON)</span>
          </button>
        </div>

        {/* Certificate View */}
        {activeFormat === 'certificate' && (
          <div className="p-6 space-y-5">
            <div className="p-6 rounded-2xl bg-[#080d19] border border-cyan-500/30 space-y-5 shadow-inner">
              <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-800 gap-2">
                <div>
                  <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
                    BRANDGUARD PRE-PUBLICATION AUDIT PASS
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    Certificate of Brand & Regulatory Compliance
                  </h3>
                </div>

                <div className="text-right font-mono text-xs">
                  <span className="text-slate-500 text-[10px] block">AUDIT ID:</span>
                  <span className="text-slate-300 font-bold">{auditReportData.auditId}</span>
                </div>
              </div>

              {/* Grid details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-500 text-[10px] block">WORKSPACE COLLATERAL:</span>
                  <span className="text-slate-200">{auditReportData.workspace}</span>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px] block">APPLIED RULE-SET:</span>
                  <span className="text-slate-200">{auditReportData.ruleSet}</span>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px] block">COMPLIANCE READINESS SCORE:</span>
                  <span className="text-emerald-400 font-bold text-sm">100 / 100 (PASSED)</span>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px] block">GROUNDING CITATION:</span>
                  <span className="text-slate-200">Corporate Factsheet v4 (100% Match)</span>
                </div>
              </div>

              {/* SHA-256 Hash Seal */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] space-y-1">
                <span className="text-slate-500 text-[10px] block uppercase">
                  CRYPTOGRAPHIC IMMUTABLE ATTESTATION:
                </span>
                <span className="text-cyan-300 break-all">{auditReportData.cryptographicHash}</span>
              </div>

              {/* Signatures */}
              <div className="pt-3 border-t border-slate-800 grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                <div className="p-2 bg-slate-900/60 rounded border border-slate-800">
                  <span className="text-slate-500 block">CREATOR</span>
                  <span className="text-emerald-400 font-bold">✓ Signed</span>
                </div>
                <div className="p-2 bg-slate-900/60 rounded border border-slate-800">
                  <span className="text-slate-500 block">MARKETING LEAD</span>
                  <span className="text-emerald-400 font-bold">✓ Signed</span>
                </div>
                <div className="p-2 bg-slate-900/60 rounded border border-slate-800">
                  <span className="text-slate-500 block">LEGAL COUNSEL</span>
                  <span className="text-emerald-400 font-bold">✓ Signed</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => alert("Printing / Generating official PDF Certificate...")}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF Certificate</span>
              </button>
            </div>
          </div>
        )}

        {/* JSON View */}
        {activeFormat === 'json' && (
          <div className="p-6 space-y-4">
            <div className="relative">
              <pre className="p-4 rounded-xl bg-[#070a13] border border-slate-800 font-mono text-xs text-cyan-300 overflow-x-auto max-h-96 leading-relaxed">
                {jsonString}
              </pre>

              <button
                onClick={handleCopyJSON}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleDownloadJSON}
                className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download audit_report.json</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-[#0a101f] border-t border-slate-800 flex justify-between items-center text-xs font-mono text-slate-500">
          <span>Compliant with SEC Safe Harbor & GDPR Directives</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
