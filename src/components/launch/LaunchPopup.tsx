import { useEffect, useState } from 'react';
import { Overlay } from '../overlays/Overlay';
import { useT } from '@/hooks/useT';
import { LAUNCH, launchIsOn, launchWasSeen, rememberLaunch } from '@/domain/launch';
import './launch.css';

/**
 * A one-off invitation to upvote the app on Product Hunt, for launch day.
 *
 * Temporary by design: delete this folder, `src/domain/launch.ts` and the one
 * line in App.tsx that renders it. Until then it puts itself away on its own
 * after `LAUNCH.until`. Whoever has seen it is remembered on this device the
 * moment it appears, whatever they do next, so it never comes back.
 */
export function LaunchPopup({ ready }: { ready: boolean }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ready || !launchIsOn() || launchWasSeen()) return;
    // A moment after the page is calm, not on top of it.
    const timer = window.setTimeout(() => {
      if (launchWasSeen()) return;
      rememberLaunch();
      setOpen(true);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [ready]);

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
        <p>{t('launch.body')}</p>
        <div className="launch-actions">
          <a className="btn primary lg" href={LAUNCH.url} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
            {t('launch.vote')}
          </a>
          <small className="launch-free">{t('launch.free')}</small>
          <button type="button" className="launch-later" onClick={() => setOpen(false)}>{t('launch.later')}</button>
        </div>
        <small className="launch-once">{t('launch.once')}</small>
      </div>
    </Overlay>
  );
}
