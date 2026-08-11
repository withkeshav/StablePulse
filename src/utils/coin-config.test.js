import { describe, expect, it } from 'vitest';
import { ACTIVE_STABLECOINS, coinFromTabId, coinTabId, getActiveCoins, STABLECOIN_REGISTRY } from './coin-config.js';

describe('coin-config', () => {
  it('getActiveCoins returns registered active coins with required properties', () => {
    const coins = getActiveCoins();
    expect(Array.isArray(coins)).toBe(true);
    expect(coins.map((c) => c.symbol)).toEqual(ACTIVE_STABLECOINS);

    for (const coin of coins) {
      expect(coin.symbol).toBeTypeOf('string');
      expect(coin.coingeckoId).toBeTypeOf('string');
      expect(coin.llamaStablecoinId).toBeTypeOf('number');
      expect(coin.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(coin.thresholds).toBeDefined();
      expect(coin.thresholds.pegCriticalBps).toBeGreaterThan(0);
      expect(coin.thresholds.pegWarnBps).toBeGreaterThan(0);
      expect(coin.thresholds.chainSpikeUsd).toBeGreaterThan(0);
      expect(coin.thresholds.megaSupplyUsd).toBeGreaterThan(0);
    }

    expect(STABLECOIN_REGISTRY.USDT).toBeDefined();
    expect(STABLECOIN_REGISTRY.USDC).toBeDefined();
  });

  it('coinTabId returns correct lowercased id', () => {
    expect(coinTabId('USDT')).toBe('usdt');
    expect(coinTabId('USDC')).toBe('usdc');
    expect(coinTabId('dai')).toBe('dai');
  });

  it('coinFromTabId resolves valid coin tabs and returns null for unknown/empty tabs', () => {
    expect(coinFromTabId('usdt')).toBe('USDT');
    expect(coinFromTabId('USDT')).toBe('USDT');
    expect(coinFromTabId('usdc')).toBe('USDC');
    expect(coinFromTabId('home')).toBe(null);
    expect(coinFromTabId('chains')).toBe(null);
    expect(coinFromTabId('')).toBe(null);
    expect(coinFromTabId(null)).toBe(null);
    expect(coinFromTabId(undefined)).toBe(null);
  });
});
