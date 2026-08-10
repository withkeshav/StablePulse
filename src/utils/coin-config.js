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
 * The frontend nav, home stats, charts and derive logic all follow this list.
 */
export const ACTIVE_STABLECOINS = ['USDT', 'USDC'];

/**
 * Resolved active coin configs (registry entries in ACTIVE_STABLECOINS order).
 * @returns {Array<object>} Active coin config objects.
 */
export function getActiveCoins() {
  return ACTIVE_STABLECOINS.map((symbol) => STABLECOIN_REGISTRY[symbol]).filter(Boolean);
}

/**
 * Map a stablecoin symbol to its tab id (lowercased symbol, e.g. 'USDT' -> 'usdt').
 * @param {string} symbol Coin symbol.
 * @returns {string} Tab id.
 */
export function coinTabId(symbol) {
  return String(symbol).toLowerCase();
}

/**
 * Resolve a tab id to its stablecoin symbol, or null when the tab is not a coin tab.
 * @param {string} id Active tab id.
 * @returns {string|null} Coin symbol, or null.
 */
export function coinFromTabId(id) {
  const normalized = String(id || '').toLowerCase();
  return ACTIVE_STABLECOINS.find((s) => s.toLowerCase() === normalized) || null;
}
