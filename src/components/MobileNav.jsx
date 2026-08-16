import { ACTIVE_STABLECOINS, coinTabId } from '../utils/coin-config.js';

const ICONS = {
  home: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2L2 9h2v8h4v-5h4v5h4V9h2L10 2z"/></svg>',
  research: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M4 3h9l3 3v11H4V3zm8 1v3h3"/><path d="M7 9h6v1H7zm0 3h6v1H7z"/></svg>',
  learn: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M3 4h14v12H3V4zm2 2v8h10V6H5z"/><path d="M7 8h6v1H7zm0 3h6v1H7z"/></svg>',
  chains: '<svg viewBox="0 0 20 20" fill="currentColor"><circle cx="6" cy="6" r="2"/><circle cx="14" cy="6" r="2"/><circle cx="6" cy="14" r="2"/><circle cx="14" cy="14" r="2"/><path d="M7.5 7.5l5 5M12.5 7.5l-5 5" stroke="currentColor" stroke-width="0.8" fill="none"/></svg>',
  alerts: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 016 6c0 3-2 5-2 7H6c0-2-2-4-2-7a6 6 0 016-6zm-1 16h2a1 1 0 01-2 0z"/></svg>',
  about: '<svg viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 9v5M10 6v1.5"/></svg>',
};

function getIcon(id) {
  if (ICONS[id]) return ICONS[id];
  // coin tabs: simple circle with first letter
  const letter = id.charAt(0).toUpperCase();
  return `<svg viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="10" y="13" text-anchor="middle" font-size="8" font-family="monospace">${letter}</text></svg>`;
}

const ITEMS = [
  { id: 'home', label: 'Home' },
  ...ACTIVE_STABLECOINS.map((symbol) => ({ id: coinTabId(symbol), label: symbol })),
  { id: 'research', label: 'Research' },
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
            <span dangerouslySetInnerHTML={{ __html: getIcon(item.id) }} />
            <span>{item.label}</span>
            {item.id === 'alerts' && alertCount > 0 ? <span class="mob-badge">{alertCount}</span> : null}
          </button>
        ))}
      </div>
    </nav>
  );
}
