import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  compare,
  explain,
  fork,
  mergeInsight,
  suggestExperiments,
} from './engine';
import type { WorkspaceState } from './engine/types';
import { loadWorkspace, resetWorkspace, saveWorkspace } from './persistence/local';
import { BranchBar } from './ui/BranchBar';
import { Inspector } from './ui/Inspector';
import { NodeList } from './ui/NodeList';

export default function App() {
  const [state, setState] = useState<WorkspaceState>(() => loadWorkspace());
  const [selectedId, setSelectedId] = useState<string>('need_mobile_app');

  useEffect(() => {
    saveWorkspace(state);
  }, [state]);

  const active = state.worlds[state.activeWorldId];
  const compareWorld = state.compareWorldId ? state.worlds[state.compareWorldId] : undefined;

  const explanation = useMemo(() => {
    if (!active || !selectedId || !active.nodes[selectedId]) return undefined;
    return explain(active, selectedId);
  }, [active, selectedId]);

  const comparison = useMemo(() => {
    if (!active || !compareWorld) return undefined;
    return compare(active, compareWorld);
  }, [active, compareWorld]);

  const experiments = useMemo(() => {
    if (!active || !compareWorld) return undefined;
    return suggestExperiments(active, compareWorld);
  }, [active, compareWorld]);

  const highlightIds = useMemo(() => {
    if (!comparison) return undefined;
    return new Set(comparison.changed);
  }, [comparison]);

  const onForkMobile = useCallback(() => {
    if (!active) return;
    const mobile = active.nodes['need_mobile_app'];
    if (!mobile || mobile.kind !== 'assumption') return;
    const newVal = !mobile.value;
    const label = newVal ? 'mobile = true' : 'browser-only (mobile = false)';
    const child = fork(active, 'need_mobile_app', newVal, label);
    setState((s) => ({
      ...s,
      worlds: { ...s.worlds, [child.id]: child },
      activeWorldId: child.id,
      compareWorldId: active.id,
    }));
    setSelectedId('onboarding_completion_target');
  }, [active]);

  const onMergeOnboarding = useCallback(() => {
    const main = Object.values(state.worlds).find((w) => w.id === 'world_main') ?? Object.values(state.worlds)[0];
    const from =
      state.worlds[state.activeWorldId]?.id !== main.id
        ? state.worlds[state.activeWorldId]
        : state.compareWorldId
          ? state.worlds[state.compareWorldId]
          : undefined;
    if (!main || !from || from.id === main.id) return;
    const merged = mergeInsight(from, main, ['onboarding_completion_target']);
    setState((s) => ({
      ...s,
      worlds: { ...s.worlds, [merged.id]: merged },
      activeWorldId: merged.id,
      mergedInsightLog: [
        ...s.mergedInsightLog,
        {
          at: new Date().toISOString(),
          fromId: from.id,
          toId: main.id,
          nodeIds: ['onboarding_completion_target'],
          labels: ['Onboarding completion target'],
        },
      ],
    }));
    setSelectedId('insight_onboarding_completion_target');
  }, [state]);

  const canMergeOnboarding = useMemo(() => {
    const worlds = Object.values(state.worlds);
    if (worlds.length < 2) return false;
    const main = worlds.find((w) => w.id === 'world_main');
    const other = worlds.find((w) => w.id !== 'world_main');
    if (!main || !other) return false;
    const a = main.nodes['onboarding_completion_target']?.value;
    const b = other.nodes['onboarding_completion_target']?.value;
    return a !== b;
  }, [state.worlds]);

  if (!active) {
    return (
      <div className="app">
        <p>No active world.</p>
        <button type="button" onClick={() => setState(resetWorkspace())}>
          Reset
        </button>
      </div>
    );
  }

  return (
    <div className="app">
      <BranchBar
        state={state}
        onSelect={(id) => setState((s) => ({ ...s, activeWorldId: id }))}
        onCompare={(id) => setState((s) => ({ ...s, compareWorldId: id }))}
        onReset={() => {
          setState(resetWorkspace());
          setSelectedId('need_mobile_app');
        }}
      />
      <div className="main-split">
        <NodeList
          world={active}
          selectedId={selectedId}
          highlightIds={highlightIds}
          onSelect={setSelectedId}
          onForkMobile={onForkMobile}
        />
        <Inspector
          world={active}
          explanation={explanation}
          comparison={comparison}
          experiments={experiments}
          compareLabel={compareWorld?.branchLabel}
          onMergeOnboarding={onMergeOnboarding}
          canMergeOnboarding={canMergeOnboarding}
        />
      </div>
    </div>
  );
}
