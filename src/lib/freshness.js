/**
 * Truthful data-age helpers. Browser fetch time, upstream observation time,
 * and persisted snapshot time are three different clocks and must not be
 * collapsed into a single "last updated" label.
 */

export const FRESHNESS_STATES = {
  CURRENT: 'Current',
  DELAYED: 'Delayed',
  STALE: 'Stale',
  UNAVAILABLE: 'Unavailable',
};

/** Nominal "last 24h" window: 20-28 hours inclusive. */
export const NOMINAL_24H_MIN = 20;
export const NOMINAL_24H_MAX = 28;

const CURRENT_MS = 2 * 3600_000;
const DELAYED_MS = 24 * 3600_000;
/** DefiLlama chain history is a daily snapshot; 8-20h old is on cadence, not a failed fetch. */
const SUPPLY_CURRENT_MS = 28 * 3600_000;
const SUPPLY_DELAYED_MS = 48 * 3600_000;

function toMs(ts) {
  if (ts == null) return null;
  const n = ts instanceof Date ? ts.getTime() : Number(ts);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n < 1e12 ? n * 1000 : n;
}

/**
 * Convert two observation timestamps into an interval in hours.
 * @param {number|null} prevTsMs Previous observation (ms).
 * @param {number|null} curTsMs Current observation (ms).
 * @returns {number|null}
 */
export function intervalHours(prevTsMs, curTsMs) {
  const prev = toMs(prevTsMs);
  const cur = toMs(curTsMs);
  if (prev == null || cur == null || cur <= prev) return null;
  return (cur - prev) / 3_600_000;
}

export function isNominal24h(hours) {
  return typeof hours === 'number' && Number.isFinite(hours) && hours >= NOMINAL_24H_MIN && hours <= NOMINAL_24H_MAX;
}

/**
 * Human interval phrase. Uses "in the last 24h" only inside the 20-28h band.
 * @param {number|null} hours
 * @returns {string}
 */
export function formatIntervalLabel(hours) {
  if (hours == null || !Number.isFinite(hours) || hours <= 0) {
    return 'observation interval unavailable';
  }
  if (isNominal24h(hours)) return 'in the last 24h';
  const totalMin = Math.max(1, Math.round(hours * 60));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `between the latest two observations (${m}m apart)`;
  if (m === 0) return `between the latest two observations (${h}h apart)`;
  return `between the latest two observations (${h}h ${m}m apart)`;
}

/**
 * Classify a timestamp's age relative to `now`.
 * @param {number|null} tsMs
 * @param {number} [now]
 * @returns {string} One of FRESHNESS_STATES.
 */
export function classifyFreshness(tsMs, now = Date.now()) {
  const ts = toMs(tsMs);
  if (ts == null) return FRESHNESS_STATES.UNAVAILABLE;
  const age = Math.max(0, now - ts);
  if (age < CURRENT_MS) return FRESHNESS_STATES.CURRENT;
  if (age < DELAYED_MS) return FRESHNESS_STATES.DELAYED;
  return FRESHNESS_STATES.STALE;
}

export function classifySupplyFreshness(tsMs, now = Date.now()) {
  const ts = toMs(tsMs);
  if (ts == null) return FRESHNESS_STATES.UNAVAILABLE;
  const age = Math.max(0, now - ts);
  if (age < SUPPLY_CURRENT_MS) return FRESHNESS_STATES.CURRENT;
  if (age < SUPPLY_DELAYED_MS) return FRESHNESS_STATES.DELAYED;
  return FRESHNESS_STATES.STALE;
}

/**
 * Latest DefiLlama token date (unix seconds or ms) across coin details.
 * @param {object} data Dashboard payload.
 * @returns {number|null} Epoch ms.
 */
export function extractSupplyObservedAt(data) {
  let max = null;
  for (const [key, detail] of Object.entries(data || {})) {
    if (!key.endsWith('Detail')) continue;
    for (const chainData of Object.values(detail?.chainBalances || {})) {
      const tokens = chainData?.tokens || [];
      const last = tokens[tokens.length - 1];
      const ts = toMs(last?.date);
      if (ts != null && (max == null || ts > max)) max = ts;
    }
  }
  return max;
}

export function extractSpotObservedAt(data) {
  let max = null;
  for (const row of Object.values(data?.cgSimple || {})) {
    const ts = toMs(row?.last_updated_at);
    if (ts != null && (max == null || ts > max)) max = ts;
  }
  return max;
}

/**
 * Prefer live spot timestamps; fall back to DefiLlama daily supply dates.
 */
export function extractMarketObservedAt(data) {
  return extractSpotObservedAt(data) ?? extractSupplyObservedAt(data);
}

/**
 * Build the three-clock freshness contract for the UI.
 * @param {{checkedAt?:number|null, marketObservedAt?:number|null, snapshotAt?:number|null}} clocks
 * @param {number} [now]
 */
export function buildFreshness(clocks = {}, now = Date.now()) {
  const checkedAt = toMs(clocks.checkedAt);
  const spotObservedAt = toMs(clocks.spotObservedAt);
  const supplyObservedAt = toMs(clocks.supplyObservedAt);
  const marketObservedAt = toMs(clocks.marketObservedAt) ?? spotObservedAt ?? supplyObservedAt;
  const snapshotAt = toMs(clocks.snapshotAt);
  const usedSpot = spotObservedAt != null && marketObservedAt === spotObservedAt;

  const checkedState = classifyFreshness(checkedAt, now);
  const marketState = usedSpot
    ? classifyFreshness(marketObservedAt, now)
    : classifySupplyFreshness(marketObservedAt, now);
  const snapshotState = snapshotAt == null
    ? FRESHNESS_STATES.UNAVAILABLE
    : classifyFreshness(snapshotAt, now);

  const mixedAges = [marketObservedAt, snapshotAt].filter((v) => v != null);
  let provenanceWarning = null;
  if (mixedAges.length === 2 && Math.abs(mixedAges[0] - mixedAges[1]) > DELAYED_MS) {
    provenanceWarning = 'Market observation and historical snapshot ages differ by more than a day. Do not treat them as one clock.';
  }

  // Headline state follows the data used in the dashboard. A missing optional
  // backend snapshot must not mark a successful live fetch as Unavailable.
  const overallState = marketState !== FRESHNESS_STATES.UNAVAILABLE
    ? marketState
    : checkedState;

  return {
    checkedAt,
    marketObservedAt,
    spotObservedAt,
    supplyObservedAt,
    snapshotAt,
    snapshotConnected: snapshotAt != null,
    usedSpot,
    checkedState,
    marketState,
    snapshotState,
    overallState,
    provenanceWarning,
  };
}
