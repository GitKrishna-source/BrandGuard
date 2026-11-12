export type Role = 'creator' | 'manager' | 'legal';
export type ModalProps = { isOpen: boolean; onClose: () => void };
export type VoidHandler = () => void;

export interface PresetFlag {
  id: string;
  badge: string;
  title: string;
  guideline: string;
  flaggedSnippet?: string;
  flaggedShort?: string;
  explanation: string;
  approvedFixText: string;
  approvedFixLabel: string;
  bannedTerm?: string;
  bannedWord?: string;
  prefix?: string;
  suffix?: string;
  fixed: boolean;
}

export interface Preset {
  id: string;
  name: string;
  label: string;
  workspace: string;
  source: string;
  persona: string;
  ruleSet: string;
  initialScore: number;
  p1: string;
  flag1: PresetFlag;
  p2: string;
  flag2: PresetFlag;
  p3: string;
  voiceTone: string;
  voiceToneScore: string;
  sourceGrounding: string;
  sourceGroundingScore: string;
}

export interface AuditFinding {
  type: string;
  severity: string;
  quote: string;
  explanation: string;
  suggestedFix: string;
  source?: string;
  verification?: EvidenceVerification | null;


}

export interface TextAuditResponse {
  score: number;
  findings: AuditFinding[];
  tone: string;
  wordCount: number;
}

export interface BrandPolicyResponse {
  id: string;
  name: string;
  guidelines: string[];
  approved_facts: string[];
  banned_terms: string[];
  approved_terms: Record<string, string>;
  created_at: string;
}

export type EvidenceStatus = 'supported' | 'weak' | 'unsupported' | 'unverified' | 'uncited';

export interface EvidenceVerification {
  status: EvidenceStatus;
  reason: string;
  citations: Array<{
    citation_id: string;
    status: Exclude<EvidenceStatus, 'uncited'>;
    reason: string;
    quote?: string | null;
  }>;
}

export interface ApiFinding {
  category: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  evidence: string;
  suggestion: string;
  source: string;
  verification?: EvidenceVerification | null;

}

export interface ApiAuditResponse {
  id: string;
  policy_id: string;
  content_type: string;
  score: number;
  status: string;
  findings: ApiFinding[];
  content_preview?: string;
  analysis_engine?: string;
  parent_audit_id?: string | null;
  data_handling?: string;
  created_at: string;
  retrieved_sources?: RetrievedSource[];
  retrieval_method?: string | null;
}

export interface RetrievedSource {
  citation_id: string;
  document_id: string;
  filename: string;
  page: number;
  chunk_id: string;
  text: string;
  document_sha256: string;
  relevance: number;
  match_types?: Array<'keyword' | 'semantic'>;
  extraction_method?: ExtractionMethod | null;
  ocr_confidence?: number | null;
}

export type ExtractionMethod = 'native_pdf' | 'ocr';
export type GuidelineSourceType = 'pdf' | 'jpg' | 'jpeg' | 'png';
export type GuidelineDetectedKind = 'native_pdf' | 'scanned_pdf' | 'mixed_pdf' | 'image';
export type ExtractedPageStatus = 'extracted' | 'low_confidence' | 'unreadable' | 'empty' | 'failed';
export type GuidelineProcessingStage =
  | 'idle'
  | 'uploading'
  | 'detecting'
  | 'extracting'
  | 'ocr'
  | 'completed'
  | 'failed';

export interface ExtractedPage {
  page: number;
  text: string;
  extraction_method: ExtractionMethod;
  ocr_confidence?: number | null;
  low_confidence?: boolean;
  status?: ExtractedPageStatus;
  error?: string | null;
  has_images?: boolean;
  char_count?: number;
  retryable?: boolean;
}

export interface DuplicateDocumentInfo {
  document_id: string;
  policy_id: string;
  brand_name: string;
  filename: string;
  sha256: string;
}

export interface GuidelineExtractionPreview {
  filename: string;
  sha256: string;
  source_type: GuidelineSourceType;
  detected_kind: GuidelineDetectedKind;
  page_count: number;
  usable_page_count: number;
  failed_page_count: number;
  low_confidence_page_count: number;
  native_page_count: number;
  ocr_page_count: number;
  extraction_methods: ExtractionMethod[];
  average_ocr_confidence?: number | null;
  warnings: string[];
  duplicate_of?: DuplicateDocumentInfo | null;
  pages: ExtractedPage[];
}

export interface ReviewedPageInput {
  page: number;
  text: string;
  extraction_method: ExtractionMethod;
  ocr_confidence?: number | null;
}

export interface GuidelineExtractionProgressEvent {
  stage: Exclude<GuidelineProcessingStage, 'idle'>;
  progress: number;
  message: string;
  page?: number;
  total_pages?: number;
  method?: ExtractionMethod;
  result?: GuidelineExtractionPreview;
}

export interface GuidelineDocumentResponse {
  id: string;
  policy_id: string;
  brand_name: string;
  filename: string;
  page_count: number;
  chunk_count: number;
  sha256: string;
  shared_demo: boolean;
  retrieval_method: string;
  source_type?: GuidelineSourceType;
  detected_kind?: GuidelineDetectedKind;
  extraction_methods?: ExtractionMethod[];
  native_page_count?: number;
  ocr_page_count?: number;
  average_ocr_confidence?: number | null;
  duplicate_of?: DuplicateDocumentInfo | null;
  pages?: ExtractedPage[];
}

export interface GovernanceInsightsResponse {
  total_audits: number;
  flagged_audits: number;
  intercept_rate: number;
  average_score: number;
  top_violations: Array<{ category: string; occurrences: number; severity: string }>;
  content_types: Array<{ content_type: string; audits: number; average_score: number }>;
  unclear_guidelines: string[];
}

export interface ReviewResponse {
  id: string;
  audit_id: string;
  reviewer_role: Role;
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  comment: string | null;
  created_at: string;
}

export interface AuthUser { username: string; role: Role }
export interface ApiAuditReport {
  report_version: string;
  generated_at: string;
  audit: ApiAuditResponse;
  owner: string | null;
  source_filename: string | null;
  policy_snapshot: BrandPolicyResponse | null;
  content: string;
  content_coverage: 'full_text' | 'retained_excerpt' | 'image_not_retained';
  content_sha256: string | null;
  automated_assessment: 'ai_review' | 'local_checks' | 'not_recorded';
  required_reviewer: 'manager_or_legal' | 'legal';
  reviews: Array<ReviewResponse & { reviewer_username: string | null }>;
  notes: string[];
}
export interface LoginResponse { access_token: string; token_type: string; user: AuthUser }

export interface ImageAuditResponse {
  score: number;
  findings: ApiFinding[];
}

export interface ApprovalComment { author: string; text: string; time: string }
export interface ApprovalStage { role: string; status: string; user: string; timestamp: string }
export interface ApprovalDocument {
  id: string; title: string; author: string; submittedAt: string; channel: string;
  status: string; severity: string; flagsCount: number; stages: ApprovalStage[];
}

export interface BrandVaultColor { name: string; hex: string; role: string; usage: string }
export interface BrandVaultTone { attribute: string; target: string; description: string }
export interface BannedLexicon { forbidden: string; approved: string; reason: string }
export interface VerifiedFact { claimId: string; topic: string; verifiedData: string; citation: string }
export interface BrandVault {
  company: string; version: string; lastUpdated: string; colorPalette: BrandVaultColor[];
  toneArchetypes: BrandVaultTone[]; bannedLexicon: BannedLexicon[]; verifiedFacts: VerifiedFact[];
}

export interface GovernanceAnalytics {
  monthlyAudits: string | number; preventionRate: string; avgLatency: string;
  topViolations: Array<{ risk: string; category: string; department: string; occurrences: number; trend: string }>;
  departmentBreakdown: Array<{ name: string; audits: number; complianceScore: number; riskLevel: string }>;
}

export interface RemediateResponse {
  original: string;
  fixed_content: string;
  changes_summary: string;
  analysis_engine: string;
  edits: RemediationEdit[];
  data_handling?: string;
}

export interface RemediationEdit {
  id: string;
  start: number;
  end: number;
  original: string;
  replacement: string;
  explanation: string;
  source: string | null;
}

export interface WordPressConfig {
  site_url: string;
  username: string;
  app_password: string;
}

export interface WordPressConnectResponse {
  success: boolean;
  site_url: string;
  username: string;
  site_name: string | null;
  user_display_name: string | null;
}

export interface WordPressDraft {
  id: number;
  title: string;
  content: string;
  excerpt: string;
  date_modified: string;
  status: string;
  link: string | null;
}

export interface WordPressDraftsResponse {
  drafts: WordPressDraft[];
}

export interface WordPressSyncRequest extends WordPressConfig {
  post_id: number;
  content: string;
  title?: string;
  audit_id?: string;
  audit_score?: number;
  expected_modified?: string;
  status?: 'draft';
}

export interface WordPressSyncResponse {
  success: boolean;
  post_id: number;
  title: string;
  status: string;
  audit_reference: string;
  link: string | null;
  message: string;
  date_modified: string | null;
}


