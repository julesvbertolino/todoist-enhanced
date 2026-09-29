# Desktop app (macOS)

A native window around the hosted site, plus a global quick-add: press
**Option+Space** from any app and the composer opens on top of it.

Nothing of the app is bundled. The window loads
`https://todoistenhanced.julesbertolino.fr/`, so deploying the site updates the
app. The shell itself only changes when this folder does.

## Try it

```bash
# terminal 1, at the repo root: the site, on the port Todoist accepts for sign-in
npm run dev

# terminal 2
cd desktop
npm install
ENHANCED_URL=http://localhost:5192/ npm start
```

Without `ENHANCED_URL` it loads the official site (which only knows the
quick-add page once this branch is deployed).

Sign in in the main window first: the quick-add window shares its session.

## Install it

```bash
cd desktop && npm run pack
```

Then drag `dist/mac-*/Enhanced for Todoist.app` into Applications.

## The shortcut

Option+Space can be changed, if another app already uses it, in `~/Library/Application Support/enhanced-for-todoist-desktop/config.json`:

```json
{ "quickAddShortcut": "Alt+Shift+Space" }
```

(`QUICKADD_SHORTCUT` in the environment does the same.)
