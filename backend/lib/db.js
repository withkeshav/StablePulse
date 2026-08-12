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
`;

const dataDir = process.env.DATA_DIR || path.join(here, '..', 'data');
mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'stablesense.db'));
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');
db.exec(SCHEMA);

export default db;
