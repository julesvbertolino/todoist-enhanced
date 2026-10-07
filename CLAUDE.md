# CLAUDE.md: Ken's fork of Enhanced for Todoist

This repo is a fork of `julesvbertolino/todoist-enhanced` (React 18, TypeScript,
Vite, zustand, idb, dnd-kit, no UI framework). The fork adds views for a
Technical Success Manager at Bynder:

- **Customers**: customer tasks and engagements, from customer labels.
- **Manage**: customers, CSMs, stages, goals and KPIs, initiatives.
- **Initiatives**: internal projects per focus area.
- **Goals & KPIs**: goals, KPI pace, focus-area momentum.
- **Objectives**: day, week, month and quarter objectives that ladder up.

Read these before any change:

1. `docs/ext/SPEC.md`: what each view does, with its exact rules.
2. `docs/ext/DATA-MODEL.md`: how everything maps onto Todoist, and the
   extension data the app stores itself.
3. `docs/ext/BUILD-PLAN.md`: the phases. Work on one phase at a time.
4. `docs/component-language.md`: the app's own UI rules (tokens, controls,
   popups). New UI follows it.

## The one rule: keep upstream mergeable

Upstream ships updates that we merge weekly (see `UPDATING.md`). Every change
to an upstream file is a future merge conflict.

- All new code lives under **`src/ext/`**: views, components, domain rules,
  store, i18n strings and CSS (`src/ext/ext.css`, imported once).
- Upstream files may only be touched at the **hook points** listed below. Each
  hook is a few lines, marked with a `// ext:` comment, and imports from
  `src/ext/`.
- Never reformat, rename or reorder upstream code. Never change upstream
  behaviour. If something upstream is in the way, wrap it from `src/ext/`.
- No new npm dependencies unless the phase says so.

### Allowed hook points

| File | Change |
| --- | --- |
| `src/domain/types.ts` | `ViewId` union gains `\| ExtViewId` (type import from `@/ext/routes`) |
| `src/hooks/useRoute.ts` | the `known` list spreads `...EXT_VIEWS` |
| `src/App.tsx` | renders `<ExtPage route={route} onOpen={openTask} />` for ext views, and the `contextLabel` switch gets an ext case so `t('nav.<view>')` is never called for an ext view |
| `src/components/Sidebar.tsx` | renders `<ExtNav current={route.view} />` (its own component and strings) after the Labels item |
| `src/main.tsx` or `src/App.tsx` | one `import '@/ext/ext.css'` |
| `public/_headers`, `vite.config.ts` | only to keep the CSP in step, if a phase adds a new host |

Anything else needs a note in the pull request explaining why it cannot live
in `src/ext/`.

## How to work

- Start each phase in plan mode. Read the phase in `BUILD-PLAN.md`, list the
  files you will create or touch, then implement.
- Pure rules go in `src/ext/domain/*.ts` with Vitest tests next to them
  (`*.test.ts`). Components stay thin.
- Use the app's existing building blocks before writing new ones:
  - `PageHeader`, `TaskGroup` and `TaskRow`, `Select`, `DateField`, `Icon`
    (`IconName` in `src/components/Icon.tsx`), and the `.btn` classes.
  - Store actions `createTask`, `createLabel`, `updateTask`, `setTaskLabels`,
    `toggleTask` and `apply`.
  - The `hasLabel` helper in `src/domain/views.ts`, `useData`, and
    `useCompleted` / `src/api/completed.ts`.
- Strings live in `src/ext/i18n.ts` (English first, French keys optional), not
  in `src/i18n/en.ts`.
- Demo mode must work. "Explore with demo data" shows sample customers,
  initiatives, goals and objectives (see Phase 9). Never write to Todoist in
  demo mode.
- After every phase run these, and fix everything before committing:

  ```bash
  npm run typecheck && npm test && npm run build
  npx playwright test   # from Phase 9 on, and before any PR
  ```

- One commit per phase step, with a message like
  `ext(customers): engagement visibility rules`. Push to a branch and open a
  PR. Cloudflare Pages builds a preview for it.

## Conventions (from the spec)

- Customer label = slug of the customer name (`aston-martin`). One customer
  label per task.
- Marker labels: `engagement`, `initiative`, `objective`;
  `period-day|week|month|quarter`; `focus-<slug>`; `status-<slug>`. All are
  configurable in extension settings, and these are the defaults.
- Everything Todoist cannot hold (customer CSM, stage, tier, goals, KPIs, links
  between objectives, period notes) is **extension data**. It is stored as JSON
  in its own Inbox comment, with its own marker, the same way upstream stores
  settings (`src/store/preferences.ts`). See DATA-MODEL.md.
- Dates: "today" comes from the app's existing helpers (`useToday`,
  `src/domain/dates.ts`). Never `new Date()` in a rule. Pass "now" in, so the
  tests can fix it.
- UI copy is short, sentence case, no exclamation marks, and uses Ken's words:
  engagement, initiative, focus area, objective, CSM, stage, tier (P1/P2/P3).
