/**
 * Central stablecoin registry for scalable multi-coin expansion.
 * Keep ACTIVE_STABLECOINS small on free-tier deployments and expand later by config only.
 */
export const STABLECOIN_REGISTRY = {
  USDT: {
    symbol: 'USDT',
    coingeckoId: 'tether',
    llamaStablecoinId: 1,
    color: '#26A17B',
    thresholds: {
      pegCriticalBps: 50,
      pegWarnBps: 10,
      chainSpikeUsd: 500e6,
      megaSupplyUsd: 1e9,
    },
  },
  USDC: {
    symbol: 'USDC',
    coingeckoId: 'usd-coin',
    llamaStablecoinId: 2,
    color: '#2775CA',
    thresholds: {
      pegCriticalBps: 50,
      pegWarnBps: 10,
      chainSpikeUsd: 500e6,
      megaSupplyUsd: 1e9,
    },
  },
};

/**
 * Expansion-ready switch: add more symbols here when enabling additional stablecoins.
 */
export const ACTIVE_STABLECOINS = ['USDT', 'USDC'];

