import { useMemo } from 'preact/hooks';
import { fmtB, fmtPct, fmtPrice, pctChange } from '../../utils/formatters.js';
import { STABLECOIN_REGISTRY } from '../../utils/coin-config.js';
import { buildSupplySeries, buildWhaleWatchRows } from '../../lib/derive.js';
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

  const priceLineData = useMemo(() => {
    const series = (chartData?.prices || []).slice(-90);
    return {
      labels: series.map((p) => new Date(p[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [{ label: `${symbol} Price`, data: series.map((p) => p[1]), borderColor: color, tension: 0.2 }],
    };
  }, [chartData, symbol, color]);

  const supplyLineData = useMemo(
    () => ({
      labels: supplySeries.map((p) => new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [{ label: `${symbol} Supply`, data: supplySeries.map((p) => p.value), borderColor: color, tension: 0.2 }],
    }),
    [supplySeries, symbol, color]
  );

  const exchBars = useMemo(
    () => ({
      labels: (cgTickers?.tickers || []).slice(0, 8).map((t) => t.market?.name || 'Unknown'),
      datasets: [{ label: '24h Volume', data: (cgTickers?.tickers || []).slice(0, 8).map((t) => t.converted_volume?.usd || 0), backgroundColor: color + 'AA' }],
    }),
    [cgTickers, color]
  );

  const whaleRows = useMemo(() => {
    const allRows = buildWhaleWatchRows({ [symbol]: detail });
    return allRows.filter((r) => r.coin === symbol).slice(0, 5);
  }, [symbol, detail]);

  const chartOptions = useMemo(() => ({ responsive: true, maintainAspectRatio: false }), []);

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
          <div class="card-header"><div class="card-title">{symbol} Supply History</div></div>
          <div class="card-body chart-card-body">
            <ChartWrapper type="line" data={supplyLineData} height={220} aspectRatio={16 / 10} options={chartOptions} />
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">{symbol} Price</div></div>
          <div class="card-body chart-card-body">
            <ChartWrapper type="line" data={priceLineData} height={220} aspectRatio={16 / 10} options={chartOptions} />
          </div>
        </div>
      </div>

      <div class="card mb-4">
        <div class="card-header"><div class="card-title">{symbol} by Chain</div></div>
        <div class="card-body p0">
          <div class="chain-table-desktop tbl-wrap">
            <table class="data-table">
              <thead><tr><th>Chain</th><th>Supply</th><th>Prev Day</th><th>1d %</th></tr></thead>
              <tbody>
                {rows.length ? rows.map((r) => (
                  <tr key={r.chain}>
                    <td class="td-name">{r.chain}</td>
                    <td class="mono">{fmtB(r.cur)}</td>
                    <td class="mono">{fmtB(r.pd)}</td>
                    <td class={`mono ${r.d1 > 0 ? 'td-pos' : r.d1 < 0 ? 'td-neg' : ''}`}>{r.d1 == null ? '-' : fmtPct(r.d1)}</td>
                  </tr>
                )) : <tr><td colspan="4" class="info-empty">No chain rows</td></tr>}
              </tbody>
            </table>
          </div>
          <div class="chain-cards-mobile">
            {rows.length ? rows.map((r) => (
              <div class="chain-mobile-card" key={r.chain}>
                <div class="cm-main">{r.chain}</div>
                <div>
                  <div class="cm-label">Supply</div>
                  <div class="cm-val">{fmtB(r.cur)}</div>
                </div>
                <div>
                  <div class="cm-label">Prev day</div>
                  <div class="cm-val">{fmtB(r.pd)}</div>
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

      {whaleRows.length > 0 ? (
        <div class="card mb-4">
          <div class="card-header"><div class="card-title">{symbol} Anomalies</div></div>
          <div class="card-body p0">
            <div class="whale-cards-mobile">
              {whaleRows.map((row, idx) => (
                <div class="whale-mobile-card" key={`cw-${idx}`}>
                  <div class="wm-main">{row.chain}</div>
                  <div><div class="wm-label">Supply Delta</div><div class="wm-val">{fmtB(row.delta)}</div></div>
                  <div><div class="wm-label">Z-score</div><div class="wm-val">{row.z.toFixed(1)}σ</div></div>
                </div>
              ))}
            </div>
            <div class="whale-table-desktop">
              <table class="data-table whale-watch-table" style="min-width:320px">
                <thead><tr><th>Chain</th><th>Supply Delta</th><th>Z-score</th></tr></thead>
                <tbody>
                  {whaleRows.map((row, idx) => (
                    <tr key={`tw-${idx}`}>
                      <td class="td-name">{row.chain}</td>
                      <td class="mono">{fmtB(row.delta)}</td>
                      <td class="mono">{row.z.toFixed(1)}σ</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      <div class="card">
        <div class="card-header"><div class="card-title">{symbol} Exchange Volume</div></div>
        <div class="card-body chart-card-body">
          <ChartWrapper type="bar" data={exchBars} height={220} aspectRatio={16 / 10} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}
