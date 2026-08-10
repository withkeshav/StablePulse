import { fmtB } from '../../utils/formatters.js';

export default function WhaleWatch({ rows }) {
  if (!rows?.length) return null;

  return (
    <section class="whale-watch mb-4">
      <div class="card">
        <div class="card-body">
          <div class="whale-watch-head">
            <div>
              <div class="signal-kicker">Whale Watch</div>
              <h3 class="h6 mb-1">Cross-chain supply anomalies</h3>
              <p class="text-muted small mb-0">Highlighted chains where recent mint/burn drift cleared volatility thresholds.</p>
            </div>
          </div>
          <div class="table-responsive">
            <table class="table table-sm mb-0 whale-watch-table">
              <thead>
                <tr>
                  <th>Coin</th>
                  <th>Chain</th>
                  <th class="text-end">Δ Supply</th>
                  <th class="text-end">Z-score</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={`${row.coin}-${row.chain}-${idx}`}>
                    <td class="fw-semibold">{row.coin}</td>
                    <td>{row.chain}</td>
                    <td class="text-end">{fmtB(row.delta)}</td>
                    <td class="text-end">{row.z.toFixed(1)}σ</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
