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
import { demoLogin, getAccessToken, getCurrentUser, logout } from './lib/api';
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
  const [auditQuery, setAuditQuery] = useState('');
  const [latestAudit, setLatestAudit] = useState<ApiAuditResponse | null>(null);
  const [exportAuditId, setExportAuditId] = useState<string | undefined>();

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

  const handleSignIn = async (role: Role) => {
    const response = await demoLogin(role);
    setLatestAudit(null);
    setExportAuditId(undefined);
    setIsAuditModalOpen(false);
    setIsApprovalsModalOpen(false);
    setIsGovernanceModalOpen(false);
    setIsVaultModalOpen(false);
    setIsExportModalOpen(false);
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

  const handleExportAudit = (id?: string) => {
    setExportAuditId(id);
    setIsAuditModalOpen(false);
    setIsApprovalsModalOpen(false);
    setIsExportModalOpen(true);
  };

  return (
    <div className="brand-shell min-h-screen text-slate-100 flex flex-col relative selection:bg-violet-500/30 selection:text-violet-200">
      {/* Background ambient lighting and grid pattern */}
      <div className="ambient-scene" aria-hidden="true">
        <div className="ambient-orb ambient-orb-one" />
        <div className="ambient-orb ambient-orb-two" />
        <div className="ambient-orb ambient-orb-three" />
        <div className="ambient-grid" />
      </div>

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
            onExportAudit={() => handleExportAudit(latestAudit?.id)}
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
          onOpenWhitepaper={() => handleExportAudit(latestAudit?.id)}
          onOpenDocs={() => setIsVaultModalOpen(true)}
          onOpenStatus={() => alert("Welcome to the BrandGuard hackathon demo. Choose a demo role, audit a draft for clarity and unsupported claims, and explore the review workflow.")}
        />
      </div>

      {/* Interactive Modals */}
      <AuditModal
        key={currentRole}
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        initialText={auditQuery || undefined}
        onAuditComplete={setLatestAudit}
        onExportAudit={handleExportAudit}
      />

      <BrandVaultModal
        isOpen={isVaultModalOpen}
        onClose={() => setIsVaultModalOpen(false)}
      />

      <ApprovalsModal
        isOpen={isApprovalsModalOpen}
        onClose={() => setIsApprovalsModalOpen(false)}
        auditId={latestAudit?.id}
        reviewerRole={currentRole}
        onExportAudit={handleExportAudit}
      />

      <GovernanceModal
        isOpen={isGovernanceModalOpen}
        onClose={() => setIsGovernanceModalOpen(false)}
      />

      <ExportReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        auditId={exportAuditId}
        onStartAudit={() => { setIsExportModalOpen(false); setIsAuditModalOpen(true); }}
      />

      <SignInModal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
        activeRole={isAuthenticated ? currentRole : undefined}
        onSignIn={handleSignIn}
      />
    </div>
  );
}
