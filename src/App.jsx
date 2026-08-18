import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import MobileNav from './components/MobileNav.jsx';
import HomeTab from './components/Tabs/HomeTab.jsx';
import CoinTab from './components/Tabs/CoinTab.jsx';
import ChainsTab from './components/Tabs/ChainsTab.jsx';
import AlertsTab from './components/Tabs/AlertsTab.jsx';
import AboutTab from './components/Tabs/AboutTab.jsx';
import LearnTab from './components/Tabs/LearnTab.jsx';
import ResearchTab from './components/Tabs/ResearchTab.jsx';
import SkeletonLoader from './components/ui/SkeletonLoader.jsx';
import RefreshCountdown from './components/ui/RefreshCountdown.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import useTheme from './hooks/useTheme.js';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { APP_VERSION, aiApiBase } from './config.js';
import { REFRESH_KEY, COMPACT_KEY } from './utils/storage.js';
import { coinFromTabId, getActiveCoins } from './utils/coin-config.js';
import { fetchDashboardData, fetchCanonicalAlerts, fetchHealthz, loadCoinChart } from './lib/api.js';
import { fetchIntelligence } from './lib/ai.js';
import { generateAlerts } from './lib/derive.js';
import { buildFreshness } from './lib/freshness.js';

const REFRESH_OPTIONS = [60, 180, 300, 600, 900];

function readStoredRefresh() {
  try {
    const raw = localStorage.getItem(REFRESH_KEY);
    if (raw === null) return null;
    const value = Number(raw);
    return REFRESH_OPTIONS.includes(value) ? value : null;
  } catch { return null; }
}

function readStoredCompact() {
  try {
    const raw = localStorage.getItem(COMPACT_KEY);
    if (raw === null) return true;
    return raw === '1';
  } catch { return true; }
}

export default function App() {
  const { theme, setTheme, effectiveTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('home');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiStatus, setApiStatus] = useState({ message: '' });
  const [alerts, setAlerts] = useState([]);
  const [alertHistory, setAlertHistory] = useState([]);
  const [alertSource, setAlertSource] = useState('local');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [freshness, setFreshness] = useState(null);
  const [railOpen, setRailOpen] = useState(false);

  const initialStoredRefresh = readStoredRefresh();
  const [refreshIntervalSec, setRefreshIntervalSec] = useState(initialStoredRefresh ?? 900);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [compactMode, setCompactMode] = useState(readStoredCompact);

  const intelligenceRef = useRef(null);

  const aliveRef = useRef(true);
  const abortRef = useRef(null);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const refresh = useCallback(async (opts = {}) => {
    const { background = false } = opts;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    if (background) {
      setRefreshing(true);
    } else {
      setLoading(true);
      setApiStatus({ message: '' });
    }

    try {
      const [dashRes, healthRes, canonicalRes] = await Promise.allSettled([
        fetchDashboardData({ signal: ctrl.signal }),
        fetchHealthz({ signal: ctrl.signal }),
        fetchCanonicalAlerts({ signal: ctrl.signal }),
      ]);
      if (!aliveRef.current) return;
      if (dashRes.status !== 'fulfilled') throw dashRes.reason;
      const result = dashRes.value;
      const health = healthRes.status === 'fulfilled' ? healthRes.value : null;
      const canonical = canonicalRes.status === 'fulfilled' ? canonicalRes.value : null;
      const nextData = { ...result, intelligence: intelligenceRef.current || null };
      const localAlerts = generateAlerts(nextData);
      const persistedCount = canonical?.meta?.persistedCount || 0;
      const rows = canonical?.data || [];
      const open = rows.filter((a) => a.state === 'open');
      let nextAlerts = localAlerts;
      let source = 'local';
      if (canonical && persistedCount > 0) {
        nextAlerts = open;
        source = 'canonical';
      } else if (canonical && canonical.meta?.empty) {
        source = 'provisional';
      }
      setData(nextData);
      setAlerts(nextAlerts);
      setAlertHistory(rows);
      setAlertSource(source);
      setLastUpdated(result.fetchedAt);
      setFreshness(buildFreshness({
        checkedAt: result.fetchedAt,
        spotObservedAt: result.spotObservedAt,
        supplyObservedAt: result.supplyObservedAt,
        marketObservedAt: result.marketObservedAt,
        snapshotAt: health?.lastMarketSync ?? null,
      }));
      setApiStatus({ message: '' });
    } catch (err) {
      if (!aliveRef.current || err?.name === 'AbortError') return;
      console.error(err);
      setApiStatus({ message: 'Failed to load market data. Retry shortly; the last snapshot is shown if a cache exists.' });
    } finally {
      if (aliveRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!refreshIntervalSec || refreshIntervalSec <= 0) return undefined;
    const t = setInterval(() => refresh({ background: true }), refreshIntervalSec * 1000);
    return () => clearInterval(t);
  }, [refreshIntervalSec, refresh]);

  useEffect(() => {
    if (!aiApiBase) return undefined;
    fetchIntelligence().then((ai) => {
      if (!aliveRef.current || !ai) return;
      intelligenceRef.current = ai;
      setData((prev) => (prev ? { ...prev, intelligence: ai } : prev));
    });
    return undefined;
  }, [refresh]);

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

  useEffect(() => {
    if (!data) return undefined;
    let alive = true;
    Promise.all(getActiveCoins().map((coin) => loadCoinChart(coin.symbol, data))).then(() => {
      if (alive) setData((prev) => ({ ...prev }));
    });
    return () => { alive = false; };
  }, [data?.fetchedAt]);

  const priceByCoin = useMemo(() => {
    const coins = getActiveCoins();
    const cg = data?.cgSimple;
    const m = {};
    coins.forEach((c) => {
      const live = cg?.[c.coingeckoId]?.usd ?? data?.prices?.[c.symbol]?.price;
      m[c.symbol] = typeof live === 'number' ? live : null;
    });
    return m;
  }, [data]);

  const setTab = useCallback((id) => {
    setActiveTab(id);
    setRailOpen(false);
  }, []);

  return (
    <div id="app-layout" class="layout-wrapper app-shell" data-theme={effectiveTheme}>
      <a href="#main" class="skip-link">Skip to content</a>
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setTab}
        alertCount={alerts.length}
        alerts={alerts}
        priceByCoin={priceByCoin}
        data={data}
        lastUpdated={lastUpdated}
        open={railOpen}
        onClose={() => setRailOpen(false)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenMethodology={() => setTab('about')}
      />
      <div class="site-main">
        <Header
          loading={loading}
          refreshing={refreshing}
          apiStatus={apiStatus}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onRefresh={() => refresh({ background: true })}
          buildVersion={APP_VERSION}
          theme={theme}
          setTheme={setTheme}
          alertCount={alerts.length}
          onJumpToAlerts={() => setTab('alerts')}
          activeTab={activeTab}
          onOpenRail={() => setRailOpen(true)}
          dataState={freshness?.overallState}
        />
        <div id="body-row">
          <main id="main" class="main-scroll">
            <ErrorBoundary>
              {loading && !data ? (
                <SkeletonLoader />
              ) : (
                <>
                  {apiStatus.message ? (
                    <div class="card api-status-card">{apiStatus.message}</div>
                  ) : null}
                  {!loading && lastUpdated ? (
                    <RefreshCountdown
                      lastUpdated={lastUpdated}
                      refreshIntervalSec={refreshIntervalSec}
                      refreshing={refreshing}
                      freshness={freshness}
                      dataState={freshness?.overallState}
                    />
                  ) : null}
                  {activeTab === 'home' && (
                    <HomeTab
                      data={data}
                      alerts={alerts}
                      setActiveTab={setTab}
                      refreshIntervalSec={refreshIntervalSec}
                      freshness={freshness}
                    />
                  )}
                  {coinTab ? (
                    <CoinTab
                      key={activeTab}
                      coin={activeTab}
                      data={data}
                      alerts={alerts}
                      setActiveTab={setTab}
                    />
                  ) : null}
                  {activeTab === 'chains' && <ChainsTab data={data} />}
                  {activeTab === 'alerts' && (
                    <AlertsTab
                      alerts={alerts}
                      intelligence={data?.intelligence}
                      data={data}
                      setActiveTab={setTab}
                      alertSource={alertSource}
                      alertHistory={alertHistory}
                    />
                  )}
                {activeTab === 'learn' && <LearnTab data={data} alerts={alerts} alertHistory={alertHistory} alertSource={alertSource} />}
                {activeTab === 'research' && <ResearchTab />}
                {activeTab === 'about' && <AboutTab />}
                </>
              )}
            </ErrorBoundary>
          </main>
        </div>
      </div>
      <MobileNav
        activeTab={activeTab}
        setActiveTab={setTab}
        alertCount={alerts.length}
        onOpenRail={() => setRailOpen(true)}
      />
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
