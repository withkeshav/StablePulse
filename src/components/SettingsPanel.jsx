import ThemeToggle from './ThemeToggle.jsx';

export default function SettingsPanel({
  isOpen,
  onClose,
  refreshIntervalSec,
  setRefreshIntervalSec,
  compactMode,
  setCompactMode,
  theme,
  setTheme,
}) {
  return (
    <>
      <div class={`settings-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} aria-hidden={isOpen ? 'false' : 'true'}></div>
      <aside class={`settings-panel ${isOpen ? 'open' : ''}`} style="max-width: 100vw; width: 320px;">
        <div class="settings-header">
          Settings
          <button type="button" class="hdr-btn" onClick={onClose} aria-label="Close settings">✕</button>
        </div>
        <div class="settings-body">
          <div class="settings-row">
            <div class="settings-label">Theme</div>
            <ThemeToggle theme={theme} setTheme={setTheme} />
          </div>
          <div class="settings-row">
            <div class="settings-label">Auto-Refresh Interval</div>
            <select class="settings-select" value={String(refreshIntervalSec)} onChange={(e) => setRefreshIntervalSec(Number(e.currentTarget.value))}>
              <option value="60">1 minute</option>
              <option value="180">3 minutes</option>
              <option value="300">5 minutes</option>
              <option value="600">10 minutes</option>
              <option value="900">15 minutes (worker default)</option>
            </select>
          </div>
          <div class="settings-row">
            <label class="settings-toggle-row">
              Compact mode
              <span class="toggle-switch">
                <input type="checkbox" checked={compactMode} onChange={(e) => setCompactMode(e.currentTarget.checked)} />
                <span class="toggle-track"></span>
              </span>
            </label>
          </div>
        </div>
      </aside>
    </>
  );
}
