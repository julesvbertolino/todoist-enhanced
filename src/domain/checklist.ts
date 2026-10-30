/**
 * Markdown task lists in a task's description (#157).
 *
 * A checklist is not a second kind of subtask and nothing about it is stored
 * on the task: it is the lines of the description that read `- [ ] item` or
 * `- [x] item`, which is also what a person would type in Todoist. Everything
 * here works on those lines and leaves every other byte of the description
 * where it was, line endings included, so that parsing a description and
 * writing it back, unedited, gives exactly the text that was read.
 */

/** The longest a Todoist task description may be, in characters. */
export const MAX_DESCRIPTION = 16_383;

/** A checklist line: its indent, its bullet, its box, and whatever follows the box. */
export interface ListMark {
  indent: string;
  bullet: '-' | '*';
  marker: ' ' | 'x' | 'X';
  /** Exactly what follows `]`: nothing, or a space and the item's text. */
  rest: string;
}

export interface Line {
  text: string;
  /** The line ending that follows it, or '' on the last line. */
  eol: string;
  /** Set when the line is a checklist item. */
  item: ListMark | null;
}

const ITEM = /^( {0,3})([-*]) \[([ xX])\]( .*)?$/;
const FENCE = /^ {0,3}(```|~~~)/;

/** The description as lines, each with its own ending, and the items found among them. */
export function parseLines(description: string): Line[] {
  const parts = description.split(/(\r\n|\n|\r)/);
  const lines: Line[] = [];
  let fence: string | null = null;
  for (let at = 0; at < parts.length; at += 2) {
    const text = parts[at];
    const eol = parts[at + 1] ?? '';
    const opens = FENCE.exec(text)?.[1] ?? null;
    let item: ListMark | null = null;
    if (fence === null && opens === null) {
      const match = ITEM.exec(text);
      if (match) {
        item = {
          indent: match[1], bullet: match[2] as '-' | '*',
          marker: match[3] as ' ' | 'x' | 'X', rest: match[4] ?? '',
        };
      }
    }
    // Anything inside a fenced block is code, not a checklist.
    if (opens !== null) fence = fence === null ? opens : fence === opens ? null : fence;
    lines.push({ text, eol, item });
  }
  return lines;
}

const lineText = (line: Line): string =>
  line.item
    ? `${line.item.indent}${line.item.bullet} [${line.item.marker}]${line.item.rest}`
    : line.text;

export function serializeLines(lines: readonly Line[]): string {
  return lines.map((line) => lineText(line) + line.eol).join('');
}

/** The text of an item: what follows its box. */
export const itemText = (mark: ListMark): string =>
  (mark.rest.startsWith(' ') ? mark.rest.slice(1) : '');

export const isChecked = (mark: ListMark): boolean => mark.marker !== ' ';

export interface ChecklistItem {
  /** Its place among the items, counted from 0 in the order they appear. */
  index: number;
  /** The line it is on. */
  line: number;
  checked: boolean;
  text: string;
}

export function checklistItems(description: string): ChecklistItem[] {
  const out: ChecklistItem[] = [];
  parseLines(description).forEach((line, at) => {
    if (line.item) {
      out.push({ index: out.length, line: at, checked: isChecked(line.item), text: itemText(line.item) });
    }
  });
  return out;
}

/** How many items are ticked, and how many there are. */
export function checklistProgress(description: string): { done: number; total: number } {
  const items = checklistItems(description);
  return { done: items.filter((item) => item.checked).length, total: items.length };
}

/**
 * Ticks or unticks the nth item: one character of one line changes and the
 * rest of the description is exactly what it was.
 */
export function toggleItem(description: string, index: number): string {
  const lines = parseLines(description);
  const target = lines.filter((line) => line.item)[index];
  if (!target?.item) return description;
  target.item = { ...target.item, marker: isChecked(target.item) ? ' ' : 'x' };
  return serializeLines(lines);
}

/** The description without its checklist lines, for the one line a task row shows. */
export function withoutChecklist(description: string): string {
  return parseLines(description)
    .filter((line) => !line.item)
    .map((line) => line.text)
    .join('\n')
    .trim();
}

/**
 * The one line a task row shows for a description with a checklist (#393): the
 * text, then the items still to do. A text that announces the list ("Before
 * the call:") would otherwise end on a colon followed by nothing. With every
 * item ticked there is nothing left to announce, so the colon goes too.
 */
export function checklistPreview(description: string): string {
  const text = withoutChecklist(description);
  const items = checklistItems(description);
  if (items.length === 0) return text;
  const todo = items.filter((item) => !item.checked && item.text.trim()).map((item) => item.text.trim());
  if (todo.length === 0) return text.replace(/\s*[:：]\s*$/, '');
  return text ? `${text} ${todo.join(', ')}` : todo.join(', ');
}

/** The line ending a description is written with: its first one, or a newline. */
export function eolOf(lines: readonly Line[]): string {
  return lines.find((line) => line.eol !== '')?.eol ?? '\n';
}

const newItem = (text: string, indent = ''): Line['item'] => ({
  indent, bullet: '-', marker: ' ', rest: text ? ` ${text}` : '',
});

/** A line put in after another, in the description's own kind of line ending. */
function insertAfter(lines: Line[], at: number, line: Omit<Line, 'eol'>): Line[] {
  const next = lines.map((existing) => ({ ...existing }));
  next.splice(at + 1, 0, { ...line, eol: eolOf(lines) });
  /* Putting a line after the last one gives the old last line an ending, and
     the new line none: the text still ends where it ended. */
  if (at === lines.length - 1) {
    next[at].eol = eolOf(lines);
    next[at + 1].eol = '';
  }
  return next;
}

/** Whether a description of this length can still be written to Todoist. */
export const fitsDescription = (description: string): boolean => description.length <= MAX_DESCRIPTION;

/** Ticks or unticks the item on `line`. */
export function toggleItemAt(description: string, line: number): string {
  const lines = parseLines(description);
  const target = lines[line];
  if (!target?.item) return description;
  target.item = { ...target.item, marker: isChecked(target.item) ? ' ' : 'x' };
  return serializeLines(lines);
}

/**
 * Several lines pasted into an item: the first goes in at the caret and each
 * of the others is an item of its own after it. A bullet or a box at the start
 * of a pasted line is dropped, since the item already has its own, and blank
 * lines are not items. Null when there is nothing to paste or the whole would
 * not fit: nothing is cut short.
 */
const BULLET = /^\s*(?:[-*]\s+(?:\[[ xX]\]\s+)?)?/;
export function pasteIntoItem(
  description: string, line: number, from: number, to: number, pasted: string,
): { description: string; line: number; caret: number } | null {
  const lines = parseLines(description);
  const target = lines[line];
  if (!target?.item) return null;
  const pieces = pasted
    .split(/\r\n|\n|\r/)
    .map((piece) => piece.replace(BULLET, '').trimEnd())
    .filter((piece) => piece !== '');
  if (pieces.length === 0) return null;

  const own = itemText(target.item);
  const before = own.slice(0, from);
  const after = own.slice(to);
  const rest = (text: string) => (text ? ` ${text}` : '');

  let next = lines.map((existing) => ({ ...existing }));
  if (pieces.length === 1) {
    next[line].item = { ...target.item, rest: rest(before + pieces[0] + after) };
    const written = serializeLines(next);
    return fitsDescription(written)
      ? { description: written, line, caret: (before + pieces[0]).length }
      : null;
  }

  next[line].item = { ...target.item, rest: rest(before + pieces[0]) };
  let at = line;
  pieces.slice(1).forEach((piece, index, all) => {
    const text = index === all.length - 1 ? piece + after : piece;
    next = insertAfter(next, at, { text: '', item: newItem(text, target.item!.indent) });
    at += 1;
  });
  const written = serializeLines(next);
  return fitsDescription(written)
    ? { description: written, line: at, caret: pieces[pieces.length - 1].length }
    : null;
}
