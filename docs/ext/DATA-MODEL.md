# Data model

Two sources:

1. **Todoist**: tasks, labels, due dates, deadlines and completion. This is
   the truth for anything that is work.
2. **Extension data**: one JSON document the app keeps for things Todoist has
   no field for.

## 1. What lives in Todoist

| Concept | In Todoist | Notes |
| --- | --- | --- |
| Customer task | Any open task with the customer's label | Exactly one customer label. A task with two customer labels shows under both and gets a warning chip. |
| Engagement / key initiative | A **parent task** with the customer label + `engagement` | Its sub-tasks are the engagement's tasks. Engagement date = the task's `deadline` (fallback: `due`). |
| Engagement task | Sub-task of an engagement (`parent_id`) | Inherits the customer label when created from the app. |
| Initiative (internal) | A **parent task** with `initiative` + `focus-<slug>` + one `status-<slug>` | Lives in the "Initiatives" project by default (configurable). Target date = `deadline`. Sub-tasks are its actions. |
| Initiative status | One `status-*` label: `status-idea`, `status-planned`, `status-active`, `status-blocked`, `status-done` | Changing status swaps the label. `status-done` can also be "the parent task is completed". |
| Objective | A task with `objective` + `period-<day\|week\|month\|quarter>` + optional `focus-<slug>` | Due date = **last day of its period**. Done = task completed. |
| Focus area | A label `focus-<slug>` | The list of focus areas (name, colour, why) is extension data. |
| Planning labels the app already uses | `week`, `quick`, `waiting`, `est-*` | Upstream features. Leave as they are. |

Creating from the app always sets the labels. The user never has to type them.
New customer label: `createLabel(slug)` before the first task uses it.

### Reading rules

- Customer tasks: `openItems` whose labels include a registered customer's label.
- Engagements: those that are parents (have children or carry `engagement`)
  **and** carry `engagement`. Their children are their tasks.
- Initiatives: open tasks with `initiative`. Completed initiatives come from
  the completed API, only when "Show completed" is on.
- Objectives: open tasks with `objective`, plus completed ones in the shown
  period from `useCompleted` (needed to show "2 of 3 done").
- Unknown labels that look like customers: Manage → Customers shows
  "Labels not linked to a customer" so Ken can register them in one click.

## 2. Extension data

Stored as **one Inbox comment** whose first line is the marker
`Enhanced for Todoist · ext data (edited by the app, please leave as is)`,
then a blank line, then one line of JSON. Copy the approach of
`settingsComments` / `ensurePreferencesTask` in `src/store/preferences.ts`:

- Read the newest comment with the marker. If there are duplicates, keep the
  newest (`savedAt`) and delete the rest.
- Write debounced (about 500 ms) through the store's `apply`, with an
  optimistic update.
- Cache in IndexedDB (`src/db/idb.ts` helpers), so the app opens offline.
- Never write in demo mode. Demo data lives in memory.
- Size: check Todoist's maximum comment length in the API docs. If the JSON
  gets near it, split into numbered comments (`… ext data 1/2`). Keep keys
  short, but readable.
- Every document has `v` (schema version). Write a `migrate(doc)` that
  upgrades old versions, and test it.

```ts
// src/ext/data/types.ts
export interface ExtData {
  v: 1;
  savedAt: number;
  settings: {
    labels: {                       // marker label names, editable
      engagement: string;           // 'engagement'
      initiative: string;           // 'initiative'
      objective: string;            // 'objective'
      periodPrefix: string;         // 'period-'
      focusPrefix: string;          // 'focus-'
      statusPrefix: string;         // 'status-'
    };
    initiativesProjectId: string | null;   // where new initiatives go
    objectivesProjectId: string | null;    // where new objectives go
    customersProjectId: string | null;     // where new customer tasks go (null = Inbox)
    soonDays: number;               // 7: Today shows engagements due within this many days
    objectiveCaps: { d: number; w: number; m: number; q: number };  // 3, 5, 3, 3
    momentumFloor: number;          // 2 completed actions per week
    yearStartMonth: number;         // 1 = calendar year (for pace)
  };
  csms: Array<{ id: string; name: string }>;                       // ordered
  stages: Array<{ id: string; name: string; tone: Tone }>;        // ordered
  customers: Array<{
    id: string; name: string; label: string;                       // label = Todoist label name
    csm: string | null; stage: string; tier: 'P1' | 'P2' | 'P3';
    color: string;                                                 // palette key
  }>;
  customerOrder: string[];          // custom sort
  focusAreas: Array<{ id: string; name: string; short: string; label: string; color: string; why: string }>;
  goals: Array<{ id: string; focus: string; title: string }>;
  kpis: Array<{
    id: string; goal: string; name: string; unit: string;
    start: number; target: number;
    history: Array<{ at: string; value: number }>;  // ISO date; latest = current value
  }>;
  initiativeGoals: Record<string, string>;     // Todoist task id → goal id
  objectiveParents: Record<string, string>;    // objective task id → parent objective task id
  objectiveGoals: Record<string, string>;      // quarter objective task id → goal id
  notes: Record<string, string>;               // 'w:2026-W40' | 'd:2026-09-29' | 'm:2026-09' | 'q:2026-Q3' → text
}
export type Tone = 'blue' | 'green' | 'amber' | 'red' | 'gray';
```

The defaults are in `src/ext/data/defaults.ts`:
- 4 stages: Onboarding (blue), Healthy (green), Needs attention (amber),
  At risk (red).
- No CSMs.
- 3 focus areas: Bynder Maturity Framework, Scaling Book of Business,
  Measuring Value of TSM.
- Caps 3/5/3/3, soonDays 7, floor 2.

Ids: `crypto.randomUUID()` sliced to 8 characters.

### Integrity rules (unit-test them)

- Removing a CSM sets its customers' `csm` to null. Removing a stage moves its
  customers to the first stage. At least one stage always exists.
- Removing a goal deletes its KPIs and clears `initiativeGoals` and
  `objectiveGoals` entries pointing at it.
- Removing a customer removes it from `customers` and `customerOrder` only. The
  Todoist label and tasks stay.
- Renaming a customer does **not** rename its label (shown as a hint).
  Renaming the label is a separate, explicit action that renames the Todoist
  label.
- Links pointing at Todoist tasks that no longer exist are ignored on read and
  pruned on the next write.
- Moving an objective to the next period: if its parent's period does not
  contain the new period's start, remove the parent link.

## 3. Derived values (pure functions in `src/ext/domain/`)

| Function | Rule |
| --- | --- |
| `inPeriod(task, period, now)` | today = due ≤ today (includes overdue). week = due ≤ end of this week (Mon–Sun), **or** labelled with the upstream `week` label and undated. all = everything. |
| `engagementVisible(e, period, showEng, now, soonDays)` | false if `!showEng`. all → true. today → deadline within `soonDays`. week → has an in-period task or deadline within `soonDays`. |
| `customerEmpty(c)` | no in-period tasks and no visible engagements |
| `engagementProgress(e)` | done sub-tasks / all sub-tasks (completed count from the completed API, or the number marked done this session) |
| `kpiPace(kpi, now, yearStart)` | `p = (value − start) / (target − start)`, where `target == start` → reached if value ≥ target. `elapsed` = share of the year gone. Reached if p ≥ 1. On track if p ≥ elapsed − 0.05. At risk if p ≥ elapsed × 0.7. Otherwise Behind. Works for "lower is better" KPIs automatically (start > target). |
| `kpiDelta(kpi)` | current − the latest history value at least 28 days older ("vs last month") |
| `momentum(weekly[8], daysSinceLast)` | weekly = completed actions per ISO week for the last 8 weeks, from tasks with the focus label (initiatives, their sub-tasks, objectives). recent = sum of the last 4, prev = sum of the first 4. Stalling if days > 14 or recent = 0. Rising if recent ≥ prev × 1.2. Slowing if recent ≤ prev × 0.7. Otherwise Steady. |
| `initiativeWarnings(i)` | Blocked → the blocked reason (the task's description first line, or "Blocked"). Live (Active/Planned) with no open sub-task → "No next action". Active and last completed sub-task > 14 days ago → "Quiet for N days". |
| `periodOf(cad, offset, now)` | day: that day. week: Mon–Sun, ISO week number. month: calendar month. quarter: calendar quarter. Returns start, end, title (Today, Tomorrow, Yesterday, This week, Next week, Last week, "September 2026", "Q3 2026") and subtitle ("Week 40 · 28 Sep to 4 Oct · 5 days left"). |
| `parentCandidates(cad, offset)` | objectives one level up (day→week→month→quarter) whose period contains this period's **start** |
| `capacity(list, cap)` | slots, `over = list.length > cap` |

Where a rule needs "how many days since the last action", use completed
items from `useCompleted` for the last 8 weeks, fetched once per page
visit and cached.
