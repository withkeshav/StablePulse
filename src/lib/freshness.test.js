import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FRESHNESS_STATES,
  buildFreshness,
  classifyFreshness,
  extractMarketObservedAt,
  formatIntervalLabel,
  intervalHours,
  isNominal24h,
} from './freshness.js';

const NOW = Date.UTC(2026, 7, 18, 12, 0, 0);

describe('intervalHours', () => {
  it('returns hours between two millisecond timestamps', () => {
    expect(intervalHours(NOW - 23.85 * 3600_000, NOW)).toBeCloseTo(23.85, 5);
  });

  it('accepts unix seconds', () => {
    const prev = 1_700_000_000;
    const cur = prev + 86_400;
    expect(intervalHours(prev, cur)).toBe(24);
  });

  it('returns null for missing or inverted stamps', () => {
    expect(intervalHours(null, NOW)).toBeNull();
    expect(intervalHours(NOW, NOW)).toBeNull();
    expect(intervalHours(NOW, NOW - 1000)).toBeNull();
  });
});

describe('isNominal24h / formatIntervalLabel', () => {
  it('treats 20-28h as in the last 24h', () => {
    expect(isNominal24h(20)).toBe(true);
    expect(isNominal24h(28)).toBe(true);
    expect(isNominal24h(19.9)).toBe(false);
    expect(isNominal24h(28.1)).toBe(false);
    expect(formatIntervalLabel(23.85)).toBe('in the last 24h');
  });

  it('describes non-24h gaps without calling them 24h', () => {
    expect(formatIntervalLabel(18)).toBe('between the latest two observations (18h apart)');
    expect(formatIntervalLabel(23 + 51 / 60)).toBe('in the last 24h');
    expect(formatIntervalLabel(72)).toBe('between the latest two observations (72h apart)');
    expect(formatIntervalLabel(null)).toBe('observation interval unavailable');
  });
});

describe('classifyFreshness', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('maps age bands to Current / Delayed / Stale / Unavailable', () => {
    expect(classifyFreshness(NOW - 30 * 60_000, NOW)).toBe(FRESHNESS_STATES.CURRENT);
    expect(classifyFreshness(NOW - 5 * 3600_000, NOW)).toBe(FRESHNESS_STATES.DELAYED);
    expect(classifyFreshness(NOW - 6 * 86400_000, NOW)).toBe(FRESHNESS_STATES.STALE);
    expect(classifyFreshness(null, NOW)).toBe(FRESHNESS_STATES.UNAVAILABLE);
  });
});

describe('extractMarketObservedAt / buildFreshness', () => {
  const t1 = Math.floor(NOW / 1000);

  it('takes the latest CoinGecko last_updated_at when present', () => {
    const observed = extractMarketObservedAt({
      daiDetail: {
        chainBalances: {
          Ethereum: { tokens: [{ date: t1 - 86_400, circulating: { peggedUSD: 1 } }, { date: t1, circulating: { peggedUSD: 2 } }] },
        },
      },
      cgSimple: { dai: { usd: 1, last_updated_at: t1 - 60 } },
    });
    expect(observed).toBe((t1 - 60) * 1000);
  });

  it('keeps the three clocks independent and warns when they disagree', () => {
    const freshness = buildFreshness({
      checkedAt: NOW,
      marketObservedAt: NOW - 22 * 60_000,
      snapshotAt: NOW - 6 * 86400_000,
    }, NOW);
    expect(freshness.checkedState).toBe(FRESHNESS_STATES.CURRENT);
    expect(freshness.marketState).toBe(FRESHNESS_STATES.CURRENT);
    expect(freshness.snapshotState).toBe(FRESHNESS_STATES.STALE);
    expect(freshness.overallState).toBe(FRESHNESS_STATES.CURRENT);
    expect(freshness.provenanceWarning).toMatch(/differ by more than a day/);
  });

  it('does not mark a successful fetch Unavailable when the optional snapshot is absent', () => {
    const freshness = buildFreshness({
      checkedAt: NOW,
      supplyObservedAt: NOW - 8 * 3600_000,
      snapshotAt: null,
    }, NOW);
    expect(freshness.snapshotConnected).toBe(false);
    expect(freshness.snapshotState).toBe(FRESHNESS_STATES.UNAVAILABLE);
    expect(freshness.marketState).toBe(FRESHNESS_STATES.CURRENT);
    expect(freshness.overallState).toBe(FRESHNESS_STATES.CURRENT);
  });
});
