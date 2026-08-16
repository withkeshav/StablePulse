import { BrandWordmark } from './BrandMark.jsx';
import { ACTIVE_STABLECOINS, coinTabId, STABLECOIN_REGISTRY } from '../utils/coin-config.js';
import { fmtPrice } from '../utils/formatters.js';

const PRIMARY = [
  { id: 'home', label: 'Dashboard' },
  { id: 'research', label: 'Research' },
  { id: 'learn', label: 'Learn' },
  { id: 'chains', label: 'Chains' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'about', label: 'About' },
];

const DISC = ['one', 'two', 'three', 'four', 'five'];

export default function Sidebar({
  activeTab,
  setActiveTab,
  alertCount,
  alerts,
  priceByCoin = {},
  data = null,
  lastUpdated,
  open = false,
  onClose,
  onOpenSettings,
  onOpenMethodology,
}) {
  const coinAlertCounts = {};
  for (const a of alerts || []) {
    if (a.coin) coinAlertCounts[a.coin] = (coinAlertCounts[a.coin] || 0) + 1;
  }

  const resolvePrice = (symbol) => {
    if (typeof priceByCoin[symbol] === 'number') return priceByCoin[symbol];
    const cfg = STABLECOIN_REGISTRY[symbol];
    const live = data?.cgSimple?.[cfg?.coingeckoId]?.usd ?? data?.prices?.[symbol]?.price;
    return typeof live === 'number' ? live : null;
  };

  const ago = (() => {
    if (!lastUpdated) return 'Waiting for first sync';
    const mins = Math.max(0, Math.round((Date.now() - lastUpdated) / 60000));
    if (mins < 1) return 'Updated just now';
    if (mins === 1) return 'Last update 1 min ago';
    return `Last update ${mins} min ago`;
  })();

  const go = (id) => {
    setActiveTab(id);
    onClose?.();
  };

  return (
    <>
      {open ? <button type="button" class="rail-backdrop" aria-label="Close navigation" onClick={onClose} /> : null}
      <aside id="sidebar" class={`sidebar instrument-rail ${open ? 'open' : ''}`} aria-label="Instrument rail" aria-hidden={open ? undefined : 'true'}>
        <BrandWordmark size={36} withImage />
        <div class="workspace-label">RESEARCH WORKSPACE</div>
        <nav class="sidebar-nav" aria-label="Primary sections">
          {PRIMARY.map((tab) => (
            <button
              type="button"
              key={tab.id}
              class={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              data-tab={tab.id}
              onClick={() => go(tab.id)}
            >
              <span class="nav-label">{tab.label}</span>
              {tab.id === 'alerts' && alertCount > 0 ? <span class="nav-badge">{alertCount}</span> : null}
              {tab.id === 'research' ? <i class="new-pill">NEW</i> : null}
              {tab.id === 'learn' ? <i class="new-pill">GUIDE</i> : null}
            </button>
          ))}
        </nav>

        <div class="side-divider" />
        <p class="sidebar-section">TRACKED ASSETS</p>
        <div class="asset-nav" aria-label="Tracked stablecoins">
          {ACTIVE_STABLECOINS.map((symbol, idx) => {
            const id = coinTabId(symbol);
            const price = resolvePrice(symbol);
            return (
              <button
                type="button"
                key={symbol}
                class={activeTab === id ? 'active' : ''}
                onClick={() => go(id)}
              >
                <i class={`asset-disc ${DISC[idx % DISC.length]}`} style={STABLECOIN_REGISTRY[symbol]?.color ? { background: STABLECOIN_REGISTRY[symbol].color } : undefined} />
                {symbol}
                <span>{price != null ? fmtPrice(price) : '-'}</span>
                {coinAlertCounts[symbol] ? <span class="nav-badge">{coinAlertCounts[symbol]}</span> : null}
              </button>
            );
          })}
        </div>

        <div class="sidebar-bottom">
          <div class="data-status">
            <span class="live-dot" aria-hidden="true" />
            <div>
              <strong>Data current</strong>
              <small>{ago}</small>
            </div>
          </div>
          <button type="button" class="settings-link" onClick={() => { onOpenMethodology?.(); onClose?.(); }}>
            Signal methodology
          </button>
          <button type="button" class="settings-link" onClick={() => { onOpenSettings?.(); onClose?.(); }}>
            Settings
          </button>
        </div>
      </aside>
    </>
  );
}
