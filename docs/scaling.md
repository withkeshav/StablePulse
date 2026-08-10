# Worker Scaling Playbook

Guidance for the **backend worker** (separate repository) that aggregates data and serves `/api/dashboard`. This repo only contains the frontend; the budgets below shape how many coins it can safely support.

## Free-tier budgets (Cloudflare Workers)

- **CPU:** 10 ms per invocation.
- **Subrequests:** 50 per request.
- Each coin adds DefiLlama + CoinGecko fetches and JSON parsing, so every coin costs real CPU and subrequest budget.

## Principles

1. **Keep `ACTIVE_STABLECOINS` as a worker env var**, not baked into a build. Adding a coin then never requires a frontend redeploy, and the frontend list stays in sync via config.
2. **Round-robin coins across cron runs.** Process 1-2 coins per run so each invocation stays under the 10 ms CPU budget. A coin's data is updated on its turn; the dashboard serves cached values in between.
3. **Cache raw upstream responses in Workers KV.** Parse only the fields the dashboard needs. Reuse cached upstream data across runs.
4. **Split aggregation across multiple workers if it grows** (the free plan allows 100). Each worker handles a coin subset; a dashboard worker merges the results into the single cached payload.
5. **Generate the AI narrative during cron**, not on request. Users never wait on the model; the cached payload ships with `intelligence` precomputed.

## Suggested topology at N coins

| Coins | Topology |
|---|---|
| 2-3 | Single worker, all coins each run (still within 10 ms). |
| 4-8 | Single worker, round-robin 1-2 coins per run + KV cache. |
| 8+ | Multiple aggregator workers (one per coin group) + one dashboard/merge worker. |

## KV cache design

- Key `dashboard:<last 5-min bucket>` stores the fully assembled payload (minus volatile timestamps) so `/api/dashboard` is a pure KV read.
- Key `raw:<coin>:<endpoint>` stores upstream JSON per coin; TTL aligned to cron cadence.
- Key `alert-explain:<alertId>` stores AI explanations; TTL generous (alerts are immutable, explanation stable).

## Backpressure and staleness

- Serve stale KV while a fresh aggregation is in progress (read-through cache).
- `lastUpdated` in the payload tells the frontend how fresh the data is; the frontend keeps its own 20s fetch timeout.
- If upstream is down, return the last cached payload rather than a 5xx, so the dashboard stays usable.

## Monitoring

- Log per-run CPU, subrequest count, and KV hits/misses.
- Alert on consecutive cron failures for any coin.
- Watch the free-tier usage dashboard monthly; upgrade only when sustained.
