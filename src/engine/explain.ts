import type { Explanation, World } from './types';

export function explain(world: World, nodeId: string): Explanation {
  const node = world.nodes[nodeId];
  if (!node) throw new Error(`Unknown node: ${nodeId}`);

  const dependsOn = node.dependsOn.map((id) => {
    const n = world.nodes[id];
    return {
      id,
      label: n?.label ?? id,
      value: n?.value ?? '?',
      kind: n?.kind ?? ('fact' as const),
    };
  });

  let narrative: string;
  if (node.kind === 'fact') {
    narrative = `"${node.label}" is an external fact — branching does not reverse it.`;
  } else if (node.kind === 'assumption') {
    narrative = `"${node.label}" is an editable assumption (currently ${String(node.value)}). Forking it creates a parallel world.`;
  } else if (node.kind === 'suggestion') {
    narrative = `"${node.label}" is a labeled suggestion (${node.suggestionSource ?? 'heuristic'}) — not executed as truth.`;
  } else if (node.kind === 'irreversible') {
    narrative = `"${node.label}" is an irreversible action log entry — switching branches does not undo it.`;
  } else {
    const steps = node.provenance.map((p) => p.note).join(' ');
    narrative =
      steps ||
      `"${node.label}" is recomputed from rules + assumptions + facts.`;
  }

  return {
    nodeId,
    label: node.label,
    kind: node.kind,
    value: node.value,
    status: node.status,
    dependsOn,
    provenance: node.provenance,
    narrative,
  };
}
