import type { WorkspaceState } from '../engine/types';

interface Props {
  state: WorkspaceState;
  onSelect: (id: string) => void;
  onCompare: (id: string | undefined) => void;
  onReset: () => void;
}

export function BranchBar({ state, onSelect, onCompare, onReset }: Props) {
  const worlds = Object.values(state.worlds);
  return (
    <header className="branch-bar">
      <div className="brand">
        <strong>Worldbench</strong>
        <span className="muted">Branchable Worlds</span>
      </div>
      <div className="branch-tabs" role="tablist" aria-label="Worlds">
        {worlds.map((w) => (
          <button
            key={w.id}
            type="button"
            role="tab"
            className={w.id === state.activeWorldId ? 'tab active' : 'tab'}
            aria-selected={w.id === state.activeWorldId}
            onClick={() => onSelect(w.id)}
          >
            {w.branchLabel}
          </button>
        ))}
      </div>
      <div className="branch-actions">
        <label className="compare-label">
          Compare with
          <select
            value={state.compareWorldId ?? ''}
            onChange={(e) => onCompare(e.target.value || undefined)}
          >
            <option value="">—</option>
            {worlds
              .filter((w) => w.id !== state.activeWorldId)
              .map((w) => (
                <option key={w.id} value={w.id}>
                  {w.branchLabel}
                </option>
              ))}
          </select>
        </label>
        <button type="button" className="ghost" onClick={onReset} title="Reset seed world">
          Reset
        </button>
      </div>
    </header>
  );
}
