/** Typed node kinds — must be labeled in UI. */
export type NodeKind =
  | 'fact'
  | 'assumption'
  | 'calculation'
  | 'suggestion'
  | 'irreversible';

export type NodeStatus = 'holds' | 'uncertain' | 'changed' | 'baseline';

export type ValueType = 'boolean' | 'number' | 'string' | 'enum';

export interface ProvenanceStep {
  ruleId: string;
  ruleLabel: string;
  inputs: string[];
  note: string;
}

export interface WorldNode {
  id: string;
  kind: NodeKind;
  label: string;
  value: boolean | number | string;
  valueType: ValueType;
  unit?: string;
  description?: string;
  /** For assumptions: whether forking this creates a branch. */
  branchable?: boolean;
  /** Dependency node ids (also mirrored in edges). */
  dependsOn: string[];
  /** Human-readable calculation rule id when kind=calculation. */
  ruleId?: string;
  status: NodeStatus;
  provenance: ProvenanceStep[];
  /** Suggestions are never executed as truth. */
  suggestionSource?: 'heuristic' | 'ai';
}

export interface Edge {
  from: string;
  to: string;
}

export interface IrreversibleAction {
  id: string;
  label: string;
  at: string;
  detail: string;
  worldId: string;
}

export interface World {
  id: string;
  title: string;
  /** Branch display name */
  branchLabel: string;
  parentId?: string;
  forkedAssumptionId?: string;
  forkedFromValue?: boolean | number | string;
  forkedToValue?: boolean | number | string;
  nodes: Record<string, WorldNode>;
  edges: Edge[];
  actionLog: IrreversibleAction[];
  createdAt: string;
  updatedAt: string;
}

export interface NodeDiff {
  nodeId: string;
  label: string;
  kind: NodeKind;
  aValue: boolean | number | string | undefined;
  bValue: boolean | number | string | undefined;
  status: 'same' | 'changed' | 'onlyA' | 'onlyB';
}

export interface Comparison {
  assumptionDiffs: NodeDiff[];
  calculationDiffs: NodeDiff[];
  holds: string[];
  changed: string[];
  uncertain: string[];
  summary: string;
}

export interface Explanation {
  nodeId: string;
  label: string;
  kind: NodeKind;
  value: boolean | number | string;
  status: NodeStatus;
  dependsOn: { id: string; label: string; value: boolean | number | string; kind: NodeKind }[];
  provenance: ProvenanceStep[];
  narrative: string;
}

export interface Experiment {
  id: string;
  title: string;
  description: string;
  /** Observation / measurement to run */
  observation: string;
  /** Which output disagreement it targets */
  targetNodeIds: string[];
  /** Estimated relative cost (lower = cheaper) */
  cost: number;
  costLabel: string;
  /** Predicted: if observation goes one way, which branch dies */
  killCondition: string;
}

export interface WorkspaceState {
  version: 1;
  worlds: Record<string, World>;
  activeWorldId: string;
  compareWorldId?: string;
  mergedInsightLog: { at: string; fromId: string; toId: string; nodeIds: string[]; labels: string[] }[];
}
