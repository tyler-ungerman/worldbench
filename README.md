# Worldbench (Branchable Worlds)

Domain-agnostic workspace where **statements have dependencies**. Fork an assumption into a parallel world, recalculate what still holds / what’s uncertain / what changes, inspect why (outcome debugger), get the **cheapest discriminating experiment** when branches disagree, and **merge a single insight** without adopting the whole branch.

Not a game. Not FP&A spreadsheet chrome. Local-first (localStorage), reload-safe.

## Quick start

```bash
cd worldbench
npm install
npm test
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## 10-minute walkthrough (cold path)

1. **Open seed world** — Title: **Ship a product**. You are on `main (mobile = true)`.
2. **Fork the core assumption** — Under ASSUMPTION, find **We need a mobile app**. Click **Fork assumption → browser-only**.
3. **See the non-obvious break** — Select **Onboarding completion target**. It drops from **70% → 40%** because distribution moved from App Store to URL share (bounce vs committed installers). Inspector shows provenance (“why”).
4. **Discriminating experiment** — With compare set to main, the inspector lists cheapest experiments (e.g. measure first-week onboarding by channel).
5. **Merge one insight** — Click **Merge onboarding insight → main**. Main keeps `mobile = true` / store architecture; the rival onboarding number is recorded as a labeled **SUGGESTION** (never silently a fact).
6. **Reload** — Refresh the browser; branches and merged insights persist via localStorage. Use **Reset** to restore the seed.

Automated coverage of this path: `npm test` (`acceptance cold path`).

## Typed node kinds (always labeled in UI)

| Kind | Meaning |
|------|---------|
| **FACT** | External; not reversible by branching |
| **ASSUMPTION** | Editable; forking creates branches |
| **CALCULATION** | Recomputed from rules + assumptions + facts |
| **SUGGESTION** | AI/heuristic; labeled; never executed as truth |
| **IRREVERSIBLE** | Logged actions; not undone by branch switch |

## Engine API (pure TypeScript)

```ts
recompute(world)
fork(world, assumptionId, newValue, label)
compare(a, b)
explain(world, nodeId)
suggestExperiments(a, b)
mergeInsight(from, to, nodeIds)
```

## Seed cascades (mobile true vs false)

- Architecture: native/RN shells vs responsive web  
- Schedule weeks: store review + optional RN ramp vs faster web  
- Distribution: App Store review vs URL share  
- Push / offline: native-reliable vs capped web  
- Cost / headcount rough calcs  
- **Non-obvious:** onboarding completion target depends on distribution channel  

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server |
| `npm test` | Vitest (engine + persistence) |
| `npm run build` | Production build |
| `npm run preview` | Preview build |

## License

MIT
