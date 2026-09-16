import type { WorkspaceState, World } from '../engine/types';
import { createShipProductWorld } from '../seed/shipProduct';

const KEY = 'worldbench.workspace.v1';

export function defaultWorkspace(): WorkspaceState {
  const main = createShipProductWorld();
  return {
    version: 1,
    worlds: { [main.id]: main },
    activeWorldId: main.id,
    mergedInsightLog: [],
  };
}

export function loadWorkspace(): WorkspaceState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultWorkspace();
    const parsed = JSON.parse(raw) as WorkspaceState;
    if (parsed.version !== 1 || !parsed.worlds || !parsed.activeWorldId) {
      return defaultWorkspace();
    }
    return parsed;
  } catch {
    return defaultWorkspace();
  }
}

export function saveWorkspace(state: WorkspaceState): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function resetWorkspace(): WorkspaceState {
  const s = defaultWorkspace();
  saveWorkspace(s);
  return s;
}

export function upsertWorld(state: WorkspaceState, world: World): WorkspaceState {
  return {
    ...state,
    worlds: { ...state.worlds, [world.id]: world },
    activeWorldId: world.id,
  };
}
