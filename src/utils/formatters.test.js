import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fmtB, fmtPct, fmtPrice, pctChange, chgClass, bps, timeAgo } from './formatters.js';

describe('fmtB', () => {
  it('formats values below 1000 with 2 decimals', () => {
    expect(fmtB(0)).toBe('$0.00');
    expect(fmtB(999)).toBe('$999.00');
  });

  it('formats values at thousand thresholds with compact suffixes', () => {
    expect(fmtB(1000)).toBe('$1.00K');
    expect(fmtB(1_000_000)).toBe('$1.00M');
    expect(fmtB(1_000_000_000)).toBe('$1.00B');
    expect(fmtB(1_000_000_000_000)).toBe('$1.00T');
  });

  it('handles values just above thresholds', () => {
    expect(fmtB(1000.5)).toBe('$1.00K');
    expect(fmtB(1234567)).toBe('$1.23M');
  });

  it('formats negative numbers with a leading minus', () => {
    expect(fmtB(-999)).toBe('$-999.00');
    expect(fmtB(-1000)).toBe('$-1.00K');
    expect(fmtB(-2_500_000)).toBe('$-2.50M');
  });

  it('respects the decimals parameter', () => {
    expect(fmtB(1234567, 1)).toBe('$1.2M');
    expect(fmtB(1234567, 0)).toBe('$1M');
  });

  it('accepts numeric strings', () => {
    expect(fmtB('5000000')).toBe('$5.00M');
    expect(fmtB('1234')).toBe('$1.23K');
  });

  it('falls back to 2 decimals when decimals param is invalid', () => {
    expect(fmtB(1000, 'x')).toBe('$1.00K');
    expect(fmtB(1000, undefined)).toBe('$1.00K');
    expect(fmtB(1000, NaN)).toBe('$1.00K');
  });

  it('clamps negative decimals param to 0', () => {
    expect(fmtB(1234567, -2)).toBe('$1M');
  });

  it('returns an em dash for invalid inputs', () => {
    expect(fmtB(undefined)).toBe('-');
    expect(fmtB(NaN)).toBe('-');
    expect(fmtB('abc')).toBe('-');
    expect(fmtB(Infinity)).toBe('-');
    expect(fmtB(-Infinity)).toBe('-');
  });

  it('returns an em dash for null and undefined inputs', () => {
    expect(fmtB(null)).toBe('-');
    expect(fmtB(undefined)).toBe('-');
  });
});

describe('fmtPct', () => {
  it('prefixes positive values with a plus sign', () => {
    expect(fmtPct(1.234)).toBe('+1.23%');
    expect(fmtPct(5)).toBe('+5.00%');
  });

  it('formats negative values with a minus sign', () => {
    expect(fmtPct(-0.5)).toBe('-0.50%');
    expect(fmtPct(-1.239)).toBe('-1.24%');
  });

  it('formats zero', () => {
    expect(fmtPct(0)).toBe('+0.00%');
  });

  it('respects the decimals parameter', () => {
    expect(fmtPct(1.1234, 3)).toBe('+1.123%');
    expect(fmtPct(1.5, 0)).toBe('+2%');
  });

  it('accepts numeric strings', () => {
    expect(fmtPct('2.5')).toBe('+2.50%');
    expect(fmtPct('-1.5')).toBe('-1.50%');
  });

  it('returns an em dash for invalid inputs', () => {
    expect(fmtPct(undefined)).toBe('-');
    expect(fmtPct(NaN)).toBe('-');
    expect(fmtPct('abc')).toBe('-');
    expect(fmtPct(Infinity)).toBe('-');
  });

  it('returns an em dash for null and undefined inputs', () => {
    expect(fmtPct(null)).toBe('-');
    expect(fmtPct(undefined)).toBe('-');
  });
});

describe('fmtPrice', () => {
  it('formats a price with 4 decimals', () => {
    expect(fmtPrice(1)).toBe('$1.0000');
    expect(fmtPrice(1234.56789)).toBe('$1234.5679');
    expect(fmtPrice(0.9999)).toBe('$0.9999');
  });

  it('formats negative prices', () => {
    expect(fmtPrice(-2.5)).toBe('$-2.5000');
  });

  it('accepts numeric strings', () => {
    expect(fmtPrice('1.5')).toBe('$1.5000');
  });

  it('returns an em dash for invalid inputs', () => {
    expect(fmtPrice(undefined)).toBe('-');
    expect(fmtPrice(NaN)).toBe('-');
    expect(fmtPrice('abc')).toBe('-');
    expect(fmtPrice(Infinity)).toBe('-');
  });

  it('returns an em dash for null and undefined inputs', () => {
    expect(fmtPrice(null)).toBe('-');
    expect(fmtPrice(undefined)).toBe('-');
  });
});

describe('pctChange', () => {
  it('computes positive percentage change', () => {
    expect(pctChange(110, 100)).toBe(10);
    expect(pctChange(150, 100)).toBe(50);
  });

  it('computes negative percentage change', () => {
    expect(pctChange(90, 100)).toBe(-10);
    expect(pctChange(50, 100)).toBe(-50);
  });

  it('returns 0 when current equals previous', () => {
    expect(pctChange(100, 100)).toBe(0);
  });

  it('accepts string inputs', () => {
    expect(pctChange('110', '100')).toBe(10);
    expect(pctChange('90', '100')).toBe(-10);
  });

  it('returns null when previous is 0', () => {
    expect(pctChange(5, 0)).toBe(null);
  });

  it('returns null when current is null or undefined', () => {
    expect(pctChange(null, 100)).toBe(null);
    expect(pctChange(undefined, 100)).toBe(null);
  });

  it('returns null when previous is null or undefined', () => {
    expect(pctChange(5, null)).toBe(null);
    expect(pctChange(5, undefined)).toBe(null);
  });

  it('returns null for invalid inputs', () => {
    expect(pctChange('abc', 100)).toBe(null);
    expect(pctChange(110, 'abc')).toBe(null);
    expect(pctChange(undefined, 100)).toBe(null);
    expect(pctChange(NaN, 100)).toBe(null);
    expect(pctChange(110, Infinity)).toBe(null);
  });
});

describe('chgClass', () => {
  it('returns td-pos for positive deltas', () => {
    expect(chgClass(5)).toBe('td-pos');
    expect(chgClass('2.5')).toBe('td-pos');
  });

  it('returns td-neg for negative deltas', () => {
    expect(chgClass(-5)).toBe('td-neg');
    expect(chgClass('-2.5')).toBe('td-neg');
  });

  it('returns empty string for zero', () => {
    expect(chgClass(0)).toBe('');
    expect(chgClass(-0)).toBe('');
  });

  it('returns empty string for invalid inputs', () => {
    expect(chgClass(null)).toBe('');
    expect(chgClass(undefined)).toBe('');
    expect(chgClass(NaN)).toBe('');
    expect(chgClass('abc')).toBe('');
    expect(chgClass(Infinity)).toBe('');
  });
});

describe('bps', () => {
  it('returns 0 for a peg price of exactly 1', () => {
    expect(bps(1)).toBe(0);
  });

  it('computes basis points below the peg', () => {
    expect(bps(0.999)).toBe(-10);
  });

  it('computes basis points above the peg', () => {
    expect(bps(1.005)).toBe(50);
  });

  it('handles string inputs', () => {
    expect(bps('1.005')).toBe(50);
  });

  it('returns 0 for invalid inputs', () => {
    expect(bps(undefined)).toBe(0);
    expect(bps(NaN)).toBe(0);
    expect(bps('abc')).toBe(0);
    expect(bps(Infinity)).toBe(0);
  });

  it('returns 0 for null and undefined inputs', () => {
    expect(bps(null)).toBe(0);
    expect(bps(undefined)).toBe(0);
  });
});

describe('timeAgo', () => {
  const NOW = new Date('2024-01-01T00:00:00.000Z').getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats seconds ago', () => {
    expect(timeAgo(NOW - 30_000)).toBe('30s ago');
    expect(timeAgo(NOW - 5_000)).toBe('5s ago');
  });

  it('formats minutes ago', () => {
    expect(timeAgo(NOW - 5 * 60_000)).toBe('5m ago');
    expect(timeAgo(NOW - 59 * 60_000)).toBe('59m ago');
  });

  it('formats hours ago', () => {
    expect(timeAgo(NOW - 3 * 3600_000)).toBe('3h ago');
    expect(timeAgo(NOW - 25 * 3600_000)).toBe('25h ago');
  });

  it('accepts a Date object instance', () => {
    expect(timeAgo(new Date(NOW - 30_000))).toBe('30s ago');
    expect(timeAgo(new Date(NOW - 5 * 60_000))).toBe('5m ago');
  });

  it('clamps future timestamps to 0s ago', () => {
    expect(timeAgo(NOW + 60_000)).toBe('0s ago');
    expect(timeAgo(NOW)).toBe('0s ago');
  });

  it('returns an em dash for invalid inputs', () => {
    expect(timeAgo('nope')).toBe('-');
    expect(timeAgo(undefined)).toBe('-');
    expect(timeAgo(NaN)).toBe('-');
  });

  it('returns an em dash for null and undefined inputs', () => {
    expect(timeAgo(null)).toBe('-');
    expect(timeAgo(undefined)).toBe('-');
  });
});
