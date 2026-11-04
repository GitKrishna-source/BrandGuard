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

export interface ApiFinding {
  category: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  evidence: string;
  suggestion: string;
  source: string;
}

export interface ApiAuditResponse {
  id: string;
  policy_id: string;
  content_type: string;
  score: number;
  status: string;
  findings: ApiFinding[];
  created_at: string;
}

export interface ImageAuditResponse {
  score: number;
  primaryPaletteMatch: string;
  logoPlacement: string;
  accessibilityContrast: string;
  flags: Array<{ severity: string; issue: string; detail: string; recommendation: string }>;
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
