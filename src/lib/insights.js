import { bps } from '../utils/formatters.js';
import { getActiveCoins } from '../utils/coin-config.js';

/**
 * Static classification of the tracked coins by collateral model.
 * Used by `collateralMixObservation`; the grouping itself never changes.
 */
export const COLLATERAL_GROUPS = {
  FIAT_BACKED: ['USDT', 'USDC', 'PYUSD'],
  NON_FIAT: ['DAI', 'USDE'],
};

function supplyBySymbol(data) {
  const out = {};
  for (const asset of data?.allStables?.peggedAssets || []) {
    const value = asset?.circulating?.peggedUSD;
    if (typeof value === 'number' && Number.isFinite(value)) out[asset.symbol] = value;
  }
  return out;
}

function sum(values) {
  return values.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0);
}

function pct(value, total) {
  return total ? Math.round((value / total) * 1000) / 10 : null;
}

/**
 * USDT vs USDC share of tracked supply right now.
 * @param {Object} data Dashboard payload (App.jsx state).
 * @returns {{id:string,tone:string,text:string}|null}
 */
export function dominanceObservation(data) {
  const supplies = supplyBySymbol(data);
  const total = sum(Object.values(supplies));
  if (!total || !Number.isFinite(supplies.USDT) || !Number.isFinite(supplies.USDC)) return null;
  const usdt = pct(supplies.USDT, total);
  const usdc = pct(supplies.USDC, total);
  if (usdt === null || usdc === null) return null;
  return {
    id: 'dominance',
    tone: 'neutral',
    text: `USDT is ${usdt.toFixed(1)}% of tracked supply right now; USDC is ${usdc.toFixed(1)}%.`,
  };
}

/**
 * Peg drift snapshot: how far every tracked coin sits from $1 right now.
 * @param {Object} data Dashboard payload.
 * @returns {{id:string,tone:string,text:string}|null}
 */
export function pegDriftObservation(data) {
  const rows = [];
  for (const cfg of getActiveCoins()) {
    const price = data?.cgSimple?.[cfg.coingeckoId]?.usd;
    if (typeof price !== 'number' || !Number.isFinite(price)) continue;
    rows.push({ symbol: cfg.symbol, deviation: bps(price) });
  }
  if (!rows.length) return null;
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.deviation)));
  if (maxAbs === 0) {
    return {
      id: 'peg-drift',
      tone: 'neutral',
      text: `All ${rows.length} tracked stablecoins are pinned at exactly $1 right now.`,
    };
  }
  if (maxAbs <= 5) {
    return {
      id: 'peg-drift',
      tone: 'neutral',
      text: `All ${rows.length} tracked stablecoins are within ${maxAbs} bps of $1 right now.`,
    };
  }
  const worst = rows.filter((r) => Math.abs(r.deviation) === maxAbs);
  const rest = rows.filter((r) => Math.abs(r.deviation) < maxAbs);
  const restMax = rest.length ? Math.max(...rest.map((r) => Math.abs(r.deviation))) : 0;
  const names = worst.map((r) => r.symbol).join(' and ');
  const dir = worst[0].deviation < 0 ? 'below' : 'above';
  return {
    id: 'peg-drift',
    tone: worst.some((r) => Math.abs(r.deviation) >= 50) ? 'warning' : 'neutral',
    text: `${names} ${worst.length > 1 ? 'are' : 'is'} ${maxAbs} bps ${dir} the $1 peg right now; the rest are within ${restMax} bps.`,
  };
}

/**
 * Largest single chain share for the highest-supply coin with chain data.
 * @param {Object} data Dashboard payload.
 * @returns {{id:string,tone:string,text:string}|null}
 */
export function chainConcentrationObservation(data) {
  let best = null;
  for (const cfg of getActiveCoins()) {
    const chains = data?.[`${cfg.symbol.toLowerCase()}Detail`]?.chainBalances;
    if (!chains) continue;
    const shares = [];
    for (const [chain, chainData] of Object.entries(chains)) {
      const tokens = chainData?.tokens || [];
      const current = tokens[tokens.length - 1]?.circulating?.peggedUSD;
      if (typeof current === 'number' && Number.isFinite(current)) shares.push({ chain, value: current });
    }
    const total = sum(shares.map((s) => s.value));
    if (!total || !shares.length) continue;
    const top = shares.sort((a, b) => b.value - a.value)[0];
    const share = pct(top.value, total);
    if (share === null) continue;
    if (!best || total > best.total) best = { symbol: cfg.symbol, chain: top.chain, share, total };
  }
  if (!best || best.share < 20) return null;
  return {
    id: 'chain-concentration',
    tone: 'neutral',
    text: `${best.chain} holds the largest share of ${best.symbol} supply at ${best.share.toFixed(1)}% right now.`,
  };
}

/**
 * Fiat-backed vs crypto/synthetic share of tracked supply right now.
 * @param {Object} data Dashboard payload.
 * @returns {{id:string,tone:string,text:string}|null}
 */
export function collateralMixObservation(data) {
  const supplies = supplyBySymbol(data);
  const total = sum(Object.values(supplies));
  if (!total) return null;
  const fiat = sum(COLLATERAL_GROUPS.FIAT_BACKED.map((sym) => supplies[sym]));
  const fiatShare = pct(fiat, total);
  if (fiatShare === null) return null;
  return {
    id: 'collateral-mix',
    tone: 'neutral',
    text: `Fiat-backed coins (USDT, USDC, PYUSD) are ${fiatShare.toFixed(1)}% of tracked supply; crypto- and synthetic-backed (DAI, USDE) are ${(100 - fiatShare).toFixed(1)}%.`,
  };
}

/**
 * How many alerts are open right now, and across how many coins.
 * @param {Array<Object>} alerts Alert list (App.jsx state).
 * @returns {{id:string,tone:string,text:string}|null}
 */
export function alertCountObservation(alerts) {
  const list = Array.isArray(alerts) ? alerts : [];
  const coins = new Set(list.map((a) => a.coin).filter(Boolean));
  if (!list.length) {
    return { id: 'alert-count', tone: 'neutral', text: 'No alerts are open right now across the tracked coins.' };
  }
  const countLabel = list.length === 1 ? '1 alert is' : `${list.length} alerts are`;
  const coinLabel = coins.size === 1 ? ` on ${Array.from(coins)[0]}` : ` across ${coins.size} coins`;
  const tone = list.some((a) => a.severity === 'CRITICAL') ? 'warning' : 'neutral';
  return { id: 'alert-count', tone, text: `${countLabel} open right now${coinLabel}.` };
}

/**
 * Build all live observations for the Learn tab. Deterministic, local,
 * no network and no AI: every sentence is arithmetic on the data already
 * shown elsewhere on the dashboard.
 * @param {Object} data Dashboard payload.
 * @param {Array<Object>} alerts Alert list.
 * @returns {Array<{id:string,tone:string,text:string}>} Non-null observations.
 */
export function buildLearnObservations(data, alerts) {
  if (!data) return [];
  const out = [];
  for (const fn of [dominanceObservation, pegDriftObservation, chainConcentrationObservation, collateralMixObservation]) {
    const observation = fn(data);
    if (observation) out.push(observation);
  }
  const count = alertCountObservation(alerts);
  if (count) out.push(count);
  return out;
}
