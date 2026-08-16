import { useEffect, useState } from 'preact/hooks';
import { ACTIVE_STABLECOINS, coinTabId } from '../utils/coin-config.js';

const ICONS = {
  home: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2L2 9h2v8h4v-5h4v5h4V9h2L10 2z"/></svg>',
  assets: '<svg viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M7 10h6M10 7v6"/></svg>',
  research: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M4 3h9l3 3v11H4V3zm8 1v3h3"/><path d="M7 9h6v1H7zm0 3h6v1H7z"/></svg>',
  alerts: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 016 6c0 3-2 5-2 7H6c0-2-2-4-2-7a6 6 0 016-6zm-1 16h2a1 1 0 01-2 0z"/></svg>',
  more: '<svg viewBox="0 0 20 20" fill="currentColor"><circle cx="4" cy="10" r="1.6"/><circle cx="10" cy="10" r="1.6"/><circle cx="16" cy="10" r="1.6"/></svg>',
};

const PRIMARY = [
  { id: 'home', label: 'Dashboard', kind: 'tab' },
  { id: 'assets', label: 'Assets', kind: 'assets' },
  { id: 'research', label: 'Research', kind: 'tab' },
  { id: 'alerts', label: 'Alerts', kind: 'tab' },
  { id: 'more', label: 'More', kind: 'more' },
];

export default function MobileNav({ activeTab, setActiveTab, alertCount, onOpenRail }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const activeCoin = ACTIVE_STABLECOINS.find((s) => coinTabId(s) === activeTab);
  const assetsActive = Boolean(activeCoin) || pickerOpen;

  useEffect(() => {
    if (!pickerOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [pickerOpen]);

  const onPrimary = (item) => {
    if (item.kind === 'assets') {
      setPickerOpen(true);
      return;
    }
    if (item.kind === 'more') {
      onOpenRail?.();
      return;
    }
    setActiveTab(item.id);
  };

  const pickAsset = (symbol) => {
    setActiveTab(coinTabId(symbol));
    setPickerOpen(false);
  };

  return (
    <>
      <nav id="mobile-nav" aria-label="Mobile navigation">
        <div class="mob-nav-items">
          {PRIMARY.map((item) => {
            const isActive = item.kind === 'assets'
              ? assetsActive
              : item.kind === 'tab' && activeTab === item.id;
            const label = item.kind === 'assets' && activeCoin ? activeCoin : item.label;
            return (
              <button
                type="button"
                key={item.id}
                class={`mob-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => onPrimary(item)}
                aria-current={isActive ? 'page' : undefined}
              >
                <span dangerouslySetInnerHTML={{ __html: ICONS[item.id] }} />
                <span>{label}</span>
                {item.id === 'alerts' && alertCount > 0 ? <span class="mob-badge">{alertCount}</span> : null}
              </button>
            );
          })}
        </div>
      </nav>
      {pickerOpen ? (
        <div class="asset-picker-overlay" role="dialog" aria-modal="true" aria-label="Choose asset" onMouseDown={() => setPickerOpen(false)}>
          <div class="asset-picker-sheet" onMouseDown={(e) => e.stopPropagation()}>
            <h2>Tracked assets</h2>
            <div class="asset-picker-list">
              {ACTIVE_STABLECOINS.map((symbol) => {
                const id = coinTabId(symbol);
                const active = activeTab === id;
                return (
                  <button type="button" key={symbol} class={active ? 'active' : ''} onClick={() => pickAsset(symbol)}>
                    <span>{symbol}</span>
                    <small>{active ? 'Viewing' : 'Open'}</small>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
