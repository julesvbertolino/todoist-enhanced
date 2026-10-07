# Spec: the extension views

The interactive mockup is the visual and behavioural reference:
https://claude.ai/artifact/LHfKugyzbVptcxhSUKiSmJ (Ken can open it). A copy of
its markup is in `docs/ext/mockup/mockup.html`, and its logic in
`mockup-logic.js` (sample data and rules, written for the mockup only). Read
them for intent and copy. **Do not paste them into the app.** Build with the
app's own components and tokens. Where this spec and the mockup differ, this
spec wins.

All rules in the "Rules" lines are pure functions in `src/ext/domain/`, with
tests (see DATA-MODEL.md §3).

## Sidebar

Adds the following to the sidebar, rendered by `ExtNav`:

- **Customers** (count = customers with in-period tasks).
- A group heading **Focus**, with:
  - **Objectives** (count = open objectives today)
  - **Initiatives** (count = live initiatives)
  - **Goals & KPIs**
- **Manage**.

Routes: `#/customers`, `#/objectives`, `#/initiatives`, `#/goals`,
`#/manage` and `#/manage/goals` | `#/manage/initiatives`. Mobile: the same
items are reachable from the existing mobile menu. No new bottom-nav buttons.

## 1. Customers (`#/customers`)

**Header.** Title "Customers". The subtitle summarises the view, for example
"17 tasks · 5 engagements · 6 customers · Mon 28 Sep to Sun 4 Oct".

**Toolbar.**
- **Period segmented control:** Today | This week | All, each with a task
  count. The choice is remembered (view prefs in ext data or localStorage).
- **Customers popover:**
  - multi-select, with All and None;
  - sort: A–Z or Custom; in Custom, ↑/↓ reorder, saved to `customerOrder`.
- **Filters popover:**
  - chips for CSM, Stage and Tier (P1/P2/P3);
  - multi-select within a group is OR, across groups AND;
  - the button shows "Filters · n".
- **Switches:** "Show engagements" (default on) and "Show customers without
  tasks" (default off).

**Customer card**, one per shown customer, in sort order.
- Header: colour mark with initials, name, tier chip, stage chip (stage
  colour), CSM name, task count, a "+" add button, and collapse.
- Engagements block (when visible): each engagement is a card with title, a
  progress bar ("3 of 6 done"), a deadline chip (red if past), an
  overdue/today tint, a collapse control, and its in-period sub-tasks as
  normal task rows.
- Tasks block: the customer's loose tasks in the period, as normal `TaskRow`s.
  A task whose engagement is hidden shows an engagement chip.
- Empty state, when "Show customers without tasks" is on: "No open tasks".

**Creating (inline composer).**
- The card "+" opens a composer with a **Task | Engagement** toggle.
  - Task: title, Due (Today*, Tomorrow, This week, No date) and priority.
  - Engagement: title, Deadline (In 1 week*, In 2 weeks, In a month, No
    deadline).
  - It shows the labels it will apply: `@<customer>`, plus `@engagement` for
    an engagement.
- Inside an engagement card, "Add task" creates a sub-task (`parent_id`) with
  the customer label.
- After a create, a toast: `Added "X" to Avon with label @avon.`

**Rules.** `inPeriod`, `engagementVisible`, `customerEmpty`. A filter with no
matches shows "No customers match these filters" and a Clear button.

## 2. Manage (`#/manage`)

Title "Manage". Tabs: **Customers · Goals & KPIs · Initiatives**, each with a
small summary under its name. The tab is in the URL.

**Customers tab.**
- "Add customer" field. The label preview is the slug; on add, create the
  Todoist label if it is missing.
- Two collapsible cards, side by side (collapsed by default), each showing a
  summary line when closed:
  - **CSMs:** rename inline, add, remove (its customers become Unassigned),
    with a count per CSM.
  - **Stages:** rename, add, remove (its customers move to the first stage),
    reorder ↑/↓, and click the dot to cycle the tone (blue, green, amber, red,
    gray).
  - Duplicate names are refused with a message.
- Table: Customer (editable name) | Todoist label | CSM select | Stage select
  | Tier select | Open tasks | Remove.
  - Remove is two-step ("Remove" → "Confirm" + ×).
  - Footer hint: renaming does not rename the label; removing keeps the label
    and tasks in Todoist.
- "Labels not linked to a customer": Todoist labels that are not marker labels
  and not registered. Each has a one-click Register.

**Goals & KPIs tab.**
- Goals are grouped by focus area. Each group shows a count, with an empty
  state.
- Goal card: editable title, focus-area select, and a KPI table with columns
  Name | Now | Start | Target | Unit | ×.
  - "Add KPI" adds a row.
  - Editing **Now** appends `{at: today, value}` to the history, replacing
    today's entry if there is one.
  - "n initiatives linked".
  - Two-step remove: removing a goal deletes its KPIs and unlinks its
    initiatives and objectives.
- "New goal" form: title and focus-area chips.
- Text and number fields keep what the user types, even if invalid, and save
  only when valid. An empty title is never saved.

**Initiatives tab.**
- Grouped by focus area. Each card shows an editable title and four selects:
  - Focus area: swaps the `focus-*` label.
  - Status: swaps the `status-*` label.
  - Target: keep / In 2 weeks / In a month / End of year / No date, which sets
    `deadline`.
  - Goal: writes `initiativeGoals`.
- When the status is Blocked, a "Blocked on…" field appears. It writes the
  first line of the task description.
- Footer: "n open tasks · n done", and a two-step remove. Removing completes
  the Todoist task (archive); it never deletes it.
- "New initiative" form: name, focus-area chips, status chips (Idea / Planned
  / Active), target chips, and a preview of the labels it will apply.

## 3. Initiatives (`#/initiatives`)

- Subtitle: "6 active initiatives · 1 blocked · 2 without a next action".
- Group by **Focus area | Status** (segmented control). Focus-area filter
  chips with counts. A "Show completed" switch.
- Initiative card:
  - icon in the focus colour, title, focus chip, status select (tinted by
    tone), target chip;
  - warnings (`initiativeWarnings`);
  - progress bar and "3 of 6 done", "Last action N days ago";
  - expandable sub-task list using `TaskRow`, with an "Add a task to this
    initiative" field that creates a sub-task with the initiative's labels;
  - "Supports goal: …" link, which goes to Goals & KPIs filtered to that focus.
- "New initiative": the same form as on Manage.

## 4. Goals & KPIs (`#/goals`)

- Subtitle: "Goals for 2026 · 75% of the year gone · 92 days left".
- **Momentum cards**, one per focus area:
  - mark, name and "why";
  - momentum chip (Rising / Steady / Slowing / Stalling, with tones green /
    blue / amber / red);
  - an 8-week bar chart (the current week in accent);
  - "4 actions this week (floor 2)" and "Last action 1 day ago";
  - a next line: either "n initiatives without a next action" (red) or
    "Next: <first open task of an active initiative>".
  - Clicking a card filters the goals below. Clicking it again clears the
    filter.
- **Goals list** (filtered by the selected focus): title, focus chip, and per
  KPI:
  - name, an editable **Now** input, "target X";
  - a progress bar with an expected-pace marker at `elapsed`;
  - pace chip; delta "+4 vs last month".
- Under each goal: linked initiatives as chips (status dot), which navigate to
  Initiatives.
- Summary line: "4 on track · 5 at risk · 1 behind".
- The bar chart follows the app's chart style (`src/components/charts.tsx`)
  if it fits. Otherwise use simple divs. No chart library.

## 5. Objectives (`#/objectives`)

- Intro line: "A few outcomes per day, week, month and quarter. Each one
  supports the level above it."
- **Cadence tabs:** Day | Week | Month | Quarter, each with "done of total"
  for its shown period. The default is Day.
- **Period bar:**
  - ‹ › arrows, a title and a subtitle (`periodOf`), and "Back to today" when
    the offset is not 0;
  - a "New objective" button.
- **Capacity row:** slot dots, where done = green, open = accent, and over
  the cap = amber. It reads "2 open · 1 done · cap 3", plus a note: free
  slots, "Full…", or "Over the cap of 3. Move one to keep the focus."
- **Objective row:**
  - a checkbox that completes or uncompletes the Todoist task;
  - title (struck through when done) and focus chip;
  - "↑ Week: <parent>" chip, which navigates to the parent's period;
  - "Goal: …" chip (quarter only), which navigates to Goals;
  - when it has children: a progress bar with "1 of 2 daily objectives done",
    which navigates to the first open child's period;
  - "Move to tomorrow / next week / …", which sets the due date to the next
    period's end and applies the parent rule.
- "Move N open to <next>" button for the whole period.
- **New objective form:**
  - title (placeholder "What is the outcome for this week?");
  - focus-area chips, plus "Customer delivery" and "Planning and admin" (no
    focus label);
  - "Supports" select (`parentCandidates`), plus a Goal select on Quarter;
  - preview of the labels and due date ("Due Sun 4 Oct").
  - It creates a task in the objectives project.
- **Plan and review card:** a start prompt and an end prompt per cadence, and
  a notes textarea saved to `notes[periodKey]`.

| Cadence | Start of period | End of period |
| --- | --- | --- |
| Day | Pick the few outcomes that make today a good day. | What got done, what moves to tomorrow, and why? |
| Week | Choose the outcomes for the week, each supporting a monthly objective. | What did I finish, what carries over, and what should I stop doing? |
| Month | Turn the quarter into three outcomes for the month. | Check the KPIs, score each objective, and note what changes next month. |
| Quarter | Set the quarter against your goals and KPIs. | Score each objective, look at KPI movement, and write what you will do differently. |

## Cross-cutting

- Every page works in demo mode, in light and dark, at phone width (cards
  stack, and tables become cards), and with the keyboard (all controls are
  buttons, selects and inputs, with focus rings).
- Every create or remove shows a toast. If the app has a toast or undo
  pattern, use it.
- Loading and offline: show what is cached. Writes queue like upstream's
  (`apply` already handles offline).
