import { wedge } from './ProgressRing';

/** Project completion: outline when empty, a filling pie, and a full disc. */
export function ProjectProgress({ open, completed, label }: { open: number; completed: number | undefined; label: string }) {
  const total = completed === undefined ? 0 : open + completed;
  const ratio = total > 0 && completed !== undefined ? Math.min(1, Math.max(0, completed / total)) : null;
  // At sidebar size a very small remaining slice disappears. Keep it visible
  // until the project really is complete; the accessible count stays exact.
  const visibleRatio = ratio !== null && ratio > 0 && ratio < 1 ? Math.min(ratio, 0.85) : ratio;
  return <svg className="ic ic-sm project-progress" viewBox="0 0 20 20" role="img" aria-label={label} data-project-progress={ratio === null ? 'unknown' : `${completed}/${total}`}>
    <title>{label}</title>
    <circle className="project-progress-track" cx="10" cy="10" r="7" fill="none" strokeWidth="1.8" />
    {ratio !== null && ratio > 0 && (ratio >= 1
      ? <circle className="project-progress-fill" cx="10" cy="10" r="5.2" />
      : <path className="project-progress-fill" d={wedge(visibleRatio!, 10, 10, 5.2)} />)}
  </svg>;
}
