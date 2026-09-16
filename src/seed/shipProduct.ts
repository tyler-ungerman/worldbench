import type { Edge, World, WorldNode } from '../engine/types';
import { recompute } from '../engine/recompute';

function node(partial: Omit<WorldNode, 'status' | 'provenance' | 'dependsOn'> & {
  dependsOn?: string[];
  status?: WorldNode['status'];
}): WorldNode {
  return {
    dependsOn: partial.dependsOn ?? [],
    status: partial.status ?? 'baseline',
    provenance: [],
    ...partial,
  };
}

export function createShipProductWorld(): World {
  const nodes: Record<string, WorldNode> = {
    // ——— Facts (external, not reversible by branching) ———
    team_size: node({
      id: 'team_size',
      kind: 'fact',
      label: 'Team size (engineers)',
      value: 3,
      valueType: 'number',
      description: 'External headcount fact.',
    }),
    fully_loaded_eng_monthly: node({
      id: 'fully_loaded_eng_monthly',
      kind: 'fact',
      label: 'Fully-loaded eng cost / month',
      value: 15000,
      valueType: 'number',
      unit: 'USD',
      description: 'External cost fact.',
    }),
    store_overhead_monthly: node({
      id: 'store_overhead_monthly',
      kind: 'fact',
      label: 'Store / platform overhead / month',
      value: 2000,
      valueType: 'number',
      unit: 'USD',
      description: 'Device farm, certificates, store fees (approx).',
    }),
    base_web_weeks: node({
      id: 'base_web_weeks',
      kind: 'fact',
      label: 'Base web build weeks',
      value: 8,
      valueType: 'number',
      unit: 'weeks',
    }),
    base_mobile_weeks: node({
      id: 'base_mobile_weeks',
      kind: 'fact',
      label: 'Base mobile build weeks',
      value: 12,
      valueType: 'number',
      unit: 'weeks',
    }),
    app_store_review_weeks: node({
      id: 'app_store_review_weeks',
      kind: 'fact',
      label: 'App Store review weeks',
      value: 2,
      valueType: 'number',
      unit: 'weeks',
      description: 'External SLA estimate — not undone by branching.',
    }),
    rn_ramp_weeks: node({
      id: 'rn_ramp_weeks',
      kind: 'fact',
      label: 'React Native ramp weeks',
      value: 3,
      valueType: 'number',
      unit: 'weeks',
    }),

    // ——— Assumptions (editable; fork creates branches) ———
    need_mobile_app: node({
      id: 'need_mobile_app',
      kind: 'assumption',
      label: 'We need a mobile app',
      value: true,
      valueType: 'boolean',
      branchable: true,
      description: 'Core branch knob: true = native/store path; false = browser-only.',
    }),
    has_native_skills: node({
      id: 'has_native_skills',
      kind: 'assumption',
      label: 'Team has native iOS/Android skills',
      value: false,
      valueType: 'boolean',
      branchable: true,
      description: 'Affects architecture (native shells vs RN) and schedule ramp.',
    }),
    needs_push_notifications: node({
      id: 'needs_push_notifications',
      kind: 'assumption',
      label: 'Push notifications are required',
      value: true,
      valueType: 'boolean',
      branchable: true,
    }),
    needs_offline: node({
      id: 'needs_offline',
      kind: 'assumption',
      label: 'Offline mode is required',
      value: false,
      valueType: 'boolean',
      branchable: true,
    }),

    // ——— Calculations (recomputable) ———
    architecture: node({
      id: 'architecture',
      kind: 'calculation',
      label: 'Architecture',
      value: '',
      valueType: 'string',
      dependsOn: ['need_mobile_app', 'has_native_skills'],
      ruleId: 'arch',
      description: 'Native shells vs responsive web / RN.',
    }),
    schedule_weeks: node({
      id: 'schedule_weeks',
      kind: 'calculation',
      label: 'Schedule (weeks)',
      value: 0,
      valueType: 'number',
      unit: 'weeks',
      dependsOn: [
        'need_mobile_app',
        'has_native_skills',
        'base_web_weeks',
        'base_mobile_weeks',
        'app_store_review_weeks',
        'rn_ramp_weeks',
      ],
      ruleId: 'sched',
    }),
    distribution: node({
      id: 'distribution',
      kind: 'calculation',
      label: 'Distribution',
      value: '',
      valueType: 'string',
      dependsOn: ['need_mobile_app'],
      ruleId: 'dist',
    }),
    push_capability: node({
      id: 'push_capability',
      kind: 'calculation',
      label: 'Push capability',
      value: '',
      valueType: 'string',
      dependsOn: ['need_mobile_app', 'needs_push_notifications'],
      ruleId: 'push',
    }),
    offline_capability: node({
      id: 'offline_capability',
      kind: 'calculation',
      label: 'Offline capability',
      value: '',
      valueType: 'string',
      dependsOn: ['need_mobile_app', 'needs_offline'],
      ruleId: 'offline',
    }),
    onboarding_completion_target: node({
      id: 'onboarding_completion_target',
      kind: 'calculation',
      label: 'Onboarding completion target',
      value: 0,
      valueType: 'number',
      unit: 'ratio',
      dependsOn: ['need_mobile_app', 'distribution'],
      ruleId: 'onboard',
      description:
        'NON-OBVIOUS: target depends on distribution channel (store commit vs URL bounce), not just UX copy.',
    }),
    cost_monthly: node({
      id: 'cost_monthly',
      kind: 'calculation',
      label: 'Monthly burn',
      value: 0,
      valueType: 'number',
      unit: 'USD',
      dependsOn: ['need_mobile_app', 'team_size', 'fully_loaded_eng_monthly', 'store_overhead_monthly'],
      ruleId: 'cost',
    }),
    headcount_needed: node({
      id: 'headcount_needed',
      kind: 'calculation',
      label: 'Headcount needed',
      value: 0,
      valueType: 'number',
      dependsOn: ['need_mobile_app', 'has_native_skills', 'team_size'],
      ruleId: 'hc',
    }),
    total_cost_to_ship: node({
      id: 'total_cost_to_ship',
      kind: 'calculation',
      label: 'Cost to ship (approx)',
      value: 0,
      valueType: 'number',
      unit: 'USD',
      dependsOn: ['schedule_weeks', 'cost_monthly'],
      ruleId: 'shipcost',
    }),

    // ——— Suggestions (AI/heuristic — clearly labeled, not truth) ———
    sug_rn: node({
      id: 'sug_rn',
      kind: 'suggestion',
      label: 'Consider React Native if lacking native skills',
      value: 'If mobile stays true and native skills stay false, prefer RN over hiring two native stacks.',
      valueType: 'string',
      dependsOn: ['need_mobile_app', 'has_native_skills'],
      suggestionSource: 'heuristic',
      description: 'Suggestion — not executed as truth.',
    }),
    sug_pwa: node({
      id: 'sug_pwa',
      kind: 'suggestion',
      label: 'PWA as a push/offline stepping stone',
      value: 'Browser-only can use a PWA for limited push/offline before committing to stores.',
      valueType: 'string',
      dependsOn: ['need_mobile_app', 'needs_push_notifications'],
      suggestionSource: 'heuristic',
    }),

    // ——— Irreversible action placeholder (logged) ———
    kickoff_logged: node({
      id: 'kickoff_logged',
      kind: 'irreversible',
      label: 'Kickoff workshop completed',
      value: '2026-09-01 — discovery workshop (logged)',
      valueType: 'string',
      description: 'Irreversible: switching branches does not undo this log.',
    }),
  };

  const edges: Edge[] = [];
  for (const n of Object.values(nodes)) {
    for (const from of n.dependsOn) {
      edges.push({ from, to: n.id });
    }
  }

  const raw: World = {
    id: 'world_main',
    title: 'Ship a product',
    branchLabel: 'main (mobile = true)',
    nodes,
    edges,
    actionLog: [
      {
        id: 'act_kickoff',
        label: 'Kickoff workshop completed',
        at: '2026-09-01T10:00:00.000Z',
        detail: 'Discovery workshop with stakeholders — irreversible log.',
        worldId: 'world_main',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return recompute(raw);
}

export const SEED_MOBILE_ASSUMPTION_ID = 'need_mobile_app';
