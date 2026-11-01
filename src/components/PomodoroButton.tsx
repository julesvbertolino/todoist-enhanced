import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Pause, Play, Timer } from 'lucide-react';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import { usePomodoro } from '@/store/pomodoro';
import { usePomodoroNow } from '@/hooks/usePomodoroClock';
import { FOCUS_MS, formatClock, progressAt, remainingAt } from '@/domain/pomodoro';
import { displayTaskContent } from '@/domain/types';

/** The ring that fills as the session goes: the pill's own picture of the time. */
function Ring({ progress }: { progress: number }) {
  const length = 2 * Math.PI * 8;
  return (
    <svg className="pomo-ring" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
      <circle cx="10" cy="10" r="8" className="ring-track" />
      <circle cx="10" cy="10" r="8" className="ring-value" strokeDasharray={length} strokeDashoffset={length * (1 - progress)} />
    </svg>
  );
}

/**
 * The Pomodoro control of a page's toolbar, and of an open task.
 *
 * One pill in three states: ready ("25 min"), running (the ring, the time and
 * pause side by side) and paused. From a page it starts a free session; from a
 * task, a session attached to that task. It is the same timer either way.
 */
export function PomodoroButton({ taskId = null }: { taskId?: string | null }) {
  const { t } = useT();
  const display = useStore((s) => s.prefs.pomodoroDisplay);
  const timer = usePomodoro((s) => s.timer);
  const owner = taskId ?? 'page';
  const popover = usePomodoro((s) => s.popover === owner);
  const { start, togglePause, setPopover, setFullscreen } = usePomodoro.getState();
  const now = usePomodoroNow();
  const wrap = useRef<HTMLSpanElement>(null);
  /* A task's pill shows its own session. Another session, free or on another
     task, is not this task's: the pill offers a new one here instead. */
  const active = timer.status !== 'idle' && (taskId === null || timer.taskId === taskId);
  const paused = timer.status === 'paused';

  useEffect(() => {
    if (!popover) return;
    const away = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!wrap.current?.contains(target) && !target.closest('.pomo-popover')) usePomodoro.getState().setPopover(null);
    };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') usePomodoro.getState().setPopover(null); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', key); };
  }, [popover]);

  if (!active) {
    return (
      <span className="pomo-control" ref={wrap}>
        <button
          type="button"
          className="pomo-main"
          aria-label={taskId ? t('pomodoro.startTask') : t('pomodoro.start')}
          title={taskId ? t('pomodoro.startTask') : t('pomodoro.start')}
          onClick={() => start(taskId, display === 'fullscreen')}
        >
          <Timer size={15} strokeWidth={1.7} aria-hidden="true" />
          <span>{t('pomodoro.minutes', { count: FOCUS_MS / 60_000 })}</span>
        </button>
      </span>
    );
  }

  const time = formatClock(remainingAt(timer, now));
  return (
    <span className={`pomo-control is-running${paused ? ' is-paused' : ''}${timer.status === 'done' ? ' is-done' : ''}`} ref={wrap}>
      <button
        type="button"
        className="pomo-main"
        aria-expanded={popover}
        aria-label={t('pomodoro.open')}
        title={t('pomodoro.open')}
        onClick={() => setPopover(popover ? null : owner)}
      >
        <Ring progress={timer.status === 'done' ? 1 : progressAt(timer, now)} />
        <span className="pomo-time">{time}</span>
      </button>
      <button
        type="button"
        className="pomo-pause"
        aria-label={timer.status === 'done' ? t('pomodoro.startBreak') : paused ? t('pomodoro.resume') : t('pomodoro.pause')}
        title={timer.status === 'done' ? t('pomodoro.startBreak') : paused ? t('pomodoro.resume') : t('pomodoro.pause')}
        onClick={() => (timer.status === 'done' ? usePomodoro.getState().startBreak() : togglePause())}
      >
        {paused || timer.status === 'done' ? <Play size={14} strokeWidth={1.7} /> : <Pause size={14} strokeWidth={1.7} />}
      </button>
      {popover && createPortal(<SessionPopover anchor={wrap.current} onFullscreen={() => setFullscreen(true)} />, document.body)}
    </span>
  );
}

function SessionPopover({ anchor, onFullscreen }: { anchor: HTMLElement | null; onFullscreen: () => void }) {
  const { t } = useT();
  const timer = usePomodoro((s) => s.timer);
  const now = usePomodoroNow();
  const linked = useStore((s) => (timer.taskId ? s.snapshot.items[timer.taskId] : undefined));
  const phase = timer.status === 'done'
    ? t('pomodoro.phase.done')
    : timer.status === 'paused' ? t('pomodoro.phase.paused')
    : timer.kind === 'break' ? t('pomodoro.phase.break') : t('pomodoro.phase.focus');
  /* Fixed to the window, so a header that clips its children cannot hide it. */
  const rect = anchor?.getBoundingClientRect();
  const place = rect ? { top: rect.bottom + 8, right: Math.max(12, window.innerWidth - rect.right) } : undefined;
  return (
    <div className="pomo-popover" role="dialog" aria-label={t('pomodoro.session')} style={place}>
      <button type="button" className="pomo-popover-expand iconbtn" aria-label={t('pomodoro.fullscreen')} title={t('pomodoro.fullscreen')} onClick={onFullscreen}>
        <Maximize2 size={15} />
      </button>
      <div className="pomo-popover-time">{formatClock(remainingAt(timer, now))}</div>
      <span className="pomo-popover-phase">{phase}</span>
      {linked
        ? <strong className="pomo-popover-task">{displayTaskContent(linked)}</strong>
        : <p className="pomo-popover-free">{t('pomodoro.noTask')}</p>}
      <div className="pomo-popover-actions">
        <button type="button" className="btn primary" onClick={() => (timer.status === 'done' ? usePomodoro.getState().startBreak() : usePomodoro.getState().togglePause())}>
          {timer.status === 'paused' || timer.status === 'done' ? <Play size={14} /> : <Pause size={14} />}
          {timer.status === 'done' ? t('pomodoro.startBreak') : timer.status === 'paused' ? t('pomodoro.resume') : t('pomodoro.pause')}
        </button>
        <button type="button" className="btn" onClick={() => usePomodoro.getState().end()}>{t('pomodoro.end')}</button>
      </div>
    </div>
  );
}
