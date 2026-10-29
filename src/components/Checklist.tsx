import { lazy, Suspense, useMemo, useState } from 'react';
import { Icon } from './Icon';
const MarkdownEditor = lazy(() => import('./MarkdownEditor').then((module) => ({ default: module.MarkdownEditor })));
import { ProgressRing } from './ProgressRing';
import { useT } from '@/hooks/useT';
import { renderInlineMarkdown, renderMarkdown } from '@/domain/markdown';
import {
  checklistProgress, fitsDescription, isChecked, itemText, parseLines,
  type Line, type ListMark,
} from '@/domain/checklist';

/**
 * Markdown task lists in a description (#157): the same lines shown as real
 * checkboxes, and edited as rows rather than as syntax.
 *
 * Nothing is stored beside the description. Every function here reads the
 * description as lines and writes it back as lines, so the text around a
 * checklist is never touched, and a tick is one character of one line.
 */

/** Consecutive lines of one kind: a run of text, or a run of items. */
type Block =
  | { kind: 'text'; start: number; lines: Line[] }
  | { kind: 'item'; line: number; mark: ListMark };

function blocksOf(lines: readonly Line[]): Block[] {
  const out: Block[] = [];
  lines.forEach((line, at) => {
    if (line.item) {
      out.push({ kind: 'item', line: at, mark: line.item });
    } else {
      const last = out[out.length - 1];
      if (last?.kind === 'text') last.lines.push(line);
      else out.push({ kind: 'text', start: at, lines: [line] });
    }
  });
  return out;
}

/** The words of a run of lines, without the ending of the last one. */
const textOf = (lines: readonly Line[]): string =>
  lines.map((line, at) => line.text + (at < lines.length - 1 ? line.eol : '')).join('');

/* ------------------------------------------------------------------ */

/** "3 of 7", with the ring beside it: how far along the checklist is. */
export function ChecklistProgress({ description }: { description: string }) {
  const { t } = useT();
  const { done, total } = useMemo(() => checklistProgress(description), [description]);
  if (total === 0) return null;
  return (
    <div className="checkprogress">
      <ProgressRing done={done} total={total} size="sm" />
      <span>{t('checklist.progress', { done, total })}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * The description as it reads: text as Markdown, and the checklist where its
 * lines are, as checkboxes that tick in place. A tick asks for exactly one
 * line to change; the parent applies it to the latest text it knows.
 */
export function DescriptionView({
  value, onToggle,
}: { value: string; onToggle: (line: number) => void }) {
  const { t } = useT();
  const blocks = useMemo(() => blocksOf(parseLines(value)), [value]);

  // Consecutive items are one checklist; text between them splits it in two.
  const rendered: Array<
    | { kind: 'text'; key: string; html: string }
    | { kind: 'list'; key: string; items: Array<{ line: number; mark: ListMark }> }
  > = [];
  for (const block of blocks) {
    if (block.kind === 'text') {
      rendered.push({ kind: 'text', key: `t${block.start}`, html: renderMarkdown(textOf(block.lines)) });
    } else {
      const last = rendered[rendered.length - 1];
      if (last?.kind === 'list') last.items.push({ line: block.line, mark: block.mark });
      else rendered.push({ kind: 'list', key: `l${block.line}`, items: [{ line: block.line, mark: block.mark }] });
    }
  }

  return (
    <>
      {rendered.map((part) => part.kind === 'text' ? (
        <div className="md" key={part.key} dangerouslySetInnerHTML={{ __html: part.html }} />
      ) : (
        <div className="checklist" role="group" aria-label={t('checklist.label')} key={part.key}>
          {part.items.map(({ line, mark }) => {
            const text = itemText(mark);
            return (
              <label className={`checkitem${isChecked(mark) ? ' done' : ''}`} key={line}>
                <input
                  type="checkbox"
                  checked={isChecked(mark)}
                  onChange={() => onToggle(line)}
                />
                <span className="checkbox" aria-hidden="true">
                  <Icon name="check" size="sm" />
                </span>
                {text
                  ? <span className="checktext" dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(text) }} />
                  : <span className="checktext empty">{t('checklist.emptyItem')}</span>}
              </label>
            );
          })}
        </div>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */

interface DescriptionEditorProps {
  value: string;
  onChange: (next: string) => void;
  /** The caret left the editor, or Escape / ⌘↵ was pressed: save what is here. */
  onCommit: () => void;
  placeholder: string;
  ariaLabel: string;
  /** Put the caret in at the end when it opens. */
  autoFocus?: boolean;
  /** `detail` is the task panel's field; `composer` is the quieter one under a new task's name. */
  variant?: 'detail' | 'composer';
}

/**
 * Editing a description: Markdown, drawn as it is written. A checklist line is
 * a box and its words and a × to take it out; `[]` or `- []` and a space
 * starts one; Enter makes the next item and, on an empty one, leaves the list;
 * Backspace at the start of an item makes it plain text. The text is the one
 * source of truth, so the words around a checklist are never rewritten.
 */
export function DescriptionEditor({
  value, onChange, onCommit, placeholder, ariaLabel, autoFocus = false, variant = 'detail',
}: DescriptionEditorProps) {
  const { t } = useT();
  const [full, setFull] = useState(false);
  const [fallbackFocused, setFallbackFocused] = useState(false);
  const [pendingLink, setPendingLink] = useState<{ from: number; to: number } | null>(null);
  return (
    <div className={`descedit ${variant}`}>
      <Suspense fallback={<textarea
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={value}
        autoFocus={autoFocus}
        onFocus={() => setFallbackFocused(true)}
        onBlur={() => { setFallbackFocused(false); if (variant === 'detail') onCommit(); }}
        onKeyDown={(event) => {
          if (event.key !== 'Escape' || variant === 'detail') event.stopPropagation();
          if (variant === 'detail' && (event.key === 'Escape' || (event.key === 'Enter' && (event.metaKey || event.ctrlKey)))) {
            event.preventDefault();
            event.currentTarget.blur();
            return;
          }
          if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
            event.preventDefault();
            setPendingLink({ from: event.currentTarget.selectionStart, to: event.currentTarget.selectionEnd });
          }
        }}
        onChange={(event) => {
          setPendingLink(null);
          const next = event.target.value;
          if (fitsDescription(next) || next.length <= value.length) { setFull(false); onChange(next); }
          else setFull(true);
        }}
      />}><MarkdownEditor
        variant={variant}
        value={value}
        onChange={(next) => { setFull(false); onChange(next); }}
        onCommit={onCommit}
        placeholder={placeholder}
        ariaLabel={ariaLabel}
        autoFocus={autoFocus || fallbackFocused}
        initialLinkSelection={pendingLink}
        removable
        accept={(next, previous) => fitsDescription(next) || next.length <= previous.length}
        onRefused={() => setFull(true)}
      /></Suspense>
      {full && <p className="checkfull" role="alert">{t('checklist.full')}</p>}
    </div>
  );
}
