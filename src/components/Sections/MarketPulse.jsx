import ChartWrapper from '../ui/ChartWrapper.jsx';

export default function MarketPulse({ supplyChartData, pegChartData }) {
  return (
    <section class="grid-2 mb-4">
      <div class="card home-section-flat">
        <div class="card-header"><div class="card-title">Supply Trend</div></div>
        <div class="card-body chart-card-body"><ChartWrapper type="line" data={supplyChartData} height={240} aspectRatio={16 / 10} /></div>
      </div>
      <div class="card home-section-flat">
        <div class="card-header"><div class="card-title">Peg Monitor</div></div>
        <div class="card-body chart-card-body"><ChartWrapper type="line" data={pegChartData} height={240} aspectRatio={16 / 10} /></div>
      </div>
    </section>
  );
}
