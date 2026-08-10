export default function StatCard({ label, value, meta }) {
  return (
    <div class="stat-card">
      <div class="stat-label">{label}</div>
      <div class="stat-value">{value}</div>
      {meta ? <div class="card-sub">{meta}</div> : null}
    </div>
  );
}
