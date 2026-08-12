import { useEffect, useRef } from 'preact/hooks';
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
  const panelRef = useRef(null);
  const returnFocusRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    // Remember who opened the dialog so focus can be returned on close.
    returnFocusRef.current = document.activeElement;
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll('button, select, input, a');
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const firstFocusable = panelRef.current?.querySelector('button, select, input');
    firstFocusable?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      const prev = returnFocusRef.current;
      returnFocusRef.current = null;
      if (prev && typeof prev.focus === 'function' && document.contains(prev)) prev.focus();
    };
  }, [isOpen, onClose]);

  return (
    <>
      <div class={`settings-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} aria-hidden={isOpen ? 'false' : 'true'}></div>
      <aside
        ref={panelRef}
        class={`settings-panel ${isOpen ? 'open' : ''}`}
        style="max-width: 100vw; width: 320px;"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
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
              <option value="900">15 minutes (default)</option>
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
