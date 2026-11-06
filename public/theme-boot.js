/*
  The theme, before the first paint.

  Preferences live in IndexedDB and arrive a moment after the page does.
  Without this the app opens white and turns dark once they load, which
  is a flash of the wrong theme on every single launch. Only the choice
  is stored; "system" is still resolved against the device here, the
  same way the app resolves it afterwards.
*/
/* The desktop app's Quick Add window is transparent, and only the composer
   is drawn in it. The page says so before its first paint: marked later, by
   the app itself, the window showed the full opaque loading page for an
   instant each time it loaded again, a flash of the whole app before the
   composer. */
try {
  if (window.location && /[?&]quickadd(?:[=&]|$)/.test(window.location.search)) document.documentElement.classList.add('quickadd');
  var choice = localStorage.getItem('theme');
  var dark = choice === 'dark' ||
    (choice !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  if (dark && localStorage.getItem('darkStyle') === 'amoled') document.documentElement.dataset.dark = 'amoled';
  // Match the browser canvas before the application stylesheet is available.
  // Otherwise a dark system can briefly paint black despite a saved light theme.
  var schemeMeta = document.querySelector('meta[name="color-scheme"]');
  if (schemeMeta) schemeMeta.content = dark ? 'dark' : 'light';
  /* The accent, for the same reason: a red flash before the green
     arrives is the same wrong first paint in a different colour. */
  var accent = localStorage.getItem('accent');
  if (accent) document.documentElement.dataset.accent = accent;
  /* And the frame (layout and background), for the same reason. */
  var layout = localStorage.getItem('layout');
  if (layout) document.documentElement.dataset.layout = layout;
  var backdrop = localStorage.getItem('backdrop');
  if (backdrop) document.documentElement.style.setProperty('--back-gradient', backdrop);
  var background = localStorage.getItem('background');
  if (background) document.documentElement.dataset.background = background;
  /* A custom accent is not in the stylesheet — it is computed from one
     colour. Both schemes were worked out and stored when it was chosen,
     so the right one can be written here without repeating the recipe. */
  if (accent === 'custom') {
    var vars = JSON.parse(localStorage.getItem('accentVars') || 'null');
    var set = vars && vars[dark ? 'dark' : 'light'];
    for (var token in set) {
      document.documentElement.style.setProperty('--' + token, set[token]);
    }
    if (dark && localStorage.getItem('darkStyle') === 'amoled') document.documentElement.style.setProperty('--sidebar', '#000');
  }
} catch { /* Storage may be unavailable; keep the default theme. */ }
