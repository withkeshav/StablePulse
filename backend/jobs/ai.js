import { getActiveCoins } from '../../src/utils/coin-config.js';
import { loadEnv } from '../lib/env.js';
import db from '../lib/db.js';

loadEnv();

const AI_CADENCE_MIN = Math.max(1, Number(process.env.AI_CADENCE_MIN || 120));
const BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const FALLBACK_MODEL = process.env.OPENAI_FALLBACK_MODEL || '';

const SYSTEM_PROMPT = [
  'You are a stablecoin market analyst writing a short, factual brief for a dashboard.',
  'Rules: only use the provided numbers; never invent figures or chains; mention concrete coins and chains; 2-4 sentences total; no markdown; no emojis.',
  'Return valid JSON only with exactly these keys:',
  '  "headline": string, at most 120 characters',
  '  "narrative": string, at most 400 characters',
  '  "implications": string, at most 300 characters',
].join('\n');

function skipIfWithinCadence() {
  const row = db.prepare('SELECT MAX(ts) AS ts FROM intelligence').get();
  if (row?.ts && Date.now() - row.ts < AI_CADENCE_MIN * 60_000) {
    console.log(`[ai] last run ${Math.round((Date.now() - row.ts) / 60000)}m ago, within ${AI_CADENCE_MIN}m cadence; skipping`);
    process.exit(0);
  }
}

function buildContext() {
  const lines = [];
  const market = db.prepare('SELECT * FROM market_snapshots ORDER BY ts DESC LIMIT 1').get();
  if (market) {
    const delta = typeof market.delta_24h_usd === 'number' ? `${market.delta_24h_usd >= 0 ? '+' : ''}$${(market.delta_24h_usd / 1e9).toFixed(2)}B` : 'n/a';
    lines.push(`Total stablecoin market cap: $${(market.total_circulating_usd / 1e9).toFixed(2)}B (24h ${delta})`);
  }

  for (const coin of getActiveCoins()) {
    const latest = db
      .prepare(
        `SELECT chain, circulating_usd, delta_24h_usd FROM snapshots
         WHERE coin = ? AND ts = (SELECT MAX(ts) FROM snapshots WHERE coin = ?)
         ORDER BY circulating_usd DESC LIMIT 5`
      )
      .all(coin.symbol, coin.symbol);
    if (!latest.length) continue;
    const total = latest.reduce((sum, r) => sum + r.circulating_usd, 0);
    const top = latest
      .slice(0, 3)
      .map((r) => {
        const delta = typeof r.delta_24h_usd === 'number' ? `${r.delta_24h_usd >= 0 ? '+' : ''}$${(r.delta_24h_usd / 1e6).toFixed(0)}M` : 'n/a';
        return `${r.chain} $${(r.circulating_usd / 1e9).toFixed(2)}B (${delta} 24h)`;
      })
      .join('; ');
    const price = db.prepare('SELECT price, change_24h FROM prices WHERE coin = ? ORDER BY ts DESC LIMIT 1').get(coin.symbol);
    const spot = price?.price != null ? `$${price.price.toFixed(4)} (${price.change_24h ?? 'n/a'}% 24h)` : 'n/a';
    lines.push(`${coin.symbol}: total $${(total / 1e9).toFixed(2)}B. Top chains: ${top}. Spot ${spot}.`);
  }

  return lines.join('\n');
}

async function callModel(model) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.OPENAI_API_KEY || ''}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `StablePulse snapshot data:\n${buildContext()}` },
      ],
      temperature: 0.4,
      max_tokens: 500,
    }),
  });
  if (!res.ok) throw new Error(`model ${model} returned ${res.status}`);
  const payload = await res.json();
  const content = payload?.choices?.[0]?.message?.content || '';
  if (!content) throw new Error(`model ${model} returned empty content`);
  return content;
}

function parse(content) {
  try {
    const obj = JSON.parse(content);
    return {
      headline: String(obj.headline || '').slice(0, 140),
      narrative: String(obj.narrative || '').slice(0, 500),
      implications: String(obj.implications || '').slice(0, 360),
    };
  } catch {
    const text = content.trim().replace(/```json\s*/g, '').replace(/```/g, '');
    return {
      headline: text.slice(0, 140),
      narrative: text.slice(0, 500),
      implications: '',
    };
  }
}

skipIfWithinCadence();

if (!process.env.OPENAI_API_KEY) {
  console.error('[ai] OPENAI_API_KEY is not set; skipping narrative generation');
  process.exit(1);
}

let content;
let modelUsed = MODEL;
try {
  content = await callModel(MODEL);
} catch (err) {
  console.error(`[ai] primary model failed: ${err.message}`);
  if (!FALLBACK_MODEL || FALLBACK_MODEL === MODEL) {
    console.error('[ai] no fallback available; aborting');
    process.exit(1);
  }
  modelUsed = FALLBACK_MODEL;
  content = await callModel(FALLBACK_MODEL);
}

const parsed = parse(content);
db.prepare(
  'INSERT INTO intelligence (ts, headline, narrative, implications, model, meta) VALUES (?, ?, ?, ?, ?, ?)'
).run(Date.now(), parsed.headline, parsed.narrative, parsed.implications, modelUsed, JSON.stringify({ source: 'cron' }));

console.log(`[ai] saved narrative (${modelUsed}): ${parsed.headline}`);
