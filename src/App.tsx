import React, { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import LiveAuditStudio from './components/LiveAuditStudio';
import BrandguardStandard from './components/BrandguardStandard';
import FourPillars from './components/FourPillars';
import ReviewJourney from './components/ReviewJourney';
import TrustedBy from './components/TrustedBy';
import Footer from './components/Footer';

import AuditModal from './components/modals/AuditModal';
import BrandVaultModal from './components/modals/BrandVaultModal';
import ApprovalsModal from './components/modals/ApprovalsModal';
import GovernanceModal from './components/modals/GovernanceModal';
import ExportReportModal from './components/modals/ExportReportModal';
import SignInModal from './components/modals/SignInModal';

import { PRESETS } from './data/presets';
import { demoLogin, getAccessToken, getCurrentUser, loadBootwearDemo, logout } from './lib/api';
import type { ApiAuditResponse, GuidelineDocumentResponse, Role } from './types';

const BOOTWEAR_SAMPLE_DRAFT = 'Bootwear Everyday is the #1 walking shoe in the world and is 100% waterproof. Explore Bootwear kicks.';

export default function App() {
  const [activePresetId, setActivePresetId] = useState('launch-copy');
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [isApprovalsModalOpen, setIsApprovalsModalOpen] = useState(false);
  const [isGovernanceModalOpen, setIsGovernanceModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(true);
  const [currentRole, setCurrentRole] = useState<Role>('creator');
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(getAccessToken()));
  const [auditQuery, setAuditQuery] = useState('');
  const [sampleAudit, setSampleAudit] = useState<GuidelineDocumentResponse | null>(null);
  const [auditLaunch, setAuditLaunch] = useState(0);
  const [isPreparingSample, setIsPreparingSample] = useState(false);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const [latestAudit, setLatestAudit] = useState<ApiAuditResponse | null>(null);
  const [exportAuditId, setExportAuditId] = useState<string | undefined>();

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    getCurrentUser()
      .then((user) => {
        if (getAccessToken() === token) setCurrentRole(user.role);
      })
      .catch(() => {
        if (getAccessToken() !== token) return;
        logout();
        setIsAuthenticated(false);
      });
  }, []);

  const handleSignIn = async (role: Role, signal?: AbortSignal) => {
    const response = await demoLogin(role, signal);
    setLatestAudit(null);
    setExportAuditId(undefined);
    if (isAuthenticated) setIsAuditModalOpen(false);
    setSampleAudit(null);
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

  const openAudit = () => {
    if (isPreparingSample) return;
    setIsAuditModalOpen(true);
    if (!isAuthenticated) setIsSignInModalOpen(true);
  };

  const handleScanQuery = (query: string) => {
    if (isPreparingSample) return;
    setSampleAudit(null);
    setAuditQuery(query);
    setAuditLaunch((launch) => launch + 1);
    openAudit();
  };

  const handleTrySample = async () => {
    if (isPreparingSample) return;
    setIsPreparingSample(true);
    setSampleError(null);
    try {
      const signal = AbortSignal.timeout(45000);
      if (!getAccessToken()) await handleSignIn('creator', signal);
      const guideline = await loadBootwearDemo(signal);
      setSampleAudit(guideline);
      setAuditLaunch((launch) => launch + 1);
      setLatestAudit(null);
      setExportAuditId(undefined);
      setIsVaultModalOpen(false);
      setIsApprovalsModalOpen(false);
      setIsGovernanceModalOpen(false);
      setIsExportModalOpen(false);
      setIsAuditModalOpen(true);
    } catch {
      setSampleError('Could not load the sample audit. Please try again.');
    } finally {
      setIsPreparingSample(false);
    }
  };

  const handleExportAudit = (id?: string) => {
    setExportAuditId(id);
    setIsAuditModalOpen(false);
    setIsApprovalsModalOpen(false);
    setIsExportModalOpen(true);
  };

  return (
    <div className="brand-shell min-h-screen flex flex-col relative">

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Navigation */}
        <Navbar
          onOpenAudit={openAudit}
          onOpenVault={() => setIsVaultModalOpen(true)}
          onOpenApprovals={() => setIsApprovalsModalOpen(true)}
          onOpenAnalytics={() => setIsGovernanceModalOpen(true)}
          onOpenSignIn={() => { if (!isPreparingSample) setIsSignInModalOpen(true); }}
          currentRole={currentRole}
          isAuthenticated={isAuthenticated}
        />

        {/* Hero Section */}
        <main className="flex-1">
          <Hero
            activePresetId={activePresetId}
            onSelectPreset={handleSelectPreset}
            onScanQuery={handleScanQuery}
            onTrySample={() => void handleTrySample()}
            isPreparingSample={isPreparingSample}
            sampleError={sampleError}
          />

          {/* Core Feature: Live Interactive Audit Terminal / Studio */}
          <LiveAuditStudio
            preset={activePreset}
            onExportAudit={() => handleExportAudit(latestAudit?.id)}
            onPushToCMS={() => setIsApprovalsModalOpen(true)}
            onOpenVault={() => setIsVaultModalOpen(true)}
            currentRole={currentRole}
          />

          {/* Redesigned Lower Half: BrandGuard Standard */}
          <BrandguardStandard />

          <FourPillars
            onOpenVault={() => setIsVaultModalOpen(true)}
            onOpenApprovals={() => setIsApprovalsModalOpen(true)}
            onOpenAnalytics={() => setIsGovernanceModalOpen(true)}
            onOpenAudit={openAudit}
            currentRole={currentRole}
          />

          {/* Production Architecture & Latency Benchmark Bar */}
          <ReviewJourney />

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
        key={`${currentRole}:${auditLaunch}`}
        currentRole={currentRole}
        onContextChange={() => { setLatestAudit(null); setExportAuditId(undefined); }}
        isOpen={isAuditModalOpen && isAuthenticated}
        onClose={() => setIsAuditModalOpen(false)}
        initialText={sampleAudit?.id === 'bootwear-guidelines-v1' ? BOOTWEAR_SAMPLE_DRAFT : auditQuery || undefined}
        initialGuideline={sampleAudit ?? undefined}
        onAuditComplete={setLatestAudit}
        onExportAudit={handleExportAudit}
      />

      <BrandVaultModal
        onOpenAudit={() => { setIsVaultModalOpen(false); openAudit(); }}
        onUseGuideline={(doc) => {
          setSampleAudit(doc);
          setAuditLaunch((launch) => launch + 1);
          setLatestAudit(null);
          setExportAuditId(undefined);
          setIsVaultModalOpen(false);
          setIsAuditModalOpen(true);
        }}
        onSelectGuideline={(doc) => { setSampleAudit(doc); setAuditLaunch((launch) => launch + 1); }}
        onOpenSignIn={() => { setIsVaultModalOpen(false); setIsSignInModalOpen(true); }}
        currentRole={currentRole}
        isAuthenticated={isAuthenticated}
        activeGuideline={sampleAudit}
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
        onStartAudit={() => { setIsExportModalOpen(false); openAudit(); }}
      />

      <SignInModal
        isOpen={isSignInModalOpen}
        onClose={() => {
          if (!isAuthenticated) setIsAuditModalOpen(false);
          setIsSignInModalOpen(false);
        }}
        activeRole={isAuthenticated ? currentRole : undefined}
        onSignIn={handleSignIn}
      />
    </div>
  );
}
