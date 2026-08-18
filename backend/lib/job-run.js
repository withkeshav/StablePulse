import { randomBytes } from 'node:crypto';
import db from './db.js';

function runId() {
  return randomBytes(8).toString('hex');
}

export function startJob(job) {
  const handle = { job, runId: runId(), startedAt: Date.now() };
  db.prepare(
    `INSERT INTO job_runs (job, run_id, started_at, finished_at, ok, error, source_ts)
     VALUES (@job, @run_id, @started_at, NULL, 0, NULL, NULL)
     ON CONFLICT(job) DO UPDATE SET
       run_id = excluded.run_id,
       started_at = excluded.started_at,
       finished_at = NULL,
       ok = 0,
       error = NULL,
       source_ts = NULL`
  ).run({ job: handle.job, run_id: handle.runId, started_at: handle.startedAt });
  return handle;
}

export function finishJob(handle, { ok = false, error = null, sourceTs = null } = {}) {
  if (!handle?.job) return;
  db.prepare(
    `UPDATE job_runs
     SET finished_at = ?, ok = ?, error = ?, source_ts = ?
     WHERE job = ?`
  ).run(
    Date.now(),
    ok ? 1 : 0,
    error ? String(error.message || error).slice(0, 500) : null,
    sourceTs ?? null,
    handle.job
  );
}

export function readJobs() {
  const rows = db.prepare(
    'SELECT job, run_id, started_at, finished_at, ok, error, source_ts FROM job_runs ORDER BY job ASC'
  ).all();
  const out = {};
  for (const row of rows) {
    out[row.job] = {
      runId: row.run_id,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      ok: Boolean(row.ok),
      error: row.error || null,
      sourceTs: row.source_ts,
    };
  }
  return out;
}
