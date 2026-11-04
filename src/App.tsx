import React, { useState } from 'react';
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
import type { Role } from './types';

export default function App() {
  const [activePresetId, setActivePresetId] = useState('launch-copy');
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [isApprovalsModalOpen, setIsApprovalsModalOpen] = useState(false);
  const [isGovernanceModalOpen, setIsGovernanceModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<Role>('creator');

  // Find active preset object
  const activePreset = PRESETS.find((p) => p.id === activePresetId) || PRESETS[0];

  const handleSelectPreset = (id: string) => {
    setActivePresetId(id);
    const studioEl = document.getElementById('live-audit-studio');
    if (studioEl) {
      studioEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleScanQuery = (_query: string) => {
    // If user enters custom claim, open live audit studio modal to test custom text
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
          />

          {/* Four Pillars of Immutable Brand Confidence */}
          <FourPillars
            onOpenVault={() => setIsVaultModalOpen(true)}
            onOpenApprovals={() => setIsApprovalsModalOpen(true)}
            onOpenAnalytics={() => setIsGovernanceModalOpen(true)}
            onOpenAudit={() => setIsAuditModalOpen(true)}
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
      />

      <BrandVaultModal
        isOpen={isVaultModalOpen}
        onClose={() => setIsVaultModalOpen(false)}
      />

      <ApprovalsModal
        isOpen={isApprovalsModalOpen}
        onClose={() => setIsApprovalsModalOpen(false)}
        currentDocTitle={activePreset.workspace}
        readinessScore={100}
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
      />
    </div>
  );
}
