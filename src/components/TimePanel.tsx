import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { COMPLETION_LINGER_MS } from './TaskRow';
import { useT } from '@/hooks/useT';
import { useData } from '@/hooks/useData';
import { useStore } from '@/store/store';
import { rootItems } from '@/store/selectors';
import { effectiveEstimate, formatDuration, parseDurationInput } from '@/domain/estimates';
import {
  FIT_CHOICES, countedMinutes, fitsIn, suggestDuration, type FitBucketKey,
} from '@/domain/fits';
import { displayTaskContent, toDisplayPriority, type Item } from '@/domain/types';
import { renderTitle } from '@/domain/markdown';
import type { TranslationKey } from '@/i18n';

interface TimePanelProps {
  /** The page's own tasks, after its Display filters: what "in this page" means. */
  pageItems: Item[];
  /** What the page is called, for the "In …" choice. */
  pageLabel: string;
  onOpen: (id: string) => void;
  /** Opens the estimate pass for exactly these tasks. */
  onUnestimated: (items: Item[]) => void;
}

const BUCKET_TITLE: Record<FitBucketKey, TranslationKey> = {
  overdue: 'time.overdue',
  today: 'time.today',
  tomorrow: 'time.tomorrow',
  week: 'time.week',
  nodate: 'time.nodate',
};

/**
 * "I have time": pick how long you have, see the tasks that fit (#159).
 *
 * The panel is the result and the page behind it is left as it was, which is
 * what lets it look everywhere and not only at the page it was opened from.
 * It is not modal: the pill that opened it can be clicked again to put it
 * away, and the page stays where it was. Nothing is written, and neither the
 * duration nor the scope is remembered past a reload.
 */
export function TimePanel({ pageItems, pageLabel, onOpen, onUnestimated }: TimePanelProps) {
  const { t, locale } = useT();
  const { items, childrenOf } = useData();
  const open = useStore((s) => s.sidePanel === 'time');
  const { minutes, scope, sort } = useStore((s) => s.timeFilter);
  const setTimeFilter = useStore((s) => s.setTimeFilter);
  const closeSidePanel = useStore((s) => s.closeSidePanel);
  const panelRef = useRef<HTMLElement>(null);

  /* Everywhere is every open task: the page's Display filters are about that
     page, and have no say in a question asked of all of them. */
  const pool = useMemo(
    () => (scope === 'page' ? pageItems : rootItems(items)),
    [scope, pageItems, items],
  );
  const result = useMemo(
    () => (minutes === null ? null : fitsIn(pool, minutes, childrenOf)),
    [pool, minutes, childrenOf],
  );

  /* One list, in the order the question is about: the shortest first, or the
     most important first, the other breaking a tie. Each row says when it is
     due, so nothing is hidden by sorting the days together. */
  const ordered = useMemo(() => {
    if (!result) return [];
    const time = (item: Item) => countedMinutes(item, childrenOf) ?? 0;
    const byTime = (a: Item, b: Item) => time(a) - time(b);
    const byPriority = (a: Item, b: Item) => b.priority - a.priority;
    const compare = sort === 'priority'
      ? (a: Item, b: Item) => byPriority(a, b) || byTime(a, b)
      : (a: Item, b: Item) => byTime(a, b) || byPriority(a, b);
    return result.buckets
      .flatMap((bucket) => bucket.items.map((item) => ({ item, when: bucket.key })))
      .sort((a, b) => compare(a.item, b.item));
  }, [result, sort, childrenOf]);

  /* The free field takes what the estimate field takes. It shows the value
     when that is not one of the choices, and is empty when a choice is it. */
  const isChoice = minutes !== null && (FIT_CHOICES as readonly number[]).includes(minutes);
  const [draft, setDraft] = useState('');
  const [refused, setRefused] = useState(false);
  useEffect(() => {
    setDraft(minutes !== null && !isChoice ? formatDuration(minutes, locale) : '');
    setRefused(false);
  }, [minutes, isChoice, locale]);

  const commitDraft = () => {
    if (!draft.trim()) { setRefused(false); return; }
    const parsed = parseDurationInput(draft);
    if (parsed === null) { setRefused(true); return; }
    setTimeFilter({ minutes: parsed });
  };

  /* Escape puts the panel away. It is the same key that gives back a
     selection or the cursor, and those answer first (they stop the event); a
     dialog or a menu in front owns it. */
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (document.querySelector('.overlay.open, .popover, .rowmenu, .bulkpop, .datepanel')) return;
      event.preventDefault();
      closeSidePanel('time');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closeSidePanel]);

  /* The keyboard comes in with it, on the first choice, and goes back to the
     pill that opened it when the panel is put away. The page makes way for it
     where there is room, which the stylesheet reads from this mark. */
  useEffect(() => {
    if (!open) return;
    const was = document.activeElement as HTMLElement | null;
    /* Only when it was asked for: the panel is drawn again by each page it
       follows you to, and moving the keyboard on every one of those would
       take it from whatever you had just clicked. */
    if (!was || was === document.body || was.closest('.timepill')) {
      panelRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true });
    }
    document.documentElement.dataset.sidepanel = 'time';
    return () => {
      delete document.documentElement.dataset.sidepanel;
      if (was && document.contains(was)) was.focus?.({ preventScroll: true });
    };
  }, [open]);

  /* Closing plays the entry backwards while the page widens back (#29): the
     panel stays drawn for the length of its exit. */
  const [leaving, setLeaving] = useState(false);
  const wasOpen = useRef(open);
  useEffect(() => {
    if (open) { wasOpen.current = true; setLeaving(false); return; }
    if (!wasOpen.current) return;
    wasOpen.current = false;
    setLeaving(true);
    const timer = window.setTimeout(() => setLeaving(false), 320);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!open && !leaving) return null;

  const next = result && result.count === 0 ? suggestDuration(result.next) : null;

  return createPortal(
    <aside
      className={`timepanel${open ? '' : ' leaving'}`}
      ref={panelRef}
      aria-label={t('time.title')}
    >
      <div className="timehead">
        <h2><Icon name="clock" /> {t('time.title')}</h2>
        <button className="iconbtn" aria-label={t('common.close')} onClick={() => closeSidePanel('time')}>
          <Icon name="close" />
        </button>
      </div>

      <div className="timebody">
        <div className="timecard">
        <p className="timelabel" id="time-question">{t('time.question')}</p>
        <div className="timechoices" role="group" aria-labelledby="time-question">
          {FIT_CHOICES.map((choice, at) => (
            <button
              key={choice}
              aria-pressed={minutes === choice}
              className={`timechoice${minutes === choice ? ' on' : ''}`}
              data-autofocus={at === 0 ? '' : undefined}
              onClick={() => setTimeFilter({ minutes: choice })}
            >
              {formatDuration(choice, locale)}
            </button>
          ))}
          <input
            className={`timecustom${!isChoice && minutes !== null ? ' on' : ''}${refused ? ' refused' : ''}`}
            value={draft}
            placeholder={t('time.customPlaceholder')}
            aria-label={t('time.custom')}
            aria-invalid={refused || undefined}
            inputMode="text"
            onChange={(e) => { setDraft(e.target.value); setRefused(false); }}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') { e.preventDefault(); commitDraft(); }
              if (e.key === 'Escape') {
                setDraft(minutes !== null && !isChoice ? formatDuration(minutes, locale) : '');
                setRefused(false);
                e.currentTarget.blur();
              }
            }}
          />
        </div>

        <div className="timeoptions">
          <div className="timescope" role="group" aria-label={t('time.where')}>
            {(['page', 'everywhere'] as const).map((choice) => (
              <button
                key={choice}
                aria-pressed={scope === choice}
                className={scope === choice ? 'on' : undefined}
                onClick={() => setTimeFilter({ scope: choice })}
              >
                {choice === 'page' ? t('time.inPage', { page: pageLabel }) : t('time.everywhere')}
              </button>
            ))}
          </div>
          <div className="timescope" role="group" aria-label={t('time.sort')}>
            {(['duration', 'priority'] as const).map((choice) => (
              <button
                key={choice}
                aria-pressed={sort === choice}
                className={sort === choice ? 'on' : undefined}
                onClick={() => setTimeFilter({ sort: choice })}
              >
                {t(choice === 'duration' ? 'time.sortDuration' : 'time.sortPriority')}
              </button>
            ))}
          </div>
        </div>

        </div>

        {result === null || minutes === null ? (
          <p className="timehint">{t('time.pick')}</p>
        ) : (
          <>
            {result.count > 0 && (
              <p className="timesummary" aria-live="polite">
                {t('time.summary', {
                  count: result.count,
                  duration: formatDuration(minutes, locale),
                  total: formatDuration(result.minutes, locale),
                })}
              </p>
            )}

            {ordered.length > 0 && (
              <div className="timelist">
                {ordered.map(({ item, when }) => (
                  <TimeRow key={item.id} item={item} when={when} onOpen={onOpen} />
                ))}
              </div>
            )}

            {result.count === 0 && (
              <p className="timenothing">
                {t('time.nothing', { duration: formatDuration(minutes, locale) })}
                {next !== null && ` ${t('time.tryNext', { duration: formatDuration(next, locale) })}`}
              </p>
            )}

            {result.setAside.length > 0 && (
              <p className="timefoot">
                {t('time.setAside', { count: result.setAside.length })}
                {' · '}
                <button className="btn sm linklike" onClick={() => onUnestimated(result.setAside)}>
                  {t('time.estimateThem')}
                </button>
              </p>
            )}
          </>
        )}
      </div>
    </aside>,
    document.body,
  );
}

/**
 * A result: a compact row, small enough for a narrow column.
 *
 * The checkbox, the title, where it lives as a second line and its time on the
 * right. It is a row like any other for what matters: ticking it, opening it,
 * picking it with Cmd or Shift, and walking the list with the arrow keys all
 * work, because the keyboard finds rows by `data-task-id` and this one has it.
 */
function TimeRow({ item, when, onOpen }: { item: Item; when: FitBucketKey; onOpen: (id: string) => void }) {
  const { t, locale } = useT();
  const { childrenOf } = useData();
  const snapshot = useStore((s) => s.snapshot);
  const toggleTask = useStore((s) => s.toggleTask);
  const picked = useStore((s) => s.selection.includes(item.id));
  const toggleSelection = useStore((s) => s.toggleSelection);
  const selectionAnchor = useStore((s) => s.selectionAnchor);
  const setSelectionAnchor = useStore((s) => s.setSelectionAnchor);
  const selectRange = useStore((s) => s.selectRange);
  const [settling, setSettling] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  /* The same pause a ticked row has anywhere else: the box fills, and the
     task leaves a moment later, so a wrong click is not simply a vanished row. */
  const complete = () => {
    if (settling) return;
    setSettling(true);
    timer.current = setTimeout(() => { void toggleTask(item.id); }, COMPLETION_LINGER_MS);
  };

  const counted = countedMinutes(item, childrenOf);
  /* An estimate worked out rather than written on the task is starred, as it
     is in the list: a sum of subtasks, or a quick tag counted as five. */
  const assumed = effectiveEstimate(item, childrenOf).minutes === null;
  const computed = effectiveEstimate(item, childrenOf).computed;
  const project = snapshot.projects[item.project_id];
  const section = item.section_id ? snapshot.sections[item.section_id] : undefined;
  const where = [t(BUCKET_TITLE[when]), [project?.name, section?.name].filter(Boolean).join(' / ')]
    .filter(Boolean).join(' · ');

  const pickRange = (additive: boolean) => {
    const ids = [...new Set(
      [...document.querySelectorAll<HTMLElement>('.timepanel [data-task-id]')]
        .map((row) => row.dataset.taskId)
        .filter((id): id is string => Boolean(id)),
    )];
    const from = selectionAnchor ? ids.indexOf(selectionAnchor) : -1;
    const to = ids.indexOf(item.id);
    if (from < 0 || to < 0) { selectRange([item.id], additive); return; }
    const range = ids.slice(Math.min(from, to), Math.max(from, to) + 1);
    selectRange(to < from ? [...range].reverse() : range, additive);
  };

  return (
    <div
      className={`timerow${settling ? ' done settling' : ''}${picked ? ' picked' : ''}`}
      role="button"
      tabIndex={-1}
      data-task-id={item.id}
      aria-selected={picked || undefined}
      onMouseDown={(e) => { if (e.shiftKey || e.metaKey || e.ctrlKey) e.preventDefault(); }}
      onClick={(e) => {
        if ((e.target as Element).closest('a[href]')) return;
        if (e.shiftKey) {
          e.preventDefault();
          e.currentTarget.focus({ preventScroll: true });
          pickRange(e.metaKey || e.ctrlKey);
          return;
        }
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          e.currentTarget.focus({ preventScroll: true });
          toggleSelection(item.id);
          return;
        }
        setSelectionAnchor(item.id);
        onOpen(item.id);
      }}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (e.shiftKey) { pickRange(e.metaKey || e.ctrlKey); return; }
          if (e.metaKey || e.ctrlKey) { toggleSelection(item.id); return; }
          setSelectionAnchor(item.id);
          onOpen(item.id);
        }
      }}
    >
      <span
        className={`check p${toDisplayPriority(item.priority)}`}
        role="checkbox"
        aria-checked={settling}
        aria-label={t('task.complete')}
        tabIndex={-1}
        onClick={(e) => { e.stopPropagation(); complete(); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            complete();
          }
        }}
      >
        <Icon name="check" />
      </span>
      <span className="timemain">
        <span
          className="ttitle"
          dangerouslySetInnerHTML={{ __html: renderTitle(displayTaskContent(item)) }}
        />
        {where && <span className="timewhere">{where}</span>}
      </span>
      {counted !== null && (
        <span
          className="timeest"
          title={assumed ? t('time.assumed') : computed ? t('task.computedEstimate') : undefined}
        >
          {formatDuration(counted, locale)}
          {(assumed || computed) && '*'}
        </span>
      )}
    </div>
  );
}
