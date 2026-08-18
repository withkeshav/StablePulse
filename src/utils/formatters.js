/**
 * Format a numeric value into compact dollar notation.
 * @param {number|string|null|undefined} n Value to format.
 * @param {number} [d=2] Decimal precision for compact suffixes.
 * @returns {string} Formatted currency string or hyphen placeholder on invalid input.
 */
export function fmtB(n, d = 2) {
  if (n === null || n === undefined) return '-';
  const value = Number(n);
  if (!Number.isFinite(value)) return '-';
  const decimals = Number.isFinite(Number(d)) ? Math.max(0, Number(d)) : 2;
  const abs = Math.abs(value);
  const prefix = value < 0 ? '-$' : '$';
  if (abs >= 1e12) return prefix + (abs / 1e12).toFixed(decimals) + 'T';
  if (abs >= 1e9) return prefix + (abs / 1e9).toFixed(decimals) + 'B';
  if (abs >= 1e6) return prefix + (abs / 1e6).toFixed(decimals) + 'M';
  if (abs >= 1e3) return prefix + (abs / 1e3).toFixed(decimals) + 'K';
  return prefix + abs.toFixed(decimals);
}

/**
 * Format percentage change with a sign prefix.
 * @param {number|string|null|undefined} n Percentage value.
 * @param {number} [d=2] Decimal precision.
 * @returns {string} Formatted percentage or hyphen placeholder on invalid input.
 */
export function fmtPct(n, d = 2) {
  if (n === null || n === undefined) return '-';
  const value = Number(n);
  if (!Number.isFinite(value)) return '-';
  const decimals = Number.isFinite(Number(d)) ? Math.max(0, Number(d)) : 2;
  return (value >= 0 ? '+' : '') + value.toFixed(decimals) + '%';
}

/**
 * Format a unit price in dollars.
 * @param {number|string|null|undefined} n Price value.
 * @returns {string} Dollar formatted price or hyphen placeholder on invalid input.
 */
export function fmtPrice(n) {
  if (n === null || n === undefined) return '-';
  const value = Number(n);
  if (!Number.isFinite(value)) return '-';
  return '$' + value.toFixed(4);
}

/**
 * Calculate percentage change from previous to current value.
 * @param {number|string|null|undefined} cur Current value.
 * @param {number|string|null|undefined} prev Previous value.
 * @returns {number|null} Percentage change, or null when not computable.
 */
export function pctChange(cur, prev) {
  if (cur === null || cur === undefined || prev === null || prev === undefined) return null;
  const current = Number(cur);
  const previous = Number(prev);
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/**
 * Resolve CSS class for signed deltas.
 * @param {number|string|null|undefined} n Numeric delta.
 * @returns {string} `td-pos`, `td-neg`, or empty string.
 */
export function chgClass(n) {
  const value = Number(n);
  if (!Number.isFinite(value)) return '';
  return value > 0 ? 'td-pos' : value < 0 ? 'td-neg' : '';
}

/**
 * Convert a peg price to basis points off $1.00.
 * @param {number|string|null|undefined} p Peg price.
 * @returns {number} Basis points difference; returns 0 on invalid input.
 */
export function bps(p) {
  if (p === null || p === undefined) return 0;
  const price = Number(p);
  if (!Number.isFinite(price)) return 0;
  return Math.round((price - 1) * 10000);
}

/**
 * Convert a timestamp to a compact relative time label.
 * @param {number|string|Date|null|undefined} ts Unix epoch milliseconds/date-like value.
 * @returns {string} Relative label such as `5m ago`, or `-` on invalid input.
 */
export function timeAgo(ts) {
  if (ts === null || ts === undefined) return '-';
  const tsMs = ts instanceof Date ? ts.getTime() : Number(ts);
  if (!Number.isFinite(tsMs)) return '-';
  const s = Math.max(0, Math.floor((Date.now() - tsMs) / 1000));
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

/**
 * Format an epoch timestamp as a UTC clock label for alert provenance.
 * @param {number|string|Date|null|undefined} ts
 * @returns {string} e.g. `18 Aug 2026, 05:00 UTC`, or `-` on invalid input.
 */
export function formatUtc(ts) {
  if (ts === null || ts === undefined) return '-';
  const tsMs = ts instanceof Date ? ts.getTime() : Number(ts);
  if (!Number.isFinite(tsMs) || tsMs <= 0) return '-';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(tsMs));
  const get = (type) => parts.find((p) => p.type === type)?.value || '';
  const day = get('day');
  const month = get('month');
  const year = get('year');
  const hour = get('hour');
  const minute = get('minute');
  if (!day || !month || !hour) return '-';
  return `${day} ${month} ${year}, ${hour}:${minute} UTC`;
}
