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
  ArrowRight,
  Wand2,
  RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { ChangeEvent } from 'react';
import type { ApiAuditResponse, GuidelineDocumentResponse, ImageAuditResponse, ModalProps, RetrievedSource, Role, TextAuditResponse } from '../../types';
import GuidelineSourcePanel from '../GuidelineSourcePanel';
import { createRevision, createTextAudit, getAuditReport, remediateContent, uploadAudit } from '../../lib/api';

interface AuditModalProps extends ModalProps {
  currentRole: Role;
  onContextChange: () => void;
  initialText?: string;
  initialGuideline?: GuidelineDocumentResponse;
  onAuditComplete: (audit: ApiAuditResponse) => void;
  onExportAudit: (id: string) => void;
}

export default function AuditModal({ isOpen, onClose, currentRole, onContextChange, initialText, initialGuideline, onAuditComplete, onExportAudit }: AuditModalProps) {
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
  const [guideline, setGuideline] = useState<GuidelineDocumentResponse | null>(initialGuideline ?? null);
  const [isPreparingGuidelines, setIsPreparingGuidelines] = useState(false);
  const [retrievedSources, setRetrievedSources] = useState<RetrievedSource[]>([]);
  const [retrievalMethod, setRetrievalMethod] = useState<string | null>(null);
  const [isRemediating, setIsRemediating] = useState(false);
  const [previousText, setPreviousText] = useState<string | null>(null);
  const [remediationSummary, setRemediationSummary] = useState<string | null>(null);

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
      setRetrievedSources([]);
      setRetrievalMethod(null);
      setDataHandling(null);
      setAnalysisEngine(null);
      setPreviousText(null);
      setRemediationSummary(null);
    }
  }, [initialText]);

  if (!isOpen) return null;

  const changeGuideline = (document: GuidelineDocumentResponse | null) => {
    setGuideline(document);
    setCurrentAuditId(null);
    setLastSavedAuditId(null);
    setAuditResult(null);
    setImageAuditResult(null);
    setRetrievedSources([]);
    setRetrievalMethod(null);
    setDataHandling(null);
    setAnalysisEngine(null);
    setApiError(null);
    setPreviousText(null);
    setRemediationSummary(null);
    onContextChange();
  };

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
    setRetrievedSources(response.retrieved_sources || []);
    setRetrievalMethod(response.retrieval_method || null);
  };

  const runTextAudit = async () => {
    setIsAuditing(true);
    setApiError(null);
    try {
      const response = currentAuditId
        ? await createRevision(currentAuditId, customText)
        : await createTextAudit(customText, guideline?.policy_id);
      applyApiAudit(response);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Unable to complete the audit.');
    } finally {
      setIsAuditing(false);
    }
  };

  const handleAutoFix = async () => {
    if (!customText.trim() || isRemediating) return;
    setIsRemediating(true);
    setApiError(null);
    try {
      const response = await remediateContent(customText, guideline?.policy_id);
      setPreviousText(customText);
      setCustomText(response.fixed_content);
      setRemediationSummary(response.changes_summary);
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#a78bfa', '#f472b6', '#34d399', '#ffffff'],
      });
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Unable to auto-fix the draft.');
    } finally {
      setIsRemediating(false);
    }
  };

  const handleUndoFix = () => {
    if (previousText !== null) {
      setCustomText(previousText);
      setPreviousText(null);
      setRemediationSummary(null);
    }
  };

  const handleApplySingleFix = (quote: string, suggestedFix: string) => {
    if (!quote || !customText) return;
    setPreviousText(customText);
    const lowerText = customText.toLowerCase();
    const lowerQuote = quote.toLowerCase();
    const index = lowerText.indexOf(lowerQuote);
    if (index !== -1) {
      const updated = customText.slice(0, index) + suggestedFix + customText.slice(index + quote.length);
      setCustomText(updated);
      setRemediationSummary(`Applied fix: "${quote}" replaced with "${suggestedFix}".`);
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
      uploadAudit(file, guideline?.policy_id)
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
          setRetrievedSources(response.retrieved_sources || []);
          setRetrievalMethod(response.retrieval_method || null);
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
      uploadAudit(file, guideline?.policy_id)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-deep/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-surface border border-line shadow-2xl text-ink">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-line bg-surface">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent-soft/60 border border-accent/40 flex items-center justify-center text-accent">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-ink tracking-tight">
                BrandGuard Live Multi-Content Audit Studio
              </h2>
              <p className="text-xs font-sans text-muted">
                {guideline ? 'PDF-grounded brand review / Retrieved evidence cited in findings' : 'General content review / Clarity, tone, grammar, and claims needing evidence'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-elevated transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <GuidelineSourcePanel document={guideline} onChange={changeGuideline} role={currentRole} disabled={isAuditing} onLoadingChange={setIsPreparingGuidelines} />

        {/* Modal Tabs */}
        <div className="flex border-b border-line bg-surface px-5 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'text'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Text & Copy Audit</span>
          </button>

          <button
            onClick={() => setActiveTab('image')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'image'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Image & Visual Review</span>
          </button>

          <button
            onClick={() => setActiveTab('document')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'document'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-muted hover:text-ink'
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
                <label htmlFor="audit-draft" className="text-xs font-sans text-secondary  ">
                  Draft Content Input:
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCustomText(guideline?.shared_demo ? 'Bootwear Everyday is an everyday walking shoe. Bootwear Everyday costs INR 2,499. Bootwear accepts unworn shoes within 14 days of delivery.' : 'Contact our team to learn more about our services.')}
                    className="text-[11px] font-sans text-accent hover:underline"
                  >
                    {guideline?.shared_demo ? 'Load source-consistent sample' : 'Load Neutral Sample'}
                  </button>
                  <span className="text-muted">•</span>
                  <button
                    onClick={() => setCustomText(guideline?.shared_demo ? 'Bootwear Everyday is the #1 performance racing shoe. These kicks are 100% waterproof and cure foot pain. Buy them for INR 1,999 with returns on worn shoes for 30 days.' : 'Our software is the cheapest solution guaranteed 100% bug-free! Talk with our customer support rep.')}
                    className="text-[11px] font-sans text-open hover:underline"
                  >
                    {guideline?.shared_demo ? 'Load Bootwear test draft' : 'Load High-Risk Sample'}
                  </button>
                </div>
              </div>

              <textarea
                id="audit-draft"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                rows={5}
                className="w-full bg-surface border border-line rounded-xl p-3 text-xs sm:text-sm font-sans text-ink focus:outline-none focus:border-accent leading-relaxed"
                placeholder="Paste marketing copy, press release, technical blog, or social copy here..."
              />
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[11px] font-sans text-muted">
                {guideline ? 'Checks content against retrieved PDF passages and general content standards' : 'Checks clarity, tone, grammar, and unsupported claims'}
              </span>

              <button
                onClick={runTextAudit}
                disabled={isAuditing || isPreparingGuidelines || !customText.trim()}
                className="px-5 py-2.5 bg-accent hover:bg-accent text-dark font-bold text-xs rounded-xl  transition-colors flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isAuditing ? 'Analyzing Content...' : currentAuditId ? 'Save Revision & Re-audit' : 'Run Audit'}</span>
              </button>
            </div>

            {apiError && (
              <div className="mt-3 rounded-lg border border-open/40 bg-open-soft/30 p-3 text-xs text-open">
                {apiError}
              </div>
            )}

            {dataHandling && (
              <div className="mt-3 rounded-lg border border-accent/20 bg-accent-soft/20 p-3 text-[11px] font-sans text-muted">
                Analysis engine: {analysisEngine || 'BrandGuard policy engine'}. {dataHandling}
              </div>
            )}

            {/* Results */}
            {auditResult && (
              <div className="mt-5 p-5 rounded-xl bg-surface border border-line space-y-4">
                <div className="flex flex-wrap items-center justify-between pb-3 border-b border-line gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-sans text-muted">Readiness Score:</span>
                    <span className={`text-base font-bold font-sans ${
                      auditResult.score >= 90 ? 'text-accent' : auditResult.score >= 70 ? 'text-open' : 'text-open'
                    }`}>
                      {auditResult.score} / 100
                    </span>
                    <span className="text-xs font-sans text-muted border-l border-line pl-3">
                      Workflow: <strong className="text-accent">{auditResult.tone}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {previousText && (
                      <button
                        onClick={handleUndoFix}
                        className="px-2.5 py-1 text-[11px] font-sans text-secondary hover:text-ink bg-elevated hover:bg-elevated rounded-lg border border-line flex items-center gap-1.5 transition-colors"
                        title="Revert draft to state before auto-fix"
                      >
                        <RotateCcw className="w-3 h-3 text-open" />
                        <span>Undo Fix</span>
                      </button>
                    )}
                    <button
                      onClick={handleAutoFix}
                      disabled={isRemediating || !customText.trim()}
                      className="px-3 py-1.5 bg-accent   hover: hover: text-ink font-semibold text-xs rounded-lg shadow-lg shadow-violet-500/25 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      title="Automatically fix all violations according to brand guidelines"
                    >
                      <Wand2 className={`w-3.5 h-3.5 ${isRemediating ? 'animate-spin' : ''}`} />
                      <span>{isRemediating ? 'Fixing Statement...' : '✨ AI Auto-Fix Statement'}</span>
                    </button>
                  </div>
                </div>

                {remediationSummary && (
                  <div className="p-3.5 rounded-xl bg-accent-soft/40 border border-accent/40 text-xs flex items-start gap-3">
                    <Sparkles className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <div className="font-semibold text-accent mb-1 flex items-center justify-between">
                        <span>Applied AI Brand Corrections</span>
                        <span className="text-[10px] font-sans text-accent font-normal">Re-audit recommended</span>
                      </div>
                      <p className="text-secondary text-[11px] font-sans leading-relaxed">{remediationSummary}</p>
                      <div className="mt-2 text-[10px] text-accent/80 font-sans">
                        Tip: Click <strong>"Save Revision & Re-audit"</strong> above to see the new verified score!
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {auditResult.findings.map((f, i) => (
                    <div
                      key={i}
                      className={`p-3.5 rounded-lg border text-xs ${
                        f.severity === 'Critical'
                          ? 'bg-open-soft/30 border-open/40'
                          : f.severity === 'Medium'
                          ? 'bg-open-soft/30 border-open/40'
                          : f.severity === 'Low'
                          ? 'bg-accent-soft/30 border-accent/40'
                          : 'bg-accent-soft/30 border-accent/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5 font-sans">
                        <span className="font-bold text-[11px]  ">
                          [{f.severity}] {f.type}
                        </span>
                        <span className="text-muted text-[10px]">Flagged: "{f.quote}"</span>
                      </div>
                      <p className="text-secondary mb-2 leading-relaxed">{f.explanation}</p>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-sans bg-surface/80 p-2 rounded border border-line">
                        <div className="flex items-center gap-1.5 text-accent">
                          <span className="text-muted  text-[9px]">AI Suggestion:</span>
                          <span>{f.suggestedFix}</span>
                        </div>
                        {f.quote && f.suggestedFix && customText.toLowerCase().includes(f.quote.toLowerCase()) && (
                          <button
                            onClick={() => handleApplySingleFix(f.quote, f.suggestedFix)}
                            className="px-2.5 py-0.5 bg-accent/20 hover:bg-accent/30 text-accent border border-accent/40 rounded text-[10px] shrink-0 font-medium transition-colors"
                            title={`Replace "${f.quote}" with fix`}
                          >
                            Apply Fix
                          </button>
                        )}
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
            <div className="border-2 border-dashed border-line hover:border-accent/50 rounded-2xl p-8 text-center transition-colors bg-surface">
              <input
                type="file"
                accept="image/*"
                disabled={isAuditing || isPreparingGuidelines}
                id="img-upload-input"
                className="hidden"
                onChange={handleImageUpload}
              />
              <label htmlFor="img-upload-input" className="cursor-pointer block">
                <div className="w-12 h-12 rounded-xl bg-accent-soft/50 border border-accent/30 text-accent flex items-center justify-center mx-auto mb-3">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-ink mb-1">
                  Upload Creative Asset, Banner, or Ad Image
                </h4>
                <p className="text-xs text-muted font-sans mb-4">
                  PNG, JPG or WebP up to 10 MB
                </p>
                <span className="inline-block px-4 py-2 bg-elevated hover:bg-elevated text-xs font-medium text-ink rounded-lg border border-line">
                  Select Image File
                </span>
              </label>
            </div>

            {imagePreview && (
              <div className="p-5 rounded-xl bg-surface border border-line space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                  <div className="rounded-lg overflow-hidden border border-line max-h-60 flex items-center justify-center bg-surface-deep">
                    <img src={imagePreview} alt="Asset preview" className="max-h-60 object-contain" />
                  </div>

                  {imageAuditResult ? (
                    <div className="space-y-3 font-sans text-xs">
                      <div className="flex justify-between pb-2 border-b border-line">
                        <span className="text-muted">Visual Brand Score:</span>
                        <span className="text-accent font-bold">{imageAuditResult.score} / 100</span>
                      </div>
                      <div>
                        <span className="text-muted block text-[10px]">VISUAL REVIEW:</span>
                        <span className="text-accent">{imageAuditResult.primaryPaletteMatch}</span>
                      </div>
                      <div>
                        <span className="text-muted block text-[10px]">RECOMMENDATION:</span>
                        <span className="text-accent">{imageAuditResult.logoPlacement}</span>
                      </div>
                      <div>
                        <span className="text-muted block text-[10px]">WCAG CONTRAST:</span>
                        <span className="text-accent">{imageAuditResult.accessibilityContrast}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs font-sans text-accent animate-pulse">
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
            <div className="border-2 border-dashed border-line hover:border-accent/50 rounded-2xl p-8 text-center transition-colors bg-surface">
              <input
                type="file"
                accept=".pdf,.docx,.txt,.md"
                disabled={isAuditing || isPreparingGuidelines}
                id="doc-upload-input"
                className="hidden"
                onChange={handleDocUpload}
              />
              <label htmlFor="doc-upload-input" className="cursor-pointer block">
                <div className="w-12 h-12 rounded-xl bg-accent-soft/50 border border-accent/30 text-accent flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-ink mb-1">
                  Upload a document for content review
                </h4>
                <p className="text-xs text-muted font-sans mb-4">
                  Accepts PDF, Microsoft Word (.docx), Markdown (.md), or Plaintext
                </p>
                <span className="inline-block px-4 py-2 bg-elevated hover:bg-elevated text-xs font-medium text-ink rounded-lg border border-line">
                  Select Document File
                </span>
              </label>
            </div>

            {docName && (
              <div className="p-4 rounded-xl bg-accent-soft/30 border border-accent/30 flex items-center justify-between text-xs font-sans">
                <div className="flex items-center gap-2 text-accent">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Parsed <strong>{docName}</strong> successfully. Ready for scan.</span>
                </div>
                <button
                  onClick={() => setActiveTab('text')}
                  className="px-3 py-1 bg-accent text-dark font-bold rounded"
                >
                  View Extracted Text
                </button>
              </div>
            )}
          </div>
        )}

        {retrievalMethod && <details className="mx-6 mb-5 rounded-xl border border-accent/20 bg-surface-deep/50 p-4 text-xs">
          <summary className="cursor-pointer font-semibold text-accent">PDF evidence used in this audit ({retrievedSources.length} passages)</summary>
          <p className="mt-3 text-muted">{retrievalMethod}. These saved passages support review; source consistency is not independent fact verification.</p>
          {retrievedSources.length === 0 && <p className="mt-3 text-open">No relevant passage was retrieved. Missing facts require clarification.</p>}
          {retrievedSources.map((source) => <div key={source.citation_id} className="mt-3 rounded-lg border border-line p-3">
            <p className="font-semibold text-accent">[{source.citation_id}] {source.filename} / Page {source.page} / {source.chunk_id}</p>
            <p className="mt-2 whitespace-pre-wrap leading-relaxed text-secondary">{source.text}</p>
          </div>)}
        </details>}

        {/* Modal Footer */}
        <div className="p-4 bg-surface border-t border-line flex justify-between items-center text-xs font-sans text-muted">
          {lastSavedAuditId ? <button disabled={isAuditing} className="text-accent disabled:opacity-50" onClick={() => onExportAudit(lastSavedAuditId)}>Export saved audit</button> : <span>Run an audit to save a report.</span>}
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-elevated hover:bg-elevated text-ink font-medium transition-colors"
          >
            Close Studio
          </button>
        </div>
      </div>
    </div>
  );
}
