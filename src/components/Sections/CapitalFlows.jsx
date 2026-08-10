import { fmtB } from '../../utils/formatters.js';

export default function CapitalFlows({ migrationPairs, chainFlows }) {
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
        <div class="card-header"><div class="card-title">Mint / Burn Activity</div></div>
        <div class="card-body p0">
          {(chainFlows || []).slice(0, 8).map((f) => (
            <div class="chain-bar-row" key={f.chain}>
              <div class="chain-bar-label">{f.chain}</div>
              <div class="chain-bar-track">
                <div class="chain-bar-usdt" style={`width:${Math.min(100, Math.max(0, (Math.abs(f.usdtDelta) / (Math.abs(chainFlows[0]?.totalDelta) || 1)) * 100))}%`}></div>
                <div class="chain-bar-usdc" style={`width:${Math.min(100, Math.max(0, (Math.abs(f.usdcDelta) / (Math.abs(chainFlows[0]?.totalDelta) || 1)) * 100))}%`}></div>
              </div>
              <div class="chain-bar-total">{f.totalDelta >= 0 ? 'Mint' : 'Burn'} {fmtB(Math.abs(f.totalDelta))}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
