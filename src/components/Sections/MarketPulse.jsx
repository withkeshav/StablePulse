import ChartWrapper from '../ui/ChartWrapper.jsx';

export default function MarketPulse({ supplyChartData, supplyChartOptions = {}, pegChartData, pegChartOptions = {}, onToggleLog, onTogglePct, supplyLog, supplyPct }) {
  return (
    <section class="grid-2 mb-4">
      <div class="card home-section-flat">
        <div class="card-header">
          <div class="card-title-row">
            <div class="card-title">Supply Trend</div>
            <div class="chart-toggles">
              <button type="button" class={`chart-toggle${supplyPct ? ' active' : ''}`} onClick={onTogglePct} aria-pressed={supplyPct} title="Show percent change from first point">% from start</button>
              <button type="button" class={`chart-toggle${supplyLog ? ' active' : ''}`} onClick={onToggleLog} aria-pressed={supplyLog} title="Toggle logarithmic scale so small coins are visible">Log</button>
            </div>
          </div>
        </div>
        <div class="card-body chart-card-body"><ChartWrapper type="line" data={supplyChartData} options={supplyChartOptions} height={240} aspectRatio={16 / 10} /></div>
      </div>
      <div class="card home-section-flat">
        <div class="card-header"><div class="card-title">Peg Monitor</div></div>
        <div class="card-body chart-card-body"><ChartWrapper type="line" data={pegChartData} options={pegChartOptions} height={240} aspectRatio={16 / 10} /></div>
      </div>
    </section>
  );
}
