import { useMemo, useState } from 'preact/hooks';
import { fmtB, fmtPct, fmtPrice, pctChange, bps } from '../../utils/formatters.js';
import { STABLECOIN_REGISTRY, getActiveCoins } from '../../utils/coin-config.js';
import { getAssetMeta } from '../../utils/asset-meta.js';
import { buildShareSeries, buildSupplySeries, buildWhaleWatchRows, dedupeTickers, pegChartOptions, pegRefLine, toPercentFromFirst } from '../../lib/derive.js';
import ChartWrapper from '../ui/ChartWrapper.jsx';
import { StabilityGauge } from '../Sections/SignalHero.jsx';

function coinStabilityScore(price, warnBps, critBps) {
  const drift = Math.abs(bps(price));
  if (!Number.isFinite(drift)) return 50;
  if (drift >= critBps) return Math.max(5, 40 - Math.min(35, drift - critBps));
  if (drift >= warnBps) return Math.max(55, 85 - Math.round((drift - warnBps) * 2));
  return Math.min(99, 92 + Math.round((warnBps - drift) / 2));
}

export default function CoinTab({ coin, data, setActiveTab }) {
  const symbol = (coin || '').toUpperCase();
  const cfg = STABLECOIN_REGISTRY[symbol];
  const meta = getAssetMeta(symbol);
  const cgKey = cfg?.coingeckoId;
  const detail = data?.[`${symbol.toLowerCase()}Detail`];
  const chartData = data?.[`cg${symbol}Chart`];
  const cgTickers = data?.[`cg${symbol}`];
  const asset = data?.allStables?.peggedAssets?.find((x) => x.symbol.toLowerCase() === symbol.toLowerCase());
  const price = data?.cgSimple?.[cgKey]?.usd || 1;
  const chg = data?.cgSimple?.[cgKey]?.usd_24h_change || 0;
  const supply = asset?.circulating?.peggedUSD || 0;
  const prev = asset?.circulatingPrevDay?.peggedUSD || supply;
  const color = cfg?.color || '#468bf0';
  const warnBps = cfg?.thresholds?.pegWarnBps ?? 10;
  const critBps = cfg?.thresholds?.pegCriticalBps ?? 50;
  const score = coinStabilityScore(price, warnBps, critBps);
  const pegBps = bps(price);

  const rows = useMemo(
    () =>
      Object.entries(detail?.chainBalances || {})
        .map(([chain, chainData]) => {
          const tokens = chainData?.tokens || [];
          const cur = tokens[tokens.length - 1]?.circulating?.peggedUSD || 0;
          const pd = tokens[tokens.length - 2]?.circulating?.peggedUSD || cur;
          return { chain, cur, pd, d1: pctChange(cur, pd) };
        })
        .filter((r) => r.cur > 0)
        .sort((a, b) => b.cur - a.cur)
        .slice(0, 10),
    [detail]
  );

  const chainShares = useMemo(() => {
    const total = rows.reduce((s, r) => s + r.cur, 0) || 1;
    return rows.slice(0, 4).map((r) => ({
      ...r,
      pct: Math.round((r.cur / total) * 100),
    }));
  }, [rows]);

  const supplySeries = useMemo(() => buildSupplySeries(detail), [detail]);
  const [supplyLog, setSupplyLog] = useState(false);
  const [supplyPct, setSupplyPct] = useState(false);

  const priceLineData = useMemo(() => {
    const series = (chartData?.prices || []).slice(-90);
    const labels = series.map((p) => new Date(p[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    const refColor = typeof document !== 'undefined'
      ? getComputedStyle(document.documentElement).getPropertyValue('--ink-faint').trim()
        || getComputedStyle(document.documentElement).getPropertyValue('--text2').trim()
        || '#8b98a5'
      : '#8b98a5';
    return {
      labels,
      datasets: [
        { label: `${symbol} Price`, data: series.map((p) => p[1]), borderColor: color, tension: 0.2, fill: false },
        pegRefLine(labels, refColor),
      ],
    };
  }, [chartData, symbol, color]);

  const supplyLineData = useMemo(
    () => {
      const labels = supplySeries.map((p) => new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      const values = supplyPct ? toPercentFromFirst(supplySeries).map((p) => p.value) : supplySeries.map((p) => p.value);
      return {
        labels,
        datasets: [{ label: supplyPct ? `${symbol} %` : `${symbol} Supply`, data: values, borderColor: color, tension: 0.2 }],
      };
    },
    [supplySeries, symbol, color, supplyPct]
  );

  const supplyLineOptions = useMemo(() => {
    const yScale = supplyLog && !supplyPct
      ? { type: 'logarithmic', ticks: { callback: (v) => fmtB(v) } }
      : supplyPct
        ? { ticks: { callback: (v) => (v >= 0 ? '+' : '') + Number(v).toFixed(1) + '%' } }
        : { ticks: { callback: (v) => fmtB(v) } };
    return { responsive: true, maintainAspectRatio: false, scales: { y: yScale } };
  }, [supplyLog, supplyPct]);

  const exchBars = useMemo(
    () => {
      const barRows = dedupeTickers(cgTickers?.tickers || [], 8);
      return {
        labels: barRows.map((r) => r.name),
        datasets: [{ label: '24h Volume', data: barRows.map((r) => r.volume), backgroundColor: color + 'AA' }],
      };
    },
    [cgTickers, color]
  );

  const whaleRows = useMemo(() => {
    const allRows = buildWhaleWatchRows({ [symbol]: detail });
    return allRows.filter((r) => r.coin === symbol).slice(0, 5);
  }, [symbol, detail]);

  const chartOptions = useMemo(() => ({ responsive: true, maintainAspectRatio: false }), []);
  const priceChartOpts = useMemo(() => {
    const prices = (priceLineData.datasets || [])
      .filter((d) => d.label !== '$1 peg')
      .flatMap((d) => d.data)
      .filter((v) => typeof v === 'number' && v > 0);
    return { responsive: true, maintainAspectRatio: false, ...pegChartOptions(prices) };
  }, [priceLineData]);

  const dominanceData = useMemo(() => {
    const coins = getActiveCoins();
    const supplyByCoin = {};
    for (const c of coins) {
      const d = data?.[`${c.symbol.toLowerCase()}Detail`];
      const s = buildSupplySeries(d);
      if (s.length >= 8) supplyByCoin[c.symbol] = s;
    }
    if (!supplyByCoin[symbol] || supplyByCoin[symbol].length < 2) return null;
    const share = buildShareSeries(supplyByCoin, symbol);
    return {
      labels: share.map((p) => new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [{ label: `${symbol} share of tracked supply`, data: share.map((p) => p.share), borderColor: color, tension: 0.2 }],
    };
  }, [data, symbol, color]);

  const dominanceOpts = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: { y: { ticks: { callback: (v) => Number(v).toFixed(1) + '%' } } },
    plugins: { tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.parsed.y).toFixed(1)}%` } } },
  }), []);

  const bpsData = useMemo(() => {
    const series = (chartData?.prices || []).slice(-90);
    if (!series.length) return null;
    const labels = series.map((p) => new Date(p[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    const refColor = typeof document !== 'undefined'
      ? getComputedStyle(document.documentElement).getPropertyValue('--ink-faint').trim() || '#8b98a5'
      : '#8b98a5';
    return {
      labels,
      datasets: [
        { label: `${symbol} deviation (bps)`, data: series.map((p) => bps(p[1])), borderColor: color, tension: 0.2 },
        { label: '0 bps', data: labels.map(() => 0), borderColor: refColor, borderDash: [4, 4], borderWidth: 1, pointRadius: 0, tension: 0 },
      ],
    };
  }, [chartData, symbol, color]);

  const bpsOpts = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: { y: { min: -50, max: 50, ticks: { callback: (v) => (v > 0 ? '+' : '') + v + ' bps' } } },
    plugins: { tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y > 0 ? '+' : ''}${ctx.parsed.y} bps` } } },
  }), []);

  const watchNote = (() => {
    if (chainShares[1] && chainShares[1].d1 > 1) {
      return `Supply is expanding on ${chainShares[1].chain}.`;
    }
    if (Math.abs(pegBps) >= warnBps) {
      return `Peg is ${Math.abs(pegBps)} bps from $1.00 - observe, do not treat as advice.`;
    }
    return meta.watchDefault;
  })();

  const goLearn = () => {
    if (!setActiveTab) return;
    setActiveTab('learn');
    if (meta.learnId) {
      setTimeout(() => {
        document.getElementById(meta.learnId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  };

  return (
    <div class="tab-content active asset-page">
      <section class="asset-hero glass signal-lens">
        <div class="asset-identity">
          <span class="asset-token" style={{ background: `linear-gradient(145deg, ${color}, ${color}cc)` }}>
            {symbol.slice(0, 1)}
          </span>
          <div>
            <p class="eyebrow">TRACKED ASSET · {meta.classification.toUpperCase()}</p>
            <h1>
              {meta.name} <em>{symbol}</em>
            </h1>
            <p>{meta.thesis}</p>
          </div>
        </div>
        <div class="asset-watch">
          <span>WHAT TO WATCH</span>
          <b>{watchNote}</b>
          <p>Observation only - not a recommendation.</p>
        </div>
      </section>

      <section class="asset-metrics">
        <article>
          <span>Current price</span>
          <strong>{fmtPrice(price)}</strong>
          <small>{pegBps === 0 ? 'On peg' : `${pegBps > 0 ? '+' : ''}${pegBps} bp from peg`}</small>
        </article>
        <article>
          <span>Peg stability</span>
          <strong>{score} <small>/100</small></strong>
          <small>{Math.abs(pegBps) < warnBps ? 'Normal 24h conditions' : 'Elevated drift - observe'}</small>
        </article>
        <article>
          <span>Circulating supply</span>
          <strong>{fmtB(supply)}</strong>
          <small>{fmtPct(chg)} market · {fmtB(supply - prev)} 24h supply Δ</small>
        </article>
        <article>
          <span>Reserve design</span>
          <strong>{meta.reserveDesign}</strong>
          <small>Classification fact, not a credit rating</small>
        </article>
      </section>

      <section class="asset-grid">
        <article class="panel glass asset-price-panel signal-lens">
          <header class="panel-head">
            <div>
              <p class="panel-kicker">PRICE DISCIPLINE</p>
              <h2>{symbol} around the peg</h2>
              <p class="panel-sub">Market price versus the $1.00 reference</p>
            </div>
          </header>
          <div class="panel-chart">
            <ChartWrapper
              type="line"
              data={priceLineData}
              height={280}
              aspectRatio={16 / 10}
              options={priceChartOpts}
              ariaLabel={`${symbol} price versus one dollar peg`}
              shareTitle={`${symbol} peg`}
              shareRange="~90D"
              shareInterpretation={`${symbol} market price relative to the $1.00 reference. This is a price picture, not a reserve-quality assessment.`}
              shareDefinition={`Secondary-market ${symbol} price versus a $1.00 peg line.`}
              shareHighlight={`${fmtPrice(price)} now · ${pegBps > 0 ? '+' : ''}${pegBps} bp from peg`}
            />
          </div>
          <footer class="chart-footer">
            <span><i class="legend-dot cobalt-dot" />{fmtPrice(price)} now · {pegBps > 0 ? '+' : ''}{pegBps} bp from peg</span>
            <button type="button" onClick={goLearn}>What moves the peg?</button>
          </footer>
        </article>

        <article class="asset-score glass">
          <p class="panel-kicker">STABILITY INDEX</p>
          <StabilityGauge value={score} />
          <h2>{Math.abs(pegBps) < warnBps ? 'Normal conditions' : 'Watch conditions'}</h2>
          <p>
            Score from current distance to $1.00 versus this asset&apos;s warn ({warnBps} bps) and critical ({critBps} bps) bands.
            It is not a solvency or reserve audit.
          </p>
        </article>
      </section>

      <section class="asset-grid lower-asset">
        <article class="panel glass">
          <header class="panel-head">
            <div>
              <p class="panel-kicker">MARKET DEPTH</p>
              <h2>Circulating supply</h2>
              <p class="panel-sub">{symbol} supply history</p>
            </div>
            <div class="segmented">
              <button type="button" class={supplyPct ? 'selected' : ''} onClick={() => setSupplyPct((v) => !v)} aria-pressed={supplyPct}>%</button>
              <button type="button" class={supplyLog ? 'selected' : ''} onClick={() => setSupplyLog((v) => !v)} aria-pressed={supplyLog}>Log</button>
            </div>
          </header>
          <div class="panel-chart">
            <ChartWrapper
              type="line"
              data={supplyLineData}
              options={supplyLineOptions}
              height={220}
              aspectRatio={16 / 10}
              ariaLabel={`${symbol} circulating supply`}
              shareTitle={`${symbol} supply`}
              shareRange="History"
              shareInterpretation={`${symbol} circulating supply path from DefiLlama-backed history.`}
              shareDefinition={`Circulating ${symbol} supply over time for this dashboard.`}
            />
          </div>
        </article>

        <article class="panel glass chain-panel">
          <header class="panel-head">
            <div>
              <p class="panel-kicker">WHERE IT MOVES</p>
              <h2>Chain distribution</h2>
              <p class="panel-sub">Share of tracked {symbol} supply</p>
            </div>
          </header>
          <div class="chain-list">
            {chainShares.length ? chainShares.map((r, idx) => (
              <div key={r.chain}>
                <span><i class={`chain-dot ${['one', 'two', 'three', 'four'][idx] || 'one'}`} />{r.chain}</span>
                <b>{r.pct}%</b>
                <em style={{ width: `${r.pct}%` }} />
              </div>
            )) : <div class="info-empty">No chain rows</div>}
          </div>
          <footer class="chart-footer">
            <span>Top chains by circulating supply</span>
            {setActiveTab ? (
              <button type="button" onClick={() => setActiveTab('chains')}>Explore chains</button>
            ) : null}
          </footer>
        </article>
      </section>

      <section class="asset-learn glass">
        <div>
          <p class="panel-kicker">STUDY THIS ASSET</p>
          <h2>{meta.learnQuestion}</h2>
          <p>A short StableSense lesson tied to this asset&apos;s design.</p>
        </div>
        <button type="button" class="primary-btn" onClick={goLearn}>Read the explainer</button>
      </section>

      {dominanceData ? (
        <div class="card mb-4 mt-4">
          <div class="card-header"><div class="card-title">{symbol} Dominance</div></div>
          <div class="card-body chart-card-body">
            <ChartWrapper type="line" data={dominanceData} options={dominanceOpts} height={200} aspectRatio={16 / 10} shareTitle={`${symbol} dominance`} shareDefinition={`${symbol}'s share of combined tracked stablecoin supply.`} />
            <p class="text-muted small" style="margin-top:6px">{symbol}&apos;s share of the combined tracked stablecoin supply (USDT, USDC, DAI, USDE, PYUSD) over time.</p>
          </div>
        </div>
      ) : null}

      {bpsData ? (
        <div class="card mb-4">
          <div class="card-header"><div class="card-title">{symbol} Peg Deviation (bps)</div></div>
          <div class="card-body chart-card-body">
            <ChartWrapper type="line" data={bpsData} options={bpsOpts} height={200} aspectRatio={16 / 10} shareTitle={`${symbol} deviation`} shareDefinition="Distance from the $1 peg in basis points." />
            <p class="text-muted small" style="margin-top:6px">Distance from the $1 peg in basis points. Fixed -50/+50 bounds so daily noise does not look like a depeg. 0 bps = exactly on peg.</p>
          </div>
        </div>
      ) : null}

      <div class="grid-2 mb-4">
        <div class="card">
          <div class="card-header"><div class="card-title">{symbol} Exchange Volume</div></div>
          <div class="card-body chart-card-body">
            <ChartWrapper type="bar" data={exchBars} height={180} aspectRatio={16 / 10} options={chartOptions} shareTitle={`${symbol} volume`} />
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">{symbol} by Chain</div></div>
          <div class="card-body p0">
            <div class="chain-table-desktop tbl-wrap">
              <table class="data-table">
                <thead><tr><th>Chain</th><th>Supply</th><th>1d %</th></tr></thead>
                <tbody>
                  {rows.length ? rows.slice(0, 8).map((r) => (
                    <tr key={r.chain}>
                      <td class="td-name">{r.chain}</td>
                      <td class="mono">{fmtB(r.cur)}</td>
                      <td class={`mono ${r.d1 > 0 ? 'td-pos' : r.d1 < 0 ? 'td-neg' : ''}`}>{r.d1 == null ? '-' : fmtPct(r.d1)}</td>
                    </tr>
                  )) : <tr><td colspan="3" class="info-empty">No chain rows</td></tr>}
                </tbody>
              </table>
            </div>
            <div class="chain-cards-mobile">
              {rows.length ? rows.slice(0, 8).map((r) => (
                <div class="chain-mobile-card" key={r.chain}>
                  <div class="cm-main">{r.chain}</div>
                  <div>
                    <div class="cm-label">Supply</div>
                    <div class="cm-val">{fmtB(r.cur)}</div>
                  </div>
                  <div>
                    <div class="cm-label">1d %</div>
                    <div class={`cm-val ${r.d1 > 0 ? 'td-pos' : r.d1 < 0 ? 'td-neg' : ''}`}>{r.d1 == null ? '-' : fmtPct(r.d1)}</div>
                  </div>
                </div>
              )) : <div class="info-empty">No chain rows</div>}
            </div>
          </div>
        </div>
      </div>

      {whaleRows.length > 0 ? (
        <div class="card mb-4">
          <div class="card-header"><div class="card-title">{symbol} Anomalies</div></div>
          <div class="card-body p0">
            <div class="whale-cards-mobile">
              {whaleRows.map((row, idx) => (
                <div class="whale-mobile-card" key={`cw-${idx}`}>
                  <div class="wm-main">{row.chain}</div>
                  <div><div class="wm-label">Supply Delta</div><div class="wm-val">{fmtB(row.delta)}</div></div>
                  <div><div class="wm-label">Z-score</div><div class="wm-val" title={`Raw z: ${row.z.toFixed(1)}σ`}>{row.displayZ >= 10 ? '>10σ' : `${row.displayZ.toFixed(1)}σ`}</div></div>
                  <div><div class="wm-label">Share of tracked</div><div class="wm-val">{fmtPct(row.shareOfTracked)}</div></div>
                </div>
              ))}
            </div>
            <div class="whale-table-desktop">
              <table class="data-table whale-watch-table" style="min-width:320px">
                <thead><tr><th>Chain</th><th>Supply Delta</th><th>Z-score</th><th>Share of tracked</th></tr></thead>
                <tbody>
                  {whaleRows.map((row, idx) => (
                    <tr key={`tw-${idx}`}>
                      <td class="td-name">{row.chain}</td>
                      <td class="mono">{fmtB(row.delta)}</td>
                      <td class="mono" title={`Raw z: ${row.z.toFixed(1)}σ`}>{row.displayZ >= 10 ? '>10σ' : `${row.displayZ.toFixed(1)}σ`}</td>
                      <td class="mono">{fmtPct(row.shareOfTracked)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
