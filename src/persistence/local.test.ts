import { beforeEach, describe, expect, it } from 'vitest';
import { defaultWorkspace, loadWorkspace, saveWorkspace } from './local';

function installMemoryLocalStorage() {
  const store = new Map<string, string>();
  const ls = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  };
  // @ts-expect-error test shim
  globalThis.localStorage = ls;
}

describe('local persistence', () => {
  beforeEach(() => {
    installMemoryLocalStorage();
    localStorage.clear();
  });

  it('round-trips workspace through localStorage', () => {
    const s = defaultWorkspace();
    saveWorkspace(s);
    const loaded = loadWorkspace();
    expect(loaded.activeWorldId).toBe(s.activeWorldId);
    expect(loaded.worlds[loaded.activeWorldId].title).toBe('Ship a product');
  });
});
