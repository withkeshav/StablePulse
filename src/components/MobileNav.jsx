import { ACTIVE_STABLECOINS, coinTabId } from '../utils/coin-config.js';

const ITEMS = [
  { id: 'home', label: 'Home' },
  ...ACTIVE_STABLECOINS.map((symbol) => ({ id: coinTabId(symbol), label: symbol })),
  { id: 'learn', label: 'Learn' },
  { id: 'chains', label: 'Chains' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'about', label: 'About' },
];

export default function MobileNav({ activeTab, setActiveTab, alertCount }) {
  return (
    <nav id="mobile-nav" aria-label="Mobile navigation">
      <div class="mob-nav-items">
        {ITEMS.map((item) => (
          <button
            type="button"
            key={item.id}
            class={`mob-nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <span>{item.label}</span>
            {item.id === 'alerts' && alertCount > 0 ? <span class="mob-badge">{alertCount}</span> : null}
          </button>
        ))}
      </div>
    </nav>
  );
}
