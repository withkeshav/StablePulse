import { fmtB, fmtPct } from '../../utils/formatters.js';

export default function WhaleWatch({ rows }) {
  if (!rows?.length) return null;

  const zLabel = (row) => (row.displayZ >= 10 ? '>10σ' : `${row.displayZ.toFixed(1)}σ`);

  return (
    <section class="whale-watch mb-4">
      <div class="card">
        <div class="card-body">
          <div class="whale-watch-head">
            <div>
              <div class="signal-kicker">Whale Watch</div>
              <h3 style="font-size:var(--md);font-weight:600;margin-bottom:4px">Cross-chain supply anomalies</h3>
              <p class="text-muted small mb-0">Highlighted chains where recent mint/burn drift cleared volatility thresholds. Z-scores above 10 are capped in display; hover the value for the raw figure.</p>
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
                  <div class="wm-val" title={`Raw z: ${row.z.toFixed(1)}σ`}>{zLabel(row)}</div>
                </div>
                <div>
                  <div class="wm-label">Share of tracked</div>
                  <div class="wm-val">{fmtPct(row.shareOfTracked)}</div>
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
                  <th class="num">Share of tracked</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={`${row.coin}-${row.chain}-${idx}`}>
                    <td class="td-name">{row.coin}</td>
                    <td class="td-name">{row.chain}</td>
                    <td class="mono">{fmtB(row.delta)}</td>
                    <td class="mono" title={`Raw z: ${row.z.toFixed(1)}σ`}>{zLabel(row)}</td>
                    <td class="mono">{fmtPct(row.shareOfTracked)}</td>
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
