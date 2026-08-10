import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import MobileNav from './components/MobileNav.jsx';
import HomeTab from './components/Tabs/HomeTab.jsx';
import CoinTab from './components/Tabs/CoinTab.jsx';
import ChainsTab from './components/Tabs/ChainsTab.jsx';
import AlertsTab from './components/Tabs/AlertsTab.jsx';
import SkeletonLoader from './components/ui/SkeletonLoader.jsx';
import RefreshCountdown from './components/ui/RefreshCountdown.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import useTheme from './hooks/useTheme.js';
import { apiBase, APP_VERSION } from './config.js';
import { coinFromTabId } from './utils/coin-config.js';

const REFRESH_OPTIONS = [60, 180, 300, 600, 900];
const REFRESH_KEY = 'stablescope:refresh';
const COMPACT_KEY = 'stablescope:compact';
const FETCH_TIMEOUT_MS = 20000;

function readStoredRefresh() {
  const value = Number(localStorage.getItem(REFRESH_KEY));
  return REFRESH_OPTIONS.includes(value) ? value : 900;
}

function readStoredCompact() {
  return localStorage.getItem(COMPACT_KEY) === '1';
}

export default function App() {
  const dashboardUrl = `${apiBase}/api/dashboard`;

  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('home');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiStatus, setApiStatus] = useState({ message: '' });
  const [alerts, setAlerts] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshIntervalSec, setRefreshIntervalSec] = useState(readStoredRefresh);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [compactMode, setCompactMode] = useState(readStoredCompact);

  const aliveRef = useRef(true);
  const abortRef = useRef(null);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const fetchDashboard = useCallback(
    async (opts = {}) => {
      const { background = false } = opts;
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const timeout = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
        setApiStatus({ message: '' });
      }

      try {
        const res = await fetch(dashboardUrl, { signal: ctrl.signal });
        if (!aliveRef.current) return;
        if (res.status === 404 || res.status === 503) {
          setApiStatus({ message: 'Waiting for first background sync. Please check back in a few minutes.' });
          return;
        }
        if (!res.ok) throw new Error(`Dashboard fetch failed: ${res.status}`);
        const payload = await res.json();
        if (!aliveRef.current) return;
        if (!payload || !payload.data) {
          setApiStatus({ message: 'Waiting for first background sync. Please check back in a few minutes.' });
          return;
        }
        setData({ ...payload.data, intelligence: payload.intelligence || null });
        setAlerts(payload.alerts || []);
        setLastUpdated(payload.lastUpdated || null);
        setRefreshIntervalSec(payload.refreshIntervalSec || 900);
        setApiStatus({ message: '' });
      } catch (err) {
        if (!aliveRef.current || err?.name === 'AbortError') return;
        console.error(err);
        setApiStatus({ message: 'Failed to load dashboard data. Please retry shortly.' });
      } finally {
        clearTimeout(timeout);
        if (aliveRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [dashboardUrl]
  );

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (!refreshIntervalSec || refreshIntervalSec <= 0) return undefined;
    const t = setInterval(() => fetchDashboard({ background: true }), refreshIntervalSec * 1000);
    return () => clearInterval(t);
  }, [refreshIntervalSec, fetchDashboard]);

  useEffect(() => {
    document.body.classList.toggle('compact', compactMode);
  }, [compactMode]);

  useEffect(() => {
    try {
      localStorage.setItem(COMPACT_KEY, compactMode ? '1' : '0');
    } catch {
      // ignore storage errors (private mode)
    }
  }, [compactMode]);

  useEffect(() => {
    try {
      localStorage.setItem(REFRESH_KEY, String(refreshIntervalSec));
    } catch {
      // ignore storage errors (private mode)
    }
  }, [refreshIntervalSec]);

  const coinTab = coinFromTabId(activeTab);

  return (
    <div id="app-layout" class="layout-wrapper">
      <Header
        loading={loading}
        refreshing={refreshing}
        apiStatus={apiStatus}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onRefresh={() => fetchDashboard({ background: true })}
        buildVersion={APP_VERSION}
        theme={theme}
        setTheme={setTheme}
        alertCount={alerts.length}
        onJumpToAlerts={() => setActiveTab('alerts')}
      />
      <div id="body-row">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} alertCount={alerts.length} />
        <main id="main">
          {loading && !data ? (
            <SkeletonLoader />
          ) : (
            <>
              {apiStatus.message ? (
                <div class="card" style="margin: 16px; padding: 14px;">{apiStatus.message}</div>
              ) : null}
              {!loading && lastUpdated ? (
                <RefreshCountdown lastUpdated={lastUpdated} refreshIntervalSec={refreshIntervalSec} refreshing={refreshing} />
              ) : null}
              {activeTab === 'home' && (
                <HomeTab
                  data={data}
                  alerts={alerts}
                  apiBase={apiBase}
                  setActiveTab={setActiveTab}
                  refreshIntervalSec={refreshIntervalSec}
                />
              )}
              {coinTab ? <CoinTab coin={activeTab} data={data} /> : null}
              {activeTab === 'chains' && <ChainsTab data={data} />}
              {activeTab === 'alerts' && (
                <AlertsTab alerts={alerts} intelligence={data?.intelligence} apiBase={apiBase} data={data} />
              )}
            </>
          )}
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
