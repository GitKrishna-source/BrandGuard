import React, { useEffect, useState } from 'react';
import { 
  X, 
  Globe, 
  Key, 
  User, 
  RefreshCw, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  ExternalLink,
  Search,
  Lock,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';
import type { ModalProps, WordPressConfig, WordPressDraft } from '../../types';
import { connectWordPress, getWordPressDrafts } from '../../lib/api';

const STORAGE_KEY = 'brandguard_wp_config';

interface WordPressModalProps extends ModalProps {
  onSelectDraft: (draft: WordPressDraft, config: WordPressConfig) => void;
  activeDraftId?: number;
}

export default function WordPressModal({ isOpen, onClose, onSelectDraft, activeDraftId }: WordPressModalProps) {
  const [siteUrl, setSiteUrl] = useState('');
  const [username, setUsername] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [isConnected, setIsConnected] = useState(false);
  const [siteName, setSiteName] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  const [drafts, setDrafts] = useState<WordPressDraft[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load saved WordPress configuration from localStorage on open
  useEffect(() => {
    if (!isOpen) return;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as WordPressConfig;
        if (parsed.site_url) setSiteUrl(parsed.site_url);
        if (parsed.username) setUsername(parsed.username);
        if (parsed.app_password) setAppPassword(parsed.app_password);
      }
    } catch {
      // Ignore storage errors
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentConfig: WordPressConfig = {
    site_url: siteUrl.trim(),
    username: username.trim(),
    app_password: appPassword.trim(),
  };

  const handleConnectAndFetch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentConfig.site_url || !currentConfig.username || !currentConfig.app_password) {
      setErrorMessage('Please fill in Site URL, Username, and Application Password.');
      return;
    }

    setIsConnecting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await connectWordPress(currentConfig);
      if (!res.success) {
        setErrorMessage('Authentication failed. Check your WordPress username and Application Password.');
        setIsConnected(false);
        return;
      }

      setIsConnected(true);
      setSiteName(res.site_name || res.site_url);
      setDisplayName(res.user_display_name || res.username);
      setSuccessMessage(`Connected to ${res.site_name || res.site_url} as ${res.user_display_name || res.username}`);

      // Save credentials for reuse
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(currentConfig));

      // Fetch drafts immediately
      await fetchDraftsList(currentConfig);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to connect to WordPress site.';
      setErrorMessage(message);
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const fetchDraftsList = async (config: WordPressConfig) => {
    setIsLoadingDrafts(true);
    setErrorMessage(null);
    try {
      const response = await getWordPressDrafts(config, 30);
      setDrafts(response.drafts);
      if (response.drafts.length === 0) {
        setSuccessMessage('Connected! No unpublished drafts found in this WordPress site.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch drafts from WordPress.';
      setErrorMessage(message);
    } finally {
      setIsLoadingDrafts(false);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setDrafts([]);
    setErrorMessage(null);
    setSuccessMessage(null);
    window.localStorage.removeItem(STORAGE_KEY);
  };

  const handleChooseDraft = (draft: WordPressDraft) => {
    onSelectDraft(draft, currentConfig);
    onClose();
  };

  const filteredDrafts = drafts.filter((d) => 
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(d.id).includes(searchQuery)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-layer border border-surface rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface bg-panel/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-ink">WordPress Draft Integration</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/25">
                  WP REST API
                </span>
              </div>
              <p className="text-xs text-secondary">
                Import drafts for compliance auditing and sync revisions back seamlessly.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-secondary hover:text-ink transition-colors p-1.5 rounded-lg hover:bg-surface"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Alerts */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {successMessage && !errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <div className="flex-1">{successMessage}</div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Connection Bar / Details */}
          {!isConnected ? (
            <form onSubmit={handleConnectAndFetch} className="space-y-4">
              <div className="p-4 rounded-xl bg-surface/50 border border-surface space-y-3">
                <div className="text-xs font-semibold text-ink flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-accent" />
                  Connect to WordPress Site
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Site URL */}
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-medium text-secondary mb-1">
                      WordPress Site URL
                    </label>
                    <div className="relative">
                      <Globe className="w-4 h-4 text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="url"
                        placeholder="https://your-wordpress-site.com"
                        value={siteUrl}
                        onChange={(e) => setSiteUrl(e.target.value)}
                        className="w-full bg-layer border border-surface rounded-xl pl-9 pr-3 py-2 text-xs text-ink placeholder:text-secondary/50 focus:outline-none focus:border-accent"
                        required
                      />
                    </div>
                  </div>

                  {/* Username */}
                  <div>
                    <label className="block text-[11px] font-medium text-secondary mb-1">
                      WordPress Username
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text"
                        placeholder="admin / editor"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-layer border border-surface rounded-xl pl-9 pr-3 py-2 text-xs text-ink placeholder:text-secondary/50 focus:outline-none focus:border-accent"
                        required
                      />
                    </div>
                  </div>

                  {/* Application Password */}
                  <div>
                    <label className="block text-[11px] font-medium text-secondary mb-1">
                      Application Password
                    </label>
                    <div className="relative">
                      <Key className="w-4 h-4 text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type={showPassword ? 'text' : 'password'}
                        placeholder="xxxx xxxx xxxx xxxx"
                        value={appPassword}
                        onChange={(e) => setAppPassword(e.target.value)}
                        className="w-full bg-layer border border-surface rounded-xl pl-9 pr-10 py-2 text-xs text-ink placeholder:text-secondary/50 focus:outline-none focus:border-accent"
                        required
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-ink"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Helper notice */}
                <div className="text-[11px] text-secondary leading-relaxed bg-layer/60 p-3 rounded-lg border border-surface/50">
                  <span className="text-accent font-medium">How to generate an Application Password:</span> In WordPress Admin, navigate to <strong className="text-ink">Users → Profile</strong>, scroll down to <strong className="text-ink">Application Passwords</strong>, enter a label (e.g. <em>BrandGuard</em>), and click <strong className="text-ink">Add New Application Password</strong>.
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isConnecting}
                    className="btn btn-primary text-xs py-2 px-5 flex items-center gap-2 rounded-xl disabled:opacity-50"
                  >
                    {isConnecting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        Connect & Fetch Drafts
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* Connected Site Info Bar */
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <div>
                  <div className="text-xs font-semibold text-ink flex items-center gap-1.5">
                    {siteName}
                    <span className="text-[10px] text-emerald-400 font-mono">Connected</span>
                  </div>
                  <div className="text-[11px] text-secondary">
                    Logged in as <span className="text-ink font-medium">{displayName}</span> ({siteUrl})
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchDraftsList(currentConfig)}
                  disabled={isLoadingDrafts}
                  className="btn btn-secondary text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDrafts ? 'animate-spin' : ''}`} />
                  Refresh Drafts
                </button>
                <button
                  onClick={handleDisconnect}
                  className="text-xs text-red-400 hover:text-red-300 py-1.5 px-2.5 rounded-lg border border-red-500/20 hover:bg-red-500/10 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>
          )}

          {/* Drafts List */}
          {isConnected && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-xs font-semibold text-ink uppercase tracking-wider">
                  Available Draft Posts ({filteredDrafts.length})
                </h4>
                
                {/* Search */}
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 text-secondary absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text"
                    placeholder="Search drafts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-layer border border-surface rounded-lg pl-8 pr-3 py-1.5 text-xs text-ink placeholder:text-secondary/50 focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              {isLoadingDrafts ? (
                <div className="py-12 text-center text-xs text-secondary flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-accent" />
                  Fetching unpublished drafts from WordPress...
                </div>
              ) : filteredDrafts.length === 0 ? (
                <div className="py-10 text-center rounded-xl bg-surface/30 border border-surface p-6">
                  <FileText className="w-8 h-8 text-secondary mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-secondary font-medium">No drafts found matching your search.</p>
                  <p className="text-[11px] text-secondary/70 mt-1">
                    Create a draft post in WordPress or verify user permissions.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {filteredDrafts.map((draft) => {
                    const isActive = activeDraftId === draft.id;
                    const dateFormatted = draft.date_modified 
                      ? new Date(draft.date_modified).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : 'Recently';

                    return (
                      <div 
                        key={draft.id}
                        className={`p-4 rounded-xl border transition-all text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isActive 
                            ? 'bg-accent/10 border-accent/40 shadow-sm' 
                            : 'bg-surface/40 border-surface hover:border-accent/40 hover:bg-surface/70'
                        }`}
                      >
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-layer border border-surface text-secondary">
                              #{draft.id}
                            </span>
                            <h5 className="text-xs font-semibold text-ink truncate">
                              {draft.title || 'Untitled Draft'}
                            </h5>
                            {isActive && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-accent/20 text-accent">
                                Active in Audit
                              </span>
                            )}
                          </div>
                          
                          <p className="text-[11px] text-secondary line-clamp-2 leading-relaxed">
                            {draft.content 
                              ? draft.content.replace(/<[^>]+>/g, '').slice(0, 150) + '...'
                              : 'No draft content'}
                          </p>

                          <div className="flex items-center gap-3 text-[10px] text-secondary/80 pt-1">
                            <span>Modified: {dateFormatted}</span>
                            {draft.link && (
                              <a 
                                href={draft.link} 
                                target="_blank" 
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 hover:text-accent"
                              >
                                View preview in WP <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleChooseDraft(draft)}
                          className="btn btn-primary text-xs py-2 px-3.5 rounded-xl shrink-0 flex items-center justify-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Import for Audit
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-surface bg-panel/50 flex items-center justify-between text-xs text-secondary">
          <span>BrandGuard WordPress Bridge</span>
          <button 
            onClick={onClose}
            className="btn btn-secondary text-xs py-1.5 px-4 rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

