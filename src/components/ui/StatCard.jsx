export default function StatCard({ label, value, meta, warning }) {
  return (
    <div class="stat-card">
      <div class="stat-label">{label}</div>
      <div class="stat-value">{value}</div>
      {warning ? <div class="stat-warning">{warning}</div> : null}
      {meta ? <div class="card-sub">{meta}</div> : null}
    </div>
  );
}
