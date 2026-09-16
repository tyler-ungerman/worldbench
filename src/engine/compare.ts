import type { Comparison, NodeDiff, World } from './types';

function diffNode(
  a: World,
  b: World,
  id: string,
): NodeDiff | null {
  const na = a.nodes[id];
  const nb = b.nodes[id];
  if (!na && !nb) return null;
  if (!na) {
    return {
      nodeId: id,
      label: nb!.label,
      kind: nb!.kind,
      aValue: undefined,
      bValue: nb!.value,
      status: 'onlyB',
    };
  }
  if (!nb) {
    return {
      nodeId: id,
      label: na.label,
      kind: na.kind,
      aValue: na.value,
      bValue: undefined,
      status: 'onlyA',
    };
  }
  return {
    nodeId: id,
    label: na.label,
    kind: na.kind,
    aValue: na.value,
    bValue: nb.value,
    status: na.value === nb.value ? 'same' : 'changed',
  };
}

export function compare(a: World, b: World): Comparison {
  const ids = new Set([...Object.keys(a.nodes), ...Object.keys(b.nodes)]);
  const assumptionDiffs: NodeDiff[] = [];
  const calculationDiffs: NodeDiff[] = [];
  const holds: string[] = [];
  const changed: string[] = [];
  const uncertain: string[] = [];

  for (const id of ids) {
    const d = diffNode(a, b, id);
    if (!d) continue;
    const kind = a.nodes[id]?.kind ?? b.nodes[id]?.kind;
    if (kind === 'assumption') assumptionDiffs.push(d);
    if (kind === 'calculation') calculationDiffs.push(d);
    if (kind === 'suggestion') {
      uncertain.push(id);
      continue;
    }
    if (d.status === 'same') holds.push(id);
    else if (d.status === 'changed') changed.push(id);
    else uncertain.push(id);
  }

  const changedCalcs = calculationDiffs.filter((d) => d.status === 'changed');
  const summary =
    changedCalcs.length === 0
      ? 'Branches agree on all calculations.'
      : `${changedCalcs.length} calculation(s) diverge: ${changedCalcs.map((d) => d.label).join(', ')}.`;

  return { assumptionDiffs, calculationDiffs, holds, changed, uncertain, summary };
}
