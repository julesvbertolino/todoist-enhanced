import { useEffect, useMemo, useState } from 'react';
import { Overlay } from './Overlay';
import { Icon } from '../Icon';
import { EstimateBulk } from './Unestimated';
import { useT } from '@/hooks/useT';
import { useData } from '@/hooks/useData';
import { useStore } from '@/store/store';
import { detectConflicts, detectIncomplete, type Conflict } from '@/domain/conflicts';
import { rootItems } from '@/store/selectors';
import { toDisplayPriority, SYSTEM_LABELS, weekLabel } from '@/domain/types';
import { readEstimate } from '@/domain/estimates';
import type { TranslationKey } from '@/i18n';
import { en } from '@/i18n/en';
import { plainTitle } from '@/domain/markdown';
import { notificationGlyph, notificationList, sentenceKey, type NotificationView } from '@/domain/notifications';
import { formatTimeAgo } from '@/domain/dates';
import { TodoistMark } from '../TodoistMark';

const bold = (text: string): string => `\uE000${text}\uE001`;

/** A steady colour for a name, so the same person is the same circle every time. */
function personColour(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${hash} 52% 50%)`;
}

/**
 * Who a notification is from: their picture, else their initials on a steady
 * colour, else Todoist's mark when Todoist itself is speaking. A small badge
 * says what kind of thing happened.
 */
function NotificationAvatar({ n }: { n: NotificationView }) {
  const [broken, setBroken] = useState(false);
  const glyph = notificationGlyph(n.type);
  const name = n.from ?? n.subject;
  return (
    <span className="notifav-wrap" aria-hidden="true">
      {n.fromTodoist ? (
        <span className="notifav todoist"><TodoistMark className="notifmark" /></span>
      ) : n.image && !broken ? (
        <img className="notifav" src={n.image} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
      ) : (
        <span className="notifav" style={{ background: personColour(name ?? 'Todoist') }}>
          {(name ?? 'T').slice(0, 2).toUpperCase()}
        </span>
      )}
      {glyph && !n.fromTodoist && <span className="notifbadge"><Icon name={glyph} size="sm" /></span>}
    </span>
  );
}

interface IssuesProps {
  open: boolean;
  onClose: () => void;
  onOpen: (id: string) => void;
}

/**
 * The centre for things to settle.
 *
 * Conflicts are contradictions the app will not resolve on its own: each one
 * is shown with the choices that match the possible intents, and nothing
 * changes until the user picks one.
 */
export function Issues({ open, onClose, onOpen }: IssuesProps) {
  const { t, locale } = useT();
  const { snapshot, items, childrenOf } = useData();
  const conflictSettings = useStore((s) => s.prefs.conflicts);
  const updateTask = useStore((s) => s.updateTask);
  const markNotifications = useStore((s) => s.markNotifications);
  const answerInvitation = useStore((s) => s.answerInvitation);
  /* Two kinds of thing in one window: what Todoist says, and what does not add
     up in the plan. Opens on whichever has something waiting. */
  const notifications = useMemo(() => notificationList(snapshot), [snapshot]);
  const unread = notifications.filter((n) => n.unread).length;
  const [source, setSource] = useState<'todoist' | 'conflicts'>('conflicts');
  useEffect(() => { if (open) setSource(unread > 0 ? 'todoist' : 'conflicts'); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps -- chosen once, on opening
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const conflicts = useMemo(
    () => detectConflicts(items, childrenOf, conflictSettings).filter((c) => !dismissed.has(c.id)),
    [items, childrenOf, conflictSettings, dismissed],
  );

  const incomplete = useMemo(() => detectIncomplete(rootItems(items)), [items]);

  /** What happened, in a sentence; a kind that is not known reads as its own name. */
  const sentence = (n: NotificationView): string => {
    /* An announcement says what Todoist itself wrote, when it wrote it. */
    if (n.message && (n.fromTodoist || n.type === 'workspace_team_cohort_tagged')) return n.message;
    const key = sentenceKey(n);
    if (!key) return n.about ? `${n.kind} · ${n.about}` : n.kind;
    const rank = n.level ? `karma.${n.level}` : null;
    return t(key as TranslationKey, {
      /* Never an invented actor (#11): an unnamed sender stays unnamed. */
      from: bold(n.from ?? n.subject ?? t('notif.someone')),
      about: bold(n.about ?? '…'),
      subject: bold(n.subject ?? n.from ?? '…'),
      level: bold(rank && rank in en ? t(rank as TranslationKey) : n.level ?? ''),
    });
  };
  /** Names and places stand out in the sentence, as they do in Todoist's own. */
  const lines = (text: string) => text.split(/(\uE000.*?\uE001)/).map((part, i) => (
    part.startsWith('\uE000') ? <strong key={i}>{part.slice(1, -1)}</strong> : part
  ));

  async function resolve(conflict: Conflict, optionId: string) {
    const item = snapshot.items[conflict.itemId];
    if (!item) return;

    if (optionId === 'dismiss') {
      // Keeping both is a deliberate choice, so the entry simply stops nagging.
      setDismissed((prev) => new Set(prev).add(conflict.id));
      return;
    }

    if (optionId.startsWith('keep:')) {
      const keep = optionId.slice(5);
      const others = item.labels.filter(
        (l) => !l.toLowerCase().startsWith('est-') || l === keep,
      );
      const minutes = readEstimate([keep]).minutes;
      await updateTask(item.id, minutes === null ? { labels: others } : { estimateMinutes: minutes });
      return;
    }

    switch (optionId) {
      case 'keep-duration':
        await updateTask(item.id, { estimateMinutes: readEstimate(item).durationMinutes });
        break;
      case 'keep-tag':
        await updateTask(item.id, { estimateMinutes: readEstimate(item).tagMinutes });
        break;
      case 'remove-estimate':
        await updateTask(item.id, { estimateMinutes: null });
        break;
      case 'edit-estimate':
        onOpen(item.id);
        onClose();
        break;
      case 'remove-week-label':
        await updateTask(item.id, {
          labels: item.labels.filter((l) => l.toLowerCase() !== weekLabel().toLowerCase()),
        });
        break;
      case 'remove-date':
        await updateTask(item.id, { due: null });
        break;
      case 'remove-quick-label':
        await updateTask(item.id, {
          labels: item.labels.filter((l) => l.toLowerCase() !== SYSTEM_LABELS.quick),
        });
        break;
      case 'keep-parent':
        setDismissed((prev) => new Set(prev).add(conflict.id));
        break;
      case 'clear-parent':
        await updateTask(item.id, { estimateMinutes: null });
        break;
      default:
        break;
    }
  }

  return (
    <Overlay open={open} onClose={onClose} label={t('issues.title')} size="sm" anchor='[data-tour="notifications"]'>
      <div className="sheet-head">
        <div>
          <h2>{t('issues.title')}</h2>
        </div>
        {/* Always in the header, shown or not, so nothing moves when the tab does. */}
        <button
          className="btn quiet sm headmark"
          style={{ visibility: source === 'todoist' && unread > 0 ? 'visible' : 'hidden' }}
          tabIndex={source === 'todoist' && unread > 0 ? 0 : -1}
          onClick={() => void markNotifications('all')}
        >
          {t('notif.markAll')}
        </button>
        <button className="iconbtn" aria-label={t('common.close')} onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>

      <div className="segmented small notifswitch" role="group" aria-label={t('issues.title')}>
        <button aria-pressed={source === 'todoist'} onClick={() => setSource('todoist')}>
          <small>{t('notif.fromTodoist')}{unread > 0 && ` (${unread})`}</small>
        </button>
        <button aria-pressed={source === 'conflicts'} onClick={() => setSource('conflicts')}>
          <small>{t('notif.conflicts')}{conflicts.length > 0 && ` (${conflicts.length})`}</small>
        </button>
      </div>

      {source === 'todoist' ? (
        <div className="sheet-body notiflist">
          {notifications.length === 0 ? (
            <p className="empty">{t('notif.none')}</p>
          ) : (
            <>
              <ul>
                {notifications.map((n) => (
                  <li key={n.id} className={n.unread ? 'unread' : undefined}>
                    <NotificationAvatar n={n} />
                    <div className="notifmain">
                      <p className="notifline">{lines(sentence(n))}</p>
                      {n.at && <small>{formatTimeAgo(new Date(n.at), locale)}</small>}
                      {n.answered && !n.invitation && (
                        <small className="notifanswered">{t(n.answered === 'accepted' ? 'notif.answered.accepted' : 'notif.answered.rejected')}</small>
                      )}
                      {n.invitation && (
                        <div className="opts">
                          <button className="btn primary" onClick={() => void answerInvitation(n.id, true)}>{t('notif.accept')}</button>
                          <button className="btn" onClick={() => void answerInvitation(n.id, false)}>{t('notif.decline')}</button>
                        </div>
                      )}
                    </div>
                    {n.unread && (
                      <button className="btn quiet sm notifread" onClick={() => void markNotifications([n.id])}>{t('notif.markRead')}</button>
                    )}
                    <span className="notifdot" aria-hidden="true" />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : (
      <>
      {/* The estimates tab brings its own body and its own foot: it is the
          same batch editor the page header opens, not a second, weaker copy of
          it that could only be read. */}
      <div className="sheet-body">
        {conflicts.length === 0 ? (
            /* Nothing to settle is only worth saying when nothing else is on
               the page; otherwise the rest moves up into its place. */
            incomplete.length === 0 ? <p className="empty">{t('issues.none')}</p> : null
          ) : (
            <div className="conflicts">
              {conflicts.map((conflict) => {
                const item = snapshot.items[conflict.itemId];
                if (!item) return null;
                const reading = readEstimate(item.labels);
                return (
                  <div className="conflict" key={conflict.id}>
                    <span
                      className={`check p${toDisplayPriority(item.priority)}`}
                      role="checkbox"
                      aria-checked="false"
                      aria-label={t('task.complete')}
                    >
                      <Icon name="check" />
                    </span>
                    <div>
                      <strong>{plainTitle(item.content)}</strong>
                      <p>{t(conflict.messageKey as TranslationKey, conflict.messageValues)}</p>
                      <div className="opts">
                        {conflict.options.map((option) => (
                          <button
                            key={option.id}
                            className={`btn${option.recommended ? ' primary' : ''}`}
                            onClick={() => void resolve(conflict, option.id)}
                          >
                            {t(option.labelKey as TranslationKey, {
                              value: String(option.payload?.label ?? reading.raw[0] ?? ''),
                            })}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
        )}
        {/* The tasks still to estimate share the list: one place for what the
            app found, not two tabs to remember. */}
        {incomplete.length > 0 && (
          <>
            <h3 className="notifsub">{t('issues.tabToComplete')} ({incomplete.length})</h3>
            <EstimateBulk
              items={incomplete.slice(0, 100)}
              resetKey={open}
              onOpen={(id) => { onOpen(id); onClose(); }}
              onDone={onClose}
            />
          </>
        )}
      </div>
      </>
      )}
    </Overlay>
  );
}
