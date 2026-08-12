import { describe, expect, it } from 'vitest';
import {
  alertCountObservation,
  buildLearnObservations,
  chainConcentrationObservation,
  collateralMixObservation,
  dominanceObservation,
  pegDriftObservation,
} from './insights.js';

function chain(chainBalances) {
  return { chainBalances };
}

function token(peggedUSD) {
  return { date: 1, circulating: { peggedUSD } };
}

function makeData() {
  return {
    cgSimple: {
      tether: { usd: 1.0002 },
      'usd-coin': { usd: 1.0001 },
      dai: { usd: 0.9999 },
      'ethena-usde': { usd: 1.0 },
      'paypal-usd': { usd: 0.9998 },
    },
    allStables: {
      peggedAssets: [
        { symbol: 'USDT', circulating: { peggedUSD: 120e9 } },
        { symbol: 'USDC', circulating: { peggedUSD: 35e9 } },
        { symbol: 'DAI', circulating: { peggedUSD: 5e9 } },
        { symbol: 'USDE', circulating: { peggedUSD: 4e9 } },
        { symbol: 'PYUSD', circulating: { peggedUSD: 1e9 } },
      ],
    },
    usdtDetail: chain({
      Tron: { tokens: [token(80e9)] },
      Ethereum: { tokens: [token(40e9)] },
    }),
    usdcDetail: chain({ Ethereum: { tokens: [token(35e9)] } }),
  };
}

describe('dominanceObservation', () => {
  it('reports USDT and USDC share of tracked supply', () => {
    const obs = dominanceObservation(makeData());
    expect(obs.id).toBe('dominance');
    expect(obs.text).toContain('72.7%');
    expect(obs.text).toContain('21.2%');
  });

  it('returns null without supply data', () => {
    expect(dominanceObservation(undefined)).toBeNull();
    expect(dominanceObservation({ allStables: { peggedAssets: [] } })).toBeNull();
  });
});

describe('pegDriftObservation', () => {
  it('reports a tight peg for all coins within 5 bps', () => {
    const obs = pegDriftObservation(makeData());
    expect(obs.text).toContain('within 2 bps');
    expect(obs.text).toContain('All 5 tracked stablecoins');
  });

  it('names the worst offender when a coin drifts', () => {
    const data = makeData();
    data.cgSimple.tether.usd = 0.996;
    const obs = pegDriftObservation(data);
    expect(obs.text).toContain('USDT is 40 bps below');
    expect(obs.text).toContain('within 2 bps');
  });

  it('pins the copy when every coin is exactly $1', () => {
    const data = makeData();
    for (const id of Object.keys(data.cgSimple)) data.cgSimple[id].usd = 1.0;
    expect(pegDriftObservation(data).text).toContain('pinned at exactly $1');
  });

  it('returns null without price data', () => {
    expect(pegDriftObservation(undefined)).toBeNull();
    expect(pegDriftObservation({ cgSimple: {} })).toBeNull();
  });
});

describe('chainConcentrationObservation', () => {
  it('picks the top chain of the highest-supply coin', () => {
    const obs = chainConcentrationObservation(makeData());
    expect(obs.text).toContain('Tron holds the largest share of USDT supply at 66.7%');
  });

  it('returns null without chain data', () => {
    expect(chainConcentrationObservation(undefined)).toBeNull();
    expect(chainConcentrationObservation({ usdtDetail: {} })).toBeNull();
  });

  it('returns null when no chain reaches a meaningful share', () => {
    const data = makeData();
    data.usdcDetail = chain({});
    data.usdtDetail = chain({
      Tron: { tokens: [token(1e9)] },
      Ethereum: { tokens: [token(1e9)] },
      BSC: { tokens: [token(1e9)] },
      Arbitrum: { tokens: [token(1e9)] },
      Polygon: { tokens: [token(1e9)] },
      Base: { tokens: [token(1e9)] },
    });
    expect(chainConcentrationObservation(data)).toBeNull();
  });
});

describe('collateralMixObservation', () => {
  it('reports the fiat-backed share', () => {
    const obs = collateralMixObservation(makeData());
    expect(obs.text).toContain('Fiat-backed coins');
    expect(obs.text).toContain('94.5%');
    expect(obs.text).toContain('5.5%');
  });

  it('returns null without supply data', () => {
    expect(collateralMixObservation({})).toBeNull();
  });
});

describe('alertCountObservation', () => {
  it('handles no alerts', () => {
    expect(alertCountObservation([]).text).toContain('No alerts are open');
  });

  it('handles a single alert', () => {
    const obs = alertCountObservation([{ coin: 'USDT', severity: 'WARNING' }]);
    expect(obs.text).toContain('1 alert is');
    expect(obs.text).toContain('on USDT');
  });

  it('counts distinct coins for multiple alerts', () => {
    const obs = alertCountObservation([
      { coin: 'USDT', severity: 'HIGH' },
      { coin: 'USDT', severity: 'WARNING' },
      { coin: 'USDC', severity: 'WARNING' },
    ]);
    expect(obs.text).toContain('3 alerts are');
    expect(obs.text).toContain('across 2 coins');
  });

  it('flags tone when a critical alert is open', () => {
    const obs = alertCountObservation([{ coin: 'USDT', severity: 'CRITICAL' }]);
    expect(obs.tone).toBe('warning');
  });
});

describe('buildLearnObservations', () => {
  it('returns only non-null observations with unique ids', () => {
    const obs = buildLearnObservations(makeData(), [
      { coin: 'USDT', severity: 'WARNING' },
    ]);
    expect(obs.length).toBeGreaterThan(0);
    const ids = new Set(obs.map((o) => o.id));
    expect(ids.size).toBe(obs.length);
    for (const o of obs) {
      expect(typeof o.id).toBe('string');
      expect(typeof o.text).toBe('string');
      expect(typeof o.tone).toBe('string');
    }
  });

  it('degrades to an empty array without data', () => {
    expect(buildLearnObservations(undefined, [])).toEqual([]);
  });
});
