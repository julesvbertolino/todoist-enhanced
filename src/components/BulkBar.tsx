import { useCreateTag } from '@/hooks/useCreateTag';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { EstimateField } from './EstimateField';
import { Icon, type IconName } from './Icon';
import { DatePicker, taskShortcuts } from './DatePicker';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import { useConfirm } from './overlays/Confirm';
import { markerStyle } from '@/domain/colors';
import { BULK_MENU_EVENT, type BulkMenuName } from '@/hooks/useKeyboard';
import { toDisplayPriority, toTodoistPriority, type DisplayPriority } from '@/domain/types';
import type { DropTarget } from '@/domain/dnd';
import { matchesSearch } from '@/domain/search';
import { formatDayOrName, formatTime } from '@/domain/dates';
import { byChildOrder, byLabelOrder, bySectionOrder } from '@/domain/orderKey';

/**
 * One button in the bar, and the panel it opens.
 *
 * Every property a selection can be changed by gets the same control: an icon,
 * the name of the property, and a panel above the bar — above, because the bar
 * itself is pinned to the foot of the window and a menu dropping out of it
 * would open off the bottom of the page. It closes on a click outside and on
 * Escape, and the Escape it swallows is its own: the one that clears the
 * selection belongs to the bar, and should not also throw the menu away.
 */
function BulkMenu({
  icon, label, name, children,
}: {
  icon: IconName;
  label: string;
  /** Which keyboard request opens this panel (T for date, V for move). */
  name?: BulkMenuName;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  /** Where the focus was when the panel opened, to give it back on closing. */
  const opener = useRef<HTMLElement | null>(null);
  /** Closes the panel and, from the keys, hands the focus straight back. */
  const closeFromKeys = () => {
    const back = opener.current;
    if (back?.isConnected) back.focus({ preventScroll: true });
    setOpen(false);
  };

  /** Opened by a key, so the panel takes the focus once it is drawn. */
  const focusOnOpen = useRef(false);

  const panelItems = (): HTMLElement[] => {
    const panel = ref.current?.querySelector('.bulkpop');
    return panel
      ? [...panel.querySelectorAll<HTMLElement>('input, button:not([disabled])')]
        .filter((item) => item.offsetParent !== null)
      : [];
  };

  useEffect(() => {
    if (!open || !focusOnOpen.current) return;
    focusOnOpen.current = false;
    const panel = ref.current?.querySelector('.bulkpop');
    if (panel && !panel.contains(document.activeElement)) panelItems()[0]?.focus();
  }, [open]);

  /* Opened from the keyboard, the panel takes the focus: its own field when it
     has one (Move's search already asks for it), otherwise its first choice. */
  useEffect(() => {
    if (!name) return;
    const onAsk = (event: Event) => {
      if ((event as CustomEvent<BulkMenuName>).detail !== name) return;
      opener.current = document.activeElement as HTMLElement | null;
      focusOnOpen.current = true;
      setOpen(true);
    };
    window.addEventListener(BULK_MENU_EVENT, onAsk);
    return () => window.removeEventListener(BULK_MENU_EVENT, onAsk);
  }, [name]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (ref.current?.contains(target)) return;
      /* DateField is portalled to the document body so the bar cannot clip
         its calendar. It is still part of this menu: clicking its typing
         field must not close the menu, unmount the field and hand the next
         letter to the app-wide search shortcut. */
      if (target?.closest('.datepanel')) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      /* Up or Down with the focus still outside (on the task, or on the bar's
         button after a click) steps into the panel. */
      const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
      const panel = ref.current?.querySelector('.bulkpop');
      if (step !== 0 && panel && !panel.contains(e.target as Node)) {
        const items = panelItems();
        if (items.length === 0) return;
        e.preventDefault();
        e.stopPropagation();
        items[step > 0 ? 0 : items.length - 1].focus();
      }
    };
    /*
     * Escape closes the whole panel, in one press, from wherever the focus
     * is inside it — including the Date panel's own typed field.
     *
     * That field is a DateField, self-contained everywhere else it is used,
     * and its own Escape handling calls `stopPropagation` on purpose: it is
     * one layer of a dialog elsewhere (TaskDetail), and one Escape should
     * only ever close the layer the focus is actually on. Here the field is
     * the whole content of a small dropdown, not a layer of anything, and a
     * `stopPropagation` a few DOM levels down a React tree stops the native
     * event before it ever reaches a plain `document.addEventListener` —
     * React's own delegated listener sits below `document`, and calling
     * `stopPropagation` there keeps the event from climbing any further.
     * Caught here in the capture phase, this runs before that ever happens.
     */
    const onEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      /* Caught here, this is the only handler this key reaches: capturing on
         `document` fires before the event can travel down to the field and
         back up, so nothing downstream is left to also act on it (the
         selection's own Escape included). */
      e.stopPropagation();
      closeFromKeys();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    document.addEventListener('keydown', onEscape, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('keydown', onEscape, true);
      /* Closing takes the focused choice with it, and the cursor with that:
         the next key then opened the search instead of acting on the tasks.
         The focus goes back where it came from, when that is still there. */
      const back = opener.current;
      opener.current = null;
      window.setTimeout(() => {
        const lost = !document.activeElement || document.activeElement === document.body;
        if (lost && back?.isConnected) back.focus({ preventScroll: true });
      }, 0);
    };
  }, [open]);

  /**
   * The keyboard inside the panel. Up and Down walk every choice — the search
   * field, the options, the tag boxes, the date field — and wrap; Enter and
   * Space are the focused control's own. Escape closes the panel even from a
   * field that keeps its other keys to itself (Move's search). Caught on the
   * way down, before those fields see the key, and only for what is really in
   * the panel: the date field's calendar is drawn elsewhere and has keys of
   * its own.
   */
  const onPanelKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const panel = event.currentTarget;
    const target = event.target as Node;
    if (!panel.contains(target)) return;
    /* The date picker walks its own field, choices and month (#110); only
       Escape, which closes the whole panel, is the panel's. */
    if (event.key !== 'Escape' && (target as Element).closest?.('.datepicker')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeFromKeys();
      return;
    }
    const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    if (step === 0) return;
    const items = panelItems();
    if (items.length === 0) return;
    event.preventDefault();
    event.stopPropagation();
    const at = items.indexOf(document.activeElement as HTMLElement);
    const next = at < 0 ? (step > 0 ? 0 : items.length - 1) : (at + step + items.length) % items.length;
    items[next].focus();
    items[next].scrollIntoView({ block: 'nearest' });
  };

  return (
    <div className="bulkmenu" ref={ref}>
      <button
        className="btn sm"
        aria-expanded={open}
        onClick={() => {
          if (!open) opener.current = document.activeElement as HTMLElement | null;
          setOpen((v) => !v);
        }}
      >
        <Icon name={icon} size="sm" />
        {label}
        <Icon name="caret" size="sm" />
      </button>
      {open && (
        <div className="popover bulkpop" role="menu" aria-label={label} onKeyDownCapture={onPanelKey}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function BulkEstimateEditor({ onSave, onClose }: { onSave: (minutes: number | null) => void; onClose: () => void }) {
  const { t } = useT();
  const [minutes, setMinutes] = useState<number | null>(null);
  return <div className="bulk-estimate" onKeyDownCapture={(event) => {
    if (event.key === 'Enter' && event.target instanceof HTMLInputElement && minutes !== null) {
      event.preventDefault(); event.stopPropagation(); onSave(minutes); onClose();
    }
  }}>
    <p className="menuhint">{t('estimates.inputHint')}</p>
    <EstimateField minutes={null} placeholder={t('task.estimatePlaceholder')} unitLabel="min / h" inputMode="text" autoFocus onChange={setMinutes} onCommit={setMinutes} onCancel={onClose} />
    <button className="btn primary" disabled={minutes === null} onClick={() => { onSave(minutes); onClose(); }}>{t('estimates.applySelection')}</button>
    <button className="opt" onClick={() => { onSave(null); onClose(); }}>{t('estimates.clear')}</button>
  </div>;
}

/**
 * What to do with the tasks you picked out.
 *
 * It exists only while something is selected, and it stays in one place at the
 * foot of the window rather than following the rows around: a bar that moves
 * is a bar you have to find again after every change. Each button is the same
 * change the drop table already defines, applied to the whole set as one
 * request with one undo — the selection was one decision, so taking it back
 * should be one too.
 *
 * One button per property rather than a row of date shortcuts: a date was the
 * only thing a selection could be given, so moving fifteen tasks to a project,
 * or taking one tag off all of them, meant opening fifteen tasks.
 */
export function BulkBar() {
  const { t, locale } = useT();
  const confirm = useConfirm();
  const dateFormat = useStore((s) => s.prefs.dateFormat);
  const hour12 = useStore((s) => s.prefs.hour12);
  const selection = useStore((s) => s.selection);
  const clearSelection = useStore((s) => s.clearSelection);
  const sendManyTo = useStore((s) => s.sendManyTo);
  const removeTasks = useStore((s) => s.removeTasks);
  const setEstimates = useStore((s) => s.setEstimates);
  const updateMany = useStore((s) => s.updateMany);
  const moveMany = useStore((s) => s.moveMany);
  const skipOccurrences = useStore((s) => s.skipOccurrences);
  const toast = useStore((s) => s.toast);
  const snapshot = useStore((s) => s.snapshot);
  const [projectQuery, setProjectQuery] = useState('');
  const [tagQuery, setTagQuery] = useState('');
  const newTag = useCreateTag(tagQuery);

  /* The bar and the toasts share the foot of the window, and the toast that
     answers a bulk action used to land on the very buttons the next one needs.
     The bar says how much of the window it takes, and the toasts stand on it
     (see `.toasts`); with no bar the variable is gone and they sit where they
     always have. Measured rather than assumed: on a phone the bar wraps, and
     the tags panel stays open while tags are ticked one after another, so an
     open panel counts as part of the bar. */
  const unmeasure = useRef<(() => void) | null>(null);
  const measureBar = useCallback((node: HTMLDivElement | null) => {
    unmeasure.current?.();
    unmeasure.current = null;
    const root = document.documentElement.style;
    if (!node) { root.removeProperty('--bulkbar-room'); return; }
    const place = () => {
      const top = Math.min(
        node.getBoundingClientRect().top,
        ...[...node.querySelectorAll('.bulkpop')].map((pop) => pop.getBoundingClientRect().top),
      );
      root.setProperty('--bulkbar-room', `${Math.ceil(window.innerHeight - top)}px`);
    };
    place();
    const resized = new ResizeObserver(place);
    resized.observe(node);
    const opened = new MutationObserver(place);
    opened.observe(node, { childList: true, subtree: true });
    window.addEventListener('resize', place);
    unmeasure.current = () => {
      resized.disconnect();
      opened.disconnect();
      window.removeEventListener('resize', place);
    };
  }, []);

  if (selection.length === 0) return null;

  const count = selection.length;
  const picked = selection.map((id) => snapshot.items[id]).filter(Boolean);
  const recurringCount = picked.filter((item) => item.due?.is_recurring).length;

  const send = async (target: DropTarget, destination: string) => {
    const ids = selection;
    clearSelection();
    await sendManyTo(ids, target, destination);
  };

  const remove = async () => {
    const ids = selection;
    const ok = await confirm({
      /* Plural, because the body is: asking "delete this task?" over a list
         of three is the dialog disagreeing with itself. */
      title: t(ids.length > 1 ? 'task.deleteTitleMany' : 'task.deleteTitle'),
      body: t('bulk.deleteConfirm', { count: ids.length }),
      confirmLabel: t('task.delete'),
      destructive: true,
    });
    if (!ok) return;
    clearSelection();
    await removeTasks(ids);
  };

  const projects = Object.values(snapshot.projects)
    .filter((p) => !p.is_archived && !p.is_deleted && !p.is_folder)
    .sort(byChildOrder);
  const sections = Object.values(snapshot.sections)
    .filter((section) => !section.is_archived && !section.is_deleted)
    .sort(bySectionOrder);
  const destinations = projects.flatMap((project) => {
    const projectName = project.inbox_project ? t('nav.inbox') : project.name;
    return [
      {
        key: `project:${project.id}`,
        projectId: project.id,
        sectionId: null as string | null,
        label: projectName,
        search: projectName,
        color: project.color,
        section: false,
        projectName,
      },
      ...sections
        .filter((section) => section.project_id === project.id)
        .map((section) => ({
          key: `section:${section.id}`,
          projectId: project.id,
          sectionId: section.id as string | null,
          label: section.name || t('section.untitled'),
          search: `${projectName} ${section.name}`,
          color: project.color,
          section: true,
          projectName,
        })),
    ];
  });
  const filteredDestinations = destinations.filter((destination) =>
    matchesSearch(destination.search, projectQuery));

  /* Only the tags in play, plus every tag that exists: the point of the panel
     is usually to take one off, and the ones already on the selection are the
     answer to that. Estimates are labels too, and are not tags — they have a
     field of their own everywhere else in the app. */
  const tags = Object.values(snapshot.labels)
    .filter((l) => !l.is_deleted && !l.name.startsWith('est-'))
    .sort(byLabelOrder);
  const filteredTags = tags.filter((label) => matchesSearch(label.name, tagQuery));

  /** How many of the selected tasks carry this tag: none, some, or all. */
  const tagState = (name: string): 'none' | 'some' | 'all' => {
    const on = picked.filter((item) => item.labels.includes(name)).length;
    return on === 0 ? 'none' : on === picked.length ? 'all' : 'some';
  };

  const setTag = (name: string, on: boolean) => {
    const ids = selection;
    void updateMany(
      ids,
      (item) => {
        const has = item.labels.includes(name);
        if (has === on) return null;
        return {
          labels: on ? [...item.labels, name] : item.labels.filter((l) => l !== name),
        };
      },
      t(on ? 'bulk.tagAdded' : 'bulk.tagRemoved', { count: ids.length, name }),
    );
  };

  /* The selection stays: a priority moves nothing off the page, and the next
     change is usually for the same tasks. */
  const setPriority = (priority: DisplayPriority) => {
    const ids = selection;
    void updateMany(
      ids,
      (item) =>
        toDisplayPriority(item.priority) === priority
          ? null
          : { priority: toTodoistPriority(priority) },
      t('bulk.prioritySet', { count: ids.length, priority: `P${priority}` }),
    );
  };

  async function createAndSetTag() {
    const ids = [...selection];
    const name = await newTag.create();
    if (name) {
      await updateMany(ids, (item) => item.labels.includes(name) ? null : { labels: [...item.labels, name] }, t('bulk.labels'));
      setTagQuery('');
    }
  }

  return (
    <div ref={measureBar} className="bulkbar" role="toolbar" aria-label={t('bulk.title')}>
      <strong>{t('bulk.count', { count })}</strong>
      <span className="sep" aria-hidden="true" />

      <BulkMenu icon="calendar" label={t('bulk.date')} name="date">
        {(close) => (
          /* The one date picker (#110): the same field, choices and month as
             a row's schedule menu, acting on the whole selection. */
          <DatePicker
            value=""
            label={t('task.schedule')}
            withTime
            onEscape={close}
            onPick={(iso) => {
              close();
              /* A time typed with the day goes to every task: cutting the value
                 down to its day here was the second place it got lost (#143). */
              const [day, time] = iso.split('T');
              const date = new Date(`${day}T00:00:00`);
              const where = formatDayOrName(date, locale, dateFormat);
              void send(
                { kind: 'day', date, time },
                time ? `${where} ${formatTime(new Date(iso), locale, hour12)}` : where,
              );
            }}
            shortcuts={taskShortcuts(t, locale, {
              today: () => { close(); void send({ kind: 'today' }, t('common.today')); },
              day: (date, label) => { close(); void send({ kind: 'day', date }, label); },
              anytime: () => { close(); void send({ kind: 'anytime' }, t('nav.week')); },
              someday: () => { close(); void send({ kind: 'someday' }, t('nav.someday')); },
            })}
            footer={recurringCount > 0 ? (
              <button
                type="button"
                className="opt"
                onClick={() => {
                  const ids = selection;
                  close();
                  clearSelection();
                  void skipOccurrences(ids).then((skipped) => {
                    if (skipped > 0) toast(t('bulk.skippedRecurring', { count: skipped }));
                  });
                }}
              >
                <span><Icon name="repeat" size="sm" /> {t('task.nextOccurrence')}</span>
                <small>{t('bulk.recurringSubset', { count: recurringCount })}</small>
              </button>
            ) : undefined}
          />
        )}
      </BulkMenu>

      <BulkMenu icon="clock" label={t('detail.estimate')}>
        {(close) => <BulkEstimateEditor onClose={close} onSave={(minutes) => void setEstimates(selection.map((id) => ({ id, minutes })))} />}
      </BulkMenu>

      <BulkMenu icon="project" label={t('bulk.move')} name="move">
        {(close) => (
          <div className="bulkpop-list">
            <div className="pickersearch">
              <Icon name="search" size="sm" />
              <input
                autoFocus
                value={projectQuery}
                placeholder={t('nav.search')}
                aria-label={t('nav.search')}
                onChange={(event) => setProjectQuery(event.target.value)}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (event.key === 'Enter' && filteredDestinations[0]) {
                    event.preventDefault();
                    const destination = filteredDestinations[0];
                    const ids = selection;
                    const name = destination.section
                      ? `${destination.projectName} / ${destination.label}`
                      : destination.label;
                    close();
                    setProjectQuery('');
                    clearSelection();
                    void moveMany(ids, {
                      project_id: destination.projectId,
                      section_id: destination.sectionId,
                    }, name);
                  }
                }}
              />
            </div>
            {filteredDestinations.length === 0 && <p className="menuhint">{t('search.noResults')}</p>}
            {filteredDestinations.map((destination) => (
              <button
                key={destination.key}
                className={`opt${destination.section ? ' sectionopt' : ''}`}
                onClick={() => {
                  const ids = selection;
                  const name = destination.section
                    ? `${destination.projectName} / ${destination.label}`
                    : destination.label;
                  close();
                  setProjectQuery('');
                  clearSelection();
                  void moveMany(ids, {
                    project_id: destination.projectId,
                    section_id: destination.sectionId,
                  }, name);
                }}
              >
                <span className="bulkdest">
                  {destination.section
                    ? <Icon name="section" size="sm" />
                    : <span className="hash" style={markerStyle(destination.color)}>#</span>}
                  <span className="bulkdest-label">{destination.label}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </BulkMenu>

      <BulkMenu icon="tag" label={t('bulk.labels')}>
        {() => (
          <>
            <div className="pickersearch">
              <Icon name="search" size="sm" />
              <input
                autoFocus
                value={tagQuery}
                placeholder={t('nav.search')}
                aria-label={t('nav.search')}
                onChange={(event) => setTagQuery(event.target.value)}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (event.key === 'Enter' && newTag.available) {
                    event.preventDefault(); void createAndSetTag();
                  } else if (event.key === 'Enter' && filteredTags[0]) {
                    event.preventDefault();
                    const first = filteredTags[0];
                    setTag(first.name, tagState(first.name) !== 'all');
                  }
                }}
              />
            </div>
            <div className="bulkpop-list">
              {newTag.available && <button className="opt" disabled={newTag.busy} onClick={() => void createAndSetTag()}><Icon name="plus" size="sm" />{t('estimates.createTag', { name: newTag.name })}</button>}
              {tags.length === 0 && <p className="menuhint">{t('labels.none')}</p>}
              {tags.length > 0 && filteredTags.length === 0 && <p className="menuhint">{t('search.noResults')}</p>}
              {filteredTags.map((label) => {
                const state = tagState(label.name);
                return (
                  <label className="checkrow" key={label.id}>
                    <input
                      type="checkbox"
                      checked={state === 'all'}
                      /* Some of them, not all: the box says so rather than
                         pretending the answer is no, and clicking it puts the
                         tag on the ones that are missing it. */
                      ref={(node) => { if (node) node.indeterminate = state === 'some'; }}
                      onChange={() => setTag(label.name, state !== 'all')}
                    />
                    <Icon name="tag" size="sm" className="taglabel" style={markerStyle(label.color, false)} />
                    <span>{label.name}</span>
                  </label>
                );
              })}
            </div>
          </>
        )}
      </BulkMenu>

      <BulkMenu icon="flag" label={t('bulk.priority')}>
        {(close) => (
          <>
            {([1, 2, 3, 4] as const).map((p) => (
              <button
                key={p}
                className="opt"
                onClick={() => { close(); setPriority(p); }}
              >
                <span>
                  <Icon name="flag" size="sm" className={`bulkflag p${p}`} />
                  {`P${p}`}
                </span>
              </button>
            ))}
          </>
        )}
      </BulkMenu>

      <span className="sep" aria-hidden="true" />
      <button className="btn sm danger" onClick={() => void remove()}>
        <Icon name="close" size="sm" />
        {t('task.delete')}
      </button>
      <button className="btn sm quiet" onClick={clearSelection}>
        {t('bulk.clear')}
      </button>
    </div>
  );
}
