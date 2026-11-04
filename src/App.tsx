import React, { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import LiveAuditStudio from './components/LiveAuditStudio';
import FourPillars from './components/FourPillars';
import TechStackBar from './components/TechStackBar';
import TrustedBy from './components/TrustedBy';
import Footer from './components/Footer';

import AuditModal from './components/modals/AuditModal';
import BrandVaultModal from './components/modals/BrandVaultModal';
import ApprovalsModal from './components/modals/ApprovalsModal';
import GovernanceModal from './components/modals/GovernanceModal';
import ExportReportModal from './components/modals/ExportReportModal';
import SignInModal from './components/modals/SignInModal';

import { PRESETS } from './data/presets';
import { BRAND_VAULT } from './data/brandVault';
import { createPolicy, getAccessToken, getCurrentUser, listPolicies, login, logout } from './lib/api';
import type { ApiAuditResponse, Role } from './types';

export default function App() {
  const [activePresetId, setActivePresetId] = useState('launch-copy');
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [isApprovalsModalOpen, setIsApprovalsModalOpen] = useState(false);
  const [isGovernanceModalOpen, setIsGovernanceModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(() => !getAccessToken());
  const [currentRole, setCurrentRole] = useState<Role>('creator');
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(getAccessToken()));
  const [policyId, setPolicyId] = useState<string | null>(null);
  const [auditQuery, setAuditQuery] = useState('');
  const [latestAudit, setLatestAudit] = useState<ApiAuditResponse | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    getCurrentUser()
      .then((user) => setCurrentRole(user.role))
      .catch(() => {
        logout();
        setIsAuthenticated(false);
        setIsSignInModalOpen(true);
      });
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let isMounted = true;
    const loadPolicy = async () => {
      try {
        const policies = await listPolicies();
        if (policies[0]) {
          if (isMounted) setPolicyId(policies[0].id);
          return;
        }

        const policy = await createPolicy({
          name: `${BRAND_VAULT.company} default policy`,
          guidelines: BRAND_VAULT.toneArchetypes.map((tone) => `${tone.attribute}: ${tone.description}`),
          approved_facts: BRAND_VAULT.verifiedFacts.map((fact) => fact.verifiedData),
          banned_terms: BRAND_VAULT.bannedLexicon.map((term) => term.forbidden),
          approved_terms: Object.fromEntries(BRAND_VAULT.bannedLexicon.map((term) => [term.forbidden, term.approved])),
        });
        if (isMounted) setPolicyId(policy.id);
      } catch (error) {
        console.error('Unable to connect to BrandGuard API', error);
      }
    };
    void loadPolicy();
    return () => { isMounted = false; };
  }, [isAuthenticated]);

  const handleSignIn = async (role: Role, username: string, password: string) => {
    const response = await login(username, password);
    if (response.user.role !== role) throw new Error('Selected persona does not match this account.');
    setCurrentRole(response.user.role);
    setIsAuthenticated(true);
    setIsSignInModalOpen(false);
  };

  // Find active preset object
  const activePreset = PRESETS.find((p) => p.id === activePresetId) || PRESETS[0];

  const handleSelectPreset = (id: string) => {
    setActivePresetId(id);
    const studioEl = document.getElementById('live-audit-studio');
    if (studioEl) {
      studioEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleScanQuery = (query: string) => {
    setAuditQuery(query);
    setIsAuditModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#070a13] text-slate-100 flex flex-col relative selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background ambient lighting and grid pattern */}
      <div className="fixed inset-0 bg-grid-pattern opacity-40 pointer-events-none z-0" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-cyan-600/5 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* Main Content Layers */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Navigation */}
        <Navbar
          onOpenAudit={() => setIsAuditModalOpen(true)}
          onOpenVault={() => setIsVaultModalOpen(true)}
          onOpenApprovals={() => setIsApprovalsModalOpen(true)}
          onOpenAnalytics={() => setIsGovernanceModalOpen(true)}
          onOpenSignIn={() => setIsSignInModalOpen(true)}
          currentRole={currentRole}
          isAuthenticated={isAuthenticated}
        />

        {/* Hero Section */}
        <main className="flex-1">
          <Hero
            activePresetId={activePresetId}
            onSelectPreset={handleSelectPreset}
            onScanQuery={handleScanQuery}
          />

          {/* Core Feature: Live Interactive Audit Terminal / Studio */}
          <LiveAuditStudio
            preset={activePreset}
            onExportAudit={() => setIsExportModalOpen(true)}
            onPushToCMS={() => setIsApprovalsModalOpen(true)}
            onOpenVault={() => setIsVaultModalOpen(true)}
            currentRole={currentRole}
          />

          {/* Four Pillars of Immutable Brand Confidence */}
          <FourPillars
            onOpenVault={() => setIsVaultModalOpen(true)}
            onOpenApprovals={() => setIsApprovalsModalOpen(true)}
            onOpenAnalytics={() => setIsGovernanceModalOpen(true)}
            onOpenAudit={() => setIsAuditModalOpen(true)}
            currentRole={currentRole}
          />

          {/* Production Architecture & Latency Benchmark Bar */}
          <TechStackBar />

          {/* Trusted by Logos */}
          <TrustedBy />
        </main>

        {/* Footer */}
        <Footer
          onOpenWhitepaper={() => setIsExportModalOpen(true)}
          onOpenDocs={() => setIsVaultModalOpen(true)}
          onOpenStatus={() => alert("BrandGuard Global Cluster Status: 99.99% Operational SLA (Latency 42ms)")}
        />
      </div>

      {/* Interactive Modals */}
      <AuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        policyId={policyId}
        initialText={auditQuery || undefined}
        onAuditComplete={setLatestAudit}
      />

      <BrandVaultModal
        isOpen={isVaultModalOpen}
        onClose={() => setIsVaultModalOpen(false)}
      />

      <ApprovalsModal
        isOpen={isApprovalsModalOpen}
        onClose={() => setIsApprovalsModalOpen(false)}
        currentDocTitle={latestAudit ? `API Audit ${latestAudit.id}` : activePreset.workspace}
        readinessScore={latestAudit?.score ?? 100}
        auditId={latestAudit?.id}
        reviewerRole={currentRole}
      />

      <GovernanceModal
        isOpen={isGovernanceModalOpen}
        onClose={() => setIsGovernanceModalOpen(false)}
      />

      <ExportReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        preset={activePreset}
      />

      <SignInModal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
        currentRole={currentRole}
        onSelectRole={(r: Role) => setCurrentRole(r)}
        onSignIn={handleSignIn}
      />
    </div>
  );
}
