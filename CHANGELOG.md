# Changelog

Every line is marked with:
- 🆕 New: something the app could not do before,
- 🎨 Better: something that already existed and now works or looks better,
- 🐛 Fix: a bug or a regression that is gone.

The app shows each release in its "What's new" window, so every line is
written for the people using it, in the tone of Apple's release notes:
simple, warm, about what they can do now. Say where the thing is (the page,
the button, the key) and what it does for them, in plain words. No jargon,
no internal names, no em dashes. Inside a release the app lists the lines by
impact, new things first, then improvements, then fixes, so write them in
that order, the most visible and most frequent case first. The French
translation lives in CHANGELOG.fr.md.

**How to write an entry**

- A release lists only what changed since the previous public release. Work
  done during development on something new in the same release belongs in
  that feature's line, never in a line of its own.
- Improvements to a feature that shipped in an earlier release are 🎨 Better,
  not 🆕 New, and every improvement to the same feature goes into ONE line
  titled "<Feature> refinements", not one line each.
- The bold lead is the title: a short phrase that says what the person can do
  or see ("Resize your sidebar"), in sentence case, ending with a full stop.
  What follows is one or two short sentences: where it is and what it does
  for them.
- A picture is added only when it helps to understand the idea. It shows the
  thing itself and carries no title, caption or hint of its own: the entry
  already says what it is. Pictures all sit in the same 16:10 frame.
- An entry, title included, is at most 350 characters. A title is understood
  at a glance, by someone who does not know the feature: "Choose the width of
  your lists", not "Comfortable width".
- Every entry has a bold title AND a description, never a title alone and
  never a description alone. The title is short (about 6 words), starts with a
  verb or names the thing, and means something to someone who has never used
  the feature: no jargon, no "Project / Section"-style notation, no "to see
  its X" chains.
- Only what a person using the app can see or do. No technical work, no
  intermediate states of the same release.

## 2.23.0

🎨 **Clearer details.** Secondary text is easier to read, the project search hint is shorter, and chart columns are easier to select.

🐛 **Performance improvements.** The app loads less code on startup and stays more responsive when you open a task, type or scroll. Synchronization does less work when nothing has changed, and Review no longer keeps the processor busy while idle.

## 2.22.0

🆕 **See a project’s progress.** A circle beside projects without a custom icon fills as you complete tasks.

🆕 **Filter your dashboard.** In Display, choose priorities and tags to focus the dashboard on the work you want to review. The filters apply to completed work and the previous period too.

🎨 **Choose a project or filter icon.** Pick from a focused set of familiar icons, and find them by name or related words. Icons already chosen remain in place.

🎨 **Eisenhower Matrix refinements.** Choose how far ahead to show dated tasks, and define urgent and important separately. The sidebar shows the matrix task count; Upcoming no longer shows one.

🐛 **Align subtask text.** The subtask field in the task composer lines up with its checkbox.

## 2.21.0

🆕 **Choose pure black in dark mode.** In Settings, Appearance, set Dark style to AMOLED. Pages and the sidebar turn true black with any accent colour, while menus and dialogs stay a shade lighter so they remain easy to read.

🆕 **Attach several files to a comment.** Pick as many as you like with the paperclip, or paste a screenshot or GIF anywhere in the task. Files wait as chips, then each is posted as its own comment, your words on the first. Click a file to open it in Todoist.

🆕 **Turn a long thread over.** From four comments on, a Newest first button in the header shows the latest at the top. It is only for the moment: the next task you open reads as written, oldest first.

🎨 **Table refinements.** Click a heading to sort, click again to reverse. Its chevron filters, moves or hides the column, and you can drag headings to reorder them. A new Assigned to column, in Display, Columns, shows who owns each task.

🎨 **Type dates the Todoist way.** In the composer, tmr, tmrw and tmw mean tomorrow, and tod and tom in lower case mean today and tomorrow. A name such as Tom with a capital stays part of your task.

🎨 **Catch up on several versions at once.** After a few versions away, What's new is one list instead of one page per release, pictures first, then new, better and fixed, each with its version. Settings, Changelog still keeps every release apart.

## 2.20.0

🆕 **See which tasks have comments.** A comment icon and count appear on tasks in lists, boards and tables. Click the icon to open the discussion. Hide it from Display when you prefer fewer details.

🎨 **Change dates and priorities faster.** Right-click a task to choose a priority or a date shortcut directly in the menu. The calendar remains one click away for a specific date.

🎨 **See where a card will go.** When a board is sorted automatically, the destination column is shaded as you drag. Manual sorting keeps the precise position indicator.

🎨 **Write comments without sending too soon.** Enter starts a new line. Cmd+Enter or Ctrl+Enter sends your comment or saves an edit; the send button works as before. The comment frame turns greyer while you type, so you can tell when Escape has let go of it.

🎨 **See how late a task is.** Two days late or more, a task says so ("3d late", "45d late") instead of showing its date. Hover the chip to see the date.

🎨 **Spot a subtask at a glance.** An opened subtask says "Subtask of" above its title, with its parent one click away.

🐛 **Select board cards with the mouse.** Drag from any empty spot on the page to select several cards without highlighting text. Starting on a card still moves it.

🐛 **Close task pickers reliably.** Click outside a picker or press Escape to dismiss it. A dismissing click no longer triggers an action underneath, and opening another picker closes the first.

🐛 **Keep control of repeating tasks.** Moving a recurring task to Anytime this week or Someday now asks before removing its repeat. Cancel to keep it, or undo the move afterwards.

🐛 **Keep your connection through temporary errors.** Temporary token renewal failures and permission refusals no longer erase your sign-in. Requests from an older tab use renewed credentials when available.

🐛 **Update when you choose.** When a new version is out, a card says so at the foot of the sidebar, or above the tabs on a phone. Nothing reloads until you press Update; Later leaves a reminder in the sidebar. Otherwise, the new version arrives the next time you open the app.

## 2.19.0

🆕 **Create views for your projects.** Press + under a project's title to add a view: its own name, layout, grouping and filters. Switch between views in one click, nothing to set up again. Press the open view to change it. Your views follow your account.

🎨 **Display refinements.** Display and each view now have three parts: view type, group and sort, filters. Priority, estimate, tags and assignee are dropdowns with checkboxes. In a table, Columns opens a list at the side: switch columns on or off and drag any of them to reorder.

## 2.18.0

🆕 **Mention someone in a comment.** In a shared project, type @ in a task's comment to pick a person from the list. Notify, above the field, chooses who hears about it: everyone, or one person. Someone you mention is always told.

🎨 **Fold subtasks from the title.** The arrow after a parent task's title hides or shows its subtasks. Todoist keeps your choice, so the task stays folded after a reload and in the Todoist apps.

🐛 **Insights match Todoist.** Insights now counts subtasks on every page. On a project or the Inbox, the completed total and the percentage are the ones Todoist shows. Other pages say their completed figure covers all projects, over the last 7 days.

🐛 **Project counts match Todoist.** The number beside each project and the Inbox in the sidebar now includes subtasks, like in Todoist.

🐛 **Updates arrive on their own.** After a new version is out, the app switches to it a few seconds after you open it, with no need to reload several times. If you are writing something, a Reload button waits for you instead.

## 2.17.0

🆕 **Privacy explained.** A dedicated Settings section explains local data storage, Todoist synchronization and the absence of usage tracking.

🎨 **Workspace refinements.** Projects follow the sidebar order, with folders you can expand and collapse. Icons line up on the left, and progress appears beside each project.

🎨 **Quieter subtasks.** A subtask no longer repeats the project of the parent shown above it. When it appears on its own, its project stays visible.

🎨 **Reschedule overdue tasks at a glance.** The Behind schedule heading has a red calendar button to move everything to today. Confirmation and Undo work as before.

🐛 **Add a section without a jump.** The Board keeps a name field that is already visible in place. New columns scroll into view only when needed.

🐛 **Selects keep their outline.** Grouping and Sort retain their normal outline after a mouse choice. Keyboard navigation still shows the focus ring.

## 2.16.0

🆕 **Group tasks by status.** In Display, choose Group by, then Status: To do, In progress and Done. It works with or without sections, in List and Board. Marking a task Done keeps it open until you complete it.

🆕 **See a workspace at a glance.** Open a workspace from the sidebar to see its projects, how many tasks are open or done, and their progress. Archived projects and team members are listed below.

🎨 **See the section of a task in your lists.** A task now shows its project and its section, like "Website / Design", with the full name when you hover it.

🎨 **Clearer priority checkboxes.** The border is a little bolder, so you can tell a priority 1 from a priority 3 at a glance.

🎨 **A feedback form that opens in its own tab.** Send a bug or an idea from the new form, without a window inside a window.

🐛 **Selected cards keep their colour on the Board.** After you select cards with Cmd+click and move the pointer away, each card keeps one even colour.

🐛 **No stray outline after using the mouse.** Clicking, or closing a menu with Escape, no longer leaves an outline. Tab and the arrow keys still show where you are.

## 2.15.0

🎨 **Mobile version refinements.** Navigation, menus, task details, the new task window and sign-in are redesigned for phones, with bigger touch targets, sheets that slide up and views that fit a small screen. A short invitation shows how to add the app to your home screen.

## 2.14.0

🆕 **A sound when you complete a task.** A little pat on the shoulder, right when you tick it. Not for you? Turn it off in Settings, General.

🎨 **A changelog that is nicer to read.** Every change has a badge, a clear title and, when it helps, a picture. The old releases were rewritten the same way.

## 2.13.0

🎨 **Table view refinements.** Headers stay in view as you scroll, you can reorder the columns in Display, tags fit on one line and sections now show in My week.

🎨 **Choose the width of your lists.** Lists are back in a centred column. Want more room? Turn on "Full width" in Display.

🎨 **More columns on your boards.** Columns are a little narrower, so some screens fit one more.

🎨 **No more banner in the demo.** The strip at the top is gone. "Leave demo" lives in the account menu.

## 2.12.0

🎨 **Mobile version refinements.** Pages use the full width, fields no longer zoom in when you tap them, screens sit above the browser toolbar and everything is easier to reach with a thumb.

🐛 **Long descriptions in the new task window.** A long description used to overflow and push the buttons out of reach. It now scrolls inside its field, so you can always add the task.

## 2.11.0

🆕 **Table view for your lists.** See your tasks in columns for dates, deadlines, priorities, durations and tags, and choose which ones to show. Sort from the headers and edit values right in the cells.

🆕 **Resize your sidebar.** Long project names? Drag the sidebar's right edge to give them room. Double-click the edge to go back to the default width.

🆕 **Paste images from the composer.** Some tasks need more context. Paste an image in the new task window to preview it, and it is attached as a comment when you add the task.

🎨 **Clearer view choices.** Adding the table made the old button too crowded. In Display, each view now has its icon above its name.

🐛 **Filters keep tasks in the right place.** A subtask no longer vanishes from one list because its parent matches another. Grouped by date, overdue tasks share one group and day headings show the right date.

## 2.10.0

🆕 **Calendar view for your lists.** Plan your tasks across 3 days, a week or a month. Drag undated tasks onto a time slot, move or resize blocks, and create a task right in the calendar. Colours, repeat forecasts and completed tasks are in Display.

## 2.9.0

🆕 **Assign a task from the composer.** In a shared project, type `+` in the new task window to pick someone from the project. `+Anne` gives the task to Anne and fills the assignee chip.

🆕 **Write subtasks the way you write tasks.** In a task's panel and in the composer, a subtask line understands dates, repeats, `p1`, `@tags` and durations such as `pendant 1h`. A `#project` stays text, since a subtask lives in its parent's project.

🎨 **Share window refinements.** See who is in a project and their role, and invite new people. In a workspace project, admins change each member's role. Access (restricted, team or public) opens as a menu, and "Copy link" copies the project's address.

🎨 **Missing estimates look like other notifications.** In Notifications, Conflicts, a task without an estimate is now a card like the others, with the Estimate field where the buttons were. It saves as you type.

🎨 **Longer titles on board cards.** A card shows up to three lines of title and two of description, like the list does.

🎨 **Workspace icons line up in the sidebar.** A workspace's picture sits in the same column as its projects' icons, and one without a picture shows its initial.

🐛 **Completed tasks show again in a project.** With "Show completed tasks" on, a project lists what you finished in the past year, not only during this session.

🐛 **Tags starting with an emoji work.** `@🏡home` in a title is now applied and removed from the title, like any other tag.

## 2.8.0

🆕 **See future repeats in Upcoming.** Repeating tasks show the days they come back, and how much time they will take. Dotted checkboxes mark them; click one to open the task.

🆕 **See every search result.** Press Enter to open the full results page, with no 30-task limit. Use the arrows to pick a result, or jump to a project, section or tag from its coloured chip.

🆕 **Rename a tag from its page.** Edit its title and press Enter. Your tasks, favourites and search follow the new name.

🆕 **Type a time as you add a task.** `20h30` or `in two hours` is read as a time and the task is scheduled for you. A bare `2h` stays a duration.

🆕 **Write durations in words.** `(one hour thirty minutes)`, `for one hour` or `pendant une heure` set the estimate, and the words leave the title.

🎨 **A checkmark when a duration is accepted.** Press Enter and a brief checkmark confirms it.

🎨 **Insights follows your accent colour.** Its button wears a soft version of your colour, in light and dark.

🎨 **Choose whether My week includes today.** "Show Today tasks" now works on its own, apart from the Today entry in the sidebar. Hide it and overdue tasks stay, and the sidebar count follows.

🐛 **Composer controls work in Q and Quick Add.** No more stray "Nobody" control on Inbox tasks, project menus keep a sensible width, and tag results answer the arrows and Enter.

🐛 **Team folders are back in the sidebar.** Workspace projects sit in their Todoist folders again.

🐛 **Lists and boards share the same page width.** A list had become narrower than its board. Both now line up, so switching views no longer shifts the page.

## 2.7.0

🆕 **Tasks assigned to other people are hidden by default.** Today, My week, Upcoming, Someday, Review, the matrix, tags and the Dashboard show your tasks and unassigned ones. Use Display to include colleagues or choose Everyone. Projects still show everyone.

🆕 **Assign a task to someone.** In a shared project, pick a person from the task row, the open task or the composer. Group and sort a project by assignee; adding from a person's group pre-fills them.

🎨 **Filter your workspaces.** The Workspace menu can mix personal projects and team workspaces, with a clear "Any" to reset.

🎨 **See who a task is assigned to.** Tasks show a photo or initials, with the assignee menu before the three-dot menu. Menus stay inside the screen.

🎨 **Cleaner Review, Dashboard and task controls.** Review keeps its assignee filter beside Daily and Weekly, the Dashboard groups Edit layout, Display and Logbook, and open tasks get rounder, quieter fields.

🐛 **Upcoming offers more days only when there is more work.** The "more days" button now disappears when no task lies beyond the days already shown, instead of leading to an empty stretch.

🐛 **Better date recognition in composers.** "In a month", "dans un mois" and "dans 2 mois" are understood, even from a dated section.

## 2.6.0

🎨 **Dates wear Todoist's colours.** Red when late, green today, orange tomorrow, purple within a week, none after that.

🎨 **Long section titles wrap.** A long section name now goes onto several lines instead of running off the page.

🎨 **Long task titles wrap in the composer.** The field grows with the title, and dates, #projects and @tags stay highlighted.

🎨 **Q adds the task where you are.** From Today it is due today, from My week it gets the week label, from a project it lands there, from a tag page it gets that tag.

🎨 **Coloured chips in the composer.** Date, deadline, priority, project and tags each show their own colour.

🎨 **Neater task rows.** The checkbox lines up with the title, and the title is a little bolder.

🎨 **Find us on LinkedIn, X and GitHub.** Links to the author's profiles and to the code are in Settings, About.

🐛 **Coloured chips are coloured again.** With "Inherited" chips in Settings, dates, projects and tags show their colour.

🐛 **Skipping the tour no longer opens the setup.** Choosing Skip now simply closes the tour.

🐛 **"Add task" explains itself.** When everything you typed reads as a date, a project or a tag, the button is greyed out and says why.

## 2.5.0

🆕 **Choose who can access a project.** In New project and Edit project, pick Restricted, Team or Public when Todoist allows it. If Todoist refuses, you are told and nothing changes.

🆕 **The Mac app, one click away.** Settings, About links to the Mac app and how to install it, with the right download for Apple silicon or Intel. It brings its own window and Quick Add with Option + Space.

🎨 **A tour only when there is something to show.** After an update, "Show me" appears only if the release added something the tour can point at. The full tour stays in Settings, About.

🐛 **Every project is reachable in the sidebar.** The last projects of a long list were hidden behind the "Add task" area. The list now scrolls all the way.

## 2.4.0

🆕 **Star a filter or a tag from its card.** One click adds it to your favourites, here and in Todoist.

🎨 **"What's new since your last visit."** The window no longer carries the latest version's number in its title, which misled when several releases were listed.

🐛 **Type right after opening the icon picker.** Icons filter as you type, instead of the app search opening.

## 2.3.0

🆕 **Set a time, a duration and a repeat from the date picker.** Time, Duration and Repeat are in the composer, the Schedule menu and the open task. Pick a common repeat or customise the interval, weekdays, end date and whether it follows completion.

🎨 **A repeating task shows its day with a repeat mark.** "↻ Tomorrow 09:30" instead of the rule in words, which you can read by hovering. The open task no longer has a separate rule field.

🐛 **Changing the day keeps the time.** A task set to "today 12:00" and moved to tomorrow stays at 12:00.

🐛 **A new repeat no longer skips today.** "Every day" on a task due today starts today, and changing a repeating task's time keeps its day.

🐛 **A repeat with an end keeps it.** "Every monday at 9am until 31/12" no longer loses its "until 31/12".

## 2.2.0

🆕 **Your Todoist filters are in the app.** Filters in the sidebar lists your saved filters with their task counts, even those with several parts. Starred ones appear in Favourites. Hide the entry in Settings if you prefer.

🆕 **Create, edit and organise filters.** Make a filter with its query, colour, icon and favourite status, then edit it on its page. Drag to reorder, or use its menu to star, copy a link or delete. Everything is saved in Todoist.

🆕 **Change a tag's colour.** On the Tags page, "New tag" sets a colour and a star, and each tag's "⋯" menu changes its colour, stars it, copies its link or deletes it.

🎨 **A narrower What's new window.** It now has the same width as the search window, which makes it easier to read.

## 2.1.1

🐛 **The "Move to project" menu stays narrow.** A very long project or section name is cut with "…" and shown in full when you hover it.

## 2.1.0

🎨 **Easier to see what the app understood.** In the new task window, the date, project, tag, priority and duration it recognised are clearly highlighted, in light and dark.

🎨 **Settings say whether My week includes today.** The line reads "Includes today's tasks" or "Does not include today's tasks", so you know what ticking Today changes.

🎨 **Display only offers the tags of the page you are on.** No more long, cut-off list of every tag you own.

🐛 **The Inbox shows its sections.** Sections you create in the Inbox in Todoist appear in the app, and you can add, rename and fold them.

🐛 **"Move to project" works on tasks without a section.** Quick tasks and Inbox tasks now move, with the message and Undo.

🐛 **Tags with an emoji or an accent open their tasks.** A tag like 🏠Home showed 0 tasks. It now finds them, also after a reload.

## 2.0.0

🆕 **Choose how the app sits in the window.** In Settings, Appearance: a floating sidebar over a full page, or a floating page over the background, with a neutral background or a gradient from your colour. Cocoa and Graphite join the colours.

🆕 **Arrange the sidebar.** In Settings, Sidebar, tick what shows, drag entries into your order, hide search and counts, and order My projects and your workspaces. What you hide is still one ⌘K away.

🆕 **Choose what a task shows, and in what order.** In Display, "Show on each task" lists the details under a title. Click one to show or hide it, drag it or press Alt and an arrow to reorder, for every list.

🆕 **A setup for everyone, and a tour to follow it.** After the update, and for every new account, five short screens set the look, the sidebar and the task details. The last one offers a tour.

🆕 **Notifications from Todoist.** The bell shows what Todoist tells you and, beside it, the conflicts in your plan. Mark as read, and accept or decline invitations to shared projects.

🆕 **Share a project and assign tasks.** The project menu has Share…, to invite people by e-mail, see who has access and remove someone. In a shared project, tasks get an "Assigned to" field.

🆕 **A default view for each project.** Choose whether a project opens as a list or a board, and Todoist follows. File it under a parent project and pick from Todoist's twenty colours.

🆕 **Create a project without leaving the new task.** The project list ends with New project…, and you come back with it chosen.

🎨 **A calmer look all round.** Rounder corners, soft grey buttons, square check boxes, thin scrollbars that appear on hover, a sidebar that slides away and panels that float in the margin.

🎨 **Open a task as a window or a side panel.** Choose how a task opens in Settings, Lists. Its priority is now four soft pills.

🎨 **Lists in Todoist's order.** Groups fold from a caret with their count after the title, subtasks sit right under their task, and boards keep whole columns across the page.

🎨 **"I have time" is one list.** It follows the order you pick, shortest or highest priority first, and shows each due date.

🎨 **The page header says it in one line.** Estimated time turns orange from 95% of your capacity and red beyond it. Click it to see the tasks without an estimate.

🎨 **Dashboard and Logbook are two pages.** Pick Day, Week, Month, Quarter, Year or Custom. The Logbook groups by day, month, project or priority and adds up the time of each group.

🎨 **Settings in a new order.** Account, General, Appearance, Sidebar, Lists, Features and planning, Conflict detection, About.

🎨 **A new sign-in screen and a wider changelog.** The sign-in shows what the app is for. The changelog has a version picker and starts the tour from its foot.

🎨 **Reviews are easier to follow.** One segmented control in your colour, and steps joined by a line that fills up to where you are.

## 1.22.0

🆕 **A menu on every section.** Use a section's three-dot menu to rename, move, duplicate, copy its link, archive or delete it. Archiving offers Undo and deleting asks first.

🆕 **A parent's duration adds up its subtasks.** When every open subtask has a duration, their sum becomes the parent's, in the app and in Todoist, and stays up to date as subtasks change. If one has none, the parent keeps its own.

🎨 **Section counts sit next to the title.** The fold arrow is in the margin on the left, so titles stay lined up with tasks. A folded section stays folded after a reload on this device.

🎨 **Dragging over a section draws one line.** A single red line shows where the task will land, even in an empty section.

🐛 **My week follows the order of Todoist's Today.** At the same priority and date, tasks follow your sidebar's project order. Tasks you placed by hand stay put.

🐛 **"Add section" puts the cursor in its name.** Type straight away. Clicking twice no longer creates two sections.

🐛 **No lingering outline after closing a task with the mouse.** Keyboard users still see where focus came back.

## 1.21.0

🆕 **Checklists in a task's description.** Type `[]` or `- [ ]` to start one. Enter adds an item, an empty item ends the list, pasted lines become items. Tick the boxes in the task and Todoist's text updates, with a count of what is done.

🆕 **Rearrange the dashboard's cards.** Edit layout gives each card two arrows, for the mouse or the keyboard. Cards stay in their section, nothing is removed, and Reset puts them back.

🆕 **Choose how task chips are coloured.** Todoist inspired (the default), Inherited colours (date, project and tags in their Todoist colours), Neutral (grey) or Minimalist (title and description, with duration and date on the right). Also in Setup.

🆕 **Drag a subtask above or below its siblings.** In any list. Drag right to nest it under another task, left to promote it one level. Selected subtasks move together, with Undo.

🎨 **A quieter line under page titles.** Task count, time and "I have time" in one sentence. The duration turns amber from 90% of your capacity and red from 100%. Click it to see tasks without an estimate.

🎨 **A calmer, clearer dashboard.** Separate grey cards, each figure with its change (green for more, red for less), the period's dates by the title, and a quarter drawn month by month.

🎨 **Insights counts the last seven days.** Today and the six before it, every day drawn even when nothing was finished.

🎨 **Settings explain themselves.** Planning settings are grouped by what they do, capacity says it is time left after meetings and breaks, and small pictures show what the theme, colour and organisation choices do.

🎨 **Setup is five short screens.** Appearance, colour, density and chips, organisation, and where to store estimates, each with a preview. A custom colour code that is not a colour is refused without losing the last good one.

🎨 **Reviews show their steps joined.** A soft strip, the current step in bold, wrapping on narrow screens.

🎨 **The Quick group is renamed "Quick Tasks".** The group of short tasks at the top of your lists has a clearer name.

🐛 **The dashboard no longer freezes on a month, quarter or year.** It looped when the clocks go back in autumn. Days are now counted properly everywhere, and a failed read says so and offers Retry.

🐛 **Dragging several selected tasks into another task moves them all.** They become subtasks in the order you picked them. A drop that cannot work is refused before anything changes.

🐛 **A repeating task you tick no longer stays faded.** It could not be clicked in a list that keeps it.

🐛 **Formatting survives line breaks.** Bold continues on the next line, links end before the new paragraph, and web addresses work without "https://".

## 1.20.0

🆕 **Choose where estimates live.** In estimate tags, or in Todoist durations, which also update a timed task's calendar block. Free accounts use tags. If Todoist refuses a duration, the estimate is kept as a tag and you are told.

🆕 **Convert your estimates with a preview.** See what will change before converting open tasks and subtasks. The result reports anything that failed or is waiting for a connection.

🆕 **Settle differing estimates in Conflicts.** Choose the duration or the tag, with a warning before a calendar block changes.

🆕 **Estimate several tasks together.** Select tasks, open Estimate in the bottom bar and type 25, 1h15 or 90 min to give them all the same value, or clear them.

🐛 **Create a missing tag wherever you pick tags.** Search its name and choose Create, in a task, the composer or a selection.

🐛 **Click the page background to clear your selection.** No need to reach for Escape. Task rows, the selection bar and open dialogs keep their own clicks.

## 1.19.0

🆕 **"I have time" finds what fits.** Next to the load total, choose a duration to see the tasks that fit, on this page or across all projects, grouped by date. Nothing is changed.

🆕 **A "Gathering dust" group in Someday.** Review tasks parked for months with This week, Keep and Delete (Shift + K keeps the highlighted one). Choose the delay, from 1 to 12 months, in Settings.

🆕 **Quick tasks lead every list.** Projects, tags, the Inbox and Someday start with the quick tasks that are late, due today or undated, each saying where it comes from. A board starts with a blue Quick column. Settings can turn it off.

🆕 **A "Show me" button in What's new.** After an update, it tours only what the update brought, with a new stop for "I have time".

🆕 **A duration set in Todoist counts as the estimate.** Totals, the load pill, tasks without an estimate and Insights use it, even with no estimate tag.

## 1.18.0

🆕 **Paste a list to create several tasks.** Paste lines in the new task name field and confirm "Create the 3 tasks?". Each line is read on its own, so `(25)`, a date or `#Project` applies to that task.

🆕 **Give a new subtask an estimate.** End it with `(5)` or `(1h15)`, in the composer or when adding a subtask.

🎨 **The date menu starts with shortcuts.** Today, Tomorrow, Next week, This week and Someday first, then skip to the next occurrence and remove the date. The calendar opens only when you choose Pick a date.

🎨 **A completed task's box takes its priority colour.** Instead of green: red for P1, orange for P2, blue for P3 and grey for P4.

🎨 **A ring shows how far subtasks are done.** Next to "1/3", it fills as you go and turns green at the end.

🎨 **"Move all to today" is instant.** Behind schedule empties at once, and the message says how many moved, with Undo.

🐛 **A completed subtask shows as ticked in the task panel.** Its box stayed empty while its title was struck through. Both now say it is done.

## 1.17.1

🎨 **What's new opens after every update.** Biggest changes first: new things, then redesigns, then fixes.

🐛 **Insights counts every day of the period.** The day view showed nothing, the last day of each period was left out, and a day went missing between the parts of a quarter.

## 1.17.0

🆕 **Messages have a close button and go sooner.** Confirmations stay 3 seconds, errors 6 and Undo 8. Closing one keeps Undo available from the shortcut.

🆕 **Screen readers read the messages out.** Confirmations politely, Todoist refusals at once.

🎨 **Small text is a little bigger.** Tag chips, counts and small labels go from 11 to 12 pixels.

🐛 **"Tomorrow at 14:30" keeps its time.** In the composer, the task panel, a row's date menu and the bar for several tasks.

🐛 **Double-clicking "Add task" creates one task.** The new task window now accepts a single save at a time, from the button or the keyboard. Two tasks with the same name, typed on purpose, are still two tasks.

🐛 **A link in a title no longer sets a priority or repeat.** A link such as `example.com/p1` used to make the task P1, and one ending in `/daily` made it repeat. Links are now read as links.

🐛 **"14 juillet" is read as July.** "1er juillet" and "July 1st" work too, and "2 maisons" is no longer a date. 12/03 follows your date format.

🐛 **Save and Cancel under a title work with the keyboard.** Enter and Space now do what a click does, so you can edit a title without the mouse.

🐛 **Upcoming adds the new day by itself at midnight.** If you leave it open overnight, a task that has just come into range no longer stays hidden until you leave the page.

🐛 **Escape and Tab act on the dialog in front.** With two dialogs open, Escape closes only the top one and Tab stays inside it, instead of the task panel behind answering.

🐛 **Deleting a parent with its subtasks works cleanly.** Selecting a parent and its subtasks deletes the whole branch once, without a false "Todoist refused this", and Undo brings each task back once.

🐛 **A custom accent follows your device into dark mode.** When your device switches to dark with the app open, your accent colour adapts straight away instead of waiting for a reload.

🐛 **Names with an "@" and email addresses show as written.** An email address in a title or description no longer turns into "undefined" or a tag.

🐛 **The app opens even when your browser blocks storage.** If something crashes, a short message and a Reload button replace a white page.

🐛 **Offline changes never go to another account.** Changes made offline with one Todoist account are no longer sent to another account that signs in afterwards. You are told how many were left out.

🐛 **A change made just before closing the tab is no longer lost.** Switching app or closing the tab right after a change now keeps it in the copy stored on your device.

🐛 **A stalled connection no longer freezes syncing.** A download that stops halfway is now treated as a timeout, so the app retries instead of waiting forever.

🐛 **The demo moves a repeating task to its next date.** Ticking a daily task moves it by one day and keeps its time, and "every Monday" moves to the next Monday.

## 1.16.0

🆕 **A window tells you what changed after each update.** Shown once. Turn it off, or read every release, in Settings, About.

🆕 **Add a section from a board.** The dashed "Add section" column at the end creates one.

🆕 **A board as wide as the page, or full width.** Turn on Full width in Display to use the whole screen.

🎨 **A clearer new task window.** Title, description, then one line of small buttons for date, deadline, project, priority, estimate and tags. Empty ones read "+ Deadline". Subtasks get their own heading with a count.

🎨 **The same date picker everywhere.** Type a date, pick a shortcut or click a day, in the task menu, the selection bar, the composer and the panel.

🎨 **Dates, projects and tags in a title are easier to tell apart.** The highlights keep the normal space between words, so several in a row no longer blur together.

🎨 **Board card buttons appear inside the card.** Hovering a card shows its buttons in its top corner, lined up with the title, instead of sticking out.

🎨 **Every menu with a search field has the same one.** Moving a task, picking tags, a project or a date: the field at the top now looks and behaves the same everywhere.

🎨 **The number on Display counts only what you changed.** Filters, grouping and sorting, not switching between list and board.

🐛 **Opening a task no longer turns words in its title into a date, tag or priority.** A saved title such as "Daily review" stays plain text. Only what you type from then on is read.

🐛 **Typing @week creates one tag, not four.** The new task window used to save "w", "we", "wee" and "week". Now only the tag you end up with is saved.

🐛 **The review follows the task panel.** A task you complete or delete there leaves the step at once.

🐛 **Task menus on a short board or list are no longer cut off.** A task's date, move and more menus always open in full, using the whole page.

## 1.15.0

🆕 **Pick a date with the arrow keys.** Arrows move through the days, Page Up and Page Down change the month, Enter picks.

🆕 **Boards scroll a page of columns at a time.** No more half columns. Arrows above the board move a page, and dragging a card to the edge turns it for you.

🆕 **Group Upcoming by day, week or month.** Open Display on the Upcoming page and pick the grouping you want, in the list and on the board.

🆕 **Links open with a click.** In titles and descriptions: `[label](address)`, a full `https://` address or `site.fr`.

🆕 **Open a finished task from the Logbook.** Click it or press Enter. The arrows move through the Logbook.

🆕 **Go to the previous or next task without closing the panel.** Use the two small arrows at the top of the task panel, or J and K, to move through the list you came from.

🆕 **Drag several selected tasks at once.** ⌘-click to select, then drag: they move as a stack with a count, in the order you chose.

🎨 **Pick projects with a dot, an ampersand or an emoji in their name.** Long "project / section" names are cut short instead of pushing the window.

🎨 **Selected tasks next to each other look like one block.** Instead of a stack of separate pills, as in Things, so a selection is easier to read.

🐛 **The keyboard highlight and a selection look different.** An outline for the cursor, a coloured background for selected tasks.

## 1.14.0

🆕 **Shortcuts act on a whole selection.** With several tasks selected, 1 to 4 set all their priorities, ⇧T clears their dates, and T and V open Date and Move on the selection bar. Arrows pick, Enter confirms.

🆕 **Move the task under the cursor with ⌘↑ and ⌘↓.** It swaps places with its neighbour, even across sections, as if you had dropped it there. ⌥⌘↑ and ⌥⌘↓ send it straight to the top or the bottom.

🆕 **More Things shortcuts.** ⌘S opens the date menu, ⇧⌘M the move menu, ^] and ^[ push a date a day later or earlier (a week with ⇧), and ⌘/ shows or hides the sidebar.

🆕 **Extend a selection with Shift + ↑ and ↓.** Select from the task you started on to the cursor, and grow or shrink the range one step at a time, on top of anything you picked with ⌘-click.

🆕 **⌘A selects every task on the page.** Outside a text field, it picks every open task and opens the selection bar. Inside a field, it still selects the text.

🆕 **Copy a task's Todoist link from its menu.** It sits next to "Open in Todoist" and puts the task's address on your clipboard, ready to share.

🆕 **Copy a project's email address.** From the project menu. Anything you email to that address becomes a task in the project.

🆕 **Sign in from your own copy of the app.** If you host the app yourself, it can now sign in with Todoist, and says so clearly if a copy was built for another address. See "Self-hosting" in the README.

🎨 **Shortcuts act only on the task picked with the keyboard.** The shortcuts sheet said "the task under the cursor", which sounded like the mouse pointer. Hovering a task never acts on it, so typing a search is always safe.

🎨 **Changing the priority of a selection keeps it selected.** From the keys or from the bar, so you can chain another change on the same tasks.

🐛 **Signing in on a second browser no longer replays the first-run walkthrough.** Having been through it is now saved with your account.

🐛 **Grouping by project and sorting by priority keeps the sidebar's order.** The project holding a P1 used to jump to the top. Projects now follow the sidebar, and the sort applies inside each group.

🐛 **The keyboard cursor is no longer lost when a priority change re-sorts the list.** The next key used to open the search instead of acting on your task.

🐛 **Task menus no longer open past the edge of a short board.** Schedule and Move on the last cards of a board now fit inside it.

🐛 **Messages no longer cover the selection bar.** A confirmation now sits above the bar and any panel open on it.

## 1.13.0

🆕 **Sign in with one "Continue with Todoist" button.** Approve the app on Todoist's page instead of pasting a token, and manage it from Todoist's integrations. Access renews by itself, and the API token option is still there.

🆕 **Undoing a deletion brings back the very same task.** For 8 seconds after you delete a task, Undo restores it with its link, comments, reminders and assignee. Later, ⌘Z brings back a copy and says so.

🆕 **Drag, complete or undo a whole selection at once.** Dragging one selected task onto a project, section, day or tag carries them all. `E` completes the selection in one go, and a single ⌘Z reopens everything.

🎨 **Your settings travel in a comment on your Inbox.** They follow your account to every browser, now including accent, theme, density and each project's view, without ever counting as a task or showing up in search.

🎨 **The order you set in Todoist's apps shows here.** Tasks, sections, projects and tags now follow the order Todoist itself uses, so an arrangement made elsewhere looks the same in this app.

🎨 **Calmer Insights charts.** Charts use a neutral colour, and only your best day and best hour take your accent, so a good week no longer looks like an alert.

🎨 **Insights loads a year of history faster.** Completed tasks are fetched three months at a time, so a year takes five requests instead of nine.

🎨 **The connect screen says "API token".** It uses Todoist's own wording, and Behind schedule no longer has an "Add task" line, since a new task could never stay there.

🐛 **The bottom of long pages and of the sidebar is no longer cut off.** The last tasks and projects were hidden and only showed during a trackpad bounce.

🐛 **Changes made offline are no longer lost or duplicated.** Everything is sent in order after reconnecting, tasks, projects and sections created offline no longer appear twice, and subtasks follow their new parent.

🐛 **Adding a section works again.** Todoist started refusing empty names, so a new section is now called "Untitled section", with the name selected for typing over.

🐛 **Undo puts tasks back in their section and under their parent.** A quick ⌘Z after ticking a task now undoes that task, not whatever came before.

🐛 **Completing a repeating task no longer reloads your whole account.** Ticking or skipping a repeating task used to download everything again. The next date now arrives with the answer.

🐛 **Syncing can no longer stay stuck on "syncing".** A request that never answers is given up after 20 seconds and treated as being offline, instead of waiting for you to reload.

🐛 **Swipe buttons no longer peek out on a phone.** They used to show along the right edge of every row in the coloured groups.

## 1.12.1

🎨 **Settings are stored in your Inbox.** The app no longer creates a separate project for them. If one already exists, the next sync moves it to the Inbox.

## 1.12.0

🆕 **Your settings follow you to every device.** Change a choice on one device and the others pick it up, through your Todoist account.

🆕 **Edit several tasks at once, repeating ones included.** Each repeating task moves to its own next date, and one-off tasks are left alone. The date shortcuts stay visible before the full date picker.

🆕 **The first-run tour shows every feature, even on an empty account.** It now uses sample data, so folders, project icons, quick tasks, subtasks, estimates and the review are all shown.

🎨 **Choose one combined My week page, or Today and My week apart.** In Settings, pick a single page that holds today and the week, or two pages, one for the day and one for the week.

🎨 **A tidier Settings page and first-run screen.** The long page scrolls to its end, karma reads as progress, and the coffee prompt lives in Settings with a visible close button.

🎨 **Lists have the same width everywhere.** Projects, tags, views and the Matrix share one header width. Only boards and matrices may use more room.

🐛 **Completing or skipping a repeating task moves it to its next date.** Tasks no longer bounce from tomorrow back to today, duplicate or stay ticked and unclickable.

🐛 **⌘Backspace deletes tasks selected with ⌘-click.** It stopped working because ⌘-click kept focus in the wrong place.

🐛 **E completes every selected task.** It used to complete only the one with the keyboard cursor.

## 1.11.0

🆕 **A new, consistent icon set.** Every icon in the app now comes from one family, so buttons and menus look like they belong together.

🆕 **Give each project its own icon, from almost 300.** Search them from the create or edit sheet, with the keyboard or the mouse. Your choice is saved in Todoist, so it is real synced data, not something this browser remembers.

🆕 **Narrow a page to "My projects" or one workspace.** Today, Upcoming, Someday, Inbox, Tags, This week and the Matrix can each be limited to your personal projects or a single workspace.

🆕 **Show a project's completed tasks from Display.** They sink to the bottom of whichever group is active, such as a section or a priority column, instead of living in a list of their own.

🆕 **Skip a repeat from the task panel.** It was only in the row's menu. The date field of an open task now offers it too.

🎨 **Fix a subtask's text by clicking it.** In the new task window, click a subtask to correct a typo instead of deleting it and typing everything again.

🎨 **Completing a task in its open panel ticks it straight away.** The box fills and the title is struck through at once, as it already did in lists.

🎨 **Sort by date created, newest or oldest first.** These are now two separate choices, like the estimate sort's shortest and longest first.

🐛 **The date field no longer repeats "Today" beside the Today shortcut.** It now reads "Choose a date" instead of saying the same word twice.

## 1.10.0

🆕 **Rename or delete a subtask from its parent's panel.** Edit its name in place, cancel with Escape, or delete it after a confirmation, without leaving the parent task.

🎨 **Insights start with a summary against the previous period.** Four cards show completed tasks, tasks per day, estimated time and focus score with their change. Charts show only the period you picked and mark the busiest day and hour.

🎨 **A project that only holds other projects looks like a folder.** With sub-projects and no tasks of its own, it gets the folder icon and arrow of a Todoist folder, and its own page is still one click away.

🐛 **A nested project can be dragged to the first place under its parent.** Dropping it on the line above the first sibling now reorders it there, even when the pointer lands on the parent's row.

## 1.9.0

🆕 **An Eisenhower Matrix view.** Turn it on in Settings, then choose List or Matrix in Display. Decide which dates count as urgent and which priorities as important. By default, overdue and today, P1 and P2 lead. Your tasks are never changed.

🆕 **Search can find sections.** Turn it on in Settings. A section shows with its project, and choosing one opens the project and highlights it, even after a reload.

🎨 **Clearer Insights.** The dashboard shows completed tasks, the average per day and estimated time without repeating itself, with a day or month trend, time of day, project, priority, top tags and a full-year heatmap.

🐛 **Shift-click selects a range of tasks.** ⌘-click still toggles one task, and ⌘-Shift-click adds a range to what you already selected.

🐛 **Reordering and nesting projects in the sidebar is more precise.** A visible line shows where a project will land, and you can nest it by dragging right or promote it by dragging left.

## 1.8.1

🆕 **Move several tasks to a section.** The move panel for a selection now lists projects and sections like the one for a single task, searchable by either name, with one Undo for the whole move.

🎨 **The destination list stays compact.** Six rows show at a time, typing filters the list, and long names are cut instead of scrolling sideways.

🎨 **One "Add tag" control on the Tags page.** The duplicate button in the page header is gone, and the inline name field appears where the tag will land.

🐛 **The project picker in a task stays open.** It used to close by itself as soon as it opened, so you could not choose.

🐛 **Dates for several tasks accept typing right away.** Opening Date now focuses the date field, so what you type no longer falls through to the app search.

🐛 **Drag a tag to the very top of the Tags list.** There was no place to drop it above the first tag. Now there is, and every drop shows the same accent line.

## 1.8.0

🆕 **Type "tomorrow" or "12 April" in any date calendar.** Every calendar starts with the same field as a task row, so `next Sunday` works in the new task window, the task panel, the selection bar and Insights. Long project and tag lists filter as you type.

🆕 **Sort tasks by your Tags order.** A task with several tags uses the highest one in your Tags list, and untagged tasks come last. Grouping is different: a task with two tags appears under both.

🎨 **A project board follows the grouping you pick.** Choose scheduled, priority, tag, estimate or day, and those values become the columns. Adding in a column pre-fills its date, priority or tag.

🐛 **Tasks with the same priority keep a stable order.** Inside a project they keep your hand-made order, and across projects they follow the page's day order, so the list no longer reshuffles.

## 1.7.1

🆕 **Drag a project or a tag into Favourites.** Drop it on the section and it becomes a favourite. It was the first thing to try in a sidebar where dragging does everything else.

🆕 **Add a task straight from a column.** A column such as a priority column offers an "Add task" line that fills in whatever the column fixes: project, priority, date or tag.

🎨 **One look for the keyboard cursor and a picked row.** They were two different tints. There is now a single mark for "this row", mixed from your accent.

🎨 **On a phone, Display and Insights stay in the same place on every page.** They used to move depending on how long the title was.

🐛 **The keyboard highlight no longer disappears under the mouse.** Which one you saw depended on the order styles loaded in.

🐛 **Confirm a deletion with Enter or ⌘Enter.** Enter used to press Cancel, so a deletion could not be confirmed from the keyboard at all. ⌘Backspace over a selection now deletes the selection.

🐛 **"Add task" under Anytime this week creates a task for the week.** It used to open an empty composer, so the task went to Someday.

🐛 **The Display menu fits on a phone.** Half of it used to hang off the screen.

🐛 **Dragging a tag onto a project no longer pretends to work.** The project lit up as if the tag would be filed there, but a project cannot hold a tag.

## 1.7.0

🆕 **Do everything from the keyboard.** Arrows or J and K walk the tasks, Enter opens one, E finishes it, T schedules it, V moves it, X selects it, 1 to 4 set the priority, `.` opens the rest, and ⌘Backspace deletes it, after asking.

🆕 **Start typing and the search opens with your letter.** On a page with no task under the cursor, the first letter you type opens the search with that letter already in the field.

🆕 **Go to a page with G then a letter.** G then W for My week, T for Today, U for Upcoming, and so on. Press ? to see the whole list.

🆕 **Edit an open task with single keys.** P opens the project, T the start date, D the deadline, E the estimate, Y the priority and L the tags. Each letter shows faintly beside its property.

🆕 **Swipe a task aside on a phone.** The row slides to reveal its actions: estimate, schedule, move and the rest. Holding a row opens the same actions as a sheet with their names.

🆕 **Pick an estimate from a row of durations on a phone.** Five minutes to two hours in one tap, with a field below for anything else, so you rarely need the keyboard.

🎨 **Pages open sorted by priority.** A P1 no longer sits below three P4s. Projects open grouped by section, and a backlog or a tag page by project. Dropping a task somewhere makes the order manual again.

🎨 **The undo message says exactly what a drop did.** "Moved to Thursday", "Moved to #Website", "Became a subtask of Prepare the kick-off". Every drop used to read the same.

🎨 **Insights uses the app's own calendar to pick a range.** Days outside the range are drawn in grey instead of hidden.

🎨 **Someday is in the phone's navigation bar.** It used to be two taps away behind Browse.

🎨 **On a phone, first-run asks only light or dark.** The other choices were a page and a half of scrolling before you had seen a task. They are in Settings.

🐛 **Task menus open upwards when there is no room below.** The foot of a list is where the tasks you want to reschedule sit.

🐛 **A task completed in the daily review leaves the list.** It used to stay, marked, which made the review the one place where finishing a task looked different.

🐛 **Scrolling the sidebar with a finger no longer drags a project.** A drag now needs a held press with a finger, so a quick move is just a scroll.

🐛 **Connecting no longer leaves the app zoomed in on an iPhone.** Safari zooms in on small fields and does not zoom back.

🐛 **⌘Enter in the new task window creates the task once.** The name field and the sheet both answered the keystroke.

🐛 **Escape in a description or an estimate saves the edit.** It used to throw the edit away and close the task behind it.

## 1.6.0

🆕 **Drag a task a little to the right over another to make it a subtask.** An indented line shows where it will land. Todoist allows four levels, so a drop that would go deeper is refused.

🆕 **Drag a subtask out to the left to make it a task again.** The row's menu offers the same thing in words, for anyone who has not found the gesture.

🆕 **Drop a task onto a row to put it exactly there.** The position is saved in Todoist together with the new date or tag, including when you move between groups.

🆕 **"Add task" sits where the new task will appear.** At the end of a section, the top of a project, a board column, the Inbox, Someday or a tag page, and the line stays visible instead of showing only on hover.

🆕 **Choose a project and its section in one list.** Sections are indented under their project. The task panel has the same field, where a section could not be set at all.

🎨 **A board uses the whole width of the page.** Columns are between 272 and 420 pixels wide, so three sections fill a laptop screen instead of huddling on the left.

🎨 **The drag preview is a card.** What follows the pointer while you drag now looks like the task, not a wide line of plain text.

🎨 **The drag handle lines up with the checkbox.** A task with a description no longer holds its handle below its own title.

🐛 **Changing a task's project in the panel really moves it.** It used to move on screen and go back to its old project at the next sync.

🐛 **Sorting works on the Inbox, Someday and tag pages.** The sort control on these pages did nothing until now.

🐛 **The Display count and the Undo button are readable in dark mode.** They were white on near-white.

## 1.5.0

🆕 **Refuse a guessed repeat with one click.** If the app reads a word as a repeat rule and is wrong, click the mark or press Backspace against it, and the words turn back into plain text.

🆕 **Type #Project/Section to set both.** After the `/`, the list shows every section of that project, so you can say where in the project the task goes.

🆕 **Type "tomorrow 12:14", "demain matin" or "ce soir".** Morning is nine o'clock and evening is seven, like in Todoist, so the same words land on the same minute in both.

🆕 **Edit a title and the app reads it as you type.** Dates, repeats, projects, sections, tags, priorities and estimates are marked as you write and put into their fields when you save. Escape restores the title.

🆕 **Reorder subtasks by dragging them past each other.** In the task panel, drag a subtask up or down to put your subtasks in the order you want.

🎨 **Recognised words take the colour of what they name.** A project takes the project's colour, a tag the tag's, and a priority runs from P1 red to P4 grey. Dates and repeats wear your accent.

🎨 **Click back up through a task's parents.** The line above a subtask is now a set of links, one per parent and the project, instead of a dead end.

🎨 **A second project, priority or date in a name replaces the first.** A name carries one of each, so the last one you type counts. Tags are the exception: you can add several.

🐛 **A new subtask no longer jumps to the bottom.** It was created at the top of its parent's list, then moved when the sync answered.

🐛 **A dropped task lands where you aimed.** A hidden area behind the task panel could win a drop meant for a row inside it.

🐛 **A long description no longer shifts the panel when you click away.** The panel used to jump under your pointer.

## 1.4.0

🆕 **Move a task to a section by typing its name.** The move menu opens with the cursor in a field. Type part of the section's name or its project's, press Enter, and the first match takes the task.

🎨 **A project's own tasks come first, without a "No section" heading.** Tasks outside any section used to sit at the foot of the page under a heading nobody made. They now lead the page, as they do on a board.

🐛 **A task dropped on a project in the sidebar lands in that project.** Both ways of reading a sidebar row stayed open during a drag, so the drop went nowhere.

🐛 **Undoing a move from a task's menu puts the task back.** The undo only changed the screen and left the task where it had been sent in Todoist.

## 1.3.0

🆕 **Change more than the date of several tasks at once.** The bar at the foot of the window now has one button each for Date, Move, Tags and Priority, each opening a panel above the bar.

🆕 **Add or remove a tag on several tasks.** A tag carried by only some of the selection shows as a half tick. Ticking it adds the tag to the others, and clearing it takes the tag off all of them.

🆕 **Escape clears the selection.** An open dialog or menu catches Escape first, so it only clears the selection when nothing else is open.

🆕 **A discreet offer of a coffee.** One quiet sentence at the foot of a finished review and of Insights. It counts nothing and never shows up more often the longer you use the app.

🐛 **A dialog no longer pulls the cursor back to its first field.** Any refresh of the page behind it used to move your caret to the top while you typed.

🐛 **A sync no longer overwrites what you are typing.** The title, description and estimate fields now keep your draft while the cursor is in them.

## 1.2.1

🐛 **The app icon shows correctly.** The install icon was missing when an upload omitted the icons folder. Icons now live beside the favicon, so browsers can offer installation.

## 1.2.0

🆕 **A dark theme.** Choose Automatic, Light or Dark in Settings. Automatic follows your device and switches with it. Todoist's project and tag colours are lightened on a dark page so they stay readable.

🆕 **Choose the accent colour from nine, or pick your own.** A custom colour gets matching text, backgrounds and badges in light and dark. Overdue and P1 keep their red.

🆕 **Type a repeat like "every monday" in a name or in the task panel.** The new task window marks it, the panel's repeat line is now a field you can edit, and the schedule menu reads one too.

🆕 **A first-run screen asks about theme, colour and density.** Changes preview as you choose, then a short tour points out four controls. It is saved per account and reopens from Settings.

🆕 **The weekly review can send a task to Someday.** It only offered Today and This week, so "this is not happening this week" had nowhere to go.

🎨 **Appearance and the week layout are picked from pictures.** Like density already was, instead of reading option names.

🐛 **Giving a repeating task a plain date no longer ends its series.** Drag and drop, and "Move all to today", now move only the date and keep the repeat rule.

🐛 **The app icon is no longer cropped.** The system's own rounding was being applied on top of ours and left a visible ring.

🐛 **Installing the app finds its manifest.** It is now served with the right type, so browsers offer to install it.

## 1.1.1

🆕 **Today as a page of its own, next to My week.** My week still holds the whole week by default. A setting separates the two, with today left in the week or out of it.

🆕 **Rename the tag that means "anytime this week".** Boards that already use `this_week` no longer need to be relabelled to be read here.

🆕 **Undo with ⌘Z, long after the message has gone.** It reverses your last change, a move, a completion, a deletion or a drop. Deleted tasks are written back under new ids.

🆕 **Select several tasks with ⌘-click and act on all of them.** A bar at the foot of the window sends the selection to today, this week, Someday or a date, or deletes it, in one request with one Undo.

🆕 **Drag a project into another in the sidebar to nest it.** Drag right to put it inside the row under the pointer. The project menu moves it back out.

🆕 **Type a task's date in its schedule menu.** The menu opens with the cursor in a field, and what you type narrows a short list: "tom" offers tomorrow, "15" offers the next three fifteenths.

🆕 **Type an estimate in brackets in a task's name.** "Call Anne (25)" creates the task with an estimate of 25 minutes, with nothing else to fill in.

🆕 **Choose how dates are written in Settings.** For example 12 sept. 2026, sept. 12, 2026 or all numbers. Today and tomorrow are always named.

🆕 **Choose which week the weekly review looks at.** It opens on the week that has just ended while the new one is young, and arrows reach any other week.

🆕 **The weekly review closes the week, then opens the next one.** What you finished, what it came to, what is late and which projects went quiet, then mail, Inbox, Someday, next week's commitments and estimates.

🆕 **Both reviews end on your load.** The day's or the week's hours against the hours you said you have, with a way out for each task on the spot.

🆕 **Both reviews have a mail step before the Inbox.** A good part of the Inbox arrives as email. The step carries links to where your mail lives, since the app cannot see it.

🆕 **The daily review's last step can move tasks.** It offered no action, so a full day ended the review on a problem with nowhere to put it.

🆕 **Choose how long a project may go quiet before the review mentions it.** Fourteen days is the default, but you can adapt it to a fast or a slow project.

🎨 **"Things to settle" stands out when it holds something.** It used to look the same empty or with fourteen contradictions. Now it takes a line and a soft wash.

🎨 **A completed task fades out instead of vanishing.** Tick, grey text, then the row leaves a beat later, so a mis-click is easy to spot.

🎨 **Words recognised in a name have room around them.** The highlights line up with the text and the spaces between words keep their normal width.

🎨 **Board card buttons have an edge.** They were a white panel on a white card, which is nothing at all.

🎨 **A selected row is a grey panel wider than the row.** The checkbox sits inside it, and nothing moves when you pick a task.

🎨 **The line showing a project will be nested matches the row.** It has the same width and indentation the row will have.

🎨 **The review's progress rail only shows where you are.** It used to change meaning as you answered.

🎨 **The daily and weekly switch in the review stays put.** Switching used to move the button you had just pressed.

🐛 **Dates, projects and priorities typed in a name reach the fields below.** The dialog could show a task with one date and create another.

🐛 **Search finds pages such as Settings as you type.** The list of places was thrown away at the first keystroke.

🐛 **The "Show subtasks" switch works.** It was drawn, but nothing read it.

🐛 **Adding the app to an iPhone home screen shows its icon.** iOS does not read the web manifest, so it now has its own icon.

🐛 **"Things to settle" can fill in missing estimates.** It now holds the same batch editor as the page header.

🐛 **Filling in estimates in the review no longer moves rows under your cursor.** The list stays still while you type, and one button saves everything.

🐛 **The review no longer asks "Slipped" and "Behind schedule" separately.** They were the same question under two names.

🐛 **Giving a task a date from a row or a column removes its week tag.** The two together are a contradiction the app reports rather than keeps.

## 1.1.0

🆕 **A daily and weekly review, one question at a time.** Daily covers overdue work, the Inbox, weekly commitments, estimates and today's plan. Weekly adds completed work, totals, slipped tasks, quiet projects and Someday. Each answer updates Todoist.

🆕 **Project actions in the sidebar and on the project's page.** Add above or below, edit, favourite, duplicate, archive and delete, as in Todoist. A project can also be renamed from its own title.

🆕 **Drag projects to reorder them.** A project moves within its own list of siblings.

🆕 **Create tags from the Tags page, or by typing a new name after `@`.** A tag that does not exist yet is created on the spot, so you no longer need to visit Todoist first.

🆕 **Choose how roomy lists are.** Compact or comfortable, picked by looking at two pictures. Compact tightens the space around a row without removing anything.

🆕 **Browse, a fifth destination on the phone.** It holds what a phone has no room for: profile, search, tags, favourites and projects.

🆕 **The app's own date picker and select.** No more system list opening inside a sheet the app drew.

🆕 **Fill in a page's missing estimates in one pass.** Tab walks the column, the foot counts what is filled and what it adds up to, and one button saves everything.

🆕 **Feedback and coffee in the user menu.** The menu now holds the feedback form and the coffee link, and closes when you click away from it.

🎨 **Tags carry their colour onto the task row.** A tag's colour now shows on the tasks that carry it, so you can tell them apart at a glance.

🎨 **Insights loads a year of history faster.** It reads four windows at a time instead of one after another.

🐛 **Messages and Undo buttons appear on screen.** A leftover rule kept them invisible, so no error and no Undo had ever reached anyone.

🐛 **Adding a task from the new task window no longer fails silently.** Leaving the project picker alone sent an empty project, which Todoist refuses.

🐛 **A change Todoist refuses is reported to you.** The refused change is dropped instead of being sent again on every sync and blocking everything behind it.

🐛 **A plan-limit refusal no longer signs you out.** Todoist also answers with the same error when a plan's limits are reached, and the app took it for an expired sign-in.

🐛 **Projects nested under a project show in the sidebar.** Only folders showed their children before.

🐛 **A description with two links no longer shows raw HTML.** The underscore of one link tore both in half.

🐛 **The phone's navigation bar is back on screen.** It sat below the fold, behind the browser's own bars.

🐛 **The phone's navigation buttons work.** "Open navigation" opened My week, and "hide sidebar" did nothing.

🐛 **A new section or tag no longer appears twice.** Only tasks and projects had their placeholder cleared.

## 1.0.0

🆕 **Step through Insights periods with arrows.** This week, then the week before. Weeks start on your Todoist's first day and quarters are calendar quarters. Edit either date for a range of your own.

🆕 **Drag tags into a new order.** It is Todoist's own order, so your favourites in the sidebar follow it.

🆕 **A board with many columns scrolls sideways, with arrows.** When there are more columns than the screen can hold, the board scrolls and arrows above it move you along.

🆕 **Links to the app show a title, a description and a picture.** Share it in a message and it unfurls with a preview of My week.

🆕 **An About section in Settings.** The version, a note that this is not an official Todoist product, and links to the site, the code, this changelog and the coffee.

🎨 **The app is named "Enhanced for Todoist" everywhere.** This is the form Todoist's brand guidelines ask of third-party apps, with a clear statement that it is not affiliated with Todoist.

🎨 **The app has its own icon.** Three capsules of different heights on one baseline: a week read as the load it carries. It replaces Todoist's mark and its red in the browser.

🎨 **Quick means quick.** A task tagged quick but estimated at more than five minutes is left out of the Quick group. The tag is a claim, the estimate is the fact.

🎨 **The add-task line at the end of a section appears on hover.** It takes no room until then, and Behind schedule and Quick no longer end with an empty band.

🎨 **On a board, tasks outside any section are the first column.** Tasks that belong to no section are no longer hidden at the end: they open the board.

🎨 **Tags are listed one per row.** The Tags page lists each tag on its own line, which reads better than a grid.

🎨 **The Logbook grouped by priority starts with P1.** The most urgent group comes first, instead of an arbitrary order.

🎨 **Upcoming's board uses the same arrows as every other board.** The same arrows now page through the days, so every board behaves alike.

🐛 **My week as a board shows the same five groups as the list.** It showed one column holding the whole week.

🐛 **Profile photos are round in the sidebar.** A photo kept square corners under the round frame, and a portrait was squashed.

🐛 **The installed app icon keeps its rounded corners on a phone.** It now has a full-bleed version of its own.

🐛 **Behind schedule no longer accepts drops.** Dropping there dated the task today, which is not what the heading says.

## 0.9.0

🆕 **Drop a task on Quick to date it today and tag it quick.** Dragging a task onto the Quick group does both in one gesture.

🆕 **Board columns show their estimated time.** With how many tasks have no estimate and, for a day column, how full it is against that day's capacity.

🎨 **The Dashboard is a tab of Insights.** The separate page is gone, and an old link lands on the tab.

🎨 **Board columns use the same width as the list.** Columns no longer stretch wider than the rest of the page.

🎨 **Board tasks are cards.** They are laid out as cards instead of list rows.

🐛 **Finishing a drag no longer opens the dropped task.** The click a browser fires at the end of a drag was opening it.

## 0.8.1

🎨 **A project's description is always one line.** Hover it to open the full text, where links can be clicked.

🐛 **The capacity grid in Settings fits the page.** The fields where you enter your hours per day used to run off the edge.

🐛 **Page controls wrap under the title in a narrow column.** Buttons move onto their own line instead of overflowing.

🐛 **A chart with two dozen marks scrolls inside its card.** A long chart no longer runs off the page.

## 0.8.0

🆕 **Drag sections to reorder them, with their tasks.** The gaps between sections open up while you drag so you can hit them.

🆕 **Delete a section.** The confirmation says how many tasks go with it.

🎨 **A project with no description takes no space.** It used to leave a 52 pixel gap under the title.

🐛 **A new build takes effect on the next reload.** Fixes used to look unapplied until every tab was closed.

🐛 **A new section is created where you clicked.** It appears at the spot you chose, not at the bottom of the page.

🐛 **Dragging a task onto Today no longer lights up other sections.** Behind schedule and Quick used to light up as well, which made it unclear where the task would go.

## 0.7.0

🐛 **Drop targets in the sidebar work.** Two targets for the same place used to cancel each other out.

🐛 **Board columns are readable.** They had been squeezed to 157 pixels, which made titles unreadable.

🐛 **A section folds from its whole heading line.** Clicking anywhere along the heading folds it, not only on the words.

## 0.6.0

🆕 **Dates are read from the task name as you type.** `tomorrow`, `lundi`, `in 3 days` and `demain à 9h` are highlighted before you save. Switch it off in Settings. `#project`, `p1` and `@tag` always apply.

🆕 **Type subtasks in the new task window.** Add subtasks while you write the task, and they are created together with their parent.

🆕 **Use the keyboard in search.** Arrows move through the results and Enter opens one.

🆕 **Multi-select filters in the Logbook.** Pick several projects, tags or priorities at once.

🆕 **Upcoming shows four day columns at a time.** Arrows move you to the days before and after, so the page never feels cramped.

🎨 **The Insights dashboard follows the period.** A day shows the hours work happened in, a week or month adds the week's shape and a day-by-day comparison, a quarter reads by week and a year by month.

🎨 **Tags use a tag icon.** A flag looked like a priority, so tags now have their own icon.

🎨 **The drag preview sits beside the pointer.** What you are dragging no longer hides the cursor underneath it.

🐛 **Board columns wrap onto a second row.** Grouped by project or tag, most of the board used to be off screen.

🐛 **The tag picker no longer grows the dialog.** Opening it used to push the other fields out of view. It now opens within the dialog.

## 0.5.0

🆕 **Insights charts.** Project and priority rings, tasks per day, time of day, a tag ranking and a comparison with the previous period.

🆕 **A homepage setting.** Choose which page the app opens on, for example My week or Today.

🎨 **A new look.** A warm red palette, a pink-tinted sidebar and rounder controls.

🎨 **A cleaner sign-in screen.** With the privacy note between the field and the button.

🎨 **Settings is one page you scroll.** A menu beside it follows where you are, so you can jump to any group.

🎨 **Every select is drawn by the app.** Menus look the same on every device instead of using each system's own list.

🐛 **Hover controls no longer sit in the middle of a task row.** The buttons that appear on hover now sit at the end of the row, where you expect them.

🐛 **Dropping a task on Inbox, Upcoming or Someday works.** The task now moves there instead of snapping back.

🐛 **The estimate field has a unit.** It now says it counts minutes, so "25" is clearly 25 minutes.

## 0.1.0

🆕 **My week as your home.** The week is split into behind schedule, quick, today, scheduled today and anytime this week.

🆕 **Estimates as durations.** Stored as a label such as `est-25` and shown as time, with your workload and capacity worked out from them.

🆕 **Upcoming, Someday, the Inbox, project pages and tag pages.** The places your tasks live, each with its own page: what is coming, what is parked, what just arrived, and one page per project and tag.

🆕 **List, board and focus modes.** Look at the same tasks as a list, as columns on a board, or one at a time in focus mode.

🆕 **Drag and drop with one meaning per destination.** Dropping a task on a day, a project, a tag or a place in a list means one clear thing each time, and every drop can be undone.

🆕 **Insights, with a focus score.** See how many tasks you completed and when, with a score that says how focused your days were.

🆕 **Things to settle.** Missing estimates, and contradictions inside a task.

🆕 **Works offline.** From a copy kept on your device, with changes sent when you are back online.

🆕 **English and French.** The whole app is available in both languages, and follows your device by default.
