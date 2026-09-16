import type { ProvenanceStep, World, WorldNode } from './types';

/**
 * Deterministic recalculation rules for calculation nodes.
 * Suggestions are never promoted to facts or calculations here.
 */
function calcArchitecture(w: World): { value: string; provenance: ProvenanceStep[] } {
  const mobile = !!w.nodes['need_mobile_app']?.value;
  const native = !!w.nodes['has_native_skills']?.value;
  const inputs = ['need_mobile_app', 'has_native_skills'];
  if (!mobile) {
    return {
      value: 'Responsive web / PWA',
      provenance: [
        {
          ruleId: 'arch-web',
          ruleLabel: 'Browser-only architecture',
          inputs,
          note: 'Mobile app = false → single responsive web surface; no native shells.',
        },
      ],
    };
  }
  if (native) {
    return {
      value: 'Native shells (iOS/Android) + shared API',
      provenance: [
        {
          ruleId: 'arch-native',
          ruleLabel: 'Native shells',
          inputs,
          note: 'Mobile + native skills → platform shells over shared API.',
        },
      ],
    };
  }
  return {
    value: 'React Native / cross-platform + shared API',
    provenance: [
      {
        ruleId: 'arch-rn',
        ruleLabel: 'Cross-platform mobile',
        inputs,
        note: 'Mobile required but no native skills → RN/cross-platform to avoid hiring two native stacks.',
      },
    ],
  };
}

function calcSchedule(w: World): { value: number; provenance: ProvenanceStep[] } {
  const mobile = !!w.nodes['need_mobile_app']?.value;
  const native = !!w.nodes['has_native_skills']?.value;
  const baseWeb = Number(w.nodes['base_web_weeks']?.value ?? 8);
  const baseMobile = Number(w.nodes['base_mobile_weeks']?.value ?? 12);
  const review = Number(w.nodes['app_store_review_weeks']?.value ?? 2);
  const rnRamp = Number(w.nodes['rn_ramp_weeks']?.value ?? 3);
  const inputs = [
    'need_mobile_app',
    'has_native_skills',
    'base_web_weeks',
    'base_mobile_weeks',
    'app_store_review_weeks',
    'rn_ramp_weeks',
  ];
  if (!mobile) {
    return {
      value: baseWeb,
      provenance: [
        {
          ruleId: 'sched-web',
          ruleLabel: 'Web schedule',
          inputs,
          note: `Browser-only: ${baseWeb} weeks base. No App Store review gate.`,
        },
      ],
    };
  }
  const ramp = native ? 0 : rnRamp;
  const total = baseMobile + review + ramp;
  return {
    value: total,
    provenance: [
      {
        ruleId: 'sched-mobile',
        ruleLabel: 'Mobile schedule',
        inputs,
        note: `Mobile: ${baseMobile}w base + ${review}w store review${ramp ? ` + ${ramp}w RN ramp` : ''} = ${total}w.`,
      },
    ],
  };
}

function calcDistribution(w: World): { value: string; provenance: ProvenanceStep[] } {
  const mobile = !!w.nodes['need_mobile_app']?.value;
  const inputs = ['need_mobile_app'];
  if (mobile) {
    return {
      value: 'App Store / Play Store (review gate)',
      provenance: [
        {
          ruleId: 'dist-store',
          ruleLabel: 'Store distribution',
          inputs,
          note: 'Mobile app → store listing + review before every release train.',
        },
      ],
    };
  }
  return {
    value: 'URL share / direct link',
    provenance: [
      {
        ruleId: 'dist-url',
        ruleLabel: 'URL distribution',
        inputs,
        note: 'Browser-only → ship by URL; no store review.',
      },
    ],
  };
}

function calcPush(w: World): { value: string; provenance: ProvenanceStep[] } {
  const mobile = !!w.nodes['need_mobile_app']?.value;
  const needsPush = !!w.nodes['needs_push_notifications']?.value;
  const inputs = ['need_mobile_app', 'needs_push_notifications'];
  if (!needsPush) {
    return {
      value: 'Not required',
      provenance: [
        {
          ruleId: 'push-none',
          ruleLabel: 'Push unused',
          inputs,
          note: 'Push notifications assumption is false.',
        },
      ],
    };
  }
  if (mobile) {
    return {
      value: 'Native push (reliable)',
      provenance: [
        {
          ruleId: 'push-native',
          ruleLabel: 'Native push',
          inputs,
          note: 'Mobile shells make reliable push straightforward.',
        },
      ],
    };
  }
  return {
    value: 'Web push (capped — permission friction)',
    provenance: [
      {
        ruleId: 'push-web',
        ruleLabel: 'Web push capped',
        inputs,
        note: 'Browser-only: web push works but opt-in rates and OS support are capped.',
      },
    ],
  };
}

function calcOffline(w: World): { value: string; provenance: ProvenanceStep[] } {
  const mobile = !!w.nodes['need_mobile_app']?.value;
  const needsOffline = !!w.nodes['needs_offline']?.value;
  const inputs = ['need_mobile_app', 'needs_offline'];
  if (!needsOffline) {
    return {
      value: 'Online-first (offline optional)',
      provenance: [
        {
          ruleId: 'offline-opt',
          ruleLabel: 'Offline optional',
          inputs,
          note: 'Offline not required by assumption.',
        },
      ],
    };
  }
  if (mobile) {
    return {
      value: 'Strong offline via native storage',
      provenance: [
        {
          ruleId: 'offline-native',
          ruleLabel: 'Native offline',
          inputs,
          note: 'Mobile + offline need → native storage/sync path.',
        },
      ],
    };
  }
  return {
    value: 'Service worker offline (capped)',
    provenance: [
      {
        ruleId: 'offline-sw',
        ruleLabel: 'SW offline capped',
        inputs,
        note: 'Browser-only offline relies on service workers; storage and background sync are capped.',
      },
    ],
  };
}

/**
 * NON-OBVIOUS: onboarding completion target depends on distribution channel.
 * Store users are more committed → higher target; URL traffic bounces → lower target.
 * Users rarely expect "mobile app?" to move an onboarding KPI.
 */
function calcOnboardingTarget(w: World): { value: number; provenance: ProvenanceStep[] } {
  const dist = String(w.nodes['distribution']?.value ?? '');
  const mobile = !!w.nodes['need_mobile_app']?.value;
  const inputs = ['need_mobile_app', 'distribution'];
  // Prefer distribution if already computed; else fall back to mobile flag.
  const viaStore = dist.includes('Store') || (dist === '' && mobile);
  if (viaStore) {
    return {
      value: 0.7,
      provenance: [
        {
          ruleId: 'onboard-store',
          ruleLabel: 'Store-channel onboarding target',
          inputs,
          note:
            'App Store / Play distribution implies committed installers → onboarding completion target 70%. (Often missed: this KPI moves with the mobile assumption via distribution.)',
        },
      ],
    };
  }
  return {
    value: 0.4,
    provenance: [
      {
        ruleId: 'onboard-url',
        ruleLabel: 'URL-channel onboarding target',
        inputs,
        note:
          'URL-share distribution has high bounce → onboarding completion target 40%. Non-obvious: dropping the mobile app lowers this KPI even if the product UX is unchanged.',
      },
    ],
  };
}

function calcCostMonthly(w: World): { value: number; provenance: ProvenanceStep[] } {
  const mobile = !!w.nodes['need_mobile_app']?.value;
  const team = Number(w.nodes['team_size']?.value ?? 3);
  const salary = Number(w.nodes['fully_loaded_eng_monthly']?.value ?? 15000);
  const storeFees = mobile ? Number(w.nodes['store_overhead_monthly']?.value ?? 2000) : 0;
  const inputs = ['need_mobile_app', 'team_size', 'fully_loaded_eng_monthly', 'store_overhead_monthly'];
  const value = team * salary + storeFees;
  return {
    value,
    provenance: [
      {
        ruleId: 'cost-burn',
        ruleLabel: 'Monthly burn',
        inputs,
        note: `${team} eng × $${salary}/mo${storeFees ? ` + $${storeFees} store/platform overhead` : ''} = $${value}/mo.`,
      },
    ],
  };
}

function calcHeadcount(w: World): { value: number; provenance: ProvenanceStep[] } {
  const mobile = !!w.nodes['need_mobile_app']?.value;
  const native = !!w.nodes['has_native_skills']?.value;
  const base = Number(w.nodes['team_size']?.value ?? 3);
  const inputs = ['need_mobile_app', 'has_native_skills', 'team_size'];
  if (!mobile) {
    return {
      value: base,
      provenance: [
        {
          ruleId: 'hc-web',
          ruleLabel: 'Web headcount',
          inputs,
          note: `Browser-only stays at current team of ${base}.`,
        },
      ],
    };
  }
  if (native) {
    const v = base + 1;
    return {
      value: v,
      provenance: [
        {
          ruleId: 'hc-native',
          ruleLabel: 'Native headcount',
          inputs,
          note: `Native shells typically need +1 platform specialist → ${v}.`,
        },
      ],
    };
  }
  const v = base; // RN reuses existing, no +1 but schedule has ramp
  return {
    value: v,
    provenance: [
      {
        ruleId: 'hc-rn',
        ruleLabel: 'RN headcount',
        inputs,
        note: `RN path keeps headcount at ${v} but spends schedule on ramp instead of hiring.`,
      },
    ],
  };
}

function calcTotalCostToShip(w: World): { value: number; provenance: ProvenanceStep[] } {
  const weeks = Number(w.nodes['schedule_weeks']?.value ?? 0);
  const monthly = Number(w.nodes['cost_monthly']?.value ?? 0);
  const months = weeks / 4.33;
  const value = Math.round(monthly * months);
  const inputs = ['schedule_weeks', 'cost_monthly'];
  return {
    value,
    provenance: [
      {
        ruleId: 'cost-ship',
        ruleLabel: 'Cost to ship',
        inputs,
        note: `${weeks} weeks ≈ ${months.toFixed(1)} mo × $${monthly}/mo ≈ $${value}.`,
      },
    ],
  };
}

type CalcFn = (w: World) => { value: boolean | number | string; provenance: ProvenanceStep[] };

const CALCULATORS: Record<string, CalcFn> = {
  architecture: calcArchitecture,
  schedule_weeks: calcSchedule,
  distribution: calcDistribution,
  push_capability: calcPush,
  offline_capability: calcOffline,
  onboarding_completion_target: calcOnboardingTarget,
  cost_monthly: calcCostMonthly,
  headcount_needed: calcHeadcount,
  total_cost_to_ship: calcTotalCostToShip,
};

/** Topological-ish order: run known calc ids in dependency-safe sequence. */
const CALC_ORDER = [
  'architecture',
  'schedule_weeks',
  'distribution',
  'push_capability',
  'offline_capability',
  'onboarding_completion_target',
  'cost_monthly',
  'headcount_needed',
  'total_cost_to_ship',
];

/**
 * Recompute all calculation nodes. Suggestions and facts are left untouched.
 * Assumptions are inputs only.
 */
export function recompute(world: World): World {
  const nodes: Record<string, WorldNode> = { ...world.nodes };
  // clone shallow node objects we will mutate
  for (const id of Object.keys(nodes)) {
    nodes[id] = { ...nodes[id], provenance: [...nodes[id].provenance], dependsOn: [...nodes[id].dependsOn] };
  }

  for (const id of CALC_ORDER) {
    const node = nodes[id];
    if (!node || node.kind !== 'calculation') continue;
    const fn = CALCULATORS[id];
    if (!fn) continue;
    const prev = node.value;
    const { value, provenance } = fn({ ...world, nodes });
    const changed = prev !== value;
    nodes[id] = {
      ...node,
      value,
      provenance,
      status: changed && world.parentId ? 'changed' : node.status === 'baseline' ? 'baseline' : 'holds',
    };
  }

  // Mark suggestions clearly; never copy into fact/calc
  for (const id of Object.keys(nodes)) {
    if (nodes[id].kind === 'suggestion') {
      nodes[id] = { ...nodes[id], status: 'uncertain' };
    }
  }

  return {
    ...world,
    nodes,
    updatedAt: new Date().toISOString(),
  };
}
