const ITEMS = [
  { id: 'home', label: 'Home' },
  { id: 'usdt', label: 'USDT' },
  { id: 'usdc', label: 'USDC' },
  { id: 'chains', label: 'Chains' },
  { id: 'alerts', label: 'Alerts' },
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
