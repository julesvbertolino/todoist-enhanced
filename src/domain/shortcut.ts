/**
 * The Quick Add shortcut of the Mac app, chosen by pressing it.
 *
 * The app that owns the shortcut (Electron) writes it as an "accelerator":
 * `Alt+Shift+Space`. The page turns a key press into that, and back into the
 * symbols a Mac user reads (⌥⇧Space).
 */

export const DEFAULT_QUICK_ADD_SHORTCUT = 'Alt+Space';

const NAMED: Record<string, string> = {
  Space: 'Space', Enter: 'Return', Tab: 'Tab', Backspace: 'Backspace',
  ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
  Minus: '-', Equal: '=', Comma: ',', Period: '.', Slash: '/', Semicolon: ';',
  Quote: "'", Backquote: '`', BracketLeft: '[', BracketRight: ']', Backslash: '\\',
};

/** The key itself, from where it is on the keyboard rather than what it types (Option changes the letter). */
function keyName(code: string): string | null {
  if (NAMED[code]) return NAMED[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^F([1-9]|1\d|2[0-4])$/.test(code)) return code;
  return null;
}

export type ShortcutPress = { ok: true; accelerator: string } | { ok: false; reason: 'incomplete' | 'modifier' };

/**
 * A press, or why it cannot be a shortcut. A modifier held alone is not done
 * yet; a key with no ⌘, ⌃ or ⌥ would steal typing from every other app.
 */
export function shortcutFromPress(press: Pick<KeyboardEvent, 'code' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>): ShortcutPress {
  const key = keyName(press.code);
  if (!key) return { ok: false, reason: 'incomplete' };
  if (!press.metaKey && !press.ctrlKey && !press.altKey) return { ok: false, reason: 'modifier' };
  const parts = [press.ctrlKey && 'Control', press.altKey && 'Alt', press.shiftKey && 'Shift', press.metaKey && 'Command', key]
    .filter((part): part is string => Boolean(part));
  return { ok: true, accelerator: parts.join('+') };
}

const SYMBOL: Record<string, string> = { Control: '⌃', Alt: '⌥', Shift: '⇧', Command: '⌘', CommandOrControl: '⌘', Cmd: '⌘', Ctrl: '⌃', Option: '⌥', Meta: '⌘', Super: '⌘' };
const ARROW: Record<string, string> = { Up: '↑', Down: '↓', Left: '←', Right: '→', Return: '↵' };

/** ⌥Space, ⌃⌥⇧K: the modifiers as symbols, the key after them. */
export function formatShortcut(accelerator: string): string {
  return accelerator.split('+').map((part) => SYMBOL[part] ?? ARROW[part] ?? part).join('');
}
