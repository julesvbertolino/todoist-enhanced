import { inlineSpans } from './inlineMarks';
import { isLinkUrl } from './markdown';
import type { EnterResult } from './descriptionLines';

/** A pasted/entered web address or app deep link, with an implicit secure scheme for domains. */
export function normalizeLink(input: string): string | null {
  const text = input.trim();
  if (!text || /\s/.test(text)) return null;
  if (!/^https?:\/\//i.test(text) && isLinkUrl(text)) return text;
  if (!/^https?:\/\//i.test(text) && !/^(?:[\p{L}\d](?:[\p{L}\d-]*[\p{L}\d])?\.)+[\p{L}]{2,}(?::\d+)?(?:[/?#].*)?$/u.test(text)) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    return url.hostname && !url.username && !url.password ? (/^https?:\/\//i.test(text) ? text : `https://${text}`) : null;
  } catch { return null; }
}

/**
 * A link pasted over selected text keeps the text and becomes its address:
 * `[text](link)`, as Todoist does. Null when nothing is selected or what is
 * pasted is not a link.
 */
export function linkSelection(value: string, from: number, to: number, pasted: string): { value: string; caret: number } | null {
  const url = from < to ? normalizeLink(pasted) : null;
  if (!url) return null;
  const link = `[${value.slice(from, to)}](${url.replace(/\)/g, '%29')})`;
  return { value: value.slice(0, from) + link + value.slice(to), caret: from + link.length };
}

/** Balance inline formatting on both sides of a new paragraph. Links end here. */
export function richEnter(text: string, caret: number, split: (text: string, caret: number) => EnterResult): EnterResult {
  const active = inlineSpans(text).filter(span => span.open[0] !== span.open[1] && span.open[1] <= caret && caret <= span.close[0]);
  if (!active.length) return split(text, caret);
  let left = text.slice(0, caret);
  let right = text.slice(caret);
  // Enclosing spans appear first; close innermost first and reopen outermost first.
  for (const span of [...active].reverse()) left += text.slice(...span.close);
  const links = active.filter(span => span.kind === 'link');
  for (const link of [...links].sort((a,b) => b.close[0] - a.close[0])) {
    const at = link.close[0] - caret;
    right = right.slice(0, at) + right.slice(at + link.close[1] - link.close[0]);
  }
  const opening = active.filter(span => span.kind !== 'link').map(span => text.slice(...span.open)).join('');
  const result = split(left + right, left.length);
  if (result.next !== null) {
    result.next = result.next.slice(0,result.caret) + opening + result.next.slice(result.caret);
    result.caret += opening.length;
  }
  return result;
}
