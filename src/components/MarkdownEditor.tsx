import { createPortal } from 'react-dom';
import { Overlay } from './overlays/Overlay';
import { Icon } from './Icon';
import { useEffect, useRef, useState } from 'react';
import {
  Annotation, EditorSelection, EditorState, RangeSetBuilder, Transaction,
  type Range,
} from '@codemirror/state';
import {
  Decoration, EditorView, ViewPlugin, WidgetType, drawSelection, keymap, placeholder as placeholderExt,
  type DecorationSet, type ViewUpdate,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, isolateHistory } from '@codemirror/commands';
import { useT } from '@/hooks/useT';
import { inlineSpans, type InlineSpan } from '@/domain/inlineMarks';
import { richEnter, normalizeLink } from '@/domain/editorInput';
import { pressEnter, readLine, type NoteLine } from '@/domain/descriptionLines';
import { itemText, pasteIntoItem, parseLines } from '@/domain/checklist';

/**
 * One Markdown surface for task descriptions (#157).
 *
 * The text is Markdown and is what is stored; the editor draws it as it is
 * written. Every line is formatted, the one the caret is on included: its
 * markers are hidden while editing, and a heading is still a heading. A task line is a real checkbox from the moment
 * it reads as one, and a click on it ticks it without moving the caret.
 *
 * It is a single editable surface, so selecting with the mouse or ⌘A, undo,
 * and the arrows are the browser's and CodeMirror's own, not the page's.
 */
export type EditorVariant = 'detail' | 'composer';

interface MarkdownEditorProps {
  value: string;
  onChange: (next: string) => void;
  /** The caret left the field, or Escape / ⌘↵ was pressed in a description. */
  onCommit?: () => void;
  placeholder: string;
  ariaLabel: string;
  autoFocus?: boolean;
  /** A link shortcut pressed while the editor was still loading. */
  initialLinkSelection?: { from: number; to: number } | null;
  variant?: EditorVariant;
  /** Whether a text may replace the current one; false cancels the edit. */
  accept?: (next: string, previous: string) => boolean;
  /** An edit was cancelled by `accept`, with the text it would have made. */
  onRefused?: (next: string) => void;
  /** Task lines get a × at their right end: a description's way to take one out. */
  removable?: boolean;
}

const External = Annotation.define<boolean>();

/* ---------------------------------------------------------------- widgets */

class CheckWidget extends WidgetType {
  constructor(readonly checked: boolean, readonly label: string) { super(); }
  eq(other: CheckWidget) { return other.checked === this.checked && other.label === this.label; }
  toDOM(view: EditorView) {
    const box = document.createElement('span');
    box.className = 'md-check';
    box.setAttribute('role', 'checkbox');
    box.setAttribute('aria-checked', String(this.checked));
    box.setAttribute('aria-label', this.label);
    box.innerHTML = '<span class="checkbox"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
      + 'stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg></span>';
    // The caret stays where it was: ticking a box is not a click into the line.
    box.addEventListener('mousedown', (event) => event.preventDefault());
    box.addEventListener('click', (event) => {
      event.preventDefault();
      const at = view.posAtDOM(box);
      const line = view.state.doc.lineAt(at);
      const task = /^( {0,3})([-*]) \[([ xX])\]/.exec(line.text);
      if (!task) return;
      const mark = line.from + task[1].length + 3;
      view.dispatch({ changes: { from: mark, to: mark + 1, insert: task[3] === ' ' ? 'x' : ' ' } });
    });
    return box;
  }
  ignoreEvent() { return true; }
}

class BulletWidget extends WidgetType {
  eq() { return true; }
  toDOM() {
    const dot = document.createElement('span');
    dot.className = 'md-dot';
    dot.textContent = '•';
    dot.setAttribute('aria-hidden', 'true');
    return dot;
  }
}

class RemoveWidget extends WidgetType {
  constructor(readonly label: string) { super(); }
  eq(other: RemoveWidget) { return other.label === this.label; }
  toDOM(view: EditorView) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'checkdel';
    button.setAttribute('aria-label', this.label);
    button.title = this.label;
    button.innerHTML = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
      + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
    button.addEventListener('mousedown', (event) => event.preventDefault());
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const line = view.state.doc.lineAt(view.posAtDOM(button));
      // The line and one of its line breaks, so no empty line is left behind.
      const from = line.number < view.state.doc.lines ? line.from : Math.max(0, line.from - 1);
      const to = line.number < view.state.doc.lines ? line.to + 1 : line.to;
      view.dispatch({ changes: { from, to }, selection: { anchor: Math.min(from, view.state.doc.length - (to - from)) } });
      view.focus();
    });
    /* The button is placed by the line, at its right edge. This holder takes no room and stays where the text
       ends, so a caret at the end of an empty item is measured there and not beside the button. */
    const holder = document.createElement('span');
    holder.className = 'checkdel-holder';
    holder.appendChild(button);
    return holder;
  }
  ignoreEvent() { return true; }
}

const HIDDEN = Decoration.replace({});

/* ------------------------------------------------------------ decorations */

const markClass: Record<InlineSpan['kind'], string> = {
  strong: 'md-strong', em: 'md-em', del: 'md-del', code: 'md-code', link: 'md-link',
};

interface Labels { tick: string; remove: string }

function buildDecorations(view: EditorView, labels: Labels, removable: boolean): DecorationSet {
  const { state } = view;
  const builder = new RangeSetBuilder<Decoration>();
  const sel = state.selection.main;
  const first = view.hasFocus ? state.doc.lineAt(sel.from).number : -1;
  const last = view.hasFocus ? state.doc.lineAt(sel.to).number : -1;

  for (let n = 1; n <= state.doc.lines; n += 1) {
    const line = state.doc.line(n);
    const note: NoteLine = readLine(line.text);
    const active = n >= first && n <= last;
    const classes = ['md-line'];
    if (note.kind !== 'paragraph') classes.push(`md-${note.kind}`);
    if (note.level) classes.push(`md-h${note.level}`);
    if (note.checked) classes.push('md-done');
    if (active) classes.push('md-active');
    builder.add(line.from, line.from, Decoration.line({ class: classes.join(' ') }));

    // Everything on this line that is not a plain word, in the order it sits.
    const marks: Array<Range<Decoration>> = [];
    const prefixEnd = line.from + note.prefix.length;
    if (note.prefix) {
      if (note.kind === 'task') {
        marks.push(Decoration.replace({ widget: new CheckWidget(note.checked === true, labels.tick) }).range(line.from, prefixEnd));
      } else if (note.kind === 'bullet') {
        marks.push(Decoration.replace({ widget: new BulletWidget() }).range(line.from, prefixEnd));
      } else if (note.kind === 'number') {
        marks.push(Decoration.mark({ class: 'md-num' }).range(line.from, prefixEnd));
      } else {
        marks.push(HIDDEN.range(line.from, prefixEnd));
      }
    }
    const spans = inlineSpans(note.text);
    for (const span of spans) {
      const base = prefixEnd;
      const from = base + span.from;
      const to = base + span.to;
      const [oa, ob] = [base + span.open[0], base + span.open[1]];
      const [ca, cb] = [base + span.close[0], base + span.close[1]];
      const syntax = HIDDEN;
      if (oa < ob) marks.push(syntax.range(oa, ob));
      if (ob < ca) marks.push(Decoration.mark({ class: markClass[span.kind], attributes: span.href ? { 'data-href': span.href } : undefined }).range(ob, ca));
      else if (oa === ob && ca === cb && from < to) marks.push(Decoration.mark({ class: markClass[span.kind], attributes: span.href ? { 'data-href': span.href } : undefined }).range(from, to));
      if (ca < cb) marks.push(syntax.range(ca, cb));
    }
    // A formatting shortcut at an empty caret is already rich, before the first letter.
    if (active && sel.empty) {
      const caret = sel.head - prefixEnd;
      for (const marker of ['**', '__', '~~', '`', '*']) {
        const from = caret - marker.length;
        const to = caret + marker.length;
        if (from < 0 || to > note.text.length || spans.some((span) => from < span.to && to > span.from)) continue;
        if (note.text.slice(from, caret) === marker && note.text.slice(caret, to) === marker) {
          marks.push(HIDDEN.range(prefixEnd + from, prefixEnd + caret));
          marks.push(HIDDEN.range(prefixEnd + caret, prefixEnd + to));
          break;
        }
      }
    }
    if (removable && note.kind === 'task') {
      marks.push(Decoration.widget({ widget: new RemoveWidget(labels.remove), side: 1 }).range(line.to));
    }
    marks.sort((a, b) => a.from - b.from || a.value.startSide - b.value.startSide);
    for (const mark of marks) builder.add(mark.from, mark.to, mark.value);
  }
  return builder.finish();
}

/* ------------------------------------------------------------------ edits */

/** The smallest change that turns `from` into `to`, so the caret and the undo history stay where they are. */
function diff(from: string, to: string) {
  let start = 0;
  const max = Math.min(from.length, to.length);
  while (start < max && from[start] === to[start]) start += 1;
  let endFrom = from.length;
  let endTo = to.length;
  while (endFrom > start && endTo > start && from[endFrom - 1] === to[endTo - 1]) { endFrom -= 1; endTo -= 1; }
  return { from: start, to: endFrom, insert: to.slice(start, endTo) };
}

/** Wraps the selection in a marker, or takes it off when it is already wrapped. */
function toggleWrap(marker: string) {
  return (view: EditorView): boolean => {
    const { state } = view;
    view.dispatch(state.changeByRange((range) => {
      const w = marker.length;
      const before = state.sliceDoc(Math.max(0, range.from - w), range.from);
      const after = state.sliceDoc(range.to, range.to + w);
      if (before === marker && after === marker) {
        return {
          changes: [{ from: range.from - w, to: range.from }, { from: range.to, to: range.to + w }],
          range: EditorSelection.range(range.anchor - w, range.head - w),
        };
      }
      if (range.empty) {
        const line = state.doc.lineAt(range.head);
        const span = inlineSpans(line.text).find((span) =>
          line.from + span.open[1] <= range.head && range.head <= line.from + span.to
          && state.sliceDoc(line.from + span.open[0], line.from + span.open[1]) === marker);
        if (span) {
          const closing = line.from + span.close[0];
          if (range.head >= closing) return { range: EditorSelection.cursor(line.from + span.to) };
          return { changes: { from: range.head, insert: marker + marker }, range: EditorSelection.cursor(range.head + w) };
        }
        return {
          changes: { from: range.from, insert: marker + marker },
          range: EditorSelection.cursor(range.from + w),
        };
      }
      return {
        changes: [{ from: range.from, insert: marker }, { from: range.to, insert: marker }],
        range: EditorSelection.range(range.anchor + w, range.head + w),
      };
    }));
    return true;
  };
}

/** Change selected blocks without losing the selected words. */
function toggleLines(view: EditorView, prefix: string) {
  const { state } = view;
  const range = state.selection.main;
  const first = state.doc.lineAt(range.from).number;
  const last = state.doc.lineAt(range.to > range.from ? range.to - 1 : range.to).number;
  const lines = Array.from({ length: last - first + 1 }, (_, index) => state.doc.line(first + index));
  const prefixes = lines.map((line) => readLine(line.text).prefix);
  const remove = prefixes.every((p) => prefix === '1. ' ? /^\d+[.)] $/.test(p) : prefix === '- [ ] ' ? /^[-*] \[([ xX])\] $/.test(p) : p === prefix);
  const changes = state.changes(lines.map((line, index) => ({ from: line.from, to: line.from + prefixes[index].length, insert: remove ? '' : prefix === '1. ' ? `${index + 1}. ` : prefix })));
  view.dispatch({ changes, selection: EditorSelection.range(changes.mapPos(range.anchor, 1), changes.mapPos(range.head, 1)), userEvent: 'input' });
}

/** Delete selected visible words together with their hidden formatting markers. */
function deleteSelection(view: EditorView): boolean {
  const { state } = view;
  const range = state.selection.main;
  if (range.empty) return false;
  let from = range.from;
  let to = range.to;
  for (let n = state.doc.lineAt(from).number; n <= state.doc.lineAt(to).number; n += 1) {
    const line = state.doc.line(n);
    const note = readLine(line.text);
    const base = line.from + note.prefix.length;
    for (const span of inlineSpans(note.text)) {
      if (from <= base + span.open[1] && to >= base + span.close[0]) {
        from = Math.min(from, base + span.from);
        to = Math.max(to, base + span.to);
      }
    }
  }
  view.dispatch({ changes: { from, to }, selection: { anchor: from }, userEvent: 'delete.selection' });
  return true;
}

/** Enter carries a list on, and on an empty item ends it. */
function enter(view: EditorView, carryLists = true): boolean {
  const { state } = view;
  const sel = state.selection.main;
  if (!sel.empty) {
    let from = sel.from;
    let to = sel.to;
    const first = state.doc.lineAt(from);
    const last = state.doc.lineAt(to);
    for (let n = first.number; n <= last.number; n++) {
      const line = state.doc.line(n);
      for (const span of inlineSpans(line.text)) {
        if (from <= line.from + span.open[1] && to >= line.from + span.close[0]) {
          from = Math.min(from, line.from + span.from);
          to = Math.max(to, line.from + span.to);
        }
      }
    }
    const merged = state.sliceDoc(first.from, from) + state.sliceDoc(to, last.to);
    const result = richEnter(merged, from - first.from, carryLists ? pressEnter : (text, caret) => ({ line: text.slice(0, caret), next: text.slice(caret), caret: 0 }));
    const insert = result.next === null ? result.line : `${result.line}\n${result.next}`;
    const caret = first.from + (result.next === null ? 0 : result.line.length + 1) + result.caret;
    view.dispatch({ changes: { from: first.from, to: last.to, insert }, selection: { anchor: caret }, userEvent: 'input', annotations: isolateHistory.of('full') });
    return true;
  }
  const line = state.doc.lineAt(sel.head);
  const result = richEnter(line.text, sel.head - line.from, carryLists ? pressEnter : (text, caret) => ({ line: text.slice(0, caret), next: text.slice(caret), caret: 0 }));
  if (result.next === null) {
    view.dispatch({
      changes: { from: line.from, to: line.to, insert: result.line },
      selection: { anchor: line.from + result.caret },
      userEvent: 'input',
      annotations: isolateHistory.of('full'),
    });
  } else {
    view.dispatch({
      changes: { from: line.from, to: line.to, insert: `${result.line}\n${result.next}` },
      selection: { anchor: line.from + result.line.length + 1 + result.caret },
      userEvent: 'input',
      annotations: isolateHistory.of('full'),
    });
  }
  return true;
}

/**
 * Home goes to the start of the words, after the box or the bullet, and a
 * second Home to the start of the line. A wrapped line's other rows keep the
 * browser's own Home.
 */
const home = (extend: boolean) => (view: EditorView): boolean => {
  const range = view.state.selection.main;
  const line = view.state.doc.lineAt(range.head);
  const start = line.from + readLine(line.text).prefix.length;
  if (start === line.from) return false;
  if (view.moveToLineBoundary(range, false, true).head !== line.from) return false;
  const to = range.head > start ? start : line.from;
  view.dispatch({ selection: extend ? EditorSelection.range(range.anchor, to) : EditorSelection.cursor(to), scrollIntoView: true });
  return true;
};

/** Shift+Enter is a plain new line: no marker is carried on. */
function plainEnter(view: EditorView): boolean {
  return enter(view, false);
}

/**
 * `[]` or `[ ]` and a space at the start of a line, with or without the
 * bullet in front of them, is a task as soon as the space is typed.
 */
const taskTyping = EditorView.inputHandler.of((view, from, to, text) => {
  if (text !== ' ') return false;
  const line = view.state.doc.lineAt(from);
  const before = line.text.slice(0, from - line.from);
  const match = /^( {0,3})(?:[-*] )?\[ ?\]$/.exec(before);
  if (!match) return false;
  const prefix = `${match[1]}- [ ] `;
  view.dispatch({
    changes: { from: line.from, to, insert: prefix },
    selection: { anchor: line.from + prefix.length },
    userEvent: 'input.type',
  });
  return true;
});

/* -------------------------------------------------------------- component */

/** The keys the editor has no use for: Enter is its own, and ⌘↵ and Escape belong to the field around it. */
const baseKeymap = defaultKeymap.filter((binding) => !/Enter|Escape/.test(`${binding.key ?? ''}${binding.mac ?? ''}`));

export function MarkdownEditor({
  value, onChange, onCommit, placeholder, ariaLabel, autoFocus = false, variant = 'detail',
  accept, onRefused, removable = false, initialLinkSelection,
}: MarkdownEditorProps) {
  const { t } = useT();
  const host = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const linking = useRef(false);
  const [floating, setFloating] = useState<{ left: number; top: number } | null>(null);
  const toolbar = useRef<HTMLDivElement>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const linkRange = useRef({ from: 0, to: 0 });
  const openLink = () => {
    const editor = view.current;
    if (!editor) return;
    const range = editor.state.selection.main;
    linkRange.current = { from: range.from, to: range.to };
    const line = editor.state.doc.lineAt(range.from);
    const existing = inlineSpans(line.text).find((span) => span.kind === 'link' && line.from + span.open[1] <= range.from && line.from + span.close[0] >= range.to);
    if (existing) linkRange.current = { from: line.from + existing.from, to: line.from + existing.to };
    setLinkText(existing ? editor.state.sliceDoc(line.from + existing.open[1], line.from + existing.close[0]) : editor.state.sliceDoc(range.from, range.to));
    setLinkUrl(existing?.href ?? '');
    linking.current = true;
    setLinkOpen(true);
  };
  const view = useRef<EditorView | null>(null);
  // The latest of everything the editor calls back into, so it is built once.
  const live = useRef({ onChange, onCommit, accept, onRefused, variant });
  live.current = { onChange, onCommit, accept, onRefused, variant };
  const labels = useRef<Labels>({ tick: t('checklist.tick'), remove: t('checklist.remove') });
  labels.current = { tick: t('checklist.tick'), remove: t('checklist.remove') };
  const initial = useRef({ value, ariaLabel, placeholder, autoFocus, removable, initialLinkSelection });

  useEffect(() => {
    let disposing = false;
    const { value: first, ariaLabel: label, placeholder: hint, autoFocus: focus, removable: del, initialLinkSelection: pendingLink } = initial.current;

    const formatting = ViewPlugin.fromClass(class {
      decorations: DecorationSet;
      constructor(v: EditorView) { this.decorations = buildDecorations(v, labels.current, del); }
      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet || update.focusChanged || update.viewportChanged) {
          this.decorations = buildDecorations(update.view, labels.current, del);
        }
      }
    }, {
      decorations: (plugin) => plugin.decorations,
      provide: (plugin) => EditorView.atomicRanges.of((v) => v.plugin(plugin)?.decorations.update({ filter: (from, to, decoration) => from < to && !decoration.spec.class }) ?? Decoration.none),
    });

    const state = EditorState.create({
      doc: first.replace(/\r\n?/g, '\n'),
      extensions: [
        history(),
        drawSelection(),
        EditorView.lineWrapping,
        placeholderExt(hint),
        EditorView.contentAttributes.of({
          'aria-label': label, 'aria-multiline': 'true', spellcheck: 'true', autocapitalize: 'sentences',
        }),
        formatting,
        taskTyping,
        // An edit the host refuses is cancelled where it is made, before anything has changed.
        EditorState.transactionFilter.of((tr) => {
          if (!tr.docChanged || tr.annotation(External)) return tr;
          const next = tr.newDoc.toString();
          const previous = tr.startState.doc.toString();
          if (live.current.accept && !live.current.accept(next, previous)) {
            live.current.onRefused?.(next);
            return [];
          }
          return tr;
        }),
        keymap.of([
          { key: 'Backspace', run: deleteSelection },
          { key: 'Delete', run: deleteSelection },
          { key: 'Enter', run: enter, shift: plainEnter },
          { key: 'Home', run: home(false), shift: home(true) },
          { key: 'Mod-b', run: toggleWrap('**') },
          { key: 'Mod-i', run: toggleWrap('*') },
          { key: 'Mod-k', run: () => { openLink(); return true; } },
          ...historyKeymap,
          ...baseKeymap,
        ]),
        EditorView.updateListener.of((update) => {
          if (update.selectionSet || update.focusChanged || update.docChanged) {
            update.view.requestMeasure({ read: (editor) => {
              const range = editor.state.selection.main;
              if (range.empty || !editor.hasFocus || live.current.variant !== 'detail') return null;
              const a = editor.coordsAtPos(range.from);
              const b = editor.coordsAtPos(range.to);
              if (!a || !b) return null;
              const width = Math.min(510, window.innerWidth - 16);
              return { left: Math.max(width / 2 + 8, Math.min(window.innerWidth - width / 2 - 8, (a.left + b.right) / 2)), top: a.top < 70 ? b.bottom + 66 : a.top - 8 };
            }, write: (rect) => { if (!disposing) setFloating(rect); } });
          }
          if (update.docChanged && !update.transactions.some((tr) => tr.annotation(External))) {
            live.current.onChange(update.state.doc.toString());
          }
        }),
        EditorView.domEventHandlers({
          keydown(event) {
            const mod = event.metaKey || event.ctrlKey;
            // The note's own undo is not the app's.
            if (event.key !== 'Escape' || live.current.variant === 'detail') event.stopPropagation();
            if (live.current.variant !== 'detail') return false;
            if (event.key === 'Escape' || (event.key === 'Enter' && mod)) {
              event.preventDefault();
              event.stopPropagation();
              live.current.onCommit?.();
              (event.target as HTMLElement).blur();
              return true;
            }
            return false;
          },
          blur(event) {
            const next = event.relatedTarget as Node | null;
            // StrictMode destroys and recreates effects; that blur is not a user leaving the field.
            if (disposing || linking.current || (next && (host.current?.contains(next) || toolbar.current?.contains(next)))) return false;
            live.current.onCommit?.();
            return false;
          },
          paste(event, editor) {
            // Several lines pasted into a task are several tasks, not one line with breaks in it.
            const pasted = event.clipboardData?.getData('text/plain') ?? '';
            const address = pasted.trim();
            const selected = editor.state.selection.main;
            if (!selected.empty && normalizeLink(address)) {
              event.preventDefault();
              const label = editor.state.sliceDoc(selected.from, selected.to);
              const text = `[${label}](${normalizeLink(address)!.replace(/\)/g, '%29')})`;
              editor.dispatch({ changes: { from: selected.from, to: selected.to, insert: text }, selection: { anchor: selected.from + text.length }, userEvent: 'input.paste' });
              return true;
            }
            if (!/[\r\n]/.test(pasted)) return false;
            const range = editor.state.selection.main;
            const line = editor.state.doc.lineAt(range.from);
            const note = readLine(line.text);
            if (note.kind !== 'task' || editor.state.doc.lineAt(range.to).number !== line.number) return false;
            const doc = editor.state.doc.toString();
            const offset = (at: number) => Math.max(0, at - line.from - note.prefix.length);
            const result = pasteIntoItem(doc, line.number - 1, offset(range.from), offset(range.to), pasted.replace(/\r\n?/g, '\n'));
            event.preventDefault();
            if (!result) return true;
            const target = parseLines(result.description)[result.line];
            const lineStart = result.description.split('\n').slice(0, result.line).join('\n').length + (result.line > 0 ? 1 : 0);
            const caret = lineStart + (target.item ? target.text.length - itemText(target.item).length + result.caret : result.caret);
            editor.dispatch({ changes: diff(doc, result.description), selection: { anchor: caret }, userEvent: 'input.paste', scrollIntoView: true });
            return true;
          },
          mousedown(event) {
            // ⌘ or Ctrl and a click on a link opens it; a plain click puts the caret in.
            const link = (event.target as HTMLElement).closest<HTMLElement>('.md-link[data-href]');
            if ((event.metaKey || event.ctrlKey) && link?.dataset.href) {
              event.preventDefault();
              window.open(link.dataset.href, '_blank', 'noopener,noreferrer');
              return true;
            }
            return false;
          },
        }),
      ],
    });

    const editor = new EditorView({ state, parent: content.current! });
    view.current = editor;
    if (focus) {
      editor.focus();
      editor.dispatch({ selection: pendingLink
        ? { anchor: Math.min(pendingLink.from, editor.state.doc.length), head: Math.min(pendingLink.to, editor.state.doc.length) }
        : { anchor: editor.state.doc.length } });
    }
    if (pendingLink) openLink();
    return () => { disposing = true; view.current = null; editor.destroy(); };
  }, []);

  /* What the page holds changed behind the editor (an edit on another device,
     a draft put back): brought in as the smallest change, without a new step
     of undo and without taking the caret. */
  useEffect(() => {
    const editor = view.current;
    if (!editor) return;
    const current = editor.state.doc.toString();
    const wanted = value.replace(/\r\n?/g, '\n');
    if (current === wanted) return;
    editor.dispatch({
      changes: diff(current, wanted),
      annotations: [External.of(true), Transaction.addToHistory.of(false)],
    });
  }, [value]);

  const closeLink = () => {
    linking.current = false;
    setLinkOpen(false);
    view.current?.focus();
  };
  const applyLink = () => {
    const editor = view.current;
    if (!editor || !normalizeLink(linkUrl)) return;
    const { from, to } = linkRange.current;
    const url = normalizeLink(linkUrl)!.replace(/\)/g, '%29');
    const label = (linkText.trim() || url).replace(/\[/g, '\\[').replace(/\]/g, '\\]');
    const text = `[${label}](${url})`;
    editor.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + text.length }, userEvent: 'input' });
    closeLink();
  };

  return <div ref={host} className={`mdedit ${variant}`} data-editor={variant}
    onMouseDown={(event) => {
      if (event.target === event.currentTarget || event.target === content.current) { event.preventDefault(); view.current?.focus(); }
    }}>
    <div ref={content} className="md-content" />
    {floating && variant === 'detail' && !linkOpen && createPortal(
      <div ref={toolbar} className="md-toolbar" style={floating} role="toolbar" aria-label={t('editor.formatting')}>
        {([
          ['bold', '**', <Icon key="b" name="bold" />], ['italic', '*', <Icon key="i" name="italic" />],
          ['strike', '~~', <Icon key="s" name="strike" />],
        ] as const).map(([label, marker, face]) => <button key={label} type="button" aria-label={t(`editor.${label}`)} title={t(`editor.${label}`)}
          onMouseDown={(event) => event.preventDefault()} onClick={() => { if (view.current) { toggleWrap(marker)(view.current); view.current.focus(); } }}>{face}</button>)}
        {([
          ['h1', '# ', <Icon name="heading1" />], ['h2', '## ', <Icon name="heading2" />], ['quote', '> ', <Icon name="quote" />],
        ] as const).map(([label, prefix, face]) => <button key={label} type="button" aria-label={t(`editor.${label}`)} title={t(`editor.${label}`)}
          onMouseDown={(event) => event.preventDefault()} onClick={() => { if (view.current) { toggleLines(view.current, prefix); view.current.focus(); } }}>{face}</button>)}
        <button type="button" aria-label={t('editor.code')} title={t('editor.code')} onMouseDown={(event) => event.preventDefault()} onClick={() => { if (view.current) { toggleWrap('`')(view.current); view.current.focus(); } }}><Icon name="code" /></button>
        <button type="button" aria-label={t('editor.bullets')} title={t('editor.bullets')} onMouseDown={(event) => event.preventDefault()} onClick={() => { if (view.current) { toggleLines(view.current, '- '); view.current.focus(); } }}><Icon name="list" /></button>
        <button type="button" aria-label={t('editor.numbered')} title={t('editor.numbered')} onMouseDown={(event) => event.preventDefault()} onClick={() => { if (view.current) { toggleLines(view.current, '1. '); view.current.focus(); } }}><Icon name="list-ordered" /></button>
        <button type="button" aria-label={t('editor.checklist')} title={t('editor.checklist')} onMouseDown={(event) => event.preventDefault()} onClick={() => { if (view.current) { toggleLines(view.current, '- [ ] '); view.current.focus(); } }}><Icon name="tasks" /></button>
        <button type="button" className="md-link-button" title={t('editor.linkHint')} onMouseDown={(event) => event.preventDefault()} onClick={openLink}><Icon name="link" /> {t('editor.link')}</button>
      </div>, document.body)}
    {linkOpen && createPortal(<Overlay open label={t('editor.link')} size="sm" onClose={closeLink} returnFocusTo={() => view.current?.contentDOM ?? null}>
      <form className="md-link-dialog" onSubmit={(event) => { event.preventDefault(); applyLink(); }}>
        <label>{t('editor.linkText')}<input aria-label={t('editor.linkText')} value={linkText} onChange={(event) => setLinkText(event.target.value)} /></label>
        <label>{t('editor.url')}<input data-autofocus type="text" inputMode="url" aria-label={t('editor.url')} placeholder={t('editor.urlPlaceholder')} value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} /></label>
        <footer><button type="button" className="btn" onClick={closeLink}>{t('common.cancel')}</button><button type="submit" className="btn primary" disabled={!normalizeLink(linkUrl)}>{t('editor.apply')}</button></footer>
      </form>
    </Overlay>, document.body)}
  </div>;
}
