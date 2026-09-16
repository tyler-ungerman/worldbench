import type { NodeKind } from '../engine/types';

export function kindLabel(kind: NodeKind): string {
  switch (kind) {
    case 'fact':
      return 'FACT';
    case 'assumption':
      return 'ASSUMPTION';
    case 'calculation':
      return 'CALCULATION';
    case 'suggestion':
      return 'SUGGESTION';
    case 'irreversible':
      return 'IRREVERSIBLE';
  }
}

export function formatValue(v: boolean | number | string, unit?: string): string {
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') {
    if (unit === 'ratio') return `${Math.round(v * 100)}%`;
    if (unit === 'USD') return `$${v.toLocaleString()}`;
    return unit ? `${v} ${unit}` : String(v);
  }
  return String(v);
}
