const {
  app, BrowserWindow, Menu, Notification, globalShortcut, ipcMain, shell,
} = require('electron');
const fs = require('node:fs');
const path = require('node:path');

/* The site is the app: nothing is bundled, so a new deploy of it is a new
   version here the next time the window loads. Point ENHANCED_URL at
   http://localhost:5192 to try a change from `npm run dev`. */
const APP_URL = (process.env.ENHANCED_URL || 'https://todoistenhanced.julesbertolino.fr/').trim();
const APP_ORIGIN = new URL(APP_URL).origin;

/* Option+Space is also Raycast's default. Change either one; this side reads
   `quickAddShortcut` from config.json in the app's data folder (Electron
   accelerator syntax, e.g. "Alt+Shift+Space"), or QUICKADD_SHORTCUT. */
function readShortcut() {
  if (process.env.QUICKADD_SHORTCUT) return process.env.QUICKADD_SHORTCUT;
  try {
    const file = path.join(app.getPath('userData'), 'config.json');
    return JSON.parse(fs.readFileSync(file, 'utf8')).quickAddShortcut || 'Alt+Space';
  } catch {
    return 'Alt+Space';
  }
}

let main = null;
let quick = null;
let mainWasFocused = false;

/** Todoist's own pages (sign-in) may load in the window; everything else opens in the browser. */
function isOurs(url) {
  try {
    const { origin, hostname } = new URL(url);
    return origin === APP_ORIGIN || hostname === 'todoist.com' || hostname.endsWith('.todoist.com');
  } catch {
    return false;
  }
}

function guardNavigation(win) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (isOurs(url)) return;
    event.preventDefault();
    if (/^https?:/.test(url)) shell.openExternal(url);
  });
}

function createMain() {
  main = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 720,
    minHeight: 520,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
    },
  });
  guardNavigation(main);
  main.loadURL(APP_URL);
  main.on('closed', () => { main = null; });
}

function createQuick() {
  quick = new BrowserWindow({
    width: 660,
    height: 640,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
    },
  });
  // Over other apps' full-screen windows and on whichever Space is current.
  quick.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  quick.setAlwaysOnTop(true, 'floating');
  guardNavigation(quick);
  quick.loadURL(`${APP_URL}${APP_URL.includes('?') ? '&' : '?'}quickadd`);
  // Like Spotlight: clicking elsewhere puts it away.
  quick.on('blur', () => hideQuick());
  quick.on('closed', () => { quick = null; });
}

function showQuick() {
  if (!quick) createQuick();
  mainWasFocused = Boolean(main && main.isFocused());
  quick.center();
  quick.show();
  quick.focus();
  quick.webContents.send('quickadd:show');
}

function hideQuick() {
  if (!quick || !quick.isVisible()) return;
  quick.hide();
  // Give the keyboard back to the app that was in front, unless this one was.
  if (process.platform === 'darwin' && !mainWasFocused) app.hide();
}

function toggleQuick() {
  if (quick && quick.isVisible()) hideQuick();
  else showQuick();
}

function registerShortcut() {
  const accelerator = readShortcut();
  const ok = globalShortcut.register(accelerator, toggleQuick);
  if (!ok) {
    new Notification({
      title: 'Enhanced for Todoist',
      body: `${accelerator} is already taken by another app (Raycast uses it by default). ` +
        'Set another one in config.json: { "quickAddShortcut": "Alt+Shift+Space" }.',
    }).show();
  }
}

function buildMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: 'appMenu' },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' }, { role: 'togglefullscreen' },
      ],
    },
    { role: 'windowMenu' },
  ]));
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!main) createMain();
    else { if (main.isMinimized()) main.restore(); main.focus(); }
  });

  app.whenReady().then(() => {
    buildMenu();
    createMain();
    createQuick();
    registerShortcut();
    ipcMain.on('quickadd:hide', hideQuick);
    app.on('activate', () => { if (!main) createMain(); else main.show(); });
  });

  // The shortcut has to keep working with the main window closed.
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
  app.on('will-quit', () => globalShortcut.unregisterAll());
}
