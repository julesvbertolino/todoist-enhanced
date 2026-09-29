import { useEffect, useState } from 'react';
import { Composer } from './components/overlays/Composer';
import { ConfirmProvider } from './components/overlays/Confirm';

/**
 * The page the desktop app shows in its quick-add window (`/?quickadd`): the
 * composer and nothing else, opened again each time the global shortcut is
 * pressed. In a plain browser it is just the composer on an empty page.
 */
export const QUICK_ADD = new URLSearchParams(window.location.search).has('quickadd');

/* Opened before signing in, the window shows the sign-in page. Once there is
   an account, the next press of the shortcut starts it over. */
if (QUICK_ADD) {
  window.addEventListener('enhanced:quickadd', () => {
    if (document.querySelector('.connect')) window.location.reload();
  });
}

export function QuickAdd() {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    document.documentElement.classList.add('quickadd');
    const again = () => setOpen(true);
    window.addEventListener('enhanced:quickadd', again);
    return () => window.removeEventListener('enhanced:quickadd', again);
  }, []);

  const close = () => {
    setOpen(false);
    // The desktop app hides its window; anywhere else there is nothing to hide.
    window.enhancedDesktop?.hideQuickAdd();
  };

  return (
    <ConfirmProvider>
      <Composer open={open} onClose={close} />
    </ConfirmProvider>
  );
}
