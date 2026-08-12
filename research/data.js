// All sourced figures for the State of Stablecoins hub. Every number carries
// its source and as-of date. Where aggregators disagree, the range is given
// rather than a single silently-chosen number. The four highest-stakes claims (Treasury-holder
// ranking, GENIUS Act effective-date mechanics, SVB/USDC low, UST collapse
// figure) were verified against primary sources on 2026-08-12; see the
// `verifiedClaims` export and the methodology note in the footer.

export const AS_OF = '2026-08-12';

// --- the four manually-verified claims (see the methodology note in the footer) -
export const verifiedClaims = [
  {
    id: 'treasury-ranking',
    claim: 'Stablecoin-issuer Treasury-holder ranking',
    resolution: "Tether's reported ~$141B in T-bill holdings (Q1 2026 attestation) exceeds the holdings of Germany ($91.3B) and Norway ($104.4B) as of the US Treasury TIC Jan 2023 table; combined issuers' ~$182B exceeds Norway. The comparison is duration-mismatched: issuers hold short-dated T-bills, while TIC ranks total (long+short) foreign holdings.",
    sources: [
      { label: 'US Treasury TIC - Major Foreign Holders', url: 'https://ticdata.treasury.gov/Publish/mfh.txt' },
      { label: 'Tether transparency / reserves attestation', url: 'https://tether.to/en/transparency/' },
      { label: 'Circle reserve report', url: 'https://www.circle.com/en/transparency' },
    ],
  },
  {
    id: 'genius-effective-date',
    claim: 'GENIUS Act effective-date mechanics',
    resolution: "Signed July 17-18, 2025. Effective date per the statute is the earlier of 18 months after enactment or 120 days after primary federal regulators issue final rules; law-firm analysis (Morgan Lewis) estimates this at November 2026. Rulemaking was required within one year of enactment; rulemaking status changes monthly and should be re-verified before citing.",
    sources: [
      { label: 'Congress.gov S.1582', url: 'https://www.congress.gov/bill/119th-congress/senate-bill/1582' },
      { label: 'Morgan Lewis - GENIUS Act breakdown', url: 'https://www.morganlewis.com/pubs/2025/07/genius-act-passes-in-us-congress-a-breakdown-of-the-landmark-stablecoin-law' },
    ],
  },
  {
    id: 'svb-usdc-low',
    claim: 'SVB / USDC low',
    resolution: "USDC's secondary-market low was $0.8789 on the morning of March 11, 2023, per CoinGecko Research; specific Curve liquidity pools dropped below $0.82. Circle disclosed $3.3B (~8% of $40B reserves) stranded at Silicon Valley Bank. The peg recovered after the US government backstopped all SVB depositors.",
    sources: [
      { label: 'CoinGecko Research - Stablecoin Supply Impacted by SVB', url: 'https://www.coingecko.com/research/publications/stablecoins-supply-svb-impact' },
      { label: 'CNBC - USDC breaks dollar peg', url: 'https://www.cnbc.com/2023/03/11/stablecoin-usdc-breaks-dollar-peg-after-firm-reveals-it-has-3point3-billion-in-svb-exposure.html' },
    ],
  },
  {
    id: 'ust-collapse',
    claim: 'UST / Terra collapse figure',
    resolution: "UST's stablecoin supply peaked near $18B market cap before the depeg (Reuters, ScienceDirect); the combined UST + LUNA market-cap loss over the collapse was roughly $60B (CoinMarketCap data via Binance). The often-cited '$40B' is an ambiguous partial figure and is not used here unqualified.",
    sources: [
      { label: 'ScienceDirect - Anatomy of a Stablecoin failure', url: 'https://www.sciencedirect.com/science/article/abs/pii/S1544612322005359' },
      { label: 'Reuters - TerraUSD falls to 30 cents', url: 'https://www.reuters.com/technology/dollar-pegged-stablecoin-terrausd-falls-30-cents-2022-05-11/' },
      { label: 'Binance - The Collapse of LUNA and UST', url: 'https://www.binance.com/en/square/post/22931497315953' },
    ],
  },
];

// --- Section 1: taxonomy scale (mid-2026, ranges per research files) -----
export const taxonomy = [
  { id: 'fiat-usd', label: 'Fiat-USD', scale: '~$299-316B', asOf: 'mid-2026', examples: 'USDT, USDC', mechanism: 'Full reserve in cash + short-term US Treasuries; redemption at par; arbitrage enforces the peg. The dominant case the dashboard tracks.', why: 'Macro-relevant: the issuers are now structural buyers of US T-bills, tying crypto health to Treasury market liquidity.' },
  { id: 'fiat-non-usd', label: 'Fiat non-USD', scale: '~$2B', asOf: 'Aug 2026', examples: 'EURC, JPYC, XSGD', mechanism: 'Mechanically identical to USDT/USDC but in EUR, JPY, GBP, SGD. Thin order books and MiCA caps hold this category under 0.5% of supply.', why: 'The infrastructure for a 24/7 on-chain FX market; MiCA and Asian programs are policy attempts to break dollar dominance here.' },
  { id: 'commodity', label: 'Commodity-backed', scale: '~$4.6-6B', asOf: 'early-mid 2026', examples: 'PAXG, XAUT, KAG', mechanism: 'Token = allocated physical gold in vaults (London, Switzerland). Price tracks gold spot, not $1. No peg-break risk in the dollar sense; takes on gold volatility and redemption friction.', why: 'Digitizes the oldest safe-haven asset; ~96% of the category is gold. Silver and oil remain economically marginal.' },
  { id: 'crypto-synth', label: 'Crypto-collateralized / synthetic', scale: '~$13B', asOf: 'Aug 2026', examples: 'USDS/DAI, USDe, LUSD', mechanism: 'DAI/USDS: over-collateralized crypto vaults with liquidations. USDe: delta-neutral basis trade (spot long + short perp), funding rate pays yield. Peg enforced by code, not a bank promise.', why: 'Censorship-resistant dollar with no bank dependency; risk migrates to smart-contract bugs, liquidation cascades, and (USDe) funding-rate inversion.' },
  { id: 'algorithmic', label: 'Algorithmic', scale: 'near zero as a pure category', asOf: 'May 2026', examples: 'UST (dead), Frax v2 (re-collateralized)', mechanism: 'No direct backing; a sister token absorbs sell pressure via mint/burn. UST May 2022 is the case study: the death spiral erased ~$60B combined in roughly a week.', why: 'Banned or excluded from regulated payment-stablecoin status everywhere (MiCA, GENIUS, HK, UAE). A cautionary tale, not a live design.' },
  { id: 'rwa', label: 'RWA / tokenized funds', scale: '~$20-40B', asOf: 'mid-2026', examples: 'BUIDL, BENJI, OUSG', mechanism: 'Tokenized fund shares holding Treasuries / private credit. Legally securities, not payment instruments: pay yield, require KYC, restrict transfers, T+1 redemption.', why: 'Under the GENIUS Act the dividing line is yield and access, not the underlying asset. Institutions pair stablecoin (checking) with tokenized fund (yield sweep).' },
];

// token comparison table rows
export const tokens = [
  { token: 'USDT', category: 'fiat-usd', peg: 'USD', issuer: 'Tether', mcap: '~$183B', chain: 'Multi-chain', asOf: '2026-Q2' },
  { token: 'USDC', category: 'fiat-usd', peg: 'USD', issuer: 'Circle', mcap: '~$72B', chain: 'Multi-chain', asOf: '2026-Q1' },
  { token: 'DAI/USDS', category: 'crypto-synth', peg: 'USD (on-chain)', issuer: 'Sky (ex-MakerDAO)', mcap: '~$10.6B', chain: 'Ethereum, Arbitrum, Solana', asOf: 'Aug 2026' },
  { token: 'USDe', category: 'crypto-synth', peg: 'USD (synthetic)', issuer: 'Ethena', mcap: '~$2.3-6B', chain: 'Ethereum, Solana, Base', asOf: 'Aug 2026 (volatile)' },
  { token: 'PAXG', category: 'commodity', peg: 'Gold (1 oz)', issuer: 'Paxos', mcap: '~$1.9-2.55B', chain: 'Ethereum', asOf: 'early 2026' },
  { token: 'XAUT', category: 'commodity', peg: 'Gold (1 oz)', issuer: 'Tether (TG Commodities)', mcap: '~$2.67-2.9B', chain: 'Ethereum, Tron', asOf: 'early 2026' },
  { token: 'EURC', category: 'fiat-non-usd', peg: 'EUR', issuer: 'Circle', mcap: '~$456M', chain: 'Ethereum, Solana, Base', asOf: 'Aug 2026' },
  { token: 'JPYC', category: 'fiat-non-usd', peg: 'JPY', issuer: 'JPYC Inc.', mcap: '~$55M', chain: 'Ethereum, Polygon', asOf: 'Aug 2026' },
  { token: 'BUIDL', category: 'rwa', peg: '$1 (fund NAV)', issuer: 'BlackRock / Securitize', mcap: '~$2-2.8B', chain: 'Ethereum, Solana, Polygon', asOf: 'mid-2026' },
  { token: 'BENJI', category: 'rwa', peg: '$1 (fund NAV)', issuer: 'Franklin Templeton', mcap: '~$368M-2.4B', chain: 'Stellar, Ethereum, Solana', asOf: 'mid-2026' },
  { token: 'OUSG', category: 'rwa', peg: '$1 (fund NAV)', issuer: 'Ondo Finance', mcap: '~$700M', chain: 'Ethereum, Solana, Polygon', asOf: 'mid-2026' },
];

// --- Section 2: scale and trajectory --------------------------------------
export const marketCapHistory = [
  // year-end total stablecoin market cap, USD billions
  { year: 2017, cap: 1.5 },
  { year: 2018, cap: 3 },
  { year: 2019, cap: 5.7 },
  { year: 2020, cap: 27 },
  { year: 2021, cap: 163 },
  { year: 2022, cap: 138 }, // post-UST crash
  { year: 2023, cap: 130 },
  { year: 2024, cap: 205 },
  { year: 2025, cap: 308 },
  { year: 2026, cap: 316 }, // mid-2026 snapshot
];

export const scaleMarkers = [
  { year: 2022, month: 5, label: 'UST collapse', desc: '~$60B combined UST+LUNA erased in ~1 week' },
  { year: 2023, month: 3, label: 'SVB / USDC', desc: 'USDC low $0.8789; $3.3B stranded at SVB' },
  { year: 2025, month: 7, label: 'GENIUS Act', desc: 'Signed July 17-18, 2025; effective ~Nov 2026' },
];

export const projections = [
  { name: 'IMF', range: '$0.5-3.7T', low: 500, high: 3700, by: '2030', note: 'Wide, official; base case ~$1.5-2T' },
  { name: 'Citi', range: '$1.9-4T', low: 1900, high: 4000, by: '2030', note: 'Base $1.9T, bull $4T' },
  { name: 'Bain', range: 'up to $3.8T', low: 1900, high: 3800, by: '2030', note: '~12x current' },
  { name: 'Standard Chartered', range: '$2T', low: 2000, high: 2000, by: '2028', note: 'Aggressive near-term slope' },
  { name: 'JPMorgan', range: '~$500B', low: 500, high: 500, by: '2028', note: 'Conservative' },
];

// --- Section 3: Treasury holdings (verified) ----------------------------
export const treasuryHolders = [
  { name: 'Japan', type: 'sovereign', value: 1104.4 },
  { name: 'China', type: 'sovereign', value: 859.4 },
  { name: 'United Kingdom', type: 'sovereign', value: 668.3 },
  { name: 'Luxembourg', type: 'sovereign', value: 318.2 },
  { name: 'Switzerland', type: 'sovereign', value: 290.5 },
  { name: 'Cayman Islands', type: 'sovereign', value: 285.3 },
  { name: 'Canada', type: 'sovereign', value: 254.1 },
  { name: 'Ireland', type: 'sovereign', value: 253.4 },
  { name: 'Taiwan', type: 'sovereign', value: 234.6 },
  { name: 'India', type: 'sovereign', value: 232.0 },
  { name: 'Tether (issuer)', type: 'issuer', value: 141, note: 'Q1 2026 attestation' },
  { name: 'Norway', type: 'sovereign', value: 104.4 },
  { name: 'Germany', type: 'sovereign', value: 91.3 },
  { name: 'UAE', type: 'sovereign', value: 64.9 },
  { name: 'Combined issuers (4)', type: 'issuer', value: 182.4, note: 'Tether+Circle+First Digital+Paxos' },
];

// --- Section 4: banks ----------------------------------------------------
export const bankCallouts = [
  { label: 'NY Fed (Feb 2026, Staff Report 1185)', stat: 'Banks exposed to stablecoin flows lend less relative to peers.', detail: 'First direct evidence of liquidity-driven disintermediation; partner banks run "narrow" to absorb flow volatility.' },
  { label: 'White House CEA (Apr 2026)', stat: 'Minimal lending impact modeled.', detail: 'Assumes a small baseline market; criticized by Americans for Financial Reform and the Consumer Bankers Association as "built on favorable assumptions."' },
];

// --- Section 5: cross-border ---------------------------------------------
export const remittanceCost = {
  traditional: { feePct: 4.65, fixedUsd: 245, days: '3-5 business days', label: 'Traditional wire' },
  stablecoin: { networkFeeUsd: 0.10, offrampSpreadPct: 0.25, includeOfframp: false, days: 'seconds', label: 'Stablecoin rails' },
};

export const corridors = [
  { region: 'Latin America', detail: '~$1.5T in crypto 2022-2025, predominantly stablecoins; Argentina >60% of exchange crypto purchases are stablecoins; Brazil ~90% of crypto volume.', country: 'Argentina, Brazil' },
  { region: 'Sub-Saharan Africa', detail: 'Highest remittance costs globally (8.78% avg); Nigeria receives ~60% of regional stablecoin inflows since 2019, uses USDT for cross-border trade.', country: 'Nigeria' },
  { region: 'UAE-India', detail: "World largest remittance route; businesses convert AED to stablecoins for instant settlement into India.", country: 'UAE, India' },
];

// --- Section 6: dollarization --------------------------------------------
export const dollarizationCountries = [
  { country: 'Turkey', gdpPct: 4.3, detail: 'Highest share in the world (Chainalysis); USDT/TRY top local trading pair; savings vehicle against lira depreciation.' },
  { country: 'Argentina', gdpPct: null, detail: '60% of exchange crypto purchases are USDT/USDC; workers convert wages on receipt; landlords accept USDT for rent.' },
  { country: 'Nigeria', gdpPct: null, detail: '~60% of sub-Saharan Africa stablecoin inflows since 2019; IMF reports ~$59B crypto inflows Jul 2023-Jun 2024.' },
  { country: 'Lebanon', gdpPct: null, detail: 'Crypto volume +120% YoY in 2022; street vendors accept USDT at a premium over cash dollars.' },
  { country: 'Venezuela', gdpPct: null, detail: 'USDT P2P premium spiked ~40% overnight during early-2026 crisis; the state itself reportedly used USDT for oil sales.' },
];

// --- Section 7: depegs ---------------------------------------------------
export const depegs = [
  {
    id: 'ust',
    name: 'UST / Terra',
    date: 'May 2022',
    low: '~$0.00 (death spiral)',
    spark: [1.0, 0.99, 0.98, 0.85, 0.6, 0.3, 0.1, 0.02, 0.01],
    mech: "Algorithmic: UST relied on a sister token (LUNA) burning to absorb sell pressure. When confidence cracked, the mechanism minted ever more LUNA, hyperinflating it and crashing both tokens. Combined UST+LUNA loss ~$60B in roughly a week.",
  },
  {
    id: 'svb',
    name: 'USDC / SVB',
    date: 'March 2023',
    low: '$0.8789 (Mar 11)',
    spark: [1.0, 1.0, 1.0, 0.99, 0.97, 0.88, 0.88, 0.99, 1.0],
    mech: "Circle held $3.3B (~8% of backing) at Silicon Valley Bank. When SVB failed, USDC dropped to $0.8789 (CoinGecko Research); Curve pools went below $0.82. Recovered after the US government backstopped all SVB depositors.",
  },
  {
    id: 'usde',
    name: 'USDe wobble',
    date: 'October 2025',
    low: '$0.62 (some DEXs)',
    spark: [1.0, 1.01, 1.0, 0.98, 0.85, 0.62, 0.78, 0.95, 0.99],
    mech: 'Ethena USDe depegged to $0.62 on some DEXs during a funding-rate stress event; recovered as hedges rebalanced. Illustrates the synthetic-dollar risk: funding rates can flip negative and erode reserves in bear markets.',
  },
];

// --- Section 8: regulation ----------------------------------------------
export const regulation = [
  { jurisdiction: 'United States', framework: 'GENIUS Act', status: 'Signed Jul 2025; effective ~Nov 2026', pegs: 'USD', algorithmic: 'Banned', rules: '1:1 cash/T-bills/repo; no yield to holders; bank + nonbank PPSI; <$10B state path' },
  { jurisdiction: 'European Union', framework: 'MiCA', status: 'Fully effective Jul 1, 2026', pegs: 'EUR focus; other currencies capped', algorithmic: 'Banned in practice', rules: 'EMTs (single fiat) + ARTs (basket); 30/60% bank deposit quota; non-euro daily caps' },
  { jurisdiction: 'United Kingdom', framework: 'FSMA / FCA', status: 'Final rulebook Jun 2026; in force Oct 2027', pegs: 'GBP focus', algorithmic: 'Banned in practice', rules: '100% HQLA; 1% capital (diluted from 2%); no yield; BoE oversight for systemic' },
  { jurisdiction: 'Japan', framework: 'Payment Services Act', status: 'Live (2023, updated Jun 2025); foreign coins via licensed distributors from Jun 1 2026', pegs: 'JPY; USD via distributor', algorithmic: 'Banned', rules: 'Issuers limited to banks/trust/transfer providers; up to 50% gov bonds' },
  { jurisdiction: 'Singapore', framework: 'MAS Stablecoin Framework', status: 'Live (2023, legislation mid-2026)', pegs: 'SGD + G10', algorithmic: 'Banned in practice', rules: '100% segregated reserves; monthly independent checks; MPI license' },
  { jurisdiction: 'Hong Kong', framework: 'Stablecoins Ordinance', status: 'Effective Aug 1, 2025; first licenses Apr 2026', pegs: 'HKD + foreign', algorithmic: 'Explicitly banned', rules: 'HK$25M capital min; 100% reserve at market value' },
  { jurisdiction: 'UAE', framework: 'CBUAE Payment Token Reg', status: 'Live (Aug 2024)', pegs: 'AED focus; fiat', algorithmic: 'Banned in practice', rules: '100% fiat backing; first licensed AED token late 2024' },
  { jurisdiction: 'India', framework: 'Pending / ambiguous', status: 'Debated 2025-2026', pegs: 'n/a', algorithmic: 'n/a', rules: 'No explicit law; 30% tax; RBI favors CBDC; FEMA classification uncertain' },
];

// --- Section 9: reality check -------------------------------------------
export const realityCheck = [
  { label: 'US money-market funds', value: 7900, unit: '$B', note: 'ICI, Aug 2026' },
  { label: 'US gold ETFs', value: 530, unit: '$B', note: 'World Gold Council, Jul 2026' },
  { label: 'Fiat-pegged stablecoins', value: 316, unit: '$B', note: 'mid-2026 snapshot' },
  { label: 'RWA ex-stablecoins', value: 24, unit: '$B', note: '~$20-40B range, rwa.xyz 2026' },
  { label: 'Tokenized gold', value: 6, unit: '$B', note: '~$5-8B, ~70% of tokenized commodities' },
];

// --- deduplicated source list (merged from all 3 research files) ---------
export const sources = [
  { id: 'tic', label: 'US Treasury TIC - Major Foreign Holders of Treasuries', url: 'https://ticdata.treasury.gov/Publish/mfh.txt' },
  { id: 'tether-transp', label: 'Tether transparency / reserves attestation', url: 'https://tether.to/en/transparency/' },
  { id: 'circle-transp', label: 'Circle reserve report', url: 'https://www.circle.com/en/transparency' },
  { id: 'congress-genius', label: 'Congress.gov - GENIUS Act (S.1582)', url: 'https://www.congress.gov/bill/119th-congress/senate-bill/1582' },
  { id: 'morganlewis-genius', label: 'Morgan Lewis - GENIUS Act breakdown', url: 'https://www.morganlewis.com/pubs/2025/07/genius-act-passes-in-us-congress-a-breakdown-of-the-landmark-stablecoin-law' },
  { id: 'coingecko-svb', label: 'CoinGecko Research - Stablecoin Supply Impacted by SVB', url: 'https://www.coingecko.com/research/publications/stablecoins-supply-svb-impact' },
  { id: 'cnbc-svb', label: 'CNBC - USDC breaks dollar peg', url: 'https://www.cnbc.com/2023/03/11/stablecoin-usdc-breaks-dollar-peg-after-firm-reveals-it-has-3point3-billion-in-svb-exposure.html' },
  { id: 'sd-terra', label: 'ScienceDirect - Anatomy of a Stablecoin failure (Terra-Luna)', url: 'https://www.sciencedirect.com/science/article/abs/pii/S1544612322005359' },
  { id: 'reuters-terra', label: 'Reuters - TerraUSD falls to 30 cents', url: 'https://www.reuters.com/technology/dollar-pegged-stablecoin-terrausd-falls-30-cents-2022-05-11/' },
  { id: 'binance-terra', label: 'Binance - The Collapse of LUNA and UST', url: 'https://www.binance.com/en/square/post/22931497315953' },
  { id: 'ecb-mpb', label: 'ECB Macroprudential Bulletin - euro stablecoins and sovereign bonds', url: 'https://www.ecb.europa.eu/press/financial-stability-publications/macroprudential-bulletin/html/ecb.mpbu202604_05.en.html' },
  { id: 'fed-feds', label: 'Federal Reserve FEDS Note - Banks in the Age of Stablecoins', url: 'https://www.federalreserve.gov/econres/notes/feds-notes/banks-in-the-age-of-stablecoins-implications-for-deposits-credit-and-financial-intermediation-20251217.html' },
  { id: 'bis-wp1370', label: 'BIS Working Paper 1370 - Dollarisation and monetary control', url: 'https://bis.org/publ/work1370.pdf' },
  { id: 'bis-aer', label: 'BIS Annual Economic Report - Anchoring trust in money', url: 'https://www.bis.org/review/r251216i.pdf' },
  { id: 'imf-par-to-pressure', label: 'IMF WP 2026/005 - From Par to Pressure', url: 'https://www.imf.org/en/publications/wp/issues/2026/01/16/from-par-to-pressure-liquidity-redemptions-and-fire-sales-with-a-systemic-stablecoin-573271' },
  { id: 'coingecko-rwa', label: 'CoinGecko Research - RWA Report 2026', url: 'https://www.coingecko.com/research/publications/rwa-report-2026' },
  { id: 'rwa-xyz', label: 'rwa.xyz - RWA tokenization market data', url: 'https://rwa.xyz' },
  { id: 'defillama-stables', label: 'DefiLlama - Stablecoins dashboard', url: 'https://defillama.com/stablecoins' },
  { id: 'coindesk-tether-q2', label: 'CoinDesk - Tether Q2 2026 results', url: 'https://www.coindesk.com/markets/2026/03/13/circle-overtakes-blackrock-in-tokenized-treasuries-as-market-hits-record-usd11-billion' },
  { id: 'worldbank-remittance', label: 'World Bank Remittance Prices Worldwide', url: 'https://www.remittanceprices.worldbank.org' },
  { id: 'chainalysis-geo', label: 'Chainalysis Geography of Cryptocurrency 2025', url: 'https://www.chainalysis.com/reports/2025-crypto-crimes-report' },
  { id: 'visa-stablecoins', label: 'Visa - Stablecoin fosters USD dominance in emerging markets', url: 'https://coinmarketcap.com/academy/article/visa-stablecoin-fosters-us-dollar-dominance-in-emerging-markets' },
  { id: 'reuters-uk', label: 'Reuters - UK dilutes stablecoin capital requirement', url: 'https://www.reuters.com/business/finance/uk-dilutes-stablecoin-capital-requirement-final-crypto-rulebook-2026-06-29/' },
  { id: 'hkma-ord', label: 'Hong Kong Stablecoins Ordinance', url: 'https://www.mondaq.com/hongkong/fin-tech/1652738/hong-kongs-stablecoins-ordinance-to-take-effect-on-1-august-2025-welcoming-a-new-era-for-virtual-asset-regulation' },
  { id: 'cbuae-reg', label: 'CBUAE Payment Token Services Regulation', url: 'https://uaefintechvibes.com/uae-stablecoin-regulations-2026-cbuae/' },
  { id: 'tiger-research-asia', label: 'Tiger Research - 2026 Asia Stablecoin Market Outlook', url: 'https://reports.tiger-research.com/p/2026-asia-stablecoin-market-overview-eng' },
  { id: 'scorechain-mica', label: 'Scorechain - EU Stablecoin Regulation under MiCA', url: 'https://www.scorechain.com/blog/eu-stablecoin-regulation-mica' },
  { id: 'nyfed-sr1185', label: 'NY Fed Staff Report 1185 - Stablecoin Disintermediation', url: 'https://www.newyorkfed.org/research/staff_reports/sr1185' },
  { id: 'whitehouse-cea', label: 'White House CEA - GENIUS Act fact sheet / analysis', url: 'https://www.whitehouse.gov/' },
];