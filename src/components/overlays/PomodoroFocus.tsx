import { PomodoroActionIcon } from '../PomodoroActionIcon';
import { useEffect, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, LinkSquare02Icon, Timer01Icon } from '@hugeicons/core-free-icons';
import { useT } from '@/hooks/useT';
import { useData } from '@/hooks/useData';
import { useStore } from '@/store/store';
import { usePomodoro } from '@/store/pomodoro';
import { usePomodoroNow } from '@/hooks/usePomodoroClock';
import { displayMsAt, formatClock } from '@/domain/pomodoro';
import { colorValue } from '@/domain/colors';
import { displayTaskContent, toDisplayPriority, weekLabel, type Item, monthLabel } from '@/domain/types';
import { dueDate, formatRelativeDay } from '@/domain/dates';
import { effectiveEstimate, formatDuration } from '@/domain/estimates';
import { Icon } from '../Icon';
import { editSurfaceKeys } from '../editSurfaceKeys';
import { toggleItemAt } from '@/domain/checklist';
import { DescriptionEditor, DescriptionView } from '../Checklist';

/**
 * The timer taking the whole screen, in two versions.
 *
 * Started from a page it is only the timer. Started from a task it is the
 * timer on the left and the task on the right, and the task can be edited
 * there: title, description with its checklist, subtasks.
 */
export function PomodoroFocus() {
  const { t } = useT();
  const fullscreen = usePomodoro((s) => s.fullscreen);
  const timer = usePomodoro((s) => s.timer);
  const now = usePomodoroNow();
  const task = useStore((s) => (timer.taskId ? s.snapshot.items[timer.taskId] : undefined));

  useEffect(() => {
    if (!fullscreen) return;
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') usePomodoro.getState().setFullscreen(false); };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [fullscreen]);

  if (!fullscreen || timer.status === 'idle') return null;

  const paused = timer.status === 'paused';
  const done = timer.status === 'done';
  const nextKey = timer.kind === 'focus' ? 'pomodoro.startBreak' as const : 'pomodoro.startFocus' as const;
  const phase = done ? (timer.kind === 'break' ? t('pomodoro.phase.breakDone') : t('pomodoro.phase.done')) : paused ? t('pomodoro.phase.paused')
    : timer.kind === 'break' ? t('pomodoro.phase.break') : t('pomodoro.phase.focus');
  const controls = (
    <div className="pomo-fs-controls">
      <button type="button" className="btn primary" data-pomo-action={paused || done ? 'play' : 'pause'} onClick={() => (done ? usePomodoro.getState().startNext() : usePomodoro.getState().togglePause())}>
        <PomodoroActionIcon play={paused || done} size={15} />
        {done ? t(nextKey) : paused ? t('pomodoro.resume') : t('pomodoro.pause')}
      </button>
      <button type="button" className="btn" onClick={() => usePomodoro.getState().end()}>{t('pomodoro.end')}</button>
    </div>
  );
  const clock = (
    <div className="pomo-fs-timer">
      <div className="pomo-fs-digits" aria-live="off">{formatClock(displayMsAt(timer, now))}</div>
      <span className="pomo-fs-phase">{phase}</span>
      {controls}
    </div>
  );

  return (
    <section className={`pomo-fs ${task ? 'linked' : 'free'}`} role="dialog" aria-modal="true" aria-label={t('pomodoro.focus')}>
      <header>
        <span><HugeiconsIcon icon={Timer01Icon} size={15} />{t('pomodoro.focus')}</span>
        <button type="button" onClick={() => usePomodoro.getState().setFullscreen(false)}>
          {t('pomodoro.back')}<HugeiconsIcon icon={Cancel01Icon} size={15} />
        </button>
      </header>
      {task
        ? <div className="pomo-fs-body">{clock}<TaskPanel item={task} /></div>
        : <div className="pomo-fs-body">{clock}</div>}
    </section>
  );
}

function TaskPanel({ item }: { item: Item }) {
  const { t, locale } = useT();
  const { childrenOf } = useData();
  const updateTask = useStore((s) => s.updateTask);
  const toggleTask = useStore((s) => s.toggleTask);
  const project = useStore((s) => s.snapshot.projects[item.project_id]);
  const [title, setTitle] = useState(displayTaskContent(item));
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const [editing, setEditing] = useState(false);
  const [focusDescription, setFocusDescription] = useState(false);
  const [description, setDescription] = useState(item.description);
  const subtasks = childrenOf(item.id);
  const due = dueDate(item);
  const { minutes } = effectiveEstimate(item, childrenOf);
  /* The day it is planned for, said as a person would; or the horizon it is committed to. */
  const has = (name: string) => item.labels.some((l) => l.toLowerCase() === name.toLowerCase());
  const when = due ? formatRelativeDay(due, locale)
    : has(weekLabel()) ? t('review.to.anytime')
    : has(monthLabel()) ? t('review.to.month') : null;
  const priority = toDisplayPriority(item.priority);
  const stored = displayTaskContent(item);
  // Leaving focus mode must not discard an edit that is still open.
  const draft = useRef({ editing, title, description, item });
  draft.current = { editing, title, description, item };
  useEffect(() => () => {
    const current = draft.current;
    if (!current.editing) return;
    const next = current.title.trim();
    if (!next) return;
    const fields: Record<string, unknown> = {};
    if (next !== displayTaskContent(current.item)) fields.content = next;
    if (current.description !== current.item.description) fields.description = current.description;
    if (Object.keys(fields).length) void useStore.getState().updateTask(current.item.id, fields);
  }, []);
  useEffect(() => { if (!editing) setTitle(stored); }, [item.id, stored, editing]);
  useEffect(() => { if (!editing) setDescription(item.description); }, [item.description, editing]);

  const commitTitle = () => {
    const next = title.trim();
    if (!next) { setTitle(displayTaskContent(item)); return; }
    const fields: Record<string, unknown> = {};
    if (next !== displayTaskContent(item)) fields.content = next;
    if (description !== item.description) fields.description = description;
    draft.current.editing = false;
    if (Object.keys(fields).length) void updateTask(item.id, fields);
    setEditing(false);
  };
  const cancelEdit = () => { draft.current.editing = false; setTitle(displayTaskContent(item)); setDescription(item.description); setEditing(false); };
  const tick = (line: number) => {
    const latest = useStore.getState().snapshot.items[item.id]?.description ?? item.description;
    const next = toggleItemAt(latest, line);
    if (next !== latest) void updateTask(item.id, { description: next });
  };

  return (
    <article className="pomo-fs-task" onKeyDownCapture={(event) => { if (editing) editSurfaceKeys(event, titleRef.current); }}>
      <div className="pomo-fs-top">
        {project && (
          <div className="pomo-fs-project" style={{ color: colorValue(project.color) }}><span>#</span>{project.name}</div>
        )}
        <button type="button" className="pomo-fs-open" onClick={() => { usePomodoro.getState().setFullscreen(false); window.dispatchEvent(new CustomEvent('pomodoro:open-task', { detail: item.id })); }}>
          <HugeiconsIcon icon={LinkSquare02Icon} size={13} />{t('pomodoro.openTask')}
        </button>
      </div>
      <div className="pomo-fs-titlerow">
        <button type="button" className={`check p${priority}`} role="checkbox" aria-checked={item.checked} aria-label={t('task.complete')} onClick={() => void toggleTask(item.id)} />
        <textarea
          ref={titleRef}
          className="pomo-fs-title"
          rows={2}
          value={title}
          aria-label={t('detail.title')}
          onChange={(event) => setTitle(event.target.value.replace(/\n/g, ' '))}
          onFocus={() => { if (!editing) setFocusDescription(false); setEditing(true); }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancelEdit(); }
            if (event.key === 'Enter') { event.preventDefault(); commitTitle(); }
          }}
        />
      </div>
      {(when || minutes !== null) && (
        <p className="pomo-fs-meta">
          {when && <span><Icon name="calendar" size="sm" />{when}</span>}
          {minutes !== null && <span><Icon name="clock" size="sm" />{formatDuration(minutes, locale)}</span>}
        </p>
      )}
      <div className="pomo-fs-desc">
      {editing ? (
        <DescriptionEditor
          value={description}
          onChange={setDescription}
          onCommit={commitTitle}
          onCancel={cancelEdit}
          commitOnBlur={false}
          placeholder={t('detail.descriptionPlaceholder')}
          ariaLabel={t('detail.description')}
          autoFocus={focusDescription}
        />
      ) : (
        <div
          role="button"
          tabIndex={0}
          className={`descview${item.description ? '' : ' placeholder'}`}
          onClick={(event) => {
            if ((event.target as Element).closest('a[href], .checkitem input')) return;
            setFocusDescription(true); setEditing(true);
          }}
          onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setFocusDescription(true); setEditing(true); } }}
          aria-label={t('detail.description')}
        >
          {item.description ? <DescriptionView value={item.description} onToggle={tick} /> : t('detail.descriptionPlaceholder')}
        </div>
      )}
      {editing && <div className="titleactions"><button type="button" className="btn sm" onClick={cancelEdit}>{t('common.cancel')}</button><button type="button" className="btn sm primary" onClick={commitTitle}>{t('common.save')}</button></div>}
      </div>
      {subtasks.length > 0 && (
        <div className="pomo-fs-subs">
          <h2 className="pomo-fs-label">{t('detail.subtasks')}</h2>
          {subtasks.map((child) => (
            <label className={`pomo-fs-sub${child.checked ? ' done' : ''}`} key={child.id}>
              <input type="checkbox" checked={child.checked} onChange={() => void toggleTask(child.id)} />
              <span className="pomo-fs-check" aria-hidden="true" />
              <span>{displayTaskContent(child)}</span>
            </label>
          ))}
        </div>
      )}
    </article>
  );
}
