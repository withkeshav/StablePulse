// Client-only chart share-as-screenshot utility.
// Composites a Chart.js canvas onto an offscreen canvas in the chosen
// format with a title and brand footer. No server, no storage, no analytics.

const FORMATS = {
  story: { w: 1080, h: 1920, label: 'Story 9:16' },
  square: { w: 1080, h: 1080, label: 'Square 1:1' },
  landscape: { w: 1920, h: 1080, label: 'Landscape 16:9' },
};

function isDark() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ||
    (document.documentElement.getAttribute('data-theme') !== 'light' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
}

export function shareChart(chartInstance, title, dateStr, formatKey) {
  const fmt = FORMATS[formatKey] || FORMATS.landscape;
  const dark = isDark();
  const bg = dark ? '#0C0D12' : '#FAFBFC';
  const text = dark ? '#E5E7EB' : '#111827';
  const muted = dark ? '#6B7280' : '#9CA3AF';

  const off = document.createElement('canvas');
  off.width = fmt.w;
  off.height = fmt.h;
  const ctx = off.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, fmt.w, fmt.h);

  // title
  ctx.fillStyle = text;
  ctx.font = '600 36px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(title, 60, 80);

  // chart image centered in safe zone
  const chartImg = chartInstance?.toBase64Image?.();
  if (chartImg) {
    const img = new Image();
    img.onload = () => {
      const maxW = fmt.w - 120;
      const maxH = fmt.h - 240;
      const ratio = Math.min(maxW / img.width, maxH / img.height);
      const dw = img.width * ratio;
      const dh = img.height * ratio;
      const dx = (fmt.w - dw) / 2;
      const dy = (fmt.h - dh) / 2 + 20;
      ctx.drawImage(img, dx, dy, dw, dh);
      drawFooter(ctx, fmt, muted, dateStr);
      download(off, `${title}-${formatKey}.png`);
    };
    img.src = chartImg;
  } else {
    drawFooter(ctx, fmt, muted, dateStr);
    download(off, `${title}-${formatKey}.png`);
  }
}

function drawFooter(ctx, fmt, muted, dateStr) {
  ctx.fillStyle = muted;
  ctx.font = '500 18px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`StableSense - stablesense.withkeshav.com - ${dateStr || ''}`, 60, fmt.h - 40);
}

function download(canvas, filename) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}

export function createSharePopover(chartInstance, title, dateStr, anchorEl) {
  const existing = document.querySelector('.share-popover');
  if (existing) existing.remove();
  const pop = document.createElement('div');
  pop.className = 'share-popover';
  pop.innerHTML = `
    <div class="share-popover-title">Share as screenshot</div>
    ${Object.entries(FORMATS).map(([key, f]) =>
      `<button class="share-format-btn" data-fmt="${key}">${f.label}</button>`
    ).join('')}
    <button class="share-cancel-btn">Cancel</button>
  `;
  pop.style.position = 'absolute';
  pop.style.top = (anchorEl.offsetTop + anchorEl.offsetHeight + 4) + 'px';
  pop.style.right = '0';
  pop.style.zIndex = '250';
  document.body.appendChild(pop);
  pop.querySelectorAll('.share-format-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      shareChart(chartInstance, title, dateStr, btn.dataset.fmt);
      pop.remove();
    });
  });
  pop.querySelector('.share-cancel-btn').addEventListener('click', () => pop.remove());
  // close on outside click
  setTimeout(() => {
    const handler = (e) => { if (!pop.contains(e.target)) { pop.remove(); document.removeEventListener('click', handler); } };
    document.addEventListener('click', handler);
  }, 10);
}