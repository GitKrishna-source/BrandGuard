export const BRAND_VAULT = {
  company: 'CloudNexus Inc. / BrandGuard AI',
  version: '2025.4 (Enterprise Edition)',
  lastUpdated: 'Nov 2026',
  colorPalette: [
    { name: 'Obsidian Void', hex: '#070a13', role: 'Primary Background', usage: 'Canvas & Root Containers' },
    { name: 'Deep Slate', hex: '#0c111d', role: 'Surface Card', usage: 'Modals, Cards & Panes' },
    { name: 'Neon Cyan', hex: '#38bdf8', role: 'Brand Core Accent', usage: 'Key CTAs, Links & Primary Badges' },
    { name: 'Mint Emerald', hex: '#14f195', role: 'Compliance Success', usage: 'Approval Buttons & Passing Status' },
    { name: 'Crimson Breach', hex: '#f43f5e', role: 'High Severity Warning', usage: 'Unsupported Claims & Hallucinations' },
    { name: 'Amber Drift', hex: '#f59e0b', role: 'Style & Lexicon Drift', usage: 'Nomenclature & Tone Drift' }
  ],
  toneArchetypes: [
    { attribute: 'Authoritative', target: '9.2 / 10', description: 'Confident, precise, free of filler superlatives' },
    { attribute: 'Truth-Anchored', target: '10.0 / 10', description: 'Every quantitative metric must trace to audited collateral' },
    { attribute: 'Respectful & Objective', target: '9.5 / 10', description: 'No competitor disparagement or cheap slang' },
    { attribute: 'Clarity & Accessibility', target: '8.8 / 10', description: 'Plain English, WCAG AAA contrast, clear CTA hierarchies' }
  ],
  bannedLexicon: [
    { forbidden: 'customer support rep', approved: 'Brand Success Specialist', reason: 'Global Enterprise Lexicon Directive #19' },
    { forbidden: 'cheap / dirt cheap', approved: 'cost-effective / high ROI', reason: 'Brand Dignity Standard' },
    { forbidden: '100% bug-free / zero downtime ever', approved: 'high availability (99.99% uptime SLA)', reason: 'Legal Indemnity & False Advertising' },
    { forbidden: 'growth-hack', approved: 'accelerate go-to-market execution', reason: 'Professionalism Guideline' },
    { forbidden: 'BrandCop', approved: 'BrandGuard Governance Engine', reason: 'Deprecated Product Line Q2 2024' },
    { forbidden: 'bulletproof guarantee', approved: 'comprehensive risk mitigation framework', reason: 'General Counsel Guideline §14' }
  ],
  verifiedFacts: [
    { claimId: 'FACT-01', topic: 'Performance Benchmark', verifiedData: 'Up to 3.2x throughput increase verified in Q1 2024 internal benchmark tests.', citation: 'Engineering Whitepaper 2024-ENG-08' },
    { claimId: 'FACT-02', topic: 'Customer Deployment Time', verifiedData: 'Median deployment time is 4.8 minutes via Helm 3.x charts.', citation: 'DevOps Operations Telemetry 2024' },
    { claimId: 'FACT-03', topic: 'Compliance Certifications', verifiedData: 'Active SOC 2 Type II, ISO/IEC 27001:2022, and HIPAA Type 1 certified.', citation: 'Security Compliance Portal doc-id: SEC-9901' },
    { claimId: 'FACT-04', topic: 'Net Annualized Savings', verifiedData: 'Average customer verified cost reduction: $2.8M per enterprise cohort.', citation: 'Deloitte Audited Case Study Q3-2024' }
  ]
};

export const APPROVAL_PIPELINE = [
  {
    id: 'DOC-9081',
    title: 'Q3 Product Announcement Final.md',
    author: 'Elena Rostova (Senior Technical Writer)',
    submittedAt: 'Today at 09:24 AM',
    channel: 'Marketing / Notion Sync',
    status: 'Pending Legal Review',
    severity: 'High',
    flagsCount: 2,
    stages: [
      { role: 'AI Pre-Flight Audit', status: 'Passed with 2 Remediations', user: 'BrandGuard Autonomous Engine', timestamp: '09:24 AM' },
      { role: 'Content Lead Approval', status: 'Approved', user: 'Marcus Vance (VP Marketing)', timestamp: '09:41 AM' },
      { role: 'Legal & Compliance Sign-off', status: 'In Review', user: 'Sarah Jenkins, Esq. (Regulatory Counsel)', timestamp: 'Pending' }
    ]
  },
  {
    id: 'DOC-8942',
    title: 'Enterprise Security Architecture Whitepaper.pdf',
    author: 'David Chen (Chief Architect)',
    submittedAt: 'Yesterday at 04:15 PM',
    channel: 'Figma & GitHub Docs',
    status: 'Fully Approved & Published',
    severity: 'Low',
    flagsCount: 0,
    stages: [
      { role: 'AI Pre-Flight Audit', status: 'Passed (100% Score)', user: 'BrandGuard Autonomous Engine', timestamp: '04:15 PM' },
      { role: 'Content Lead Approval', status: 'Approved', user: 'Marcus Vance (VP Marketing)', timestamp: '04:30 PM' },
      { role: 'Legal & Compliance Sign-off', status: 'Approved & Signed', user: 'Sarah Jenkins, Esq. (Legal)', timestamp: '05:02 PM' }
    ]
  },
  {
    id: 'DOC-8733',
    title: 'LinkedIn Paid Campaign Ads - Q4 Launch',
    author: 'Agency: Horizon Growth Partners',
    submittedAt: '2 days ago',
    channel: 'Google Drive / Assets',
    status: 'Changes Requested',
    severity: 'Medium',
    flagsCount: 3,
    stages: [
      { role: 'AI Pre-Flight Audit', status: 'Flagged 3 Style Breaches', user: 'BrandGuard Autonomous Engine', timestamp: '10:00 AM' },
      { role: 'Content Lead Approval', status: 'Rejected - See AI Notes', user: 'Marcus Vance (VP Marketing)', timestamp: '11:15 AM' },
      { role: 'Legal & Compliance Sign-off', status: 'Blocked', user: 'Awaiting revised copy', timestamp: 'Pending' }
    ]
  }
];

export const GOVERNANCE_ANALYTICS = {
  monthlyAudits: '14,820',
  preventionRate: '99.4%',
  avgLatency: '42ms',
  topViolations: [
    { category: 'Unsubstantiated Performance Multipliers (10x, 100x)', occurrences: 342, trend: '+14%', department: 'Sales & Product Marketing', risk: 'High' },
    { category: 'Deprecated Nomenclature ("customer support rep")', occurrences: 289, trend: '-8%', department: 'Customer Success & Comms', risk: 'Medium' },
    { category: 'SEC Safe Harbor / Absolute Guarantees', occurrences: 154, trend: '+22%', department: 'External Agencies', risk: 'Critical' },
    { category: 'Off-Brand Color & Non-Compliant Hex Codes', occurrences: 98, trend: '-31%', department: 'Design Contractors', risk: 'Low' },
    { category: 'WCAG Tap Target & Accessibility Failures', occurrences: 76, trend: '-15%', department: 'Web Engineering', risk: 'Medium' }
  ],
  departmentBreakdown: [
    { name: 'External Marketing Agencies', complianceScore: 68, riskLevel: 'High Risk', audits: 430 },
    { name: 'Field Sales & Solutions Engineering', complianceScore: 79, riskLevel: 'Moderate', audits: 1210 },
    { name: 'Core Product Marketing', complianceScore: 94, riskLevel: 'Compliant', audits: 2840 },
    { name: 'Developer Relations & Docs', complianceScore: 98, riskLevel: 'Exemplary', audits: 3910 }
  ]
};
