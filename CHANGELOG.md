# Changelog
The changelog marks every line with :
- 🆕 something the app did not do before,
- 🎨 something existing that has been redesigned or reworded
- 🐛 a bug or regression that was fixed

The app shows each release's lines in its "What's new" window, so they are
written for the people using it: say where the thing is (the page, the
button, the key), what it does for them, in plain words, and keep em dashes
out. The window opens once after an update for every release, whatever kinds
of lines it holds. Inside a release the app lists the lines by impact, new
things first, then redesigns, then fixes, so write them in the order you
want within each kind: the most visible, most frequent case first. The
French translation lives in CHANGELOG.fr.md.

## 2.0.0

A new look, a setup that shapes the sidebar and what a task shows, a Dashboard and a Logbook of their own, and the first steps towards working with others.

🆕 **Choose how the app sits in the window, and what is behind it.** Settings, Appearance, has two layouts (a floating sidebar over a full page, or a floating page over the background) and two backgrounds (neutral, or a gradient taken from your colour). The text of the sidebar stays readable on any colour. Todoist red is now called Todoist, and Cocoa and Graphite join the colours.

🆕 **Arrange the sidebar.** Settings, Sidebar, lets you tick what shows (Dashboard and Logbook are now entries of their own), drag the entries into the order you want, hide the search field and the task counts, and put “My projects” and your workspaces in the order you like. What you hide is still found with ⌘K.

🆕 **Choose what a task shows, and in what order.** In Display, “Show on each task” lists the details under a title (date, deadline, project, tags, estimate). Click one to show or hide it, drag it, or press Alt and an arrow key, to set the order for every list.

🆕 **A setup for everyone, and a tour to follow it.** After the update, and for every new account, five short screens set the look, the sidebar and the task details. The last one offers the tour, which now also points at the Dashboard, the matrix and the notifications.

🆕 **Notifications from Todoist.** The bell opens a window with what Todoist tells you and, beside it, the conflicts of your plan. Mark a notification or all of them as read, and accept or decline an invitation to a shared project. Not yet tried against a second Todoist account.

🆕 **Share a project and assign tasks.** The project menu has Share…, to invite people by e-mail, see who has access and remove someone. In a shared project, a task has an “Assigned to” field. Not yet tried against a second Todoist account.

🆕 **A default view for each project.** The project sheet asks whether it opens as a list or as a board, and tells Todoist too. It can also be filed under a parent project, with the twenty colours Todoist offers.

🆕 **Create a project without leaving the new task.** The project list of the composer ends with New project…, and you come back with it chosen.

🎨 **A calmer look all round.** Rounder corners, soft grey secondary buttons, square check boxes, thin scrollbars that show only when the pointer is on them, a sidebar that slides away, and panels that float in the margin of the page.

🎨 **Open a task as a window or as a side panel.** Settings, Lists, chooses. The priority is four soft pills, and the cross of a tag is centred.

🎨 **Lists, in the order Todoist shows them.** Groups fold from a caret on their left with their count after the title, sub-tasks sit right under their task and fold from their progress pill, and boards keep whole columns across the page.

🎨 **“I have time” is one list.** It follows the order you pick (shortest first, or priority first) and says each task’s due date, instead of grouping by day.

🎨 **The page header says it in one line.** The estimated time turns orange from 95 % of your capacity and red beyond it, and clicking it opens the tasks that have no estimate.

🎨 **Dashboard and Logbook are two pages.** One line of controls picks the span (Day, Week, Month, Quarter, Year or Custom, where the dates appear). The Logbook groups by day, month, project or priority, sorts by completion date or priority, and adds up the time of each group. The arrangement of the Dashboard cards can no longer be edited.

🎨 **Settings in a new order.** Account, General, Appearance, Sidebar, Lists, Features and planning, Conflict detection, About. The support card stays in view, and the week start is read from Todoist with a link to change it there.

🎨 **A new sign-in screen and a wider changelog.** The sign-in shows what the app is for beside the form. The changelog has a version picker, marks each line Feature, Design or Bug fixed, and starts the tour from its foot.

🎨 **Reviews.** The choices on a row are one segmented control filled with your colour, and the steps are joined by a line that fills up to the one you are on.

## 1.22.0

A menu on every section, durations that follow the subtasks, and My week in the same order as Todoist's Today.

🆕 **A menu on every section of a project.** The three dots at the right of a section's title replace the trash button and open Edit (the name is selected, ready to type over), Move to… (pick another project), Duplicate (a copy right below, with its open tasks and their subtasks), Copy section link, Archive and, apart at the bottom in red, Delete, which still asks first. Archiving hides the section and its tasks, with Undo in the message. The menu works with the keyboard: Enter or Space opens it, the arrows move, Esc closes it and puts you back on the button. The sections Behind schedule, Quick Tasks and the others built by the app keep their header.

🆕 **A parent's duration follows its subtasks.** When every open subtask of a task has a duration, their sum replaces the parent's own, in the app and in Todoist: the app writes it for you, and again when a subtask's duration changes or a subtask is added, ticked off, deleted or moved. If one open subtask has no duration, nothing changes and the parent keeps its own. Totals, I have time, the load and the insights count each task once, and the “parent and subtasks both have a duration” item no longer appears in Items to settle when the sum applies.

🎨 **Section titles show their count right after the title, with the fold arrow on the left.** The round count moved from the far right to just after the title, the arrow that folds a section is in the margin to the left of the title (so titles stay lined up with the tasks), and the grip to drag a section moved one step further left. A folded section stays folded after a reload on this device.

🎨 **Dragging a task over another section only draws the landing line.** The frame around the whole section is gone: one red line shows where the task will go, and over an empty section or below the last task it sits at the end of the section.

🐛 **My week follows the order of Todoist's Today.** At the same priority and the same date, tasks are now listed in the order of their projects in the sidebar (the Inbox first, a sub-project right after its parent) instead of the order they were added. A task you placed by hand still stays where you put it, and the other sorts are unchanged.

🐛 **Adding a section puts the cursor in its name.** Clicking Add section now selects “Untitled section” so you can type straight away, even when Todoist takes a moment to answer, and what you have typed is not lost when it does. Clicking twice in a row no longer creates two sections.

🐛 **A task or an Add a task button no longer stays outlined after you close its window with the mouse.** Keyboard users still see where the focus came back to.

## 1.21.0

Checklists in a task's description, a calmer, more finished look across Settings, Setup, the dashboard and the lists.

🆕 **Write checklists in a task’s description and tick them in place.** Lines like “- [ ] item” and “- [x] item” show as small checkboxes in the task panel, with “3 of 7” next to the description. Tick one and only that line changes; the rest of the description is left exactly as it was, so the same text still reads fine in Todoist. Editing is as in a note: Enter adds the next item, Enter on an empty one leaves the list, Backspace at its start makes it plain text, an × at the right removes it, and several pasted lines become several items. Typing [] or - [] and a space starts a list, in a task’s description and in the new task window. Rows in lists never show the checklist lines. Select words in a description to show its formatting toolbar; Link opens fields for the displayed text and address. Pasting an address over selected words makes them a link, and the next typing stays outside it. The composer keeps a plain field with Markdown and keyboard shortcuts.

🆕 **Rearrange the dashboard’s cards.** Edit layout on the dashboard gives every card two arrows to move it, with the mouse or the keyboard, each move announced to a screen reader. Cards stay in their own section, nothing is removed, and Reset to default puts them back. Your order is kept with your settings and survives changing the period.

🆕 **Choose how the chips on a task are coloured.** A new Task metadata colours choice in Settings and in Setup: Todoist inspired (the default, text without chips), Inherited colours draws the date, the project and each tag in the colour it has in Todoist, on a very light fill; Neutral keeps them grey. The duration is always grey, and an overdue date stays red. Minimalist keeps the title and description, with duration and date at the far right and recurrence beside the title.

🆕 **Drag a subtask above or below its siblings in any list.** My week, a tag or Someday now reorder subtasks the way a project already did: with the line showing where it will land, and nothing written when it is dropped back in place. The line follows the upper or lower half of the target row, and the task lands there. Dropping a child below its own parent puts it before the first sibling. Dropped between tasks at another level, it joins that level. Moving right nests it under the target; selected subtasks move together. Moving left promotes them one level. Parent changes offer Undo.

🎨 **Task metadata offers four layouts.** Todoist inspired keeps the published plain texts, Neutral and Inherited colours use light chips, and Minimalist puts duration and date at the far right. The recurrence badge is grey in Neutral and sits beside the title in Minimalist; the full action bar appears on hover before the date. A task in the Inbox now names it, and how many days late a task is has moved from the date to the screen-reader text.

🎨 **The line under a page’s title is one sentence.** Under the title of My week, a project or a tag: how many tasks, how long they take, and I have time, all on the left. The duration is plain text until 90% of your capacity, amber from 90%, red from 100%, and clicking it opens the tasks that have no estimate. The percentage and the unestimated count moved into its tooltip.

🎨 **The dashboard is quieter and clearer.** Separate grey cards, the figure and its change on one line with the label under it (green for more, red for less), the dates of the period beside the title, a quarter drawn month by month, and the quarter’s heatmap at half width. Layout controls sit at the top without increasing card height; circles and legends are centred in the space below the heading.

🎨 **The Insights panel counts the last seven days.** Today and the six days before it, every day drawn even when nothing was finished, a note saying which numbers belong to the page and which to every project, and the Estimate coverage card is gone.

🎨 **Settings explain themselves.** The planning settings are grouped by what they do, capacity comes after them and says it is time for tasks after meetings and breaks, with the total of your days and your own weekly value apart. Small pictures show what the theme, colour and organisation choices do, and a day that is not a duration is refused out loud.

🎨 **Setup is five short screens.** Appearance, colour, density and chip colours, organisation, and where to store estimates, each with a picture of the workspace above its choices. Custom colour is a card like the others, with the picker and the hex code below it, and a code that is not a colour is refused without losing the last good one.

🎨 **The daily and weekly reviews show their steps joined.** The steps sit side by side in a soft strip with a thin line between them, the current one in bold, and on a narrow screen the steps wrap so every one stays accessible.

🎨 **The Quick group is called Quick Tasks.**

🐛 **Switching the dashboard to a month, a quarter or a year no longer freezes it.** The page looped for ever over the 25-hour day when clocks go back (25 October in Europe). Days are now counted on the calendar everywhere, the streak and the weekly review included, which also fixes a day being skipped or counted twice around a clock change. A slow answer for a period you have left can no longer replace the one you chose, and a failed or offline read says so and offers Retry.

🐛 **Dragging several selected tasks inside another task moves them all.** They become subtasks in the order they were picked, a picked parent keeps its picked children, and a drop that would make a loop or go too deep is refused before anything is written. If Todoist refuses one move, none of them is left half moved.

🐛 **A repeating task you tick no longer stays faded and unclickable.** In a list that keeps it, such as a project, it came back looking ticked and could not be clicked.

🐛 **Formatting stays rich across line breaks.** Bold continues on the next line without showing Markdown markers; links end before the new paragraph. Link insertion also accepts web addresses without a scheme. Checklist is available in the selection toolbar.

## 1.20.0

Choose where estimates are stored and preview conversions between tags and Todoist durations.

🆕 **Choose tags or Todoist durations for estimates in Settings.** Tags remain the default and keep calendar blocks independent from estimates. Duration mode uses Todoist’s own field, removes estimate tags and changes the calendar block on timed tasks. Free accounts use tags because Todoist does not retain their durations. Every duration write is checked against Todoist; if it is refused or lost, the estimate is recovered as a tag and a message explains the change. Unknown account plans are allowed with the same check.

🆕 **Convert existing estimates with a preview in Settings.** The preview counts open tasks and subtasks, identifies timed tasks and lists skipped invalid tags, differing estimates and durations in days. Converting durations to tags preserves timed calendar blocks and clears untimed durations. Completed tasks and account labels are left alone. The result lists failed tasks or says when changes are waiting for a connection.

🆕 **Settle differing estimates in Conflicts when using durations.** Keep the duration and remove its estimate tag, or use the tag as the duration. The second choice warns when a calendar block will change. Totals and Insights use your selected source first and fall back to the other when needed. Existing accounts get a separate choice after the startup windows, and new accounts choose during setup.

🆕 **Estimate selected tasks together.** Select several tasks, open Estimate in the bottom bar and type minutes or hours such as 25, 1h15 or 90 min to apply one value to all of them, or remove their estimates. The chosen storage mode applies to the whole selection.

🐛 **Create a missing tag wherever you choose tags.** Search for its name and choose Create in task details, the composer or bulk selection to create and attach it. Display filters also offer creation.

🐛 **A click on the page background clears the task selection.** Task rows, bulk controls and open dialogs keep their own interactions.

## 1.19.0

A time filter for the minutes you have, a Gathering dust group in Someday, the Quick group on every list, and a tour of what an update brings.

🆕 **Do what fits in the time you have with the new “I have time” button.** A pill after the load figure on My week, projects, tags, the Inbox and Someday opens a panel on the right. Pick 5, 10, 15 or 30 minutes or an hour, or type any duration, and it lists the tasks that fit, grouped as overdue, today, tomorrow, this week and no date, each with its subtotal. Look in the page you are on or everywhere. A task with no estimate is never guessed at: the panel counts those and offers to estimate them. The page behind is left as it is, nothing is changed and nothing is remembered after a reload. Opening Insights closes it.

🆕 **Someday has a new “Gathering dust” group for tasks parked for months.** Tasks that have sat in Someday for 3 months or more are gathered at the top, under Quick, with how long ago they were added. Each one has three buttons: This week, Keep and Delete. Keep leaves the task in Someday and brings it back only after another full delay; that is remembered on this device only, and nothing is written to Todoist. Settings has a switch for the group and the delay (1, 2, 3, 6 or 12 months), counted from the day the task was created because Todoist does not say when it moved to Someday. ⇧K keeps the task under the cursor.

🆕 **Quick tasks now lead every project, tag, the Inbox and Someday.** Projects, tags, the Inbox and Someday now start with the quick tasks that are late, due today or have no date, and each row says which section or project it comes from. A quick task due tomorrow or later stays where it is, a task is never listed twice, and a board starts with a blue Quick column to look at, not to drop tasks on (on My week too, where dropping used to make a task quick). The Quick switch in Settings turns it off everywhere.

🆕 **A “Show me” button in What's new tours what an update brought.** What's new has a Show me button that runs the tour over only what the update brought, and the tour has a new stop for I have time.

🆕 **A duration set in Todoist now counts as the task's estimate.** A task with a duration in Todoist's own field is now counted in totals, the load pill, the list of tasks without an estimate and Insights, even with no estimate tag. When a task has both, the duration wins; a duration in days is ignored. The app still writes estimates as tags.

## 1.18.0

Paste a list to create several tasks, the date menu starts with shortcuts, subtasks show their progress, and moving everything late to today is instant.

🆕 **Paste a list to create several tasks.** Paste lines of text, with or without bullets, into the new task window's name field and it asks "Create the 3 tasks?" before making one separate task per line. Each line is read as a title on its own, so `(25)`, a date or `#Project` in a line applies to that task. Cancelling keeps what you pasted.

🆕 **Give a new subtask an estimate by ending it with (5) or (1h15).** End a subtask with its estimate in brackets, like `Draft outline (5)` or `Research (1h15)`, in the new task window or when adding a subtask to an open task, and the subtask is created with that estimate. The estimate is highlighted as you type, like in a task's name. Brackets that are not a duration, like `(maybe)`, stay in the title.

🎨 **The date menu starts with shortcuts.** Today, Tomorrow, Next week, This week and Someday come first, then Skip to next occurrence (with the date it goes to, when that is certain) and Remove the date, and the calendar opens only when you choose Pick a date. Escape or the back link returns to the shortcuts without changing anything. The same menu is used in a row, the new task window, the task panel and the bar for several tasks.

🎨 **A completed task's box is filled with its priority colour.** A completed task or subtask is filled with its priority's colour (grey for P4) instead of green.

🎨 **A ring next to “1/3” shows how far a task's subtasks are done.** Next to "1/3", a small ring fills as subtasks are done, in the lists and in the task panel, and turns green when all of them are.

🎨 **“Move all to today” empties Behind schedule instantly.** In My week, Behind schedule empties at once after you confirm, everything is sent in one go, and the message says how many tasks moved, with Undo.

🐛 **A completed subtask now shows as ticked in the task panel.** Its checkbox stayed empty while its title was struck through. Both now show it is done.

## 1.17.1

Insights counts the right days again, and the What's new window now opens after every update, with the most visible changes first.

🎨 **What's new now opens once after every update, with the biggest changes first.** It used to open only when a release had something new. Now every release opens it once, and its lines are listed from the most visible to the least: new things, then redesigns, then fixes.

🐛 **Insights now counts every day of the period you pick.** The day view showed nothing, the last day of every period was left out, and a day went missing between the parts of a quarter or a year. A task completed in the first hours of a period, in France before 2 in the morning, was also missed. Every day of the period you pick is now counted.

## 1.17.0

A round of fixes: the time you type with a date is kept, nothing is created twice, links stay links, and the app copes better with bad connections and blocked browsers.

🐛 **Typing a time with a date, like “tomorrow at 14:30”, now keeps the time.** Typing "tomorrow at 14:30" in a task's date now saves 14:30, in the new task window, the task panel, a row's date menu and the bar for several tasks. A deadline stays a day, and says so when you type a time in it.

🐛 **Double-clicking Add task no longer creates the task twice.** The new task window now accepts one save at a time, from the button or from the keyboard. Two tasks with the same name typed on purpose are still two tasks.

🐛 **A link in a task's name no longer sets its priority or repeat.** `https://example.com/p1` used to make the task P1, and a link ending in `/daily` made it repeat. Links are now read as links, and what you type beside them still works.

🐛 **Dates with a month name, like “14 juillet”, are now read correctly.** "14 juillet" is July (it was June), "1er juillet" and "July 1st" are understood, and words like "2 maisons" or "2 decks" are no longer taken for dates. A date such as 12/03 follows Settings, Date format.

🐛 **Save and Cancel under a task's title now work with Enter and Space.** Enter and Space now do what a click does.

🐛 **Upcoming adds the new day by itself when the clock passes midnight.** Left open overnight, it now gains the new last day by itself, so a task that just came into range no longer stays hidden until you leave the page.

🐛 **Escape and Tab now act on the dialog in front when two are open.** Escape now closes only the one in front, Tab goes round both buttons of a confirmation, and the task panel behind it no longer answers the keys.

🐛 **Deleting a parent task together with its subtasks now works cleanly, undo included.** Selecting a parent and its subtasks deletes the branch once, without a false "Todoist refused this", and a late undo brings each task back once.

🐛 **A custom accent colour now follows your device into dark mode without a reload.** When your device switches to dark with the app open, the accent's colours follow instead of waiting for a reload.

🐛 **A task name containing “@@link0@@”, or an email address, now shows as written.** It no longer turns into "undefined" in a title or a description, and an @ glued to a word, like the one in an email address, is no longer taken for a tag.

🐛 **The app now opens even when your browser blocks site storage.** It used to stay on "Loading…". If something crashes, a short message and a Reload button replace the white page.

🐛 **Changes made offline are no longer sent to a different account that signs in afterwards.** Changes made offline with one Todoist account are no longer sent to another account that signs in afterwards. You are told how many were left out.

🐛 **A change made just before closing the tab or switching app is no longer lost.** Switching app or closing the tab right after a change no longer loses it from the copy kept on your device.

🐛 **A slow or stalled connection no longer freezes syncing.** A download that stops halfway now counts as a timeout, and a long "retry after" from Todoist no longer freezes syncing.

🐛 **In the demo, completing a repeating task now moves it to its next date correctly.** Ticking a daily task moves it one day and keeps its time, and "every Monday" moves to the next Monday. A task typed with "every day at 3pm" shows Today 15:00.

🆕 **Messages at the bottom of the screen have a close button and disappear sooner.** Confirmations stay 3 seconds, errors 6, and the Undo window stays 8. Closing a toast keeps its Undo available with the undo shortcut.

🆕 **Screen readers now read out the messages at the bottom of the screen.** Confirmations are read politely, refusals from Todoist at once, and the Undo button says what it undoes.

🎨 **Small text in task lists, groups and the task panel is a little bigger.** Tag chips, group counts, board column counts and the small labels in the task panel go from 11 to 12 pixels.

## 1.16.0

After each update a short window tells you what changed, the new task window is easier to read, and picking a date looks the same everywhere.

🆕 **A window now tells you what changed after each update.** When a new version brings something new, a short window lists what changed, once. You can turn it off, and read every past release, in Settings, under About.

🆕 **Add a section straight from a board with its “Add section” column.** In a project's Board view, the dashed "Add section" column at the end creates a new section, the same one the list would.

🆕 **Choose between a board as wide as the page or full width in Display.** A board now stays as wide as the page header, like a list. Turn on Full width in Display to use the whole screen.

🎨 **The new task window is laid out more clearly: title, description, then one line of buttons.** The title comes first, with the description right under it. Then the date, deadline, project, priority, estimate and tags sit on one line of small buttons, and the empty ones show as "+ Deadline". Subtasks have their own heading with a count, and the buttons stay at the bottom.

🎨 **The same date picker now appears everywhere you choose a date.** A task's date menu, the bar for several selected tasks, the new task window and the task panel all show the same picker: type a date, pick Today, Tomorrow, Next week, This week or Someday, or click a day in the month.

🎨 **Dates, projects and tags you type in a title are easier to tell apart.** The highlights behind a date, a project or a tag you type keep the normal space between words, so several in a row no longer blur together.

🎨 **Hovering a board card now shows its buttons inside the card.** Hovering a card shows its buttons in its top corner, on the card itself and lined up with the title.

🎨 **Every menu with a search field now has the same one.** Moving a task, picking tags, a project or a date: the field at the top looks and behaves the same.

🎨 **The number on Display now counts only the filters, grouping and sorting you changed.** Its number goes up when you filter, group or sort a page differently from its defaults, not when you switch between list and board (or matrix and list).

🐛 **Opening a task no longer turns words in its saved title into a date, tag or priority.** A saved title like "Daily review" stays plain text. Only what you type from then on becomes a date, a tag or a priority.

🐛 **Typing @week in the new task window no longer creates a tag for each letter.** Typing "@week" in the new task window saved "w", "we", "wee" and "week". Now only the tag you end up with is saved.

🐛 **The review now follows changes made in the task panel.** A task you complete or delete from the panel leaves the review step straight away. The "No estimate" step now says which tasks it lists, and picks up a task you create in the meantime.

🐛 **A task's date, move and more menus on a short board or list are no longer cut off.** A task's date, move and more menus always open in full, using the whole page.

## 1.15.0

Dates and boards now work from the keyboard, links open, and you can go from one task to the next without closing it.

🆕 **Pick a date with the arrow keys wherever you choose one.** Wherever you choose a date (a task's date button, the bar that shows up when several tasks are selected, the new task window, the task panel), the arrow keys move through the days of the month. Page Up and Page Down change the month, and Enter picks the day.

🆕 **Boards scroll one full page of columns at a time, so no column is cut in half.** In Board view, the columns always fit the screen, so you never see half a column. The arrows above the board move a whole page. Drag a card to the edge of the board and it turns the page for you.

🆕 **Group Upcoming by day, week or month.** Open Display on the Upcoming page and pick the grouping you want, in the list and on the board.

🆕 **Links in a task's title or description now open with a click.** A link in a task's title or description opens with a click, whether it's written `[label](address)`, as a full `https://` address, or just `site.fr`. It keeps the colour of the text, underlined.

🆕 **Open a finished task from the Logbook in Insights.** In Insights, click a finished task in the Logbook (or press Enter) to open it in the task panel. The up and down arrows move through the Logbook too.

🆕 **Move to the previous or next task without closing the task panel.** Two small arrows at the top of the task panel (or J / K, ↑ / ↓) open the previous or next task of the list you came from, even after you've ticked off or moved some of them.

🆕 **Drag several selected tasks at once.** Select tasks with ⌘-click, then drag one of them: they move together as a stack with a count, and land in the order you selected them.

🎨 **Projects with a dot, an ampersand or an emoji in their name can now be picked in the new task window.** Picking a `#project` from the list always works, even with a dot, an ampersand or an emoji in its name. A long "project / section" is cut short instead of pushing the window sideways.

🎨 **Selected tasks next to each other now look like one block.** As in Things, instead of a stack of separate pills.

🐛 **The keyboard highlight and a selected task now look different.** The task the keyboard is on now has an outline, and a selected task has a coloured background, so you can see straight away when you unselect one.

## 1.14.0

The keyboard on a selection, links and email addresses to copy, menus that
fit on a board, sign-in on your own server, and automatic tests behind every
release.

🆕 **Task keys such as 1 to 4, ⇧T, T and V now act on a whole selection.** With the cursor inside a selection,
1–4 set every selected task's priority, ⇧T takes all their dates off, and T
and V open the bulk bar's Date and Move panels. In those panels ↑ ↓ walk the
choices, Enter picks and Esc closes, and the cursor comes back to the tasks.

🆕 **⌘↑ and ⌘↓ move the task under the cursor up or down, as in Things.** The task under the cursor takes
the place of the one above or below it, the same as dropping it there: at the
end of a section it goes on into the next one, in My week from Today into
Anytime this week, passing over the groups a drag cannot drop into (Behind
schedule, timed tasks). A sorted list switches to your own order, and the
cursor goes with the task. ⌥⌘↑ and ⌥⌘↓ send it to the top or the bottom.

🆕 **More Things shortcuts: ⌘S for the date, ⇧⌘M to move, ^] and ^[ to shift the date.** ⌘S opens the date menu and ⇧⌘M the move menu;
^] and ^[ push the date a day later or earlier (with ⇧, a week), on a whole
selection too, keeping the time and the repeat rule; ⌥↑ and ⌥↓ jump to the
first or last task, and ⌥⇧↑ / ⌥⇧↓ select up to there; ⌘/ shows or hides the
sidebar.

🆕 **Shift+↑ and Shift+↓ extend the selection from the keyboard.** From the task you started
on to the cursor, growing and shrinking with each step, on top of anything
already picked with Cmd+click.

🆕 **⌘A selects every task on the page.** Outside a text field, ⌘A (Ctrl+A)
picks every open task on the page in front and brings up the bulk-edit bar,
instead of selecting the page's text. Inside a field it still selects the
field's text.

🆕 **Copy a task's Todoist link from its menu.** Next to "Open in Todoist" in a task's menu: the task's
Todoist address, on the clipboard.

🆕 **Copy a project's email address, to turn emails into tasks in it.** In the project menu: anything emailed
to that address becomes a task in the project.

🆕 **Sign in with Todoist from a copy of the app that you host yourself.** A copy hosted elsewhere is built
with `PUBLIC_URL=https://your.domain/ npm run build`, and the file Todoist
reads to identify the app (`oauth/client.json`) then describes that copy. A
copy built for another address says so on its sign-in screen instead of ending
on Todoist's "Invalid redirect URI". See "Self-hosting" in the README.

🆕 **The app is now checked by automatic tests on every change.** Unit tests on the rules (estimates, conflicts, drops,
order keys, recurrence, the matrix, synced settings, the sync queue) and
journeys in a real browser on the demo. GitHub runs the tests and a build on
every push, and the journeys on every pull request.

🎨 **Task shortcuts now act only on the task picked with the keyboard, never the one under the mouse.** The shortcuts sheet
said "the task under the cursor", which reads as the mouse pointer; it now
says the task picked with the arrow keys. Hovering a task never acts on it,
so typing a search is always safe.

🎨 **Changing the priority of a selection keeps the tasks selected.** From the keys or from the bar, so
the next change can follow on the same tasks.

🎨 **The app's code is reorganised by area, with no change in behaviour.** No change in behaviour: one file per area
instead of one 2,300-line file.

🐛 **Signing in on a second browser no longer shows the first-run walkthrough again.** Having been through the
first run is now kept with the account's settings, so signing in elsewhere no
longer asks again.

🐛 **Grouping by project and sorting by priority no longer puts a project with a P1 ahead of the sidebar's order.** Grouped by project and sorted by priority,
the project holding a P1 jumped to the top. Projects now keep the sidebar's
order and sections their project's, and the sort applies inside each group.

🐛 **The keyboard cursor is no longer lost when a priority change re-sorts the list.** A priority that re-sorted the
list dropped the keyboard cursor, and the next key opened the search.

🐛 **A task's menus no longer open past the edge of a short board.** Schedule and Move on the last
cards of a board opened past its bottom edge (and past its left edge in the
first column). They now fit inside the board.

🐛 **Messages no longer cover the bar for several selected tasks.** A bulk action's toast now sits above
the bar and any panel open on it.

## 1.13.0

Sign in with Todoist, settings that follow you without a task in your Inbox,
a sturdier sync, and undo that really undoes.

🆕 **Connect with one “Continue with Todoist” button instead of pasting an API token.** Connecting no longer means finding and pasting
an API token: one button, Todoist's consent page, and back connected. The app
now appears in Todoist's integrations, where it can be removed. Access renews
itself every hour without asking again. The token route is still there,
folded under "Use an API token instead". No server is involved: the app
identifies itself with a small public file (`oauth/client.json`) and protects
the round trip with PKCE.

🆕 **Undoing a deletion now brings back the very same task, for 8 seconds.** A deleted task leaves the screen at
once, but the deletion is only sent when its toast goes, eight seconds later.
Undo inside that window gives back the very same task — its link, comments,
reminders and assignee. Undoing later (⌘Z reaches further back) brings back a
copy, now with its comments, duration and assignee, and says it is a copy.

🆕 **Dragging, completing or undoing a selection now acts on all of it at once.** Dragging one task of a
selection onto a project, section, day or tag carries the whole selection.
`E` on a selection completes it in one request, and a single ⌘Z reopens it
all.

🎨 **Your settings are now kept in a comment on your Inbox, not in a task.** They still
follow your account to every browser — now including the accent, the theme
and the density, and each project's list or board, grouping, sort, subtasks
and completed tasks — but no longer count in the Inbox, show in search or get
in the way of an empty Inbox. The old settings task is moved over and removed
automatically, and duplicate comments are cleaned up.

🎨 **Tasks, sections, projects and tags now keep the order set in Todoist's own apps.** Tasks, sections, projects and
tags sort by the key Todoist now writes, so an order set in Todoist's own apps
shows the same here. Moving a task, a section or placing a new project writes
one key instead of renumbering every neighbour.

🎨 **Insights charts use calmer colours.** Charts use a neutral data colour, and
only the best day and hour take the accent, so a good week no longer looks
like an alert.

🎨 **The connect screen says “API token”, as Todoist does, and Behind schedule has no “Add task” line.** The line was removed because a new task could never stay there.

🎨 **Insights loads a year of history in fewer requests.** Completed tasks are fetched three months at a time
instead of six weeks: a year takes five requests instead of nine.

🎨 **The app now only runs its own scripts and only talks to Todoist.** The site now tells the browser to run only
its own scripts and to talk only to Todoist, plus the usual hardening headers.
The theme is painted before the first frame by a small file rather than an
inline script. (Needs the new `.htaccess`.)

🐛 **The bottom of long pages and of the sidebar is no longer cut off.** The app's layout grew to the height of
the sidebar, and the bottom of every long page — and of the sidebar — was cut
off, only showing during the trackpad's bounce.

🐛 **Changes made offline are no longer lost or duplicated.** Changes past the hundredth in the offline queue
were silently dropped; everything is now sent, in order. Tasks, projects and
sections created offline no longer appear twice after reconnecting, and
subtasks follow their new parent. A batch Todoist partly refuses keeps what it
accepted and says how much was saved.

🐛 **Adding a section works again.** Todoist started refusing a section with
an empty name; a new one is now named "Untitled section", selected for typing
over.

🐛 **Undo now puts tasks back in their section and under their parent.** Undoing a bulk move puts tasks
back in their section and under their parent. A quick ⌘Z after ticking a task
undoes that task, not whatever came before.

🐛 **Completing or skipping a repeating task no longer reloads your whole account.** Ticking or skipping a recurring
task used to download the whole account again; the answer to the tick already
carries the next date.

🐛 **Syncing can no longer stay stuck on “syncing”.** A request that never answers is given up after 20
seconds (a minute for the first full read) and treated as being offline,
instead of leaving the app on "syncing" until a reload.

🐛 **Swipe buttons no longer show along the edge of rows on a phone.** The swipe buttons no longer peek out along the
right of every row in the coloured groups.

## 1.12.1

A small follow-up to simplify where the cross-device settings marker lives.

🎨 **Settings are now stored in your Inbox rather than in a separate project.** Enhanced no longer creates a
dedicated project for `* Enhanced for Todoist settings`. If the marker already
exists in another project, the next settings sync moves it to Inbox; an old
project left empty is not deleted automatically.

## 1.12.0

A safer recurring-task engine, cross-device settings, complete onboarding and
the interaction and layout fixes validated across issues 48–56.

🆕 **Your settings now follow your account to every device.** Enhanced reads its
preferences from a dedicated Todoist project when one exists, creates it when
needed, and updates the formatted settings task after every change without
putting it in Inbox or triggering Inbox automations.

🆕 **Editing several tasks at once now handles repeating tasks.** Mixed selections can advance
each recurring task to its own next occurrence while leaving one-off tasks
alone, with the date shortcuts kept visible before the full date picker.

🆕 **The first-run tour now shows every feature, even on an empty account.** The walkthrough always uses a safe demo
snapshot, so folders, project icons, quick tasks, subtasks, estimates and the
review are all shown even when the connected account does not contain them.

🎨 **Choose one combined My week page, or separate Today and My week pages.** Choose either one combined My
Week page or separate Today + My Week pages. The obsolete duplicated-today
variant migrates automatically.

🎨 **Settings and the first-run screen are tidier.** The long settings page scrolls to
its end, the account karma reads as progress, and the lighter coffee prompt
lives only in Settings with the maintainer's photo, a borderless card, clearer
copy and a visible close button.

🎨 **List pages now have the same width everywhere.** List headers keep the same width across
projects, tags, views and the Eisenhower Matrix; boards and matrices alone may
use the wider content area.

🐛 **Completing or skipping a repeating task now moves it to its next date.** Completing
or skipping now uses Todoist's recurrence-aware close operation and lets
Todoist calculate the next date, eliminating tasks that bounced from tomorrow
back to today or yesterday, duplicated, or remained checked and unclickable.

🐛 **⌘Backspace now deletes tasks selected with ⌘-click.** Cmd/Ctrl-click keeps
the selected row focused, restoring Cmd/Ctrl+Backspace without selecting page
text.

🐛 **E now completes every selected task, not only the focused one.** Pressing `E` with several
tasks selected completes every selected task instead of only the focused row.

## 1.11.0

A searchable icon for every project, a workspace filter wherever more than
one project is in view, and a handful of smaller fixes from testing on
localhost.

🆕 **The app has a new, consistent set of icons.** The hand-drawn glyph sprite is replaced by
the Lucide icon set (MIT, lucide.dev) behind the same `Icon` component —
nothing that used it had to change.

🆕 **Give each project its own icon, from close to 300.** Choose from close to 300
searchable icons instead of the default "#" marker, from either the create
or the edit sheet, with the keyboard as well as the mouse. The choice is
saved as a hidden marker on the end of the project's own description, so it
is real, synced Todoist data rather than something only this browser
remembers.

🆕 **Narrow any page that mixes projects to “My projects” or one workspace.**
Today, Upcoming, Someday, Inbox, Tags, This Week and the Eisenhower Matrix
can each be narrowed to "My projects" or to one added workspace. A single
project's own page never offers it — every task there already shares that
project's one workspace.

🆕 **Show a project's completed tasks from Display.** A Display toggle folds them back
into whichever grouping is already active — a section, a priority column —
sunk to the bottom of it, rather than pulled into a list of their own.

🆕 **Skip a repeating task's next occurrence from the task panel.** Was only
reachable from the row before; the task detail view's own date field offers
it too now.

🎨 **Fix a subtask's text in the new task window by clicking it.** Click a committed subtask in the composer
to fix a typo, instead of deleting it and retyping the whole thing.

🎨 **Completing a task in its open panel now ticks it straight away.** The checkbox
fills and the title strikes through immediately, the same as every list row
already did.

🎨 **Sort by date created, newest or oldest first.** Newest-first and
oldest-first are now two separate choices, the way the estimate sort's
shortest- and longest-first already were.

🐛 **A row's date field no longer repeats “Today” beside the Today shortcut.** Next to the Today /
Tomorrow / Next week shortcuts it now always reads as a plain "Choose a
date" instead of echoing the same relative name a second time.

## 1.10.0

A calmer Insights dashboard, faster subtask editing, and more reliable nested
project navigation.

🆕 **Rename or delete a subtask from its parent's task panel.** Rename a subtask inline, cancel
with Escape, or delete it with confirmation without leaving its parent task.

🎨 **Insights now start with a summary compared to the previous period.** Completed tasks, tasks per day,
completed estimated time, and focus score share a four-card summary with
previous-period changes. Activity charts show only the selected period and
identify the busiest day and hour. Project and tag breakdowns sit side by side
with matching donut spacing; the heatmap appears from a quarter onward.

🎨 **A project that only holds other projects now looks like a folder.** A project with children but no
tasks of its own uses the same folder marker and right-side disclosure as a
Todoist folder, while its project page remains accessible.

🐛 **Tasks starting with “* ” can no longer be completed.** The Todoist `* ` marker remains
in stored content but no longer appears in list titles; completion is also
guarded at the action level, not just by hiding the checkbox.

🐛 **A nested project can now be dragged to the first place under its parent.** Dropping a
child on the seam above its first sibling now reorders within that parent,
including when the pointer lands on the parent's row.

## 1.9.0

A configurable decision view, clearer Insights, and more dependable navigation
and ordering. Developed locally and reviewed in demo mode before release.

🆕 **A new optional Eisenhower Matrix view sorts tasks by urgency and importance.** Enable the optional sidebar view in Settings, then
choose List or Matrix in Display. The Display menu independently controls which
tasks are shown, which date or week buckets count as urgent, and which Todoist
priorities count as important. By default, overdue and today are urgent, P1/P2
are important, anytime-this-week remains visible but not urgent, and future
dates and the Someday backlog are hidden. Classification never edits a task.

🆕 **The search can now find sections, if you turn it on.** An optional setting includes accent-insensitive
section matches with their parent project. Choosing one opens and highlights
that section; the route survives a reload.

🎨 **Insights are laid out more clearly.** The dashboard presents completed tasks,
average tasks per day, and completed estimated time without repeating the same
headline. It adds a day/month trend choice where useful, time-of-day, project,
priority and focus, top tags, and a full-year activity heatmap with a legend.

🐛 **Shift-click now selects a range of tasks.** Command-click still
toggles individual tasks, while Command-Shift-click adds a range to the
existing selection.

🐛 **Reordering and nesting projects in the sidebar is more precise.** Project rows use
before/after insertion, rightward nesting and leftward outdenting. Reordering
stays within one sibling list and workspace, with a visible insertion line.
Section drops now read their insertion slots correctly.

## 1.8.1

A corrective pass over the task and bulk-edit pickers introduced in 1.8.0,
with consistent project, section, date and tag behaviour everywhere they
appear.

🆕 **Moving several tasks at once can now target a section.** Projects and their sections now share the
same searchable destination list used when moving a single task. A section can
be found by either its own name or its project's name, and moving several tasks
there is one change with one undo.

🎨 **The destination list for several tasks stays compact.** Six
rows are visible, further results remain reachable with a wheel or trackpad,
and typing filters the list. The panel has a stable width, hides its vertical
scrollbar and cannot drift sideways; long names are truncated rather than
creating horizontal scrolling.

🎨 **The Tags page has a single “Add tag” control.** The duplicate Add tag
button in the page header is gone, while the inline name field remains where
the new tag will appear. Bulk tag selection also drops its unnecessary helper
sentence.

🐛 **The project picker in a task no longer closes by itself.** Scrolling the selected option
into view was mistaken for a page scroll and immediately dismissed the
project picker. The picker now remains available for searching and choosing.

🐛 **Dates for several tasks accept typing as soon as you open them.** Opening Date now opens
and focuses the natural-language date field immediately, so typing no longer
falls through to the app-wide search.

🐛 **A tag can now be dragged to the very top of the Tags list.** A dedicated first
insertion point accepts a dragged tag, and every destination displays the same
accent line used for project reordering.

## 1.8.0

The controls now answer the keyboard wherever a value is chosen, and boards
show the grouping their Display menu promises.

🆕 **Type “tomorrow” or “12 April” in any date calendar, and a name to find a project or tag.** Every date calendar starts with the
same natural-language field used on a task row, so `tomorrow`, `next Sunday`
and `12 April` work in the composer, task panel, bulk bar and Insights. Long
project and section lists filter as you type. Tag pickers do the same, with
Enter toggling the first match without closing a multi-select list.

🆕 **Sort tasks by the order of your Tags list.** A task with several tags uses
the highest one in that list as its sort key, internal estimate labels do not
count, and untagged work stays at the end. Grouping is deliberately different:
a task with two tags remains visible under both of them.

🎨 **A project board now follows the grouping you pick.** The ordinary board still uses
sections. Choosing scheduled, priority, tag, estimate or day now makes those
values the columns instead, and adding in an unambiguous column pre-fills its
date, priority or tag.

🐛 **Tasks with the same priority now keep a stable order.** Inside one project
they retain its hand-made task order. Across projects they use the view's
global day order, then a stable creation/id fallback, rather than comparing
unrelated per-project positions.

## 1.7.1

A pass over what 1.7.0 got wrong, and the small things it made obvious.

🆕 **Drag a project or a tag into Favourites to add it.** Drop either on the section and
it becomes one. The sidebar teaches dragging all day — a project is reordered
by it and nested by it — so dragging one into the section it plainly belongs
in was the first thing to try and the one thing that did nothing. A project
and a tag are also carried under the pointer now, the way a task always was.

🆕 **Add a task directly from a column, such as a priority column.** A project
grouped by priority had no way to add a task at all, on the one page where
both halves of the answer are known. A column offers the line when its own
heading fixes something the composer can be opened with, and fills in exactly
that: a P2 column in a project fills the project and the priority, a P2 column
in My week fills the priority and nothing else.

🎨 **The keyboard cursor and a picked row now share one look.** They were a grey and an accent tint — two ideas rather than two ways
of saying one. There is one mark for "this row" now, mixed from whichever
accent is set.

🎨 **On a phone, Display and Insights now stay in the same place on every page.**
They used to sit beside the title when the title was short enough to allow it
and wrap to their own line when it was not, so their position depended on
which page you were on.

🐛 **The keyboard highlight no longer disappears when the mouse is over it.** Hover and the
cursor were written in different files at the same weight, so the one you saw
depended on the order the stylesheets happened to load in.

🐛 **A deletion can now be confirmed with Enter or ⌘Enter.** The confirming button asked
for the focus and did not get it, so Enter pressed Cancel — every time, with
no way through the dialog at all. Cmd+Enter now confirms wherever the focus
is, and Cmd+Backspace over a selection deletes the selection rather than the
one row under the cursor.

🐛 **“Add task” under Anytime this week now creates a task for the week.** It
opened an empty composer, so the task went to Someday — out of the section it
was added from. Quick had the same gap and forgot the tag it is defined by.

🐛 **The Display menu now fits on a phone screen.** 320px hung from the right edge of its
button is 320px going left, and half of it was off the screen.

🐛 **Dragging a tag onto a project no longer pretends to work.** A tag
carried over a project row lit up as though it would file itself there, and
there is no such thing as a tag on a project.

## 1.7.0

Every list opens in the order that answers "what now", the keyboard reaches
everything the mouse can, and a phone gets the two gestures it has instead of
a pointer.

🆕 **Move through, open, complete and delete tasks with the keyboard.** Arrows — or J and K —
walk the tasks of whatever page is open, Enter opens one, Escape gives the
cursor back. On the task under the cursor: E finishes it, T schedules it and
Shift+T takes the date off, V moves it, X adds it to the selection, 1 to 4 set
the priority, `.` opens the rest, and Cmd+Backspace deletes it — still asking
first, because deleting is the one thing that should never be one keystroke
away from done. The keys are Todoist's own, from Todoist's published list;
where Todoist has no equivalent, nothing was invented.

🆕 **Start typing on a page and the search opens with your letter.** Start typing on a page with no task under
the cursor and the search takes it, with the first letter already in the field.
The search already reaches projects, sections, tags and views, which makes it
the way to a project without a mouse. Letters are commands when the cursor is
on a task and text when it is not — one sentence covering every key.

🆕 **Go to a page with G then a letter, such as G then W for My week.** G then W, T, U, S, I, R, L, A, or a comma for
Settings. A prefix rather than a letter each, so the alphabet stays free for
typing. The sidebar says which key gets to a row once the pointer has rested on
it, and `?` shows the whole list.

🆕 **Edit an open task's properties with single keys: P, T, D, E, Y, L.** P opens the project, T the start
date, D the deadline, E the estimate, Y the priority, L the tags — each letter
shown, faintly, beside the property it opens. Tab stays inside the panel, the
overflow menu takes arrow keys, and Escape closes the innermost thing that is
open rather than the outermost.

🆕 **Swipe a task aside on a phone to see its actions.** The row slides and shows what hovering
would have shown on a desktop: estimate, schedule, move, and the rest. Holding
a row opens the same actions as a sheet with their names on. A phone has no
pointer to reveal anything with, and the answer until now had been to take the
controls away.

🆕 **Pick an estimate from a row of durations on a phone.** Five minutes to two
hours, with the field underneath for anything else — typing "45" on a phone
means opening a keyboard over half the screen to press two keys.

🎨 **Pages now open sorted by priority.** Manual order is whatever order things
were added in, which puts a p1 below three p4s on a page opened to decide what
to do next. Projects open grouped by their own sections, a backlog and a tag
page by project. Dropping a task into a place is what makes a view manual
again — and the order written down is the order that was on the screen, so the
page the sort leaves behind is the page you were looking at.

🎨 **The undo message now says exactly what a drop did.** "Moved to Thursday", "Moved to
#Website", "Became a subtask of Prepare the kick-off meeting". Every drop used
to read the same, which is no use at all when a drop landing a few pixels off
does something different from what was meant.

🎨 **Insights now uses the app's own calendar to pick a range.** The one control
the rest of the app refuses to use is gone from the last place it was hiding.
Days outside the range are drawn and greyed rather than hidden.

🎨 **Someday is now in the phone's navigation bar.** Browse was there and in the
bar at the top of every page; it stays at the top, and the slot it gives up
goes to a destination that was two taps away behind it.

🎨 **On a phone, the first-run screen now asks only light or dark.** Light or dark. Three grids
of cards at 375px is a page and a half of scrolling before anyone has seen a
task, and the other two choices are a pleasure to find later in Settings.

🐛 **A task's menus now open upwards when there is no room below.** The foot of a
list is where the work nobody has dealt with sits, which is exactly the work
you want to reschedule.

🐛 **A task completed in the daily review now leaves the list like anywhere else.** It was being kept and marked instead of going, which made the review
the one place where finishing a task looked like something else.

🐛 **Scrolling the sidebar with a finger no longer drags a project away.** A
drag starts on distance with a mouse and on time with a finger: move before the
press is held and it was a scroll.

🐛 **Connecting no longer leaves the app zoomed in on an iPhone.** Safari zooms the
page when a field smaller than 16px takes the caret, and does not zoom back.

🐛 **⌘Enter in the new task window no longer creates the task twice.** The name field answered
the keystroke and so did the sheet.

🐛 **Escape in a description or an estimate now saves the edit and leaves the field.** It no longer discards the edit and closes the task behind it.

## 1.6.0

Dragging a task says three things instead of one, a list can be put in the
order you want it in, and where a task lives is asked once.

🆕 **Drag a task a little to the right over another to make it a subtask.** Drag a row a little to the
right over another and an indented line says it will land inside it — the same
line, in the same place, that the sidebar draws when a project is about to go
inside another. Todoist keeps four levels of subtasks, so a row that would push
a task past that simply does not take the drop. Board cards are left alone:
they get dragged sideways all day and a drift to the right there means nothing.

🆕 **Drag a subtask out to the left to make it a task of its own again.** Drag a subtask out to the left and it becomes
a task of its own, where it already lives. The row's menu offers the same thing
in words, because a gesture nobody has been told about is not a way out of
anything.

🆕 **Drop a task onto a row to put it exactly there.** Drop a task
straight onto a row and it takes that row's place. In a project and in the
Inbox that is Todoist's own numbering inside a project. In My week, Upcoming,
a tag page and Un jour — lists drawn from every project at once, where that
numbering cannot say anything — it is `day_order`, the number Todoist keeps for
exactly those lists and reads in its own Today view. Either way the order is in
Todoist, not in a corner of this app that only this browser can see. A task
dragged into a list from another group gets both things at once: the day, or
the tag, and the place in it.

🆕 **“Add task” now sits where the new task will appear.** At the end of every
section, at the top of a project above its first section, at the foot of every
board column, and on the Inbox, Un jour and tag pages. It used to appear only
under the pointer, at the same moment as the "add section" line below it, so
the two traded places as you moved. A column offers it when the column is a
place: a project column adds to that project, a tag column adds with that tag.
On a tag page it opens with the tag already on.

🆕 **Choose a project and its section in one list when creating a task.** Creating a task asked
for a project and then grew a second field for a section belonging to it — two
decisions for one question. One list now, sections indented under the project
they are in, exactly as the row's move menu has always shown them. The task
panel has the same field, where the section could not be set at all.

🎨 **A board now uses the whole width of the page.** It used to stop at the width a
paragraph is read in and scroll sideways with empty space on both sides. The
columns take their share of it too, between 272 and 420 pixels, so three
sections fill a laptop instead of huddling on the left. What is read above the
board — the title, the figures, the controls — keeps the measure and the
position it has on every other page.

🎨 **The preview under the pointer while dragging is now a card.** It had no style of its
own at all: sixteen-pixel text as wide as the page, floating on nothing.

🎨 **The drag handle now lines up with the checkbox.** A task with a description no longer holds its handle
somewhere below its own title.

🐛 **Changing a task's project in the task panel now really moves it.** Its project picker wrote
`project_id` through `item_update`, which takes neither a project nor a section
— only `item_move` does. The task moved on screen and stayed where it was on
Todoist until the next sync put it back. A move now settles what it does not
carry: a task sent to a project leaves the section it was in, a task sent to a
section joins that section's project.

🐛 **Sorting now works on the Inbox, Someday and tag pages.**
Those pages are drawn without the part of the app that sorts, so the control in
their Display menu had never once changed the order of anything.

🐛 **The count on Display and the Undo button can now be read in dark mode.** It was white
on `--text`, which is nearly white there. So was the toast, undo button
included — the one thing in the app you have to be able to read in a hurry.

## 1.5.0

Reading a task's name: a guess you can turn down, an hour you can name, and a
title that does all of it too.

🆕 **Refuse a repeat rule the app guessed in a task's name, with one click.** "Weekly review
tous les lundi" had its first word read as a repeat rule — a fair guess and
the wrong one, and until now the only way to say so was to rename the task
until the parser stopped seeing it. Clicking a mark, or pressing Backspace
against it, turns those words back into ordinary text and takes the value out
of the field it had filled; clicking them again brings the reading back. It
refuses that one occurrence and no other, so "Weekly review weekly" can keep
its title and still repeat.

🆕 **Type #Project/Section in a name to set both.** `#Project/Section`
fills both, and typing `/` after a project turns the list into that project's
sections — all of them, whether or not their names have anything to do with
what was typed, because naming the project is asking to be shown where inside
it the task could go.

🆕 **Type a time as “tomorrow 12:14”, “demain matin” or “ce soir”.** "demain 12:14" is tomorrow at
12:14; "demain matin" is nine, "demain soir" is seven, and "ce soir" is today
at seven. The hours are Todoist's own, so the same words typed here and there
land on the same minute.

🆕 **Editing a task's title recognises dates, projects, tags and estimates as you type.** Editing it recognises a
date, a repeat, a project, a section, a tag, a priority and an estimate, marks
them as you type, and writes them to their fields when the title is saved —
with Enter, or with the Save beside it. Escape puts the title back.

🆕 **Put subtasks in order by dragging them past each other in the task panel.**

🎨 **Recognised words in a title take the colour of what they name.** A project's is
the project's colour, a tag's is the tag's, a priority's runs from P1 red to P4
grey. A date and a repeat wear the accent, because those two are guesses about
prose rather than something written on purpose — and they are the ones usually
worth refusing.

🎨 **The line above a task now lets you click back up through its parents.** A subtask used
to be a dead end: the panel named its project and said nothing about the task
it belongs to, so closing was the only way back. Every ancestor is a link now,
the project included.

🎨 **Typing a second project, priority or date in a name replaces the first.** A name carries one project, one
priority, one day: two of any of them is somebody changing their mind, so the
last one typed is the one that counts, and refusing it hands the reading back
to the one before. Tags are the exception — a task can carry several, so every
one of them is marked.

🐛 **A new subtask no longer jumps to the bottom after it is created.** It was created at the
top of its parent's list and jumped to the bottom when the sync answered.

🐛 **A dropped task no longer lands somewhere other than where you aimed.** Four different things are dragged in
this app and they all shared one context, so a region of the page behind the
task panel could win a drop meant for a row inside it. Each drag is now only
offered what it could possibly mean.

🐛 **A long description no longer shifts the panel when you click away.** It was a fixed box that scrolled
while the rendered text below it was as tall as it needed to be, so clicking
away from a long description opened the panel under the pointer.

## 1.4.0

Sending a task where it belongs: a section by name, a project by drag, and the
project's own tasks where you left them.

🆕 **Move a task to a project's section from the move menu, by typing its name.** The move menu
opened on a list of projects and nothing else, so a task that belonged in
"Site vitrine / In review" took a move and then a drag down the page. Sections
are destinations now, and the menu opens with the caret in a field: type any
part of the section's name or its project's, press Enter, and the first match
takes it. Choosing the project itself means the project with no section, which
is how a task comes back out of one.

🎨 **A project's own tasks now come first, without a “No section” heading.** Tasks in no
section were collected at the foot of the page under "No section" — a
container nobody made, holding the loose, recent work where nobody looks. They
lead the page now, above the sections and unlabelled, which is how the board
has always shown them.

🐛 **A task dropped on a project in the sidebar now lands in that project.** A sidebar
row is two things at once, somewhere to file a task and a position in a list,
and both readings stayed open during every drag: a task let go over a project
hit whichever one the collision happened to return first, drew the bar that
belongs to reordering, and went nowhere. Each reading now stands down for the
drag it has no answer for, so a project still reorders and a task still lands.

🐛 **Undoing a move from a task's menu now puts the task back.** The undo was
sent as an update, which carries neither a project nor a section, so it put the
task back on screen and left it where it had been sent on the server. It is
sent as a move now. The same menu also sent a section and a project together
to an API that takes exactly one destination.

## 1.3.0

Editing a selection by more than its date, a caret that stays where it was
put, and one quiet line about the coffee.

🆕 **Change more than the date of several selected tasks at once.** The bar at the foot of the
window offered today, this week, someday and a date, which meant that taking
one tag off fifteen tasks was fifteen tasks opened one at a time. It carries
one button per property now — Date, Move, Tags, Priority — each with its icon
and its name, each opening its panel above the bar rather than below it, where
the foot of the window is. Every change is still one request and one undo.

🆕 **Add or remove a tag on several tasks at once.** A tag carried by some of
the selection shows as a half-tick rather than as "no": ticking it puts the
tag on the ones that are missing it, and clearing it takes the tag off all of
them. The selection survives a tag change, because dropping two tags is one
job; a move or a priority ends it.

🆕 **Escape now clears the selection.** A dialog and an open menu both stop
the key where they are, so it reaches the selection only when the selection is
the outermost thing left to dismiss.

🆕 **A discreet line offering a coffee appears after a review and in Insights.** Faint, small, one
sentence and an offer, at the foot of a finished review and at the foot of
Insights. It counts nothing, no milestone triggers it, and it does not appear
more often the longer the app is used.

🐛 **A dialog no longer pulls the cursor back to its first field.** Every caller passes a fresh
callback to the dialog shell on every render, and that callback sat in the
effect's dependency list — so any render of the page behind a dialog tore the
effect down and set it up again, handing focus back and then moving it to the
top of the sheet. One sync poll was enough. Typing a description, the caret
left mid-word; filling in Things to settle, it landed back in the first
estimate and the rest of the number went there.

🐛 **A sync no longer overwrites what you are typing.** The title, the
description and the estimate all re-seed themselves from the task. They now
refuse to do it while they hold the caret, so an update arriving mid-sentence
cannot replace a draft with the stored text.

## 1.2.1

🐛 **The app icon is now shown correctly.** 1.2.0 drew the icons correctly and put them in
`icons/`, and that folder has now been dropped by an upload twice — the second
time leaving a directory on the server that Apache could no longer read into,
so re-uploading could not repair it. Every icon still answered 404, so browsers
still refused to offer the install and an installed copy still had no icon of
its own. They live at the root of the site now, beside `favicon.svg` and
`og-image.png`, which have never once failed to arrive. Delete the old `icons/`
folder from the server; nothing points at it any more.

## 1.2.0

Dark mode, a colour of your own, and recurring dates the app can finally
read as well as show.

🆕 **A dark theme, set to follow your device by default.** Appearance sits under General and offers Automatic,
Light and Dark. It follows the device by default and switches along with it
mid-session, and the choice is remembered so the page never opens in the
wrong theme. Todoist's own project and tag colours are lightened on a dark
page rather than left at the 2:1 several of them fall to, so a board stays
recognisable in both.

🆕 **Choose the app's accent colour from nine, or pick your own.** Nine accents — red, orange, amber, green, teal,
blue, indigo, purple, pink — and a tenth you pick yourself, shown as ten
small windows onto the app rather than ten colour names. A theme is nine
tokens rather than one hue, so a custom colour is put through the same
recipe the presets are generated by: the ink is walked up or down until it
clears the page, the wash and the badge. A custom colour cannot come out
illegible. Overdue and priority one stay red under every accent, because
they are states rather than the brand.

🆕 **Type a repeat like “every monday” in a task's name or in the task panel.** Typing "appeler Marc every monday"
made a task called "appeler Marc every monday" with no date at all. The
composer marks a repeat rule now, the task panel's Récurrence line is a
field instead of a value you could see and not change, and the schedule
menu's date field reads one too. The grammar follows the list Todoist
publishes, in both languages, and refuses what it cannot vouch for rather
than guessing.

🆕 **A first-run screen asks about theme, colour and density once.** Connecting an account for the first time — or
opening the demo — asks three questions on one page: light or dark, which
colour, how much room a task gets. Each answer applies to the page behind
the dialog as you make it. It is then followed by a short tour that lights
up four things in the app itself rather than describing them. It is
remembered per Todoist account rather than per browser, so disconnecting and
reconnecting does not ask again, and Settings has a "Run it again".

🆕 **The daily review's week step can now send a task to Someday.** It offered Today and This
week, so the one thing you sometimes want to say — this is not happening
this week — had nowhere to go.

🎨 **Appearance and the week layout are now picked from pictures, as density already was.** The settings that open into a panel of cards no longer sit
flush against the next setting's label.

🐛 **Giving a repeating task a plain date no longer ends its series.** `due.string` is what
Todoist treats as the truth, and four paths were writing a date into it
while leaving the task marked as repeating — including drag and drop, and
"Tout passer à aujourd'hui". They all put the rule back unchanged now and
move only the date. The time of day survives the schedule menu too.

🐛 **The app icon is no longer cropped.** The 192 and 512 had their corners cut to transparency
with rounding already baked in, while being declared as icons shown whole —
so every surface that applies its own shape rounded them twice and left the
app's own corners inside the system's as a visible ring. All five are
full-bleed opaque squares now, drawn by `npm run icons`, and the maskable
pair is drawn small enough to clear an adaptive mask properly.

🐛 **Installing the app on a phone or desktop now finds its manifest.** It is served with the right media type through an `.htaccess` that ships with the build; it had no `Content-Type` header at all.

## 1.1.1

Everything reported after 1.1 went out, in three rounds of it.

🆕 **Show Today as a page of its own, next to My week.** My week still holds the whole week
by default, because deciding what today is means seeing what the week still
owes; a setting separates the two for anyone who would rather keep a page for
the day, with today left out of the week or still inside it.

🆕 **Rename the tag that means “anytime this week”.** Boards that
already say `this_week` no longer have to be relabelled to be read here.

🆕 **Undo with ⌘Z, long after the message has gone.** Cmd+Z (Ctrl+Z) reverses the last change — a
move, a completion, a deletion, a drop — not only while its toast is on
screen. A deleted task and its subtasks are written back; they return under
new ids, which is the one thing Todoist gives no way to preserve.

🆕 **Select several tasks with ⌘-click and act on all of them.** Cmd+click (Ctrl+click) picks rows out, and a
bar at the foot of the window sends the lot to today, to this week, to
Someday or to a date, or deletes them — one request, one undo.

🆕 **Drag a project into another in the sidebar to nest it.** Drag one to the right to put it inside
the row under the pointer, or onto a folder, where no sideways gesture is
needed because holding projects is the whole of what a folder is. The project
menu moves one back out.

🆕 **Type a task's date in its schedule menu.** Its schedule menu opens on a field with
the caret already in it, and what you type narrows a short list underneath:
"to" offers today and tomorrow, "tom" only one of them, and a bare "15"
offers the next three fifteenths with the weekday each falls on. A calendar
sits under the three shortcuts for the dates easier to point at than to name.

🆕 **Type an estimate in brackets in a task's name.** "Call Anne (25)" sets 25 minutes.

🆕 **Choose how dates are written in Settings:** 12 sept. 2026, sept. 12, 2026, 2026 sept. 12, or all numbers. Today and tomorrow are always named rather than dated,
wherever a date is shown.

🆕 **Choose which week the weekly review looks at.** It read the week in
progress and nothing else, which only works for somebody doing it on a Sunday
night; done on a Monday it read a week two hours old. It opens on the week
that has just ended while the new one is young, and arrows reach the ones
before.

🆕 **The weekly review closes the week, then opens the next one.** It covers what
you finished, what it came to, what is late, which projects went quiet — then
mail, inbox, Someday, this week's commitments, estimates, and what the week
weighs. It used to end on Someday, the longest and least engaging list in the
app, placed exactly where people stop, and then claim the next week was ready
when nothing had set it up.

🆕 **Both reviews end on your load.** It is the idea the whole product is built on and the one thing the ritual never mentioned: the day's
hours or the week's, against the hours you said you have, with each task
offering a way out on the spot.

🆕 **Both reviews have a mail step before the Inbox.** It comes first because a
good part of what is sitting in the inbox arrived as an email and filing the
inbox first files half of it. It claims nothing it cannot know — this app
cannot see your mail — and carries links to where the mail actually is.

🆕 **The daily review's last step can now move tasks.** It
offered no action at all, so a day that was already full ended the review on
a problem with nowhere to put it.

🆕 **Choose how long a project may go quiet before the review mentions it.** Fourteen days is a fair
default and a poor constant: on a fast board it is permanent noise, on a slow
one the warning never comes.

🎨 **“Things to settle” now stands out when it holds something.** It was an icon with a dot on it,
equally quiet whether it held nothing or fourteen contradictions. When there
is something in it, it takes a line and the wash the Behind schedule section
uses — read at rest, without competing with Add task.

🎨 **A completed task now fades out instead of vanishing under the pointer.** Vanishing at once had made a mis-click indistinguishable from a correct one. The tick
lands, the text greys, and the row leaves a beat later.

🎨 **Words recognised in a task's name now have room around them.** It is taken as
padding and given back as a negative margin so the marks line up with the
text in front of them and the ordinary spaces of the sentence keep their
ordinary width.

🎨 **The buttons over a board card now have an edge, so they can be seen.** They were a
white panel on a white card, which is nothing at all.

🎨 **A selected row is now a grey panel wider than the row,** so the checkbox
sits inside it rather than on its edge, and nothing on the row moves when it
is picked.

🎨 **The line that shows a project will be nested now matches the nested row.** It has the width and the indentation the row itself will have.

🎨 **The review's progress rail now only shows where you are.** It used to
colour each step by how much was in it, so the rail changed meaning as you
answered it and a count of finished tasks sat in the same circle as a count
of things still to settle — Someday showed a ticked pill reading "142".
Behind you, where you are, still to come: three states, one colour. Steps
that hand you something to read carry a mark rather than a tally.

🎨 **The daily/weekly switch in the review no longer jumps around.** Switching between daily
and weekly changed the head's layout and took the button you had just pressed
somewhere else; the week pager now sits beside it on the same line.

🐛 **Dates, projects and priorities typed in a name now reach the fields below it.** Typing "Friday #Work p1" marked those words and left the date, project
and priority pickers showing something else, so the dialog could hold two
different tasks at once and only one of them was going to be created. The
name and the fields are now one reading, made once.

🐛 **Search now finds pages such as Settings as soon as you type.** The list of places it offered
on opening was thrown away at the first keystroke, so typing "settings" — the
fastest way anybody would try to reach settings — found tasks with the word
in them and nothing else. Destinations are searched too, accents set aside,
and come first.

🐛 **The “Show subtasks” switch now works.** The switch was drawn, stored and read by
nobody.

🐛 **Adding the app to an iPhone home screen now shows its real icon.** iOS does not read the web manifest; it needs its own icon, and now has
one. The manifest also declares an identity and a full set of maskable icons,
which is what a desktop browser wants before it offers to install anything.

🐛 **Things to settle can now fill in missing estimates.** It now
holds the same batch editor the page header opens, instead of a weaker copy
of it.

🐛 **Filling in estimates in the review no longer moves rows under your cursor.** It wrote
one request per task, so the row you were typing in left the list the moment
you pressed Enter and the next jumped under the cursor. It holds its answers
now: the list stays still, the total gathers at the foot, one request at the
end.

🐛 **The review no longer asks about “Slipped” and “Behind schedule” separately.** They were the same question asked twice under two names. There is one now.

🐛 **Giving a task a date from a row or a column now removes its week tag.** Dropping it on Today had always taken it off — the two together are the
contradiction the app reports rather than resolves.

## 1.1.0

🆕 **A daily and weekly review, one question at a time.** One question at a time, in an order, with an
end. The daily pass asks what is late, what is sitting in the Inbox with no
project, what you committed to this week without naming a day, what has no
estimate, and what today holds. The weekly pass asks what you finished, what
the week amounted to in numbers, what slipped, what is unfiled, what has no
estimate, which projects have gone quiet, and what is parked in Someday.
Every answer is a change Todoist already understands, made through the same
rules a drag makes. The review stores nothing of its own.

🆕 **Project actions are available from the sidebar and from the project's own page.** They are Todoist's own: add a project above or below, edit, favourite,
duplicate, archive, delete. A project also renames from its own title.

🆕 **Drag projects in the sidebar to reorder them.** They move within their own list of siblings.

🆕 **Create tags from the Tags page, or by typing a new name after `@`.**

🆕 **Choose how roomy lists are with a density setting.** You pick it by looking at two pictures rather than by reading two adjectives. Compact closes the space around a row without taking
anything out of it: the same type, the same fields, a shorter page.

🆕 **Browse, a fifth destination on the phone, opens everything else.** It holds everything a phone
has no room for: the profile and its menu, search, tags, favourites,
projects. It is the sidebar rendered as a page, not a second list kept in
step by hand.

🆕 The app's **own date picker and own select**, everywhere a task is made or
edited. No operating-system list opening inside a sheet this app drew.

🆕 Filling in a page's missing estimates is **one pass and one request**: Tab
walks the column, the foot counts what is filled and what it adds up to, and
one button saves the lot.

🆕 The user menu gained the feedback form and the coffee link, and closes
when you click away from it.

🎨 Tags carry their colour onto the task row.

🎨 Insights reads a year of history four windows at a time instead of one
after another.

🎨 Sending a task to a destination is one method in one place, rather than
the same fifteen lines written out wherever it was needed.

🐛 **Messages and Undo buttons now actually appear on screen.** A leftover rule held them at
zero opacity waiting for a class nothing ever added, so no error and no undo
had ever reached anyone. This is why a refused change looked like a change
that never registered the click.

🐛 **Adding a task from the new task window no longer fails silently.** Leaving
the project picker alone sent an empty project id, which Todoist refuses. The
Inbox was listed twice: once as that empty value, and once as the real
project it already is.

🐛 **A change Todoist refuses is now reported to you.** The refused
command is dropped instead of going out again on every sync for ever — where
it also took everything queued behind it down with it.

🐛 **A refusal for plan limits no longer signs you out.** Todoist also answers 403 when
a command is against the rules of a plan, and reading that as an auth failure
hid the real reason and signed people out over it.

🐛 **Projects nested under another project now show in the sidebar.** Only folders disclosed their children.

🐛 **A description with two links no longer shows raw HTML.** The inline renderer ran
emphasis over a string that already carried generated anchors, so the
underscore in one `target="_blank"` paired with the next and tore both tags
in half.

🐛 The phone's navigation bar sat below the fold, behind the browser's own
furniture and anything above it in the app. It is fixed to the window and
padded for the phone's hardware.

🐛 The "open navigation" button on a phone opened My week. The "hide sidebar"
button did nothing at all; there is no column beside the app to hide.

🐛 A new section or tag could appear twice: only tasks and projects had their
placeholder cleared when the real record came back.

## 1.0.0

🆕 The insights period can be stepped with arrows: this week, then the week
before it. The presets are calendar units, so a week starts on the day the
Todoist account does and the quarter is the calendar quarter. Either date
can be edited to make a range of your own.

🆕 Tags can be dragged into a new order on the Tags page. The order is
Todoist's own, so the sidebar's favourites follow it.

🆕 A board with more columns than fit scrolls sideways, with arrows above it.

🆕 A link to the app unfurls with a title, a description and a picture of My
week.

🆕 An About section in settings, carrying the version, the statement that
this is not an official Todoist product, and links to the site, the code,
this changelog and the coffee.

🎨 The app is named "Enhanced for Todoist" everywhere, which is the form
Todoist's brand guidelines ask of a third-party app, and every description of
it now states that it is not created by, affiliated with, or supported by
Todoist.

🎨 The icon is the app's own: three capsules of different heights on one
baseline, a week read as the load it carries. It replaces Todoist's mark,
which a project that is not theirs had no business wearing. The browser and
install colour is the app's own accent rather than Todoist's red.

🎨 A task tagged quick but estimated at more than five minutes is left out of
the Quick group. The tag is a claim and the estimate is the fact.

🎨 The add-task line at the end of a section takes no room until the section
is hovered, and unfolds rather than appearing. Behind schedule and Quick no
longer carry an empty band under their last row.

🎨 On a project board, tasks outside any section are the first column.

🎨 Tags are listed one per row.

🎨 The logbook grouped by priority reads P1 first.

🎨 Upcoming's board uses the same arrows as every other board.

🐛 My week in board mode showed one column holding the whole week. It shows
the same five buckets the list does.

🐛 A profile photo in the sidebar kept its own square corners on top of the
round frame, and a portrait that was not square was squashed into it.

🐛 Installed on a phone, the icon has a full-bleed version of its own, so the
system's mask no longer eats its rounded corners.

🐛 Behind schedule no longer accepts drops. Dropping there dated the task
today, which is not what the heading says.

## 0.9.0

🆕 Dropping a task on the Quick group dates it today and adds the quick tag.

🆕 A board column shows its estimated time, how many of its tasks have no
estimate and, for a day column, how full it is against that day's capacity.

🎨 The separate dashboard page is gone. Its charts are the Dashboard tab of
the insights page, and an old `#/dashboard` link lands there.

🎨 Board columns use the same width as the list.

🎨 Tasks on a board are laid out as cards rather than as list rows.

🐛 The click a browser fires at the end of a drag no longer opens the task
that was dropped.

## 0.8.1

🎨 A project's description is always visible as a single line. Hovering it
opens a panel with the full text, where links can be clicked.

🐛 The capacity grid in settings had lost its layout and its inputs ran off
the page.

🐛 Selects in settings could not shrink below their content.

🐛 Page controls wrap under the title in a narrow column instead of
overflowing.

🐛 A chart with two dozen marks scrolls inside its own card.

## 0.8.0

🆕 Sections can be reordered by dragging them, with their tasks, into the gap
between two other sections. The gaps open up while a section is being
dragged so they can actually be hit.

🆕 Sections can be deleted. The confirmation says how many tasks go with the
section.

🎨 The app uses Todoist's icon.

🎨 Calendar mode is removed from every view.

🎨 Section descriptions are removed.

🎨 A section's name field is sized to its own text instead of filling the
row, so the duration and the count sit next to the name.

🎨 A project with no description takes no vertical space until the header is
hovered, which closed a 52px gap between the title and the figures below it.

🐛 A new build takes effect on the next reload. The service worker used to
keep serving the old one until every tab had been closed, which made fixes
look like they had not been applied.

🐛 A new section is created where you clicked rather than at the bottom.

🐛 Dragging a task onto Today also highlighted the Behind schedule and Quick
sections, because sections offering the same destination shared one
identifier.

## 0.7.0

🐛 Drop targets in the sidebar stopped working whenever the page offered the
same destination, because two drop targets cannot share an identifier. A
favourite project also shadowed its own row under the workspace.

🐛 The drop indicator was drawn outside the element, so the sidebar's scroll
container cut off its left and right edges.

🐛 Board columns were forced four across and squeezed to 157px, which left
task titles unreadable. The board sizes its own columns again.

🐛 Collapsing a section only worked on the heading text, not on the space
between it and the rule underneath.

🐛 The project description rendered a `div` inside a `p`.

## 0.6.0

🆕 Dates are read from the task name as you type: `tomorrow`, `lundi`,
`in 3 days`, `10 sept`, `demain à 9h`. What was recognised is highlighted in
the field before the task is saved, and the whole thing can be switched off
in settings. `#project`, `p1` and `@tag` always apply.

🆕 Subtasks can be typed in the add-task dialog and are created with the
parent.

🆕 Search is usable from the keyboard: arrows move through the results, Enter
opens one.

🆕 Multi-select filters in the logbook.

🆕 Upcoming shows four day columns at a time, with arrows to move between
them.

🎨 The insights dashboard follows the period. A day shows the hours work
happened in; a week or month adds the week's shape and a day-by-day
comparison; a quarter reads by week and a year by month.

🎨 Tags use a tag icon instead of a flag.

🎨 The Insights button is white. Filled red read as a selected state.

🎨 The drag preview sits beside the pointer so the cursor stays visible.

🎨 The Insights overview tab is called Dashboard, and the tab is part of the
URL.

🐛 Board columns wrap onto a second row instead of running off the page.
Grouped by project or tag, most of the board had been off-screen.

🐛 Cards sharing a row share a height.

🐛 The tag picker grew the dialog and scrolled the fields out of view.

🐛 The project description was given the full width of the header.

## 0.5.0

🆕 Project and priority shown as ring charts, tasks per day, time of day, a
tag ranking, and a comparison against the previous period.

🆕 A homepage setting.

🎨 The interface follows the design file: a warm red palette with one role
per shade, a pink-tinted sidebar, and a 10px control radius.

🎨 The sign-in screen matches the design, with the privacy note between the
field and the button.

🎨 The dashboard shows charts and figures only. The task list that used to
sit in the middle of it belonged in a view.

🎨 Settings is one page you scroll, with a menu that tracks your position.

🎨 Every select is drawn by the app rather than by the operating system.

🐛 Hover controls sat in the middle of a task row because the grid reserved a
column that nothing filled.

🐛 Dropping a task on Inbox, Upcoming or Someday did nothing.

🐛 The estimate field in the task panel had no unit beside it.

🐛 The repeat, flag, stack and group icons were drawn incorrectly.

## 0.1.0

First working version.

🆕 My week as the home view, splitting the week into behind schedule, quick,
today, scheduled today and anytime this week.

🆕 Estimates stored as the label `est-<minutes>` and shown as durations, with
workload and capacity calculated from them.

🆕 Upcoming, Someday, Inbox, project pages and tag pages.

🆕 List, board and focus modes.

🆕 Drag and drop with one meaning per destination, every drop undoable.

🆕 Insights, including the focus score.

🆕 Things to settle: missing estimates, and contradictions inside a task.

🆕 Offline support through an IndexedDB copy and an outbox.

🆕 English and French.
