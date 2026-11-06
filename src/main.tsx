import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useStore } from './store/store';
import './styles/app.css';
import './styles/additions.css';
import './styles/theme.css';
import './styles/polish.css';
import './styles/v2.css';
import './styles/viewtabs.css';
import './styles/table.css';
import './styles/mobile.css';
import './styles/pomodoro.css';
import { startInputModality } from './lib/inputModality';
import { startSegSlider } from './lib/segSlider';
import { startTabStops } from './lib/tabStops';
import { watchInstall } from './lib/install';
import { watchAppUpdate } from './lib/appUpdate';
import { watchAccount } from './lib/accountWatch';

// Exposed only while developing, so views can be exercised against sample data
// without a real account. Vite strips this branch from production builds.
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__store = useStore;
}

startInputModality();
startSegSlider();
startTabStops();
watchInstall();
watchAppUpdate();
watchAccount(useStore);

const params = new URLSearchParams(window.location.search);
const desktopReturn = !window.enhancedDesktop && /^desktop_[A-Za-z0-9_-]+$/.test(params.get('state') ?? '')
  && (params.has('code') || params.has('error'));
if (desktopReturn) {
  const scheme = params.get('state')?.startsWith('desktop_test_') ? 'enhanced-todoist-test' : 'enhanced-todoist';
  const result = new URL(`${scheme}://oauth/callback`);
  for (const key of ['code', 'error', 'state']) {
    const value = params.get(key);
    if (value) result.searchParams.set(key, value);
  }
  window.history.replaceState(null, '', window.location.pathname);
  const root = document.getElementById('root')!;
  const link = document.createElement('a');
  link.href = result.href;
  link.textContent = 'Return to Enhanced for Todoist / Revenir à Enhanced for Todoist';
  root.append(link);
  window.location.assign(result.href);
} else createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
