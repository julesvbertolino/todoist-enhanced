import { useEffect, useState } from 'react';
import { Pause, Play, Timer, X } from 'lucide-react';
import { useT } from '@/hooks/useT';
import { useData } from '@/hooks/useData';
import { useStore } from '@/store/store';
import { usePomodoro } from '@/store/pomodoro';
import { usePomodoroNow } from '@/hooks/usePomodoroClock';
import { formatClock, remainingAt } from '@/domain/pomodoro';
import { colorValue } from '@/domain/colors';
import { displayTaskContent, type Item } from '@/domain/types';
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
  const phase = done ? t('pomodoro.phase.done') : paused ? t('pomodoro.phase.paused')
    : timer.kind === 'break' ? t('pomodoro.phase.break') : t('pomodoro.phase.focus');
  const controls = (
    <div className="pomo-fs-controls">
      <button type="button" className="btn primary" onClick={() => (done ? usePomodoro.getState().startBreak() : usePomodoro.getState().togglePause())}>
        {paused || done ? <Play size={15} /> : <Pause size={15} />}
        {done ? t('pomodoro.startBreak') : paused ? t('pomodoro.resume') : t('pomodoro.pause')}
      </button>
      <button type="button" className="btn" onClick={() => usePomodoro.getState().end()}>{t('pomodoro.end')}</button>
    </div>
  );
  const clock = (
    <div className="pomo-fs-timer">
      <div className="pomo-fs-digits" aria-live="off">{formatClock(remainingAt(timer, now))}</div>
      <span className="pomo-fs-phase">{phase}</span>
      {controls}
    </div>
  );

  return (
    <section className={`pomo-fs ${task ? 'linked' : 'free'}`} role="dialog" aria-modal="true" aria-label={t('pomodoro.focus')}>
      <header>
        <span><Timer size={15} />{t('pomodoro.focus')}</span>
        <button type="button" onClick={() => usePomodoro.getState().setFullscreen(false)}>
          {t('pomodoro.back')}<X size={15} />
        </button>
      </header>
      {task
        ? <div className="pomo-fs-body">{clock}<TaskPanel item={task} /></div>
        : <div className="pomo-fs-body">{clock}</div>}
    </section>
  );
}

function TaskPanel({ item }: { item: Item }) {
  const { t } = useT();
  const { childrenOf } = useData();
  const updateTask = useStore((s) => s.updateTask);
  const toggleTask = useStore((s) => s.toggleTask);
  const project = useStore((s) => s.snapshot.projects[item.project_id]);
  const [title, setTitle] = useState(displayTaskContent(item));
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(item.description);
  const subtasks = childrenOf(item.id);

  const stored = displayTaskContent(item);
  useEffect(() => { setTitle(stored); }, [item.id, stored]);
  useEffect(() => { if (!editing) setDescription(item.description); }, [item.description, editing]);

  const commitTitle = () => {
    const next = title.trim();
    if (!next) { setTitle(displayTaskContent(item)); return; }
    if (next !== displayTaskContent(item)) void updateTask(item.id, { content: next });
  };
  const commitDescription = () => {
    setEditing(false);
    if (description !== item.description) void updateTask(item.id, { description });
  };
  const tick = (line: number) => {
    const latest = useStore.getState().snapshot.items[item.id]?.description ?? item.description;
    const next = toggleItemAt(latest, line);
    if (next !== latest) void updateTask(item.id, { description: next });
  };

  return (
    <article className="pomo-fs-task">
      {project && (
        <div className="pomo-fs-project" style={{ color: colorValue(project.color) }}><span>#</span>{project.name}</div>
      )}
      <input
        className="pomo-fs-title"
        value={title}
        aria-label={t('detail.title')}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={commitTitle}
        onKeyDown={(event) => { if (event.key === 'Enter') (event.target as HTMLInputElement).blur(); }}
      />
      {editing ? (
        <DescriptionEditor
          value={description}
          onChange={setDescription}
          onCommit={commitDescription}
          placeholder={t('detail.descriptionPlaceholder')}
          ariaLabel={t('detail.description')}
          autoFocus
        />
      ) : (
        <div
          role="button"
          tabIndex={0}
          className={`descview${item.description ? '' : ' placeholder'}`}
          onClick={(event) => {
            if ((event.target as Element).closest('a[href], .checkitem input')) return;
            setEditing(true);
          }}
          onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setEditing(true); } }}
          aria-label={t('detail.description')}
        >
          {item.description ? <DescriptionView value={item.description} onToggle={tick} /> : t('detail.descriptionPlaceholder')}
        </div>
      )}
      {subtasks.length > 0 && (
        <>
          <h2 className="pomo-fs-label">{t('detail.subtasks')}</h2>
          {subtasks.map((child) => (
            <label className={`pomo-fs-sub${child.checked ? ' done' : ''}`} key={child.id}>
              <input type="checkbox" checked={child.checked} onChange={() => void toggleTask(child.id)} />
              <span className="pomo-fs-check" aria-hidden="true" />
              <span>{displayTaskContent(child)}</span>
            </label>
          ))}
        </>
      )}
    </article>
  );
}
