import ThemeToggle from './ThemeToggle.jsx';

export default function Header({ loading, refreshing, apiStatus, onOpenSettings, onRefresh, buildVersion, theme, setTheme, alertCount, onJumpToAlerts }) {
  const hasMessageError = Boolean(apiStatus && typeof apiStatus.message === 'string' && apiStatus.message.trim());
  const anyFailed = hasMessageError || Object.values(apiStatus || {}).some((entry) => {
    return entry && typeof entry === 'object' && Object.prototype.hasOwnProperty.call(entry, 'ok') && !entry.ok;
  });
  const statusClass = loading ? 'status-dot yellow' : anyFailed ? 'status-dot red' : 'status-dot';

  return (
    <header id="header">
      <div class="logo">StableSense {buildVersion ? <span class="build-version">{buildVersion}</span> : null}</div>
      <div class="status-bar">
        <div id="status-dot" class={statusClass}></div>
        <span id="status-text">{loading ? 'Syncing...' : refreshing ? 'Refreshing…' : anyFailed ? 'Partial' : 'Live'}</span>
      </div>
      <ThemeToggle theme={theme} setTheme={setTheme} compact />
      <button type="button" class="alert-cta" onClick={onJumpToAlerts}>
        Alerts {alertCount ? <span class="alert-pill">{alertCount}</span> : null}
      </button>
      <div class="hdr-actions">
        <button type="button" id="refresh-btn" class="hdr-btn" onClick={onRefresh} title="Refresh now" aria-label="Refresh now" disabled={refreshing}>
          ↻
        </button>
        <button type="button" id="settings-btn" class="hdr-btn" onClick={onOpenSettings} title="Settings" aria-label="Open settings">
          ⚙
        </button>
      </div>
    </header>
  );
}
