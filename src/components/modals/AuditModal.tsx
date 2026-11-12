import React, { useEffect, useRef, useState } from 'react';
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
  RotateCcw,
  Globe
} from 'lucide-react';
import type { ChangeEvent } from 'react';
import type { ApiAuditResponse, GuidelineDocumentResponse, ImageAuditResponse, ModalProps, RemediateResponse, RetrievedSource, Role, TextAuditResponse, WordPressConfig, WordPressDraft } from '../../types';
import GuidelineSourcePanel from '../GuidelineSourcePanel';
import FindingEvidence from '../FindingEvidence';
import RemediationReview from '../RemediationReview';
import WordPressModal from './WordPressModal';
import { validateRemediationProposal } from '../../lib/remediation';
import { createRevision, createTextAudit, getAuditReport, remediateContent, syncDraftToWordPress, uploadAudit } from '../../lib/api';

interface AuditModalProps extends ModalProps {
  currentRole: Role;
  onContextChange: () => void;
  initialText?: string;
  initialGuideline?: GuidelineDocumentResponse;
  startWithWordPressDemo?: boolean;
  onAuditComplete: (audit: ApiAuditResponse) => void;
  onExportAudit: (id: string) => void;
}

const WORDPRESS_DEMO_DRAFT: WordPressDraft = {
  id: 101,
  title: 'Product launch announcement',
  content: 'Our software is guaranteed to be 100% bug-free. Talk with our customer support rep to learn more.',
  excerpt: '',
  date_modified: '',
  status: 'draft',
  link: null,
};

interface LinkedWordPressDraft {
  draft: WordPressDraft;
  config: WordPressConfig | null;
}

function resolveFindingReference(sourceText: string | undefined, sources: RetrievedSource[]) {
  if (!sourceText) return null;
  const citationMatches = Array.from(sourceText.matchAll(/\b(S\d+)\b/g)).map((m) => m[1]);
  const matchedSources = citationMatches
    .map((id) => sources.find((item) => item.citation_id === id))
    .filter((item): item is RetrievedSource => Boolean(item));
  if (matchedSources.length > 0) {
    return matchedSources.map((src) => ({
      documentName: src.filename,
      page: src.page,
      extractionMethod: src.extraction_method ?? null,
      ocrConfidence: src.ocr_confidence ?? null,
    }));
  }
  const parsed = sourceText.match(/^(?:\[S\d+\]\s*)?(.+?),\s*p\.\s*(\d+)/);
  if (parsed) {
    return [{
      documentName: parsed[1],
      page: Number(parsed[2]),
      extractionMethod: null,
      ocrConfidence: null,
    }];
  }
  return null;
}

export default function AuditModal({ isOpen, onClose, currentRole, onContextChange, initialText, initialGuideline, startWithWordPressDemo, onAuditComplete, onExportAudit }: AuditModalProps) {
  const [activeTab, setActiveTab] = useState('text'); // 'text' | 'image' | 'document'
  const [customText, setCustomText] = useState(
    startWithWordPressDemo ? WORDPRESS_DEMO_DRAFT.content : initialText || 'Our product is guaranteed to deliver the best results. Contact our team to learn more.'
  );
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<TextAuditResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [currentAuditId, setCurrentAuditId] = useState<string | null>(null);
  const [lastSavedAuditId, setLastSavedAuditId] = useState<string | null>(null);
  const [guideline, setGuideline] = useState<GuidelineDocumentResponse | null>(initialGuideline ?? null);
  const [isPreparingGuidelines, setIsPreparingGuidelines] = useState(false);
  const [retrievedSources, setRetrievedSources] = useState<RetrievedSource[]>([]);
  const [retrievalMethod, setRetrievalMethod] = useState<string | null>(null);
  const [isRemediating, setIsRemediating] = useState(false);
  const [previousText, setPreviousText] = useState<string | null>(null);
  const [remediationSummary, setRemediationSummary] = useState<string | null>(null);
  const [proposal, setProposal] = useState<RemediateResponse | null>(null);
  const [auditedText, setAuditedText] = useState<string | null>(null);
  const [isWpModalOpen, setIsWpModalOpen] = useState(false);
  const [wpLink, setWpLink] = useState<LinkedWordPressDraft | null>(
    startWithWordPressDemo ? { draft: WORDPRESS_DEMO_DRAFT, config: null } : null,
  );
  const [demoWpDraft, setDemoWpDraft] = useState(WORDPRESS_DEMO_DRAFT);
  const [isSyncingWp, setIsSyncingWp] = useState(false);
  const [wpSyncMessage, setWpSyncMessage] = useState<{ text: string; link?: string | null } | null>(null);
  const requestVersion = useRef(0);
  const openRef = useRef(isOpen);
  openRef.current = isOpen;
  const busy = isAuditing || isRemediating || isPreparingGuidelines || isSyncingWp;
  const draftNeedsAudit = auditResult !== null && auditedText !== customText;
  const canSyncWpDraft = Boolean(currentAuditId && auditedText === customText && proposal === null);
  const linkedWpDraft = wpLink?.draft;
  const isWpDemo = wpLink?.config === null;

  const discardProposal = () => {
    requestVersion.current += 1;
    setProposal(null);
    setIsRemediating(false);
    setIsAuditing(false);
  };

  const changeText = (text: string) => {
    discardProposal();
    setCustomText(text);
    setPreviousText(null);
    setRemediationSummary(null);
    setWpSyncMessage(null);
  };

  const unlinkWpDraft = () => {
    setWpLink(null);
    setWpSyncMessage(null);
  };

  const closeStudio = () => {
    discardProposal();
    onClose();
  };

  const changeTab = (tab: string) => {
    discardProposal();
    setActiveTab(tab);
  };

  const handleSelectWpDraft = (draft: WordPressDraft, config: WordPressConfig | null) => {
    setWpLink({ draft, config });
    changeText(draft.content);
    clearAuditContext();
  };

  const handleSyncToWordPress = async () => {
    if (!wpLink || !canSyncWpDraft || !currentAuditId || busy) return;
    const { draft, config } = wpLink;
    setApiError(null);
    if (config === null) {
      const savedDraft = { ...draft, content: customText, date_modified: new Date().toISOString() };
      setDemoWpDraft(savedDraft);
      setWpLink({ draft: savedDraft, config });
      setWpSyncMessage({ text: `Demo draft saved. Audit reference BG-${currentAuditId.slice(0, 8)}.` });
      return;
    }
    setIsSyncingWp(true);
    setWpSyncMessage(null);
    try {
      const res = await syncDraftToWordPress({
        ...config,
        post_id: draft.id,
        content: customText,
        audit_id: currentAuditId,
        expected_modified: draft.date_modified || undefined,
      });
      setWpLink({ draft: { ...draft, date_modified: res.date_modified || '', content: customText }, config });
      setWpSyncMessage({
        text: `Draft #${res.post_id} saved. Audit reference ${res.audit_reference}.`,
        link: res.link,
      });
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Failed to sync draft back to WordPress.');
    } finally {
      setIsSyncingWp(false);
    }
  };

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
      setPreviousText(null);
      setRemediationSummary(null);
      setProposal(null);
      setAuditedText(null);
      requestVersion.current += 1;
      setIsRemediating(false);
      setIsAuditing(false);
    }
  }, [initialText]);

  useEffect(() => {
    openRef.current = isOpen;
    requestVersion.current += 1;
    setProposal(null);
    setIsRemediating(false);
    setIsAuditing(false);
    return () => {
      openRef.current = false;
      requestVersion.current += 1;
    };
  }, [isOpen, currentRole]);

  if (!isOpen) return null;

  const clearAuditContext = () => {
    setCurrentAuditId(null);
    setLastSavedAuditId(null);
    setAuditResult(null);
    setImageAuditResult(null);
    setRetrievedSources([]);
    setRetrievalMethod(null);
    setApiError(null);
    setPreviousText(null);
    setRemediationSummary(null);
    setAuditedText(null);
    setWpSyncMessage(null);
    onContextChange();
  };

  const changeGuideline = (document: GuidelineDocumentResponse | null) => {
    discardProposal();
    setGuideline(document);
    clearAuditContext();
  };

  const applyApiAudit = (response: ApiAuditResponse, content = customText) => {
    const findings = response.findings.length > 0
      ? response.findings.map((finding) => ({
          type: finding.category,
          severity: finding.severity === 'high' ? 'Critical' : finding.severity === 'medium' ? 'Medium' : 'Low',
          quote: finding.evidence,
          explanation: finding.message,
          source: finding.source,
          suggestedFix: finding.suggestion,
          verification: finding.verification,
        }))
      : [{
          type: 'General content review', severity: 'Clean', quote: 'No issues detected',
          explanation: 'This check found no issues. It does not independently verify facts or grant approval.',
          suggestedFix: 'Send the draft for human review.',
          verification: null,
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
    setRetrievedSources(response.retrieved_sources || []);
    setRetrievalMethod(response.retrieval_method || null);
    setAuditedText(content);
    setProposal(null);
    setRemediationSummary(null);
  };

  const runTextAudit = async () => {
    if (busy || !customText.trim()) return;
    discardProposal();
    const version = requestVersion.current;
    setIsAuditing(true);
    setApiError(null);
    try {
      const response = currentAuditId
        ? await createRevision(currentAuditId, customText)
        : await createTextAudit(customText, guideline?.policy_id);
      if (version !== requestVersion.current || !openRef.current) return;
      applyApiAudit(response);
    } catch (error) {
      if (version !== requestVersion.current || !openRef.current) return;
      setApiError(error instanceof Error ? error.message : 'Unable to complete the audit.');
    } finally {
      if (version === requestVersion.current) setIsAuditing(false);
    }
  };

  const handleAutoFix = async () => {
    if (!customText.trim() || busy) return;
    const version = ++requestVersion.current;
    const original = customText;
    setProposal(null);
    setIsRemediating(true);
    setApiError(null);
    try {
      const response = await remediateContent(original, guideline?.policy_id);
      if (version !== requestVersion.current || !openRef.current) return;
      validateRemediationProposal(response, original);
      setProposal(response);
    } catch (error) {
      if (version !== requestVersion.current || !openRef.current) return;
      setApiError(error instanceof Error ? error.message : 'Unable to auto-fix the draft.');
    } finally {
      if (version === requestVersion.current) setIsRemediating(false);
    }
  };

  const handleUndoFix = () => {
    if (previousText !== null) {
      discardProposal();
      setCustomText(previousText);
      setPreviousText(null);
      setRemediationSummary(null);
      setWpSyncMessage(null);
    }
  };

  const handleUseEdits = (content: string, acceptedCount: number) => {
    if (!proposal || busy) return;
    try {
      validateRemediationProposal(proposal, customText);
      setPreviousText(customText);
      setCustomText(content);
      setWpSyncMessage(null);
      setRemediationSummary(`Applied ${acceptedCount} accepted ${acceptedCount === 1 ? 'edit' : 'edits'} to your draft. Save a revision and re-audit to assess the updated copy.`);
      discardProposal();
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Generate a new edit review.');
      discardProposal();
    }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (busy) return;
      discardProposal();
      const version = requestVersion.current;
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      
      setIsAuditing(true);
      setApiError(null);
      uploadAudit(file, guideline?.policy_id)
        .then((response) => {
          if (version !== requestVersion.current || !openRef.current) return;
          setImageAuditResult({
            score: response.score,
            findings: response.findings,
          });
          onAuditComplete(response);
          setLastSavedAuditId(response.id);
          setRetrievedSources(response.retrieved_sources || []);
          setRetrievalMethod(response.retrieval_method || null);
        })
        .catch((error: unknown) => {
          if (version === requestVersion.current && openRef.current) setApiError(error instanceof Error ? error.message : 'Unable to audit image.');
        })
        .finally(() => { if (version === requestVersion.current) setIsAuditing(false); });
    }
  };

  const handleDocUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (busy) return;
      discardProposal();
      const version = requestVersion.current;
      setPreviousText(null);
      setRemediationSummary(null);
      setDocName(file.name);
      setIsAuditing(true);
      setApiError(null);
      uploadAudit(file, guideline?.policy_id)
        .then(async (response) => {
          if (version !== requestVersion.current || !openRef.current) return;
          const savedReport = await getAuditReport(response.id);
          if (version !== requestVersion.current || !openRef.current) return;
          setCustomText(savedReport.content);
          unlinkWpDraft();
          applyApiAudit(response, savedReport.content);
          setActiveTab('text');
        })
        .catch((error: unknown) => {
          if (version === requestVersion.current && openRef.current) setApiError(error instanceof Error ? error.message : 'Unable to audit document.');
        })
        .finally(() => { if (version === requestVersion.current) setIsAuditing(false); });
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
                {guideline ? 'Brand review with hybrid search and evidence checks' : 'General content review / Clarity, tone, grammar, and claims needing evidence'}
              </p>
            </div>
          </div>

          <button
            onClick={closeStudio}
            aria-label="Close audit studio"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-elevated transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <GuidelineSourcePanel document={guideline} onChange={changeGuideline} role={currentRole} disabled={busy} onLoadingChange={setIsPreparingGuidelines} />

        {/* Modal Tabs */}
        <div className="flex flex-wrap border-b border-line bg-surface px-5 pt-3 gap-2">
          <button
            onClick={() => changeTab('text')}
            disabled={busy}
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
            onClick={() => changeTab('image')}
            disabled={busy}
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
            onClick={() => changeTab('document')}
            disabled={busy}
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
                <div className="flex flex-wrap justify-end items-center gap-x-2 gap-y-1">
                  <button
                    type="button"
                    onClick={() => setIsWpModalOpen(true)}
                    disabled={busy}
                    className="text-[11px] font-sans text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 font-medium bg-sky-500/10 hover:bg-sky-500/20 px-2 py-0.5 rounded border border-sky-500/30 transition-colors"
                  >
                    <Globe className="w-3 h-3" />
                    Import WordPress Draft
                  </button>
                  <span className="text-muted">•</span>
                  <button
                    onClick={() => changeText(guideline?.shared_demo ? 'Bootwear Everyday is an everyday walking shoe. Bootwear Everyday costs INR 2,499. Bootwear accepts unworn shoes within 14 days of delivery.' : 'Contact our team to learn more about our services.')}
                    disabled={busy}
                    className="text-[11px] font-sans text-accent hover:underline"
                  >
                    {guideline?.shared_demo ? 'Load source-consistent sample' : 'Load Neutral Sample'}
                  </button>
                  <span className="text-muted">•</span>
                  <button
                    onClick={() => changeText(guideline?.shared_demo ? 'Bootwear Everyday is the #1 performance racing shoe. These kicks are 100% waterproof and cure foot pain. Buy them for INR 1,999 with returns on worn shoes for 30 days.' : 'Our software is the cheapest solution guaranteed 100% bug-free! Talk with our customer support rep.')}
                    disabled={busy}
                    className="text-[11px] font-sans text-open hover:underline"
                  >
                    {guideline?.shared_demo ? 'Load Bootwear test draft' : 'Load High-Risk Sample'}
                  </button>
                  {guideline?.shared_demo && (
                    <button
                      onClick={() => changeText('Bootwear Everyday keeps water out in any weather. These shoes banish aching feet. The upper uses repurposed fabric.')}
                      disabled={busy}
                      className="text-[11px] font-sans text-accent hover:underline"
                    >
                      Try paraphrased claims
                    </button>
                  )}
                </div>
              </div>

              {linkedWpDraft && (
                <div className="flex items-center justify-between p-2.5 px-3 mb-2 rounded-xl bg-sky-500/10 border border-sky-500/25 text-xs text-ink animate-fade-in">
                  <div className="flex items-center gap-2 truncate">
                    <Globe className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="truncate">
                      {isWpDemo ? 'WordPress demo draft' : 'Linked WordPress draft'}{' '}
                      <strong>#{linkedWpDraft.id} · {linkedWpDraft.title || 'Untitled Draft'}</strong>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-mono shrink-0">
                      Draft
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0 ml-2">
                    <button 
                      type="button" 
                      onClick={() => setIsWpModalOpen(true)} 
                      disabled={busy}
                      className="text-[11px] text-sky-400 hover:text-sky-300 hover:underline"
                    >
                      Change
                    </button>
                    <span className="text-muted">•</span>
                    <button 
                      type="button" 
                      onClick={unlinkWpDraft}
                      disabled={busy}
                      className="text-[11px] text-red-400 hover:text-red-300 hover:underline"
                    >
                      Unlink
                    </button>
                  </div>
                </div>
              )}

              {linkedWpDraft && (
                <p className="mb-2 text-xs text-muted">
                  {isWpDemo
                    ? 'Sample workspace. Sync saves a copy in this browser session.'
                    : 'Sync replaces the linked draft body in WordPress.'}
                  {!canSyncWpDraft && ' Run an audit on the current copy to enable sync.'}
                </p>
              )}

              {wpSyncMessage && (
                <div role="status" className="flex flex-wrap items-center justify-between gap-2 p-2.5 px-3 mb-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-400 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{wpSyncMessage.text}</span>
                  </div>
                  {wpSyncMessage.link && (
                    <a 
                      href={wpSyncMessage.link} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[11px] text-emerald-300 hover:underline inline-flex items-center gap-1 font-medium"
                    >
                      Preview in WordPress <ArrowRight className="w-3 h-3" />
                    </a>
                  )}
                  {isWpDemo && (
                    <button type="button" onClick={() => setIsWpModalOpen(true)} className="text-emerald-300 hover:underline">
                      View saved demo draft
                    </button>
                  )}
                </div>
              )}

              <textarea
                id="audit-draft"
                value={customText}
                onChange={(e) => changeText(e.target.value)}
                disabled={busy}
                rows={5}
                className="w-full bg-surface border border-line rounded-xl p-3 text-xs sm:text-sm font-sans text-ink focus:outline-none focus:border-accent leading-relaxed"
                placeholder="Paste marketing copy, press release, technical blog, or social copy here..."
              />
            </div>

            <div className="flex flex-wrap justify-between items-center gap-3">
              <span className="text-[11px] font-sans text-muted">
                {guideline ? 'Checks content against retrieved PDF passages and general content standards' : 'Checks clarity, tone, grammar, and unsupported claims'}
              </span>

              <div className="flex items-center gap-2">
                {linkedWpDraft && (
                  <button
                    type="button"
                    onClick={handleSyncToWordPress}
                    disabled={busy || !canSyncWpDraft}
                    className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    <Globe className={`w-3.5 h-3.5 ${isSyncingWp ? 'animate-spin' : ''}`} />
                    <span>{isSyncingWp ? 'Syncing to WordPress…' : isWpDemo ? 'Sync to Demo Draft' : 'Sync to WordPress Draft'}</span>
                  </button>
                )}

                <button
                  onClick={runTextAudit}
                  disabled={busy || !customText.trim() || proposal !== null}
                  className="px-5 py-2.5 bg-accent hover:bg-accent text-dark font-bold text-xs rounded-xl transition-colors flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isAuditing ? 'Analyzing Content...' : currentAuditId ? 'Save Revision & Re-audit' : 'Run Audit'}</span>
                </button>
              </div>
            </div>

            {apiError && (
              <div role="alert" className="mt-3 rounded-lg border border-open/40 bg-open-soft/30 p-3 text-xs text-open">
                {apiError}
              </div>
            )}

            {proposal && <RemediationReview proposal={proposal} disabled={busy} onUse={handleUseEdits} onDismiss={discardProposal} />}

            {/* Results */}
            {auditResult && (
              <div className="mt-5 p-5 rounded-xl bg-surface border border-line space-y-4">
                <div className="flex flex-wrap items-center justify-between pb-3 border-b border-line gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-sans text-muted">{draftNeedsAudit ? 'Last audited score:' : 'Readiness Score:'}</span>
                    <span className={`text-base font-bold font-sans ${
                      auditResult.score >= 90 ? 'text-accent' : auditResult.score >= 70 ? 'text-open' : 'text-open'
                    }`}>
                      {auditResult.score} / 100
                    </span>
                    <span className="text-xs font-sans text-muted border-l border-line pl-3">
                      Workflow: <strong className="text-accent">{draftNeedsAudit ? 'Draft changed · re-audit needed' : auditResult.tone}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {previousText !== null && (
                      <button
                        onClick={handleUndoFix}
                        disabled={busy}
                        className="px-2.5 py-1 text-[11px] font-sans text-secondary hover:text-ink bg-elevated hover:bg-elevated rounded-lg border border-line flex items-center gap-1.5 transition-colors"
                        title="Revert draft to state before auto-fix"
                      >
                        <RotateCcw className="w-3 h-3 text-open" />
                        <span>Undo Fix</span>
                      </button>
                    )}
                    <button
                      onClick={handleAutoFix}
                      disabled={busy || !customText.trim() || proposal !== null}
                      className="px-3 py-1.5 bg-accent   hover: hover: text-ink font-semibold text-xs rounded-lg shadow-lg shadow-violet-500/25 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      title="Generate proposed changes for individual review"
                    >
                      <Wand2 className={`w-3.5 h-3.5 ${isRemediating ? 'animate-spin' : ''}`} />
                      <span>{isRemediating ? 'Preparing edit review...' : 'Review Auto-Fix edits'}</span>
                    </button>
                  </div>
                </div>

                {draftNeedsAudit && <p role="status" className="rounded-lg border border-open/30 bg-open-soft/20 p-3 text-xs leading-relaxed text-secondary">These findings and this score belong to the last saved audit. Your current draft has changed. Save a revision and re-audit before requesting approval.</p>}

                {remediationSummary && (
                  <div className="p-3.5 rounded-xl bg-accent-soft/40 border border-accent/40 text-xs flex items-start gap-3">
                    <Sparkles className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <div className="font-semibold text-accent mb-1 flex items-center justify-between">
                        <span>Accepted edits applied</span>
                        <span className="text-[10px] font-sans text-accent font-normal">Re-audit needed</span>
                      </div>
                      <p className="text-secondary text-[11px] font-sans leading-relaxed">{remediationSummary}</p>
                      <div className="mt-2 text-[10px] text-accent/80 font-sans">
                        Click <strong>"Save Revision & Re-audit"</strong> above to assess the updated draft.
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
                      {(() => {
                        const refs = resolveFindingReference(f.source, retrievedSources);
                        if (refs && refs.length > 0) {
                          return (
                            <div className="mb-2 flex flex-wrap items-center gap-2 rounded-md border border-accent/25 bg-surface/80 px-2.5 py-1.5 text-[11px] font-sans">
                              {refs.map((ref, refIndex) => (
                                <span key={refIndex} className="flex flex-wrap items-center gap-1.5 text-ink">
                                  <span className="text-muted">Source:</span>
                                  <strong className="text-ink">{ref.documentName}</strong>
                                  <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                                    Page {ref.page}
                                  </span>
                                  {ref.extractionMethod === 'ocr' && (
                                    <span className="rounded border border-accent/30 px-1.5 py-0.5 text-[10px] text-accent">
                                      OCR{ref.ocrConfidence !== null && ref.ocrConfidence !== undefined ? ` ${Math.round(ref.ocrConfidence * 100)}%` : ''}
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          );
                        }
                        return f.source ? (
                          <p className="mb-2 text-[11px] font-sans text-muted">Source: {f.source}</p>
                        ) : null;
                      })()}
                      <FindingEvidence verification={f.verification} />
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-sans bg-surface/80 p-2 rounded border border-line">
                        <div className="flex items-center gap-1.5 text-accent">
                          <span className="text-muted  text-[9px]">AI Suggestion:</span>
                          <span>{f.suggestedFix}</span>
                        </div>
                        {f.severity !== 'Clean' && (
                          <button
                            onClick={handleAutoFix}
                            disabled={busy || proposal !== null || !customText.trim()}
                            className="px-2.5 py-0.5 bg-accent/20 hover:bg-accent/30 text-accent border border-accent/40 rounded text-[10px] shrink-0 font-medium transition-colors"
                            title="Generate proposed edits for review; advisory suggestions are not inserted into copy"
                          >
                            Review proposed edits
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
                disabled={busy}
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
                      {imageAuditResult.findings.length === 0 && <p className="text-muted">No issues detected by this visual check.</p>}
                      {imageAuditResult.findings.map((finding, index) => (
                        <article key={index} className="space-y-1.5 rounded-lg border border-line p-3">
                          <p className="font-semibold text-ink">{finding.category.replace(/_/g, ' ')} / {finding.severity}</p>
                          <p className="text-secondary">{finding.message}</p>
                          <p className="text-muted">{finding.evidence}</p>
                          <p className="text-muted">{finding.source}</p>
                          <FindingEvidence verification={finding.verification} />
                          <p className="text-accent">{finding.suggestion}</p>
                        </article>
                      ))}
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
                disabled={busy}
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
                  Accepts PDF (text or scanned), Microsoft Word (.docx), Markdown (.md), or Plaintext
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
                  onClick={() => changeTab('text')}
                  disabled={busy}
                  className="px-3 py-1 bg-accent text-dark font-bold rounded"
                >
                  View Extracted Text
                </button>
              </div>
            )}
          </div>
        )}

        {retrievalMethod && <details className="mx-6 mb-5 rounded-xl border border-accent/20 bg-surface-deep/50 p-4 text-xs">
          <summary className="cursor-pointer font-semibold text-accent">Guideline evidence used in this audit ({retrievedSources.length} passages)</summary>
          <p className="mt-3 text-muted">{retrievalMethod}. See each finding for its citation assessment.</p>
          {retrievedSources.length === 0 && <p className="mt-3 text-open">No relevant passage was retrieved. Missing facts require clarification.</p>}
          {retrievedSources.map((source) => <div key={source.citation_id} className="mt-3 rounded-lg border border-line p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-accent">[{source.citation_id}] {source.filename} / Page {source.page} / {source.chunk_id}</p>
              {source.extraction_method && (
                <span className="rounded border border-accent/30 px-1.5 py-0.5 text-[10px] text-accent">
                  {source.extraction_method === 'ocr' ? `OCR${source.ocr_confidence !== null && source.ocr_confidence !== undefined ? ` (${Math.round(source.ocr_confidence * 100)}%)` : ''}` : 'Native PDF'}
                </span>
              )}
            </div>
            {!!source.match_types?.length && <p className="mt-1 text-muted">Matched by {source.match_types.join(' + ')} search</p>}
            <p className="mt-2 whitespace-pre-wrap leading-relaxed text-secondary">{source.text}</p>
          </div>)}
        </details>}

        {/* Modal Footer */}
        <div className="p-4 bg-surface border-t border-line flex justify-between items-center text-xs font-sans text-muted">
          {lastSavedAuditId ? <button disabled={busy} className="text-accent disabled:opacity-50" onClick={() => { discardProposal(); onExportAudit(lastSavedAuditId); }}>Export saved audit</button> : <span>Run an audit to save a report.</span>}
          <button
            onClick={closeStudio}
            className="px-4 py-1.5 rounded-lg bg-elevated hover:bg-elevated text-ink font-medium transition-colors"
          >
            Close Studio
          </button>
        </div>
      </div>

      {/* WordPress Draft Selector & Connect Modal */}
      <WordPressModal
        isOpen={isWpModalOpen}
        onClose={() => setIsWpModalOpen(false)}
        onSelectDraft={handleSelectWpDraft}
        onDisconnect={() => { if (wpLink?.config) unlinkWpDraft(); }}
        activeDraftId={isWpDemo ? undefined : linkedWpDraft?.id}
        demoDraft={demoWpDraft}
      />
    </div>
  );
}
