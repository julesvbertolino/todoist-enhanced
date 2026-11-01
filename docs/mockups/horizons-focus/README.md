# Horizons and Focus exploration

Local, isolated review prototype for issues #414, #413 and #334. Uses the real application styles, icons, PageHeader and TaskRow. Runs exclusively against in-memory demo data. No application entrypoint, route, service worker or production behavior is changed.

From the repository root:

    npx vite build --config docs/mockups/horizons-focus/vite.config.mjs

The configuration emits maquettes.html and its assets to this chat's outputs directory. Serve the chat directory locally and open /outputs/maquettes.html. The normal application build does not include this prototype.

The current user direction replaces date-based horizon exploration with native tag-based sidebar views. New tag names, horizon exclusivity, rollover, My week's dated-task membership, setup defaults and timer behavior remain proposals pending selection.

## Latest review direction

This week replaces My week. Next month is removed from sidebar/setup. Helper text is limited to setup; Next week and This month mention Carl Pullein. The task Start date picker explores undated horizon choices. The separate move-horizon UI and rules page are removed. Review compares a single horizon board with an Eisenhower board; the exact requested review issue has not been identified.

The Pomodoro gallery now compares ten controls to the left of Display / Insights / More. One timer can be free or task-linked. Discreet counter and native full-screen display are preferences, with a separate optional setup exploration. The gradient and bottom floating timer are removed. State controls are illustrations, not a real countdown.
