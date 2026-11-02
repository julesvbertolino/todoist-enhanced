import { describe, expect, it } from 'vitest';
import { formatShortcut, shortcutFromPress } from './shortcut';

const press = (code: string, mods: Partial<{ metaKey: boolean; ctrlKey: boolean; altKey: boolean; shiftKey: boolean }> = {}) =>
  shortcutFromPress({ code, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...mods });

describe('Quick Add shortcut', () => {
  it('writes a press as an accelerator, modifiers in a fixed order', () => {
    expect(press('Space', { altKey: true })).toEqual({ ok: true, accelerator: 'Alt+Space' });
    expect(press('KeyK', { metaKey: true, shiftKey: true, altKey: true })).toEqual({ ok: true, accelerator: 'Alt+Shift+Command+K' });
    expect(press('Digit1', { ctrlKey: true })).toEqual({ ok: true, accelerator: 'Control+1' });
  });
  it('reads the key where it is, not what Option makes it type', () => {
    expect(press('KeyA', { altKey: true })).toEqual({ ok: true, accelerator: 'Alt+A' });
  });
  it('refuses a key with no ⌘, ⌃ or ⌥ and waits while only modifiers are held', () => {
    expect(press('KeyA', { shiftKey: true })).toEqual({ ok: false, reason: 'modifier' });
    expect(press('KeyA')).toEqual({ ok: false, reason: 'modifier' });
    expect(press('AltLeft', { altKey: true })).toEqual({ ok: false, reason: 'incomplete' });
  });
  it('shows a shortcut with the symbols a Mac user reads', () => {
    expect(formatShortcut('Alt+Space')).toBe('⌥Space');
    expect(formatShortcut('Control+Alt+Shift+Command+K')).toBe('⌃⌥⇧⌘K');
    expect(formatShortcut('Command+Up')).toBe('⌘↑');
  });
});
