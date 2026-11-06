import { useEffect, useState } from 'react';
import { Overlay } from '../overlays/Overlay';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import { LAUNCH, launchIsOn, launchWasSeen, rememberLaunch } from '@/domain/launch';
import './launch.css';

/**
 * A one-off invitation to upvote the app on Product Hunt, for launch day.
 *
 * Temporary by design: delete this folder, `src/domain/launch.ts` and the one
 * line in App.tsx that renders it (and `launchSeen` in store/prefs.ts). Until then
 * it puts itself away on its own after `LAUNCH.until`. Whoever has seen it is
 * remembered the moment it appears, whatever they do next: on this device, and
 * on their Todoist account so another browser or the Mac app does not ask again.
 */
export function LaunchPopup({ ready }: { ready: boolean }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const demo = useStore((s) => s.demo);
  const settingsChecked = useStore((s) => s.settingsChecked);
  const seenOnAccount = useStore((s) => s.prefs.launchSeen === LAUNCH.id);
  const setPrefs = useStore((s) => s.setPrefs);
  /* An account remembers it for every browser and for the Mac app, so its
     settings have to be read before deciding. The demo has no account: this
     device alone remembers. */
  const known = demo || settingsChecked;

  useEffect(() => {
    if (!ready || !known || !launchIsOn() || seenOnAccount) return;
    if (launchWasSeen()) {
      // Seen on this device before the account knew: tell the account, quietly.
      if (!demo) setPrefs({ launchSeen: LAUNCH.id });
      return;
    }
    // A moment after the page is calm, not on top of it.
    const timer = window.setTimeout(() => {
      if (launchWasSeen()) return;
      rememberLaunch();
      if (!demo) setPrefs({ launchSeen: LAUNCH.id });
      setOpen(true);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [ready, known, demo, seenOnAccount, setPrefs]);

  if (!open) return null;
  return (
    <Overlay open onClose={() => setOpen(false)} label={t('launch.title')} size="sm">
      <div className="launch">
        {/* A badge in the manner of "Featured on Product Hunt", drawn here. */}
        <div className="launch-badge" aria-hidden="true">
          <span className="launch-logo">P</span>
          <span className="launch-badge-text"><small>FEATURED ON</small><strong>Product Hunt</strong></span>
          <span className="launch-up"><svg viewBox="0 0 24 24" width="13" height="13"><path d="M12 5 4.5 17h15z" fill="currentColor" /></svg></span>
        </div>
        <h2>{t('launch.title')}</h2>
        <div className="launch-actions">
          <a className="btn primary lg" href={LAUNCH.url} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
            {t('launch.vote')}
          </a>
          <button type="button" className="launch-later" onClick={() => setOpen(false)}>{t('launch.later')}</button>
        </div>
      </div>
    </Overlay>
  );
}
