import Fastify from 'fastify';
import { loadEnv } from './lib/env.js';
import db from './lib/db.js';

loadEnv();

const PORT = Number(process.env.PORT || 8787);
const AI_CADENCE_MIN = Math.max(1, Number(process.env.AI_CADENCE_MIN || 120));
const app = Fastify({ logger: true });

app.get('/api/healthz', async () => {
  const market = db.prepare('SELECT MAX(ts) AS ts FROM market_snapshots').get();
  const ai = db.prepare('SELECT MAX(ts) AS ts FROM intelligence').get();
  return {
    ok: true,
    db: 'ok',
    lastMarketSync: market?.ts ?? null,
    lastAiRun: ai?.ts ?? null,
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

app.listen({ host: '127.0.0.1', port: PORT });
