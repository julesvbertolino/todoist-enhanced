import type { KeyboardEvent } from 'react';

/** Move between title and description only at the edges, leaving normal editing keys alone. */
export function editSurfaceKeys(event: KeyboardEvent<HTMLElement>, title: HTMLInputElement | HTMLTextAreaElement | null) {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !title) return;
  if (event.key === 'ArrowDown' && event.target === title && title.selectionStart === title.value.length && title.selectionEnd === title.value.length) {
    const description = event.currentTarget.querySelector<HTMLElement>('.descedit .cm-content, .descedit textarea');
    if (!description) return;
    event.preventDefault();
    event.stopPropagation();
    description.focus();
    if (description instanceof HTMLTextAreaElement) description.setSelectionRange(0, 0);
    else {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(description);
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  } else if (event.key === 'ArrowUp' && event.target instanceof HTMLElement && event.target.closest('.descedit')) {
    const target = event.target;
    let atStart = false;
    if (target instanceof HTMLTextAreaElement) atStart = target.selectionStart === 0 && target.selectionEnd === 0;
    else {
      const selection = window.getSelection();
      if (selection?.isCollapsed && selection.rangeCount && target.contains(selection.anchorNode)) {
        const before = selection.getRangeAt(0).cloneRange();
        before.selectNodeContents(target);
        before.setEnd(selection.anchorNode!, selection.anchorOffset);
        atStart = before.toString().length === 0;
      }
    }
    if (!atStart) return;
    event.preventDefault();
    event.stopPropagation();
    title.focus();
    title.setSelectionRange(title.value.length, title.value.length);
  }
}
