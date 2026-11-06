import { useEffect, useState, useSyncExternalStore } from 'react';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import { formatTime } from '@/domain/dates';
import { AnchoredPanel } from '@/components/AnchoredPanel';
import { VERSION } from '@/app-info';
import * as idb from '@/db/idb';
import { onSyncLog, syncLog, syncReport, type SyncFailure } from '@/store/syncLog';
import type { TranslationKey } from '@/i18n';

/** The words for a failure, as the person reading the panel would say it (#469). */
const REASON: Record<SyncFailure['kind'], TranslationKey> = {
  offline: 'sync.reason.offline',
  timeout: 'sync.reason.timeout',
  server: 'sync.reason.server',
  refused: 'sync.reason.refused',
  auth: 'sync.reason.auth',
  unreadable: 'sync.reason.unreadable',
  unknown: 'sync.reason.unknown',
};

/** A quiet line telling the user whether what they see matches Todoist, and why not when it does not. */
export function SyncStatus() {
  const { t, locale } = useT();
  const syncState = useStore((s) => s.syncState);
  const syncedAt = useStore((s) => s.snapshot.syncedAt);
  const pending = useStore((s) => s.pendingCount);
  const hour12 = useStore((s) => s.prefs.hour12);
  const demo = useStore((s) => s.demo);
  const refresh = useStore((s) => s.refresh);
  const log = useSyncExternalStore(onSyncLog, syncLog);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  let className = 'syncstatus';
  let message: string;
  const troubled = syncState === 'error' || syncState === 'offline' || pending > 0;

  // Back in sync: the panel closes, and does not reopen by itself next time.
  useEffect(() => { if (!troubled) setAnchor(null); }, [troubled]);

  if (syncState === 'syncing' || syncState === 'loading') {
    className += ' busy';
    message = t('sync.syncing');
  } else if (syncState === 'offline') {
    className += ' warn';
    message = t('sync.offline');
  } else if (syncState === 'error') {
    className += ' err';
    message = t('sync.error');
  } else if (pending > 0) {
    className += ' warn';
    message = t('sync.pending', { count: pending });
  } else if (syncedAt && Date.now() - syncedAt < 60_000) {
    message = t('sync.syncedJustNow');
  } else if (syncedAt) {
    message = t('sync.syncedAt', { time: formatTime(new Date(syncedAt), locale, hour12) });
  } else {
    message = t('common.loading');
  }

  /* In good health, the line still syncs on a click, as it always did. When
     something is wrong it says what instead, and offers to try again. */
  if (!troubled || demo) {
    return (
      <button className={className} onClick={() => void refresh()} title={t('sync.now')}>
        <span className="syncdot" />
        {message}
      </button>
    );
  }

  const latest = log[log.length - 1];
  const when = (ms: number) => {
    const date = new Date(ms);
    const sameDay = new Date().toDateString() === date.toDateString();
    const time = formatTime(date, locale, hour12);
    return sameDay ? time : `${date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} ${time}`;
  };

  const copy = async () => {
    const queue = await idb.readQueue();
    const text = syncReport({
      version: VERSION,
      userAgent: navigator.userAgent,
      state: `${syncState}${pending ? `, ${pending} waiting` : ''}`,
      syncedAt,
      queue: queue.map((cmd) => ({ type: cmd.type, attempts: cmd.attempts })),
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      /* Clipboard refused (an old browser, a denied permission): nothing to copy into. */
    }
  };

  return (
    <>
      <button
        className={`${className}${anchor ? ' on' : ''}`}
        onClick={(event) => setAnchor(anchor ? null : event.currentTarget)}
        aria-haspopup="dialog"
        aria-expanded={anchor !== null}
        title={t('sync.details')}
      >
        <span className="syncdot" />
        {message}
      </button>
      {anchor && (
        <AnchoredPanel anchor={anchor} onClose={() => setAnchor(null)} label={t('sync.details')} className="syncpanel">
          <div className="syncpanel-body">
            <p className="syncpanel-title">{message}</p>
            {latest && (syncState === 'error' || syncState === 'offline') && (
              <p className="syncpanel-reason">
                {t(REASON[latest.kind])}
                {latest.status ? <span className="syncpanel-code"> · {latest.status}{latest.tag ? ` ${latest.tag}` : ''}</span> : null}
              </p>
            )}
            <dl className="syncpanel-facts">
              <dt>{t('sync.lastSuccess')}</dt>
              <dd>{syncedAt ? when(syncedAt) : t('sync.never')}</dd>
              <dt>{t('sync.waitingLabel')}</dt>
              <dd>{pending}</dd>
              {latest && (
                <>
                  <dt>{t('sync.lastFailure')}</dt>
                  <dd>{when(latest.at)}</dd>
                </>
              )}
            </dl>
            <div className="syncpanel-actions">
              <button type="button" className="btn sm" onClick={() => void copy()}>
                {copied ? t('sync.copied') : t('sync.copy')}
              </button>
              <button
                type="button"
                className="btn sm primary"
                disabled={syncState === 'syncing'}
                onClick={() => { void refresh(syncState === 'error'); }}
              >
                {t('sync.retry')}
              </button>
            </div>
            <p className="syncpanel-note">{t('sync.copyNote')}</p>
          </div>
        </AnchoredPanel>
      )}
    </>
  );
}
