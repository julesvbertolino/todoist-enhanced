/* Sample data. Today is Tue 29 Sep 2026; "This week" runs to Sun 4 Oct.
   `due` is a day offset from today (null = no date); `week` = tagged for this week.
   `eng` links a task to an engagement (in Todoist: a sub-task of the engagement task).
   Names, CSMs and statuses are placeholders. */
const TODAY = new Date(2026, 8, 29);
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEK_END = 5;
const SOON = 7; // Today view: engagements with a deadline within this many days

const CSMS0 = [
  { id: 'alex', name: 'Alex Rivera' },
  { id: 'sam', name: 'Sam Okafor' },
  { id: 'jo', name: 'Jo Lindqvist' },
  { id: 'priya', name: 'Priya Nair' }
];
const STAGES0 = [
  { id: 'onboarding', name: 'Onboarding', tone: 'blue' },
  { id: 'healthy', name: 'Healthy', tone: 'green' },
  { id: 'attention', name: 'Needs attention', tone: 'amber' },
  { id: 'risk', name: 'At risk', tone: 'red' }
];
const TIERS = ['P1', 'P2', 'P3'];
const TONE_ORDER = ['blue', 'green', 'amber', 'red', 'gray'];
const TONES = {
  blue: { label: 'Blue', bg: '#edf3fd', fg: '#245ca8', dot: '#246fe0' },
  green: { label: 'Green', bg: '#e9f4e8', fg: '#2a6a2e', dot: '#2f7d32' },
  amber: { label: 'Amber', bg: '#fdf5e9', fg: '#8f5a0a', dot: '#c26e00' },
  red: { label: 'Red', bg: '#fdefed', fg: '#a33c32', dot: '#d1453b' },
  gray: { label: 'Gray', bg: '#f1efed', fg: '#5f5b57', dot: '#8a8784' }
};
const TIER_STYLE = {
  P1: 'background:#fdefed;color:#a33c32',
  P2: 'background:#fdf5e9;color:#8f5a0a',
  P3: 'background:#f1efed;color:#5f5b57'
};
const PALETTE = [
  ['#4c8631', '#edf6e9'], ['#b03830', '#fdefed'], ['#6a4aa8', '#f2edfb'], ['#8f5a0a', '#fdf2e2'],
  ['#2f66b0', '#eaf2fd'], ['#2a6b4e', '#e6f2ea'], ['#5f5b57', '#f1efed'], ['#5443a3', '#e7e2fb']
];

const CUSTOMERS0 = [
  { id: 'aston', name: 'Aston Martin', label: 'aston-martin', csm: 'alex', status: 'healthy', tier: 'P1', ink: PALETTE[0][0], soft: PALETTE[0][1] },
  { id: 'avon', name: 'Avon', label: 'avon', csm: 'sam', status: 'attention', tier: 'P1', ink: PALETTE[1][0], soft: PALETTE[1][1] },
  { id: 'lvmh', name: 'LVMH Beauty Tech', label: 'lvmh-beauty-tech', csm: 'alex', status: 'healthy', tier: 'P1', ink: PALETTE[2][0], soft: PALETTE[2][1] },
  { id: 'northwind', name: 'Northwind Foods', label: 'northwind-foods', csm: 'jo', status: 'onboarding', tier: 'P2', ink: PALETTE[3][0], soft: PALETTE[3][1] },
  { id: 'contoso', name: 'Contoso Group', label: 'contoso-group', csm: 'sam', status: 'risk', tier: 'P2', ink: PALETTE[4][0], soft: PALETTE[4][1] },
  { id: 'fabrikam', name: 'Fabrikam Energy', label: 'fabrikam-energy', csm: 'jo', status: 'healthy', tier: 'P3', ink: PALETTE[5][0], soft: PALETTE[5][1] },
  { id: 'tailspin', name: 'Tailspin Travel', label: 'tailspin-travel', csm: 'priya', status: 'healthy', tier: 'P3', ink: PALETTE[6][0], soft: PALETTE[6][1] },
  { id: 'adventure', name: 'Adventure Works', label: 'adventure-works', csm: 'none', status: 'onboarding', tier: 'P3', ink: PALETTE[7][0], soft: PALETTE[7][1] }
];

const ENGAGEMENTS = [
  { id: 'e-hub', cust: 'aston', title: 'Brand Hub Homepage go-live', status: 'ontrack', off: 6, prefix: 'Go-live', doneBase: 4 },
  { id: 'e-sor', cust: 'avon', title: 'Content System of Record rollout', status: 'ontrack', off: 60, prefix: 'Phase 1', doneBase: 6 },
  { id: 'e-cio', cust: 'avon', title: 'CIO business review', status: 'risk', off: 3, prefix: 'Review', doneBase: 2 },
  { id: 'e-plan', cust: 'lvmh', title: 'Success plan 2027', status: 'ontrack', off: 30, prefix: 'Sign-off', doneBase: 3 },
  { id: 'e-mig', cust: 'contoso', title: 'Global asset migration', status: 'risk', off: 21, prefix: 'Cutover', doneBase: 5 }
];

const TASKS = [
  { id: 't1', cust: 'aston', eng: 'e-hub', title: 'Confirm go-live checklist with the partner', due: 0, week: false, prio: 1, est: 30, tags: [] },
  { id: 't2', cust: 'aston', eng: 'e-hub', title: 'Review homepage template with the brand team', due: 1, week: false, prio: 2, est: 45, tags: [] },
  { id: 't3', cust: 'aston', eng: 'e-hub', title: 'Share the editor access list', due: null, week: true, prio: 3, est: 15, tags: [] },
  { id: 't4', cust: 'aston', eng: 'e-hub', title: 'Agree rollback plan for launch day', due: 6, week: false, prio: 2, est: 30, tags: [] },
  { id: 't5', cust: 'aston', eng: null, title: 'Reply on the user licence question', due: -1, week: false, prio: 2, est: 10, tags: ['waiting'] },

  { id: 't6', cust: 'avon', eng: 'e-sor', title: 'Map MarTech integration priorities', due: 2, week: false, prio: 2, est: 60, tags: [] },
  { id: 't7', cust: 'avon', eng: 'e-sor', title: 'Confirm the metadata model with EMEA leads', due: 0, week: false, prio: 1, est: 40, tags: [] },
  { id: 't8', cust: 'avon', eng: 'e-sor', title: 'Draft the market onboarding sequence', due: null, week: true, prio: 2, est: 90, tags: [] },
  { id: 't9', cust: 'avon', eng: 'e-sor', title: 'Plan enablement for the next wave of markets', due: null, week: false, prio: 4, est: null, tags: [] },
  { id: 't10', cust: 'avon', eng: 'e-cio', title: 'Collect adoption numbers for the review', due: -1, week: false, prio: 1, est: 45, tags: [] },
  { id: 't11', cust: 'avon', eng: 'e-cio', title: 'Draft the executive summary', due: 3, week: false, prio: 2, est: 60, tags: [] },
  { id: 't12', cust: 'avon', eng: 'e-cio', title: 'Book a prep call with the sponsor', due: 0, week: false, prio: 3, est: 10, tags: ['quick'] },
  { id: 't13', cust: 'avon', eng: null, title: 'Follow up on the renewal paperwork', due: null, week: false, prio: 4, est: null, tags: [] },

  { id: 't14', cust: 'lvmh', eng: 'e-plan', title: 'Update the activity analysis', due: 1, week: false, prio: 2, est: 60, tags: [] },
  { id: 't15', cust: 'lvmh', eng: 'e-plan', title: 'Review feature adoption gaps', due: null, week: true, prio: 3, est: 45, tags: [] },
  { id: 't16', cust: 'lvmh', eng: null, title: 'Prepare the QBR slides', due: 4, week: false, prio: 2, est: 90, tags: [] },

  { id: 't17', cust: 'northwind', eng: null, title: 'Intro call with an implementation partner', due: 0, week: false, prio: 2, est: 30, tags: [] },
  { id: 't18', cust: 'northwind', eng: null, title: 'Send the maturity assessment recap', due: -2, week: false, prio: 3, est: 20, tags: [] },
  { id: 't19', cust: 'northwind', eng: null, title: 'Check the contract end date', due: null, week: false, prio: 4, est: null, tags: [] },

  { id: 't20', cust: 'contoso', eng: 'e-mig', title: 'Validate the asset taxonomy with the migration team', due: 0, week: false, prio: 2, est: 45, tags: [] },
  { id: 't21', cust: 'contoso', eng: 'e-mig', title: 'Agree the cutover window', due: 8, week: false, prio: 1, est: 30, tags: [] },
  { id: 't22', cust: 'contoso', eng: 'e-mig', title: 'Plan training for regional admins', due: null, week: false, prio: 3, est: null, tags: [] },

  { id: 't23', cust: 'fabrikam', eng: null, title: 'Schedule the workshop follow-up', due: null, week: true, prio: 3, est: 15, tags: [] },

  { id: 't24', cust: 'tailspin', eng: null, title: 'Quarterly check-in', due: 12, week: false, prio: 4, est: null, tags: [] }
];

/* ---------- Focus areas, initiatives, goals and KPIs (sample data) ---------- */
const ELAPSED = 0.75; // share of the year gone on 30 Sep
const FLOOR = 2;      // momentum floor: completed actions per focus area per week
const FOCUS = [
  { id: 'fw', name: 'Bynder Maturity Framework', short: 'Maturity Framework', abbr: 'MF', label: 'focus-maturity-framework', ink: '#6a4aa8', soft: '#f2edfb', why: 'Turn assessments into transformation roadmaps that customers and partners execute.', weekly: [2, 3, 2, 3, 3, 4, 5, 4], last: 1 },
  { id: 'sc', name: 'Scaling Book of Business', short: 'Scaling Book of Business', abbr: 'SB', label: 'focus-scaling-bob', ink: '#2f66b0', soft: '#eaf2fd', why: 'Serve the whole portfolio with a repeatable, tiered motion instead of ad-hoc effort.', weekly: [3, 3, 2, 2, 1, 1, 0, 1], last: 9 },
  { id: 'va', name: 'Measuring Value of TSM', short: 'Measuring Value of TSM', abbr: 'MV', label: 'focus-tsm-value', ink: '#2a6b4e', soft: '#e6f2ea', why: 'Show how technical success moves adoption, retention and expansion.', weekly: [1, 2, 2, 1, 2, 2, 1, 2], last: 3 }
];
const INIT_STATUSES = ['Idea', 'Planned', 'Active', 'Blocked', 'Done'];
const INIT_ORDER = ['Active', 'Blocked', 'Planned', 'Idea', 'Done'];
const INIT_TONE = { Idea: 'gray', Planned: 'blue', Active: 'green', Blocked: 'red', Done: 'gray' };
const INITS0 = [
  { id: 'i1', focus: 'fw', title: 'Enterprise Framework v2: new level names and Agentic pillar', status: 'Active', off: 21, goal: 'g1', doneBase: 3, last: 1 },
  { id: 'i2', focus: 'fw', title: 'CX User Community adoption-funnel model', status: 'Planned', off: 45, goal: 'g1', doneBase: 0, last: 12 },
  { id: 'i3', focus: 'fw', title: 'Partner introduction playbook', status: 'Active', off: 30, goal: 'g2', doneBase: 1, last: 4 },
  { id: 'i4', focus: 'fw', title: 'Framework workshop deck refresh', status: 'Done', off: null, goal: 'g1', doneBase: 4, last: 25 },
  { id: 'i5', focus: 'sc', title: 'Tiered engagement model (P1 / P2 / P3)', status: 'Active', off: 30, goal: 'g3', doneBase: 2, last: 16 },
  { id: 'i6', focus: 'sc', title: 'Account growth analytics in Google Sheets', status: 'Active', off: 14, goal: 'g3', doneBase: 5, last: 2 },
  { id: 'i7', focus: 'sc', title: 'Success plan templates', status: 'Blocked', off: 20, goal: 'g3', doneBase: 3, last: 16, blocked: 'Waiting on CS Ops review' },
  { id: 'i8', focus: 'sc', title: 'Automate QBR preparation', status: 'Idea', off: null, goal: 'g4', doneBase: 0, last: 30 },
  { id: 'i9', focus: 'va', title: 'Value stories library', status: 'Active', off: 40, goal: 'g5', doneBase: 1, last: 3 },
  { id: 'i10', focus: 'va', title: 'TSM impact report for leadership', status: 'Planned', off: 60, goal: 'g5', doneBase: 0, last: 20 },
  { id: 'i11', focus: 'va', title: 'Adoption-lift measurement method', status: 'Active', off: 28, goal: 'g6', doneBase: 2, last: 20 }
];
const INIT_TASKS0 = [
  { id: 'it1', init: 'i1', title: 'Rename maturity levels in the tool, deck and tracker', due: 2, prio: 2 },
  { id: 'it2', init: 'i1', title: 'Define the four Agentic capabilities and how each is scored', due: 5, prio: 2 },
  { id: 'it3', init: 'i1', title: 'Add Bynder MCP as a capability', due: null, prio: 3 },
  { id: 'it4', init: 'i2', title: 'Draft the funnel stages and the metric for each', due: 8, prio: 3 },
  { id: 'it5', init: 'i2', title: 'Test the funnel on two customers', due: null, prio: 3 },
  { id: 'it6', init: 'i3', title: 'List implementation partners by service and region', due: 3, prio: 2 },
  { id: 'it7', init: 'i3', title: 'Agree the introduction-to-proposal handoff with partners', due: null, prio: 3 },
  { id: 'it8', init: 'i5', title: 'Define cadence and offer per tier', due: 4, prio: 2 },
  { id: 'it9', init: 'i5', title: 'Tag every customer with its tier', due: null, prio: 3 },
  { id: 'it10', init: 'i5', title: 'Review the model with leadership', due: 14, prio: 2 },
  { id: 'it11', init: 'i6', title: 'Move the Salesforce export into the sheet', due: 1, prio: 2 },
  { id: 'it12', init: 'i6', title: 'Rebuild the dashboard tabs in Apps Script', due: null, prio: 3 },
  { id: 'it13', init: 'i7', title: 'Chase CS Ops for the template review', due: 1, prio: 1 },
  { id: 'it14', init: 'i9', title: 'Collect three adoption stories from framework customers', due: 6, prio: 2 },
  { id: 'it15', init: 'i9', title: 'Agree the story template with marketing', due: null, prio: 3 }
];
const GOALS = [
  { id: 'g1', focus: 'fw', title: 'Every strategic customer has a scored target state' },
  { id: 'g2', focus: 'fw', title: 'Partners execute the transformation roadmaps' },
  { id: 'g3', focus: 'sc', title: 'Serve the whole portfolio with a tiered motion' },
  { id: 'g4', focus: 'sc', title: 'Take admin off the critical path' },
  { id: 'g5', focus: 'va', title: 'Make the value of TSM visible' },
  { id: 'g6', focus: 'va', title: 'Prove the link to retention' }
];
const KPIS = [
  { id: 'k1', goal: 'g1', name: 'Customers assessed with the Framework', start: 0, cur: 24, tgt: 30, prev: 20, unit: '', dir: 'up' },
  { id: 'k2', goal: 'g1', name: 'Roadmaps agreed with customers', start: 0, cur: 14, tgt: 20, prev: 11, unit: '', dir: 'up' },
  { id: 'k3', goal: 'g2', name: 'Partner introductions made', start: 0, cur: 8, tgt: 12, prev: 6, unit: '', dir: 'up' },
  { id: 'k4', goal: 'g2', name: 'Introductions that reached a proposal', start: 0, cur: 3, tgt: 5, prev: 2, unit: '', dir: 'up' },
  { id: 'k5', goal: 'g3', name: 'Customers with a success plan', start: 0, cur: 31, tgt: 50, prev: 27, unit: '', dir: 'up' },
  { id: 'k6', goal: 'g3', name: 'Proactive touchpoints per P1 account this quarter', start: 0, cur: 2.4, tgt: 3, prev: 1.6, unit: '', dir: 'up' },
  { id: 'k7', goal: 'g4', name: 'Admin hours per week', start: 12, cur: 9, tgt: 6, prev: 10, unit: ' h', dir: 'down' },
  { id: 'k8', goal: 'g5', name: 'Value stories documented', start: 0, cur: 4, tgt: 6, prev: 2, unit: '', dir: 'up' },
  { id: 'k9', goal: 'g5', name: 'Feature adoption lift in engaged accounts', start: 0, cur: 16, tgt: 20, prev: 13, unit: '%', dir: 'up' },
  { id: 'k10', goal: 'g6', name: 'Renewal rate, TSM-engaged accounts', start: 90, cur: 94, tgt: 96, prev: 93, unit: '%', dir: 'up' }
];
const NI_TARGETS = { '2w': 14, '1m': 30, q: 92, none: null };

/* ---- Objectives: day / week / month / quarter ----
   `off` = periods from the current one (0 = this day / week / month / quarter).
   `parent` = the objective one level up that this one supports. `goal` links a quarter objective to a goal.
   Names, dates and outcomes are sample data. */
const CADS = [
  { id: 'd', name: 'Day', adj: 'daily', tag: 'day', cap: 3, plan: 'Pick the few outcomes that make today a good day. Each one supports a weekly objective.', review: 'At the end of the day: what got done, what moves to tomorrow, and why?' },
  { id: 'w', name: 'Week', adj: 'weekly', tag: 'week', cap: 5, plan: 'Choose the outcomes for the week. Each one supports a monthly objective, or stands alone if it is pure customer delivery.', review: 'On Friday: what did I finish, what carries over, and what should I stop doing?' },
  { id: 'm', name: 'Month', adj: 'monthly', tag: 'month', cap: 3, plan: 'Turn the quarter into three outcomes for the month, then break them into weeks.', review: 'At month end: check the KPIs, score each objective, and note what changes next month.' },
  { id: 'q', name: 'Quarter', adj: 'quarterly', tag: 'quarter', cap: 3, plan: 'Set the quarter against your goals and KPIs, at most one or two per focus area.', review: 'At quarter end: score each objective, look at the KPI movement, and write what you will do differently.' }
];
const OBJ_AREAS = FOCUS.map((f) => ({ id: f.id, short: f.short, label: f.label, ink: f.ink, soft: f.soft })).concat([
  { id: 'cust', short: 'Customer delivery', label: 'focus-customers', ink: '#8f5a0a', soft: '#fdf5e9' },
  { id: 'plan', short: 'Planning and admin', label: 'focus-planning', ink: '#5f5b57', soft: '#f1efed' }
]);
const OBJS0 = [
  { id: 'q0', cad: 'q', off: -1, area: 'fw', title: 'Draft the Framework v2 concept', parent: null, goal: 'g1', done: true },
  { id: 'q1', cad: 'q', off: 0, area: 'fw', title: 'Score 30 customers on the Enterprise Framework', parent: null, goal: 'g1', done: false },
  { id: 'q2', cad: 'q', off: 0, area: 'sc', title: 'Success plans live for every P1 account', parent: null, goal: 'g3', done: false },
  { id: 'q3', cad: 'q', off: 0, area: 'va', title: 'Publish 6 value stories', parent: null, goal: 'g5', done: false },
  { id: 'q4', cad: 'q', off: 1, area: 'fw', title: 'Roll out Framework v2 to the CSM team and partners', parent: null, goal: 'g2', done: false },
  { id: 'q5', cad: 'q', off: 1, area: 'sc', title: 'Pilot the tiered motion on P2 and P3 accounts', parent: null, goal: 'g3', done: false },
  { id: 'q6', cad: 'q', off: 1, area: 'va', title: 'Deliver the first TSM impact report to leadership', parent: null, goal: 'g6', done: false },
  { id: 'm6', cad: 'm', off: -1, area: 'fw', title: 'Framework v2 pillars agreed', parent: 'q1', goal: null, done: true },
  { id: 'm1', cad: 'm', off: 0, area: 'fw', title: 'Framework v2 released to CSMs with the updated tracker', parent: 'q1', goal: null, done: false },
  { id: 'm2', cad: 'm', off: 0, area: 'sc', title: 'Success plan template approved by CS Ops', parent: 'q2', goal: null, done: false },
  { id: 'm3', cad: 'm', off: 0, area: 'va', title: 'Four value stories written and reviewed', parent: 'q3', goal: null, done: false },
  { id: 'm4', cad: 'm', off: 1, area: 'fw', title: 'Two partner introductions reach a proposal', parent: 'q4', goal: null, done: false },
  { id: 'm5', cad: 'm', off: 1, area: 'sc', title: 'Every account tiered P1, P2 or P3 with a motion assigned', parent: 'q5', goal: null, done: false },
  { id: 'w8', cad: 'w', off: -1, area: 'fw', title: 'Agree the level names with the framework group', parent: 'm1', goal: null, done: true },
  { id: 'w9', cad: 'w', off: -1, area: 'plan', title: 'Update the KPI values for September', parent: null, goal: null, done: false },
  { id: 'w1', cad: 'w', off: 0, area: 'fw', title: 'Send Framework v2 to the EMEA leads for review', parent: 'm1', goal: null, done: false },
  { id: 'w2', cad: 'w', off: 0, area: 'sc', title: 'Get CS Ops sign-off on the success plan template', parent: 'm2', goal: null, done: false },
  { id: 'w3', cad: 'w', off: 0, area: 'va', title: 'Draft two value stories (Avon and LVMH)', parent: 'm3', goal: null, done: false },
  { id: 'w4', cad: 'w', off: 0, area: 'cust', title: 'Prepare the Avon CIO business review', parent: null, goal: null, done: false },
  { id: 'w5', cad: 'w', off: 0, area: 'cust', title: 'Hand over the Brand Hub go-live plan for Aston Martin', parent: null, goal: null, done: true },
  { id: 'w6', cad: 'w', off: 1, area: 'plan', title: 'Set the Q4 objectives', parent: null, goal: null, done: false },
  { id: 'w7', cad: 'w', off: 1, area: 'fw', title: 'Introduce an implementation partner to Contoso Group', parent: 'm4', goal: null, done: false },
  { id: 'd6', cad: 'd', off: -1, area: 'cust', title: 'Outline the Avon review deck', parent: 'w4', goal: null, done: true },
  { id: 'd7', cad: 'd', off: -1, area: 'fw', title: 'Check the level names with the framework group', parent: 'w1', goal: null, done: false },
  { id: 'd1', cad: 'd', off: 0, area: 'fw', title: 'Rename the maturity levels in the deck', parent: 'w1', goal: null, done: false },
  { id: 'd2', cad: 'd', off: 0, area: 'cust', title: 'Send the recap to Avon', parent: 'w4', goal: null, done: false },
  { id: 'd3', cad: 'd', off: 0, area: 'sc', title: 'Ping CS Ops about the template', parent: 'w2', goal: null, done: true },
  { id: 'd4', cad: 'd', off: 1, area: 'plan', title: 'Review the Q3 KPIs and update the values', parent: null, goal: null, done: false },
  { id: 'd5', cad: 'd', off: 1, area: 'va', title: 'First draft of the Avon value story', parent: 'w3', goal: null, done: false }
];
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const fmtD = (d) => DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()];
const isoWeek = (d) => {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - y0) / 86400000 + 1) / 7);
};
const lc = (x) => (/^(Today|Tomorrow|Yesterday|This week|Next week|Last week)$/.test(x) ? x.toLowerCase() : x);
const periodOf = (c, off) => {
  const y = TODAY.getFullYear(), m = TODAY.getMonth(), d = TODAY.getDate();
  let a, b, title, sub;
  const left = (end) => { const n = Math.round((end - TODAY) / 86400000); return n === 0 ? 'ends today' : n + (n === 1 ? ' day left' : ' days left'); };
  if (c === 'd') {
    a = new Date(y, m, d + off); b = a;
    title = off === 0 ? 'Today' : off === 1 ? 'Tomorrow' : off === -1 ? 'Yesterday' : fmtD(a);
    sub = fmtD(a);
  } else if (c === 'w') {
    const dow = (TODAY.getDay() + 6) % 7;
    a = new Date(y, m, d - dow + 7 * off); b = new Date(y, m, d - dow + 7 * off + 6);
    title = off === 0 ? 'This week' : off === 1 ? 'Next week' : off === -1 ? 'Last week' : 'Week ' + isoWeek(a);
    sub = 'Week ' + isoWeek(a) + ' · ' + a.getDate() + ' ' + MONTHS[a.getMonth()] + ' to ' + b.getDate() + ' ' + MONTHS[b.getMonth()] + (off === 0 ? ' · ' + left(b) : '');
  } else if (c === 'm') {
    a = new Date(y, m + off, 1); b = new Date(y, m + off + 1, 0);
    title = MONTHS_FULL[a.getMonth()] + ' ' + a.getFullYear();
    sub = '1 to ' + b.getDate() + ' ' + MONTHS[b.getMonth()] + (off === 0 ? ' · ' + left(b) : '');
  } else {
    const qi = Math.floor(m / 3) + off;
    a = new Date(y, qi * 3, 1); b = new Date(y, qi * 3 + 3, 0);
    title = 'Q' + (Math.floor(a.getMonth() / 3) + 1) + ' ' + a.getFullYear();
    sub = '1 ' + MONTHS[a.getMonth()] + ' to ' + b.getDate() + ' ' + MONTHS[b.getMonth()] + (off === 0 ? ' · ' + left(b) : '');
  }
  return { start: a, end: b, title: title, sub: sub };
};

const DEFAULT_ORDER = ['avon', 'aston', 'lvmh', 'contoso', 'northwind', 'fabrikam', 'tailspin', 'adventure'];

const inPeriod = (t, p) => {
  if (p === 'all') return true;
  if (p === 'today') return t.due !== null && t.due <= 0;
  return (t.due !== null && t.due <= WEEK_END) || (t.due === null && t.week);
};

const fmtEst = (m) => (m < 60 ? m + ' min' : Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) : ''));
const fmtDate = (off) => {
  const d = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + off);
  return { short: d.getDate() + ' ' + MONTHS[d.getMonth()], day: DAYS[d.getDay()] };
};
const dueInfo = (t) => {
  if (t.due === null) return t.week ? { text: 'This week', color: '#666666' } : null;
  const f = fmtDate(t.due);
  if (t.due < 0) return { text: (t.due === -1 ? 'Yesterday' : f.day + ' ' + f.short) + ' · ' + (-t.due) + 'd', color: '#a33c32' };
  if (t.due === 0) return { text: 'Today', color: '#245ca8' };
  if (t.due === 1) return { text: 'Tomorrow', color: '#666666' };
  return { text: f.day + ' ' + f.short, color: '#666666' };
};
const CHECK = {
  1: 'border:1.5px solid #d1453b;background:rgba(209,69,59,0.07)',
  2: 'border:1.5px solid #c26e00;background:rgba(181,101,0,0.07)',
  3: 'border:1.5px solid #246fe0;background:rgba(36,111,224,0.06)',
  4: 'border:1.5px solid #8a8784;background:transparent'
};
const TAGS = {
  waiting: 'background:#f1efed;color:#5f5b57',
  quick: 'background:#edf3fd;color:#245ca8'
};
const initials = (name) => {
  const w = name.split(' ');
  return (w.length > 1 ? w[0][0] + w[1][0] : name.slice(0, 2)).toUpperCase();
};
const slug = (name) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
const byDue = (a, b) => (a.due === null ? 99 : a.due) - (b.due === null ? 99 : b.due) || a.prio - b.prio;
const chipStyle = (on) => 'height:26px;padding:0 10px;border-radius:999px;font-size:12px;font-weight:600;cursor:pointer;' + (on ? 'background:#fff1f1;border:1px solid #eddede;color:#b03830' : 'background:#ffffff;border:1px solid #dcdcdc;color:#202020');
const switchStyle = (on) => 'width:34px;height:20px;padding:2px;box-sizing:border-box;border:0;border-radius:999px;cursor:pointer;display:flex;align-items:center;justify-content:' + (on ? 'flex-end' : 'flex-start') + ';background:' + (on ? '#d1453b' : '#b3afab');
const optList = (arr) => arr.map((v) => ({ value: v, label: v }));

const DUE_CHIPS = [['today', 'Today'], ['tomorrow', 'Tomorrow'], ['week', 'This week'], ['none', 'No date']];
const DL_CHIPS = [['1w', 'In 1 week'], ['2w', 'In 2 weeks'], ['1m', 'In a month'], ['none', 'No deadline']];
const DL_OFF = { '1w': 7, '2w': 14, '1m': 30, none: null };

class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = {
      page: 'view',
      period: 'week',
      excluded: [],
      fCsm: [], fStatus: [], fTier: [],
      showEmpty: false,
      showEng: true,
      sort: 'alpha',
      order: DEFAULT_ORDER.slice(),
      pop: null,
      collapsedC: {},
      collapsedE: {},
      done: {},
      customers: CUSTOMERS0.slice(),
      csms: CSMS0.slice(),
      stages: STAGES0.slice(),
      newCsm: '',
      newStage: '',
      listsOpen: { csms: false, stages: false },
      groupBy: 'focus',
      initFocus: null,
      showDoneInits: false,
      initStatus: {},
      initOpen: {},
      initDone: {},
      taskDrafts: {},
      addedInitTasks: [],
      newInit: null,
      goalFocus: null,
      kpiVals: {},
      objCad: 'd',
      objOffs: { d: 0, w: 0, m: 0, q: 0 },
      objDone: {},
      objMove: {},
      objParent: {},
      addedObjs: [],
      objDraft: null,
      objNotes: {},
      mTab: 'customers',
      goalsL: GOALS.map((g) => Object.assign({}, g)),
      kpisL: KPIS.map((k) => Object.assign({}, k)),
      initsL: INITS0.map((i) => Object.assign({}, i)),
      newGoal: null,
      confirmDel: null,
      drafts: {},
      addedTasks: [],
      addedEngs: [],
      composer: null,
      toast: '',
      newCust: ''
    };
    this._n = 0;
    this._timer = null;
  }

  renderVals() {
    const s = this.state;
    const set = (p) => this.setState(p);
    const nameOf = (x) => (x.name.trim() ? x.name.trim() : 'Untitled');
    const csmName = (id) => { const f = s.csms.find((x) => x.id === id); return f ? nameOf(f) : 'Unassigned'; };
    const stageOf = (id) => s.stages.find((x) => x.id === id) || s.stages[0];
    const toast = (msg) => {
      set({ toast: msg });
      if (this._timer) clearTimeout(this._timer);
      this._timer = setTimeout(() => this.setState({ toast: '' }), 6000);
    };

    const allTasks = TASKS.concat(s.addedTasks);
    const allEngs = ENGAGEMENTS.concat(s.addedEngs);
    const engById = {};
    allEngs.forEach((e) => { engById[e.id] = e; });
    const openTasks = allTasks.filter((t) => !s.done[t.id]);
    const byName = s.customers.slice().sort((a, b) => a.name.localeCompare(b.name));
    const customOrder = s.order.concat(s.customers.map((c) => c.id).filter((id) => s.order.indexOf(id) < 0));
    const ordered = s.sort === 'alpha' ? byName : customOrder.map((id) => s.customers.find((c) => c.id === id));
    const passes = (c) =>
      (!s.fCsm.length || s.fCsm.indexOf(c.csm) >= 0) &&
      (!s.fStatus.length || s.fStatus.indexOf(c.status) >= 0) &&
      (!s.fTier.length || s.fTier.indexOf(c.tier) >= 0);
    const isSel = (c) => s.excluded.indexOf(c.id) < 0;
    const chosen = ordered.filter((c) => isSel(c) && passes(c));
    const noun = { today: 'today', week: 'this week', all: '' }[s.period];
    const nFilters = s.fCsm.length + s.fStatus.length + s.fTier.length;

    const engVisible = (e, ownCount) => {
      if (!s.showEng) return false;
      const soon = e.off !== null && e.off <= SOON;
      if (s.period === 'all') return true;
      if (s.period === 'today') return soon;
      return ownCount > 0 || soon;
    };

    /* ---------- composer ---------- */
    const defaultDue = { today: 'today', week: 'week', all: 'none' }[s.period];
    const mkComposer = (cust, engId) => {
      const active = !!s.composer && s.composer.cust === cust.id && s.composer.eng === engId;
      const cp = active ? s.composer : { kind: 'task', text: '', due: defaultDue, dl: '1w', prio: 3 };
      const upd = (patch) => set({ composer: Object.assign({}, s.composer, patch) });
      const isTask = engId !== null || cp.kind === 'task';
      const parent = engId !== null ? engById[engId] : null;
      const labelChips = [{ text: '@' + cust.label }].concat(isTask ? [] : [{ text: '@engagement' }]);
      const chips = isTask
        ? DUE_CHIPS.map((d) => ({ label: d[1], active: cp.due === d[0], style: chipStyle(cp.due === d[0]), pick: () => upd({ due: d[0] }) }))
        : DL_CHIPS.map((d) => ({ label: d[1], active: cp.dl === d[0], style: chipStyle(cp.dl === d[0]), pick: () => upd({ dl: d[0] }) }));
      const prios = [1, 2, 3, 4].map((p) => ({ label: 'P' + p, active: cp.prio === p, style: chipStyle(cp.prio === p), pick: () => upd({ prio: p }) }));
      const can = cp.text.trim().length > 0;
      const submit = (ev) => {
        if (ev && ev.preventDefault) ev.preventDefault();
        if (!s.composer || !s.composer.text.trim()) return;
        const k = s.composer;
        const title = k.text.trim();
        this._n += 1;
        if (isTask) {
          const t = {
            id: 'n' + this._n, cust: cust.id, eng: engId, title: title, prio: k.prio, est: null, tags: [],
            due: k.due === 'today' ? 0 : k.due === 'tomorrow' ? 1 : null, week: k.due === 'week', added: true
          };
          set({ addedTasks: s.addedTasks.concat([t]), composer: null });
          const shownNow = inPeriod(t, s.period);
          toast('Added "' + title + '" to ' + cust.name + ' with label @' + cust.label + (parent ? ' as a sub-task of "' + parent.title + '"' : '') + '.' + (shownNow ? '' : ' It is not due ' + (noun || 'in this view') + ', so find it under All time.'));
        } else {
          const e = { id: 'ne' + this._n, cust: cust.id, title: title, status: 'ontrack', off: DL_OFF[k.dl], prefix: 'Deadline', doneBase: 0, added: true };
          set({ addedEngs: s.addedEngs.concat([e]), composer: null });
          let note = '';
          if (!s.showEng) note = ' Engagements are switched off, so turn on Show engagements to see it.';
          else if (s.period === 'today' && (e.off === null || e.off > SOON)) note = ' Today only shows engagements with a deadline in the next ' + SOON + ' days, so it appears in This week or All time.';
          toast('Added engagement "' + title + '" to ' + cust.name + ' with labels @' + cust.label + ' @engagement.' + note);
        }
      };
      const segStyle = (on) => 'height:26px;padding:0 12px;border:0;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;' + (on ? 'background:#ffffff;color:#202020;box-shadow:0 1px 2px rgba(0,0,0,0.12)' : 'background:transparent;color:#5f5b57');
      return {
        text: cp.text,
        placeholder: isTask ? (parent ? 'Sub-task of ' + parent.title : 'Task name') : 'Engagement name, e.g. QBR preparation',
        setText: (ev) => upd({ text: ev && ev.target ? ev.target.value : '' }),
        isTask: isTask,
        isEng: !isTask,
        setTask: () => upd({ kind: 'task' }),
        setEng: () => upd({ kind: 'engagement' }),
        taskSegStyle: segStyle(isTask),
        engSegStyle: segStyle(!isTask),
        chipsTitle: isTask ? 'Due' : 'Deadline',
        chips: chips,
        prios: prios,
        labelChips: labelChips,
        parentLine: parent ? 'Sub-task of ' + parent.title : '',
        submitLabel: isTask ? 'Add task' : 'Add engagement',
        submitStyle: 'height:32px;padding:0 16px;border:0;border-radius:10px;font-size:13px;font-weight:700;color:#ffffff;background:' + (can ? '#d1453b' : '#e3b1ad') + ';cursor:' + (can ? 'pointer' : 'default'),
        submit: submit,
        cancel: () => set({ composer: null })
      };
    };
    const openComposer = (cust, engId, kind) => () =>
      set({ composer: { cust: cust.id, eng: engId, kind: kind, text: '', due: defaultDue, dl: '1w', prio: 3 }, collapsedC: Object.assign({}, s.collapsedC, { [cust.id]: false }), collapsedE: engId ? Object.assign({}, s.collapsedE, { [engId]: false }) : s.collapsedE });

    /* ---------- tasks and cards ---------- */
    const taskVm = (t, chip) => {
      const di = dueInfo(t);
      const parent = t.eng ? engById[t.eng] : null;
      return {
        id: t.id,
        title: t.title,
        checkStyle: 'width:16px;height:16px;margin-top:2px;flex-shrink:0;box-sizing:border-box;border-radius:6px;padding:0;cursor:pointer;' + CHECK[t.prio],
        complete: () => set({ done: Object.assign({}, s.done, { [t.id]: true }) }),
        hasEst: t.est !== null,
        est: t.est === null ? '' : fmtEst(t.est),
        hasDue: !!di,
        due: di ? di.text : '',
        dueStyle: 'display:inline-flex;align-items:center;gap:4px;color:' + (di ? di.color : '#666666'),
        hasEng: !!(chip && parent),
        engName: parent ? parent.title : '',
        tags: t.tags.map((g) => ({ label: g, style: 'display:inline-flex;align-items:center;height:18px;padding:0 7px;border-radius:999px;font-size:11px;font-weight:600;' + TAGS[g] }))
      };
    };

    const cards = chosen.map((c) => {
      const tasks = openTasks.filter((t) => t.cust === c.id && inPeriod(t, s.period)).sort(byDue);
      const engs = allEngs.filter((e) => e.cust === c.id);
      const engCards = engs
        .map((e) => {
          const own = tasks.filter((t) => t.eng === e.id);
          return { e: e, own: own, visible: engVisible(e, own.length) };
        })
        .filter((x) => x.visible)
        .map((x) => {
          const e = x.e;
          const all = allTasks.filter((t) => t.eng === e.id);
          const total = e.doneBase + all.length;
          const done = e.doneBase + all.filter((t) => s.done[t.id]).length;
          const open = !s.collapsedE[e.id];
          const dl = e.off === null ? null : fmtDate(e.off);
          const composerHere = !!s.composer && s.composer.eng === e.id;
          return {
            id: e.id,
            ownIds: x.own.map((t) => t.id),
            vm: {
              id: e.id,
              title: e.title,
              statusLabel: e.status === 'risk' ? 'At risk' : 'On track',
              statusStyle: 'display:inline-flex;align-items:center;gap:5px;height:20px;padding:0 8px;border-radius:999px;font-size:11px;font-weight:600;' + (e.status === 'risk' ? 'background:#fdf5e9;color:#8f5a0a' : 'background:#e9f4e8;color:#2a6a2e'),
              dotStyle: 'width:6px;height:6px;border-radius:999px;display:inline-block;background:' + (e.status === 'risk' ? '#c26e00' : '#2f7d32'),
              hasDeadline: !!dl,
              deadline: dl ? e.prefix + ' ' + dl.short : '',
              progress: total === 0 ? 'No tasks yet' : done + ' of ' + total + ' done',
              barStyle: 'display:block;height:4px;border-radius:2px;background:#2f7d32;width:' + (total === 0 ? 0 : Math.round((done / total) * 100)) + '%',
              inPeriod: s.period === 'all' ? plural(x.own.length, 'open task') : plural(x.own.length, 'task') + (noun ? ' ' + noun : ''),
              open: open,
              noTasks: x.own.length === 0,
              noTasksText: 'No open tasks' + (noun ? ' ' + noun : '') + '.',
              chevStyle: 'flex-shrink:0;stroke:#666666;fill:none;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round;transition:transform 0.15s;transform:rotate(' + (open ? 0 : 180) + 'deg)',
              toggle: () => set({ collapsedE: Object.assign({}, s.collapsedE, { [e.id]: open }) }),
              tasks: x.own.map((t) => taskVm(t, false)),
              composerHere: composerHere,
              composer: mkComposer(c, e.id),
              showAddRow: !composerHere,
              addTask: openComposer(c, e.id, 'task')
            }
          };
        });
      const shownIds = {};
      engCards.forEach((x) => x.ownIds.forEach((id) => { shownIds[id] = true; }));
      const loose = tasks.filter((t) => !shownIds[t.id]);
      const n = tasks.length;
      const hasContent = n > 0 || engCards.length > 0;
      const open = !s.collapsedC[c.id];
      const composerHere = !!s.composer && s.composer.cust === c.id && s.composer.eng === null;
      const parts = [];
      if (hasContent) {
        parts.push(n > 0 ? plural(n, 'task') : 'No tasks' + (noun ? ' ' + noun : ''));
        if (engCards.length) parts.push(plural(engCards.length, 'engagement'));
      } else {
        parts.push('No open tasks' + (noun ? ' ' + noun : ''));
        if (s.showEng && engs.length) parts.push(plural(engs.length, 'engagement') + ' running');
      }
      const stg = stageOf(c.status);
      const st = TONES[stg.tone];
      return {
        id: c.id,
        show: hasContent || s.showEmpty || composerHere,
        vm: {
          id: c.id,
          name: c.name,
          initial: initials(c.name),
          meta: parts.join(' · '),
          tier: c.tier,
          tierStyle: 'display:inline-flex;align-items:center;height:20px;padding:0 8px;border-radius:6px;font-size:11px;font-weight:700;' + TIER_STYLE[c.tier],
          status: nameOf(stg),
          statusStyle: 'display:inline-flex;align-items:center;gap:5px;height:20px;padding:0 8px;border-radius:999px;font-size:11px;font-weight:600;white-space:nowrap;background:' + st.bg + ';color:' + st.fg,
          statusDotStyle: 'width:6px;height:6px;border-radius:999px;display:inline-block;background:' + st.dot,
          csm: csmName(c.csm),
          hasTasks: n > 0,
          hasContent: hasContent,
          taskCount: n,
          open: open,
          showBody: (hasContent && open) || composerHere,
          toggle: () => (hasContent ? set({ collapsedC: Object.assign({}, s.collapsedC, { [c.id]: open }) }) : null),
          cardStyle: 'border:1px solid #f0f0f0;border-radius:14px;background:' + (hasContent ? '#ffffff' : '#fcfbfa') + ';box-shadow:0 1px 2px rgba(28,25,23,0.03)',
          markStyle: 'width:34px;height:34px;flex-shrink:0;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;background:' + c.soft + ';color:' + c.ink,
          chevStyle: 'width:24px;height:24px;border:0;background:none;color:#666666;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform 0.15s;transform:rotate(' + (open ? 0 : 180) + 'deg)',
          hasEngagements: engCards.length > 0,
          engagements: engCards.map((x) => x.vm),
          hasLoose: loose.length > 0,
          loose: loose.map((t) => taskVm(t, true)),
          addLabel: 'Add a task or engagement to ' + c.name,
          openComposer: openComposer(c, null, 'task'),
          composerHere: composerHere,
          composer: mkComposer(c, null),
          showAddRow: !composerHere,
          addTask: openComposer(c, null, 'task'),
          addEng: openComposer(c, null, 'engagement')
        }
      };
    });
    const shown = cards.filter((x) => x.show).map((x) => x.vm);

    const countFor = (p) => openTasks.filter((t) => chosen.some((c) => c.id === t.cust) && inPeriod(t, p)).length;
    const periods = [['today', 'Today'], ['week', 'This week'], ['all', 'All time']].map((d) => {
      const active = s.period === d[0];
      return {
        key: d[0],
        label: d[1],
        count: countFor(d[0]),
        active: active,
        pick: () => set({ period: d[0] }),
        style: 'display:inline-flex;align-items:center;gap:8px;height:30px;padding:0 14px;border:0;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;' + (active ? 'background:#ffffff;color:#202020;box-shadow:0 1px 3px rgba(0,0,0,0.12)' : 'background:transparent;color:#5f5b57'),
        countStyle: 'font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;color:' + (active ? '#b03830' : '#666666')
      };
    });

    /* ---------- customers popover ---------- */
    const move = (id, dir) => {
      const o = customOrder.slice();
      const i = o.indexOf(id);
      const j = i + dir;
      if (j < 0 || j >= o.length) return;
      o.splice(i, 1);
      o.splice(j, 0, id);
      set({ order: o });
    };
    const arrowStyle = (enabled) => 'width:26px;height:26px;flex-shrink:0;border:0;border-radius:6px;background:none;display:flex;align-items:center;justify-content:center;color:' + (enabled ? '#202020' : '#c9c6c2') + ';cursor:' + (enabled ? 'pointer' : 'default');
    const popRows = ordered.map((c, i) => {
      const checked = isSel(c);
      return {
        id: c.id,
        name: c.name,
        initial: initials(c.name),
        checked: checked,
        custom: s.sort === 'custom',
        count: openTasks.filter((t) => t.cust === c.id && inPeriod(t, s.period)).length,
        boxStyle: 'width:16px;height:16px;flex-shrink:0;box-sizing:border-box;border-radius:5px;display:flex;align-items:center;justify-content:center;' + (checked ? 'background:#d1453b;border:1.5px solid #d1453b' : 'background:#ffffff;border:1.5px solid #8a8784'),
        markStyle: 'width:22px;height:22px;flex-shrink:0;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;background:' + c.soft + ';color:' + c.ink,
        toggle: () => set({ excluded: checked ? s.excluded.concat([c.id]) : s.excluded.filter((x) => x !== c.id) }),
        up: () => move(c.id, -1),
        down: () => move(c.id, 1),
        upStyle: arrowStyle(i > 0),
        downStyle: arrowStyle(i < ordered.length - 1)
      };
    });
    const nSel = s.customers.length - s.excluded.length;
    const allSel = s.excluded.length === 0;
    const selLabel = allSel ? 'All customers' : nSel === 0 ? 'No customers' : nSel === 1 ? s.customers.find(isSel).name : nSel + ' customers';
    const seg = (on) => 'height:26px;padding:0 12px;border:0;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;' + (on ? 'background:#ffffff;color:#202020;box-shadow:0 1px 2px rgba(0,0,0,0.12)' : 'background:transparent;color:#5f5b57');

    /* ---------- filters popover ---------- */
    const toggleIn = (key, v) => () => {
      const cur = s[key];
      set({ [key]: cur.indexOf(v) >= 0 ? cur.filter((x) => x !== v) : cur.concat([v]) });
    };
    const chipsFor = (key, items) => items.map((it) => ({ label: it.label, active: s[key].indexOf(it.id) >= 0, style: chipStyle(s[key].indexOf(it.id) >= 0), toggle: toggleIn(key, it.id) }));
    const csmItems = [{ id: 'none', label: 'Unassigned' }].concat(s.csms.map((x) => ({ id: x.id, label: nameOf(x) })));
    const stageItems = s.stages.map((x) => ({ id: x.id, label: nameOf(x) }));
    const filterGroups = [
      { title: 'CSM', chips: chipsFor('fCsm', csmItems) },
      { title: 'Stage', chips: chipsFor('fStatus', stageItems) },
      { title: 'Account tier', chips: chipsFor('fTier', TIERS.map((v) => ({ id: v, label: v + ' account' }))) }
    ];

    const totalTasks = shown.reduce((a, c) => a + c.taskCount, 0);
    const totalEng = shown.reduce((a, c) => a + c.engagements.length, 0);
    const doneCount = Object.keys(s.done).length;

    /* ---------- editing helpers for the Manage page ---------- */
    const dval = (key, cur) => (s.drafts[key] !== undefined ? s.drafts[key] : cur);
    const dset = (key, validate, apply) => (ev) => {
      const raw = ev && ev.target ? ev.target.value : '';
      const ok = validate(raw);
      const patch = { drafts: Object.assign({}, s.drafts, { [key]: raw }) };
      if (ok !== undefined) Object.assign(patch, apply(ok));
      set(patch);
    };
    const vText = (raw) => (raw.trim() ? raw.trim() : undefined);
    const vNum = (raw) => { const n = parseFloat(raw); return isNaN(n) ? undefined : n; };
    const vAny = (raw) => raw;
    const delProps = (key, run) => {
      const conf = s.confirmDel === key;
      return {
        confirming: conf,
        delText: conf ? 'Confirm' : 'Remove',
        delStyle: 'height:28px;padding:0 10px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;' + (conf ? 'border:1px solid #d1453b;background:#d1453b;color:#ffffff' : 'border:1px solid #e6e4e1;background:#ffffff;color:#a33c32'),
        del: () => { if (s.confirmDel !== key) { set({ confirmDel: key }); return; } run(); },
        cancelDel: () => set({ confirmDel: null })
      };
    };

    /* ---------- manage view ---------- */
    const setField = (id, key) => (ev) => {
      const v = ev && ev.target ? ev.target.value : '';
      set({ customers: s.customers.map((c) => (c.id === id ? Object.assign({}, c, { [key]: v }) : c)) });
    };
    const manageRows = byName.map((c) => ({
      id: c.id,
      name: c.name,
      initial: initials(c.name),
      label: c.label,
      csm: c.csm,
      status: c.status,
      tier: c.tier,
      open: openTasks.filter((t) => t.cust === c.id).length,
      markStyle: 'width:28px;height:28px;flex-shrink:0;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;background:' + c.soft + ';color:' + c.ink,
      csmOptions: csmItems.map((x) => ({ value: x.id, label: x.label })),
      statusOptions: stageItems.map((x) => ({ value: x.id, label: x.label })),
      tierOptions: optList(TIERS),
      setCsm: setField(c.id, 'csm'),
      setStatus: setField(c.id, 'status'),
      nameValue: dval('cn:' + c.id, c.name),
      setName: dset('cn:' + c.id, vText, (v) => ({ customers: s.customers.map((x) => (x.id === c.id ? Object.assign({}, x, { name: v }) : x)) })),
      setTier: setField(c.id, 'tier')
    }));
    manageRows.forEach((r) => {
      const c = s.customers.find((x) => x.id === r.id);
      Object.assign(r, delProps('c:' + c.id, () => {
        set({ customers: s.customers.filter((x) => x.id !== c.id), order: s.order.filter((x) => x !== c.id), excluded: s.excluded.filter((x) => x !== c.id), confirmDel: null });
        toast('Removed ' + c.name + ' from your customers. The Todoist label @' + c.label + ' and its tasks stay in Todoist.');
      }));
    });
    const newName = s.newCust.trim();
    const canAdd = newName.length > 0;
    const addCustomer = (ev) => {
      if (ev && ev.preventDefault) ev.preventDefault();
      if (!canAdd) return;
      const pal = PALETTE[s.customers.length % PALETTE.length];
      this._n += 1;
      const c = { id: 'c' + this._n, name: newName, label: slug(newName) || 'customer-' + this._n, csm: 'none', status: s.stages[0].id, tier: 'P3', ink: pal[0], soft: pal[1] };
      set({ customers: s.customers.concat([c]), newCust: '' });
      toast('Added ' + newName + '. The Todoist label @' + c.label + ' is created and used for its tasks and engagements.');
    };
    const cnt = (key, id) => s.customers.filter((c) => c[key] === id).length;
    const dupe = (list, nm, extra) => list.some((x) => x.name.trim().toLowerCase() === nm.toLowerCase()) || (extra && extra.toLowerCase() === nm.toLowerCase());
    const rename = (key, id) => (ev) => set({ [key]: s[key].map((x) => (x.id === id ? Object.assign({}, x, { name: ev && ev.target ? ev.target.value : '' }) : x)) });
    const csmRows = s.csms.map((x) => ({
      id: x.id,
      name: x.name,
      countText: plural(cnt('csm', x.id), 'customer'),
      setName: rename('csms', x.id),
      remove: () => {
        const n = cnt('csm', x.id);
        set({ csms: s.csms.filter((y) => y.id !== x.id), customers: s.customers.map((c) => (c.csm === x.id ? Object.assign({}, c, { csm: 'none' }) : c)), fCsm: s.fCsm.filter((y) => y !== x.id) });
        toast('Removed ' + nameOf(x) + '.' + (n ? ' ' + plural(n, 'customer') + ' moved to Unassigned.' : ''));
      }
    }));
    const addCsm = (ev) => {
      if (ev && ev.preventDefault) ev.preventDefault();
      const nm = s.newCsm.trim();
      if (!nm) return;
      if (dupe(s.csms, nm, 'Unassigned')) { toast('There is already a CSM called ' + nm + '.'); return; }
      this._n += 1;
      set({ csms: s.csms.concat([{ id: 'm' + this._n, name: nm }]), newCsm: '' });
      toast('Added CSM ' + nm + '. Assign customers to them in the table.');
    };
    const moveStage = (id, dir) => () => {
      const o = s.stages.slice();
      const i = o.findIndex((x) => x.id === id);
      const j = i + dir;
      if (j < 0 || j >= o.length) return;
      const it = o.splice(i, 1)[0];
      o.splice(j, 0, it);
      set({ stages: o });
    };
    const stageRows = s.stages.map((x, i) => {
      const tn = TONES[x.tone];
      const canRemove = s.stages.length > 1;
      return {
        id: x.id,
        name: x.name,
        countText: plural(cnt('status', x.id), 'customer'),
        setName: rename('stages', x.id),
        dotLabel: 'Colour: ' + tn.label + '. Click to change.',
        dotStyle: 'width:22px;height:22px;flex-shrink:0;box-sizing:border-box;border-radius:999px;cursor:pointer;padding:0;border:2px solid ' + tn.bg + ';background:' + tn.dot,
        cycle: () => set({ stages: s.stages.map((y) => (y.id === x.id ? Object.assign({}, y, { tone: TONE_ORDER[(TONE_ORDER.indexOf(y.tone) + 1) % TONE_ORDER.length] }) : y)) }),
        up: moveStage(x.id, -1),
        down: moveStage(x.id, 1),
        upStyle: arrowStyle(i > 0),
        downStyle: arrowStyle(i < s.stages.length - 1),
        removeStyle: 'width:26px;height:26px;flex-shrink:0;border:0;border-radius:6px;background:none;display:flex;align-items:center;justify-content:center;color:' + (canRemove ? '#666666' : '#c9c6c2') + ';cursor:' + (canRemove ? 'pointer' : 'default'),
        remove: () => {
          if (!canRemove) return;
          const rest = s.stages.filter((y) => y.id !== x.id);
          const n = cnt('status', x.id);
          set({ stages: rest, customers: s.customers.map((c) => (c.status === x.id ? Object.assign({}, c, { status: rest[0].id }) : c)), fStatus: s.fStatus.filter((y) => y !== x.id) });
          toast('Removed the stage ' + nameOf(x) + '.' + (n ? ' ' + plural(n, 'customer') + ' moved to ' + nameOf(rest[0]) + '.' : ''));
        }
      };
    });
    const addStage = (ev) => {
      if (ev && ev.preventDefault) ev.preventDefault();
      const nm = s.newStage.trim();
      if (!nm) return;
      if (dupe(s.stages, nm, null)) { toast('There is already a stage called ' + nm + '.'); return; }
      this._n += 1;
      set({ stages: s.stages.concat([{ id: 's' + this._n, name: nm, tone: 'gray' }]), newStage: '' });
      toast('Added the stage ' + nm + '. Click its dot to pick a colour.');
    };
    const headStyle = (open) => 'display:flex;align-items:center;gap:10px;width:100%;box-sizing:border-box;border:0;background:none;padding:0;cursor:pointer;text-align:left;color:#202020;margin-bottom:' + (open ? '6' : '0') + 'px';
    const chevStyle = (open) => 'flex-shrink:0;stroke:#666666;fill:none;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round;transition:transform 0.15s;transform:rotate(' + (open ? 0 : 180) + 'deg)';
    const addBtn = (on) => 'height:30px;padding:0 14px;border:0;border-radius:8px;font-size:13px;font-weight:600;color:' + (on ? '#b03830' : '#8a8784') + ';background:' + (on ? '#fff1f1' : '#f0efee') + ';cursor:' + (on ? 'pointer' : 'default');
    const nP1 = s.customers.filter((c) => c.tier === 'P1').length;

    /* ---------- initiatives, focus areas, goals ---------- */
    const initsAll = s.initsL.map((i) => Object.assign({}, i, { status: s.initStatus[i.id] || i.status }));
    const initById = {};
    initsAll.forEach((i) => { initById[i.id] = i; });
    const initTasksAll = INIT_TASKS0.concat(s.addedInitTasks).filter((t) => initById[t.init]);
    const focusById = {};
    FOCUS.forEach((f) => { focusById[f.id] = f; });
    const goalById = {};
    s.goalsL.forEach((g) => { goalById[g.id] = g; });
    const openInitTasks = initTasksAll.filter((t) => !s.initDone[t.id]);
    const doneOf = (id) => initTasksAll.filter((t) => t.init === id && s.initDone[t.id]).length;
    const byDueOnly = (a, b) => (a.due === null ? 99 : a.due) - (b.due === null ? 99 : b.due);
    const toneOf = (status) => TONES[INIT_TONE[status]];
    const warnStyle = (bg, fg) => 'display:inline-flex;align-items:center;height:20px;padding:0 8px;border-radius:999px;font-size:11px;font-weight:600;background:' + bg + ';color:' + fg;
    const hasNext = (i) => openInitTasks.some((t) => t.init === i.id);
    const isLive = (i) => i.status === 'Active' || i.status === 'Planned';

    const initVm = (i) => {
      const f = focusById[i.focus];
      const own = openInitTasks.filter((t) => t.init === i.id).sort(byDueOnly);
      const all = initTasksAll.filter((t) => t.init === i.id);
      const done = i.doneBase + doneOf(i.id);
      const total = i.doneBase + all.length;
      const last = doneOf(i.id) > 0 ? 0 : i.last;
      const tn = toneOf(i.status);
      const warns = [];
      if (i.status === 'Blocked') warns.push({ text: i.blocked || 'Blocked', style: warnStyle('#fdefed', '#a33c32') });
      if (isLive(i) && own.length === 0) warns.push({ text: 'No next action', style: warnStyle('#fdefed', '#a33c32') });
      else if (i.status === 'Active' && last > 14) warns.push({ text: 'Quiet for ' + last + ' days', style: warnStyle('#fdf5e9', '#8f5a0a') });
      const open = s.initOpen[i.id] !== undefined ? s.initOpen[i.id] : i.status === 'Active';
      const draft = s.taskDrafts[i.id] || '';
      const goal = i.goal ? goalById[i.goal] : null;
      const dl = i.off === null ? null : fmtDate(i.off);
      const canAdd = draft.trim().length > 0;
      return {
        id: i.id,
        title: i.title,
        iconStyle: 'width:30px;height:30px;flex-shrink:0;border-radius:999px;display:flex;align-items:center;justify-content:center;background:' + f.soft + ';color:' + f.ink,
        focusName: f.short,
        focusStyle: 'display:inline-flex;align-items:center;height:20px;padding:0 8px;border-radius:999px;font-size:11px;font-weight:600;background:' + f.soft + ';color:' + f.ink,
        hasTarget: !!dl,
        target: dl ? 'Target ' + dl.short : '',
        warns: warns,
        barStyle: 'display:block;height:4px;border-radius:2px;background:#2f7d32;width:' + (total === 0 ? 0 : Math.round((done / total) * 100)) + '%',
        progress: total === 0 ? 'No tasks yet' : done + ' of ' + total + ' done',
        lastText: i.status === 'Done' ? 'Completed' : last === 0 ? 'Last action today' : 'Last action ' + last + ' days ago',
        status: i.status,
        statusStyle: 'height:28px;border:0;border-radius:999px;padding:0 8px;font-size:12px;font-weight:600;cursor:pointer;flex-shrink:0;background:' + tn.bg + ';color:' + tn.fg,
        statusOptions: INIT_STATUSES.map((v) => ({ value: v, label: v })),
        setStatus: (ev) => set({ initStatus: Object.assign({}, s.initStatus, { [i.id]: ev && ev.target ? ev.target.value : i.status }) }),
        open: open,
        toggle: () => set({ initOpen: Object.assign({}, s.initOpen, { [i.id]: !open }) }),
        tasks: own.map((t) => {
          const di = t.due === null ? null : dueInfo({ due: t.due, week: false });
          return {
            id: t.id,
            title: t.title,
            checkStyle: 'width:16px;height:16px;margin-top:2px;flex-shrink:0;box-sizing:border-box;border-radius:6px;padding:0;cursor:pointer;' + CHECK[t.prio],
            complete: () => set({ initDone: Object.assign({}, s.initDone, { [t.id]: true }) }),
            hasDue: !!di,
            due: di ? di.text : '',
            dueStyle: 'display:inline-flex;align-items:center;gap:4px;color:' + (di ? di.color : '#666666')
          };
        }),
        noTasks: own.length === 0,
        draft: draft,
        setDraft: (ev) => set({ taskDrafts: Object.assign({}, s.taskDrafts, { [i.id]: ev && ev.target ? ev.target.value : '' }) }),
        addStyle: 'height:30px;padding:0 14px;border:0;border-radius:8px;font-size:13px;font-weight:600;color:' + (canAdd ? '#b03830' : '#8a8784') + ';background:' + (canAdd ? '#fff1f1' : '#f0efee') + ';cursor:' + (canAdd ? 'pointer' : 'default'),
        submitTask: (ev) => {
          if (ev && ev.preventDefault) ev.preventDefault();
          if (!canAdd) return;
          this._n += 1;
          set({ addedInitTasks: s.addedInitTasks.concat([{ id: 'nt' + this._n, init: i.id, title: draft.trim(), due: null, prio: 3 }]), taskDrafts: Object.assign({}, s.taskDrafts, { [i.id]: '' }) });
          toast('Added "' + draft.trim() + '" as a sub-task of "' + i.title + '" with labels @' + f.label + '.');
        },
        labelChips: [{ text: '@' + f.label }],
        hasGoal: !!goal,
        goalTitle: goal ? goal.title : '',
        goGoal: () => set({ page: 'goals', goalFocus: i.focus, pop: null })
      };
    };

    const visibleInits = initsAll.filter((i) => (s.initFocus === null || i.focus === s.initFocus) && (s.showDoneInits || i.status !== 'Done'));
    const cmpInit = (a, b) => INIT_ORDER.indexOf(a.status) - INIT_ORDER.indexOf(b.status) || (a.off === null ? 999 : a.off) - (b.off === null ? 999 : b.off);
    const initGroups = (s.groupBy === 'focus'
      ? FOCUS.map((f) => ({
          title: f.name,
          dotStyle: 'width:10px;height:10px;border-radius:3px;display:inline-block;background:' + f.ink,
          note: '',
          items: visibleInits.filter((i) => i.focus === f.id).sort(cmpInit)
        }))
      : INIT_ORDER.map((st) => ({
          title: st,
          dotStyle: 'width:10px;height:10px;border-radius:999px;display:inline-block;background:' + toneOf(st).dot,
          note: st === 'Blocked' ? 'Needs a decision or a nudge' : st === 'Idea' ? 'Parked until it earns a plan' : '',
          items: visibleInits.filter((i) => i.status === st).sort(cmpInit)
        }))
    ).filter((g) => g.items.length > 0).map((g) => ({ title: g.title, dotStyle: g.dotStyle, note: g.note, count: g.items.length, items: g.items.map(initVm) }));

    const liveInits = initsAll.filter((i) => i.status !== 'Done');
    const nActive = initsAll.filter((i) => i.status === 'Active').length;
    const nBlocked = initsAll.filter((i) => i.status === 'Blocked').length;
    const nNoNext = initsAll.filter((i) => isLive(i) && !hasNext(i)).length;
    const initFocusChips = [{ id: null, label: 'All focus areas · ' + liveInits.length }].concat(FOCUS.map((f) => ({ id: f.id, label: f.short + ' · ' + liveInits.filter((i) => i.focus === f.id).length }))).map((k) => ({
      label: k.label, active: s.initFocus === k.id, style: chipStyle(s.initFocus === k.id), pick: () => set({ initFocus: k.id })
    }));

    const nd = s.newInit || { text: '', focus: 'fw', status: 'Planned', off: '2w' };
    const upN = (patch) => set({ newInit: Object.assign({}, nd, patch) });
    const niCan = nd.text.trim().length > 0;
    const ni = {
      text: nd.text,
      setText: (ev) => upN({ text: ev && ev.target ? ev.target.value : '' }),
      focusChips: FOCUS.map((f) => ({ label: f.short, active: nd.focus === f.id, style: chipStyle(nd.focus === f.id), pick: () => upN({ focus: f.id }) })),
      statusChips: ['Idea', 'Planned', 'Active'].map((v) => ({ label: v, active: nd.status === v, style: chipStyle(nd.status === v), pick: () => upN({ status: v }) })),
      targetChips: [['2w', 'In 2 weeks'], ['1m', 'In a month'], ['q', 'End of year'], ['none', 'No date']].map((d) => ({ label: d[1], active: nd.off === d[0], style: chipStyle(nd.off === d[0]), pick: () => upN({ off: d[0] }) })),
      labelChips: [{ text: '@initiative' }, { text: '@' + focusById[nd.focus].label }, { text: '@status-' + nd.status.toLowerCase() }],
      submitStyle: 'height:32px;padding:0 16px;border:0;border-radius:10px;font-size:13px;font-weight:700;color:#ffffff;background:' + (niCan ? '#d1453b' : '#e3b1ad') + ';cursor:' + (niCan ? 'pointer' : 'default'),
      submit: (ev) => {
        if (ev && ev.preventDefault) ev.preventDefault();
        if (!niCan) return;
        this._n += 1;
        const it = { id: 'ni' + this._n, focus: nd.focus, title: nd.text.trim(), status: nd.status, off: NI_TARGETS[nd.off], goal: null, doneBase: 0, last: 0 };
        set({ initsL: s.initsL.concat([it]), newInit: null, initOpen: Object.assign({}, s.initOpen, { [it.id]: true }) });
        toast('Added "' + it.title + '" with labels @initiative @' + focusById[nd.focus].label + ' @status-' + nd.status.toLowerCase() + '. Add its first task now.');
      }
    };

    /* focus-area momentum cards */
    const sum = (a) => a.reduce((x, y) => x + y, 0);
    const focusCards = FOCUS.map((f) => {
      const extra = initTasksAll.filter((t) => initById[t.init].focus === f.id && s.initDone[t.id]).length;
      const weekly = f.weekly.slice();
      weekly[weekly.length - 1] += extra;
      const recent = sum(weekly.slice(4));
      const prev = sum(weekly.slice(0, 4));
      const days = extra > 0 ? 0 : f.last;
      let mood;
      if (days > 14 || recent === 0) mood = 'Stalling';
      else if (recent >= prev * 1.2) mood = 'Rising';
      else if (recent <= prev * 0.7) mood = 'Slowing';
      else mood = 'Steady';
      const mt = { Rising: TONES.green, Steady: TONES.blue, Slowing: TONES.amber, Stalling: TONES.red }[mood];
      const max = Math.max.apply(null, weekly.concat([4]));
      const stuck = initsAll.filter((i) => i.focus === f.id && isLive(i) && !hasNext(i)).length;
      const cand = openInitTasks.filter((t) => initById[t.init].focus === f.id && initById[t.init].status === 'Active').sort(byDueOnly);
      const cur = weekly[weekly.length - 1];
      const selected = s.goalFocus === f.id;
      return {
        id: f.id,
        name: f.name,
        why: f.why,
        initial: f.abbr,
        selected: selected,
        pick: () => set({ goalFocus: selected ? null : f.id }),
        cardStyle: 'display:flex;flex-direction:column;gap:10px;box-sizing:border-box;padding:14px;text-align:left;cursor:pointer;color:#202020;border-radius:14px;background:#ffffff;border:' + (selected ? '2px solid #d1453b' : '1px solid #e9e6e3') + ';padding:' + (selected ? '13px' : '14px'),
        markStyle: 'width:28px;height:28px;flex-shrink:0;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;background:' + f.soft + ';color:' + f.ink,
        momentum: mood,
        momentumStyle: 'display:inline-flex;align-items:center;gap:5px;height:20px;padding:0 8px;border-radius:999px;font-size:11px;font-weight:700;background:' + mt.bg + ';color:' + mt.fg,
        momentumDot: 'width:6px;height:6px;border-radius:999px;display:inline-block;background:' + mt.dot,
        weekText: cur + (cur === 1 ? ' action' : ' actions') + ' this week (floor ' + FLOOR + ')',
        bars: weekly.map((n, idx) => ({ style: 'display:block;width:14px;flex-shrink:0;border-radius:3px 3px 0 0;height:' + Math.max(3, Math.round((n / max) * 38)) + 'px;background:' + (idx === weekly.length - 1 ? '#d1453b' : '#b3afab') })),
        barsLabel: 'Completed actions per week, oldest to newest: ' + weekly.join(', '),
        lastText: days === 0 ? 'Last action today' : 'Last action ' + days + (days === 1 ? ' day ago' : ' days ago'),
        nextText: stuck > 0 ? plural(stuck, 'initiative') + ' without a next action' : cand.length ? 'Next: ' + cand[0].title : 'No active initiative',
        nextStyle: 'font-size:12px;line-height:1.4;font-weight:' + (stuck > 0 ? '600' : '400') + ';color:' + (stuck > 0 ? '#a33c32' : '#666666')
      };
    });

    /* goals and KPIs */
    const kval = (k) => { const raw = s.kpiVals[k.id]; const n = parseFloat(raw); return raw === undefined || isNaN(n) ? k.cur : n; };
    const paceOf = (p) => (p >= 1 ? { label: 'Reached', t: TONES.green } : p >= ELAPSED - 0.05 ? { label: 'On track', t: TONES.green } : p >= ELAPSED * 0.7 ? { label: 'At risk', t: TONES.amber } : { label: 'Behind', t: TONES.red });
    const r1 = (n) => Math.round(n * 10) / 10;
    const goalsShown = s.goalsL.filter((g) => s.goalFocus === null || g.focus === s.goalFocus);
    const paceCount = { 'On track': 0, 'At risk': 0, Behind: 0 };
    const goals = goalsShown.map((g) => {
      const f = focusById[g.focus];
      const linked = initsAll.filter((i) => i.goal === g.id && i.status !== 'Done');
      return {
        id: g.id,
        title: g.title,
        focusName: f.short,
        focusStyle: 'display:inline-flex;align-items:center;height:20px;padding:0 8px;border-radius:999px;font-size:11px;font-weight:600;background:' + f.soft + ';color:' + f.ink,
        kpis: s.kpisL.filter((k) => k.goal === g.id).map((k) => {
          const v = kval(k);
          const span = k.tgt - k.start;
          const p = span === 0 ? (v >= k.tgt ? 1 : 0) : Math.max(0, (v - k.start) / span);
          const pc = paceOf(p);
          paceCount[pc.label === 'Reached' ? 'On track' : pc.label] += 1;
          const delta = r1(v - k.prev);
          return {
            id: k.id,
            name: k.name,
            inputLabel: k.name + ', current value',
            value: s.kpiVals[k.id] !== undefined ? s.kpiVals[k.id] : String(k.cur),
            setValue: (ev) => set({ kpiVals: Object.assign({}, s.kpiVals, { [k.id]: ev && ev.target ? ev.target.value : '' }) }),
            targetText: 'target ' + k.tgt + k.unit,
            barStyle: 'display:block;height:6px;border-radius:3px;background:' + pc.t.dot + ';width:' + Math.min(100, Math.round(p * 100)) + '%',
            markStyle: 'position:absolute;left:' + Math.round(ELAPSED * 100) + '%;top:-3px;width:2px;height:12px;border-radius:1px;background:#202020;opacity:0.55',
            pace: pc.label,
            paceStyle: 'display:inline-flex;align-items:center;justify-content:center;gap:5px;width:84px;flex-shrink:0;height:22px;border-radius:999px;font-size:11px;font-weight:700;background:' + pc.t.bg + ';color:' + pc.t.fg,
            paceDot: 'width:6px;height:6px;border-radius:999px;display:inline-block;background:' + pc.t.dot,
            deltaText: delta === 0 ? 'No change' : (delta > 0 ? '+' : '') + delta + k.unit + ' vs last month'
          };
        }),
        noInits: linked.length === 0,
        inits: linked.sort(cmpInit).map((i) => ({
          title: i.title,
          dot: 'width:8px;height:8px;border-radius:999px;display:inline-block;background:' + toneOf(i.status).dot,
          go: () => set({ page: 'init', initFocus: i.focus, pop: null })
        }))
      };
    });
    const navStyle = (on) => 'display:flex;align-items:center;gap:10px;padding:8px 12px;border:0;border-radius:8px;font-size:14px;cursor:pointer;text-align:left;' + (on ? 'background:#feefe5;font-weight:600;color:#b03830' : 'background:none;color:#202020');
    const navIcon = (on) => 'fill:none;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round;stroke:' + (on ? '#b03830' : '#666666');

    /* ---------- objectives: day / week / month / quarter ---------- */
    const objsAll = OBJS0.concat(s.addedObjs).map((o) => Object.assign({}, o, {
      off: s.objMove[o.id] !== undefined ? s.objMove[o.id] : o.off,
      done: s.objDone[o.id] !== undefined ? s.objDone[o.id] : o.done,
      parent: s.objParent[o.id] !== undefined ? s.objParent[o.id] : o.parent
    }));
    const objById = {};
    objsAll.forEach((o) => { objById[o.id] = o; });
    const areaOf = (id) => OBJ_AREAS.find((a) => a.id === id) || OBJ_AREAS[0];
    const areaIdx = (id) => OBJ_AREAS.findIndex((a) => a.id === id);
    const cadIdx = CADS.findIndex((c) => c.id === s.objCad);
    const cad = CADS[cadIdx];
    const ooff = s.objOffs[cad.id];
    const per = periodOf(cad.id, ooff);
    const inCad = (c, n) => objsAll.filter((o) => o.cad === c && o.off === n);
    const covers = (par, date) => { const pp = periodOf(par.cad, par.off); return date.getTime() >= pp.start.getTime() && date.getTime() <= pp.end.getTime(); };
    const navObj = (c, n) => set({ objCad: c, objOffs: Object.assign({}, s.objOffs, { [c]: n }), objDraft: s.objDraft ? Object.assign({}, s.objDraft, { parent: 'none', goal: 'none' }) : null, pop: null });

    const moveOne = (o, patchMove, patchParent) => {
      const n = o.off + 1;
      patchMove[o.id] = n;
      const par = o.parent ? objById[o.parent] : null;
      if (par && !covers(par, periodOf(o.cad, n).start)) patchParent[o.id] = null;
    };
    const objVm = (o) => {
      const a = areaOf(o.area);
      const kids = objsAll.filter((k) => k.parent === o.id);
      const kidsDone = kids.filter((k) => k.done).length;
      const par = o.parent ? objById[o.parent] : null;
      const goal = o.goal ? goalById[o.goal] : null;
      const childCad = cadIdx > 0 ? CADS[cadIdx - 1] : null;
      const nextTitle = lc(periodOf(o.cad, o.off + 1).title);
      const kidsOpen = kids.filter((k) => !k.done);
      const firstKidOff = kids.length ? (kidsOpen.length ? Math.min.apply(null, kidsOpen.map((k) => k.off)) : Math.max.apply(null, kids.map((k) => k.off))) : 0;
      return {
        id: o.id,
        title: o.title,
        done: o.done,
        cardStyle: 'border:1px solid #e9e6e3;border-radius:12px;background:' + (o.done ? '#faf9f8' : '#ffffff') + ';padding:12px 14px;margin-bottom:10px;display:flex;flex-direction:column;gap:8px',
        checkStyle: 'width:22px;height:22px;flex-shrink:0;box-sizing:border-box;border-radius:7px;padding:0;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#ffffff;margin-top:1px;' + (o.done ? 'border:1.5px solid #2f7d32;background:#2f7d32' : 'border:1.5px solid #8a8784;background:#ffffff'),
        toggleLabel: (o.done ? 'Mark as not done: ' : 'Mark as done: ') + o.title,
        toggle: () => set({ objDone: Object.assign({}, s.objDone, { [o.id]: !o.done }) }),
        titleStyle: 'font-size:15px;line-height:1.4;font-weight:600;color:' + (o.done ? '#8a8784' : '#202020') + ';text-decoration:' + (o.done ? 'line-through' : 'none'),
        areaName: a.short,
        areaStyle: 'display:inline-flex;align-items:center;height:20px;padding:0 8px;border-radius:999px;font-size:11px;font-weight:600;background:' + a.soft + ';color:' + a.ink,
        hasParent: !!par,
        parentText: par ? CADS[cadIdx + 1].name + ': ' + par.title : '',
        goParent: () => { if (par) navObj(par.cad, par.off); },
        hasGoal: !!goal,
        goalTitle: goal ? goal.title : '',
        goGoal: () => set({ page: 'goals', goalFocus: goal ? goal.focus : null, pop: null }),
        hasKids: kids.length > 0,
        kidsText: kidsDone + ' of ' + kids.length + ' ' + (childCad ? childCad.adj : '') + ' ' + (kids.length === 1 ? 'objective' : 'objectives') + ' done',
        kidsBar: 'display:block;height:4px;border-radius:2px;background:#2f7d32;width:' + (kids.length ? Math.round((kidsDone / kids.length) * 100) : 0) + '%',
        goKids: () => { if (childCad && kids.length) navObj(childCad.id, firstKidOff); },
        canMove: !o.done,
        moveText: 'Move to ' + nextTitle,
        move: () => {
          const pm = Object.assign({}, s.objMove);
          const pp = Object.assign({}, s.objParent);
          moveOne(o, pm, pp);
          set({ objMove: pm, objParent: pp });
          toast('Moved "' + o.title + '" to ' + nextTitle + '. In Todoist its due date becomes ' + fmtD(periodOf(o.cad, o.off + 1).end) + '.');
        }
      };
    };

    const objList = inCad(cad.id, ooff).sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1) || areaIdx(a.area) - areaIdx(b.area));
    const objItems = objList.map(objVm);
    const objOpen = objList.filter((o) => !o.done);
    const objDoneN = objList.length - objOpen.length;
    const objSlotN = Math.max(cad.cap, objList.length);
    const objSlots = [];
    for (let i = 0; i < objSlotN; i++) {
      const it = objList[i];
      const over = i >= cad.cap;
      objSlots.push({ style: 'width:22px;height:8px;border-radius:4px;box-sizing:border-box;display:block;' + (it ? 'background:' + (over ? '#c26e00' : it.done ? '#2f7d32' : '#d1453b') : 'background:transparent;border:1.5px solid #cfcbc7') });
    }
    const objOver = objList.length > cad.cap;
    const objCapNote = objOver ? 'Over the cap of ' + cad.cap + '. Move one to keep the focus.' : objList.length < cad.cap ? plural(cad.cap - objList.length, 'free slot') + '. Add only what you would be disappointed to miss.' : 'Full. Anything new has to replace something.';
    const nextPer = periodOf(cad.id, ooff + 1);
    const objTabs = CADS.map((c) => {
      const n = s.objOffs[c.id];
      const list = inCad(c.id, n);
      const dn = list.filter((o) => o.done).length;
      const on = c.id === s.objCad;
      return {
        name: c.name,
        count: list.length === 0 ? 'none' : dn + ' of ' + list.length,
        active: on,
        style: 'display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:8px 14px;border:0;border-radius:8px;cursor:pointer;min-width:112px;text-align:left;' + (on ? 'background:#ffffff;color:#202020;box-shadow:0 1px 2px rgba(0,0,0,0.12)' : 'background:transparent;color:#5f5b57'),
        countStyle: 'font-size:12px;font-weight:400;color:' + (on ? '#b03830' : '#8a8784'),
        go: () => navObj(c.id, s.objOffs[c.id])
      };
    });

    /* new objective form */
    const dr = s.objDraft || { text: '', area: 'fw', parent: 'none', goal: 'none' };
    const upD = (patch) => set({ objDraft: Object.assign({}, dr, patch) });
    const nfCan = dr.text.trim().length > 0;
    const parCad = cadIdx < CADS.length - 1 ? CADS[cadIdx + 1] : null;
    const parOpts = parCad ? objsAll.filter((o) => o.cad === parCad.id && covers(o, per.start)) : [];
    const nfArea = areaOf(dr.area);
    const nf = {
      text: dr.text,
      placeholder: 'What is the outcome for ' + lc(per.title) + '?',
      setText: (ev) => upD({ text: ev && ev.target ? ev.target.value : '' }),
      areaChips: OBJ_AREAS.map((a) => ({ label: a.short, active: dr.area === a.id, style: chipStyle(dr.area === a.id), pick: () => upD({ area: a.id }) })),
      hasParentOpts: !!parCad,
      parentLabel: parCad ? 'Supports (' + parCad.name.toLowerCase() + ')' : '',
      parentOptions: [{ value: 'none', label: 'Nothing above it (stands alone)' }].concat(parOpts.map((o) => ({ value: o.id, label: o.title }))),
      parent: dr.parent,
      setParent: (ev) => upD({ parent: ev && ev.target ? ev.target.value : 'none' }),
      hasGoalOpts: cad.id === 'q',
      goalOptions: [{ value: 'none', label: 'No goal linked' }].concat(s.goalsL.map((g) => ({ value: g.id, label: g.title }))),
      goal: dr.goal,
      setGoal: (ev) => upD({ goal: ev && ev.target ? ev.target.value : 'none' }),
      labelChips: [{ text: '@objective' }, { text: '@period-' + cad.tag }, { text: '@' + nfArea.label }],
      dueText: 'Due ' + fmtD(per.end),
      submitStyle: 'height:32px;padding:0 16px;border:0;border-radius:10px;font-size:13px;font-weight:700;color:#ffffff;background:' + (nfCan ? '#d1453b' : '#e3b1ad') + ';cursor:' + (nfCan ? 'pointer' : 'default'),
      submit: (ev) => {
        if (ev && ev.preventDefault) ev.preventDefault();
        if (!nfCan) return;
        this._n += 1;
        const it = { id: 'no' + this._n, cad: cad.id, off: ooff, area: dr.area, title: dr.text.trim(), parent: dr.parent === 'none' || !parCad ? null : dr.parent, goal: dr.goal === 'none' || cad.id !== 'q' ? null : dr.goal, done: false };
        set({ addedObjs: s.addedObjs.concat([it]), objDraft: null });
        toast('Added "' + it.title + '" as a ' + cad.adj + ' objective with labels @objective @period-' + cad.tag + ' @' + nfArea.label + '. Due ' + fmtD(per.end) + '.');
      }
    };
    const nkey = cad.id + ':' + ooff;
    const objTodayOpen = inCad('d', 0).filter((o) => !o.done).length;

    /* ---------- one Manage page: customers, goals & KPIs, initiatives ---------- */
    const focusOpts = FOCUS.map((f) => ({ value: f.id, label: f.short }));
    const goalOptsAll = [{ value: 'none', label: 'No goal' }].concat(s.goalsL.map((g) => ({ value: g.id, label: g.title })));
    const inputBase = 'height:32px;box-sizing:border-box;border:1px solid #e6e4e1;border-radius:8px;padding:0 10px;font-size:13px;color:#202020;background:#ffffff;outline:none;';
    const mapG = (id, patch) => s.goalsL.map((x) => (x.id === id ? Object.assign({}, x, patch) : x));
    const mapK = (id, patch) => s.kpisL.map((x) => (x.id === id ? Object.assign({}, x, patch) : x));
    const mapI = (id, patch) => s.initsL.map((x) => (x.id === id ? Object.assign({}, x, patch) : x));

    const kpiRow = (k) => ({
      id: k.id,
      nameValue: dval('kn:' + k.id, k.name),
      setName: dset('kn:' + k.id, vText, (v) => ({ kpisL: mapK(k.id, { name: v }) })),
      curValue: s.kpiVals[k.id] !== undefined ? s.kpiVals[k.id] : String(k.cur),
      setCur: (ev) => set({ kpiVals: Object.assign({}, s.kpiVals, { [k.id]: ev && ev.target ? ev.target.value : '' }) }),
      startValue: dval('ks:' + k.id, String(k.start)),
      setStart: dset('ks:' + k.id, vNum, (v) => ({ kpisL: mapK(k.id, { start: v }) })),
      tgtValue: dval('kt:' + k.id, String(k.tgt)),
      setTgt: dset('kt:' + k.id, vNum, (v) => ({ kpisL: mapK(k.id, { tgt: v }) })),
      unitValue: dval('ku:' + k.id, k.unit),
      setUnit: dset('ku:' + k.id, vAny, (v) => ({ kpisL: mapK(k.id, { unit: v }) })),
      remove: () => { set({ kpisL: s.kpisL.filter((x) => x.id !== k.id) }); toast('Removed the KPI "' + k.name + '".'); }
    });
    const goalRow = (g) => {
      const kp = s.kpisL.filter((k) => k.goal === g.id);
      const linked = initsAll.filter((i) => i.goal === g.id);
      return Object.assign({
        id: g.id,
        titleValue: dval('gt:' + g.id, g.title),
        setTitle: dset('gt:' + g.id, vText, (v) => ({ goalsL: mapG(g.id, { title: v }) })),
        focus: g.focus,
        focusOptions: focusOpts,
        setFocus: (ev) => set({ goalsL: mapG(g.id, { focus: ev && ev.target ? ev.target.value : g.focus }) }),
        kpis: kp.map(kpiRow),
        hasKpis: kp.length > 0,
        addKpi: () => {
          this._n += 1;
          set({ kpisL: s.kpisL.concat([{ id: 'nk' + this._n, goal: g.id, name: 'New KPI', start: 0, cur: 0, tgt: 10, prev: 0, unit: '', dir: 'up' }]) });
          toast('Added a KPI to this goal. Rename it and set its start and target.');
        },
        linkText: plural(linked.length, 'initiative') + ' linked',
        removeHint: linked.length ? 'Removing it unlinks its ' + plural(linked.length, 'initiative') + '.' : 'No initiatives linked.'
      }, delProps('g:' + g.id, () => {
        set({
          goalsL: s.goalsL.filter((x) => x.id !== g.id),
          kpisL: s.kpisL.filter((k) => k.goal !== g.id),
          initsL: s.initsL.map((i) => (i.goal === g.id ? Object.assign({}, i, { goal: null }) : i)),
          confirmDel: null
        });
        toast('Removed the goal "' + g.title + '" and its KPIs.');
      }));
    };
    const focusGroup = (f, items) => ({ title: f.name, dotStyle: 'width:10px;height:10px;border-radius:3px;display:inline-block;background:' + f.ink, count: items.length, empty: items.length === 0, items: items });
    const mgGoalGroups = FOCUS.map((f) => focusGroup(f, s.goalsL.filter((g) => g.focus === f.id).map(goalRow)));
    const gd = s.newGoal || { title: '', focus: 'fw' };
    const upG = (patch) => set({ newGoal: Object.assign({}, gd, patch) });
    const ngCan = gd.title.trim().length > 0;
    const ng = {
      text: gd.title,
      setText: (ev) => upG({ title: ev && ev.target ? ev.target.value : '' }),
      focusChips: FOCUS.map((f) => ({ label: f.short, active: gd.focus === f.id, style: chipStyle(gd.focus === f.id), pick: () => upG({ focus: f.id }) })),
      submitStyle: 'height:32px;padding:0 16px;border:0;border-radius:10px;font-size:13px;font-weight:700;color:#ffffff;background:' + (ngCan ? '#d1453b' : '#e3b1ad') + ';cursor:' + (ngCan ? 'pointer' : 'default'),
      submit: (ev) => {
        if (ev && ev.preventDefault) ev.preventDefault();
        if (!ngCan) return;
        this._n += 1;
        set({ goalsL: s.goalsL.concat([{ id: 'ng' + this._n, focus: gd.focus, title: gd.title.trim() }]), newGoal: null });
        toast('Added the goal "' + gd.title.trim() + '" under ' + focusById[gd.focus].short + '. Add a KPI to start tracking it.');
      }
    };

    const initRow = (i) => {
      const openN = openInitTasks.filter((t) => t.init === i.id).length;
      return Object.assign({
        id: i.id,
        titleValue: dval('it:' + i.id, i.title),
        setTitle: dset('it:' + i.id, vText, (v) => ({ initsL: mapI(i.id, { title: v }) })),
        focus: i.focus,
        focusOptions: focusOpts,
        setFocus: (ev) => set({ initsL: mapI(i.id, { focus: ev && ev.target ? ev.target.value : i.focus }) }),
        status: i.status,
        statusOptions: INIT_STATUSES.map((v) => ({ value: v, label: v })),
        setStatus: (ev) => set({ initStatus: Object.assign({}, s.initStatus, { [i.id]: ev && ev.target ? ev.target.value : i.status }) }),
        isBlocked: i.status === 'Blocked',
        blockedValue: dval('ib:' + i.id, i.blocked || ''),
        setBlocked: dset('ib:' + i.id, vAny, (v) => ({ initsL: mapI(i.id, { blocked: v }) })),
        target: 'keep',
        targetOptions: [{ value: 'keep', label: i.off === null ? 'No target date' : 'Target ' + fmtDate(i.off).short }, { value: '2w', label: 'In 2 weeks' }, { value: '1m', label: 'In a month' }, { value: 'q', label: 'End of year' }, { value: 'none', label: 'No target date' }],
        setTarget: (ev) => { const v = ev && ev.target ? ev.target.value : 'keep'; if (v !== 'keep') set({ initsL: mapI(i.id, { off: NI_TARGETS[v] }) }); },
        goal: i.goal && goalById[i.goal] ? i.goal : 'none',
        goalOptions: goalOptsAll,
        setGoal: (ev) => { const v = ev && ev.target ? ev.target.value : 'none'; set({ initsL: mapI(i.id, { goal: v === 'none' ? null : v }) }); },
        metaText: plural(openN, 'open task') + ' · ' + (i.doneBase + doneOf(i.id)) + ' done',
        removeHint: 'Removing deletes the initiative and its ' + plural(openN, 'open task') + ' here. In Todoist you would archive the parent task.'
      }, delProps('i:' + i.id, () => {
        set({ initsL: s.initsL.filter((x) => x.id !== i.id), confirmDel: null });
        toast('Removed the initiative "' + i.title + '".');
      }));
    };
    const mgInitGroups = FOCUS.map((f) => focusGroup(f, initsAll.filter((i) => i.focus === f.id).sort(cmpInit).map(initRow)));
    const nDone = initsAll.filter((i) => i.status === 'Done').length;
    const mTabDefs = [
      ['customers', 'Customers', plural(s.customers.length, 'customer')],
      ['goals', 'Goals & KPIs', s.goalsL.length + ' goals · ' + s.kpisL.length + ' KPIs'],
      ['init', 'Initiatives', liveInits.length + ' live · ' + nDone + ' done']
    ];
    const mTabs = mTabDefs.map((d) => {
      const on = s.mTab === d[0];
      return {
        label: d[1], sub: d[2], active: on,
        style: 'display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:8px 14px;border:0;border-radius:8px;cursor:pointer;min-width:150px;text-align:left;' + (on ? 'background:#ffffff;color:#202020;box-shadow:0 1px 2px rgba(0,0,0,0.12)' : 'background:transparent;color:#5f5b57'),
        subStyle: 'font-size:12px;font-weight:400;color:' + (on ? '#b03830' : '#8a8784'),
        go: () => set({ mTab: d[0], confirmDel: null })
      };
    });
    const manageSub = s.mTab === 'goals'
      ? 'Define goals and their KPIs here. Log the current values on Goals & KPIs.'
      : s.mTab === 'init'
        ? 'The internal projects that move your goals. Each one is a Todoist parent task with initiative, focus and status labels.'
        : plural(s.customers.length, 'customer') + ' · ' + plural(s.csms.length, 'CSM') + ' · ' + plural(s.stages.length, 'stage') + ' · ' + nP1 + ' P1';

    return {
      isView: s.page === 'view',
      isManage: s.page === 'manage',
      isInit: s.page === 'init',
      isGoals: s.page === 'goals',
      mTabs: mTabs,
      mTabCust: s.mTab === 'customers',
      mTabGoals: s.mTab === 'goals',
      mTabInit: s.mTab === 'init',
      manageSub: manageSub,
      mgGoalGroups: mgGoalGroups,
      newGoalOpen: !!s.newGoal,
      toggleNewGoal: () => set({ newGoal: s.newGoal ? null : { title: '', focus: 'fw' } }),
      ng: ng,
      mgInitGroups: mgInitGroups,
      isObj: s.page === 'obj',
      goObj: () => set({ page: 'obj', pop: null, composer: null }),
      navObjStyle: navStyle(s.page === 'obj'),
      navObjIcon: navIcon(s.page === 'obj'),
      objCount: objTodayOpen,
      objTabs: objTabs,
      objTitle: per.title,
      objSub: per.sub,
      objPrev: () => navObj(cad.id, ooff - 1),
      objNext: () => navObj(cad.id, ooff + 1),
      objHasBack: ooff !== 0,
      objBack: () => navObj(cad.id, 0),
      objBackText: 'Back to ' + lc(periodOf(cad.id, 0).title),
      objSlots: objSlots,
      objCapText: objOpen.length + ' open · ' + objDoneN + ' done · cap ' + cad.cap,
      objCapNote: objCapNote,
      objCapStyle: 'font-size:12px;line-height:1.4;font-weight:' + (objOver ? '600' : '400') + ';color:' + (objOver ? '#8f5a0a' : '#666666'),
      objItems: objItems,
      objEmpty: objList.length === 0,
      objEmptyText: 'No objectives for ' + lc(per.title) + ' yet. Add up to ' + cad.cap + '.',
      objHasMove: objOpen.length > 0,
      objMoveAllText: 'Move ' + objOpen.length + ' open to ' + lc(nextPer.title),
      objMoveAll: () => {
        const pm = Object.assign({}, s.objMove);
        const pp = Object.assign({}, s.objParent);
        objOpen.forEach((o) => moveOne(o, pm, pp));
        set({ objMove: pm, objParent: pp });
        toast('Moved ' + plural(objOpen.length, 'open objective') + ' to ' + lc(nextPer.title) + '.');
      },
      objFormOpen: !!s.objDraft,
      toggleObjForm: () => set({ objDraft: s.objDraft ? null : { text: '', area: 'fw', parent: 'none', goal: 'none' } }),
      nf: nf,
      objPlanText: cad.plan,
      objReviewText: cad.review,
      objNotes: s.objNotes[nkey] || '',
      objSetNotes: (ev) => set({ objNotes: Object.assign({}, s.objNotes, { [nkey]: ev && ev.target ? ev.target.value : '' }) }),
      objNotesLabel: 'Notes for ' + lc(per.title),
      goInit: () => set({ page: 'init', pop: null, composer: null }),
      goGoals: () => set({ page: 'goals', pop: null, composer: null }),
      navInitStyle: navStyle(s.page === 'init'),
      navInitIcon: navIcon(s.page === 'init'),
      navGoalsStyle: navStyle(s.page === 'goals'),
      navGoalsIcon: navIcon(s.page === 'goals'),
      initCount: liveInits.length,

      initSubtitle: plural(nActive, 'active initiative') + ' · ' + nBlocked + ' blocked · ' + nNoNext + ' without a next action',
      isGroupFocus: s.groupBy === 'focus',
      isGroupStatus: s.groupBy === 'status',
      groupFocusStyle: seg(s.groupBy === 'focus'),
      groupStatusStyle: seg(s.groupBy === 'status'),
      groupFocus: () => set({ groupBy: 'focus' }),
      groupStatus: () => set({ groupBy: 'status' }),
      newInitOpen: !!s.newInit,
      toggleNewInit: () => set({ newInit: s.newInit ? null : { text: '', focus: s.initFocus || 'fw', status: 'Planned', off: '2w' } }),
      ni: ni,
      initFocusChips: initFocusChips,
      showDoneInits: s.showDoneInits,
      toggleDoneInits: () => set({ showDoneInits: !s.showDoneInits }),
      doneSwitchStyle: switchStyle(s.showDoneInits),
      initGroups: initGroups,
      noInits: initGroups.length === 0,

      goalsSubtitle: 'Goals for 2026 · ' + Math.round(ELAPSED * 100) + '% of the year gone · 93 days left · sample values',
      focusCards: focusCards,
      goalsScope: s.goalFocus ? focusById[s.goalFocus].name : 'All focus areas',
      paceSummary: paceCount['On track'] + ' on track · ' + paceCount['At risk'] + ' at risk · ' + paceCount.Behind + ' behind',
      hasGoalFocus: s.goalFocus !== null,
      clearGoalFocus: () => set({ goalFocus: null }),
      goals: goals,
      goView: () => set({ page: 'view', pop: null }),
      goManage: () => set({ page: 'manage', pop: null, composer: null }),
      sidebarCount: s.customers.length,
      navViewStyle: 'display:flex;align-items:center;gap:10px;padding:8px 12px;border:0;border-radius:8px;font-size:14px;cursor:pointer;text-align:left;' + (s.page === 'view' ? 'background:#feefe5;font-weight:600;color:#b03830' : 'background:none;color:#202020'),
      navViewIcon: 'fill:none;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round;stroke:' + (s.page === 'view' ? '#b03830' : '#666666'),
      navManageStyle: 'display:flex;align-items:center;gap:10px;padding:8px 12px;border:0;border-radius:8px;font-size:14px;cursor:pointer;text-align:left;' + (s.page === 'manage' ? 'background:#feefe5;font-weight:600;color:#b03830' : 'background:none;color:#202020'),
      navManageIcon: 'fill:none;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round;stroke:' + (s.page === 'manage' ? '#b03830' : '#666666'),

      subtitle: plural(totalTasks, 'task') + ' · ' + plural(totalEng, 'engagement') + ' · ' + plural(shown.length, 'customer') + (s.period === 'week' ? ' · Mon 28 Sep to Sun 4 Oct' : s.period === 'today' ? ' · Tue 29 Sep, with anything behind schedule' : ''),
      periods: periods,
      hasRestore: doneCount > 0,
      restoreCount: doneCount,
      restore: () => set({ done: {} }),

      popCustomers: s.pop === 'customers',
      popFilters: s.pop === 'filters',
      togglePopCustomers: () => set({ pop: s.pop === 'customers' ? null : 'customers' }),
      togglePopFilters: () => set({ pop: s.pop === 'filters' ? null : 'filters' }),
      closePop: () => set({ pop: null }),
      customersBtnLabel: selLabel,
      customersBtnStyle: 'display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 12px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;' + (allSel ? 'background:#ffffff;border:1px solid #dcdcdc;color:#202020' : 'background:#fff1f1;border:1px solid #eddede;color:#b03830'),
      filtersBtnLabel: nFilters ? 'Filters · ' + nFilters : 'Filters',
      filtersBtnStyle: 'display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 12px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;' + (nFilters ? 'background:#fff1f1;border:1px solid #eddede;color:#b03830' : 'background:#ffffff;border:1px solid #dcdcdc;color:#202020'),
      popRows: popRows,
      selectAll: () => set({ excluded: [] }),
      selectNone: () => set({ excluded: s.customers.map((c) => c.id) }),
      filterGroups: filterGroups,
      clearFilters: () => set({ fCsm: [], fStatus: [], fTier: [] }),

      isAlpha: s.sort === 'alpha',
      isCustom: s.sort === 'custom',
      alphaStyle: seg(s.sort === 'alpha'),
      customStyle: seg(s.sort === 'custom'),
      setAlpha: () => set({ sort: 'alpha' }),
      setCustom: () => set({ sort: 'custom' }),

      showEng: s.showEng,
      showEmpty: s.showEmpty,
      toggleEng: () => set({ showEng: !s.showEng }),
      toggleEmpty: () => set({ showEmpty: !s.showEmpty }),
      engSwitchStyle: switchStyle(s.showEng),
      emptySwitchStyle: switchStyle(s.showEmpty),
      knobStyle: 'width:16px;height:16px;border-radius:999px;background:#ffffff;display:block;box-shadow:0 1px 2px rgba(0,0,0,0.25)',
      ruleHint: s.showEng && s.period === 'today' ? 'Today shows engagements with a deadline in the next ' + SOON + ' days.' : '',

      cards: shown,
      noCards: shown.length === 0,
      noCardsText: nSel === 0 ? 'No customers selected. Pick some in the Customers filter.' : nFilters ? 'No customers match these filters. Clear them in Filters.' : 'Nothing to show here. Turn on "Show customers without tasks" to see every selected customer.',

      manageSubtitle: plural(s.customers.length, 'customer') + ' · ' + plural(s.csms.length, 'CSM') + ' · ' + plural(s.stages.length, 'stage') + ' · ' + nP1 + ' P1',
      manageRows: manageRows,
      csmOpen: s.listsOpen.csms,
      stageOpen: s.listsOpen.stages,
      toggleCsm: () => set({ listsOpen: Object.assign({}, s.listsOpen, { csms: !s.listsOpen.csms }) }),
      toggleStages: () => set({ listsOpen: Object.assign({}, s.listsOpen, { stages: !s.listsOpen.stages }) }),
      csmHeadStyle: headStyle(s.listsOpen.csms),
      stageHeadStyle: headStyle(s.listsOpen.stages),
      csmChev: chevStyle(s.listsOpen.csms),
      stageChev: chevStyle(s.listsOpen.stages),
      csmSubtitle: s.listsOpen.csms ? 'Who owns the customer on the CSM side' : plural(s.csms.length, 'CSM') + ': ' + (s.csms.map(nameOf).join(', ') || 'none yet'),
      stageSubtitle: s.listsOpen.stages ? 'Order sets the order in filters and menus' : s.stages.map(nameOf).join(' › '),
      csmRows: csmRows,
      unassignedText: plural(cnt('csm', 'none'), 'customer'),
      newCsm: s.newCsm,
      setNewCsm: (ev) => set({ newCsm: ev && ev.target ? ev.target.value : '' }),
      addCsm: addCsm,
      addCsmStyle: addBtn(s.newCsm.trim().length > 0),
      stageRows: stageRows,
      newStage: s.newStage,
      setNewStage: (ev) => set({ newStage: ev && ev.target ? ev.target.value : '' }),
      addStage: addStage,
      addStageStyle: addBtn(s.newStage.trim().length > 0),
      newCust: s.newCust,
      setNewCust: (ev) => set({ newCust: ev && ev.target ? ev.target.value : '' }),
      addCustomer: addCustomer,
      newCustHint: newName ? 'Label @' + (slug(newName) || '…') : '',
      addCustStyle: 'height:30px;padding:0 14px;border:0;border-radius:8px;font-size:13px;font-weight:600;color:' + (canAdd ? '#b03830' : '#8a8784') + ';background:' + (canAdd ? '#fff1f1' : '#f0efee') + ';cursor:' + (canAdd ? 'pointer' : 'default'),

      hasToast: !!s.toast,
      toast: s.toast
    };
  }
}
