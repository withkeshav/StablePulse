export default function SkeletonLoader() {
  return (
    <div class="tab-content active">
      <div class="market-band">
        <div class="sk-outline" style="height:12px;width:90px"></div>
        <div class="sk-outline" style="height:12px;width:90px"></div>
        <div class="sk-outline" style="height:12px;width:90px"></div>
        <div class="sk-outline" style="height:12px;width:90px"></div>
      </div>

      <div class="stats-grid">
        <div class="stat-card sk-outline" style="height:80px"></div>
        <div class="stat-card sk-outline" style="height:80px"></div>
        <div class="stat-card sk-outline" style="height:80px"></div>
        <div class="stat-card sk-outline" style="height:80px"></div>
      </div>

      <div class="grid-2 mb-4">
        <div class="card sk-outline-card">
          <div class="card-body">
            <div class="sk-outline" style="height:220px"></div>
          </div>
        </div>
        <div class="card sk-outline-card">
          <div class="card-body">
            <div class="sk-outline" style="height:220px"></div>
          </div>
        </div>
      </div>

      <div class="card mb-4 sk-outline-card">
        <div class="card-body">
          <div class="sk-outline" style="height:180px"></div>
        </div>
      </div>
    </div>
  );
}
