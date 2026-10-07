# Build plan

Eleven phases, numbered 0 to 10. Each one ends green: typecheck, unit tests
and the build pass, and the app still works for someone who never opens the
new pages. One branch and one PR per phase. Merge, then start the next.

Each phase has a **prompt** for Ken to paste into Claude Code, the
**steps**, and **done when** checks.

---

## Phase 0: Baseline

**Prompt**
> Read CLAUDE.md and docs/ext/BUILD-PLAN.md Phase 0. Do Phase 0 only.

**Steps**
1. Run `npm ci`, then `npm run typecheck && npm test && npm run build`. Note
   any upstream failures in the PR. Don't fix upstream.
2. Check that `public/_headers`, `.github/workflows/sync-upstream.yml`,
   `scripts/sync-upstream.sh` (executable) and `UPDATING.md` are present.
3. Add `docs/ext/README.md`, which links SPEC, DATA-MODEL, BUILD-PLAN and
   the mockup.

**Done when** the build is green and the PR's Cloudflare preview loads and
shows the demo.

---

## Phase 1: Extension skeleton and hooks

**Prompt**
> Phase 1. Plan first: list every upstream file you will touch and the exact
> lines, then implement. Keep each hook to a few lines marked `// ext:`.

**Steps**
1. Create `src/ext/routes.ts`:
   - `EXT_VIEWS = ['customers','objectives','initiatives','goals','manage'] as const`
   - `type ExtViewId`
   - `isExtView()`
2. Create `src/ext/i18n.ts`, a tiny `tx(key)` with English strings (French
   optional). It uses the app's locale from the store.
3. Create `src/ext/ExtPage.tsx`, which switches on the view and renders a
   placeholder page using `PageHeader` for each.
4. Create `src/ext/ExtNav.tsx`, the sidebar items as specified in SPEC
   "Sidebar". Match `navItem`'s markup and classes in `Sidebar.tsx` (copy the
   classes, don't import private helpers). Use `navigate()` from
   `useRoute.ts`.
5. Create `src/ext/ext.css`, imported once.
6. Add the hooks from CLAUDE.md's table:
   - `types.ts` (ViewId);
   - `useRoute.ts` (known list);
   - `App.tsx` (render `ExtPage`, and give the contextLabel switch an ext
     case);
   - `Sidebar.tsx` (render `ExtNav`).
7. Add tests: `#/customers` parses to `{view:'customers'}`, and
   `#/manage/goals` keeps `id: 'goals'`.

**Done when**
- All five pages open from the sidebar and by URL.
- Back and forward work.
- Upstream pages are unchanged.
- `git diff upstream/main --stat -- src ':!src/ext'` shows only the hook
  files. If the remote is missing, first run
  `git remote add upstream https://github.com/julesvbertolino/todoist-enhanced.git && git fetch upstream`.

---

## Phase 2: Extension data store

**Prompt**
> Phase 2. Read docs/ext/DATA-MODEL.md §2 and how src/store/preferences.ts
> reads and writes the settings comment. Build the same for extension data,
> under src/ext/data. Unit-test serialisation, migration and merge.

**Steps**
1. `src/ext/data/types.ts`: the `ExtData` interface from DATA-MODEL.md.
2. `src/ext/data/defaults.ts`: the defaults, and `src/ext/data/migrate.ts`.
3. `src/ext/data/comment.ts`:
   - `EXT_MARKER`, `readExtComment(content)`, `extCommentContent(doc)`;
   - `findExtComments(snapshot)`, newest first;
   - size check, and chunking if needed (verify Todoist's comment length
     limit in the API docs first).
4. `src/ext/data/store.ts`: a small zustand store (`useExt`).
   - It loads from IndexedDB, then from the snapshot's comment when sync
     arrives (newest `savedAt` wins).
   - `update(fn)` applies a change immutably, then writes, debounced 500 ms,
     through the main store's `apply` (`note_add` or `note_update`, and
     duplicates deleted).
   - It does nothing in demo mode.
5. `src/ext/data/actions.ts`: typed actions with the integrity rules from
   DATA-MODEL.md:
   - `addCustomer`, `renameCustomer`, `removeCustomer`;
   - `addCsm`, `renameCsm`, `removeCsm`;
   - `addStage`, `renameStage`, `removeStage`, `moveStage`, `cycleTone`;
   - `addGoal`, `updateGoal`, `removeGoal`;
   - `addKpi`, `updateKpi`, `logKpiValue`, `removeKpi`;
   - `linkInitiativeGoal`, `linkObjective`, `setNote`;
   - `setOrder`, `setSettings`.
6. Tests for every integrity rule, the round-trip (content → doc → content),
   migration from a doc without `v`, and duplicate-comment handling.

**Done when**
- Edits in two browser tabs converge after a sync.
- Nothing is written in demo mode.
- The tests cover each action.

---

## Phase 3: Domain rules

**Prompt**
> Phase 3. Implement every function in docs/ext/DATA-MODEL.md §3 as pure
> functions in src/ext/domain with Vitest tests. Use mockup-logic.js only to
> understand intent. Pass "now" in, never read the clock.

**Steps**
1. Create these files:
   - `periods.ts`: `periodOf`, `isoWeek`, `periodKey`, `parentCandidates`;
   - `customers.ts`: `inPeriod`, `engagementVisible`, `customerEmpty`,
     `customerTasks`, `engagementsOf`;
   - `pace.ts`: `elapsedShare`, `kpiPace`, `kpiDelta`;
   - `momentum.ts`: `weeklyCounts`, `momentum`, `daysSinceLast`;
   - `initiatives.ts`: `readInitiative(item)` → {focus, status, target,
     blockedReason}, `initiativeWarnings`, `labelsForInitiative`;
   - `objectives.ts`: `readObjective(item)` → {cadence, focus}, `dueForPeriod`,
     `moveToNext`, `capacity`;
   - `labels.ts`: `slug`, `isMarkerLabel`, `customerLabelOf`,
     `swapPrefixedLabel(labels, prefix, value)`.
2. Fixed-date tests, with now = Tue 29 Sep 2026:
   - week 40 runs 28 Sep to 4 Oct;
   - Q3 ends 30 Sep;
   - a week that starts in September belongs to September;
   - pace at 75% elapsed;
   - a KPI where lower is better;
   - `target == start`;
   - the momentum thresholds.

**Done when** every rule has tests and `npm test` is green.

---

## Phase 4: Manage page

**Prompt**
> Phase 4. Build the Manage page from SPEC §2 using the ext data store and the
> domain functions. Start with the Customers tab, commit, then Goals & KPIs,
> commit, then Initiatives, commit.

**Steps**
1. `src/ext/views/manage/ManagePage.tsx` with tabs (URL `#/manage/<tab>`).
2. `CustomersTab.tsx`:
   - add customer (`createLabel` if needed);
   - collapsible CSM and Stage editors;
   - the table;
   - "Labels not linked to a customer".
3. `GoalsTab.tsx`: goal cards, KPI rows, new goal, two-step remove.
4. `InitiativesTab.tsx`: initiative cards bound to Todoist tasks.
   - Title: `updateTask(content)`.
   - Focus and status: `setTaskLabels` with `swapPrefixedLabel`.
   - Target: `updateTask({deadline})`.
   - Goal: ext data.
   - Blocked reason: the first line of the description.
   - New initiative: `createTask` with labels in the initiatives project.
5. A shared `useDraftField(value, validate, commit)` hook, so inputs keep what
   is typed and save only valid values.

**Done when**
- Everything in SPEC §2 works in demo mode and on a real account.
- Removing a goal unlinks its initiatives.
- Renaming a customer leaves its label alone.

---

## Phase 5: Customers view

**Prompt**
> Phase 5. Build the Customers view from SPEC §1. Reuse TaskRow for task rows
> so completing, opening and dragging behave like everywhere else.

**Steps**
1. `src/ext/views/customers/CustomersPage.tsx`: toolbar (period,
   customers popover, filters popover, switches), using the app's popup rules
   (`docs/component-language.md`).
2. `CustomerCard.tsx`, `EngagementCard.tsx`, `CustomerComposer.tsx` (Task |
   Engagement toggle), and the sub-task composer.
3. View prefs (period, switches, excluded customers, sort) are saved in ext
   data `settings` or localStorage. Choose one and document it.

**Done when**
- The period counts match the rules.
- Today shows only engagements within `soonDays`.
- New tasks and engagements get the right labels and appear at once
  (optimistic).

---

## Phase 6: Initiatives page

**Prompt**
> Phase 6. Build the Initiatives page from SPEC §3.

**Steps**
1. Grouping (focus / status), filter chips, the show-completed switch.
2. Initiative card with warnings, progress, the TaskRow sub-task list and the
   add field.
3. A "Supports goal" link to `#/goals`, with the focus pre-selected.

**Done when** the warnings follow `initiativeWarnings` and adding a task
creates a sub-task with the initiative's labels.

---

## Phase 7: Goals & KPIs page

**Prompt**
> Phase 7. Build the Goals & KPIs page from SPEC §4. Momentum uses completed
> items from the completed API for the last 8 weeks. Fetch once per visit.

**Steps**
1. Momentum cards (`momentum`, `weeklyCounts`, `daysSinceLast`).
2. Goal list with KPI rows (pace bar + marker, pace chip, delta, editable Now
   → `logKpiValue`).
3. Linked initiatives, the pace summary, and focus selection.

**Done when** editing a KPI value updates pace and delta at once, and
completing an initiative task bumps this week's bar after sync.

---

## Phase 8: Objectives page

**Prompt**
> Phase 8. Build the Objectives page from SPEC §5.

**Steps**
1. Cadence tabs, period navigation, and the capacity row.
2. Objective rows: complete or uncomplete, parent chip (navigate), children
   progress, move to the next period.
3. "Move N open to …", the new objective form (labels, due date = end of
   period, parent link, goal link on Quarter), and the plan and review card
   with notes.

**Done when**
- Navigating ‹ › across month and quarter boundaries gives correct titles.
- Moving drops parent links that no longer fit.
- Completed objectives in the period count as done.

---

## Phase 9: Demo data and end-to-end tests

**Prompt**
> Phase 9. Extend demo mode with the sample data from mockup-logic.js
> (customers, engagements, initiatives, goals, KPIs, objectives), then add
> Playwright journeys in e2e/ext-*.spec.ts using e2e/demo.ts.

**Steps**
1. `src/ext/demo.ts` builds the demo ext data and demo tasks. Hook it into
   demo start with one line, if `buildDemoSnapshot` cannot be wrapped from
   outside (prefer wrapping).
2. Journeys:
   - switch the Customers period and check the counts;
   - add an engagement and see its labels;
   - change an initiative's status;
   - edit a KPI and see the pace change;
   - add a weekly objective and move it to next week;
   - remove and restore nothing in Todoist (demo only).
3. Check phone width (Playwright mobile viewport) and dark mode.

**Done when** `npx playwright test` is green, including upstream's journeys.

---

## Phase 10: Release

**Prompt**
> Phase 10. Prepare the first release of the fork.

**Steps**
1. Set the Cloudflare Pages env vars (`NODE_VERSION=22`, `PUBLIC_URL`) and
   check the four curl checks in `docs/deploying.md` against the Pages URL.
   For the manifest, the CSP and `oauth/client.json`, use `_headers` instead
   of `.htaccess`.
2. Run the "Sync upstream" workflow by hand once, to prove the update path.
3. Add a "What this fork adds" section at the bottom of `docs/ext/README.md`.
   Leave upstream's README alone.

**Done when** Ken can sign in on the production URL with "Continue with
Todoist", and a sync PR has been opened by the workflow.
