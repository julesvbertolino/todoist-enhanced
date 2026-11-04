<div align="center">

# Enhanced for Todoist

**Todoist just got even more powerful, with a new front end to display your tasks.** The data stays in Todoist, but now you can plan a week, have a review, and get a lot of new features and visual enhancements.

[Open the app](https://todoistenhanced.julesbertolino.fr) · [Mac app](#mac-app) · [Changelog](CHANGELOG.md) · [Report a bug or an idea](https://forms.fillout.com/t/79WYJmkgqkus) · [Buy me a coffee](https://buymeacoffee.com/julesbertolino)

_Enhanced for Todoist is an independent project. It is not created by, affiliated with, or supported by Todoist._

</div>

---

## Contents

- [Mac app](#mac-app)
- [New features for Todoist](#new-features-for-todoist)
- […and what you already know from Todoist](#and-what-you-already-know-from-todoist)
- [Screenshots](#screenshots)
- [How to use it](#how-to-use-it)
- [Links](#links)
- [Building it](#building-it)
- [Disclaimers](#disclaimers)

---

## Mac app

A window around Enhanced for Todoist for your Mac, with one extra: press **Option + Space** over any app and the new task window opens, without going through a browser.

- **[Download for Apple silicon](https://github.com/julesvbertolino/todoist-enhanced-desktop/releases/latest/download/Enhanced-for-Todoist-arm64.dmg)** (M1 and later)
- **[Download for Intel](https://github.com/julesvbertolino/todoist-enhanced-desktop/releases/latest/download/Enhanced-for-Todoist-x64.dmg)**

Not sure which one? Apple menu, About This Mac: "Chip" says Apple M1 or later, or "Processor" says Intel.

The first time, macOS asks you to confirm that you want to open it: System Settings, Privacy & Security, then **Open Anyway**. The [install steps](https://github.com/julesvbertolino/todoist-enhanced-desktop#install-in-three-steps) show it in three lines. The app lives in its [own repository](https://github.com/julesvbertolino/todoist-enhanced-desktop).

---

## New features for Todoist

Everything here is stored in properties Todoist already has: an estimate is a label (or Todoist's own duration, which is read too), "anytime this week" is a label, and the rest is projects, sections, priorities and dates. Open the official app afterwards and nothing looks unusual. If this project stopped working tomorrow your data would be untouched, because it never lived anywhere else.

- **Today / Anytime this week / Someday:** Todoist asks which day a task belongs to, and most work has no good answer — it belongs to *this week*, and picking Tuesday for it is a guess you spend the week correcting. So there are three commitments instead of one. Today is what you have actually dated. Anytime this week is what you have committed to without pinning to an afternoon. Someday is what you are not committing to yet — out of the week but not out of the app, read back to you at the weekly review so it never quietly becomes a graveyard. On the page itself, tasks that have sat there for months (three by default, 1 to 12 in Settings) are gathered at the top in a group called Gathering dust, each with three actions: This week, Keep or Delete. A task you keep stays in Someday on purpose and comes back only after another full delay; that is remembered on the device, and nothing is written to Todoist for it.

- **Eisenhower matrix:** the same tasks, sorted into four quadrants instead of a list — urgent and important, important but not urgent, urgent but not important, neither. Urgency comes from the due date (you choose how close counts as urgent), importance from priority (P1 only, or P1 and P2). Switch to a flat list, filter by workspace, and decide whether Someday tasks count.

- **Daily and weekly review:** a few minutes, one question at a time, with an end. The daily one walks what is late, your mail, the Inbox, what you committed to this week without naming a day, what has no estimate, and what today weighs against the hours you have. Each step is answered from inside it, so you never leave the review to act on what it just told you. The weekly one closes the week and opens the next: what you finished, the week in numbers, what is late, which projects have gone quiet.

- **Task durations:** write down how long a task will take — `25`, `1h15`, `90 min`. Every page then carries a line saying how many tasks are on it, how much time they add up to, and what share of the capacity you set for that day or week. That last figure is a load pill: green, amber, over. A day filled to 140% says so before you start it, not at six in the evening. A parent whose open subtasks all have a duration takes their sum, written to the task so Todoist shows it too; with one missing it keeps its own, or shows the partial sum as computed. Anything still unestimated is counted separately and listed in one place so you can fill a page of them in one pass. A duration set in Todoist's own field counts too, with the source chosen in Settings taking priority when both are present. Tags are the default and work on every plan; editing a tag estimate keeps Todoist’s calendar duration. Duration mode is blocked on free accounts. Every native estimate write is checked against server data; a dropped or refused duration switches back to tags and recovers the estimate. An unavailable verification stays queued for the next sync. Durations in days are ignored; estimates of 24 hours or more keep their exact minute value. Settings offers a conversion preview for open tasks, including subtasks, with skipped conflicts and a result per batch. Converting timed durations to tags preserves calendar blocks; untimed durations are cleared. Account labels and completed tasks are never deleted by conversion.

- **I have time:** a pill next to the load figure on My week, projects, tags, the Inbox and Someday. Pick how long you have, 5 minutes to an hour or any duration you type, and a panel on the right lists the tasks that fit, by when they are due: overdue, today, tomorrow, this week, no date. It looks in the page you are on or everywhere, never guesses at a task with no estimate (it counts them, and offers to estimate them), and leaves the page behind it exactly as it was. Nothing is changed and nothing is remembered after a reload.

- **Checklists:** lines like `- [ ] item` in a task's description show as small checkboxes in the task panel, with "3 of 7" beside the description. Ticking one changes only that line, so the same text still reads fine in Todoist's own apps (which may show the lines as plain text). Editing is by rows rather than syntax: Enter adds the next item, Enter on an empty one leaves the list, Backspace at its start makes it plain text, and `[]` and a space starts a list, in the panel and in the new task window. Task rows never show the checklist lines.

- **Folders:** group projects inside a folder the way Todoist's own apps do — a collapsible row you can expand or collapse on its own, in your personal projects as much as in any team workspace. Drop a project onto a folder to file it inside.

- **Quick tasks on top of the list:** anything short enough to *do* rather than plan, gathered into its own bucket at the top of the week — under five minutes, or tagged `quick`. It sits at the top because that is when it is useful: the five minutes before a meeting are the five minutes those tasks are for. A task tagged quick but estimated at forty minutes is not quick, so it stays out and is reported as a contradiction instead. The same group leads a project, a tag, the Inbox and Someday, with the tasks that are late, due today or without a date (a quick task due next month stays where it is); each row says which section or project it comes from, and nothing is listed twice. On a board it is a blue first column, to look at rather than to drop tasks on. One switch in Settings turns it off everywhere.

- **Visible subtasks:** drawn under their parent in the list, indented, rather than hidden behind a count you have to open the task to see. The parent shows how many are done and its estimate is the sum of theirs. They can be made and unmade by dragging — pull a row a little to the right over another and it goes inside it; pull a subtask out to the left and it is a task of its own again. The task composer works the same way: add subtasks inline while you write the parent, each one its own editable row, and they are all created together when you save.

- **Project icons:** pick an icon for a project from a searchable catalog, next to the existing colour picker. It is saved as real Todoist data, so it follows the project between devices, not just this browser.

- **Dashboard:** a board that changes with the period you pick. A day shows the hours you finished things in, a week adds its shape and a comparison with the one before, a quarter and a year read month by month. Edit layout lets you put the cards in the order you want, with the mouse or the keyboard, and Reset to default puts them back. The focus score weights what you finished by its priority — the only question worth asking about a finished week: whether the effort went where it mattered, or into whatever was easiest to close.

- **Better logbook:** what you actually finished, grouped by day, and filtered by several projects and priorities at once rather than one at a time. It shares the period control with the dashboard, so the two always describe the same window.

- **Custom themes:** ten accent colours plus one you pick yourself, every one drawn in light *and* dark and checked for contrast rather than chosen by eye. Dark mode is not a second-class version of the theme — it is the theme. Light, dark, or whatever the device is set to.

- **Things to settle:** the contradictions no app should resolve on its own — a task both dated and labelled for the week, two estimates on one task, a quick task estimated at forty minutes. Each is listed with the options that match each possible intent, and nothing changes until you choose one.

- **The keyboard, and a phone:** arrows walk the list, Enter opens a task, `E` finishes it, `T` schedules it, `G` then a letter goes somewhere, and typing anything else starts a search — Todoist's own keys wherever Todoist has one, with `?` for the list. On a phone, swipe a task aside for its actions and hold it for the rest, the two gestures a phone has in place of a pointer hovering over a row.

## …and what you already know from Todoist

- **Drag and drop:** a task onto a day, a project, a tag, a section, a board column, or another task. In the sidebar, projects reorder by dragging and nest by dragging one a little to the right. Dropped straight onto a row, a task takes that row's place, and the order is written back to Todoist rather than into a corner of this app. Every destination has one fixed meaning, every drop says what it did, and every drop can be undone.

- **List, board and calendar views:** with sorting and filtering behind one Display control, remembered separately for each page. Calendar offers 3 days, week and month, an undated-tasks sidebar, drag and drop, and resizing in 15-minute steps. Tag estimates work on Free accounts and stay in tags; Todoist’s own calendar only reads native durations. Recurring forecasts are read-only. Completed history is shown on completion day; saved filters retain locally completed matches, since Todoist’s query endpoint returns open tasks.

- **Natural language in the task composer:** `Call Marc tomorrow at 9h p1 #Work @quick (25)` — the date, project, priority, tag and estimate are marked inside the field as you type, and fill the fields underneath, so you see what it understood before you commit. Click a mark, or press Backspace against it, and that reading turns back into ordinary text. Recurring dates use Todoist's own grammar — `every monday`, `every 3 days`, `every!` — handed to Todoist to resolve rather than guessed at here.

- **Projects, sections, tags and favourites:** a page for each, nested and ordered by dragging, with the Inbox and Upcoming where you expect them. A section has a menu: edit, move to another project, duplicate with its tasks, copy its link, archive or delete.

- **Search:** `⌘K`, or just start typing. It covers tasks, projects, sections, tags and every view in the app, which makes it the fastest way to anywhere.

- **Multi-select:** `⌘`-click, with one bar at the foot of the window to give the lot a date, a project, a tag or a priority.

- **Markdown in descriptions:** rendered in the list and in the task panel.

- **And the rest:** undo (`⌘Z`) for a move, a completion, a deletion or a drop, with a deleted task coming back with its subtasks. Offline, with changes queued and sent when you reconnect, and installable as an app. English and French, and settings for the things people disagree about.

## Screenshots

![My week](docs/default-my-week.png)

*My week — behind schedule, quick, today, anytime this week, with the load pill and the totals across the top.*

![The daily review](docs/review.png)

*The daily review: one question at a time, answered from inside the step.*

![The insights dashboard](docs/insights-dashboard.png)

*Looking back over a period, with the focus score.*

![The task composer](docs/composer.png)

*The composer reading a date, a project, a priority and a tag out of what was typed.*

![Things to settle](docs/thingstosettle-noestimates.png)

*Things to settle — contradictions listed with the options that match each intent.*

## How to use it

1. Open **[todoistenhanced.julesbertolino.fr](https://todoistenhanced.julesbertolino.fr)**.
2. Press **Explore with demo data** to look around a made-up workspace without an account. Nothing is sent anywhere.
3. To use your own account, press **Continue with Todoist** and accept on Todoist's page. The app then appears in Todoist → Settings → Integrations, where it can be removed at any time. If you prefer, **Use an API token instead** still takes a token copied from [Todoist → Settings → Integrations → Developer](https://app.todoist.com/app/settings/integrations/developer).

There is no server, no database and no account beyond your Todoist one. The browser talks to the Todoist API directly, sign-in included (OAuth with PKCE, no client secret). Your access is stored in your own browser and is only ever sent to Todoist. A copy of your workspace and anything you changed offline sit in IndexedDB on that device; your settings also sit in a comment on your Todoist Inbox, so they follow you to another browser.

## Links

- **[Open the app](https://todoistenhanced.julesbertolino.fr)**
- **[Report a bug or an idea](https://forms.fillout.com/t/79WYJmkgqkus)** — a short form, no GitHub account needed. It is the one the app links to from the user menu.
- **[Changelog](CHANGELOG.md)** — each version is also a [release](https://github.com/julesvbertolino/todoist-enhancements/releases) with a ready-to-host build attached.
- **[Buy me a coffee](https://buymeacoffee.com/julesbertolino)** if it saves you time.

## Building it

React 18, TypeScript and Vite. Zustand for state, `idb` for IndexedDB, `@dnd-kit` for drag and drop, `date-fns` for dates, `vite-plugin-pwa` so it can be installed. No UI or CSS framework.

    npm install
    npm run dev      # Node 22, pinned in .nvmrc
    npm run build    # a static site in dist/, see docs/deploying.md
    npm run lint     # ESLint, including React hook rules
    npm test         # unit tests on the rules (Vitest)
    npm run e2e      # demo journeys in a browser (Playwright); add --headed to watch

The journeys need Playwright's Chromium: `npx playwright install chromium` once on a new machine. GitHub runs lint, the typecheck, the unit tests and a build on every push, and the journeys on every pull request.

### Self-hosting

"Continue with Todoist" identifies the app by a file it hosts, `oauth/client.json`, and Todoist only sends people back to the address that file names. The build writes it for the official site unless told otherwise, so a copy on your own domain has to be built for that domain:

    PUBLIC_URL=https://your.domain/ npm run build   # include the subfolder, if any

The file must be reachable over HTTPS at `https://your.domain/oauth/client.json`, since Todoist fetches it. A copy built for another address says so on its sign-in screen instead of sending you to Todoist's "Invalid redirect URI". Signing in with an API token works anywhere, with none of this.

I built this for myself, so it is shaped around one person's habits — that is the main thing it needs help with. If you have an idea, open an issue and say how you plan your week. The most useful thing you can tell me is what you do that this app makes difficult.

Pull requests are open. The rules live in `src/domain` and depend on nothing else, so most behaviour can be changed without touching the interface.

## Disclaimers

Enhanced for Todoist is an independent project. **It is not created by, affiliated with, or supported by Todoist.** It is not an official Todoist product and it carries no endorsement.

"Todoist" is a trademark of Todoist Inc. Any reference to it here is descriptive, to say what this connects to, and implies no association. The project is named in the `x for Todoist` form that Todoist's [brand usage guidelines](https://developer.todoist.com/api/v1/#section/Developing-with-Todoist/Brand-usage) ask of third-party apps, and the same statement appears on the sign-in screen and under Settings, About. The app's icon, name and interface are its own work: no Todoist logo, icon or other brand asset is used anywhere in this project.

It uses the public Todoist API as any account holder may. It is provided as is, with no warranty, and it is not a support channel for Todoist: if something is wrong with your account or with Todoist itself, ask Todoist, not me. If anyone at Todoist would like something here changed, open an issue and I will change it.

**License:** [MIT](LICENSE).

### Privacy

No analytics SDK, usage counters or tracking cookies are included. Settings → Privacy explains local storage and Todoist synchronization. The same information is available before sign-in.
