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

- DefiLlama daily history is updated a few times per day (daily data points).
- CoinGecko spot prices are near real-time.
- History snapshots land in the backend every 10 minutes; AI narratives follow `AI_CADENCE_MIN` (default 120 min).

## Privacy

- Browser-direct fetches come from the visitor's own IP (no central aggregator, no API keys exposed).
- `/api/ai` is the only backend call and contains no PII.
