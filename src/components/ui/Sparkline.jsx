import ChartWrapper from './ChartWrapper.jsx';

export default function Sparkline({ labels, values, color = '#3b82f6', height = 92 }) {
  return (
    <ChartWrapper
      type="line"
      height={height}
      enableShare={false}
      data={{ labels, datasets: [{ data: values, borderColor: color, tension: 0.25, borderWidth: 2, pointRadius: 0 }] }}
      options={{ plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }}
    />
  );
}
