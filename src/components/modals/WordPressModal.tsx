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
  Copy,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';
import type { ModalProps, WordPressConfig, WordPressDraft } from '../../types';
import { connectWordPress, getWordPressDrafts } from '../../lib/api';

interface WordPressModalProps extends ModalProps {
  onSelectDraft: (draft: WordPressDraft, config: WordPressConfig | null) => void;
  onDisconnect: () => void;
  demoDraft: WordPressDraft;
  activeDraftId?: number;
}

const hostedDemoPassword = import.meta.env.VITE_WORDPRESS_DEMO_APP_PASSWORD?.trim() ?? '';
const demoSiteUrl = import.meta.env.VITE_WORDPRESS_DEMO_SITE_URL?.trim() || (hostedDemoPassword ? 'https://speakthing.s6-tastewp.com' : '');
const demoUsername = import.meta.env.VITE_WORDPRESS_DEMO_USERNAME?.trim() || (hostedDemoPassword ? 'krishna591' : '');
const isLocalDemo = import.meta.env.DEV && ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
const hasDemoCredentials = Boolean(demoSiteUrl && demoUsername && (hostedDemoPassword || isLocalDemo));

function DemoCredentials() {
  const [password, setPassword] = useState(hostedDemoPassword);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (hostedDemoPassword) return;

    const controller = new AbortController();

    async function loadPassword() {
      try {
        const response = await fetch('/__local/wordpress-demo-password', { signal: controller.signal });
        if (response.ok) {
          setPassword(await response.text());
        } else {
          setMessage('The local demo password is unavailable.');
        }
      } catch {
        if (!controller.signal.aborted) setMessage('The local demo password is unavailable.');
      }
    }

    void loadPassword();
    return () => controller.abort();
  }, []);

  async function copyCredential(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(`${label} copied.`);
    } catch {
      setMessage(`Select the ${label.toLowerCase()} above and copy it manually.`);
    }
  }

  const credentials = [
    { label: 'Site URL', value: demoSiteUrl, href: demoSiteUrl },
    { label: 'Username', value: demoUsername },
    { label: 'Application Password', value: password },
  ];

  return (
    <div className="rounded-lg border border-line bg-layer/60 px-3 py-2.5">
      <h4 className="text-xs font-semibold text-ink">WordPress demo credentials</h4>
      <dl className="mt-1 divide-y divide-line">
        {credentials.filter(({ value }) => value).map(({ label, value, href }) => (
          <div key={label} className="grid min-w-0 grid-cols-[1fr_auto] gap-x-3 py-2">
            <dt className="col-start-1 text-[11px] text-secondary">{label}</dt>
            <dd className="col-start-1 row-start-2 min-w-0 text-xs">
              {href ? (
                <a href={href} target="_blank" rel="noreferrer" className="select-all break-all text-accent hover:underline">
                  {value}
                </a>
              ) : (
                <code className="select-all whitespace-pre-wrap break-words text-ink">{value}</code>
              )}
            </dd>
            <dd className="col-start-2 row-span-2 row-start-1 self-center">
              <button
                type="button"
                onClick={() => void copyCredential(label, value)}
                aria-label={`Copy demo ${label.toLowerCase()}`}
                className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] font-medium text-accent hover:bg-surface"
              >
                <Copy className="h-3 w-3" aria-hidden="true" />
                Copy
              </button>
            </dd>
          </div>
        ))}
      </dl>
      <p role="status" className="text-[11px] text-secondary empty:hidden">{message || (!password ? 'Loading demo password…' : '')}</p>
    </div>
  );
}

export default function WordPressModal({ isOpen, onClose, onSelectDraft, onDisconnect, demoDraft, activeDraftId }: WordPressModalProps) {
  const [siteUrl, setSiteUrl] = useState(hasDemoCredentials ? demoSiteUrl : '');
  const [username, setUsername] = useState(hasDemoCredentials ? demoUsername : '');
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
    setAppPassword('');
    setShowPassword(false);
    setDrafts([]);
    setSearchQuery('');
    setErrorMessage(null);
    setSuccessMessage(null);
    onDisconnect();
  };

  const handleChooseDraft = (draft: WordPressDraft, config: WordPressConfig | null) => {
    onSelectDraft(draft, config);
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="wordpress-drafts-title"
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
                <h3 id="wordpress-drafts-title" className="text-base font-semibold text-ink">WordPress Drafts</h3>
              </div>
              <p className="text-xs text-secondary">
                Import a draft, audit the copy, and sync an audited revision.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            aria-label="Close WordPress drafts"
            className="text-secondary hover:text-ink transition-colors p-1.5 rounded-lg hover:bg-surface"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Alerts */}
        {errorMessage && (
          <div role="alert" className="mx-6 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5">
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
          <section className="space-y-3 rounded-xl border border-accent/30 bg-accent-soft/30 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-ink">WordPress demo</h4>
                <p className="mt-1 text-xs text-muted">Try a sample draft with your BrandGuard demo login. Sync is simulated in this browser session.</p>
              </div>
              <button
                type="button"
                onClick={() => handleChooseDraft(demoDraft, null)}
                disabled={isConnecting || isLoadingDrafts}
                className="btn btn-primary flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                {demoDraft.date_modified ? 'Import saved demo draft' : 'Import sample draft'}
              </button>
            </div>
            <div className="rounded-lg border border-line bg-surface p-3 text-xs">
              <p className="font-medium text-ink">{demoDraft.title}{demoDraft.date_modified ? ' · Saved draft' : ''}</p>
              <p className="mt-1 max-h-28 overflow-y-auto whitespace-pre-wrap break-words text-muted">{demoDraft.content}</p>
            </div>
          </section>

          {/* Connection Bar / Details */}
          {!isConnected ? (
            <form onSubmit={handleConnectAndFetch} className="space-y-4">
              <div className="p-4 rounded-xl bg-surface/50 border border-surface space-y-3">
                <div className="text-xs font-semibold text-ink flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-accent" />
                  Connect to WordPress Site
                </div>
                {hasDemoCredentials && <DemoCredentials />}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Site URL */}
                  <div className="md:col-span-2">
                    <label htmlFor="wordpress-site" className="block text-[11px] font-medium text-secondary mb-1">
                      WordPress Site URL
                    </label>
                    <div className="relative">
                      <Globe className="w-4 h-4 text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="url"
                        id="wordpress-site"
                        placeholder="https://your-wordpress-site.com"
                        value={siteUrl}
                        onChange={(e) => setSiteUrl(e.target.value)}
                        disabled={isConnecting}
                        className="w-full bg-layer border border-surface rounded-xl pl-9 pr-3 py-2 text-xs text-ink placeholder:text-secondary/50 focus:outline-none focus:border-accent"
                        required
                      />
                    </div>
                  </div>

                  {/* Username */}
                  <div>
                    <label htmlFor="wordpress-username" className="block text-[11px] font-medium text-secondary mb-1">
                      WordPress Username
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text"
                        id="wordpress-username"
                        placeholder="admin / editor"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={isConnecting}
                        className="w-full bg-layer border border-surface rounded-xl pl-9 pr-3 py-2 text-xs text-ink placeholder:text-secondary/50 focus:outline-none focus:border-accent"
                        required
                      />
                    </div>
                  </div>

                  {/* Application Password */}
                  <div>
                    <label htmlFor="wordpress-application-password" className="mb-1 block text-[11px] font-medium text-secondary">
                      Application Password
                    </label>
                    <div className="relative">
                      <Key className="w-4 h-4 text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type={showPassword ? 'text' : 'password'}
                        id="wordpress-application-password"
                        placeholder="xxxx xxxx xxxx xxxx"
                        value={appPassword}
                        onChange={(e) => setAppPassword(e.target.value)}
                        disabled={isConnecting}
                        autoComplete="off"
                        className="w-full bg-layer border border-surface rounded-xl pl-9 pr-10 py-2 text-xs text-ink placeholder:text-secondary/50 focus:outline-none focus:border-accent"
                        required
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide application password' : 'Show application password'}
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
                  disabled={isConnecting || isLoadingDrafts}
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
                          onClick={() => handleChooseDraft(draft, currentConfig)}
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
        <div className="px-6 py-3.5 border-t border-surface bg-panel/50 flex justify-end text-xs text-secondary">
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

