import { useStore } from '@/store/store';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { useT } from '@/hooks/useT';
import {
  ACCENTS, BACKGROUNDS, DENSITIES, LAYOUTS, TASK_CHIPS, TASK_OPENS, THEMES, isHexColour,
  type Accent, type Background, type Density, type Layout, type TaskChips, type TaskOpen, type Theme,
} from '@/store/prefs';
import { accentFamily, hexToHsl } from '@/domain/accent';
import type { TranslationKey } from '@/i18n';

/**
 * The settings you can be shown rather than told.
 *
 * Appearance, colour and density are choices about how the product looks, and
 * a word for each explains less than one picture does. They live here rather
 * than inside SettingsView because the first run asks the same questions, and
 * asking them with a second set of components is how two answers to the same
 * question drift into disagreeing.
 */

/**
 * Light, dark, or the device's, shown rather than named.
 *
 * The same argument as density: three words describing something you can
 * simply be shown. Each card is a page in that scheme — a title, a rule, two
 * rows — and the one that follows the device is drawn as both at once, split
 * down the middle, because that is exactly what it does.
 */
export function ThemeChoice({
  value, onChange,
}: { value: Theme; onChange: (next: Theme) => void }) {
  const { t } = useT();
  return (
    <div className="themechoice three" role="radiogroup" aria-label={t('settings.theme')}>
      {THEMES.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          className={`themecard${value === option ? ' selected' : ''}`}
          onClick={() => onChange(option)}
        >
          <span className={`themepreview ${option}`} aria-hidden="true">
            {/* Two halves for "system"; the other two draw the same half
                twice, so all three cards are built the same way. */}
            <span className="themehalf light">
              <i className="themebar" />
              <i className="themeline" />
              <i className="themeline short" />
            </span>
            <span className="themehalf dark">
              <i className="themebar" />
              <i className="themeline" />
              <i className="themeline short" />
            </span>
          </span>
          <span className="themelabel">
            {t(`settings.theme.${option}` as TranslationKey)}
            {value === option && <Icon name="check" size="sm" />}
          </span>
        </button>
      ))}
    </div>
  );
}

/**
 * How the app is framed, shown rather than named: a drawing of each layout,
 * in the theme card's shell (`themechoice`, `themecard`) so it sits in the
 * same family as the choices around it.
 */
export function LayoutChoice({
  value, onChange,
}: { value: Layout; onChange: (next: Layout) => void }) {
  const { t } = useT();
  return (
    <div className="themechoice" role="radiogroup" aria-label={t('settings.layout')}>
      {LAYOUTS.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          className={`themecard${value === option ? ' selected' : ''}`}
          onClick={() => onChange(option)}
        >
          <span className={`framepreview ${option}`} aria-hidden="true">
            <i className="framenav" />
            <i className="framepage" />
          </span>
          <span className="themelabel">
            {t(`settings.layout.${option}` as TranslationKey)}
            {value === option && <Icon name="check" size="sm" />}
          </span>
          <small className="themehint">{t(`settings.layout.${option}.hint` as TranslationKey)}</small>
        </button>
      ))}
    </div>
  );
}

/** Neutral grey or the accent's gradient behind the frame, drawn as such. */
export function BackgroundChoice({
  value, onChange,
}: { value: Background; onChange: (next: Background) => void }) {
  const { t } = useT();
  return (
    <div className="themechoice" role="radiogroup" aria-label={t('settings.background')}>
      {BACKGROUNDS.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          className={`themecard${value === option ? ' selected' : ''}`}
          onClick={() => onChange(option)}
        >
          <span className={`framepreview page-float back-${option}`} aria-hidden="true">
            <i className="framenav" />
            <i className="framepage" />
          </span>
          <span className="themelabel">
            {t(`settings.background.${option}` as TranslationKey)}
            {value === option && <Icon name="check" size="sm" />}
          </span>
          <small className="themehint">{t(`settings.background.${option}.hint` as TranslationKey)}</small>
        </button>
      ))}
    </div>
  );
}

/**
 * The accent, shown rather than named.
 *
 * A row of colour names asks you to imagine the app; each card here is the
 * app, in miniature — a task line with its checkbox, its count chip and the
 * one solid button the colour actually lands on. The card carries its own
 * `data-accent`, so what it draws is literally what choosing it would draw,
 * in whichever scheme the page is currently wearing.
 *
 * The last card is the same picture driven by a colour you pick. It shows the
 * family the app derives rather than the colour you handed it, which is the
 * honest thing to show: the derived ink is what you will be reading.
 */
export function AccentChoice({
  value, custom, onChange, onCustom,
}: {
  value: Accent;
  custom: string;
  onChange: (next: Accent) => void;
  onCustom: (next: string) => void;
}) {
  const { t } = useT();
  const [typed, setTyped] = useState(custom);
  const [invalid, setInvalid] = useState(false);

  // The stored colour wins whenever it changes under us — another device, or
  // the native picker, which fires continuously while it is open.
  useEffect(() => { setTyped(custom); setInvalid(false); }, [custom]);

  /* A colour that is not a hex code is refused out loud, and the last good one
     stays: the field goes back to it rather than leaving the card on a colour
     nobody chose. */
  const commitTyped = (raw: string) => {
    const withHash = raw.startsWith('#') ? raw : `#${raw}`;
    if (isHexColour(withHash)) { setInvalid(false); onCustom(withHash.toLowerCase()); }
    else { setInvalid(true); setTyped(custom); }
  };

  return (
    <div className="accentchoice-wrap">
      <div className="accentchoice" role="radiogroup" aria-label={t('settings.accent')}>
        {ACCENTS.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={value === option}
            aria-label={t(`settings.accent.${option}` as TranslationKey)}
            className={`accentcard${value === option ? ' selected' : ''}`}
            data-accent={option}
            onClick={() => onChange(option)}
          >
            <AccentPreview />
            <span className="accentlabel">
              {t(`settings.accent.${option}` as TranslationKey)}
              {value === option && <Icon name="check" size="sm" />}
            </span>
          </button>
        ))}

        {/* A card like the others, a radio like the others: the two controls
            that set its colour are below the cards, not inside one, because a
            radio wrapping a text field is a keyboard trap. */}
        <button
          type="button"
          role="radio"
          aria-checked={value === 'custom'}
          aria-label={t('settings.accent.custom')}
          className={`accentcard custom${value === 'custom' ? ' selected' : ''}`}
          data-accent={value === 'custom' ? undefined : 'custom-preview'}
          style={value === 'custom' ? undefined : customPreviewStyle(custom)}
          onClick={() => onChange('custom')}
        >
          <AccentPreview />
          <span className="accentlabel">
            {t('settings.accent.custom')}
            {value === 'custom' && <Icon name="check" size="sm" />}
          </span>
        </button>
      </div>

      {value === 'custom' && (
        <ColourPanel
          custom={custom}
          typed={typed}
          invalid={invalid}
          onCustom={onCustom}
          onTyped={(next) => { setTyped(next); setInvalid(false); }}
          onCommit={commitTyped}
          onReset={() => { setTyped(custom); setInvalid(false); }}
        />
      )}
    </div>
  );
}

/** A hex code as hue (0 to 360), saturation and value (0 to 1). */
function hexToHsv(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  const h = d === 0 ? 0 : max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, max ? d / max : 0, max];
}

function hsvToHex(h: number, s: number, v: number): string {
  const channel = (n: number) => {
    const k = (n + h / 60) % 6;
    return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255);
  };
  return `#${[channel(5), channel(3), channel(1)].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * The custom colour, picked by hand: a square for the shade, a bar for the
 * hue, and a hex field. Our own rather than the browser's, which looked like
 * it belonged to another app.
 */
function ColourPanel({
  custom, typed, invalid, onCustom, onTyped, onCommit, onReset,
}: {
  custom: string;
  typed: string;
  invalid: boolean;
  onCustom: (next: string) => void;
  onTyped: (next: string) => void;
  onCommit: (raw: string) => void;
  onReset: () => void;
}) {
  const { t } = useT();
  const [hsv, setHsv] = useState<[number, number, number]>(() => hexToHsv(isHexColour(custom) ? custom : '#d1453b'));
  const lastSent = useRef(custom);
  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;

  // Another device, or the hex field, moved the colour: follow it, but keep the
  // hue when the new colour is a grey, which has none of its own.
  useEffect(() => {
    if (custom === lastSent.current || !isHexColour(custom)) return;
    const next = hexToHsv(custom);
    setHsv((prev) => [next[1] === 0 || next[2] === 0 ? prev[0] : next[0], next[1], next[2]]);
  }, [custom]);

  const send = (next: [number, number, number]) => {
    setHsv(next);
    const hex = hsvToHex(...next);
    lastSent.current = hex;
    onCustom(hex);
  };

  /** Drags that start inside `box` and report 0 to 1 along each axis. */
  const drag = (apply: (x: number, y: number) => void) => (event: React.PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget;
    const at = (e: { clientX: number; clientY: number }) => {
      const r = box.getBoundingClientRect();
      apply(clamp01((e.clientX - r.left) / r.width), clamp01((e.clientY - r.top) / r.height));
    };
    box.setPointerCapture(event.pointerId);
    at(event);
    const move = (e: PointerEvent) => at(e);
    const up = () => { box.removeEventListener('pointermove', move); box.removeEventListener('pointerup', up); };
    box.addEventListener('pointermove', move);
    box.addEventListener('pointerup', up);
  };

  const [h, sat, val] = hsv;
  const hex = isHexColour(custom) ? custom : hsvToHex(h, sat, val);
  return (
    <div className="cpanel custom-colour-editor">
      <div
        className="sv"
        style={{ '--h': h } as React.CSSProperties}
        onPointerDown={drag((x, y) => send([hsvRef.current[0], x, 1 - y]))}
      >
        <i className="knob" style={{ left: `${sat * 100}%`, top: `${(1 - val) * 100}%` }} />
      </div>
      <div className="cside">
        <div className="hue" onPointerDown={drag((x) => send([x * 360, hsvRef.current[1], hsvRef.current[2]]))}>
          <i className="knob" style={{ left: `${(h / 360) * 100}%` }} />
        </div>
        <div className="crow">
          <span className="bigswatch" style={{ background: hex }} />
          <div className="cinfo">
            <strong>{t('settings.accent.custom')}</strong>
            <div className="hexrow">
              <span>#</span>
              <input
                className="accenthex"
                aria-label={t('settings.accent.customHex')}
                maxLength={7}
                value={typed.replace(/^#/, '')}
                spellCheck={false}
                aria-invalid={invalid || undefined}
                onChange={(event) => onTyped(event.target.value)}
                onBlur={(event) => onCommit(event.target.value.trim())}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') { event.preventDefault(); onCommit(typed.trim()); }
                  if (event.key === 'Escape') onReset();
                }}
              />
            </div>
          </div>
        </div>
        {invalid
          ? <small role="alert">{t('settings.accent.customInvalid', { colour: custom })}</small>
          : <small>{t('settings.accent.customHelp')}</small>}
      </div>
    </div>
  );
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** One miniature of the product, drawn entirely from the accent tokens. */
function AccentPreview() {
  return (
    <span className="accentpreview" aria-hidden="true">
      <span className="accentrow">
        <i className="accentcheck" />
        <i className="accentbar" />
        <i className="accentflag" />
      </span>
      <span className="accentrow">
        <i className="accentcheck quiet" />
        <i className="accentbar short" />
      </span>
      <i className="accentbtn" />
    </span>
  );
}

/**
 * The custom card while some other accent is selected.
 *
 * It still has to show its own colour, and it cannot get it from a
 * `data-accent` block the way the presets do, because it is not in the
 * stylesheet. So the family is computed and written onto the card itself —
 * the same values, by the same recipe, reaching only this one element.
 */
function customPreviewStyle(custom: string): React.CSSProperties | undefined {
  if (!hexToHsl(custom)) return undefined;
  const scheme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  return Object.fromEntries(
    Object.entries(accentFamily(custom, scheme)).map(([k, v]) => [`--${k}`, v]),
  ) as React.CSSProperties;
}

/**
 * Choosing a density by looking at it.
 *
 * "Comfortable" and "compact" are words about a thing you can simply be shown:
 * two boxes of the same height, one holding three rows and the other holding
 * five. The picture is the explanation, and the label underneath is only there
 * to name what you already understood.
 */
export function DensityChoice({
  value, onChange,
}: { value: Density; onChange: (next: Density) => void }) {
  const { t } = useT();
  return (
    <div className="denschoice" role="radiogroup" aria-label={t('settings.density')}>
      {DENSITIES.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          className={`denscard${value === option ? ' selected' : ''}`}
          onClick={() => onChange(option)}
        >
          <span className={`denspreview ${option}`} aria-hidden="true">
            {/* Comfortable fits three of these rows in the box; compact fits
                five. Nothing about a row is smaller — there is just less air. */}
            {Array.from({ length: option === 'compact' ? 5 : 3 }).map((_, index) => (
              <span className="densrow" key={index}>
                <i className="densdot" />
                <i className="densbar" />
              </span>
            ))}
          </span>
          <span className="denslabel">
            {t(`settings.density.${option}` as TranslationKey)}
            {value === option && <Icon name="check" size="sm" />}
          </span>
        </button>
      ))}
    </div>
  );
}

/**
 * Where an opened task appears, shown rather than described: a window over the
 * list, or a panel beside it.
 */
export function TaskOpenChoice({
  value, onChange,
}: { value: TaskOpen; onChange: (next: TaskOpen) => void }) {
  const { t } = useT();
  return (
    <div className="openchoice" role="radiogroup" aria-label={t('settings.taskOpen')}>
      {TASK_OPENS.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          className={`denscard${value === option ? ' selected' : ''}`}
          onClick={() => onChange(option)}
        >
          <span className={`openpreview ${option}`} aria-hidden="true">
            {[0, 1, 2, 3].map((row) => (
              <span className="densrow" key={row}><i className="densdot" /><i className="densbar" /></span>
            ))}
            <span className="openwindow" />
          </span>
          <span className="denslabel">
            {t(`settings.taskOpen.${option}` as TranslationKey)}
            {value === option && <Icon name="check" size="sm" />}
          </span>
        </button>
      ))}
    </div>
  );
}

/**
 * How the chips on a task's metadata are coloured, shown with two sample
 * chips each (#175). One choice for Settings and for the first run, so the
 * two can only ever say the same thing.
 */
export function TaskChipsChoice({
  value, onChange,
}: { value: TaskChips; onChange: (next: TaskChips) => void }) {
  const { t } = useT();
  return (
    <div className="chipschoice" role="radiogroup" aria-label={t('settings.taskChips')}>
      {TASK_CHIPS.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          className={`chipscard${value === option ? ' selected' : ''}`}
          onClick={() => onChange(option)}
        >
          {/* The sample is drawn by the real chip rules, with the mode of this
              card rather than the page's own. */}
          <span className="chipssample" data-chips={option} aria-hidden="true">
            <span className="task"><span className="sample-title">{t('preview.task.homepage')}</span><span className="meta">
              <span className="at">{t('common.today')}</span>
              <span className="est">45 min</span>
              <span className="proj" style={{ '--marker': '#4073ff' } as React.CSSProperties}>#Website</span>
              <span className="tag" style={{ '--marker': '#299438' } as React.CSSProperties}>
                <Icon name="tag" size="sm" />home
              </span>
            </span></span>
          </span>
          <span className="chipslabel">
            {t(`settings.taskChips.${option}` as TranslationKey)}
            {value === option && <Icon name="check" size="sm" />}
          </span>
        </button>
      ))}
    </div>
  );
}

/** The same storage choice in first run, existing accounts and Settings. */
export function EstimateStorageChoice({ value, allowed, onChange, neutral = false }: {
  /** With `neutral`, a null value shows no option selected instead of the tag default. */
  neutral?: boolean;
  value: import('@/domain/types').EstimateStorage | null;
  allowed: boolean;
  onChange: (value: import('@/domain/types').EstimateStorage) => void;
}) {
  const { t } = useT();
  const user = useStore((s) => s.snapshot.user);
  const shown = neutral && allowed ? value : (value ?? 'tag');
  const recommendation = !allowed ? 'tag' : user?.is_premium === true || user?.premium_status === 'teams_business_member' ? 'duration' : null;
  return (
    <div className="estimate-choice">
      <div className="estimate-toggle" role="radiogroup" aria-label={t('estimates.storage')}>
        {(['tag', 'duration'] as const).map((option) => (
          <button type="button" key={option} role="radio" aria-label={t(`estimates.${option}`)} aria-description={t(option === 'tag' ? 'estimates.tagPlans' : 'estimates.durationPlans')} aria-checked={shown === option}
            disabled={option === 'duration' && !allowed}
            className={shown === option ? 'selected' : undefined}
            onClick={() => onChange(option)}
            onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
              event.preventDefault();
              const next = option === 'tag' && allowed ? 'duration' : 'tag';
              onChange(next);
              (event.currentTarget.parentElement?.querySelector(`[data-storage="${next}"]`) as HTMLButtonElement | null)?.focus();
            }} data-storage={option}>
            <Icon name={option === 'tag' ? 'tag' : 'clock'} size="sm" />
            <span><strong>{t(`estimates.${option}`)}</strong><small>{t(option === 'tag' ? 'estimates.tagPlans' : 'estimates.durationPlans')}{recommendation === option && <span className="estimate-recommended">{t('estimates.recommended')}</span>}</small></span>
            <span className="estimate-toggle-check"><Icon name="check" size="sm" /></span>
          </button>
        ))}
      </div>
      <p className="estimate-choice-hint">{t(!allowed ? 'estimates.unavailable' : shown === null ? 'setup.estimates.required' : shown === 'tag' ? 'estimates.tagHint' : 'estimates.durationHint')}</p>
      <details className="estimate-choice-details"><summary>{t('estimates.more')}</summary><p>{t('estimates.durationHelp')}</p><p>{t('estimates.longHelp')}</p></details>
    </div>
  );
}
