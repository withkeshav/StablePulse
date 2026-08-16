/**
 * Learner-facing copy for individual asset pages.
 * Kept separate from coin-config thresholds so classification prose can evolve
 * without touching alert math.
 */

export const ASSET_META = {
  USDT: {
    name: 'Tether USD',
    classification: 'Fiat-backed',
    reserveDesign: 'Cash + Treasuries',
    thesis: 'The largest circulating dollar stablecoin, used widely for trading and settlement liquidity.',
    watchDefault: 'Watch supply concentration and peg tightness during high-volume sessions.',
    learnQuestion: 'Why does the largest stablecoin still matter for peg interpretation?',
    learnId: 'lesson-peg-basics',
  },
  USDC: {
    name: 'USD Coin',
    classification: 'Fiat-backed',
    reserveDesign: 'Cash + Treasuries',
    thesis: 'Reserve-backed digital dollars designed for payments, settlement, and on-chain liquidity.',
    watchDefault: 'Chain distribution can indicate where payment demand is moving.',
    learnQuestion: 'Why can a fully backed stablecoin still move away from $1.00?',
    learnId: 'lesson-depeg-cases',
  },
  DAI: {
    name: 'Dai',
    classification: 'Crypto-collateralized',
    reserveDesign: 'Over-collateralized vaults',
    thesis: 'A decentralized dollar reference maintained by crypto collateral and liquidation mechanics.',
    watchDefault: 'Watch collateral stress and peg bands when crypto markets move sharply.',
    learnQuestion: 'How does crypto collateral enforce a dollar peg without a bank account?',
    learnId: 'lesson-backing-types',
  },
  USDE: {
    name: 'Ethena USDe',
    classification: 'Synthetic / delta-neutral',
    reserveDesign: 'Spot long + short perp hedge',
    thesis: 'A synthetic dollar built from a delta-neutral hedge rather than a reserve bank account.',
    watchDefault: 'Funding-rate stress and DEX depth matter more than a classic reserve report.',
    learnQuestion: 'What changes when a dollar is made from a hedge rather than reserves?',
    learnId: 'lesson-depeg-cases',
  },
  PYUSD: {
    name: 'PayPal USD',
    classification: 'Fiat-backed',
    reserveDesign: 'Cash + Treasuries',
    thesis: 'A regulated payments-oriented dollar token issued for commerce and transfers.',
    watchDefault: 'Watch supply growth and chain expansion as payment rails adopt the token.',
    learnQuestion: 'How do payments-focused stablecoins differ from trading liquidity coins?',
    learnId: 'lesson-peg-basics',
  },
};

export function getAssetMeta(symbol) {
  return ASSET_META[String(symbol || '').toUpperCase()] || {
    name: String(symbol || 'Stablecoin'),
    classification: 'Tracked stablecoin',
    reserveDesign: 'See issuer disclosures',
    thesis: 'A tracked USD-referenced stablecoin on this dashboard.',
    watchDefault: 'Watch price versus $1.00, supply trend, and chain concentration.',
    learnQuestion: 'What should I watch when reading a stablecoin signal?',
    learnId: null,
  };
}
