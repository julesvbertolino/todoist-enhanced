import { useDataSnapshot } from '@/hooks/useDataSnapshot';
import { useEffect, useMemo, useState } from 'react';
import { Overlay } from './Overlay';
import { Icon } from '../Icon';
import { useStore } from '@/store/store';
import { useT } from '@/hooks/useT';
import { planEstimateConversion, type EstimateConversion as Plan } from '@/domain/estimate-conversion';
import { canStoreDurations } from '@/domain/estimates';
import { updateItem } from '@/api/commands';
import { readQueue } from '@/db/idb';
import { patchItem } from '@/store/helpers';
import { plainTitle } from '@/domain/markdown';
import type { EstimateStorage, Item } from '@/domain/types';

type JobState = 'ready' | 'running' | 'done' | 'queued' | 'failed';
type Job = { state: JobState; uuid?: string };
function matches(item: Item | undefined, patch: Plan['changes'][number]['patch']) {
  return Boolean(item && Object.entries(patch).every(([key, value]) => key === 'labels'
    ? JSON.stringify([...item.labels].sort()) === JSON.stringify([...(value as string[])].sort())
    : JSON.stringify(item[key as keyof Item]) === JSON.stringify(value)));
}

/** Each conversion owns its command ids; unrelated queued edits cannot colour its result. */
export function EstimateConversion({ target, openRequest = 0, hideTrigger = false }: { target: EstimateStorage; openRequest?: number; hideTrigger?: boolean }) {
  const { t } = useT();
  const snapshot = useDataSnapshot();
  const demo = useStore((s) => s.demo);
  const pendingCount = useStore((s) => s.pendingCount);
  const apply = useStore((s) => s.apply);
  const [previewTarget, setPreviewTarget] = useState(target);
  const [open, setOpen] = useState(false);
  const selectedTarget = open ? previewTarget : target;
  const plan = useMemo(() => planEstimateConversion(Object.values(snapshot.items), selectedTarget), [snapshot.items, selectedTarget]);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [jobs, setJobs] = useState<Record<string, Job>>({});
  const [submitted, setSubmitted] = useState<Plan | null>(null);
  const preview = submitted ?? plan;
  const allowed = selectedTarget === 'tag' || canStoreDurations(snapshot.user);

  useEffect(() => {
    if (!openRequest) return;
    setPreviewTarget(target); setFinished(false); setSubmitted(null); setJobs({}); setOpen(true);
  }, [openRequest, target]);

  // A queued result stays pending until these particular commands leave the outbox.
  useEffect(() => {
    if (!finished || demo || !submitted) return;
    let active = true;
    void readQueue().then((queue) => {
      if (!active) return;
      const queued = new Set(queue.map((cmd) => cmd.uuid));
      setJobs((previous) => {
        const next = { ...previous };
        for (const change of submitted.changes) {
          const job = previous[change.item.id];
          if (job?.state === 'queued' && job.uuid && !queued.has(job.uuid)) {
            next[change.item.id] = { ...job, state: matches(snapshot.items[change.item.id], change.patch) ? 'done' : 'failed' };
          }
        }
        return next;
      });
    }).catch(() => { /* keep the honest pending state if the outbox cannot be read */ });
    return () => { active = false; };
  }, [finished, demo, submitted, pendingCount, snapshot.items]);

  async function run() {
    if (running || !allowed) return;
    const current = planEstimateConversion(Object.values(useStore.getState().snapshot.items), selectedTarget);
    setSubmitted(current);
    setJobs(Object.fromEntries(current.changes.map(({ item }) => [item.id, { state: 'ready' }])));
    setRunning(true);
    setFinished(false);
    try {
      // Small batches give visible progress while read-back is bounded to four requests.
      for (let at = 0; at < current.changes.length; at += 20) {
        const changes = current.changes.slice(at, at + 20);
        const commands = changes.map(({ item, patch, minutes }) => ({
          ...updateItem(item.id, patch), ...(selectedTarget === 'duration' ? { estimateMinutes: minutes } : {}),
        }));
        setJobs((previous) => ({ ...previous, ...Object.fromEntries(changes.map(({ item }, i) => [item.id, { state: 'running', uuid: commands[i].uuid }])) }));
        await apply(commands, (state) => changes.reduce((s, change) => patchItem(s, change.item.id, change.patch), state));
        const state = useStore.getState();
        const queue = demo ? [] : await readQueue();
        const queued = new Set(queue.map((cmd) => cmd.uuid));
        setJobs((previous) => ({ ...previous, ...Object.fromEntries(changes.map(({ item, patch }, i) => [item.id, {
          uuid: commands[i].uuid,
          state: queued.has(commands[i].uuid) ? 'queued' : matches(state.snapshot.items[item.id], patch) ? 'done' : 'failed',
        }])) }));
        // If the account rejects durations, do not keep writing them to the remaining tasks.
        if (selectedTarget === 'duration' && state.prefs.estimateStorage === 'tag') break;

      }
    } catch {
      // Preserve completed rows; unstarted rows stay ready for a subsequent run.
      setJobs((previous) => Object.fromEntries(Object.entries(previous).map(([id, job]) => [id, job.state === 'running' ? { ...job, state: 'queued' } : job])));
    } finally { setRunning(false); setFinished(true); }
  }
  const count = (state: JobState) => Object.values(jobs).filter((job) => job.state === state).length;
  const done = count('done');
  const queued = count('queued');
  const failed = count('failed');
  return (
    <>
      {!hideTrigger && <button className="btn" disabled={!allowed || plan.changes.length === 0} onClick={() => { setPreviewTarget(target); setFinished(false); setSubmitted(null); setJobs({}); setOpen(true); }}>
        {t(target === 'duration' ? 'estimates.convertDuration' : 'estimates.convertTag', { count: plan.changes.length })}
      </button>}
      <Overlay open={open} onClose={() => { if (!running) setOpen(false); }} label={t('estimates.preview')} size="sm">
        <div className="sheet-head conversion-head"><h2>{t('estimates.preview')}</h2><p>{t('estimates.previewCount', { count: preview.changes.length, skipped: preview.skipped.length })}</p>
          {submitted && <><progress max={Math.max(1, preview.changes.length)} value={done + failed} aria-label={t('estimates.progress')} /><div role="status" aria-live="polite" className="conversion-summary">{t('estimates.progressCount', { done, total: preview.changes.length })}{queued > 0 && <span>{t('estimates.waitingCount', { count: queued })}</span>}{failed > 0 && <span>{t('estimates.failedCount', { count: failed })}</span>}</div></>}
        </div>
        <div className="sheet-body conversion-body">
          <details className="conversion-notes"><summary>{t('estimates.details', { count: preview.timed })}</summary><p>{t('estimates.timed', { count: preview.timed })}</p><p>{t('estimates.labelsHelp')}</p></details>
          <ul className="conversion-list">{preview.changes.map(({ item }) => {
            const state = jobs[item.id]?.state ?? 'ready';
            return <li key={item.id} data-state={state}><Icon name={state === 'done' ? 'check' : state === 'failed' ? 'warning' : state === 'running' ? 'repeat' : 'clock'} size="sm" className={state === 'running' ? 'conversion-spin' : undefined} /><span className="conversion-title">{plainTitle(item.content)}</span><small>{t(`estimates.state.${state}`)}</small></li>;
          })}{preview.skipped.map(({ item, reason }) => <li key={item.id} data-state="skipped"><Icon name="close" size="sm" /><span className="conversion-title">{plainTitle(item.content)}<small>{t(`estimates.skip.${reason}`)}</small></span><small>{t('estimates.state.skipped')}</small></li>)}</ul>
        </div>
        <div className="sheet-foot conversion-foot">
          {finished && <p>{t(queued > 0 ? 'estimates.queued' : 'estimates.converted', { count: queued > 0 ? queued : done })}</p>}
          <div><button className="btn" disabled={running} onClick={() => setOpen(false)}>{t('common.close')}</button>
          {!finished && <button className="btn primary" disabled={running || plan.changes.length === 0} onClick={() => void run()}>{running && <Icon name="repeat" size="sm" className="conversion-spin" />}{t(running ? 'common.loading' : 'estimates.run')}</button>}</div>
        </div>
      </Overlay>
    </>
  );
}
