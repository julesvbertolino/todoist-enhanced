/** What only the screen holds: toasts, the undo stack, drag state and the selection. */
import { newUuid } from '@/api/commands';
import { ERROR_TOAST_MS, TOAST_MS, UNDO_TOAST_MS } from './helpers';
import type { Toast } from './types';
import type { Slice, UiSlice } from './types';

export const UNDO_DEPTH = 25;

export const createUiSlice: Slice<UiSlice> = (set, get) => ({
  toasts: [],
  undoStack: [],
  draggingTaskId: null,
  draggingSectionId: null,
  nesting: false,
  outdenting: false,
  draggingProjectId: null,
  draggingTag: null,
  selection: [],
  selectionAnchor: null,
  sidePanel: null,
  timeFilter: { minutes: null, scope: 'page', sort: 'duration' },
  /* Closing "I have time" ends the choice: the pill reads "I have time" again
     and the next opening starts with no duration picked (#30). */
  openSidePanel(panel) {
    const leavingTime = get().sidePanel === 'time' && panel !== 'time';
    set({ sidePanel: panel, ...(leavingTime ? { timeFilter: { ...get().timeFilter, minutes: null } } : {}) });
  },
  closeSidePanel(panel) {
    if (panel && get().sidePanel !== panel) return;
    const leavingTime = get().sidePanel === 'time';
    set({ sidePanel: null, ...(leavingTime ? { timeFilter: { ...get().timeFilter, minutes: null } } : {}) });
  },
  setTimeFilter(patch) { set({ timeFilter: { ...get().timeFilter, ...patch } }); },
  toast(message, undo, options) {
    const id = newUuid();
    /* The toast's own button and Cmd+Z are two ways to the same single step,
       so they share one entry: using either takes it off the stack and the
       other one can no longer replay it. */
    if (undo) {
      set({
        undoStack: [...get().undoStack, { id, label: message, run: undo }].slice(-UNDO_DEPTH),
      });
    }
    const entry: Toast = {
      id,
      message,
      undo: undo ? () => { void get().consumeUndo(id); } : undefined,
      tone: options?.tone,
    };
    set({ toasts: [...get().toasts, entry] });
    const stays = options?.tone === 'error' ? ERROR_TOAST_MS : undo ? UNDO_TOAST_MS : TOAST_MS;
    setTimeout(() => get().dismissToast(entry.id), stays);
  },
  dismissToast(id) {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
  pushUndo(label, run) {
    set({
      undoStack: [...get().undoStack, { id: newUuid(), label, run }].slice(-UNDO_DEPTH),
    });
  },
  async undo() {
    const stack = get().undoStack;
    const entry = stack[stack.length - 1];
    if (!entry) return;
    set({ undoStack: stack.slice(0, -1), toasts: get().toasts.filter((t) => t.id !== entry.id) });
    await entry.run();
  },
  async consumeUndo(id) {
    const entry = get().undoStack.find((e) => e.id === id);
    set({ undoStack: get().undoStack.filter((e) => e.id !== id) });
    await entry?.run();
  },
  setDraggingSection(id) { set({ draggingSectionId: id }); },
  setDraggingTag(name) { set({ draggingTag: name }); },
  setNesting(nesting) {
    if (get().nesting !== nesting) set({ nesting });
  },
  setOutdenting(outdenting) {
    if (get().outdenting !== outdenting) set({ outdenting });
  },
  setDraggingProject(id) {
    if (get().draggingProjectId !== id) set({ draggingProjectId: id });
  },
  toggleSelection(id) {
    const current = get().selection;
    set({
      selection: current.includes(id)
        ? current.filter((other) => other !== id)
        : [...current, id],
      selectionAnchor: id,
    });
  },
  setSelectionAnchor(id) {
    if (get().selectionAnchor !== id) set({ selectionAnchor: id });
  },
  selectRange(ids, additive) {
    if (ids.length === 0) return;
    const next = additive ? [...new Set([...get().selection, ...ids])] : ids;
    set({ selection: next, selectionAnchor: ids[ids.length - 1] });
  },
  clearSelection() {
    if (get().selection.length > 0 || get().selectionAnchor) {
      set({ selection: [], selectionAnchor: null });
    }
  },
  setDragging(id) {
    set({ draggingTaskId: id });
  },
});
