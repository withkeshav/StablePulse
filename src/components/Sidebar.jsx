const TABS = [
  { id: 'home', label: 'Home' },
  { id: 'usdt', label: 'USDT' },
  { id: 'usdc', label: 'USDC' },
  { id: 'chains', label: 'Chains' },
  { id: 'alerts', label: 'Alerts' },
];

export default function Sidebar({ activeTab, setActiveTab, alertCount }) {
  return (
    <nav id="sidebar">
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
        <div>StableScope v2</div>
      </div>
    </nav>
  );
}
