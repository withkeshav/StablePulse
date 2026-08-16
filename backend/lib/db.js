import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

const SCHEMA = `
CREATE TABLE IF NOT EXISTS snapshots (
  coin              TEXT    NOT NULL,
  chain             TEXT    NOT NULL,
  ts                INTEGER NOT NULL,
  circulating_usd   REAL    NOT NULL,
  delta_24h_usd     REAL,
  PRIMARY KEY (coin, chain, ts)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_snapshots_ts ON snapshots(ts);

CREATE TABLE IF NOT EXISTS prices (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  coin             TEXT    NOT NULL,
  ts               INTEGER NOT NULL,
  price            REAL,
  change_24h       REAL,
  volume_24h_usd   REAL
);
CREATE INDEX IF NOT EXISTS idx_prices_coin_ts ON prices(coin, ts);

CREATE TABLE IF NOT EXISTS market_snapshots (
  ts                   INTEGER PRIMARY KEY,
  total_circulating_usd REAL,
  delta_24h_usd        REAL
);

CREATE TABLE IF NOT EXISTS intelligence (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ts           INTEGER NOT NULL,
  headline     TEXT,
  narrative    TEXT,
  implications TEXT,
  model        TEXT,
  meta         TEXT
);

-- Derived stress series, one row per coin per fetch cycle. INTEGER ts
-- matches the snapshots convention (epoch ms). Written by jobs/stress.js.
CREATE TABLE IF NOT EXISTS stress_series (
  ts                 INTEGER NOT NULL,
  symbol             TEXT    NOT NULL,
  peg_stress_index   REAL    NOT NULL,
  z_score            REAL    NOT NULL,
  raw_delta          REAL    NOT NULL,
  normalized_delta   REAL    NOT NULL,
  PRIMARY KEY (ts, symbol)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_stress_series_symbol_ts ON stress_series(symbol, ts);

-- Rule-based alert labels, one row per alert event. INTEGER ts. Written by
-- jobs/stress.js from the same generateAlerts() the frontend uses, so stored
-- history matches what the dashboard showed at the time.
CREATE TABLE IF NOT EXISTS labels (
  ts           INTEGER NOT NULL,
  symbol       TEXT    NOT NULL,
  alert_type   TEXT    NOT NULL,
  severity     TEXT    NOT NULL,
  explanation  TEXT    NOT NULL,
  magnitude    REAL,
  PRIMARY KEY (ts, symbol, alert_type)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_labels_symbol_ts ON labels(symbol, ts);
`;

const dataDir = process.env.DATA_DIR || path.join(here, '..', 'data');
mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'stablesense.db'));
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');
db.exec(SCHEMA);

export default db;
