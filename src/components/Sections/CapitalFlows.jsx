import { fmtB } from '../../utils/formatters.js';
import { getActiveCoins } from '../../utils/coin-config.js';

export default function CapitalFlows({ migrationPairs, chainFlows }) {
  const coins = getActiveCoins();
  const maxAbs = Math.max(1, Math.abs(chainFlows[0]?.totalDelta || 1));

  return (
    <section class="grid-2 mb-4">
      <div class="card">
        <div class="card-header"><div class="card-title">Cross-Chain Migration Map</div></div>
        <div class="card-body">
          <div class="mig-grid">
            {migrationPairs.length ? migrationPairs.map((m, i) => (
              <div class="migration-card" key={`${m.from}-${m.to}-${i}`}>
                <div class="chain-from">{m.from}</div>
                <div class="arrow-mid"></div>
                <div class="chain-to">{m.to}</div>
                <div class="mig-amount">{fmtB(m.amount)}</div>
              </div>
            )) : <div class="info-empty">No migration pattern in current cycle.</div>}
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title-row">
            <div class="card-title">Mint / Burn Activity</div>
            <div class="mint-burn-legend">
              {coins.map((c) => (
                <span class="mint-burn-key" key={c.symbol}>
                  <span class="mint-burn-swatch" style={{ background: c.color }}></span>{c.symbol}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div class="card-body p0">
          {(chainFlows || []).slice(0, 8).map((f) => (
            <div class="chain-bar-row" key={f.chain}>
              <div class="chain-bar-label">{f.chain}</div>
              <div class="chain-bar-track">
                {coins.map((c) => (
                  <div
                    key={c.symbol}
                    class={`chain-bar-${c.symbol.toLowerCase()}`}
                    style={{
                      width: `${Math.min(100, Math.max(0, (Math.abs(f.deltas?.[c.symbol] || 0) / maxAbs) * 100))}%`,
                      background: c.color,
                    }}
                    title={`${c.symbol}: ${fmtB(f.deltas?.[c.symbol] || 0)}`}
                  ></div>
                ))}
              </div>
              <div class="chain-bar-total">{f.totalDelta >= 0 ? 'Mint' : 'Burn'} {fmtB(Math.abs(f.totalDelta))}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
