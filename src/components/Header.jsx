import ThemeToggle from './ThemeToggle.jsx';

const CRUMB = {
  home: 'Market overview',
  research: 'Research library',
  learn: 'Learn',
  chains: 'Chains',
  alerts: 'Alerts',
  about: 'About',
};

export default function Header({
  loading,
  refreshing,
  apiStatus,
  onOpenSettings,
  onRefresh,
  buildVersion,
  theme,
  setTheme,
  alertCount,
  onJumpToAlerts,
  activeTab,
  onOpenRail,
}) {
  const hasMessageError = Boolean(apiStatus && typeof apiStatus.message === 'string' && apiStatus.message.trim());
  const anyFailed = hasMessageError || Object.values(apiStatus || {}).some((entry) => {
    return entry && typeof entry === 'object' && Object.prototype.hasOwnProperty.call(entry, 'ok') && !entry.ok;
  });

  const crumb = CRUMB[activeTab] || (String(activeTab || '').startsWith('coin-')
    ? `${String(activeTab).replace(/^coin-/, '').toUpperCase()} asset view`
    : 'Market overview');

  const statusText = loading ? 'Syncing…' : refreshing ? 'Refreshing…' : anyFailed ? 'Partial' : 'Live';

  return (
    <header id="header" class="topbar">
      <button type="button" class="mobile-menu" onClick={onOpenRail} aria-label="Open navigation">
        ☰
      </button>
      <div class="crumb">
        <span>StableSense{buildVersion ? ` ${buildVersion}` : ''}</span>
        <i>/</i>
        <b>{crumb}</b>
      </div>
      <div class="status-bar top-status">
        <div id="status-dot" class={`live-dot ${loading || refreshing ? 'pulse' : ''} ${anyFailed ? 'warn' : ''}`} />
        <span id="status-text">{statusText}</span>
      </div>
      <div class="top-actions">
        <ThemeToggle theme={theme} setTheme={setTheme} compact />
        <button type="button" class="alert-cta" onClick={onJumpToAlerts}>
          Alerts {alertCount ? <span class="alert-pill">{alertCount}</span> : null}
        </button>
        <a class="hdr-research-link" href="/research/" target="_blank" rel="noopener noreferrer" title="State of Stablecoins research">
          Research
        </a>
        <button type="button" id="refresh-btn" class="icon-btn hdr-btn" onClick={onRefresh} title="Refresh now" aria-label="Refresh now" disabled={refreshing}>
          ↻
        </button>
        <button type="button" id="settings-btn" class="icon-btn hdr-btn" onClick={onOpenSettings} title="Settings" aria-label="Open settings">
          ⚙
        </button>
      </div>
    </header>
  );
}
