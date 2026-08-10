import { fmtB, fmtPrice } from '../../utils/formatters.js';
import StatCard from '../ui/StatCard.jsx';
import { buildMigrationPairs, buildSupplySeries, buildWhaleWatchRows, computePegStress, rankChainFlows } from '../../lib/derive.js';
import SignalHero from '../Sections/SignalHero.jsx';
import MarketPulse from '../Sections/MarketPulse.jsx';
import CapitalFlows from '../Sections/CapitalFlows.jsx';
import SignalSummary from '../Sections/SignalSummary.jsx';
import WhaleWatch from '../Sections/WhaleWatch.jsx';

export default function HomeTab({ data, alerts, apiBase, setActiveTab, refreshIntervalSec = 900 }) {
  const cg = data?.cgSimple;
  const assets = data?.allStables?.peggedAssets || [];
  const usdt = assets.find((x) => x.symbol === 'USDT');
  const usdc = assets.find((x) => x.symbol === 'USDC');
  const usdtP = cg?.tether?.usd || data?.prices?.USDT?.price || 1;
  const usdcP = cg?.['usd-coin']?.usd || data?.prices?.USDC?.price || 1;

  const usdtSupplySeries = buildSupplySeries(data?.usdtDetail);
  const usdcSupplySeries = buildSupplySeries(data?.usdcDetail);
  const chainFlows = rankChainFlows(data?.usdtDetail, data?.usdcDetail);
  const migrationPairs = buildMigrationPairs(chainFlows);

  const supplyLabels = (usdtSupplySeries.length ? usdtSupplySeries : usdcSupplySeries).map((p) => new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  const pegLabels = (data?.cgUSDTChart?.prices || data?.cgUSDCChart?.prices || []).slice(-90).map((p) => new Date(p[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  const supplyChartData = {
    labels: supplyLabels,
    datasets: [
      { label: 'USDT', data: usdtSupplySeries.map((p) => p.value), borderColor: '#26A17B', tension: 0.25 },
      { label: 'USDC', data: usdcSupplySeries.map((p) => p.value), borderColor: '#2775CA', tension: 0.25 },
    ],
  };
  const pegChartData = {
    labels: pegLabels,
    datasets: [
      { label: 'USDT', data: (data?.cgUSDTChart?.prices || []).slice(-90).map((p) => p[1]), borderColor: '#26A17B', tension: 0.25 },
      { label: 'USDC', data: (data?.cgUSDCChart?.prices || []).slice(-90).map((p) => p[1]), borderColor: '#2775CA', tension: 0.25 },
    ],
  };

  const stress = computePegStress({ usdtPrice: usdtP, usdcPrice: usdcP, alerts, topChainFlow: chainFlows[0]?.totalDelta || 0 });
  const totalMC = data?.allStables?.totalMarketCap?.peggedUSD || 0;
  const vol = (cg?.tether?.usd_24h_vol || 0) + (cg?.['usd-coin']?.usd_24h_vol || 0);
  const whaleRows = buildWhaleWatchRows(data?.usdtDetail, data?.usdcDetail);

  const cadenceMin = Math.max(1, Math.round(Number(refreshIntervalSec) / 60));

  return (
    <div class="tab-content active">
      <SignalHero
        usdtPrice={usdtP}
        usdcPrice={usdcP}
        stress={stress}
        aiHeadline={data?.intelligence?.headline || ''}
      />

      <p class="sync-cadence-hint">
        Background sync runs on a ~{cadenceMin}-minute worker schedule; the strip above shows countdown to the next advisory refresh window.
      </p>

      <div class="sticky-stats-wrap">
        <div class="stats-grid" id="home-stats">
          <StatCard label="USDT Price" value={fmtPrice(usdtP)} />
          <StatCard label="USDC Price" value={fmtPrice(usdcP)} />
          <StatCard label="USDT Supply" value={fmtB(usdt?.circulating?.peggedUSD)} />
          <StatCard label="USDC Supply" value={fmtB(usdc?.circulating?.peggedUSD)} />
          <StatCard label="Total Market Cap" value={fmtB(totalMC)} />
          <StatCard label="24h Volume" value={fmtB(vol)} />
        </div>
      </div>

      <WhaleWatch rows={whaleRows} />

      <MarketPulse supplyChartData={supplyChartData} pegChartData={pegChartData} />
      <CapitalFlows migrationPairs={migrationPairs} chainFlows={chainFlows} />
      <SignalSummary data={data} alerts={alerts} apiBase={apiBase} onViewAll={() => setActiveTab('alerts')} />
    </div>
  );
}
