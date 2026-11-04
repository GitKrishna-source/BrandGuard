import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  Image as ImageIcon, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert,
  Eye,
  Layers,
  ArrowRight
} from 'lucide-react';

export default function AuditModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('text'); // 'text' | 'image' | 'document'
  const [customText, setCustomText] = useState(
    'Our company offers the cheapest cloud hosting in the world. We are guaranteed 100% bug-free with infinite scalability. Contact our customer support rep today!'
  );
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState(null);

  // Image tab states
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageAuditResult, setImageAuditResult] = useState(null);

  // Document tab states
  const [docName, setDocName] = useState(null);

  const runTextAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      const findings = [];
      let score = 95;

      if (customText.toLowerCase().includes('cheapest') || customText.toLowerCase().includes('cheap')) {
        score -= 15;
        findings.push({
          type: 'Tone & Lexicon Drift',
          severity: 'Medium',
          quote: 'cheapest',
          explanation: 'Violates Brand Dignity Standard §2.1. Brand positioning forbids low-end price discounting language.',
          suggestedFix: 'most cost-effective / enterprise-value-driven'
        });
      }

      if (customText.toLowerCase().includes('100% bug-free') || customText.toLowerCase().includes('guaranteed 100%') || customText.toLowerCase().includes('infinite')) {
        score -= 25;
        findings.push({
          type: 'Legal Liability Breach',
          severity: 'Critical',
          quote: 'guaranteed 100% bug-free',
          explanation: 'Absolute guarantee creates legal indemnification liability under General Counsel Directive §14.',
          suggestedFix: 'engineered for 99.99% high availability and resilient uptime SLAs'
        });
      }

      if (customText.toLowerCase().includes('customer support rep')) {
        score -= 12;
        findings.push({
          type: 'Restricted Nomenclature',
          severity: 'Low',
          quote: 'customer support rep',
          explanation: 'Nomenclature Directive #19 mandates Enterprise Success taxonomy.',
          suggestedFix: 'Brand Success Specialist'
        });
      }

      if (findings.length === 0) {
        findings.push({
          type: 'Brand Compliance',
          severity: 'Clean',
          quote: 'All text compliant',
          explanation: 'Text conforms to Global Enterprise Standard v2.4, tone guidelines, and verified collateral.',
          suggestedFix: 'Ready to publish without modification'
        });
      }

      setAuditResult({
        score: Math.max(score, 45),
        findings,
        tone: 'Informative & Promotional',
        wordCount: customText.split(/\s+/).filter(Boolean).length
      });
      setIsAuditing(false);
    }, 600);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      
      setIsAuditing(true);
      setTimeout(() => {
        setImageAuditResult({
          score: 84,
          primaryPaletteMatch: '88% Match (Cyan #38bdf8 & Slate #070a13 detected)',
          logoPlacement: 'Compliant (Safe clearance margin > 24px)',
          accessibilityContrast: 'WCAG AAA (7.2:1 Contrast Ratio)',
          flags: [
            {
              severity: 'Moderate',
              issue: 'Secondary Color Drift',
              detail: 'Detected unapproved magenta gradient #d946ef in background. Approved secondary is Mint #14f195.',
              recommendation: 'Replace background accent with #14f195 or neutral slate.'
            }
          ]
        });
        setIsAuditing(false);
      }, 700);
    }
  };

  const handleDocUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocName(file.name);
      setCustomText(
        `[Parsed from ${file.name}]\n\nCloudNexus delivers hyper-converged zero-trust networks with automated compliance. Contact our customer support rep for guaranteed zero downtime deployment.`
      );
      setActiveTab('text');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#090e1a] border border-slate-800 shadow-2xl text-slate-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#0a101f]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                BrandGuard Live Multi-Content Audit Studio
              </h2>
              <p className="text-xs font-mono text-slate-400">
                Audit Text, Images & Documents against corporate brand truth before publication
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

        {/* Modal Tabs */}
        <div className="flex border-b border-slate-800 bg-[#080d19] px-5 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'text'
                ? 'border-cyan-400 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Text & Copy Audit</span>
          </button>

          <button
            onClick={() => setActiveTab('image')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'image'
                ? 'border-cyan-400 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Image & Visual Brand Audit</span>
          </button>

          <button
            onClick={() => setActiveTab('document')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'document'
                ? 'border-cyan-400 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Document (.pdf, .docx, .md)</span>
          </button>
        </div>

        {/* Tab 1: Text Audit */}
        {activeTab === 'text' && (
          <div className="p-6 space-y-5">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                  Draft Content Input:
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCustomText('BrandGuard AI provides pre-publication governance for enterprise comms. Our verified benchmarks indicate up to 3x throughput improvements with 99.99% availability.')}
                    className="text-[11px] font-mono text-cyan-400 hover:underline"
                  >
                    Load Compliant Sample
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    onClick={() => setCustomText('Our software is the cheapest solution guaranteed 100% bug-free! Talk with our customer support rep.')}
                    className="text-[11px] font-mono text-rose-400 hover:underline"
                  >
                    Load High-Risk Sample
                  </button>
                </div>
              </div>

              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                rows={5}
                className="w-full bg-[#070a13] border border-slate-800 rounded-xl p-3 text-xs sm:text-sm font-mono text-slate-200 focus:outline-none focus:border-cyan-400 leading-relaxed"
                placeholder="Paste marketing copy, press release, technical blog, or social copy here..."
              />
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[11px] font-mono text-slate-500">
                Checks tone, SEC rules, unverified facts, banned terminology, and grammar
              </span>

              <button
                onClick={runTextAudit}
                disabled={isAuditing}
                className="px-5 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs rounded-xl shadow-[0_0_20px_rgba(56,189,248,0.3)] transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isAuditing ? 'Analyzing Content...' : 'Run Real-Time AI Audit'}</span>
              </button>
            </div>

            {/* Results */}
            {auditResult && (
              <div className="mt-5 p-5 rounded-xl bg-[#080d19] border border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400">Readiness Score:</span>
                    <span className={`text-base font-bold font-mono ${
                      auditResult.score >= 90 ? 'text-emerald-400' : auditResult.score >= 70 ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      {auditResult.score} / 100
                    </span>
                  </div>

                  <span className="text-xs font-mono text-slate-400">
                    Tone: <strong className="text-cyan-300">{auditResult.tone}</strong>
                  </span>
                </div>

                <div className="space-y-3">
                  {auditResult.findings.map((f, i) => (
                    <div
                      key={i}
                      className={`p-3.5 rounded-lg border text-xs ${
                        f.severity === 'Critical'
                          ? 'bg-rose-950/30 border-rose-500/40'
                          : f.severity === 'Medium'
                          ? 'bg-amber-950/30 border-amber-500/40'
                          : f.severity === 'Low'
                          ? 'bg-sky-950/30 border-sky-500/40'
                          : 'bg-emerald-950/30 border-emerald-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5 font-mono">
                        <span className="font-bold text-[11px] uppercase tracking-wide">
                          [{f.severity}] {f.type}
                        </span>
                        <span className="text-slate-400 text-[10px]">Flagged: "{f.quote}"</span>
                      </div>
                      <p className="text-slate-300 mb-2 leading-relaxed">{f.explanation}</p>
                      <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 bg-slate-900/80 p-2 rounded border border-slate-800">
                        <span className="text-slate-500 uppercase text-[9px]">AI Suggestion:</span>
                        <span>{f.suggestedFix}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Image Audit */}
        {activeTab === 'image' && (
          <div className="p-6 space-y-5">
            <div className="border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-2xl p-8 text-center transition-all bg-[#080d19]">
              <input
                type="file"
                accept="image/*"
                id="img-upload-input"
                className="hidden"
                onChange={handleImageUpload}
              />
              <label htmlFor="img-upload-input" className="cursor-pointer block">
                <div className="w-12 h-12 rounded-xl bg-cyan-950/50 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto mb-3">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-white mb-1">
                  Upload Creative Asset, Banner, or Ad Image
                </h4>
                <p className="text-xs text-slate-400 font-mono mb-4">
                  PNG, JPG, WebP, SVG up to 25MB
                </p>
                <span className="inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg border border-slate-700">
                  Select Image File
                </span>
              </label>
            </div>

            {imagePreview && (
              <div className="p-5 rounded-xl bg-[#080d19] border border-slate-800 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                  <div className="rounded-lg overflow-hidden border border-slate-700 max-h-60 flex items-center justify-center bg-black">
                    <img src={imagePreview} alt="Asset preview" className="max-h-60 object-contain" />
                  </div>

                  {imageAuditResult ? (
                    <div className="space-y-3 font-mono text-xs">
                      <div className="flex justify-between pb-2 border-b border-slate-800">
                        <span className="text-slate-400">Visual Brand Score:</span>
                        <span className="text-emerald-400 font-bold">{imageAuditResult.score} / 100</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">PALETTE CONFORMANCE:</span>
                        <span className="text-cyan-300">{imageAuditResult.primaryPaletteMatch}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">LOGO CLEAR SPACE:</span>
                        <span className="text-emerald-300">{imageAuditResult.logoPlacement}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">WCAG CONTRAST:</span>
                        <span className="text-emerald-300">{imageAuditResult.accessibilityContrast}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs font-mono text-cyan-400 animate-pulse">
                      Analyzing pixel color histogram and logo placement...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Document Audit */}
        {activeTab === 'document' && (
          <div className="p-6 space-y-5">
            <div className="border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-2xl p-8 text-center transition-all bg-[#080d19]">
              <input
                type="file"
                accept=".pdf,.docx,.doc,.txt,.md"
                id="doc-upload-input"
                className="hidden"
                onChange={handleDocUpload}
              />
              <label htmlFor="doc-upload-input" className="cursor-pointer block">
                <div className="w-12 h-12 rounded-xl bg-cyan-950/50 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-white mb-1">
                  Upload Document for Batch Governance Scanning
                </h4>
                <p className="text-xs text-slate-400 font-mono mb-4">
                  Accepts PDF, Microsoft Word (.docx), Markdown (.md), or Plaintext
                </p>
                <span className="inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg border border-slate-700">
                  Select Document File
                </span>
              </label>
            </div>

            {docName && (
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 text-emerald-300">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Parsed <strong>{docName}</strong> successfully. Ready for scan.</span>
                </div>
                <button
                  onClick={() => setActiveTab('text')}
                  className="px-3 py-1 bg-emerald-500 text-slate-950 font-bold rounded"
                >
                  View Extracted Text
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 bg-[#0a101f] border-t border-slate-800 flex justify-between items-center text-xs font-mono text-slate-500">
          <span>Enterprise Rule Engine v2.4 Active</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            Close Studio
          </button>
        </div>
      </div>
    </div>
  );
}
