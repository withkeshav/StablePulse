import { useMemo, useState } from 'preact/hooks';
import { fmtB, fmtPct, fmtPrice, pctChange, bps } from '../../utils/formatters.js';
import { STABLECOIN_REGISTRY, getActiveCoins } from '../../utils/coin-config.js';
import { buildShareSeries, buildSupplySeries, buildWhaleWatchRows, dedupeTickers, pegChartOptions, pegRefLine, toPercentFromFirst } from '../../lib/derive.js';
import ChartWrapper from '../ui/ChartWrapper.jsx';

export default function CoinTab({ coin, data }) {
  const symbol = (coin || '').toUpperCase();
  const cfg = STABLECOIN_REGISTRY[symbol];
  const cgKey = cfg?.coingeckoId;
  const detail = data?.[`${symbol.toLowerCase()}Detail`];
  const chartData = data?.[`cg${symbol}Chart`];
  const cgTickers = data?.[`cg${symbol}`];
  const asset = data?.allStables?.peggedAssets?.find((x) => x.symbol.toLowerCase() === symbol.toLowerCase());
  const price = data?.cgSimple?.[cgKey]?.usd || 1;
  const chg = data?.cgSimple?.[cgKey]?.usd_24h_change || 0;
  const supply = asset?.circulating?.peggedUSD || 0;
  const prev = asset?.circulatingPrevDay?.peggedUSD || supply;
  const color = cfg?.color || '#3b82f6';

  const rows = useMemo(
    () =>
      Object.entries(detail?.chainBalances || {})
        .map(([chain, chainData]) => {
          const tokens = chainData?.tokens || [];
          const cur = tokens[tokens.length - 1]?.circulating?.peggedUSD || 0;
          const pd = tokens[tokens.length - 2]?.circulating?.peggedUSD || cur;
          return { chain, cur, pd, d1: pctChange(cur, pd) };
        })
        .filter((r) => r.cur > 0)  // filter out negligible / $0 chains
        .sort((a, b) => b.cur - a.cur)
        .slice(0, 10),
    [detail]
  );

  const supplySeries = useMemo(() => buildSupplySeries(detail), [detail]);
  const [supplyLog, setSupplyLog] = useState(false);
  const [supplyPct, setSupplyPct] = useState(false);

  const priceLineData = useMemo(() => {
    const series = (chartData?.prices || []).slice(-90);
    const labels = series.map((p) => new Date(p[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    const refColor = typeof document !== 'undefined'
      ? getComputedStyle(document.documentElement).getPropertyValue('--text2').trim() || '#9CA3AF'
      : '#9CA3AF';
    return {
      labels,
      datasets: [
        { label: `${symbol} Price`, data: series.map((p) => p[1]), borderColor: color, tension: 0.2 },
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
      const rows = dedupeTickers(cgTickers?.tickers || [], 8);
      return {
        labels: rows.map((r) => r.name),
        datasets: [{ label: '24h Volume', data: rows.map((r) => r.volume), backgroundColor: color + 'AA' }],
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

  // Dominance: this coin's share of tracked stablecoin supply over time.
  // Uses the ready-but-previously-uncharted buildShareSeries helper.
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

  // Peg deviation in basis points: (price - 1) * 10000. Fixed y bounds -50/+50
  // per Workstream C §5.2 prevent the auto-band exaggeration the price chart
  // still suffers from. A 0 bps line anchors "no deviation."
  const bpsData = useMemo(() => {
    const series = (chartData?.prices || []).slice(-90);
    if (!series.length) return null;
    const labels = series.map((p) => new Date(p[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    const refColor = typeof document !== 'undefined'
      ? getComputedStyle(document.documentElement).getPropertyValue('--text2').trim() || '#9CA3AF'
      : '#9CA3AF';
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

  return (
    <div class="tab-content active">
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-label">Price</div><div class="stat-value">{fmtPrice(price)}</div></div>
        <div class="stat-card"><div class="stat-label">Market Change</div><div class="stat-value">{fmtPct(chg)}</div></div>
        <div class="stat-card"><div class="stat-label">Supply</div><div class="stat-value">{fmtB(supply)}</div></div>
        <div class="stat-card"><div class="stat-label">24h Supply Delta</div><div class="stat-value">{fmtB(supply - prev)}</div></div>
      </div>

      <div class="grid-2 mb-4">
        <div class="card">
          <div class="card-header">
            <div class="card-title-row">
              <div class="card-title">{symbol} Supply History</div>
              <div class="chart-toggles">
                <button type="button" class={`chart-toggle${supplyPct ? ' active' : ''}`} onClick={() => setSupplyPct((v) => !v)} aria-pressed={supplyPct} title="Show percent change from first point">% from start</button>
                <button type="button" class={`chart-toggle${supplyLog ? ' active' : ''}`} onClick={() => setSupplyLog((v) => !v)} aria-pressed={supplyLog} title="Toggle logarithmic scale">Log</button>
              </div>
            </div>
          </div>
          <div class="card-body chart-card-body">
            <ChartWrapper type="line" data={supplyLineData} options={supplyLineOptions} height={220} aspectRatio={16 / 10} />
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">{symbol} Price</div></div>
          <div class="card-body chart-card-body">
            <ChartWrapper type="line" data={priceLineData} height={220} aspectRatio={16 / 10} options={priceChartOpts} />
          </div>
        </div>
      </div>

      {dominanceData ? (
        <div class="card mb-4">
          <div class="card-header"><div class="card-title">{symbol} Dominance</div></div>
          <div class="card-body chart-card-body">
            <ChartWrapper type="line" data={dominanceData} options={dominanceOpts} height={200} aspectRatio={16 / 10} />
            <p class="text-muted small" style="margin-top:6px">{symbol}'s share of the combined tracked stablecoin supply (USDT, USDC, DAI, USDE, PYUSD) over time.</p>
          </div>
        </div>
      ) : null}

      {bpsData ? (
        <div class="card mb-4">
          <div class="card-header"><div class="card-title">{symbol} Peg Deviation (bps)</div></div>
          <div class="card-body chart-card-body">
            <ChartWrapper type="line" data={bpsData} options={bpsOpts} height={200} aspectRatio={16 / 10} />
            <p class="text-muted small" style="margin-top:6px">Distance from the $1 peg in basis points. Fixed -50/+50 bounds so daily noise does not look like a depeg. 0 bps = exactly on peg.</p>
          </div>
        </div>
      ) : null}

      <div class="grid-2 mb-4">
        <div class="card">
          <div class="card-header"><div class="card-title">{symbol} Exchange Volume</div></div>
          <div class="card-body chart-card-body">
            <ChartWrapper type="bar" data={exchBars} height={180} aspectRatio={16 / 10} options={chartOptions} />
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
