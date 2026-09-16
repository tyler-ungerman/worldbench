import { describe, expect, it } from 'vitest';
import { compare, explain, fork, mergeInsight, recompute, suggestExperiments } from './index';
import { createShipProductWorld, SEED_MOBILE_ASSUMPTION_ID } from '../seed/shipProduct';

describe('worldbench engine', () => {
  it('recomputes seed world with mobile=true defaults', () => {
    const w = createShipProductWorld();
    expect(w.nodes['need_mobile_app'].value).toBe(true);
    expect(w.nodes['architecture'].value).toMatch(/React Native|Native/);
    expect(w.nodes['distribution'].value).toMatch(/Store/);
    expect(Number(w.nodes['schedule_weeks'].value)).toBeGreaterThan(12);
    // Non-obvious: store channel → 70% onboarding target
    expect(w.nodes['onboarding_completion_target'].value).toBe(0.7);
    expect(w.nodes['sug_rn'].kind).toBe('suggestion');
  });

  it('fork mobile=false cascades architecture, schedule, distribution, onboarding', () => {
    const main = createShipProductWorld();
    const alt = fork(main, SEED_MOBILE_ASSUMPTION_ID, false, 'browser-only');
    expect(alt.parentId).toBe(main.id);
    expect(alt.nodes['need_mobile_app'].value).toBe(false);
    expect(alt.nodes['architecture'].value).toMatch(/Responsive web/);
    expect(alt.nodes['distribution'].value).toMatch(/URL/);
    expect(Number(alt.nodes['schedule_weeks'].value)).toBe(8);
    // NON-OBVIOUS break
    expect(alt.nodes['onboarding_completion_target'].value).toBe(0.4);
    expect(alt.nodes['onboarding_completion_target'].status).toBe('changed');
    expect(alt.nodes['push_capability'].value).toMatch(/capped|Web push/i);
  });

  it('compare marks holds vs changed', () => {
    const main = createShipProductWorld();
    const alt = fork(main, SEED_MOBILE_ASSUMPTION_ID, false, 'browser-only');
    const cmp = compare(main, alt);
    expect(cmp.changed).toContain('onboarding_completion_target');
    expect(cmp.changed).toContain('architecture');
    expect(cmp.calculationDiffs.some((d) => d.nodeId === 'onboarding_completion_target' && d.status === 'changed')).toBe(
      true,
    );
    expect(cmp.summary).toMatch(/diverge/i);
  });

  it('explain returns provenance for onboarding (non-obvious path)', () => {
    const alt = fork(createShipProductWorld(), SEED_MOBILE_ASSUMPTION_ID, false, 'browser-only');
    const ex = explain(alt, 'onboarding_completion_target');
    expect(ex.kind).toBe('calculation');
    expect(ex.provenance.length).toBeGreaterThan(0);
    expect(ex.narrative + ex.provenance.map((p) => p.note).join(' ')).toMatch(/non-obvious|URL|bounce/i);
    expect(ex.dependsOn.some((d) => d.id === 'distribution' || d.id === 'need_mobile_app')).toBe(true);
  });

  it('suggestExperiments returns cheapest discriminating experiment', () => {
    const main = createShipProductWorld();
    const alt = fork(main, SEED_MOBILE_ASSUMPTION_ID, false, 'browser-only');
    const exps = suggestExperiments(main, alt);
    expect(exps.length).toBeGreaterThan(0);
    expect(exps[0].cost).toBeLessThanOrEqual(exps[exps.length - 1].cost);
    expect(exps.some((e) => e.targetNodeIds.includes('onboarding_completion_target'))).toBe(true);
  });

  it('mergeInsight brings onboarding into main without adopting whole branch', () => {
    const main = createShipProductWorld();
    const alt = fork(main, SEED_MOBILE_ASSUMPTION_ID, false, 'browser-only');
    const merged = mergeInsight(alt, main, ['onboarding_completion_target']);
    // Main still has mobile=true
    expect(merged.nodes['need_mobile_app'].value).toBe(true);
    expect(merged.nodes['architecture'].value).not.toMatch(/Responsive web/);
    // Insight recorded as suggestion, not silently a fact
    const insight = merged.nodes['insight_onboarding_completion_target'];
    expect(insight).toBeTruthy();
    expect(insight.kind).toBe('suggestion');
    expect(insight.value).toBe(0.4);
    expect(insight.kind).not.toBe('fact');
  });

  it('suggestions never become facts via recompute', () => {
    const w = recompute(createShipProductWorld());
    for (const n of Object.values(w.nodes)) {
      if (n.id.startsWith('sug_')) {
        expect(n.kind).toBe('suggestion');
      }
    }
  });

  it('cannot fork a fact', () => {
    const w = createShipProductWorld();
    expect(() => fork(w, 'team_size', 5, 'x')).toThrow(/assumption/i);
  });

  it('acceptance cold path (automated)', () => {
    // 1 open seed
    const main = createShipProductWorld();
    expect(main.title).toBe('Ship a product');
    // 2 fork mobile
    const alt = fork(main, 'need_mobile_app', false, 'browser-only');
    // 3 non-obvious break + explain
    expect(alt.nodes['onboarding_completion_target'].value).toBe(0.4);
    expect(main.nodes['onboarding_completion_target'].value).toBe(0.7);
    const ex = explain(alt, 'onboarding_completion_target');
    expect(ex.provenance.length).toBeGreaterThan(0);
    // 4 discriminating experiment
    const exps = suggestExperiments(main, alt);
    expect(exps[0].observation.length).toBeGreaterThan(10);
    // 5 merge one insight
    const merged = mergeInsight(alt, main, ['onboarding_completion_target']);
    expect(merged.nodes['need_mobile_app'].value).toBe(true);
    expect(merged.nodes['insight_onboarding_completion_target'].kind).toBe('suggestion');
    // 6 persistence round-trip simulated
    const json = JSON.stringify({ main, alt, merged });
    const round = JSON.parse(json);
    expect(round.merged.nodes['insight_onboarding_completion_target'].value).toBe(0.4);
  });
});
