import { lazy, Suspense, useSyncExternalStore } from 'react';
import type { LucideIcon } from 'lucide-react';

/*
 * The catalogue of project icons is some 100 kB of drawings, and most of the
 * app only needs the one icon of each project it shows. It travels in a chunk
 * of its own, fetched as soon as the app starts and without holding the first
 * screen back: until it arrives an icon is an empty square of the same size,
 * so nothing moves when it does.
 */
type Catalogue = Record<string, LucideIcon>;
let catalogue: Catalogue | null = null;
const listeners = new Set<() => void>();
const loading = import('@/domain/projectIconCatalog').then((module) => {
  catalogue = module.PROJECT_ICONS;
  listeners.forEach((listener) => listener());
});
void loading.catch(() => undefined);

const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const read = () => catalogue;

export function ProjectIcon({
  iconId, size, className, style,
}: { iconId: string; size?: 'sm' | 'md' | 'lg'; className?: string; style?: React.CSSProperties }) {
  const icons = useSyncExternalStore(subscribe, read);
  const sizeClass = size === 'sm' ? ' ic-sm' : size === 'lg' ? ' ic-lg' : '';
  const classes = `ic${sizeClass}${className ? ` ${className}` : ''}`;
  if (!icons) return <svg className={classes} style={style} aria-hidden="true" />;
  const Glyph = icons[iconId];
  if (!Glyph) return null;
  return <Glyph className={classes} style={style} aria-hidden="true" />;
}

const Grid = lazy(() => import('./ProjectIconPicker').then((module) => ({ default: module.ProjectIconGrid })));

/** The icon search and grid, loaded the first time a sheet or a menu asks for it. */
export function ProjectIconGrid(props: { value: string | null; onPick: (iconId: string | null) => void; focusSearch?: boolean }) {
  return <Suspense fallback={null}><Grid {...props} /></Suspense>;
}
