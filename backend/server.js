import Fastify from 'fastify';
import { loadEnv } from './lib/env.js';
import db from './lib/db.js';
import { readJobs } from './lib/job-run.js';

loadEnv();

const PORT = Number(process.env.PORT || 8787);
const AI_CADENCE_MIN = Math.max(1, Number(process.env.AI_CADENCE_MIN || 120));
const app = Fastify({ logger: true });

app.get('/api/healthz', async () => {
  const market = db.prepare('SELECT MAX(ts) AS ts FROM market_snapshots').get();
  const snapshot = db.prepare('SELECT MAX(ts) AS ts FROM snapshots').get();
  const ai = db.prepare('SELECT MAX(ts) AS ts FROM intelligence').get();
  const events = db.prepare('SELECT COUNT(*) AS n, MAX(updated_at) AS ts FROM alert_events').get();
  const jobs = readJobs();
  const failed = Object.values(jobs).find((j) => j && j.finishedAt && !j.ok);
  return {
    ok: true,
    db: 'ok',
    lastMarketSync: market?.ts ?? null,
    lastSnapshotTs: snapshot?.ts ?? null,
    lastAiRun: ai?.ts ?? null,
    lastAlertEvent: events?.ts ?? null,
    alertEventCount: events?.n ?? 0,
    jobs,
    lastJobError: failed?.error ?? null,
    now: Date.now(),
  };
});

app.get('/api/ai', async () => {
  const row = db.prepare('SELECT headline, narrative, implications, model, ts FROM intelligence ORDER BY ts DESC LIMIT 1').get();
  if (!row) {
    return { intelligence: null };
  }
  const cadenceMs = AI_CADENCE_MIN * 60_000;
  return {
    intelligence: {
      headline: row.headline,
      narrative: row.narrative,
      implications: row.implications,
      model: row.model,
      ts: row.ts,
      nextUpdateAt: row.ts + cadenceMs,
      cadenceMin: AI_CADENCE_MIN,
    },
  };
});

app.get('/api/history', async (req) => {
  const { coin, chain, days = '30' } = req.query || {};
  const nDays = Math.max(1, Math.min(365, Number(days) || 30));
  const since = Date.now() - nDays * 86_400_000;

  if (coin) {
    const symbol = String(coin).toUpperCase();
    const rows = chain
      ? db
          .prepare('SELECT ts, circulating_usd FROM snapshots WHERE coin = ? AND chain = ? AND ts >= ? ORDER BY ts ASC')
          .all(symbol, String(chain), since)
      : db
          .prepare('SELECT ts, SUM(circulating_usd) AS value FROM snapshots WHERE coin = ? AND ts >= ? GROUP BY ts ORDER BY ts ASC')
          .all(symbol, since);
    return { data: rows.map((r) => ({ ts: r.ts, value: chain ? r.circulating_usd : r.value })) };
  }

  const chains = db
    .prepare('SELECT coin, chain, circulating_usd, ts FROM snapshots WHERE ts = (SELECT MAX(ts) FROM snapshots) ORDER BY circulating_usd DESC LIMIT 50')
    .all();
  return { data: chains };
});

// Stored alert labels (Pass 4). Returns recent alert history so the Learn tab
// can show real accumulated events as case studies. Optional coin filter.
app.get('/api/labels', async (req) => {
  const { coin, days = '30', limit = '50' } = req.query || {};
  const nDays = Math.max(1, Math.min(365, Number(days) || 30));
  const since = Date.now() - nDays * 86_400_000;
  const nLimit = Math.max(1, Math.min(200, Number(limit) || 50));
  const symbol = coin ? String(coin).toUpperCase() : null;
  const rows = symbol
    ? db.prepare('SELECT ts, symbol, alert_type, severity, explanation, magnitude FROM labels WHERE symbol = ? AND ts >= ? ORDER BY ts DESC LIMIT ?').all(symbol, since, nLimit)
    : db.prepare('SELECT ts, symbol, alert_type, severity, explanation, magnitude FROM labels WHERE ts >= ? ORDER BY ts DESC LIMIT ?').all(since, nLimit);
  return { data: rows };
});

// Stored stress series (Pass 4). Returns the per-coin peg stress index over time.
app.get('/api/stress', async (req) => {
  const { coin, days = '30' } = req.query || {};
  const nDays = Math.max(1, Math.min(365, Number(days) || 30));
  const since = Date.now() - nDays * 86_400_000;
  const symbol = coin ? String(coin).toUpperCase() : null;
  const rows = symbol
    ? db.prepare('SELECT ts, symbol, peg_stress_index, z_score, raw_delta, normalized_delta FROM stress_series WHERE symbol = ? AND ts >= ? ORDER BY ts ASC').all(symbol, since)
    : db.prepare('SELECT ts, symbol, peg_stress_index, z_score, raw_delta, normalized_delta FROM stress_series WHERE ts >= ? ORDER BY ts ASC').all(since);
  return { data: rows };
});

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function rowToAlert(row) {
  const chains = parseJson(row.involved_chains, []);
  const provenance = parseJson(row.provenance, {});
  return {
    id: row.event_id,
    rule: row.rule,
    classification: row.classification,
    coin: row.symbol,
    chain: chains[0] || null,
    chains,
    fromChain: provenance.fromChain || chains[0] || null,
    toChain: provenance.toChain || chains[1] || null,
    severity: row.severity,
    magnitude: row.magnitude,
    grossFlow: row.gross_flow,
    netSupplyDelta: row.net_supply_delta,
    headline: row.headline,
    rationale: row.headline,
    explanation: row.explanation,
    timestamp: row.observed_at,
    observedAt: row.observed_at,
    detectedAt: row.detected_at,
    publishedAt: row.published_at,
    sourceTsCurrent: row.source_ts_current,
    sourceTsPrevious: row.source_ts_previous,
    intervalHours: row.interval_hours,
    intervalLabel: row.interval_label,
    cadenceValid: Boolean(row.cadence_valid),
    confidence: row.confidence,
    state: row.state,
    provenance,
  };
}

// Canonical alert lifecycle. Open events are the current feed; history includes resolved rows.
app.get('/api/alerts', async (req) => {
  const { coin, days = '30', limit = '100', state = 'all' } = req.query || {};
  const nDays = Math.max(1, Math.min(365, Number(days) || 30));
  const since = Date.now() - nDays * 86_400_000;
  const nLimit = Math.max(1, Math.min(500, Number(limit) || 100));
  const symbol = coin ? String(coin).toUpperCase() : null;
  const wantedState = String(state || 'all').toLowerCase();
  const countRow = db.prepare('SELECT COUNT(*) AS n FROM alert_events').get();
  const persistedCount = countRow?.n || 0;

  let rows;
  if (symbol && wantedState !== 'all') {
    rows = db.prepare(
      `SELECT * FROM alert_events WHERE symbol = ? AND state = ? AND COALESCE(observed_at, detected_at, updated_at) >= ? ORDER BY COALESCE(observed_at, detected_at) DESC LIMIT ?`
    ).all(symbol, wantedState, since, nLimit);
  } else if (symbol) {
    rows = db.prepare(
      `SELECT * FROM alert_events WHERE symbol = ? AND COALESCE(observed_at, detected_at, updated_at) >= ? ORDER BY COALESCE(observed_at, detected_at) DESC LIMIT ?`
    ).all(symbol, since, nLimit);
  } else if (wantedState !== 'all') {
    rows = db.prepare(
      `SELECT * FROM alert_events WHERE state = ? AND COALESCE(observed_at, detected_at, updated_at) >= ? ORDER BY COALESCE(observed_at, detected_at) DESC LIMIT ?`
    ).all(wantedState, since, nLimit);
  } else {
    rows = db.prepare(
      `SELECT * FROM alert_events WHERE COALESCE(observed_at, detected_at, updated_at) >= ? ORDER BY COALESCE(observed_at, detected_at) DESC LIMIT ?`
    ).all(since, nLimit);
  }

  return {
    data: rows.map(rowToAlert),
    meta: {
      persistedCount,
      empty: persistedCount === 0,
      canonical: true,
    },
  };
});

app.listen({ host: '127.0.0.1', port: PORT });
