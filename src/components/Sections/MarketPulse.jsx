import ChartWrapper from '../ui/ChartWrapper.jsx';

export default function MarketPulse({
  supplyChartData,
  supplyChartOptions = {},
  pegChartData,
  pegChartOptions = {},
  onToggleLog,
  onTogglePct,
  supplyLog,
  supplyPct,
  onLearn,
}) {
  return (
    <section class="content-grid main-insights mb-4">
      <article class="panel glass supply-panel signal-lens">
        <header class="panel-head">
          <div>
            <p class="panel-kicker">MARKET DEPTH</p>
            <h2>Stablecoin supply</h2>
            <p class="panel-sub">Circulating value of tracked coins on this dashboard</p>
          </div>
          <div class="segmented chart-toggles" role="group" aria-label="Supply chart scale">
            <button type="button" class={supplyPct ? 'selected' : ''} onClick={onTogglePct} aria-pressed={supplyPct} title="Show percent change from first point">%</button>
            <button type="button" class={supplyLog ? 'selected' : ''} onClick={onToggleLog} aria-pressed={supplyLog} title="Toggle logarithmic scale so small coins are visible">Log</button>
          </div>
        </header>
        <div class="panel-chart">
          <ChartWrapper
            type="line"
            data={supplyChartData}
            options={supplyChartOptions}
            height={260}
            aspectRatio={16 / 10}
            ariaLabel="Supply trend for tracked stablecoins"
            shareTitle="Stablecoin supply"
            shareRange="Tracked coins"
            shareInterpretation="Circulating supply of the stablecoins tracked on this dashboard. Smaller coins stay comparable when Log or % mode is selected."
            shareDefinition="Combined circulating value path for tracked coins only - not total global stablecoin market cap."
          />
        </div>
        <footer class="chart-footer">
          <span><i class="legend-dot blue-dot" />Use Log or % so smaller coins stay visible</span>
          {onLearn ? (
            <button type="button" onClick={onLearn}>Understand supply</button>
          ) : null}
        </footer>
      </article>

      <article class="panel glass peg-panel signal-lens">
        <header class="panel-head">
          <div>
            <p class="panel-kicker">PRICE DISCIPLINE</p>
            <h2>Peg monitor</h2>
            <p class="panel-sub">Market price versus the $1.00 reference</p>
          </div>
        </header>
        <div class="panel-chart">
          <ChartWrapper
            type="line"
            data={pegChartData}
            options={pegChartOptions}
            height={260}
            aspectRatio={16 / 10}
            ariaLabel="Peg monitor with one dollar reference line"
            shareTitle="Peg monitor"
            shareRange="~90D"
            shareInterpretation="Major tracked stablecoins relative to the $1.00 peg. This is a market-price picture, not a reserve-quality assessment."
            shareDefinition="Secondary-market price versus a $1.00 reference line for tracked coins."
            shareHighlight="Visible $1.00 peg reference included"
          />
        </div>
        <footer class="chart-footer">
          <span><i class="legend-dot cobalt-dot" />Dashed line marks the $1.00 peg</span>
        </footer>
      </article>
    </section>
  );
}
