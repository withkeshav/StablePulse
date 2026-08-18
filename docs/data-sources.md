# Data Sources

Everything StableSense shows comes from two keyless, CORS-open upstreams, fetched either browser-direct (live data) or by the backend cron jobs (history + AI).

## Upstreams

| Source | Provides | Auth | CORS |
|---|---|---|---|
| [DefiLlama Stablecoins](https://stablecoins.llama.fi) | Per-coin supply, chain distribution, aggregate market cap, per-chain daily history | None | Open |
| [CoinGecko](https://www.coingecko.com/en/api) | Spot prices, 24h change/volume, 90-day price charts, exchange tickers | None | Open |

## Endpoints

| Endpoint | Used by | Cadence |
|---|---|---|
| `GET https://stablecoins.llama.fi/stablecoins` | Frontend (60s throttle), backend `jobs/fetch.js` | 10 min (backend) |
| `GET https://stablecoins.llama.fi/stablecoin/{id}` | Frontend (1h cache-first), backend `jobs/fetch.js` | 10 min (backend) |
| `GET https://api.coingecko.com/api/v3/simple/price` | Frontend (60s throttle), backend `jobs/fetch.js` | 10 min (backend) |
| `GET https://api.coingecko.com/api/v3/coins/{id}/market_chart` | Frontend (lazy, coin tab) | 5 min cache |
| `GET https://api.coingecko.com/api/v3/coins/{id}/tickers` | Frontend (lazy, coin tab) | 5 min cache |

## Rate-limit posture

- **Browser-direct:** each visitor pays their own IP's rate limit; the 60s throttle and inflight dedupe keep the frontend well within CoinGecko's free tier (~10-30 req/min/IP). DefiLlama is more generous.
- **Backend:** a single VPS IP makes the 10-min fetch cadence the binding constraint; both upstreams comfortably absorb 5 coins x 2 endpoints every 10 minutes.

## Freshness

The dashboard shows three clocks (`src/lib/freshness.js`), not one "last updated" time:

- **Checked:** when this browser fetch succeeded.
- **Market observed:** upstream observation time (CoinGecko `last_updated_at` when present; otherwise the assembled payload). DefiLlama daily supply can be several hours old and still on cadence.
- **Historical snapshot:** optional SQLite last-sync from `/api/healthz`. If the backend is not connected, this clock says so and does not mark a successful live fetch as Unavailable.

Overall state is Current / Delayed / Stale / Unavailable from the market (or checked) clock, with supply cadence treating under 28h as Current. AI narratives follow `AI_CADENCE_MIN` (default 120 min).

## Privacy

- Browser-direct fetches come from the visitor's own IP (no central aggregator, no API keys exposed).
- Optional backend reads (`/api/healthz`, `/api/ai`, `/api/alerts`, `/api/history`) contain no PII.
