export type ChangelogVisual =
  'taskTags' | 'projectProgress' | 'focusedIcons' | 'darkAmoled' | 'threadOrder' | 'nlpShorthands' | 'taskComments' | 'boardDestination' | 'taskQuickActions' | 'workspacePage' | 'views' | 'mentions' | 'composerImage' | 'viewChoices' | 'table' | 'sidebarResize' | 'calendar' | 'assign' | 'subtasks' | 'sidebarFilters' | 'filterEditor' | 'favourites' | 'tags' | 'tagColours' | 'bulkTags' | 'sharing' | 'access' | 'assigneeFilter' | 'workspaces' | 'forecast' | 'skipRepeat' | 'search' | 'searchSections' | 'parser' | 'rejectParser' | 'duration' | 'estimates' | 'bulkEstimate' | 'estimateStorage' | 'estimateConversion' | 'metadata' | 'datePicker' | 'projectView' | 'board' | 'boardSection' | 'layouts' | 'sidebar' | 'projectNesting' | 'mobileBrowse' | 'today' | 'appearance' | 'dark' | 'accent' | 'setup' | 'notifications' | 'projectPicker' | 'projectMenu' | 'sectionMenu' | 'taskNavigation' | 'time' | 'quick' | 'dust' | 'dashboard' | 'period' | 'dashboardLayout' | 'review' | 'subtaskTotal' | 'nesting' | 'checklist' | 'conflicts' | 'paste' | 'upcomingGroups' | 'logbook' | 'bulk' | 'keyboard' | 'projectEmail' | 'signIn' | 'mac' | 'undo' | 'sync' | 'offline' | 'projectIcons' | 'completed' | 'matrix' | 'swipe' | 'load' | 'week' | 'density';

/** Editorial illustrations for features that benefit from a concrete UI example.
 * Keys refer to the release and its impact-sorted entry, shared by both languages.
 * Add a preview deliberately, including an occasional design entry with a concrete UI change.
 */
export const CHANGELOG_VISUALS = {
  '2.25.0:0': 'taskTags', // Tags are real chips in a task's window.
  '2.22.0:0': 'projectProgress',
  '2.22.0:2': 'focusedIcons',
  '2.21.0:0': 'darkAmoled',
  '2.21.0:2': 'threadOrder',
  '2.21.0:4': 'nlpShorthands',
  '2.20.0:0': 'taskComments',
  '2.20.0:2': 'boardDestination',
  '2.20.0:1': 'taskQuickActions',
  '2.19.0:0': 'views', // Create views for your projects.
  '2.18.0:0': 'mentions', // Mention someone in a comment.
  '2.16.0:0': 'board',
  '2.16.0:1': 'workspacePage',
  '2.11.0:0': 'table', // Table view for your lists.
  '2.11.0:1': 'sidebarResize', // Resize your sidebar.
  '2.11.0:2': 'composerImage', // Paste images from the composer.
  '2.11.0:3': 'viewChoices', // Clearer view choices.
  '2.10.0:0': 'calendar', // Calendar view for your lists.
  '2.9.0:0': 'assign', // Assign a task from the composer.
  '2.9.0:1': 'subtasks', // Write subtasks the way you write tasks.
  '2.9.0:2': 'sharing', // Share window refinements.
  '2.8.0:0': 'forecast', // See future repeats in Upcoming.
  '2.8.0:1': 'search', // See every search result.
  '2.8.0:2': 'tags', // Rename a tag from its page.
  '2.8.0:3': 'parser', // Type a time as you add a task.
  '2.8.0:4': 'duration', // Write durations in words.
  '2.7.0:0': 'assigneeFilter', // Tasks assigned to other people are hidde
  '2.7.0:1': 'sharing', // Assign a task to someone.
  '2.5.0:0': 'access', // Choose who can access a project.
  '2.5.0:1': 'mac', // The Mac app, one click away.
  '2.4.0:0': 'favourites', // Star a filter or a tag from its card.
  '2.3.0:0': 'datePicker', // Set a time, a duration and a repeat from
  '2.2.0:0': 'sidebarFilters', // Your Todoist filters are in the app.
  '2.2.0:1': 'filterEditor', // Create, edit and organise filters.
  '2.2.0:2': 'tagColours', // Change a tag's colour.
  '2.0.0:0': 'appearance', // Choose how the app sits in the window.
  '2.0.0:1': 'sidebar', // Arrange the sidebar.
  '2.0.0:2': 'metadata', // Choose what a task shows, and in what or
  '2.0.0:3': 'setup', // A setup for everyone, and a tour to foll
  '2.0.0:4': 'notifications', // Notifications from Todoist.
  '2.0.0:5': 'sharing', // Share a project and assign tasks.
  '2.0.0:6': 'projectView', // A default view for each project.
  '2.0.0:7': 'projectPicker', // Create a project without leaving the new
  '1.22.0:0': 'sectionMenu', // A menu on every section.
  '1.22.0:1': 'subtaskTotal', // A parent's duration adds up its subtasks
  '1.21.0:0': 'checklist', // Checklists in a task's description.
  '1.21.0:1': 'dashboardLayout', // Rearrange the dashboard's cards.
  '1.21.0:2': 'metadata', // Choose how task chips are coloured.
  '1.21.0:3': 'nesting', // Drag a subtask above or below its siblin
  '1.20.0:0': 'estimateStorage', // Choose where estimates live.
  '1.20.0:1': 'estimateConversion', // Convert your estimates with a preview.
  '1.20.0:3': 'bulkEstimate', // Estimate several tasks together.
  '1.19.0:0': 'time', // "I have time" finds what fits.
  '1.19.0:1': 'dust', // A "Gathering dust" group in Someday.
  '1.19.0:2': 'quick', // Quick tasks lead every list.
  '1.18.0:0': 'paste', // Paste a list to create several tasks.
  '1.16.0:4': 'datePicker', // The same date picker everywhere.
  '1.15.0:2': 'upcomingGroups', // Group Upcoming by day, week or month.
  '1.15.0:4': 'logbook', // Open a finished task from the Logbook.
  '1.15.0:5': 'taskNavigation', // Go to the previous or next task without 
  '1.14.0:0': 'keyboard', // Shortcuts act on a whole selection.
  '1.13.0:0': 'signIn', // Sign in with one "Continue with Todoist"
  '1.13.0:1': 'undo', // Undoing a deletion brings back the very 
  '1.11.0:1': 'projectIcons', // Give each project its own icon, from alm
  '1.11.0:2': 'workspaces', // Narrow a page to "My projects" or one wo
  '1.11.0:3': 'completed', // Show a project's completed tasks from Di
  '1.9.0:0': 'matrix', // An Eisenhower Matrix view.
  '1.9.0:1': 'searchSections', // Search can find sections.
  '1.7.0:0': 'keyboard', // Do everything from the keyboard.
  '1.7.0:4': 'swipe', // Swipe a task aside on a phone.
  '1.6.0:0': 'nesting', // Drag a task a little to the right over a
  '1.6.0:4': 'projectPicker', // Choose a project and its section in one 
  '1.5.0:0': 'rejectParser', // Refuse a guessed repeat with one click.
  '1.3.0:0': 'bulk', // Change more than the date of several tas
  '1.2.0:0': 'dark', // A dark theme.
  '1.2.0:1': 'accent', // Choose the accent colour from nine, or p
  '1.2.0:3': 'setup', // A first-run screen asks about theme, col
  '1.1.1:0': 'today', // Today as a page of its own, next to My w
  '1.1.1:3': 'bulk', // Select several tasks with ⌘-click and ac
  '1.1.1:4': 'projectNesting', // Drag a project into another in the sideb
  '1.1.0:0': 'review', // A daily and weekly review, one question 
  '1.1.0:4': 'density', // Choose how roomy lists are.
  '1.1.0:5': 'mobileBrowse', // Browse, a fifth destination on the phone
  '1.1.0:7': 'estimates', // Fill in a page's missing estimates in on
  '1.0.0:0': 'period', // Step through Insights periods with arrow
  '0.6.0:0': 'parser', // Dates are read from the task name as you
  '0.5.0:0': 'dashboard', // Insights charts.
  '0.1.0:0': 'week', // My week as your home.
} as const satisfies Record<string, ChangelogVisual>;
export function changelogVisual(version: string, entry: number): ChangelogVisual | null {
  return CHANGELOG_VISUALS[`${version}:${entry}` as keyof typeof CHANGELOG_VISUALS] ?? null;
}
