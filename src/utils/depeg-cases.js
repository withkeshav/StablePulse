/**
 * Learner-facing depeg case views.
 * Canonical figures live on research/data.js `depegs` (+ nested `learner` fields).
 */
import { depegs, depegTakeaways, AS_OF } from '../../research/data.js';

export const DEPEG_CASE_ORDER = ['ust', 'usdc', 'usde'];

const KEY_TO_DATA_ID = { ust: 'ust', usdc: 'svb', usde: 'usde' };

export const DEPEG_CASES = Object.fromEntries(
  DEPEG_CASE_ORDER.map((key) => {
    const source = depegs.find((d) => d.id === KEY_TO_DATA_ID[key]) || {};
    const learner = source.learner || {};
    return [
      key,
      {
        id: key,
        dataId: source.id,
        short: learner.short,
        kind: learner.kind,
        color: learner.color,
        title: learner.title,
        date: source.date,
        low: source.low,
        recovery: learner.recovery,
        question: learner.question,
        trigger: learner.trigger,
        mechanism: learner.mechanism || [],
        conclusion: learner.conclusion,
        label: learner.label,
        heldPeg: learner.heldPeg,
        brokeFirst: learner.brokeFirst,
        couldRecover: learner.couldRecover,
        recoverText: learner.recoverText,
        name: source.name,
        mech: source.mech,
        failureMode: source.failureMode,
        spark: source.spark || [],
        sparkLabels: source.sparkLabels || [],
      },
    ];
  })
);

export const DEPEG_TAKEAWAYS = depegTakeaways;

export { AS_OF };

/** Topic shelf for in-app Research - links into the canonical hub, no duplicated articles. */
export const RESEARCH_SHELF = [
  {
    id: 'featured',
    kind: 'feature',
    kicker: 'FEATURED CASE STUDY',
    title: 'When a peg breaks, start with what failed.',
    body: 'Three events. Three mechanisms. A better way to learn from a depeg than comparing price lines alone.',
    href: '/research/#depegs',
  },
  {
    id: 'taxonomy',
    title: 'Reserve design',
    subtitle: 'What supports a stablecoin?',
    href: '/research/#taxonomy',
  },
  {
    id: 'treasury',
    title: 'Market plumbing',
    subtitle: 'Where does liquidity travel?',
    href: '/research/#treasury',
  },
  {
    id: 'regulation',
    title: 'Regulation map',
    subtitle: 'How frameworks converge and diverge',
    href: '/research/#regulation',
  },
];
