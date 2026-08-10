import { fmtB, fmtPct, pctChange } from '../../utils/formatters.js';
import ChartWrapper from '../ui/ChartWrapper.jsx';

export default function ChainsTab({ data }) {
  const assets = data?.allStables?.peggedAssets || [];
  const usdt = assets.find((x) => x.symbol === 'USDT');
  const usdc = assets.find((x) => x.symbol === 'USDC');
  const tronCur = usdt?.chainCirculating?.Tron?.current?.peggedUSD || 0;
  const tronPd = usdt?.chainCirculating?.Tron?.circulatingPrevDay?.peggedUSD || tronCur;
  const ethCur = usdt?.chainCirculating?.Ethereum?.current?.peggedUSD || 0;
  const ethPd = usdt?.chainCirculating?.Ethereum?.circulatingPrevDay?.peggedUSD || ethCur;

  const chartData = {
    labels: ['Tron', 'Ethereum'],
    datasets: [{ label: 'USDT Supply', data: [tronCur, ethCur], backgroundColor: ['#26A17BAA', '#2775CAAA'] }],
  };

  const chainRows = (data?.chainData || []).slice(0, 20);
  const migrations = [];
  [usdt, usdc].forEach((asset) => {
    if (!asset?.chainCirculating) return;
    const deltas = Object.entries(asset.chainCirculating).map(([chain, info]) => {
      const cur = info.current?.peggedUSD || 0;
      const pd = info.circulatingPrevDay?.peggedUSD || cur;
      return { chain, delta: cur - pd };
    }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    if (deltas.length >= 2) migrations.push({ coin: asset.symbol, from: deltas.find((d) => d.delta < 0), to: deltas.find((d) => d.delta > 0) });
  });

  return (
    <div class="tab-content active">
      <div class="card mb-4">
        <div class="card-header"><div class="card-title">Tron vs Ethereum - USDT Dominance</div></div>
        <div class="card-body">
          <div class="tron-eth-grid">
            <div class="compare-stat"><div class="cs-label">Tron Supply</div><div class="cs-val">{fmtB(tronCur)}</div><div class="cs-coin">{fmtPct(pctChange(tronCur, tronPd))} 24h</div></div>
            <div class="compare-stat"><div class="cs-label">Ethereum Supply</div><div class="cs-val">{fmtB(ethCur)}</div><div class="cs-coin">{fmtPct(pctChange(ethCur, ethPd))} 24h</div></div>
          </div>
          <div class="chart-card-body">
            <ChartWrapper type="bar" data={chartData} height={200} aspectRatio={16 / 10} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>

      <div class="card mb-4">
        <div class="card-header"><div class="card-title">Migration Detector</div></div>
        <div class="card-body">
          <div class="mig-grid">
            {migrations.length ? migrations.map((m) => (
              <div class="migration-card" key={m.coin}>
                <div class="chain-from">↓ {m.from?.chain || '—'}<br /><span>{fmtB(Math.abs(m.from?.delta || 0))}</span></div>
                <div class="arrow-mid"></div>
                <div class="mig-amount">{m.coin}</div>
                <div class="arrow-mid" style="transform:scaleX(-1)"></div>
                <div class="chain-to">↑ {m.to?.chain || '—'}<br /><span>{fmtB(m.to?.delta || 0)}</span></div>
              </div>
            )) : <div class="info-empty">No significant cross-chain migrations detected.</div>}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">Chain Rankings</div></div>
        <div class="card-body p0">
          <div class="chain-table-desktop tbl-wrap">
            <table class="data-table">
              <thead><tr><th>#</th><th>Chain</th><th>Total TVL</th></tr></thead>
              <tbody>
                {chainRows.length ? chainRows.map((c, i) => (
                  <tr key={c.name || i}>
                    <td class="mono">{i + 1}</td>
                    <td class="td-name">{c.name}</td>
                    <td class="mono">{fmtB(c.totalCirculatingUSD?.peggedUSD || 0)}</td>
                  </tr>
                )) : <tr><td colspan="3" class="info-empty">No chain data</td></tr>}
              </tbody>
            </table>
          </div>
          <div class="chain-cards-mobile">
            {chainRows.length ? chainRows.map((c, i) => (
              <div class="chain-mobile-card" key={c.name || i}>
                <div class="cm-main">{c.name}</div>
                <div>
                  <div class="cm-label">Rank</div>
                  <div class="cm-val">{i + 1}</div>
                </div>
                <div>
                  <div class="cm-label">Total TVL</div>
                  <div class="cm-val">{fmtB(c.totalCirculatingUSD?.peggedUSD || 0)}</div>
                </div>
              </div>
            )) : <div class="info-empty">No chain data</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
