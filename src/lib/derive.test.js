import { describe, expect, it } from 'vitest';
import {
  alertEventId,
  alertExplanation,
  buildAlertSparkSeries,
  buildMigrationPairs,
  buildShareSeries,
  buildSupplySeries,
  buildWhaleWatchRows,
  chainObservation,
  computePegStress,
  dedupeTickers,
  generateAlerts,
  pairOpposingFlows,
  pegBand,
  pegChartOptions,
  pegRefLine,
  rankChainFlows,
  toPercentFromFirst,
} from './derive.js';

function chainDetail(tokens) {
  return { chainBalances: { Ethereum: { tokens } } };
}

function token(date, peggedUSD) {
  return { date, circulating: { peggedUSD } };
}

const T0 = 1_700_000_000;
const H24 = 86_400;
const T1 = T0 + H24;
const T72 = T0 + 3 * H24;

describe('pegBand', () => {
  it('returns the default band when there are no valid prices', () => {
    expect(pegBand([])).toEqual({ min: 0.9, max: 1.1 });
    expect(pegBand(undefined)).toEqual({ min: 0.9, max: 1.1 });
    expect(pegBand([null, 0, -1])).toEqual({ min: 0.9, max: 1.1 });
  });

  it('clamps the band to $0.90 / $1.10 and pads by 0.005', () => {
    expect(pegBand([0.998, 1.002])).toEqual({ min: 0.993, max: 1.007 });
  });

  it('floors the band at $0.90 when a depeg breaches the lower bound', () => {
    expect(pegBand([0.88, 1.0])).toEqual({ min: 0.9, max: 1.005 });
  });

  it('caps the upper bound at $1.10 even for a large upward depeg', () => {
    expect(pegBand([1.0, 1.2])).toEqual({ min: 0.995, max: 1.1 });
  });
});

describe('pegRefLine', () => {
  it('builds a flat $1 line the length of the labels array', () => {
    const line = pegRefLine(['a', 'b', 'c'], '#999');
    expect(line.label).toBe('$1 peg');
    expect(line.data).toEqual([1, 1, 1]);
    expect(line.borderColor).toBe('#999');
    expect(line.borderDash).toEqual([4, 4]);
    expect(line.pointRadius).toBe(0);
  });

  it('defaults the color when none is passed', () => {
    expect(pegRefLine(['a']).borderColor).toBe('#9CA3AF');
  });
});

describe('pegChartOptions', () => {
  it('returns an empty object when there are no valid prices', () => {
    expect(pegChartOptions([])).toEqual({});
  });

  it('returns a band and a 4-decimal tick callback', () => {
    const opts = pegChartOptions([0.998, 1.002]);
    expect(opts.scales.y.min).toBe(0.993);
    expect(opts.scales.y.max).toBe(1.007);
    expect(typeof opts.scales.y.ticks.callback).toBe('function');
    expect(opts.scales.y.ticks.callback(1.0)).toBe('$1.0000');
  });
});

describe('toPercentFromFirst', () => {
  it('returns an empty array for no series', () => {
    expect(toPercentFromFirst([])).toEqual([]);
    expect(toPercentFromFirst(undefined)).toEqual([]);
  });

  it('normalizes to percent change from the first point', () => {
    const series = [
      { date: 1000, value: 100 },
      { date: 2000, value: 110 },
      { date: 3000, value: 90 },
    ];
    const out = toPercentFromFirst(series);
    expect(out.map((p) => p.date)).toEqual([1000, 2000, 3000]);
    expect(out[0].value).toBe(0);
    expect(out[1].value).toBeCloseTo(10, 5);
    expect(out[2].value).toBeCloseTo(-10, 5);
  });

  it('returns zeros when the first point is zero to avoid division by zero', () => {
    const series = [{ date: 1000, value: 0 }, { date: 2000, value: 50 }];
    expect(toPercentFromFirst(series)).toEqual([
      { date: 1000, value: 0 },
      { date: 2000, value: 0 },
    ]);
  });
});

describe('buildSupplySeries', () => {
  it('returns an empty series for no detail', () => {
    expect(buildSupplySeries(undefined)).toEqual([]);
    expect(buildSupplySeries({})).toEqual([]);
  });

  it('aggregates per-token supply by day and sorts ascending', () => {
    const detail = {
      chainBalances: {
        Ethereum: { tokens: [token(3, 100), token(1, 50)] },
        Tron: { tokens: [token(3, 25), token(2, 40)] },
      },
    };
    const series = buildSupplySeries(detail);
    expect(series.map((p) => p.date)).toEqual([1000, 2000, 3000]);
    expect(series.map((p) => p.value)).toEqual([50, 40, 125]);
  });

  it('skips token rows without a valid date', () => {
    const detail = chainDetail([{ circulating: { peggedUSD: 5 } }, token(2, 10)]);
    expect(buildSupplySeries(detail)).toEqual([{ date: 2000, value: 10 }]);
  });

  it('slices to the last 90 days', () => {
    const tokens = Array.from({ length: 120 }, (_, i) => token(i + 1, i + 1));
    const series = buildSupplySeries(chainDetail(tokens));
    expect(series).toHaveLength(90);
    expect(series[0].date).toBe(31000);
  });
});

describe('rankChainFlows', () => {
  it('returns an empty array for no details', () => {
    expect(rankChainFlows(undefined)).toEqual([]);
    expect(rankChainFlows({})).toEqual([]);
  });

  it('computes per-coin deltas and total, sorted by absolute total', () => {
    const detailsByCoin = {
      USDT: { chainBalances: { Ethereum: { tokens: [token(1, 100), token(2, 130)] }, Tron: { tokens: [token(1, 50), token(2, 20)] } } },
      USDC: { chainBalances: { Ethereum: { tokens: [token(1, 10), token(2, 15)] } } },
    };
    const flows = rankChainFlows(detailsByCoin);
    expect(flows).toHaveLength(2);
    expect(flows[0].chain).toBe('Ethereum');
    expect(flows[0].deltas).toEqual({ USDT: 30, USDC: 5 });
    expect(flows[0].totalDelta).toBe(35);
    expect(flows[1].chain).toBe('Tron');
    expect(flows[1].deltas).toEqual({ USDT: -30 });
    expect(flows[1].totalDelta).toBe(-30);
  });

  it('defaults missing previous point to current (zero delta)', () => {
    const detailsByCoin = { USDT: { chainBalances: { Solana: { tokens: [token(1, 100)] } } } };
    const flows = rankChainFlows(detailsByCoin);
    expect(flows[0].totalDelta).toBe(0);
  });

  it('handles zero-supply edge case properly', () => {
    const detailsByCoin = { USDT: { chainBalances: { Solana: { tokens: [token(1, 100), token(2, 0)] } } } };
    const flows = rankChainFlows(detailsByCoin);
    expect(flows[0].totalDelta).toBe(-100);
  });
});

describe('buildMigrationPairs', () => {
  it('pairs top outflows with top inflows', () => {
    const flows = [
      { chain: 'A', totalDelta: -40 },
      { chain: 'B', totalDelta: 50 },
      { chain: 'C', totalDelta: -10 },
      { chain: 'D', totalDelta: 20 },
    ];
    const pairs = buildMigrationPairs(flows);
    expect(pairs).toHaveLength(2);
    expect(pairs[0]).toEqual({ from: 'A', to: 'B', amount: 40 });
    expect(pairs[1]).toEqual({ from: 'C', to: 'D', amount: 10 });
  });

  it('returns empty when there are no outflows', () => {
    expect(buildMigrationPairs([{ chain: 'A', totalDelta: 5 }])).toEqual([]);
  });

  it('handles missing inflow counterpart', () => {
    const pairs = buildMigrationPairs([{ chain: 'A', totalDelta: -5 }]);
    expect(pairs[0].to).toBe('N/A');
    expect(pairs[0].amount).toBe(0);
  });
});

describe('computePegStress', () => {
  it('returns LOW with no pressure', () => {
    const stress = computePegStress({ pricesByCoin: { USDT: 1, USDC: 1 }, alerts: [], topChainFlow: 0 });
    expect(stress.level).toBe('LOW');
    expect(stress.score).toBe(0);
    expect(stress.pegDriftBps).toBe(0);
  });

  it('reflects the largest peg drift across coins', () => {
    const stress = computePegStress({ pricesByCoin: { USDT: 1.005, USDC: 0.999 }, alerts: [], topChainFlow: 0 });
    expect(stress.pegDriftBps).toBe(50);
  });

  it('escalates level with CRITICAL alerts', () => {
    const stress = computePegStress({
      pricesByCoin: { USDT: 1 },
      alerts: [{ severity: 'CRITICAL' }],
      topChainFlow: 0,
    });
    expect(stress.critical).toBe(1);
    expect(stress.score).toBeGreaterThanOrEqual(25);
  });

  it('caps the score at 100', () => {
    const stress = computePegStress({
      pricesByCoin: { USDT: 1.05 },
      alerts: Array.from({ length: 4 }, () => ({ severity: 'CRITICAL' })),
      topChainFlow: 5e9,
    });
    expect(stress.score).toBe(100);
    expect(stress.level).toBe('HIGH');
  });

  it('assigns WATCH level when score is between 40 and 69', () => {
    const stress = computePegStress({
      pricesByCoin: { USDT: 1.002 },
      alerts: [{ severity: 'HIGH' }, { severity: 'WARNING' }], // 14 + 14 = 28 score + chain flow
      topChainFlow: 12.5e9, // 25
    });
    expect(stress.score).toBeGreaterThanOrEqual(40);
    expect(stress.score).toBeLessThan(70);
    expect(stress.level).toBe('WATCH');
  });

  it('handles missing prices gracefully', () => {
    const stress = computePegStress({ pricesByCoin: {}, alerts: [], topChainFlow: 0 });
    expect(stress.pegDriftBps).toBe(0);
  });
});

describe('buildWhaleWatchRows', () => {
  it('returns empty for no details', () => {
    expect(buildWhaleWatchRows(undefined)).toEqual([]);
  });

  it('flags chains whose latest delta clears the z-score threshold', () => {
    const tokens = [];
    for (let i = 0; i < 30; i += 1) tokens.push(token(i + 1, i * 1000));
    const spike = token(31, 1e9);
    const rows = buildWhaleWatchRows({ USDT: chainDetail([...tokens, spike]) });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].coin).toBe('USDT');
    expect(rows[0].chain).toBe('Ethereum');
  });

  it('honors the limit parameter', () => {
    const spike = (v) => chainDetail([
      token(1, 1000), token(2, 2000), token(3, 3000), token(4, 4000),
      token(5, 5000), token(6, 6000), token(7, 7000), token(8, 8000),
      token(9, v),
    ]);
    const rows = buildWhaleWatchRows({ USDT: spike(1e9), USDC: spike(1e9) }, 1);
    expect(rows).toHaveLength(1);
  });

  it('caps the displayed z-score at 10 and keeps the raw z', () => {
    // A low-variance baseline with a large spike produces a huge z that must be
    // capped at 10 in display while the raw z is preserved for the tooltip.
    // Use a small non-constant wiggle so the baseline stddev is non-zero.
    const base = [];
    for (let i = 0; i < 30; i += 1) base.push(token(i + 1, 100 + ((i * 7) % 5))); // 0-4 unit wiggle
    const spike = token(31, 1e9); // large delta vs single-digit noise, clears the $750M trigger
    const rows = buildWhaleWatchRows({ USDT: chainDetail([...base, spike]) });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].z).toBeGreaterThan(10);
    expect(rows[0].displayZ).toBe(10);
  });

  it('adds a share-of-tracked-delta that sums to ~100 across rows', () => {
    const spike = (v) => chainDetail([
      token(1, 1000), token(2, 2000), token(3, 3000), token(4, 4000),
      token(5, 5000), token(6, 6000), token(7, 7000), token(8, 8000),
      token(9, v),
    ]);
    const rows = buildWhaleWatchRows({ USDT: spike(1e9), USDC: spike(2e9) });
    const sum = rows.reduce((s, r) => s + r.shareOfTracked, 0);
    expect(sum).toBeCloseTo(100, 0);
  });

  it('returns empty when chain balances are steady', () => {
    const tokens = [];
    for (let i = 0; i < 30; i += 1) tokens.push(token(i + 1, i * 1000));
    const rows = buildWhaleWatchRows({ USDT: chainDetail([...tokens, token(31, 30000)]) });
    expect(rows).toHaveLength(0);
  });
});

describe('buildShareSeries', () => {
  it('computes the target coin share percentage over time', () => {
    const series = buildShareSeries(
      {
        USDT: [{ date: 1000, value: 30 }, { date: 2000, value: 40 }],
        USDC: [{ date: 1000, value: 70 }, { date: 2000, value: 60 }],
      },
      'USDT'
    );
    expect(series).toEqual([
      { date: 1000, share: 30 },
      { date: 2000, share: 40 },
    ]);
  });

  it('returns 0 share when total is zero', () => {
    const series = buildShareSeries({ USDT: [{ date: 1000, value: 0 }] }, 'USDT');
    expect(series[0].share).toBe(0);
  });
});

describe('dedupeTickers', () => {
  it('returns an empty array for no tickers', () => {
    expect(dupeTickersSafe([])).toEqual([]);
    expect(dupeTickersSafe(undefined)).toEqual([]);
  });

  it('deduplicates by market.identifier', () => {
    const tickers = [
      { market: { identifier: 'btcc', name: 'BTCC' }, converted_volume: { usd: 100 } },
      { market: { identifier: 'btcc', name: 'BTCC' }, converted_volume: { usd: 50 } },
      { market: { identifier: 'binance', name: 'Binance' }, converted_volume: { usd: 200 } },
    ];
    const rows = dedupeTickers(tickers);
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe('BTCC');
    expect(rows[1].name).toBe('Binance');
    expect(rows[0].volume).toBe(100);
  });

  it('suffixes rows that share a display name but have distinct identifiers', () => {
    const tickers = [
      { market: { identifier: 'btcc-1', name: 'BTCC' }, base: 'USDT', converted_volume: { usd: 100 } },
      { market: { identifier: 'btcc-2', name: 'BTCC' }, base: 'USDC', converted_volume: { usd: 80 } },
      { market: { identifier: 'whitebit', name: 'WhiteBIT' }, base: 'USDT', converted_volume: { usd: 30 } },
    ];
    const rows = dedupeTickers(tickers);
    expect(rows.map((r) => r.name)).toEqual(['BTCC', 'BTCC (2)', 'WhiteBIT']);
  });

  it('falls back to name+base when market.identifier is absent', () => {
    const tickers = [
      { market: { name: 'Binance' }, base: 'USDT', converted_volume: { usd: 100 } },
      { market: { name: 'Binance' }, base: 'USDC', converted_volume: { usd: 50 } },
    ];
    const rows = dedupeTickers(tickers);
    expect(rows).toHaveLength(2);
  });

  it('respects the limit parameter', () => {
    const tickers = Array.from({ length: 12 }, (_, i) => ({
      market: { identifier: `ex-${i}`, name: `Exchange ${i}` },
      converted_volume: { usd: 100 * i },
    }));
    expect(dedupeTickers(tickers, 5)).toHaveLength(5);
  });
});

function dupeTickersSafe(tickers, limit) {
  return dedupeTickers(tickers, limit);
}

describe('buildAlertSparkSeries', () => {
  it('returns null without data', () => {
    expect(buildAlertSparkSeries({ rule: 'PEG_BREAK', coin: 'USDT' }, null)).toBeNull();
  });

  it('builds a PEG_BREAK spark from the price chart', () => {
    const data = {
      cgUSDTChart: { prices: [[1000, 0.999], [2000, 1.001]] },
    };
    const spark = buildAlertSparkSeries({ rule: 'PEG_BREAK', coin: 'USDT' }, data);
    expect(spark.values).toEqual([0.999, 1.001]);
    expect(spark.labels).toHaveLength(2);
  });

  it('returns null for an unknown rule', () => {
    expect(buildAlertSparkSeries({ rule: 'SOMETHING_ELSE', coin: 'USDT' }, {})).toBeNull();
  });
});

describe('generateAlerts', () => {
  it('returns an empty list for missing data', () => {
    expect(generateAlerts(null)).toEqual([]);
    expect(generateAlerts({})).toEqual([]);
  });

  it('returns no alerts for a steady-state payload', () => {
    const data = {
      cgSimple: { tether: { usd: 1.0002 }, 'usd-coin': { usd: 0.9999 } },
      usdtDetail: { chainBalances: { Ethereum: { tokens: [token(T0, 1e10), token(T1, 1.002e10)] } } },
    };
    expect(generateAlerts(data)).toEqual([]);
  });

  it('flags a CRITICAL peg break when drift clears the threshold', () => {
    const observed = T1;
    const data = { cgSimple: { tether: { usd: 0.994, last_updated_at: observed } } };
    const peg = generateAlerts(data).find((a) => a.rule === 'PEG_BREAK' && a.coin === 'USDT');
    expect(peg).toBeDefined();
    expect(peg.severity).toBe('CRITICAL');
    expect(peg.magnitude).toBe(60);
    expect(peg.rationale).toContain('60 bps');
    expect(peg.observedAt).toBe(observed * 1000);
    expect(peg.timestamp).toBe(observed * 1000);
  });

  it('does not stamp alert time with Date.now()', () => {
    const before = Date.now();
    const data = { cgSimple: { tether: { usd: 0.994, last_updated_at: T1 } } };
    const peg = generateAlerts(data).find((a) => a.rule === 'PEG_BREAK');
    const after = Date.now();
    expect(peg.timestamp).toBe(T1 * 1000);
    expect(peg.timestamp).toBeLessThan(before);
    expect(peg.detectedAt).toBeNull();
    expect(after).toBeGreaterThanOrEqual(before);
  });

  it('marks peg drift above the warning band as HIGH', () => {
    const data = { cgSimple: { tether: { usd: 1.002 } } };
    const peg = generateAlerts(data).find((a) => a.rule === 'PEG_BREAK' && a.coin === 'USDT');
    expect(peg.severity).toBe('HIGH');
  });

  it('flags a directional CHAIN_FLOW once the per-chain delta clears the threshold', () => {
    const data = {
      usdtDetail: { chainBalances: { Tron: { tokens: [token(T0, 2e10), token(T1, 2.06e10)] } } },
    };
    const spike = generateAlerts(data).find((a) => a.rule === 'CHAIN_FLOW' && a.coin === 'USDT' && a.chain === 'Tron');
    expect(spike).toBeDefined();
    expect(spike.severity).toBe('WARNING');
    expect(spike.magnitude).toBe(600e6);
    expect(spike.intervalLabel).toBe('in the last 24h');
    expect(spike.rationale).toContain('in the last 24h');
    expect(spike.rationale).not.toContain('surged');
  });

  it('escalates CHAIN_FLOW to HIGH at double the threshold', () => {
    const data = {
      usdtDetail: { chainBalances: { Tron: { tokens: [token(T0, 2e10), token(T1, 3.2e10)] } } },
    };
    const spike = generateAlerts(data).find((a) => a.rule === 'CHAIN_FLOW' && a.coin === 'USDT');
    expect(spike.severity).toBe('HIGH');
  });

  it('pairs the DAI offsetting-flow fixture as one MIGRATION and suppresses child spikes', () => {
    const data = {
      daiDetail: {
        chainBalances: {
          Ethereum: { tokens: [token(T0, 1e9), token(T1, 1e9 + 391e6)] },
          Polygon: { tokens: [token(T0, 1e9), token(T1, 1e9 - 391e6)] },
        },
      },
    };
    const alerts = generateAlerts(data);
    const migrations = alerts.filter((a) => a.rule === 'MIGRATION' && a.coin === 'DAI');
    const flows = alerts.filter((a) => a.rule === 'CHAIN_FLOW' && a.coin === 'DAI');
    const nets = alerts.filter((a) => (a.rule === 'NET_MINT' || a.rule === 'NET_BURN') && a.coin === 'DAI');
    expect(migrations).toHaveLength(1);
    expect(flows).toHaveLength(0);
    expect(nets).toHaveLength(0);
    expect(migrations[0].headline).toBe('DAI liquidity moved: Polygon → Ethereum');
    expect(migrations[0].grossFlow).toBe(391e6);
    expect(migrations[0].netSupplyDelta).toBe(0);
    expect(migrations[0].explanation).toMatch(/\$391M gross/);
    expect(migrations[0].explanation).toMatch(/broadly unchanged/);
    expect(migrations[0].cadenceValid).toBe(true);
    const again = generateAlerts(data);
    expect(again.find((a) => a.rule === 'MIGRATION').id).toBe(migrations[0].id);
  });

  it('keeps a MIGRATION and a NET_MINT when paired flows still leave a large net', () => {
    const data = {
      daiDetail: {
        chainBalances: {
          Ethereum: { tokens: [token(T0, 1e9), token(T1, 1e9 + 3000e6)] },
          Polygon: { tokens: [token(T0, 5e9), token(T1, 5e9 - 2700e6)] },
        },
      },
    };
    const alerts = generateAlerts(data).filter((a) => a.coin === 'DAI');
    expect(alerts.some((a) => a.rule === 'MIGRATION')).toBe(true);
    const net = alerts.find((a) => a.rule === 'NET_MINT');
    expect(net).toBeDefined();
    expect(net.magnitude).toBe(300e6);
    expect(alerts.filter((a) => a.rule === 'CHAIN_FLOW')).toHaveLength(0);
  });

  it('flags a true net burn without inventing a migration', () => {
    const data = {
      daiDetail: { chainBalances: { Ethereum: { tokens: [token(T0, 2e9), token(T1, 2e9 - 300e6)] } } },
    };
    const alerts = generateAlerts(data).filter((a) => a.coin === 'DAI');
    expect(alerts.some((a) => a.rule === 'MIGRATION')).toBe(false);
    const burn = alerts.find((a) => a.rule === 'NET_BURN');
    expect(burn).toBeDefined();
    expect(burn.magnitude).toBe(300e6);
    const flow = alerts.find((a) => a.rule === 'CHAIN_FLOW');
    expect(flow).toBeDefined();
  });

  it('does not call a stale interval the last 24h', () => {
    const data = {
      usdtDetail: { chainBalances: { Tron: { tokens: [token(T0, 2e10), token(T72, 2.06e10)] } } },
    };
    const spike = generateAlerts(data).find((a) => a.rule === 'CHAIN_FLOW');
    expect(spike.cadenceValid).toBe(false);
    expect(spike.confidence).toBe('low');
    expect(spike.intervalLabel).toBe('between the latest two observations (72h apart)');
    expect(spike.rationale).not.toContain('in the last 24h');
  });

  it('emits DATA_QUALITY when circulating USD is invalid', () => {
    const data = {
      daiDetail: { chainBalances: { Ethereum: { tokens: [token(T0, 1e9), token(T1, -10)] } } },
    };
    const dq = generateAlerts(data).find((a) => a.rule === 'DATA_QUALITY' && a.coin === 'DAI');
    expect(dq).toBeDefined();
    expect(dq.confidence).toBe('low');
  });

  it('flags a NET_MINT coin-wide increase above the threshold', () => {
    const data = {
      usdtDetail: { chainBalances: { Ethereum: { tokens: [token(T0, 1e10), token(T1, 1.2e10)] } } },
    };
    const mega = generateAlerts(data).find((a) => a.rule === 'NET_MINT' && a.coin === 'USDT');
    expect(mega).toBeDefined();
    expect(mega.severity).toBe('HIGH');
    expect(mega.magnitude).toBe(2e9);
  });

  it('flags a DOM_SHIFT when a coin gains tracked supply share', () => {
    const usdtTokens = [];
    const usdcTokens = [];
    for (let i = 0; i < 10; i += 1) {
      usdtTokens.push(token(T0 + i * H24, 1000));
      usdcTokens.push(token(T0 + i * H24, i <= 2 ? 500 : 1000));
    }
    const data = {
      usdtDetail: { chainBalances: { Ethereum: { tokens: usdtTokens } } },
      usdcDetail: { chainBalances: { Ethereum: { tokens: usdcTokens } } },
    };
    const shift = generateAlerts(data).find((a) => a.rule === 'DOM_SHIFT' && a.coin === 'USDC');
    expect(shift).toBeDefined();
    expect(shift.severity).toBe('HIGH');
    expect(shift.magnitude).toBeGreaterThan(3);
  });

  it('sorts alerts by severity then magnitude', () => {
    const data = {
      cgSimple: { tether: { usd: 0.99 } },
      usdtDetail: { chainBalances: { Tron: { tokens: [token(T0, 2e10), token(T1, 2.6e10)] } } },
    };
    const alerts = generateAlerts(data);
    expect(alerts[0].severity).toBe('CRITICAL');
  });

  it('uses a stable fingerprint that ignores detection time', () => {
    const data = {
      daiDetail: {
        chainBalances: {
          Ethereum: { tokens: [token(T0, 1e9), token(T1, 1e9 + 391e6)] },
          Polygon: { tokens: [token(T0, 1e9), token(T1, 1e9 - 391e6)] },
        },
      },
    };
    const a = generateAlerts(data, { detectedAt: 1 })[0];
    const b = generateAlerts(data, { detectedAt: 999 })[0];
    expect(a.id).toBe(b.id);
    expect(a.id).toBe(alertEventId({
      rule: 'MIGRATION',
      coin: 'DAI',
      chains: ['Ethereum', 'Polygon'],
      sourceTsCurrent: T1 * 1000,
      sourceTsPrevious: T0 * 1000,
    }));
  });
});

describe('pairOpposingFlows', () => {
  it('pairs magnitudes within 10% and leaves the rest unmatched', () => {
    const { pairs, unpairedPos } = pairOpposingFlows(
      [{ chain: 'Ethereum', delta: 391e6 }],
      [{ chain: 'Polygon', delta: -391e6 }, { chain: 'Arbitrum', delta: -50e6 }]
    );
    expect(pairs).toHaveLength(1);
    expect(pairs[0].from.chain).toBe('Polygon');
    expect(pairs[0].to.chain).toBe('Ethereum');
    expect(unpairedPos).toHaveLength(0);
  });
});

describe('chainObservation', () => {
  it('exposes source timestamps and interval hours', () => {
    const obs = chainObservation(
      { chainBalances: { Ethereum: { tokens: [token(T0, 1), token(T1, 2)] } } },
      'Ethereum'
    );
    expect(obs.sourceTsCurrent).toBe(T1 * 1000);
    expect(obs.intervalHours).toBe(24);
    expect(obs.cadenceValid).toBe(true);
  });
});

describe('alertExplanation', () => {
  it('returns guidance for each supported rule without data', () => {
    for (const rule of ['PEG_BREAK', 'CHAIN_FLOW', 'MIGRATION', 'NET_MINT', 'NET_BURN', 'DOM_SHIFT', 'DATA_QUALITY']) {
      const e = alertExplanation({ rule, coin: 'USDT', magnitude: 50 });
      expect(typeof e.whyItMatters).toBe('string');
      expect(typeof e.whatToWatch).toBe('string');
    }
  });

  it('falls back gracefully for unknown or missing alerts', () => {
    expect(alertExplanation(null).whyItMatters).toBeTruthy();
    expect(alertExplanation({ rule: 'NOPE' }).whatToWatch).toBeTruthy();
  });
});
