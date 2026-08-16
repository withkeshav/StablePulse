import { useMemo, useState } from 'preact/hooks';
import { fmtB, fmtPct } from '../../utils/formatters.js';
import { getActiveCoins } from '../../utils/coin-config.js';

export default function ChainsTab({ data }) {
  const assets = data?.allStables?.peggedAssets || [];
  const activeCoins = getActiveCoins();

  const coinCards = useMemo(() => {
    return activeCoins.map((cfg) => {
      const asset = assets.find((x) => x.symbol.toLowerCase() === cfg.symbol.toLowerCase());
      const bt = (asset?.chainCirculating && Object.entries(asset.chainCirculating)) || [];
      const ranked = bt
        .map(([chain, info]) => ({
          chain,
          cur: info?.current?.peggedUSD || 0,
          pd: info?.circulatingPrevDay?.peggedUSD || info?.current?.peggedUSD || 0,
        }))
        .filter((r) => r.cur > 0)
        .sort((a, b) => b.cur - a.cur);
      const total = ranked.reduce((s, r) => s + r.cur, 0) || 1;
      const top5 = ranked.slice(0, 5).map((r) => ({
        ...r,
        share: r.cur / total,
      }));
      return {
        symbol: cfg.symbol,
        color: cfg.color,
        top5,
        topShare: top5[0]?.share || 0,
        topChain: top5[0]?.chain || '-',
        total,
      };
    }).filter((c) => c.top5.length);
  }, [activeCoins, assets]);

  const takeaway = useMemo(() => {
    const usdt = coinCards.find((c) => c.symbol === 'USDT');
    const usdc = coinCards.find((c) => c.symbol === 'USDC');
    if (usdt?.topChain && usdc?.topChain) {
      return `USDT is concentrated on ${usdt.topChain}; USDC is concentrated on ${usdc.topChain}.`;
    }
    if (coinCards[0]) {
      return `${coinCards[0].symbol} is most concentrated on ${coinCards[0].topChain}.`;
    }
    return 'Chain concentration shows where each tracked stablecoin\'s circulating supply sits today.';
  }, [coinCards]);

  const sortedChains = useMemo(
    () => (data?.chainData || data?.allStables?.chains || [])
      .filter((c) => (c.totalCirculatingUSD?.peggedUSD || 0) > 0)
      .sort((a, b) => (b.totalCirculatingUSD?.peggedUSD || 0) - (a.totalCirculatingUSD?.peggedUSD || 0))
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
        const from = deltas.find((d) => d.delta < 0);
        const to = deltas.find((d) => d.delta > 0);
        if (from && to) {
          out.push({
            coin: asset.symbol,
            from,
            to,
            magnitude: Math.min(Math.abs(from.delta), Math.abs(to.delta)),
          });
        }
      }
    });
    return out.sort((a, b) => b.magnitude - a.magnitude);
  }, [assets]);

  return (
    <div class="tab-content active">
      <div class="card mb-4">
        <div class="card-header"><div class="card-title">Top chain concentration per coin</div></div>
        <div class="card-body">
          <p class="chain-takeaway">{takeaway}</p>
          <div class="chain-coin-cards">
            {coinCards.map((card) => (
              <article class="chain-coin-card" key={card.symbol}>
                <h3>
                  <i style={{ background: card.color }} aria-hidden="true" />
                  {card.symbol}
                  <span class="text-muted small" style="margin-left:auto;font-weight:600">
                    Top: {card.topChain} · {fmtPct(card.topShare * 100)}
                  </span>
                </h3>
                {card.top5.map((row) => (
                  <div class="chain-top-row" key={`${card.symbol}-${row.chain}`}>
                    <div>
                      <strong>{row.chain}</strong>
                      <div class="chain-bar" aria-hidden="true">
                        <i style={{ width: `${Math.max(4, row.share * 100)}%`, background: card.color }} />
                      </div>
                    </div>
                    <span class="mono">{fmtPct(row.share * 100)}</span>
                    <span class="mono">{fmtB(row.cur)}</span>
                  </div>
                ))}
              </article>
            ))}
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
                <div class="mig-amount">
                  {m.coin}
                  <div class="text-muted small" style="margin-top:4px">Largest outflow → largest inflow hint</div>
                </div>
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
                }) : (
                  <tr><td colspan="3" class="info-empty">No chains match this filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div class="chain-mobile-list">
            {chainRows.length ? chainRows.map((c) => {
              const rank = sortedChains.findIndex((s) => s === c) + 1;
              return (
                <div class="chain-mobile-card" key={c.name || rank}>
                  <div class="cm-rank mono">#{rank}</div>
                  <div class="cm-name">{c.name}</div>
                  <div class="cm-val mono">{fmtB(c.totalCirculatingUSD?.peggedUSD || 0)}</div>
                  <div class="cm-label">Stablecoin circulating</div>
                </div>
              );
            }) : <div class="info-empty">No chains match this filter.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
