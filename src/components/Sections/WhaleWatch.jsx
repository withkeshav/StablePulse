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
              <h3 style="font-size:var(--md);font-weight:600;margin-bottom:4px">Cross-chain supply anomalies</h3>
              <p class="text-muted small mb-0">Highlighted chains where recent mint/burn drift cleared volatility thresholds.</p>
            </div>
          </div>
          <div class="whale-cards-mobile">
            {rows.map((row, idx) => (
              <div class="whale-mobile-card" key={`mob-${row.coin}-${row.chain}-${idx}`}>
                <div class="wm-main">{row.coin} &middot; {row.chain}</div>
                <div>
                  <div class="wm-label">Supply Delta</div>
                  <div class="wm-val">{fmtB(row.delta)}</div>
                </div>
                <div>
                  <div class="wm-label">Z-score</div>
                  <div class="wm-val">{row.z.toFixed(1)}σ</div>
                </div>
              </div>
            ))}
          </div>
          <div class="whale-table-desktop tbl-wrap">
            <table class="data-table whale-watch-table">
              <thead>
                <tr>
                  <th>Coin</th>
                  <th>Chain</th>
                  <th class="num">Supply Delta</th>
                  <th class="num">Z-score</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={`${row.coin}-${row.chain}-${idx}`}>
                    <td class="td-name">{row.coin}</td>
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
    </section>
  );
}
