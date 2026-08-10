import { useEffect, useState } from 'preact/hooks';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import MobileNav from './components/MobileNav.jsx';
import HomeTab from './components/Tabs/HomeTab.jsx';
import CoinTab from './components/Tabs/CoinTab.jsx';
import ChainsTab from './components/Tabs/ChainsTab.jsx';
import AlertsTab from './components/Tabs/AlertsTab.jsx';
import SkeletonLoader from './components/ui/SkeletonLoader.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import useTheme from './hooks/useTheme.js';
import { timeAgo } from './utils/formatters.js';

export default function App() {
  const BUILD_VERSION = 'v2026.05.02.2';
  const apiBase = import.meta.env.DEV
    ? 'http://127.0.0.1:8787'
    : 'https://stablescope-cors.keshav-maheshwari.workers.dev';
  const dashboardUrl = `${apiBase}/api/dashboard`;

  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('home');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState({ message: '' });
  const [alerts, setAlerts] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshIntervalSec, setRefreshIntervalSec] = useState(900);
  const [nowTs, setNowTs] = useState(Date.now());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [compactMode, setCompactMode] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('compact', compactMode);
  }, [compactMode]);

  useEffect(() => {
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let alive = true;

    async function fetchDashboard() {
      setLoading(true);
      setApiStatus({ message: '' });
      const res = await fetch(dashboardUrl);
      if (!res.ok) {
        if (res.status === 404 || res.status === 503) {
          setApiStatus({ message: 'Waiting for first background sync. Please check back in a few minutes.' });
          setLoading(false);
          return;
        }
        throw new Error(`Dashboard fetch failed: ${res.status}`);
      }
      const payload = await res.json();
      if (!alive) return;
      if (!payload || !payload.data) {
        setApiStatus({ message: 'Waiting for first background sync. Please check back in a few minutes.' });
        setLoading(false);
        return;
      }
      setData({ ...payload.data, intelligence: payload.intelligence || null });
      setAlerts(payload.alerts || []);
      setLastUpdated(payload.lastUpdated || null);
      setRefreshIntervalSec(payload.refreshIntervalSec || 900);
      setLoading(false);
    }

    fetchDashboard().catch((err) => {
      console.error(err);
      if (alive) {
        setApiStatus({ message: 'Failed to load dashboard data. Please retry shortly.' });
        setLoading(false);
      }
    });

    return () => { alive = false; };
  }, [dashboardUrl]);

  return (
    <div id="app-layout" class="layout-wrapper">
      <Header
        loading={loading}
        apiStatus={apiStatus}
        onOpenSettings={() => setIsSettingsOpen(true)}
        buildVersion={BUILD_VERSION}
        theme={theme}
        setTheme={setTheme}
        alertCount={alerts.length}
        onJumpToAlerts={() => setActiveTab('alerts')}
      />
      <div id="body-row">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} alertCount={alerts.length} />
        <main id="main">
          {!loading && apiStatus.message ? (
            <div class="card" style="margin: 16px; padding: 14px;">{apiStatus.message}</div>
          ) : null}
          {!loading && lastUpdated ? (
            <div class="card" style="margin: 12px 16px 0; padding: 8px 12px; font-size: 12px;">
              Last updated: {new Date(lastUpdated).toLocaleString()} · Data age: {timeAgo(lastUpdated)} · Next refresh in:{' '}
              {Math.max(0, refreshIntervalSec - Math.floor((nowTs - lastUpdated) / 1000))}s
            </div>
          ) : null}
          {loading ? (
            <SkeletonLoader />
          ) : !apiStatus.message ? (
            <>
              {activeTab === 'home' && (
                <HomeTab
                  data={data}
                  alerts={alerts}
                  apiBase={apiBase}
                  setActiveTab={setActiveTab}
                  refreshIntervalSec={refreshIntervalSec}
                />
              )}
              {activeTab === 'usdt' && <CoinTab coin="usdt" data={data} />}
              {activeTab === 'usdc' && <CoinTab coin="usdc" data={data} />}
              {activeTab === 'chains' && <ChainsTab data={data} />}
              {activeTab === 'alerts' && (
                <AlertsTab alerts={alerts} intelligence={data?.intelligence} apiBase={apiBase} data={data} />
              )}
            </>
          ) : null}
        </main>
      </div>
      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} alertCount={alerts.length} />
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        refreshIntervalSec={refreshIntervalSec}
        setRefreshIntervalSec={setRefreshIntervalSec}
        compactMode={compactMode}
        setCompactMode={setCompactMode}
        theme={theme}
        setTheme={setTheme}
      />
    </div>
  );
}
