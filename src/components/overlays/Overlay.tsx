import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { isTopOverlay, overlayCount, pushOverlay, removeOverlay } from './overlayStack';

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label: string;
  /** A side sheet slides in from the right; a sheet sits in the middle. */
  variant?: 'sheet' | 'side';
  /** 'full' fills the window, for a sheet that stands in for a whole page. */
  size?: 'sm' | 'md' | 'search' | 'full';
  /**
   * Where the focus goes on close, asked at that moment; the element that
   * had it on open when this gives nothing. A task panel that has walked
   * down a list hands the keyboard to the last task shown (#104).
   */
  returnFocusTo?: () => HTMLElement | null;
  /**
   * The name this dialog goes by in the stack of open ones. A dialog whose
   * owner has keys of its own (the task panel) gives it, so that owner can ask
   * whether its dialog is still the one in front (`isTopOverlay`).
   */
  overlayId?: string;
  /**
   * A selector for the thing this hangs from. The sheet then opens beneath it,
   * as a popover with nothing dimmed behind it, instead of in the middle of
   * the window. On a phone it stays a sheet.
   */
  anchor?: string;
}

/** How long a side panel takes to leave. The enter is 160ms; leaving is quicker. */
const SIDE_EXIT_MS = 320;

/** What the page's scroll was set to before the first dialog took it. */
let scrollWas = '';

/**
 * Something open in front of the dialog: a menu, a date picker, a select.
 *
 * Each closes itself on Escape, so while one is up the dialog behind it must
 * not take the same keystroke as meaning itself.
 */
const OPEN_INSIDE = '.popover, .datepanel, .fselect-list';

/** Everything in a dialog the keyboard can land on. */
const FOCUSABLE = [
  'a[href]', 'button', 'input', 'textarea', 'select',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * How the page was last driven, the one thing `:focus-visible` is guessing at
 * (#183). Giving a dialog's opener back the focus by script can draw the
 * keyboard ring around a row or a button that was only clicked, and the ring
 * then stays until the next click. The browsers disagree on when they do it,
 * so the answer is kept here instead of left to them.
 */
let lastInput: 'pointer' | 'keyboard' = 'keyboard';
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', () => { lastInput = 'pointer'; }, true);
  document.addEventListener('keydown', (e) => {
    if (!['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) lastInput = 'keyboard';
  }, true);
}

/**
 * Focus goes back to `el` for the keyboard (and the shortcuts that read it),
 * without the ring when the dialog was opened with the mouse. The ring comes
 * back with the first key pressed or when the element loses focus.
 */
function returnFocus(el: HTMLElement | null | undefined, byPointer: boolean) {
  if (!el?.focus) return;
  el.focus();
  if (!byPointer || document.activeElement !== el) return;
  el.setAttribute('data-pointer-focus', '');
  const clear = () => {
    el.removeAttribute('data-pointer-focus');
    el.removeEventListener('blur', clear);
    document.removeEventListener('keydown', onKey, true);
  };
  /* Only a key that moves the cursor brings the ring back: a shortcut such as
     `q` opening the composer is not "using the keyboard on this row". */
  const onKey = (e: KeyboardEvent) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'j', 'k', 'J', 'K', 'Home', 'End'].includes(e.key)) clear();
  };
  el.addEventListener('blur', clear);
  document.addEventListener('keydown', onKey, true);
}

/**
 * The shell every dialog shares: a scrim that closes on click, Escape to
 * dismiss, focus moved inside on open, kept inside while it is up, returned to
 * where it came from on close, and the page behind held still throughout.
 */
export function Overlay({
  open, onClose, children, label, variant = 'sheet', size = 'md', returnFocusTo, overlayId, anchor,
}: OverlayProps) {
  const ownId = useId();
  const id = overlayId ?? ownId;
  const sheetRef = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  /* What had the keyboard the moment the dialog was asked for, read while it
     renders: by the time its effect runs, a field inside it that grabs the
     focus on its own (an estimate, a search) already has it, and "where it came
     from" would be a field that is about to be gone. */
  const wasOpen = useRef(false);
  const opener = useRef<HTMLElement | null>(null);
  const openedByPointer = useRef(false);
  if (open && !wasOpen.current) {
    opener.current = document.activeElement as HTMLElement | null;
    openedByPointer.current = lastInput === 'pointer';
  }
  wasOpen.current = open;

  /* Escape has to reach whichever `onClose` is current, but the effect below
     must not be torn down and set up again merely because the caller passed a
     fresh arrow — and every caller passes a fresh arrow, on every render of
     the page behind the dialog. Setting it up again moved the focus back to
     the top of the sheet, which for someone typing a description or filling a
     column of estimates meant the caret left mid-word and the rest of the
     sentence landed in the first field. Hence the ref: the handler stays put,
     the callback it reads does not. */
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const returnRef = useRef(returnFocusTo);
  returnRef.current = returnFocusTo;

  useEffect(() => {
    if (!open) return;

    restoreTo.current = opener.current;
    /* The first dialog to open remembers the scroll setting and the last one to
       close gives it back, whatever order they close in: a second dialog used
       to remember the "hidden" the first had just set. */
    if (overlayCount() === 0) scrollWas = document.body.style.overflow;
    pushOverlay(id);
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      /* Every open dialog hears every key, and the oldest hears it first. Only
         the one in front answers: Escape closes it alone, and Tab is moved
         inside it once rather than by each dialog in turn (#125). */
      if (!isTopOverlay(id)) return;
      if (e.key === 'Escape') {
        /* Already answered by something inside the dialog — a field leaving
           itself, a picker closing. React stops the native event at its own
           root, which is usually enough; this is the part that does not
           depend on knowing that. */
        if (e.defaultPrevented) return;
        /* Escape closes the innermost thing that is open. A menu or a picker
           inside the dialog is in front of the dialog, so it answers first —
           otherwise pressing Escape to put a date picker away took the whole
           task panel with it, and the way back was to find the task again.
           The pickers draw themselves into the document rather than into the
           sheet, which is why this looks for them there. */
        if (document.querySelector(OPEN_INSIDE)) return;
        e.stopPropagation();
        closeRef.current();
        return;
      }

      /* Tab stays inside. A dialog is modal — the page behind it is held still
         and cannot be clicked — so tabbing out of it walked the keyboard
         through a sidebar there was no point reaching, and the only way back
         was to keep tabbing until it came round again. It comes round at the
         edges of the dialog instead. */
      if (e.key !== 'Tab') return;
      const sheet = sheetRef.current;
      if (!sheet) return;
      const stops = [...sheet.querySelectorAll<HTMLElement>(FOCUSABLE)]
        .filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
      if (stops.length === 0) return;

      const first = stops[0];
      const last = stops[stops.length - 1];
      const on = document.activeElement as HTMLElement | null;
      /* Focus outside the dialog altogether — left behind on the page, or
         nowhere at all — comes back to the near end of it rather than carrying
         on from wherever it was. */
      if (!on || !sheet.contains(on)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (!e.shiftKey && on === last) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && on === first) { e.preventDefault(); last.focus(); }
    };
    document.addEventListener('keydown', onKey);

    /* Move focus into the dialog so the keyboard follows the eye. A dialog
       that names its own starting point gets it: otherwise the first focusable
       thing wins, which in a sheet is the close button in its header. */
    const target =
      sheetRef.current?.querySelector<HTMLElement>('[data-autofocus]') ??
      sheetRef.current?.querySelector<HTMLElement>(
        'input, textarea, button, [tabindex]:not([tabindex="-1"])',
      );
    /* Focus inside, without the keyboard ring when the dialog was opened with the mouse. */
    returnFocus(target, lastInput === 'pointer');

    return () => {
      document.removeEventListener('keydown', onKey);
      removeOverlay(id);
      if (overlayCount() === 0) document.body.style.overflow = scrollWas;
      returnFocus(returnRef.current?.() ?? restoreTo.current, openedByPointer.current);
    };
    /* `open` and nothing else. See closeRef above. */
  }, [open, id]);

  /* A side panel takes a moment to leave: it is not unmounted until its exit
     has played (`SIDE_EXIT_MS`, matched by the stylesheet), and in that time
     it is already out of the dialog stack, inert and not clickable. */
  const [leaving, setLeaving] = useState(false);
  const wasOpenForExit = useRef(false);
  useEffect(() => {
    if (open) { wasOpenForExit.current = true; setLeaving(false); return; }
    if (!wasOpenForExit.current || variant !== 'side') return;
    wasOpenForExit.current = false;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setLeaving(true);
    const timer = window.setTimeout(() => setLeaving(false), SIDE_EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open, variant]);

  const [hung, setHung] = useState<CSSProperties | null>(null);
  useLayoutEffect(() => {
    if (!open || !anchor || window.matchMedia('(max-width: 720px)').matches) { setHung(null); return; }
    const rect = document.querySelector(anchor)?.getBoundingClientRect();
    if (!rect) { setHung(null); return; }
    setHung({ position: 'fixed', top: rect.bottom + 10, left: Math.max(8, rect.left - 8) });
  }, [open, anchor]);

  if (!open && !leaving) return null;

  const sheetClass =
    variant === 'side'
      ? 'side-sheet'
      : `sheet${
          size === 'sm' ? ' sheet-sm'
            : size === 'search' ? ' sheet-search'
              : size === 'full' ? ' sheet-full'
                : ''
        }`;

  return (
    <div className={`overlay${open ? ' open' : ' leaving'}${hung ? ' hung' : ''}`} role="dialog" aria-modal="true" aria-label={label}>
      <div className="scrim" onClick={open ? onClose : undefined} />
      <div className={sheetClass} ref={sheetRef} style={hung ?? undefined}>
        {children}
      </div>
    </div>
  );
}
