import { describe, expect, it } from 'vitest';
import {
  buildAlertSparkSeries,
  buildMigrationPairs,
  buildShareSeries,
  buildSupplySeries,
  buildWhaleWatchRows,
  computePegStress,
  rankChainFlows,
} from './derive.js';

function chainDetail(tokens) {
  return { chainBalances: { Ethereum: { tokens } } };
}

function token(date, peggedUSD) {
  return { date, circulating: { peggedUSD } };
}

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
