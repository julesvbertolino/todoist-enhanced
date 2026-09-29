// Runs before the page, with access to Electron; the page only gets what is
// handed over below.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('enhancedDesktop', {
  hideQuickAdd: () => ipcRenderer.send('quickadd:hide'),
});

// The quick-add window is kept alive and shown again on each shortcut press.
ipcRenderer.on('quickadd:show', () => {
  window.dispatchEvent(new CustomEvent('enhanced:quickadd'));
});

// Lets the site's stylesheet make room for the window buttons.
window.addEventListener('DOMContentLoaded', () => {
  document.documentElement.classList.add('desktop-app');
});
