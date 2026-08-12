import { ACTIVE_STABLECOINS, coinTabId } from '../utils/coin-config.js';

const TABS = [
  { id: 'home', label: 'Home' },
  ...ACTIVE_STABLECOINS.map((symbol) => ({ id: coinTabId(symbol), label: symbol, coin: symbol })),
  { id: 'learn', label: 'Learn' },
  { id: 'chains', label: 'Chains' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'about', label: 'About' },
];

export default function Sidebar({ activeTab, setActiveTab, alertCount, alerts }) {
  const coinAlertCounts = {};
  for (const a of alerts || []) {
    if (a.coin) coinAlertCounts[a.coin] = (coinAlertCounts[a.coin] || 0) + 1;
  }
  return (
    <nav id="sidebar" aria-label="Main navigation">
      <div class="sidebar-nav">
        {TABS.map((tab) => (
          <button
            type="button"
            key={tab.id}
            class={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
            data-tab={tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            <span class="nav-icon">•</span>
            <span class="nav-label">{tab.label}</span>
            {tab.id === 'alerts' && alertCount > 0 ? <span class="nav-badge">{alertCount}</span> : null}
            {tab.coin && coinAlertCounts[tab.coin] ? <span class="nav-badge">{coinAlertCounts[tab.coin]}</span> : null}
          </button>
        ))}
      </div>
      <div class="sidebar-footer">
        <div>StableSense</div>
      </div>
    </nav>
  );
}
