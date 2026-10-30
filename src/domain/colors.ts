/**
 * Todoist stores colours by name, not by value. These are the hex values
 * Todoist renders them with, plus a soft tint used for marker backgrounds.
 */

const PALETTE: Record<string, string> = {
  berry_red: '#b8255f',
  red: '#db4035',
  orange: '#ff9933',
  yellow: '#fad000',
  olive_green: '#afb83b',
  lime_green: '#7ecc49',
  green: '#299438',
  mint_green: '#6accbc',
  teal: '#158fad',
  sky_blue: '#14aaf5',
  light_blue: '#96c3eb',
  blue: '#4073ff',
  grape: '#884dff',
  violet: '#af38eb',
  lavender: '#eb96eb',
  magenta: '#e05194',
  salmon: '#ff8d85',
  charcoal: '#808080',
  grey: '#b8b8b8',
  gray: '#b8b8b8',
  taupe: '#ccac93',
};

export const DEFAULT_COLOR = '#808080';

/** The hex value for a Todoist colour name, or a neutral grey if unknown. */
export const colorValue = (name: string | undefined | null): string =>
  (name && PALETTE[name]) || DEFAULT_COLOR;

/** The same colour at low opacity, for a marker's background chip. */
export function colorSoft(name: string | undefined | null): string {
  const hex = colorValue(name);
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.12)`;
}

const channels = (hex: string): [number, number, number] =>
  [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16)) as [number, number, number];

const toHex = (rgb: number[]): string => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

/** WCAG relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two #rrggbb colours, from 1 to 21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** What text sits on: the page in each theme. */
export const LIGHT_SURFACE = '#ffffff';
export const DARK_SURFACE = '#1e1e1e';
/** AA for the 12 px text a project name is. */
export const MIN_CONTRAST = 4.5;

/** #rrggbb as hue (0-360), saturation and lightness (0-1). */
function toHsl(hex: string): [number, number, number] {
  const [r, g, b] = channels(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function fromHsl(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return toHex([f(0) * 255, f(8) * 255, f(4) * 255]);
}

/**
 * A project colour made readable as text (#384): the colour itself while it
 * already reads, otherwise the same hue and saturation at the lightness that
 * first reaches AA (darker on the light page, lighter on a dark one). Keeping
 * the saturation is the point: mixing a pastel with black turns it grey, and
 * a project name would look washed out. The marker and every fill keep the
 * colour Todoist gave the project.
 */
export function colorInk(name: string | undefined | null, theme: 'light' | 'dark'): string {
  const base = colorValue(name);
  const surface = theme === 'light' ? LIGHT_SURFACE : DARK_SURFACE;
  if (contrast(base, surface) >= MIN_CONTRAST) return base;
  const [h, saturated, l] = toHsl(base);
  /* A pastel pulled all the way down at full saturation turns loud (salmon becomes red), so it is eased a little. */
  const s = Math.min(saturated, 0.78);
  const dir = theme === 'light' ? -1 : 1;
  for (let step = 1; step <= 100; step += 1) {
    const next = Math.min(1, Math.max(0, l + dir * step / 100));
    const ink = fromHsl(h, s, next);
    if (contrast(ink, surface) >= MIN_CONTRAST) return ink;
    if (next === 0 || next === 1) break;
  }
  return theme === 'light' ? '#000000' : '#ffffff';
}

/** The CSS custom properties a coloured marker reads. */
export const markerStyle = (name: string | undefined | null, withBackground = true) =>
  ({
    '--marker': colorValue(name),
    '--marker-ink-l': colorInk(name, 'light'),
    '--marker-ink-d': colorInk(name, 'dark'),
    ...(withBackground ? { '--marker-soft': colorSoft(name) } : {}),
  }) as React.CSSProperties;

/**
 * The avatar Todoist holds for a user.
 *
 * Todoist serves uploaded avatars from its image CDN keyed by `image_id`.
 * Accounts without a picture have no id, and the caller falls back to initials.
 */
export function avatarUrl(
  user: { image_id?: string | null; avatar_big?: string | null } | null,
  size: 'small' | 'medium' | 'big' = 'medium',
): string | null {
  if (!user) return null;
  if (user.avatar_big) return user.avatar_big;
  if (!user.image_id) return null;
  return `https://dcff1xvirvpfp.cloudfront.net/${user.image_id}_${size}.jpg`;
}
