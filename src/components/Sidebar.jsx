import { ACTIVE_STABLECOINS, coinTabId } from '../utils/coin-config.js';

const TABS = [
  { id: 'home', label: 'Home' },
  ...ACTIVE_STABLECOINS.map((symbol) => ({ id: coinTabId(symbol), label: symbol })),
  { id: 'chains', label: 'Chains' },
  { id: 'alerts', label: 'Alerts' },
];

export default function Sidebar({ activeTab, setActiveTab, alertCount }) {
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
          </button>
        ))}
      </div>
      <div class="sidebar-footer">
        <div>StablePulse</div>
      </div>
    </nav>
  );
}
