import { useMemo, useState } from 'preact/hooks';
import { fmtB, fmtPct, pctChange } from '../../utils/formatters.js';
import { getActiveCoins } from '../../utils/coin-config.js';
import ChartWrapper from '../ui/ChartWrapper.jsx';

export default function ChainsTab({ data }) {
  const assets = data?.allStables?.peggedAssets || [];
  const activeCoins = getActiveCoins();

  // For each active coin, find its largest chain by circulating supply and
  // its second-largest chain to surface the biggest supply concentration.
  const coinPairs = useMemo(() => {
    return activeCoins.map((cfg) => {
      const asset = assets.find((x) => x.symbol.toLowerCase() === cfg.symbol.toLowerCase());
      const bt = (asset?.chainCirculating && Object.entries(asset.chainCirculating)) || [];
      const ranked = bt
        .map(([chain, info]) => ({
          chain,
          cur: info?.current?.peggedUSD || 0,
          pd: info?.circulatingPrevDay?.peggedUSD || info?.current?.peggedUSD || 0,
        }))
        .sort((a, b) => b.cur - a.cur);
      const [top = {}, second = {}] = ranked;
      return {
        symbol: cfg.symbol,
        color: cfg.color,
        top,
        second,
        hasTwo: ranked.length >= 2,
      };
    });
  }, [activeCoins, assets]);

  const chartData = useMemo(() => {
    const labels = [];
    const datasets = [];
    activeCoins.forEach((cfg) => {
      const pair = coinPairs.find((p) => p.symbol === cfg.symbol);
      if (!pair || !pair.top.cur) return;
      labels.push(`${cfg.symbol} ${pair.top.chain}`, `${cfg.symbol} ${pair.second?.chain || 'next'}`);
      datasets.push({ label: cfg.symbol, data: [pair.top.cur, pair.second?.cur || 0], backgroundColor: [cfg.color + 'AA', cfg.color + '66'] });
    });
    return { labels, datasets };
  }, [activeCoins, coinPairs]);

  const sortedChains = useMemo(
    () => (data?.chainData || data?.allStables?.chains || [])
      .filter((c) => (c.totalCirculatingUSD?.peggedUSD || 0) > 0)  // filter out $0 chains
      .sort((a, b) => (b.totalCirculatingUSD?.peggedUSD || 0) - (a.totalCirculatingUSD?.peggedUSD || 0))  // descending by stablecoin circulating (not vendor order)
      .slice(0, 20),
    [data]
  );

  const [chainQuery, setChainQuery] = useState('');
  const chainRows = useMemo(() => {
    const q = chainQuery.trim().toLowerCase();
    if (!q) return sortedChains;
    return sortedChains.filter((c) => (c.name || '').toLowerCase().includes(q));
  }, [sortedChains, chainQuery]);
  const migrations = useMemo(() => {
    const out = [];
    assets.forEach((asset) => {
      if (!asset?.chainCirculating) return;
      const deltas = Object.entries(asset.chainCirculating).map(([chain, info]) => {
        const cur = info?.current?.peggedUSD || 0;
        const pd = info?.circulatingPrevDay?.peggedUSD || cur;
        return { chain, delta: cur - pd };
      }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
      if (deltas.length >= 2) {
        out.push({
          coin: asset.symbol,
          from: deltas.find((d) => d.delta < 0),
          to: deltas.find((d) => d.delta > 0),
        });
      }
    });
    return out;
  }, [assets]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: { x: { ticks: { maxRotation: 45, autoSkip: true, font: { size: 10 } } } },
  }), []);

  return (
    <div class="tab-content active">
      <div class="card mb-4">
        <div class="card-header"><div class="card-title">Top Chain Concentration per Coin</div></div>
        <div class="card-body">
          <div class="coin-pair-grid">
            {coinPairs.filter((p) => p.top.cur).map((p) => (
              <div class="compare-stat" key={p.symbol}>
                <div class="cs-label">{p.symbol} · {p.top.chain}</div>
                <div class="cs-val">{fmtB(p.top.cur)}</div>
                <div class="cs-coin">{fmtPct(pctChange(p.top.cur, p.top.pd))} 24h</div>
              </div>
            ))}
          </div>
          <div class="chart-card-body">
            <ChartWrapper type="bar" data={chartData} height={200} aspectRatio={16 / 10} options={chartOptions} />
          </div>
        </div>
      </div>

      <div class="card mb-4">
        <div class="card-header"><div class="card-title">Migration Detector (approximate)</div></div>
        <div class="card-body">
          <div class="mig-grid">
            {migrations.length ? migrations.map((m) => (
              <div class="migration-card" key={m.coin}>
                <div class="chain-from">↓ {m.from?.chain || '-'}<br /><span>{fmtB(Math.abs(m.from?.delta || 0))}</span></div>
                <div class="arrow-mid"></div>
                <div class="mig-amount">{m.coin}</div>
                <div class="arrow-mid" style="transform:scaleX(-1)"></div>
                <div class="chain-to">↑ {m.to?.chain || '-'}<br /><span>{fmtB(Math.abs(m.to?.delta || 0))}</span></div>
              </div>
            )) : <div class="info-empty">No significant cross-chain migrations detected.</div>}
          </div>
          <p class="text-muted small" style="margin-top:8px">Approximate: DefiLlama exposes per-chain supply deltas, not directed hops. Largest outflow is paired with largest inflow as a ranked hint, not a path.</p>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title-row">
            <div class="card-title">Chain Rankings</div>
            <input
              type="search"
              class="chain-search"
              placeholder="Filter chains..."
              value={chainQuery}
              onInput={(e) => setChainQuery(e.target.value)}
              aria-label="Filter chains by name"
            />
          </div>
        </div>
        <div class="card-body p0">
          <div class="chain-table-desktop tbl-wrap">
            <table class="data-table">
              <thead><tr><th>#</th><th>Chain</th><th>Stablecoin Circulating</th></tr></thead>
              <tbody>
                {chainRows.length ? chainRows.map((c) => {
                  const rank = sortedChains.findIndex((s) => s === c) + 1;
                  return (
                    <tr key={c.name || rank}>
                      <td class="mono">{rank}</td>
                      <td class="td-name">{c.name}</td>
                      <td class="mono">{fmtB(c.totalCirculatingUSD?.peggedUSD || 0)}</td>
                    </tr>
                  );
                }) : <tr><td colspan="3" class="info-empty">No chain matches "{chainQuery}"</td></tr>}
              </tbody>
            </table>
          </div>
          <div class="chain-cards-mobile">
            {chainRows.length ? chainRows.map((c) => {
              const rank = sortedChains.findIndex((s) => s === c) + 1;
              return (
                <div class="chain-mobile-card" key={c.name || rank}>
                  <div class="cm-main">{c.name}</div>
                  <div>
                    <div class="cm-label">Rank</div>
                    <div class="cm-val">{rank}</div>
                  </div>
                  <div>
                    <div class="cm-label">Stablecoin Circulating</div>
                    <div class="cm-val">{fmtB(c.totalCirculatingUSD?.peggedUSD || 0)}</div>
                  </div>
                </div>
              );
            }) : <div class="info-empty">No chain matches "{chainQuery}"</div>}
          </div>
        </div>
      </div>
    </div>
  );
}