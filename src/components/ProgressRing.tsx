/**
 * How far along something is, drawn as in the design file: a track and an arc
 * on it from 12 o'clock, clockwise, in the accent colour and in the success
 * colour once everything is done (#156).
 *
 * Always next to the number it draws ("1/3"), never instead of it, so it is
 * decorative to a screen reader and the shape is never the only carrier of the
 * information. It takes the icon's box (`.ic`), so it sits wherever the
 * subtask icon it replaced did without moving the line.
 */
export function ProgressRing({ done, total, size, className }: {
  done: number;
  total: number;
  size?: 'sm';
  className?: string;
}) {
  if (total <= 0) return null;
  const ratio = Math.min(1, Math.max(0, done / total));
  const complete = ratio === 1;
  const classes = ['ic', size === 'sm' ? 'ic-sm' : '', 'progressring', complete ? 'complete' : '', className ?? '']
    .filter(Boolean).join(' ');
  return (
    <svg className={classes} viewBox="0 0 20 20" aria-hidden="true" data-progress={`${done}/${total}`}>
      <circle className="ring-track" cx="10" cy="10" r="7" fill="none" strokeWidth="2.5" />
      {ratio > 0 && (
        <circle
          className="ring-arc" cx="10" cy="10" r="7" fill="none" strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray={`${(ratio * RING_LENGTH).toFixed(1)} ${RING_LENGTH}`}
          transform="rotate(-90 10 10)"
        />
      )}
    </svg>
  );
}

/** The ring's circumference, 2πr for r = 7. */
const RING_LENGTH = 44;

/** A pie slice of the ring's radius, from 12 o'clock clockwise. */
export function wedge(ratio: number, cx = 8, cy = 8, r = 6.75): string {
  const angle = ratio * 2 * Math.PI;
  const x = cx + r * Math.sin(angle);
  const y = cy - r * Math.cos(angle);
  const large = ratio > 0.5 ? 1 : 0;
  const round = (n: number) => Math.round(n * 1000) / 1000;
  return `M${cx} ${cy}L${cx} ${round(cy - r)}A${r} ${r} 0 ${large} 1 ${round(x)} ${round(y)}Z`;
}
