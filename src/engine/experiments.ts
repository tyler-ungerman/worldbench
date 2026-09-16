import { compare } from './compare';
import type { Experiment, World } from './types';

/**
 * Cheapest discriminating experiment = cheapest observation that would make
 * branch outputs disagree (or kill one branch's prediction).
 */
export function suggestExperiments(a: World, b: World): Experiment[] {
  const cmp = compare(a, b);
  const diverged = cmp.calculationDiffs.filter((d) => d.status === 'changed');
  if (diverged.length === 0) {
    return [
      {
        id: 'exp_none',
        title: 'No disagreement to discriminate',
        description: 'Branches currently agree on calculations. Change an assumption or wait for new facts.',
        observation: 'n/a',
        targetNodeIds: [],
        cost: 0,
        costLabel: '—',
        killCondition: 'n/a',
      },
    ];
  }

  const experiments: Experiment[] = [];

  const onboard = diverged.find((d) => d.nodeId === 'onboarding_completion_target');
  if (onboard) {
    experiments.push({
      id: 'exp_onboard_funnel',
      title: 'Measure first-week onboarding completion by channel',
      description:
        'The non-obvious break: onboarding target moves with distribution (store vs URL). A cheap funnel check discriminates which world matches reality.',
      observation:
        'Instrument signup→activation for one cohort; report completion rate after 7 days (store install cohort vs landing-page cohort if available, or historical analog).',
      targetNodeIds: ['onboarding_completion_target', 'distribution'],
      cost: 1,
      costLabel: '1–2 days analytics',
      killCondition: `If completion ≈ ${String(onboard.aValue)} → prefer branch A; if ≈ ${String(onboard.bValue)} → prefer branch B; if far from both → both models weak.`,
    });
  }

  const sched = diverged.find((d) => d.nodeId === 'schedule_weeks');
  if (sched) {
    experiments.push({
      id: 'exp_store_review',
      title: 'Check current App Store review SLA',
      description: 'Schedule divergence is driven partly by store review weeks. A quick external lookup bounds one branch.',
      observation: 'Look up median iOS/Android review time for the last 30 days (public dashboards or last ship).',
      targetNodeIds: ['schedule_weeks', 'app_store_review_weeks'],
      cost: 2,
      costLabel: 'half day',
      killCondition:
        'If review ≪ assumed weeks, mobile schedule compresses; if ≫ assumed, mobile branch cost rises sharply vs web.',
    });
  }

  const push = diverged.find((d) => d.nodeId === 'push_capability');
  if (push) {
    experiments.push({
      id: 'exp_push_necessity',
      title: 'User interview: is push load-bearing?',
      description: 'If push is not actually required, mobile’s reliability advantage shrinks — cheap to learn before committing architecture.',
      observation: 'Five target-user interviews: “Would you enable notifications? What breaks without them?”',
      targetNodeIds: ['push_capability', 'needs_push_notifications'],
      cost: 3,
      costLabel: '2–3 days',
      killCondition:
        'If users shrug at notifications, flip needs_push_notifications=false and re-compare; mobile urgency drops.',
    });
  }

  const cost = diverged.find((d) => d.nodeId === 'total_cost_to_ship');
  if (cost) {
    experiments.push({
      id: 'exp_budget_gate',
      title: 'Budget gate against cost-to-ship delta',
      description: 'Compare the cost-to-ship delta to remaining runway — a spreadsheet check, not a build.',
      observation: 'Compute runway months; mark mobile branch infeasible if cost-to-ship > 40% of runway.',
      targetNodeIds: ['total_cost_to_ship', 'cost_monthly'],
      cost: 1,
      costLabel: '1 hour',
      killCondition: 'If mobile cost-to-ship exceeds gate → kill mobile branch for v1; else keep both.',
    });
  }

  // Always include a generic cheapest observation on the largest label disagreement
  if (experiments.length === 0) {
    const top = diverged[0];
    experiments.push({
      id: 'exp_generic',
      title: `Observe "${top.label}" in the wild`,
      description: `Branches disagree on ${top.label} (${String(top.aValue)} vs ${String(top.bValue)}).`,
      observation: `Gather one real measurement of ${top.label}.`,
      targetNodeIds: [top.nodeId],
      cost: 5,
      costLabel: 'varies',
      killCondition: 'Measurement closer to one branch kills the other prediction.',
    });
  }

  experiments.sort((x, y) => x.cost - y.cost);
  return experiments;
}
