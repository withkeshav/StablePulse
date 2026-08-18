import { bps } from '../utils/formatters.js';
import { getActiveCoins } from '../utils/coin-config.js';
import { formatIntervalLabel, intervalHours, isNominal24h } from './freshness.js';

/**
 * Compute a shared peg band around $1 so peg drift is visible and Home and
 * the coin tab cannot drift apart. Widen automatically when a real depeg
 * exceeds the default band, but never go below $0.90 or above $1.10.
 * @param {Array<number>} prices Flat list of peg prices from the chart's data.
 * @returns {{min:number, max:number}} Band bounds; `{0.9,1.1}` if no prices.
 */
export function pegBand(prices) {
  const valid = (prices || []).filter((v) => typeof v === 'number' && v > 0);
  if (!valid.length) return { min: 0.9, max: 1.1 };
  const seriesMin = Math.min(...valid);
  const seriesMax = Math.max(...valid);
  return {
    min: Math.max(0.9, seriesMin - 0.005),
    max: Math.min(1.1, seriesMax + 0.005),
  };
}

/**
 * Build the dashed $1 reference-line dataset shared by Home Peg Monitor and
 * the coin-tab price chart. Drawn as a flat line at y=1 with a dashed stroke
 * so no chartjs-plugin-annotation dependency is required.
 * @param {Array<*>} labels The chart's label array (length sets the line).
 * @param {string} [color] Stroke color (resolve a theme token before calling).
 * @returns {{label:string, data:number[], borderColor:string, borderDash:number[], borderWidth:number, pointRadius:number, tension:number}}
 */
export function pegRefLine(labels, color = '#9CA3AF') {
  return {
    label: '$1 peg',
    data: (labels || []).map(() => 1),
    borderColor: color,
    borderDash: [4, 4],
    borderWidth: 1,
    pointRadius: 0,
    tension: 0,
  };
}

/**
 * Build the shared peg-chart options (band + $1 tick formatting) used by both
 * Home and the coin tab so the two charts cannot drift apart.
 * @param {Array<number>} prices Flat list of peg prices from the chart's data.
 * @returns {object} Chart.js options object (empty if no prices).
 */
export function pegChartOptions(prices) {
  const valid = (prices || []).filter((v) => typeof v === 'number' && v > 0);
  if (!valid.length) return {};
  const { min, max } = pegBand(valid);
  return {
    scales: {
      y: {
        min,
        max,
        ticks: { callback: (v) => '$' + Number(v).toFixed(4) },
      },
    },
    plugins: {
      tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: $${Number(ctx.parsed.y).toFixed(4)}` } },
    },
  };
}

/**
 * Normalize a supply series to "percent change from the first point" so coins
 * of very different magnitudes (USDT ~$183B vs PYUSD ~$1B) can be read on one
 * axis. The first point becomes 0; subsequent points are `(v / first - 1) * 100`.
 * @param {Array<{date:number, value:number}>} series Supply series.
 * @returns {Array<{date:number, value:number}>} Normalized series (empty if no first point).
 */
export function toPercentFromFirst(series) {
  const arr = series || [];
  if (!arr.length) return [];
  const first = arr[0].value;
  if (!first) return arr.map((p) => ({ date: p.date, value: 0 }));
  return arr.map((p) => ({ date: p.date, value: (p.value / first - 1) * 100 }));
}

export function buildSupplySeries(detail) {
  const chainBalances = detail?.chainBalances || {};
  const byDate = {};
  Object.values(chainBalances).forEach((chain) => {
    (chain?.tokens || []).forEach((t) => {
      const ts = Number(t?.date || 0) * 1000;
      if (!ts) return;
      byDate[ts] = (byDate[ts] || 0) + (t?.circulating?.peggedUSD || 0);
    });
  });
  return Object.entries(byDate).map(([date, value]) => ({ date: Number(date), value })).sort((a, b) => a.date - b.date).slice(-90);
}

/**
 * Rank chains by combined 24h mint/burn deltas across all tracked stablecoins.
 * @param {Object<string, object>} detailsByCoin Map of coin symbol -> chain detail payload.
 * @returns {Array<object>} Chains sorted by absolute total delta, with per-coin `deltas`.
 */
export function rankChainFlows(detailsByCoin) {
  const map = {};
  for (const [coin, detail] of Object.entries(detailsByCoin || {})) {
    for (const [chain, chainData] of Object.entries(detail?.chainBalances || {})) {
      const tokens = chainData?.tokens || [];
      const cur = tokens[tokens.length - 1]?.circulating?.peggedUSD || 0;
      const pd = tokens[tokens.length - 2]?.circulating?.peggedUSD ?? cur;
      const delta = cur - pd;
      if (!map[chain]) map[chain] = { chain, deltas: {}, totalDelta: 0 };
      map[chain].deltas[coin] = (map[chain].deltas[coin] || 0) + delta;
      map[chain].totalDelta += delta;
    }
  }
  return Object.values(map).sort((a, b) => Math.abs(b.totalDelta) - Math.abs(a.totalDelta));
}

export function buildMigrationPairs(flows) {
  const inflows = flows.filter((f) => f.totalDelta > 0).sort((a, b) => b.totalDelta - a.totalDelta);
  const outflows = flows.filter((f) => f.totalDelta < 0).sort((a, b) => a.totalDelta - b.totalDelta);
  return outflows.slice(0, 3).map((out, i) => ({
    from: out.chain,
    to: inflows[i]?.chain || 'N/A',
    amount: Math.min(Math.abs(out.totalDelta), inflows[i]?.totalDelta || 0),
  }));
}

export function computePegStress({ pricesByCoin, alerts, topChainFlow }) {
  const critical = (alerts || []).filter((a) => a.severity === 'CRITICAL').length;
  const high = (alerts || []).filter((a) => a.severity === 'HIGH').length;
  const warning = (alerts || []).filter((a) => a.severity === 'WARNING').length;
  const pegDriftBps = Math.max(0, ...Object.values(pricesByCoin || {}).map((p) => Math.abs(bps(p))));
  const score = Math.min(100, Math.round(pegDriftBps * 0.7 + critical * 25 + high * 10 + warning * 4 + Math.min(35, Math.round((Math.abs(topChainFlow) / 1e9) * 2))));
  const level = score >= 70 ? 'HIGH' : score >= 40 ? 'WATCH' : 'LOW';
  return { score, level, pegDriftBps, critical, high, warning };
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stddev(values, avg) {
  if (values.length < 2) return 0;
  const variance = values.reduce((acc, v) => acc + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function buildWhaleWatchRows(detailsByCoin, limit = 8) {
  const rows = [];
  for (const [coin, detail] of Object.entries(detailsByCoin || {})) {
    for (const [chain, chainData] of Object.entries(detail?.chainBalances || {})) {
      const tokens = chainData?.tokens || [];
      if (tokens.length < 8) continue;
      const series = tokens.slice(-30).map((t) => t?.circulating?.peggedUSD || 0);
      const deltas = [];
      for (let i = 1; i < series.length; i += 1) deltas.push(series[i] - series[i - 1]);
      const currentDelta = deltas[deltas.length - 1] || 0;
      const baseline = deltas.slice(0, -1).map((d) => Math.abs(d));
      const avg = mean(baseline);
      const sd = stddev(baseline, avg);
      const z = sd > 0 ? (Math.abs(currentDelta) - avg) / sd : 0;
      if (z >= 2.5 || Math.abs(currentDelta) > 7.5e8) {
        rows.push({
          coin,
          chain,
          delta: currentDelta,
          z,
          displayZ: Math.min(z, 10),
        });
      }
    }
  }
  const ranked = rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, limit);
  // Share of the total absolute delta across the surfaced rows, so a tiny-chain
  // spike is contextualized against the whole tracked flow, not shown in isolation.
  const totalAbs = ranked.reduce((sum, r) => sum + Math.abs(r.delta), 0) || 1;
  return ranked.map((r) => ({ ...r, shareOfTracked: (Math.abs(r.delta) / totalAbs) * 100 }));
}

/**
 * Build a share-of-total percentage series for a target coin over time.
 * @param {Object<string, Array<{date:number,value:number}>>} supplyByCoin Per-coin supply series.
 * @param {string} targetCoin Symbol whose share percentage is returned.
 * @returns {Array<{date:number, share:number}>} Share series (0..100).
 */
export function buildShareSeries(supplyByCoin, targetCoin) {
  const byDate = {};
  for (const [coin, series] of Object.entries(supplyByCoin || {})) {
    (series || []).forEach((p) => {
      if (!byDate[p.date]) byDate[p.date] = { date: p.date };
      byDate[p.date][coin] = p.value;
    });
  }
  return Object.values(byDate)
    .sort((a, b) => a.date - b.date)
    .map((p) => {
      const total = Object.entries(p).reduce((sum, [k, v]) => (k === 'date' ? sum : sum + (Number(v) || 0)), 0);
      return { date: p.date, share: total ? ((Number(p[targetCoin]) || 0) / total) * 100 : 0 };
    });
}

/**
 * Deduplicate exchange tickers so the same venue is not shown twice (e.g. the
 * live CoinGecko tether feed lists BTCC twice). Dedupe key is `market.identifier`
 * (the stable exchange id), falling back to `name + base` when absent. When two
 * distinct tickers resolve to the same display name, suffix the pair so each
 * bar stays distinguishable: first becomes "BTCC", second "BTCC (2)".
 * @param {Array<object>} tickers Raw CoinGecko tickers array.
 * @param {number} [limit=8] Max rows to return.
 * @returns {Array<{name:string, volume:number}>} Deduped, capped rows.
 */
export function dedupeTickers(tickers, limit = 8) {
  const seen = new Set();
  const nameCount = {};
  const out = [];
  for (const t of tickers || []) {
    const id = t?.market?.identifier || `${t?.market?.name || ''}-${t?.base || ''}`;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const name = t?.market?.name || 'Unknown';
    nameCount[name] = (nameCount[name] || 0) + 1;
    out.push({ name, volume: t?.converted_volume?.usd || 0 });
    if (out.length >= limit) break;
  }
  // Second pass: suffix duplicate display names so bars stay distinguishable.
  const nameSeen = {};
  return out.map((row) => {
    if (nameCount[row.name] > 1) {
      nameSeen[row.name] = (nameSeen[row.name] || 0) + 1;
      if (nameSeen[row.name] > 1) row.name = `${row.name} (${nameSeen[row.name]})`;
    }
    return row;
  });
}

export function buildAlertSparkSeries(alert, data) {
  if (!alert || !data) return null;
  const rule = alert.rule;
  const coin = alert.coin;
  const coins = getActiveCoins();
  const activeCoin = coins.find((c) => c.symbol === coin);
  const color = activeCoin ? activeCoin.color : '#3b82f6';

  if (rule === 'PEG_BREAK') {
    const chart = data?.[`cg${coin}Chart`];
    const prices = (chart?.prices || []).slice(-14);
    if (!prices.length) return null;
    return {
      labels: prices.map((_, i) => String(i)),
      values: prices.map((p) => p[1]),
      color,
    };
  }
  if (
    rule === 'MEGA_SUPPLY' ||
    rule === 'CHAIN_SPIKE' ||
    rule === 'CHAIN_FLOW' ||
    rule === 'MIGRATION' ||
    rule === 'NET_MINT' ||
    rule === 'NET_BURN'
  ) {
    const detail = data?.[`${coin?.toLowerCase()}Detail`];
    const chainName = alert.chain || alert.chains?.[0];
    const chainData = chainName ? detail?.chainBalances?.[chainName] : null;
    const tokens = (chainData?.tokens || []).slice(-14);
    if (!tokens.length) {
      const series = buildSupplySeries(detail).slice(-14);
      if (!series.length) return null;
      return {
        labels: series.map((_, i) => String(i)),
        values: series.map((p) => p.value),
        color,
      };
    }
    return {
      labels: tokens.map((_, i) => String(i)),
      values: tokens.map((t) => t?.circulating?.peggedUSD || 0),
      color,
    };
  }
  if (rule === 'DOM_SHIFT') {
    const supplyByCoin = {};
    for (const key of Object.keys(data || {})) {
      if (key.endsWith('Detail')) {
        const symbol = key.replace('Detail', '').toUpperCase();
        supplyByCoin[symbol] = buildSupplySeries(data[key]);
      }
    }
    const dom = buildShareSeries(supplyByCoin, coin).slice(-14);
    if (!dom.length) return null;
    return {
      labels: dom.map((_, i) => String(i)),
      values: dom.map((p) => p.share),
      color: '#3b82f6',
    };
  }
  return null;
}

const SEVERITY_RANK = { CRITICAL: 0, HIGH: 1, WARNING: 2 };
const MIGRATION_MATCH_TOL = 0.10;
const MIGRATION_NET_FRAC = 0.15;

function tokenTsMs(token) {
  const d = Number(token?.date);
  if (!Number.isFinite(d) || d <= 0) return null;
  return d < 1e12 ? d * 1000 : d;
}

function fnv1a(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

/**
 * Deterministic event id from coin, observation window, classification, and chains.
 * Does not include render time or a random nonce.
 */
export function alertEventId({ rule, coin, chains = [], sourceTsCurrent = 0, sourceTsPrevious = 0 }) {
  const chainKey = [...new Set([...chains].filter(Boolean).map(String))].sort().join(',');
  const base = [rule, coin, chainKey, Number(sourceTsCurrent) || 0, Number(sourceTsPrevious) || 0].join('|');
  return `${String(rule).toLowerCase()}-${String(coin).toLowerCase()}-${fnv1a(base)}`;
}

/**
 * Pair positive and negative chain flows whose magnitudes are within 10%.
 * Greedy: largest unmatched magnitudes first.
 */
export function pairOpposingFlows(positives, negatives, tolerance = MIGRATION_MATCH_TOL) {
  const pos = [...(positives || [])].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const neg = [...(negatives || [])].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const usedP = new Set();
  const usedN = new Set();
  const pairs = [];
  for (let i = 0; i < pos.length; i += 1) {
    const p = pos[i];
    for (let j = 0; j < neg.length; j += 1) {
      if (usedN.has(j)) continue;
      const n = neg[j];
      const magP = Math.abs(p.delta);
      const magN = Math.abs(n.delta);
      const denom = Math.max(magP, magN);
      if (!denom) continue;
      if (Math.abs(magP - magN) / denom <= tolerance) {
        usedP.add(i);
        usedN.add(j);
        pairs.push({ from: n, to: p, grossFlow: Math.min(magP, magN) });
        break;
      }
    }
  }
  return { pairs, unpairedPos: pos.filter((_, i) => !usedP.has(i)), unpairedNeg: neg.filter((_, i) => !usedN.has(i)) };
}

export function chainObservation(detail, chain) {
  const tokens = detail?.chainBalances?.[chain]?.tokens || [];
  const valid = tokens.filter((t) => {
    const v = t?.circulating?.peggedUSD;
    return typeof v === 'number' && Number.isFinite(v);
  });
  if (valid.length < 2) return null;
  const cur = valid[valid.length - 1];
  const prev = valid[valid.length - 2];
  const current = cur.circulating.peggedUSD;
  const previous = prev.circulating.peggedUSD;
  const sourceTsCurrent = tokenTsMs(cur);
  const sourceTsPrevious = tokenTsMs(prev);
  const hours = intervalHours(sourceTsPrevious, sourceTsCurrent);
  return {
    chain,
    current,
    previous,
    delta: current - previous,
    sourceTsCurrent,
    sourceTsPrevious,
    intervalHours: hours,
    cadenceValid: isNominal24h(hours),
    intervalLabel: formatIntervalLabel(hours),
    invalidSupply: current < 0 || previous < 0,
  };
}

function chainDelta(detail, chain) {
  return chainObservation(detail, chain)?.delta || 0;
}

function coinTotalDelta(detail) {
  const chains = Object.keys(detail?.chainBalances || {});
  return chains.reduce((sum, chain) => sum + chainDelta(detail, chain), 0);
}

function fmtUsd(n) {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${Math.round(abs / 1e6)}M`;
  if (abs >= 1e3) return `$${Math.round(abs / 1e3)}K`;
  return `$${Math.round(abs)}`;
}

function signedUsd(n) {
  const mag = fmtUsd(n);
  if (n > 0) return `+${mag}`;
  if (n < 0) return `-${mag}`;
  return mag;
}

function windowMeta(obsList) {
  const currents = obsList.map((o) => o.sourceTsCurrent).filter((v) => v != null);
  const previous = obsList.map((o) => o.sourceTsPrevious).filter((v) => v != null);
  const hoursList = obsList.map((o) => o.intervalHours).filter((v) => v != null);
  const sourceTsCurrent = currents.length ? Math.max(...currents) : null;
  const sourceTsPrevious = previous.length ? Math.min(...previous) : null;
  const hours = hoursList.length ? hoursList.reduce((a, b) => a + b, 0) / hoursList.length : intervalHours(sourceTsPrevious, sourceTsCurrent);
  const cadenceValid = hoursList.length ? hoursList.every((h) => isNominal24h(h)) : isNominal24h(hours);
  return {
    sourceTsCurrent,
    sourceTsPrevious,
    intervalHours: hours,
    cadenceValid,
    intervalLabel: formatIntervalLabel(hours),
    observedAt: sourceTsCurrent,
  };
}

function makeAlert({
  rule,
  coin,
  severity,
  magnitude,
  chains = [],
  chain = null,
  headline,
  explanation,
  grossFlow = null,
  netSupplyDelta = null,
  window = {},
  confidence = 'medium',
  confidenceNote = '',
  detectedAt = null,
  state = 'open',
  provenance = {},
}) {
  const sourceTsCurrent = window.sourceTsCurrent ?? null;
  const sourceTsPrevious = window.sourceTsPrevious ?? null;
  const observedAt = window.observedAt ?? sourceTsCurrent ?? null;
  return {
    id: alertEventId({
      rule,
      coin,
      chains: chain ? [chain, ...chains] : chains,
      sourceTsCurrent,
      sourceTsPrevious,
    }),
    rule,
    classification: rule,
    coin,
    chain,
    chains: chain ? Array.from(new Set([chain, ...chains])) : [...chains],
    severity,
    magnitude,
    grossFlow,
    netSupplyDelta,
    headline,
    rationale: headline,
    explanation,
    timestamp: observedAt,
    observedAt,
    detectedAt,
    publishedAt: null,
    sourceTsCurrent,
    sourceTsPrevious,
    intervalHours: window.intervalHours ?? null,
    intervalLabel: window.intervalLabel || formatIntervalLabel(window.intervalHours),
    cadenceValid: Boolean(window.cadenceValid),
    confidence,
    confidenceNote,
    state,
    provenance,
  };
}

/**
 * Derive alert events from the dashboard payload using per-coin thresholds.
 * Event time is the upstream observation timestamp, never browser Date.now().
 * Rules:
 *   PEG_BREAK   per-coin spot price drift from $1
 *   MIGRATION   matched opposing chain flows within 10% magnitude
 *   CHAIN_FLOW  unpaired per-chain supply delta above threshold
 *   NET_MINT / NET_BURN  coin-wide net supply change above threshold
 *   DOM_SHIFT   weekly change in a coin's share of tracked supply
 *   DATA_QUALITY invalid/non-finite/negative supply observations
 *
 * @param {object} data Dashboard payload.
 * @param {{detectedAt?:number|null}} [opts] Server detection time only; never used as event time.
 */
export function generateAlerts(data, opts = {}) {
  if (!data) return [];
  const alerts = [];
  const detectedAt = Number.isFinite(opts.detectedAt) ? opts.detectedAt : null;
  const coins = getActiveCoins();

  for (const cfg of coins) {
    const price = data?.cgSimple?.[cfg.coingeckoId]?.usd;
    const lastUpdatedAt = data?.cgSimple?.[cfg.coingeckoId]?.last_updated_at;
    const detail = data?.[`${cfg.symbol.toLowerCase()}Detail`];
    const provenance = { source: 'deflama+coingecko', coin: cfg.symbol };

    if (typeof price === 'number') {
      const devBps = bps(price);
      const absDev = Math.abs(devBps);
      let severity = null;
      if (absDev >= cfg.thresholds.pegCriticalBps) severity = 'CRITICAL';
      else if (absDev >= cfg.thresholds.pegWarnBps) severity = 'HIGH';
      if (severity) {
        const observedAt = tokenTsMs({ date: lastUpdatedAt });
        alerts.push(makeAlert({
          rule: 'PEG_BREAK',
          coin: cfg.symbol,
          severity,
          magnitude: absDev,
          headline: `${cfg.symbol} is ${devBps} bps ${devBps < 0 ? 'below' : 'above'} the $1 peg (price ${price.toFixed(4)}).`,
          explanation: `This is a secondary-market price observation, not a reserve or redemption proof.`,
          window: {
            sourceTsCurrent: observedAt,
            observedAt,
            cadenceValid: observedAt != null,
            intervalLabel: observedAt != null ? 'spot price observation' : 'observation interval unavailable',
          },
          confidence: observedAt != null ? 'high' : 'low',
          confidenceNote: observedAt != null ? 'Peg distance from live spot price.' : 'Spot timestamp missing; recency is unknown.',
          detectedAt,
          provenance: { ...provenance, field: 'cgSimple.usd' },
        }));
      }
    }

    const observations = Object.keys(detail?.chainBalances || {})
      .map((chain) => chainObservation(detail, chain))
      .filter(Boolean);

    for (const obs of observations) {
      if (obs.invalidSupply || !Number.isFinite(obs.current) || !Number.isFinite(obs.previous)) {
        alerts.push(makeAlert({
          rule: 'DATA_QUALITY',
          coin: cfg.symbol,
          chain: obs.chain,
          severity: 'WARNING',
          magnitude: Math.abs(obs.delta) || 0,
          headline: `${cfg.symbol} on ${obs.chain} failed supply validation (non-finite or negative circulating USD).`,
          explanation: 'This observation was quarantined. It is not a mint, burn, or migration event.',
          window: obs,
          confidence: 'low',
          confidenceNote: 'Invalid circulating-USD observation.',
          detectedAt,
          provenance,
        }));
      }
    }

    const usable = observations.filter((o) => !o.invalidSupply && Number.isFinite(o.delta));
    const positives = usable.filter((o) => o.delta >= cfg.thresholds.chainSpikeUsd);
    const negatives = usable.filter((o) => o.delta <= -cfg.thresholds.chainSpikeUsd);
    const { pairs, unpairedPos, unpairedNeg } = pairOpposingFlows(positives, negatives);
    const netSupplyDelta = usable.reduce((sum, o) => sum + o.delta, 0);
    const pairedChains = new Set();

    for (const pair of pairs) {
      const grossFlow = pair.grossFlow;
      const netCap = Math.max(MIGRATION_NET_FRAC * grossFlow, cfg.thresholds.megaSupplyUsd);
      const window = windowMeta([pair.from, pair.to]);
      const cadenceOk = window.cadenceValid;
      const confidence = cadenceOk ? 'high' : 'low';
      const headline = `${cfg.symbol} liquidity moved: ${pair.from.chain} → ${pair.to.chain}`;
      const netNote = Math.abs(netSupplyDelta) < netCap
        ? `net ${cfg.symbol} supply broadly unchanged (${signedUsd(netSupplyDelta)})`
        : `net ${cfg.symbol} supply ${signedUsd(netSupplyDelta)}`;
      alerts.push(makeAlert({
        rule: 'MIGRATION',
        coin: cfg.symbol,
        chains: [pair.from.chain, pair.to.chain],
        chain: pair.to.chain,
        severity: grossFlow >= 2 * cfg.thresholds.chainSpikeUsd ? 'HIGH' : 'WARNING',
        magnitude: grossFlow,
        grossFlow,
        netSupplyDelta,
        headline,
        explanation: `${fmtUsd(grossFlow)} gross chain movement; ${netNote}. This is a chain allocation correlation from successive circulating-supply snapshots, not evidence on its own of a depeg, whale, or reserve problem.`,
        window,
        confidence,
        confidenceNote: cadenceOk
          ? 'High: matched opposing chain movements.'
          : 'Low: matched opposing flows, but the observation interval is not a valid 24h window.',
        detectedAt,
        provenance,
      }));
      pairedChains.add(pair.from.chain);
      pairedChains.add(pair.to.chain);
    }

    const unpaired = [...unpairedPos, ...unpairedNeg].filter((o) => !pairedChains.has(o.chain));
    for (const spike of unpaired) {
      const severity = Math.abs(spike.delta) >= 2 * cfg.thresholds.chainSpikeUsd ? 'HIGH' : 'WARNING';
      const direction = spike.delta > 0 ? 'increased' : 'decreased';
      const confidence = spike.cadenceValid ? 'medium' : 'low';
      alerts.push(makeAlert({
        rule: 'CHAIN_FLOW',
        coin: cfg.symbol,
        chain: spike.chain,
        severity,
        magnitude: Math.abs(spike.delta),
        grossFlow: Math.abs(spike.delta),
        netSupplyDelta,
        headline: `${cfg.symbol} supply ${direction} by ${fmtUsd(spike.delta)} on ${spike.chain} ${spike.intervalLabel}.`,
        explanation: `Single-chain circulating-supply change from the latest two DefiLlama snapshots. This is not by itself a mint, burn, whale, or depeg conclusion.`,
        window: spike,
        confidence,
        confidenceNote: spike.cadenceValid
          ? 'Directional chain flow above threshold.'
          : 'Low: interval is outside the 20-28h 24h band.',
        detectedAt,
        provenance,
      }));
    }

    if (detail && Object.keys(detail.chainBalances || {}).length) {
      const total = netSupplyDelta;
      if (Math.abs(total) >= cfg.thresholds.megaSupplyUsd) {
        const rule = total >= 0 ? 'NET_MINT' : 'NET_BURN';
        const severity = Math.abs(total) >= 3 * cfg.thresholds.megaSupplyUsd ? 'CRITICAL' : 'HIGH';
        const window = windowMeta(usable);
        alerts.push(makeAlert({
          rule,
          coin: cfg.symbol,
          chains: usable.map((o) => o.chain),
          severity,
          magnitude: Math.abs(total),
          grossFlow: usable.reduce((sum, o) => sum + Math.abs(o.delta), 0),
          netSupplyDelta: total,
          headline: `${cfg.symbol} net supply ${total >= 0 ? 'increased' : 'decreased'} by ${fmtUsd(total)} across tracked chains ${window.intervalLabel}.`,
          explanation: `Coin-wide net circulating-USD change after summing every chain snapshot. Paired migrations are still shown separately when they match.`,
          window,
          confidence: window.cadenceValid ? 'medium' : 'low',
          confidenceNote: window.cadenceValid
            ? 'Net issuance or burn cleared the coin threshold.'
            : 'Low: net change cleared the threshold but the observation interval is not a valid 24h window.',
          detectedAt,
          provenance,
        }));
      }
    }
  }

  const supplyByCoin = {};
  for (const cfg of coins) {
    const detail = data?.[`${cfg.symbol.toLowerCase()}Detail`];
    const series = buildSupplySeries(detail);
    if (series.length >= 8) supplyByCoin[cfg.symbol] = series;
  }
  if (Object.keys(supplyByCoin).length >= 2) {
    for (const cfg of coins) {
      if (!supplyByCoin[cfg.symbol]) continue;
      const share = buildShareSeries(supplyByCoin, cfg.symbol);
      if (share.length < 8) continue;
      const latest = share[share.length - 1];
      const ref = share[share.length - 8];
      const drift = latest.share - ref.share;
      if (Math.abs(drift) >= 1) {
        const severity = Math.abs(drift) >= 3 ? 'HIGH' : 'WARNING';
        const hours = intervalHours(ref.date, latest.date);
        alerts.push(makeAlert({
          rule: 'DOM_SHIFT',
          coin: cfg.symbol,
          severity,
          magnitude: Math.abs(drift),
          headline: `${cfg.symbol} dominance ${drift > 0 ? 'gained' : 'lost'} ${Math.abs(drift).toFixed(1)} pts of tracked stablecoin supply over the observed share window.`,
          explanation: 'Share of the five tracked coins on this dashboard, not of the global stablecoin market.',
          window: {
            sourceTsCurrent: latest.date,
            sourceTsPrevious: ref.date,
            observedAt: latest.date,
            intervalHours: hours,
            cadenceValid: hours != null && hours >= 5 * 24 && hours <= 9 * 24,
            intervalLabel: formatIntervalLabel(hours),
          },
          confidence: hours != null && hours >= 5 * 24 && hours <= 9 * 24 ? 'medium' : 'low',
          confidenceNote: 'Dominance uses the latest vs ~7-point-prior share observations.',
          detectedAt,
          provenance: { source: 'deflama', field: 'share-series' },
        }));
      }
    }
  }

  return alerts.sort(
    (a, b) =>
      (SEVERITY_RANK[a.severity] ?? 3) - (SEVERITY_RANK[b.severity] ?? 3) ||
      (b.magnitude || 0) - (a.magnitude || 0)
  );
}

/**
 * Deterministic, rule-based "why it matters" guidance for an alert.
 * Replaces the on-demand AI explanation endpoint: no network call.
 */
export function alertExplanation(alert) {
  if (!alert) {
    return { whyItMatters: 'Alert context unavailable.', whatToWatch: 'Monitor the next refresh window.', confidence: null };
  }
  switch (alert.rule) {
    case 'PEG_BREAK':
      return {
        whyItMatters: `${alert.coin} is trading ${Math.abs(alert.magnitude)} bps from its $1 target. A move past the critical threshold typically reflects redemption pressure or market dislocations.`,
        whatToWatch: `Watch whether ${alert.coin} mean-reverts within 24h; sustained drift toward the critical band is the escalation trigger.`,
        confidence: Math.min(0.9, 0.4 + Math.abs(alert.magnitude) / 100),
      };
    case 'CHAIN_SPIKE':
    case 'CHAIN_FLOW':
      return {
        whyItMatters: `A single-chain circulating-supply move this large is a chain allocation change. It is not by itself a mint, burn, whale, or depeg.`,
        whatToWatch: 'Compare the offsetting chain, the net coin-wide delta, and the next snapshot. Reversal or a matching opposite flow points to migration rather than issuance.',
        confidence: alert.cadenceValid ? 0.7 : 0.4,
      };
    case 'MIGRATION':
      return {
        whyItMatters: `${alert.coin} shows matched opposing chain flows. That is a reallocation signature, not two independent supply shocks.`,
        whatToWatch: 'Watch whether net coin supply stays near unchanged on the next observation. A later net mint or burn is a separate event.',
        confidence: alert.cadenceValid ? 0.85 : 0.45,
      };
    case 'MEGA_SUPPLY':
    case 'NET_MINT':
    case 'NET_BURN':
      return {
        whyItMatters: 'A coin-wide net circulating-USD change on this scale shifts tracked stablecoin liquidity. It is still not proof of a named minter or a reserve problem.',
        whatToWatch: 'Cross-check the affected chains and whether a paired migration already explains most of the gross flow.',
        confidence: alert.cadenceValid ? 0.75 : 0.4,
      };
    case 'DATA_QUALITY':
      return {
        whyItMatters: 'The observation failed validation (missing interval, non-finite or negative supply). Publishing it as a market event would overstate confidence.',
        whatToWatch: 'Wait for the next valid snapshot before treating chain or peg figures as current.',
        confidence: 0.2,
      };
    case 'DOM_SHIFT':
      return {
        whyItMatters: `${alert.coin} is gaining or losing tracked supply share quickly, which changes the composition of on-chain stablecoin liquidity.`,
        whatToWatch: 'Confirm whether the shift is driven by new issuance or by migration to another chain.',
        confidence: 0.6,
      };
    default:
      return {
        whyItMatters: 'Rule-specific guidance is not available for this alert.',
        whatToWatch: 'Monitor the next refresh window.',
        confidence: null,
      };
  }
}
