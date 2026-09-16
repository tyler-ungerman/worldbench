import type { NodeKind, World, WorldNode } from '../engine/types';
import { formatValue, kindLabel } from './format';

const ORDER: NodeKind[] = ['assumption', 'calculation', 'fact', 'suggestion', 'irreversible'];

interface Props {
  world: World;
  selectedId?: string;
  highlightIds?: Set<string>;
  onSelect: (id: string) => void;
  onForkMobile: () => void;
}

export function NodeList({ world, selectedId, highlightIds, onSelect, onForkMobile }: Props) {
  const byKind = (k: NodeKind) =>
    Object.values(world.nodes)
      .filter((n) => n.kind === k)
      .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <section className="node-list" aria-label="World nodes">
      <div className="pane-title">
        <h2>{world.title}</h2>
        <p className="muted">
          Where you are: <strong>{world.branchLabel}</strong>
          {world.forkedAssumptionId && (
            <>
              {' '}
              · forked <code>{world.forkedAssumptionId}</code> {String(world.forkedFromValue)} →{' '}
              {String(world.forkedToValue)}
            </>
          )}
        </p>
      </div>

      {ORDER.map((kind) => {
        const nodes = byKind(kind);
        if (nodes.length === 0) return null;
        return (
          <div key={kind} className="kind-group">
            <h3>
              <span className={`kind-pill kind-${kind}`}>{kindLabel(kind)}</span>
              <span className="count">{nodes.length}</span>
            </h3>
            <ul>
              {nodes.map((n) => (
                <NodeRow
                  key={n.id}
                  node={n}
                  selected={selectedId === n.id}
                  highlight={highlightIds?.has(n.id)}
                  onSelect={onSelect}
                  onForkMobile={n.id === 'need_mobile_app' ? onForkMobile : undefined}
                />
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

function NodeRow({
  node,
  selected,
  highlight,
  onSelect,
  onForkMobile,
}: {
  node: WorldNode;
  selected: boolean;
  highlight?: boolean;
  onSelect: (id: string) => void;
  onForkMobile?: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        className={`node-row ${selected ? 'selected' : ''} ${highlight ? 'highlight' : ''} status-${node.status}`}
        onClick={() => onSelect(node.id)}
      >
        <span className="node-label">{node.label}</span>
        <span className="node-value">{formatValue(node.value, node.unit)}</span>
        <span className={`status-chip status-${node.status}`}>{node.status}</span>
      </button>
      {onForkMobile && (
        <button type="button" className="fork-btn" onClick={onForkMobile}>
          Fork assumption → browser-only
        </button>
      )}
    </li>
  );
}
