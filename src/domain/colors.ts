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

/**
 * A project colour made readable as text (#384): the colour itself while it
 * already reads, otherwise mixed toward black on the light page, or toward
 * white on a dark one, by the least that gets it to AA, so orange stays
 * orange and does not turn brown-grey. The marker and every fill keep the
 * colour Todoist gave the project.
 */
export function colorInk(name: string | undefined | null, theme: 'light' | 'dark'): string {
  const base = colorValue(name);
  const surface = theme === 'light' ? LIGHT_SURFACE : DARK_SURFACE;
  const towards = theme === 'light' ? 0 : 255;
  const rgb = channels(base);
  for (let step = 0; step <= 100; step += 1) {
    const mixed = toHex(rgb.map((v) => v + (towards - v) * (step / 100)));
    if (contrast(mixed, surface) >= MIN_CONTRAST) return mixed;
  }
  return toHex([towards, towards, towards]);
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
