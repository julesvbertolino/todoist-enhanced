import { useEffect, useState } from 'react';
import { Composer } from './components/overlays/Composer';
import { ConfirmProvider } from './components/overlays/Confirm';
import { auth } from './api/auth';
import { accountOnDevice, outOfStep } from './lib/accountWatch';
import { useStore } from './store/store';

/**
 * The page the desktop app shows in its quick-add window (`/?quickadd`): the
 * composer and nothing else, opened again each time the global shortcut is
 * pressed. In a plain browser it is just the composer on an empty page.
 */
export const QUICK_ADD = new URLSearchParams(window.location.search).has('quickadd');

/* The window lives for as long as the app, hidden between two presses of
   the shortcut. Each press checks it still matches what the device is signed
   in to (the sign-in page or the demo once there is an account, another
   account, no account any more) and starts it over if not, so a task always
   goes to the account the main window shows. */
if (QUICK_ADD) {
  window.addEventListener('enhanced:quickadd', () => {
    const device = { signedIn: auth.isConnected(), account: accountOnDevice() };
    if (outOfStep(useStore.getState(), device)) window.location.reload();
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
