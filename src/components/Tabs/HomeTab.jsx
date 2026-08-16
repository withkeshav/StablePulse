import { useMemo, useState } from 'preact/hooks';
import { fmtB, fmtPrice } from '../../utils/formatters.js';
import { getActiveCoins } from '../../utils/coin-config.js';
import StatCard from '../ui/StatCard.jsx';
import { buildMigrationPairs, buildSupplySeries, buildWhaleWatchRows, computePegStress, pegChartOptions, pegRefLine, rankChainFlows, toPercentFromFirst } from '../../lib/derive.js';
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

  const [supplyLog, setSupplyLog] = useState(false);
  const [supplyPct, setSupplyPct] = useState(false);

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
    () => {
      const transform = (series) => (supplyPct ? toPercentFromFirst(series).map((p) => p.value) : series.map((p) => p.value));
      return {
        labels: supplyLabels,
        datasets: coins.map((c) => ({
          label: supplyPct ? `${c.symbol} %` : c.symbol,
          data: transform(supplySeriesByCoin[c.symbol]),
          borderColor: c.color,
          tension: 0.25,
        })),
      };
    },
    [coins, supplyLabels, supplySeriesByCoin, supplyPct]
  );

  const supplyChartOptions = useMemo(() => {
    const yScale = supplyLog && !supplyPct
      ? { type: 'logarithmic', ticks: { callback: (v) => fmtB(v) } }
      : supplyPct
        ? { ticks: { callback: (v) => (v >= 0 ? '+' : '') + Number(v).toFixed(1) + '%' } }
        : { ticks: { callback: (v) => fmtB(v) } };
    return { responsive: true, maintainAspectRatio: false, scales: { y: yScale } };
  }, [supplyLog, supplyPct]);

  const pegChartData = useMemo(
    () => {
      const refColor = typeof document !== 'undefined'
        ? getComputedStyle(document.documentElement).getPropertyValue('--text2').trim() || '#9CA3AF'
        : '#9CA3AF';
      const coinLines = coins.map((c) => ({
        label: c.symbol,
        data: (data?.[`cg${c.symbol}Chart`]?.prices || []).slice(-90).map((p) => p[1]),
        borderColor: c.color,
        tension: 0.25,
      }));
      return { labels: pegLabels, datasets: [...coinLines, pegRefLine(pegLabels, refColor)] };
    },
    [coins, pegLabels, data]
  );

  const pegChartOpts = useMemo(() => {
    const allPrices = pegChartData.datasets
      .filter((d) => d.label !== '$1 peg')
      .flatMap((d) => d.data)
      .filter((v) => typeof v === 'number' && v > 0);
    return pegChartOptions(allPrices);
  }, [pegChartData]);

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
        dataQuality={data?.dataQuality}
        refreshIntervalSec={refreshIntervalSec}
      />

      <section class="metric-strip" aria-label="Key market metrics">
        <article class="metric-chip">
          <div class="metric-icon blue" aria-hidden="true" />
          <div>
            <p>Global stablecoin market cap</p>
            <strong>{fmtB(totalMC)}</strong>
            <span>All issuers · not only tracked coins</span>
          </div>
        </article>
        <article class="metric-chip">
          <div class="metric-icon violet" aria-hidden="true" />
          <div>
            <p>24h volume (tracked)</p>
            <strong>{fmtB(vol)}</strong>
            <span>{coins.length} coins on this dashboard</span>
          </div>
        </article>
        <article class="metric-chip">
          <div class="metric-icon amber" aria-hidden="true" />
          <div>
            <p>Learning signals</p>
            <strong>{String((alerts || []).length).padStart(2, '0')}</strong>
            <span>worth understanding</span>
          </div>
          <div class="signal-pips" aria-hidden="true"><i /><i /><i /></div>
        </article>
      </section>

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
            <StatCard key={c.symbol} label={`${c.symbol} Price`} value={fmtPrice(priceByCoin[c.symbol])} meta={(() => { const chg = cg?.[c.coingeckoId]?.usd_24h_change; return typeof chg === 'number' ? `${chg > 0 ? '+' : ''}${chg.toFixed(2)}% 24h` : null; })()} />
          ))}
          {coins.map((c) => {
            const asset = data?.allStables?.peggedAssets?.find((x) => x.symbol.toLowerCase() === c.symbol.toLowerCase());
            const dq = data?.dataQuality?.find((q) => q.coin === c.symbol);
            return <StatCard key={`${c.symbol}-supply`} label={`${c.symbol} Supply`} value={fmtB(asset?.circulating?.peggedUSD)} warning={dq ? 'Data unavailable' : null} />;
          })}
        </div>
      </div>

      <MarketPulse
        supplyChartData={supplyChartData}
        supplyChartOptions={supplyChartOptions}
        pegChartData={pegChartData}
        pegChartOptions={pegChartOpts}
        onToggleLog={() => setSupplyLog((v) => !v)}
        onTogglePct={() => { setSupplyPct((v) => !v); if (!supplyPct) setSupplyLog(false); }}
        supplyLog={supplyLog}
        supplyPct={supplyPct}
        onLearn={() => setActiveTab('learn')}
      />
      <SignalSummary
        data={data}
        alerts={alerts}
        onViewAll={() => setActiveTab('alerts')}
        onLearn={() => setActiveTab('learn')}
      />
      <WhaleWatch rows={whaleRows} />
      <CapitalFlows migrationPairs={migrationPairs} chainFlows={chainFlows} />
    </div>
  );
}
