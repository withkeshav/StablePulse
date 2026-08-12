import { useMemo } from 'preact/hooks';
import { fmtB, fmtPrice } from '../../utils/formatters.js';
import { getActiveCoins } from '../../utils/coin-config.js';
import StatCard from '../ui/StatCard.jsx';
import { buildMigrationPairs, buildSupplySeries, buildWhaleWatchRows, computePegStress, rankChainFlows } from '../../lib/derive.js';
import SignalHero from '../Sections/SignalHero.jsx';
import MarketPulse from '../Sections/MarketPulse.jsx';
import CapitalFlows from '../Sections/CapitalFlows.jsx';
import SignalSummary from '../Sections/SignalSummary.jsx';
import WhaleWatch from '../Sections/WhaleWatch.jsx';

export default function HomeTab({ data, alerts, setActiveTab, refreshIntervalSec = 900 }) {
  const cg = data?.cgSimple;
  const coins = getActiveCoins();

  const priceByCoin = useMemo(() => {
    const m = {};
    coins.forEach((c) => {
      m[c.symbol] = cg?.[c.coingeckoId]?.usd || data?.prices?.[c.symbol]?.price || 1;
    });
    return m;
  }, [coins, cg, data]);

  const detailsByCoin = useMemo(() => {
    const m = {};
    coins.forEach((c) => {
      m[c.symbol] = data?.[`${c.symbol.toLowerCase()}Detail`];
    });
    return m;
  }, [coins, data]);

  const supplySeriesByCoin = useMemo(() => {
    const m = {};
    coins.forEach((c) => {
      m[c.symbol] = buildSupplySeries(detailsByCoin[c.symbol]);
    });
    return m;
  }, [coins, detailsByCoin]);

  const chainFlows = useMemo(() => rankChainFlows(detailsByCoin), [detailsByCoin]);
  const migrationPairs = useMemo(() => buildMigrationPairs(chainFlows), [chainFlows]);
  const stress = useMemo(
    () => computePegStress({ pricesByCoin: priceByCoin, alerts, topChainFlow: chainFlows[0]?.totalDelta || 0 }),
    [priceByCoin, alerts, chainFlows]
  );
  const whaleRows = useMemo(() => buildWhaleWatchRows(detailsByCoin), [detailsByCoin]);

  const supplyLabels = useMemo(() => {
    const any = coins.map((c) => supplySeriesByCoin[c.symbol]).find((s) => s.length);
    return (any || []).map((p) => new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  }, [coins, supplySeriesByCoin]);

  const pegLabels = useMemo(() => {
    const any = coins.map((c) => data?.[`cg${c.symbol}Chart`]?.prices).find((p) => p?.length);
    return (any || []).slice(-90).map((p) => new Date(p[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  }, [coins, data]);

  const supplyChartData = useMemo(
    () => ({
      labels: supplyLabels,
      datasets: coins.map((c) => ({
        label: c.symbol,
        data: supplySeriesByCoin[c.symbol].map((p) => p.value),
        borderColor: c.color,
        tension: 0.25,
      })),
    }),
    [coins, supplyLabels, supplySeriesByCoin]
  );

  const pegChartData = useMemo(
    () => ({
      labels: pegLabels,
      datasets: coins.map((c) => ({
        label: c.symbol,
        data: (data?.[`cg${c.symbol}Chart`]?.prices || []).slice(-90).map((p) => p[1]),
        borderColor: c.color,
        tension: 0.25,
      })),
    }),
    [coins, pegLabels, data]
  );

  const totalMC = data?.allStables?.totalMarketCap?.peggedUSD || 0;
  const vol = useMemo(() => coins.reduce((sum, c) => sum + (cg?.[c.coingeckoId]?.usd_24h_vol || 0), 0), [coins, cg]);

  return (
    <div class="tab-content active">
      <SignalHero
        coins={coins}
        priceByCoin={priceByCoin}
        stress={stress}
        intelligence={data?.intelligence}
        onLearn={() => setActiveTab('learn')}
      />

      <a class="research-callout" href="/research/" target="_blank" rel="noopener noreferrer">
        <span class="research-callout-kicker">New</span>
        <span class="research-callout-text">Read the full stablecoin research: The State of Stablecoins</span>
        <span class="research-callout-arrow">&rsaquo;</span>
      </a>

      <p class="sync-cadence-hint">
        Data refreshes on your chosen cadence from live market sources; the strip above shows the countdown to the next refresh.
      </p>

      <div class="sticky-stats-wrap">
        <div class="stats-grid" id="home-stats">
          {coins.map((c) => (
            <StatCard key={c.symbol} label={`${c.symbol} Price`} value={fmtPrice(priceByCoin[c.symbol])} />
          ))}
          {coins.map((c) => {
            const asset = data?.allStables?.peggedAssets?.find((x) => x.symbol === c.symbol);
            return <StatCard key={`${c.symbol}-supply`} label={`${c.symbol} Supply`} value={fmtB(asset?.circulating?.peggedUSD)} />;
          })}
          <StatCard label="Total Market Cap" value={fmtB(totalMC)} />
          <StatCard label="24h Volume" value={fmtB(vol)} />
        </div>
      </div>

      <WhaleWatch rows={whaleRows} />

      <MarketPulse supplyChartData={supplyChartData} pegChartData={pegChartData} />
      <CapitalFlows migrationPairs={migrationPairs} chainFlows={chainFlows} />
      <SignalSummary data={data} alerts={alerts} onViewAll={() => setActiveTab('alerts')} />
    </div>
  );
}
