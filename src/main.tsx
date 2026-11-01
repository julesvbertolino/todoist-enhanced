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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
