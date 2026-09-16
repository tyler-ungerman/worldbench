import type { Comparison, Experiment, Explanation, World } from '../engine/types';
import { formatValue, kindLabel } from './format';

interface Props {
  world: World;
  explanation?: Explanation;
  comparison?: Comparison;
  experiments?: Experiment[];
  compareLabel?: string;
  onMergeOnboarding: () => void;
  canMergeOnboarding: boolean;
}

export function Inspector({
  world,
  explanation,
  comparison,
  experiments,
  compareLabel,
  onMergeOnboarding,
  canMergeOnboarding,
}: Props) {
  return (
    <aside className="inspector" aria-label="Inspector">
      <h2>Inspector</h2>

      {explanation ? (
        <div className="card" data-testid="explain-panel">
          <div className="card-head">
            <span className={`kind-pill kind-${explanation.kind}`}>{kindLabel(explanation.kind)}</span>
            <strong>{explanation.label}</strong>
          </div>
          <p className="value-lg">{formatValue(explanation.value, world.nodes[explanation.nodeId]?.unit)}</p>
          <p className="narrative">{explanation.narrative}</p>
          {explanation.dependsOn.length > 0 && (
            <>
              <h4>Depends on</h4>
              <ul className="dep-list">
                {explanation.dependsOn.map((d) => (
                  <li key={d.id}>
                    <span className={`kind-pill kind-${d.kind}`}>{kindLabel(d.kind)}</span>
                    {d.label}: <code>{String(d.value)}</code>
                  </li>
                ))}
              </ul>
            </>
          )}
          {explanation.provenance.length > 0 && (
            <>
              <h4>Why (provenance)</h4>
              <ol className="prov-list">
                {explanation.provenance.map((p, i) => (
                  <li key={`${p.ruleId}-${i}`}>
                    <strong>{p.ruleLabel}</strong> — {p.note}
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      ) : (
        <p className="muted">Select a node to inspect why it holds.</p>
      )}

      {comparison && (
        <div className="card" data-testid="compare-panel">
          <h3>Compare vs {compareLabel ?? 'other'}</h3>
          <p>{comparison.summary}</p>
          <h4>Changed calculations</h4>
          <ul>
            {comparison.calculationDiffs
              .filter((d) => d.status === 'changed')
              .map((d) => (
                <li key={d.nodeId}>
                  <strong>{d.label}</strong>: {String(d.aValue)} → {String(d.bValue)}
                </li>
              ))}
          </ul>
          <p className="muted">
            Holds: {comparison.holds.length} · Changed: {comparison.changed.length} · Uncertain:{' '}
            {comparison.uncertain.length}
          </p>
        </div>
      )}

      {experiments && experiments.length > 0 && (
        <div className="card" data-testid="experiment-panel">
          <h3>Discriminating experiments</h3>
          <p className="muted">Cheapest observation that would make branch outputs disagree (or kill one).</p>
          {experiments.map((e) => (
            <div key={e.id} className="experiment">
              <div className="exp-head">
                <strong>{e.title}</strong>
                <span className="cost">{e.costLabel}</span>
              </div>
              <p>{e.description}</p>
              <p>
                <em>Observe:</em> {e.observation}
              </p>
              <p>
                <em>Kill condition:</em> {e.killCondition}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="card" data-testid="merge-panel">
        <h3>Merge insight</h3>
        <p className="muted">
          Bring a single insight into the other branch without adopting the whole world.
        </p>
        <button
          type="button"
          className="primary"
          disabled={!canMergeOnboarding}
          onClick={onMergeOnboarding}
          data-testid="merge-onboarding"
        >
          Merge onboarding insight → main
        </button>
      </div>

      {world.actionLog.length > 0 && (
        <div className="card">
          <h3>Irreversible log</h3>
          <ul>
            {world.actionLog.map((a) => (
              <li key={a.id}>
                <strong>{a.label}</strong>
                <div className="muted">{a.detail}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
