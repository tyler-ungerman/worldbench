import type { World } from './types';
import { recompute } from './recompute';

/**
 * Merge a single insight (selected node ids) from one world into another
 * without adopting the whole branch.
 *
 * - Calculations: copy the *value* as a frozen insight note onto a suggestion
 *   OR, for explicit insight merge of calculation outputs the user accepts,
 *   we attach an assumption override / fact-like insight record.
 * - We never silently turn suggestions into facts.
 * - For demo: merging calculation node ids copies their values into the target
 *   as tagged "merged insight" suggestions PLUS optionally pins matching
 *   assumption only if requested via nodeIds that are assumptions.
 *
 * Product intent: take e.g. onboarding_completion_target insight into main
 * without taking mobile=false architecture.
 */
export function mergeInsight(from: World, to: World, nodeIds: string[]): World {
  if (nodeIds.length === 0) throw new Error('No node ids to merge');

  const nodes = Object.fromEntries(
    Object.entries(to.nodes).map(([id, n]) => [
      id,
      {
        ...n,
        dependsOn: [...n.dependsOn],
        provenance: [...n.provenance],
      },
    ]),
  );

  for (const id of nodeIds) {
    const src = from.nodes[id];
    if (!src) throw new Error(`Source missing node ${id}`);

    if (src.kind === 'suggestion') {
      // Copy suggestion text but keep it labeled suggestion — never promote to fact
      const insightId = `merged_${id}_${Date.now().toString(36)}`;
      nodes[insightId] = {
        id: insightId,
        kind: 'suggestion',
        label: `Insight: ${src.label}`,
        value: src.value,
        valueType: src.valueType,
        description: `Merged from branch "${from.branchLabel}" — still a suggestion, not a fact.`,
        dependsOn: [],
        status: 'uncertain',
        provenance: [
          {
            ruleId: 'merge-insight',
            ruleLabel: 'Insight merge',
            inputs: [id],
            note: `Copied suggestion from ${from.branchLabel}; not executed as truth.`,
          },
        ],
        suggestionSource: src.suggestionSource ?? 'heuristic',
      };
      continue;
    }

    if (src.kind === 'assumption') {
      // Pinning an assumption from another branch is allowed explicitly
      if (!nodes[id] || nodes[id].kind !== 'assumption') {
        throw new Error(`Target has no assumption ${id}`);
      }
      nodes[id] = {
        ...nodes[id],
        value: src.value,
        status: 'changed',
        provenance: [
          ...nodes[id].provenance,
          {
            ruleId: 'merge-assumption',
            ruleLabel: 'Merged assumption',
            inputs: [id],
            note: `Assumption value taken from branch "${from.branchLabel}" without adopting other branch deltas.`,
          },
        ],
      };
      continue;
    }

    if (src.kind === 'calculation') {
      // Record accepted insight as a labeled suggestion snapshot + optional override note
      // Also store on a dedicated insight node so main keeps its own recalculated graph
      // but the insight is visible. For onboarding specifically, we allow pinning via
      // a parallel "accepted_onboarding_target" suggestion and update description on calc.
      const insightId = `insight_${id}`;
      nodes[insightId] = {
        id: insightId,
        kind: 'suggestion',
        label: `Accepted insight: ${src.label}`,
        value: src.value,
        valueType: src.valueType,
        unit: src.unit,
        description: `Merged from "${from.branchLabel}" (${String(src.value)}). Labeled suggestion — main calculations still recompute unless you also merge driving assumptions.`,
        dependsOn: src.dependsOn,
        status: 'uncertain',
        provenance: [
          {
            ruleId: 'merge-calc-insight',
            ruleLabel: 'Calculation insight merge',
            inputs: [id],
            note: `Recorded ${src.label}=${String(src.value)} from ${from.branchLabel} as an insight. Did not rewrite the whole branch.`,
          },
        ],
        suggestionSource: 'heuristic',
      };

      // Annotate the calculation on target with provenance about the insight
      if (nodes[id]?.kind === 'calculation') {
        nodes[id] = {
          ...nodes[id],
          provenance: [
            ...nodes[id].provenance,
            {
              ruleId: 'merge-noted',
              ruleLabel: 'Rival insight noted',
              inputs: [insightId],
              note: `Rival branch "${from.branchLabel}" had ${src.label}=${String(src.value)} (main currently ${String(nodes[id].value)}).`,
            },
          ],
        };
      }
      continue;
    }

    if (src.kind === 'fact') {
      throw new Error('Facts are external; merge facts by updating the fact in-place, not via branch merge.');
    }

    if (src.kind === 'irreversible') {
      throw new Error('Irreversible actions cannot be merged away; they are logs.');
    }
  }

  const updated: World = {
    ...to,
    nodes,
    updatedAt: new Date().toISOString(),
  };

  // Recompute target in case assumptions were merged
  const out = recompute(updated);
  // Preserve insight suggestion nodes (recompute doesn't strip unknown nodes)
  return out;
}
