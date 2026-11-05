import React, { useEffect, useState } from 'react';
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
import type { ChangeEvent } from 'react';
import type { ApiAuditResponse, ImageAuditResponse, ModalProps, TextAuditResponse } from '../../types';
import { createRevision, createTextAudit, getAuditReport, uploadAudit } from '../../lib/api';

interface AuditModalProps extends ModalProps {
  initialText?: string;
  onAuditComplete: (audit: ApiAuditResponse) => void;
  onExportAudit: (id: string) => void;
}

export default function AuditModal({ isOpen, onClose, initialText, onAuditComplete, onExportAudit }: AuditModalProps) {
  const [activeTab, setActiveTab] = useState('text'); // 'text' | 'image' | 'document'
  const [customText, setCustomText] = useState(
    initialText || 'Our product is guaranteed to deliver the best results. Contact our team to learn more.'
  );
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<TextAuditResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [currentAuditId, setCurrentAuditId] = useState<string | null>(null);
  const [lastSavedAuditId, setLastSavedAuditId] = useState<string | null>(null);
  const [dataHandling, setDataHandling] = useState<string | null>(null);
  const [analysisEngine, setAnalysisEngine] = useState<string | null>(null);

  // Image tab states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageAuditResult, setImageAuditResult] = useState<ImageAuditResponse | null>(null);

  // Document tab states
  const [docName, setDocName] = useState<string | null>(null);

  useEffect(() => {
    if (initialText) {
      setCustomText(initialText);
      setCurrentAuditId(null);
      setLastSavedAuditId(null);
      setAuditResult(null);
    }
  }, [initialText]);

  if (!isOpen) return null;

  const applyApiAudit = (response: ApiAuditResponse) => {
    const findings = response.findings.length > 0
      ? response.findings.map((finding) => ({
          type: finding.category,
          severity: finding.severity === 'high' ? 'Critical' : finding.severity === 'medium' ? 'Medium' : 'Low',
          quote: finding.evidence,
          explanation: `${finding.message} Source: ${finding.source}`,
          suggestedFix: finding.suggestion,
        }))
      : [{
          type: 'General content review', severity: 'Clean', quote: 'No issues detected',
          explanation: 'This check found no issues. It does not independently verify facts or grant approval.',
          suggestedFix: 'Send the draft for human review.',
        }];
    setAuditResult({
      score: response.score,
      findings,
      tone: response.status === 'approved' ? 'Compliant' : 'Requires Review',
      wordCount: (response.content_preview || customText).split(/\s+/).filter(Boolean).length,
    });
    onAuditComplete(response);
    setCurrentAuditId(response.id);
    setLastSavedAuditId(response.id);
    setDataHandling(response.data_handling || null);
    setAnalysisEngine(response.analysis_engine || null);
  };

  const runTextAudit = async () => {
    setIsAuditing(true);
    setApiError(null);
    try {
      const response = currentAuditId
        ? await createRevision(currentAuditId, customText)
        : await createTextAudit(customText);
      applyApiAudit(response);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Unable to complete the audit.');
    } finally {
      setIsAuditing(false);
    }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      
      setIsAuditing(true);
      setApiError(null);
      uploadAudit(file)
        .then((response) => {
          setImageAuditResult({
            score: response.score,
            primaryPaletteMatch: response.findings[0]?.message || 'No issues detected by this visual check',
            logoPlacement: response.findings[0]?.suggestion || 'Review the asset before publication.',
            accessibilityContrast: 'Requires accessibility contrast verification',
            flags: response.findings.map((finding) => ({
              severity: finding.severity,
              issue: finding.category,
              detail: finding.message,
              recommendation: finding.suggestion,
            })),
          });
          onAuditComplete(response);
          setLastSavedAuditId(response.id);
          setDataHandling(response.data_handling || null);
          setAnalysisEngine(response.analysis_engine || null);
        })
        .catch((error: unknown) => setApiError(error instanceof Error ? error.message : 'Unable to audit image.'))
        .finally(() => setIsAuditing(false));
    }
  };

  const handleDocUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocName(file.name);
      setIsAuditing(true);
      setApiError(null);
      uploadAudit(file)
        .then(async (response) => {
          const savedReport = await getAuditReport(response.id);
          setCustomText(savedReport.content);
          applyApiAudit(response);
          setActiveTab('text');
        })
        .catch((error: unknown) => setApiError(error instanceof Error ? error.message : 'Unable to audit document.'))
        .finally(() => setIsAuditing(false));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#130f20] border border-slate-800 shadow-2xl text-slate-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#191226]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-950/60 border border-violet-500/40 flex items-center justify-center text-violet-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                BrandGuard Live Multi-Content Audit Studio
              </h2>
              <p className="text-xs font-mono text-slate-400">
                General content review · Clarity, tone, grammar, and claims needing evidence
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
        <div className="flex border-b border-slate-800 bg-[#0e0a18] px-5 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'text'
                ? 'border-violet-400 text-violet-300 font-semibold'
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
                ? 'border-violet-400 text-violet-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Image & Visual Review</span>
          </button>

          <button
            onClick={() => setActiveTab('document')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'document'
                ? 'border-violet-400 text-violet-300 font-semibold'
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
                <label htmlFor="audit-draft" className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                  Draft Content Input:
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCustomText('Contact our team to learn more about our services.')}
                    className="text-[11px] font-mono text-violet-400 hover:underline"
                  >
                    Load Neutral Sample
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
                id="audit-draft"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                rows={5}
                className="w-full bg-[#09060f] border border-slate-800 rounded-xl p-3 text-xs sm:text-sm font-mono text-slate-200 focus:outline-none focus:border-violet-400 leading-relaxed"
                placeholder="Paste marketing copy, press release, technical blog, or social copy here..."
              />
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[11px] font-mono text-slate-500">
                Checks clarity, tone, grammar, and unsupported claims
              </span>

              <button
                onClick={runTextAudit}
                disabled={isAuditing || !customText.trim()}
                className="px-5 py-2.5 bg-violet-400 hover:bg-violet-300 text-slate-950 font-bold text-xs rounded-xl shadow-[0_0_20px_rgba(167,139,250,0.3)] transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isAuditing ? 'Analyzing Content...' : currentAuditId ? 'Save Revision & Re-audit' : 'Audit content'}</span>
              </button>
            </div>

            {apiError && (
              <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-300">
                {apiError}
              </div>
            )}

            {dataHandling && (
              <div className="mt-3 rounded-lg border border-violet-500/20 bg-violet-950/20 p-3 text-[11px] font-mono text-slate-400">
                Analysis engine: {analysisEngine || 'BrandGuard policy engine'}. {dataHandling}
              </div>
            )}

            {/* Results */}
            {auditResult && (
              <div className="mt-5 p-5 rounded-xl bg-[#0e0a18] border border-slate-800 space-y-4">
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
                    Workflow: <strong className="text-violet-300">{auditResult.tone}</strong>
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
            <div className="border-2 border-dashed border-slate-800 hover:border-violet-500/50 rounded-2xl p-8 text-center transition-all bg-[#0e0a18]">
              <input
                type="file"
                accept="image/*"
                id="img-upload-input"
                className="hidden"
                onChange={handleImageUpload}
              />
              <label htmlFor="img-upload-input" className="cursor-pointer block">
                <div className="w-12 h-12 rounded-xl bg-violet-950/50 border border-violet-500/30 text-violet-400 flex items-center justify-center mx-auto mb-3">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-white mb-1">
                  Upload Creative Asset, Banner, or Ad Image
                </h4>
                <p className="text-xs text-slate-400 font-mono mb-4">
                  PNG, JPG or WebP up to 10 MB
                </p>
                <span className="inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg border border-slate-700">
                  Select Image File
                </span>
              </label>
            </div>

            {imagePreview && (
              <div className="p-5 rounded-xl bg-[#0e0a18] border border-slate-800 space-y-4">
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
                        <span className="text-slate-500 block text-[10px]">VISUAL REVIEW:</span>
                        <span className="text-violet-300">{imageAuditResult.primaryPaletteMatch}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">RECOMMENDATION:</span>
                        <span className="text-emerald-300">{imageAuditResult.logoPlacement}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">WCAG CONTRAST:</span>
                        <span className="text-emerald-300">{imageAuditResult.accessibilityContrast}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs font-mono text-violet-400 animate-pulse">
                      {apiError || 'Waiting for visual review results…'}
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
            <div className="border-2 border-dashed border-slate-800 hover:border-violet-500/50 rounded-2xl p-8 text-center transition-all bg-[#0e0a18]">
              <input
                type="file"
                accept=".pdf,.docx,.txt,.md"
                id="doc-upload-input"
                className="hidden"
                onChange={handleDocUpload}
              />
              <label htmlFor="doc-upload-input" className="cursor-pointer block">
                <div className="w-12 h-12 rounded-xl bg-violet-950/50 border border-violet-500/30 text-violet-400 flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-white mb-1">
                  Upload a document for content review
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
        <div className="p-4 bg-[#191226] border-t border-slate-800 flex justify-between items-center text-xs font-mono text-slate-500">
          {lastSavedAuditId ? <button disabled={isAuditing} className="text-violet-300 disabled:opacity-50" onClick={() => onExportAudit(lastSavedAuditId)}>Export saved audit</button> : <span>Run an audit to save a report.</span>}
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
