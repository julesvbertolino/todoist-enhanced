# Extension docs

Ken's fork of Enhanced for Todoist adds five views for a Technical Success
Manager at Bynder: Customers, Manage, Initiatives, Goals & KPIs and Objectives.
All of its code lives under `src/ext/`, so upstream stays mergeable. The rules
of the fork are in [`../../CLAUDE.md`](../../CLAUDE.md).

Read in this order:

| Document | What it covers |
| --- | --- |
| [SPEC.md](SPEC.md) | What each view does, with its exact rules |
| [DATA-MODEL.md](DATA-MODEL.md) | How it maps onto Todoist labels, tasks and comments, plus the extension data the app stores itself |
| [BUILD-PLAN.md](BUILD-PLAN.md) | The eleven phases (0–10), one branch and one PR each |
| [mockup/](mockup/README.md) | The mockup's markup (`mockup.html`) and logic (`mockup-logic.js`), as a reference only |

Also useful:

- [`../component-language.md`](../component-language.md): the app's own UI rules
  (tokens, controls, popups). New UI follows it.
- [`../../UPDATING.md`](../../UPDATING.md): how upstream updates arrive and how
  to merge them.

The spec is the source of truth. If something turns out wrong in real use, edit
`SPEC.md` first, then bring the code in line with it.
