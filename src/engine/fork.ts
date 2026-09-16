import type { World } from './types';
import { recompute } from './recompute';

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Fork a world by changing one assumption. Creates a parallel world;
 * recalculates what holds / changes. Facts and irreversible actions are copied
 * (actions remain logged — not undone by the fork).
 */
export function fork(
  world: World,
  assumptionId: string,
  newValue: boolean | number | string,
  label: string,
): World {
  const node = world.nodes[assumptionId];
  if (!node) throw new Error(`Unknown node: ${assumptionId}`);
  if (node.kind !== 'assumption') {
    throw new Error(`Can only fork assumptions (got ${node.kind})`);
  }
  if (node.branchable === false) {
    throw new Error(`Assumption ${assumptionId} is not branchable`);
  }

  const nodes = Object.fromEntries(
    Object.entries(world.nodes).map(([id, n]) => [
      id,
      {
        ...n,
        dependsOn: [...n.dependsOn],
        provenance: [...n.provenance],
        status: n.kind === 'calculation' ? ('baseline' as const) : n.status,
      },
    ]),
  );

  const oldValue = nodes[assumptionId].value;
  nodes[assumptionId] = {
    ...nodes[assumptionId],
    value: newValue,
    status: 'changed',
  };

  const child: World = {
    id: uid('world'),
    title: world.title,
    branchLabel: label,
    parentId: world.id,
    forkedAssumptionId: assumptionId,
    forkedFromValue: oldValue,
    forkedToValue: newValue,
    nodes,
    edges: world.edges.map((e) => ({ ...e })),
    actionLog: world.actionLog.map((a) => ({ ...a })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const recomputed = recompute(child);

  // After recompute, mark calculation statuses vs parent
  const marked = { ...recomputed, nodes: { ...recomputed.nodes } };
  for (const id of Object.keys(marked.nodes)) {
    const n = marked.nodes[id];
    if (n.kind !== 'calculation') continue;
    const parentVal = world.nodes[id]?.value;
    marked.nodes[id] = {
      ...n,
      status: parentVal === n.value ? 'holds' : 'changed',
    };
  }

  return marked;
}
