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

// Yield-bearing stablecoin debate (extends Section 4). The GENIUS Act
// prohibits payment stablecoins from paying interest; yield-bearing variants
// compete with bank deposits and MMFs. Both sides, cited, neutral.
export const yieldDebate = [
  { label: 'Prohibition view (GENIUS Act, Jul 2025)', stat: 'Payment stablecoins may not pay interest or yield.', detail: 'CRS IF13173/IF13174 outline the tension between stablecoins as payment mechanisms versus savings vehicles. The Act draws a clear boundary between payments and deposit-taking.' },
  { label: 'Macro-stability view (State Street, Apr 2026)', stat: 'Yield-bearing stablecoins compete directly with bank deposits and MMFs.', detail: 'At scale, this could alter bank funding structures, affect credit supply, and amplify run dynamics in short-term funding markets.' },
  { label: 'Disintermediation view (BPI, 2026)', stat: 'Yield-bearing stablecoins reduce bank deposits and lending.', detail: 'Citing Cong, Chiu et al.: banks must compete for deposits, potentially crowding out lending.' },
  { label: 'Adoption-cost view (Federal Reserve, Dec 2025)', stat: 'Non-yielding stablecoins carry a high opportunity cost when rates are elevated.', detail: 'The Fed notes this could slow adoption unless stablecoins evolve to pay yield, creating a regulatory tension with the GENIUS prohibition.' },
];

// T-bill maturity distribution from issuer transparency attestations.
// Teaches why issuers prefer short-term bills (liquidity for redemptions)
// and the Yadav/Malone Treasury-interdependence point.
export const tBillMaturities = [
  { issuer: 'Tether (Q1 2026 attestation)', buckets: [
    { label: '0-30 days', pct: 22 },
    { label: '31-90 days', pct: 41 },
    { label: '91-180 days', pct: 24 },
    { label: '180+ days', pct: 13 },
  ]},
  { issuer: 'Circle (Q1 2026 reserve report)', buckets: [
    { label: '0-30 days', pct: 31 },
    { label: '31-90 days', pct: 48 },
    { label: '91-180 days', pct: 17 },
    { label: '180+ days', pct: 4 },
  ]},
];

// GENIUS Act rulemaking status as of Aug 2026 (dated paragraph, not a live
// tracker). Per owner decision: no public review-cadence promise.
export const geniusStatus = {
  enacted: 'July 18, 2025',
  asOf: 'Aug 2026',
  fullImplementation: 'January 18, 2027 (18 months after enactment) or 120 days after final rules are issued',
  totalRulemakings: 26,
  agencies: 6,
  nprmsIssued: 10,
  finalRules: 0,
  note: 'Many comment periods (e.g. FinCEN/OFAC joint rulemaking) closed in early June 2026. As of Aug 2026, zero final rules have been completed.',
  source: 'Paradigm GENIUS Act Rulemaking Tracker',
  url: 'https://paradigm.xyz/genius',
};

// BPI full-journey finding (callout next to the remittance calculator).
export const bpiFinding = {
  label: 'Bank Policy Institute (Jul 2026)',
  finding: 'Stablecoins showed no systematic cost advantage over traditional channels; full-journey cost 0.3% to 9% across ten corridors.',
  detail: 'On/off-ramp FX dominated the cost. Speed followed the local rail, not the chain. Gas-only comparisons (the middle hop) are not the whole journey.',
};

// --- Section 5: cross-border ---------------------------------------------
// Author's teaching model, not a qualified research estimate. Every lever is
// visible on the widget. The scenario table underneath is what makes this
// defensible: each row says what we are allowed to claim and from where.
export const remittanceCost = {
  // Default amount is the World Bank RPW measurement point ($200), not $1,000.
  defaultAmount: 200,
  // Traditional side: three NAMED assumption schedules, not one black-box "% + fixed".
  // The $245 fixed figure from the previous version was a Learn-range reading
  // repurposed as a SWIFT ticket; it is deleted as a fee and only appears as a
  // worked $10,000 example in the scenario table, attributed to that reading.
  traditionalSchedules: [
    { id: 'rpw', label: 'RPW-like retail % ($200/$500 only)', feePct: 6.2, fixedUsd: 0, warnAbove: 500, warn: 'RPW only mystery-shops $200 and $500. Do not extrapolate this percentage to commercial sizes.' },
    { id: 'sme', label: 'SME wire: 2% FX + $40', feePct: 2, fixedUsd: 40, warnAbove: null },
    { id: 'commercial', label: 'Commercial: 25 bp FX + $25', feePct: 0.25, fixedUsd: 25, warnAbove: null },
  ],
  defaultTraditional: 'rpw',
  // Stablecoin side: the full journey split into named hops. Default is the
  // "I already hold it and they accept it" case (ramps off, gas on). A one-click
  // "full cash-to-cash" preset turns both ramps on.
  stablecoin: {
    networkFeeUsd: 0.10,        // representative L2/Base fee
    onrampPct: 0.5,             // author assumption, middle of the 0.1-1% range
    offrampPct: 0.5,            // author assumption, middle of the 0.1-1% range
    includeOnramp: false,
    includeOfframp: false,
    days: 'seconds',
  },
  // Float / opportunity cost of time (author assumption, not World Bank).
  // floatCost = amount * annualOpportunityRate * daysInTransit / 365
  defaultDaysInTransit: 4,     // traditional default
  defaultOpportunityRate: 4.5, // author assumption, cash/T-bill order of magnitude
  label: "Author's model, not the World Bank series",
};

// Static, sourced scenario table. Figures are ranges where the primary source
// gives a range; "author model" rows are clearly labeled as such. The
// calculator's job is to let the reader replay A-E by moving sliders until the
// stacked rows match a row in this table.
export const remittanceScenarios = [
  {
    id: 'A', scenario: 'Worker sends $200', allowed: 'World Bank Remittance Prices Worldwide (named quarter)',
    traditional: 'Global average ~6.2% all-in; banks higher; Sub-Saharan Africa higher',
    stablecoin: 'BPI 2026 full journey 0.3-9%; gas is not the whole story',
    why: 'The actual remittance fact. This is the size World Bank RPW measures.',
    source: 'World Bank RPW Q1 2025; BPI Jul 2026',
  },
  {
    id: 'B', scenario: '$500', allowed: 'World Bank RPW $500 average',
    traditional: '~4.3% all-in (Q1 2025 figure, re-verify before quoting)',
    stablecoin: 'Same BPI caveat: on/off-ramp FX dominates, not gas',
    why: 'Shows the percentage falls as ticket grows, inside the RPW band.',
    source: 'World Bank RPW Q1 2025',
  },
  {
    id: 'C', scenario: '$10,000 personal', allowed: 'Author model, not RPW',
    traditional: 'e.g. 1-3% FX + $40; float ~$5 at 4.5%/4d',
    stablecoin: 'Gas + optional ramps',
    why: 'Kills the live $710 claim. RPW does not cover this size.',
    source: 'Author model; bank fee schedules',
  },
  {
    id: 'D', scenario: '$1M, recipient takes USDC', allowed: 'Author model',
    traditional: '10-50 bp commercial FX + $25 + ~$500 float',
    stablecoin: 'Gas only (already hold, they accept)',
    why: 'Why treasurers care about "stay on-chain": no ramp cost.',
    source: 'Author model; trade-press commercial FX ranges',
  },
  {
    id: 'E', scenario: '$1M, cash to cash', allowed: 'Author model + BPI spirit',
    traditional: 'Same as D',
    stablecoin: 'On-ramp + gas + off-ramp (0.1-1% each as a labeled band)',
    why: 'Why $0.10 is a lie for this path. Ramps dominate, not gas.',
    source: 'Author model; BPI Jul 2026 (0.3-9% full journey)',
  },
  {
    id: 'F', scenario: 'Blocked corridor / 10-day delay', allowed: 'Author model',
    traditional: 'D plus ~$1,200 float at 4.5%',
    stablecoin: 'Often same-day once ramped',
    why: 'Time as the feature. Float becomes a first-class term.',
    source: 'Author model',
  },
];

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
    low: '$0.01 (May 13)',
    spark: [1.0,1.0,0.99,0.99,0.98,0.95,0.90,0.82,0.72,0.60,0.48,0.35,0.25,0.18,0.12,0.08,0.05,0.03,0.02,0.015,0.01,0.008,0.005,0.003,0.01],
    sparkLabels: ['May 1','May 2','May 3','May 4','May 5','May 6','May 7','May 8','May 9','May 10','May 11','May 12','May 13','May 14','May 15','May 16','May 17','May 18','May 19','May 20','May 21','May 22','May 23','May 24','May 25'],
    failureMode: 'Death spiral: algorithmic mint/burn hyperinflated LUNA, crashing both tokens toward zero',
    mech: "Algorithmic: UST relied on a sister token (LUNA) burning to absorb sell pressure. When confidence cracked, the mechanism minted ever more LUNA, hyperinflating it and crashing both tokens. Combined UST+LUNA loss ~$60B in roughly a week.",
    // Learner UI fields (shared with in-app Research tab; do not invent alternate lows/dates)
    learner: {
      caseKey: 'ust',
      short: 'UST · 2022',
      kind: 'Structural',
      color: 'coral',
      title: 'When confidence became the collateral',
      recovery: 'No recovery',
      question: 'What happens when the system needs belief to create its own exit liquidity?',
      trigger: 'Large withdrawals from Anchor and a falling UST price started the redemption loop.',
      mechanism: ['UST is sold', 'LUNA is minted', 'LUNA price falls', 'Backing confidence falls'],
      conclusion: 'A structural failure: the stabilizer and the thing being stabilized weakened together.',
      label: 'Algorithmic death spiral',
      heldPeg: 'Arbitrage with LUNA',
      brokeFirst: 'Confidence + exit liquidity',
      couldRecover: false,
      recoverText: 'No - stabilizer weakened too',
    },
  },
  {
    id: 'svb',
    name: 'USDC / SVB',
    date: 'March 2023',
    low: '$0.8789 (Mar 11)',
    spark: [1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,0.999,0.998,0.97,0.88,0.8789,0.90,0.94,0.97,0.99,0.995,0.998,0.999,1.0,1.0,1.0,1.0,1.0],
    sparkLabels: ['Mar 1','Mar 2','Mar 3','Mar 4','Mar 5','Mar 6','Mar 7','Mar 8','Mar 9','Mar 10','Mar 11','Mar 11','Mar 11','Mar 12','Mar 13','Mar 13','Mar 13','Mar 14','Mar 14','Mar 14','Mar 15','Mar 16','Mar 17','Mar 18','Mar 19'],
    failureMode: 'Banking scare: temporary depeg from stranded reserves, self-corrected after government backstop',
    mech: "Circle held $3.3B (~8% of backing) at Silicon Valley Bank. When SVB failed, USDC dropped to $0.8789 (CoinGecko Research); Curve pools went below $0.82. Recovered after the US government backstopped all SVB depositors.",
    learner: {
      caseKey: 'usdc',
      short: 'USDC · 2023',
      kind: 'Counterparty',
      color: 'amber',
      title: 'When reserves were safe, but temporarily unreachable',
      recovery: '~3 days',
      question: 'How can a fully backed token wobble when its assets are still there?',
      trigger: 'Uncertainty about whether deposits would be protected triggered secondary-market selling.',
      mechanism: ['Bank fails', 'Reserves are frozen', 'Redemption fear rises', 'Price discounts'],
      conclusion: 'A temporary counterparty-access problem: the assets remained, but immediate access was uncertain.',
      label: 'Bank-run scare',
      heldPeg: 'Cash + Treasury reserves',
      brokeFirst: 'Access to bank-held cash',
      couldRecover: true,
      recoverText: 'Yes - deposits were protected',
    },
  },
  {
    id: 'usde',
    name: 'USDe wobble',
    date: 'October 2025',
    low: '$0.62 (some DEXs)',
    spark: [1.0,1.005,1.0,0.998,0.995,0.99,0.985,0.97,0.95,0.90,0.85,0.78,0.70,0.65,0.62,0.65,0.70,0.78,0.85,0.90,0.94,0.97,0.985,0.995,0.99],
    sparkLabels: ['Oct 1','Oct 2','Oct 3','Oct 4','Oct 5','Oct 6','Oct 7','Oct 8','Oct 9','Oct 10','Oct 11','Oct 12','Oct 13','Oct 14','Oct 15','Oct 16','Oct 17','Oct 18','Oct 19','Oct 20','Oct 21','Oct 22','Oct 23','Oct 24','Oct 25'],
    failureMode: 'Funding stress: negative funding rates eroded synthetic reserves, recovered as hedges rebalanced',
    mech: 'Ethena USDe depegged to $0.62 on some DEXs during a funding-rate stress event; recovered as hedges rebalanced. Illustrates the synthetic-dollar risk: funding rates can flip negative and erode reserves in bear markets.',
    learner: {
      caseKey: 'usde',
      short: 'USDe · 2025',
      kind: 'Market structure',
      color: 'violet',
      title: 'When the hedge works differently under stress',
      recovery: 'After hedge rebalance',
      question: 'What changes when a dollar is made from a hedge rather than a reserve account?',
      trigger: 'A funding-rate shock and DEX liquidity dislocation widened the market price from the intended peg.',
      mechanism: ['Funding shifts', 'DEX depth thins', 'Hedge reprices', 'Arbitrage returns'],
      conclusion: 'A market-structure stress event: the mechanism can recover, but liquidity and hedge execution matter.',
      label: 'Synthetic-dollar stress',
      heldPeg: 'Delta-neutral hedge',
      brokeFirst: 'Funding + DEX liquidity',
      couldRecover: true,
      recoverText: 'Yes - hedge rebalanced',
    },
  },
];

export const depegTakeaways = [
  { n: '01', title: 'Look beyond the price', body: 'A price chart records the symptom. The peg design tells you where pressure can travel next.' },
  { n: '02', title: 'Ask what is redeemable', body: 'Cash reserves, collateral, and hedge positions behave differently when many holders want out.' },
  { n: '03', title: 'Separate stress from collapse', body: 'Not every depeg is permanent. Recovery depends on whether the underlying mechanism can still function.' },
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