import { useEffect, useMemo } from 'react';
import { create } from 'zustand';
import { ApiError } from '@/api/client';
import { fetchFilterIds, splitQuery } from '@/api/filters';
import { demoFilterIds } from '@/demo/demoFilters';
import { useData } from '@/hooks/useData';
import { useStore } from '@/store/store';
import type { Filter, Item, Snapshot } from '@/domain/types';

export interface FilterPart {
  /** The part of the query this list answers, as written. */
  query: string;
  ids: string[];
}

export interface FilterResult {
  /** One list per comma-separated part; null until the first answer. */
  parts: FilterPart[] | null;
  /** What Todoist said when it refused the query, word for word. */
  error: string | null;
  /** The last answer could not be refreshed: no network, or Todoist did not answer. */
  stale: boolean;
  loading: boolean;
}

interface Entry {
  parts: FilterPart[] | null;
  error: string | null;
  /** The tasks the answer was given for; a different one means it may be out of date. */
  signature: string;
}

/**
 * Todoist's answers, per query, shared by the filter page and the counts.
 *
 * Kept in the browser as well, so a filter opened offline, or after a reload
 * before the first answer, shows the last list rather than nothing.
 */
const useAnswers = create<{
  entries: Record<string, Entry>;
  loading: Record<string, boolean>;
  stale: Record<string, boolean>;
}>(() => ({ entries: {}, loading: {}, stale: {} }));

const STORAGE_PREFIX = 'filter-answers:v1:';
let storageOwner: string | null = null;

function loadFor(owner: string): void {
  if (storageOwner === owner) return;
  storageOwner = owner;
  let entries: Record<string, Entry> = {};
  try {
    entries = JSON.parse(localStorage.getItem(STORAGE_PREFIX + owner) ?? '{}') as Record<string, Entry>;
  } catch {
    entries = {};
  }
  useAnswers.setState({ entries, loading: {}, stale: {} });
}

function save(): void {
  if (!storageOwner) return;
  try {
    localStorage.setItem(STORAGE_PREFIX + storageOwner, JSON.stringify(useAnswers.getState().entries));
  } catch {
    /* A full or blocked storage only costs the offline copy. */
  }
}

const keyOf = (query: string, lang?: string) => `${lang ?? ''}|${query}`;

/**
 * A short fingerprint of the tasks and of the day: when it changes, an answer
 * may have. The day is in it because `today` moves at midnight while no task does.
 */
function fingerprint(items: Record<string, Item>, day: string): string {
  const text = day + JSON.stringify(items);
  let hash = 2166136261;
  for (let at = 0; at < text.length; at += 1) {
    hash ^= text.charCodeAt(at);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

/* Several filters are asked for at once when the sidebar counts them; a few
   at a time keeps well inside Todoist's request limits. */
const MAX_PARALLEL = 3;
const waiting: Array<() => Promise<void>> = [];
let running = 0;
const inFlight = new Set<string>();

function pump(): void {
  while (running < MAX_PARALLEL && waiting.length > 0) {
    const job = waiting.shift()!;
    running += 1;
    void job().finally(() => {
      running -= 1;
      pump();
    });
  }
}

/** Asks Todoist again for a query, unless the answer held is already for these tasks. */
function ensure(query: string, lang: string | undefined, signature: string, first = false): void {
  const key = keyOf(query, lang);
  const owner = storageOwner;
  const flightKey = `${owner}:${key}`;
  const held = useAnswers.getState().entries[key];
  if (!owner || inFlight.has(flightKey) || (held && held.signature === signature)) return;
  inFlight.add(flightKey);
  useAnswers.setState((s) => ({ loading: { ...s.loading, [key]: true } }));

  const job = async () => {
    try {
      if (storageOwner !== owner || useStore.getState().snapshot.user?.id !== owner) return;
      const parts = splitQuery(query);
      const lists = await Promise.all(parts.map((part) => fetchFilterIds(part, lang)));
      if (storageOwner !== owner || useStore.getState().snapshot.user?.id !== owner) return;
      const entry: Entry = { parts: parts.map((part, index) => ({ query: part, ids: lists[index] })), error: null, signature };
      useAnswers.setState((s) => ({
        entries: { ...s.entries, [key]: entry },
        stale: { ...s.stale, [key]: false },
      }));
      save();
    } catch (error) {
      if (storageOwner !== owner || useStore.getState().snapshot.user?.id !== owner) return;
      if (error instanceof ApiError && error.isRefusal) {
        useAnswers.setState((s) => ({
          entries: { ...s.entries, [key]: { parts: null, error: error.detail, signature } },
          stale: { ...s.stale, [key]: false },
        }));
        save();
      } else {
        useAnswers.setState((s) => ({ stale: { ...s.stale, [key]: true } }));
      }
    } finally {
      inFlight.delete(flightKey);
      if (storageOwner === owner && useStore.getState().snapshot.user?.id === owner) {
        useAnswers.setState((s) => ({ loading: { ...s.loading, [key]: false } }));
      }
    }
  };
  /* The page in front goes ahead of the counts. */
  if (first) waiting.unshift(job);
  else waiting.push(job);
  pump();
}

/** Forgets what Todoist said about one query, so it is asked again at once. */
export function forgetFilterAnswer(query: string, lang?: string): void {
  const key = keyOf(query, lang);
  useAnswers.setState((s) => {
    const entries = { ...s.entries };
    delete entries[key];
    return { entries };
  });
}

/**
 * The ids each part of a filter matches in the demo, which has no server.
 * Null for a filter made during the demo: nothing can answer for it.
 */
function demoParts(filter: Filter, items: Item[]): FilterPart[] | null {
  const lists = demoFilterIds(filter.id, items);
  if (!lists) return null;
  return splitQuery(filter.query).map((part, index) => ({ query: part, ids: lists[index] ?? [] }));
}

function useContext() {
  const demo = useStore((s) => s.demo);
  const { snapshot, items } = useData();
  const lang = snapshot.user?.lang;
  const owner = snapshot.user?.id;
  /* Declared before the effects that ask Todoist, so it runs before them. */
  useEffect(() => {
    if (!demo && owner) loadFor(owner);
  }, [demo, owner]);
  const day = new Date().toDateString();
  const signature = useMemo(() => fingerprint(snapshot.items, day), [snapshot.items, day]);
  return { demo, snapshot, items, lang, signature, online: !demo && Boolean(owner) };
}

/**
 * The tasks a saved filter matches, asked of Todoist.
 *
 * Todoist evaluates the query, so the list is exactly what its own app shows.
 * It is asked again whenever the tasks change, so completing or rescheduling
 * one here moves it in or out of the list.
 */
export function useFilterResult(filter: Filter | undefined): FilterResult {
  const { demo, items, lang, signature, online } = useContext();
  const query = filter?.query ?? '';
  const key = keyOf(query, lang);
  const entry = useAnswers((s) => s.entries[key]);
  const loading = useAnswers((s) => s.loading[key] ?? false);
  const stale = useAnswers((s) => s.stale[key] ?? false);

  useEffect(() => {
    if (online && query) ensure(query, lang, signature, true);
  }, [online, query, lang, signature]);

  if (demo) {
    return { parts: filter ? demoParts(filter, items) ?? [] : [], error: null, stale: false, loading: false };
  }
  return {
    parts: entry?.parts ?? null,
    error: entry?.error ?? null,
    stale,
    loading: loading || !entry,
  };
}

/** How many open tasks an answer holds, counting each task once. */
function countOf(parts: FilterPart[] | null | undefined, snapshot: Snapshot): number | undefined {
  if (!parts) return undefined;
  const ids = new Set(parts.flatMap((part) => part.ids));
  let count = 0;
  for (const id of ids) {
    const item = snapshot.items[id];
    if (item && !item.checked && !item.is_deleted) count += 1;
  }
  return count;
}

/** The number of tasks each of these filters holds, by filter id; missing until Todoist has answered. */
export function useFilterCounts(filters: Filter[]): Record<string, number | undefined> {
  const { demo, snapshot, items, lang, signature, online } = useContext();
  const entries = useAnswers((s) => s.entries);
  const queries = filters.map((f) => f.query).join('\n');

  useEffect(() => {
    if (!online) return;
    for (const query of queries.split('\n')) if (query) ensure(query, lang, signature);
  }, [online, queries, lang, signature]);

  return useMemo(() => Object.fromEntries(filters.map((filter) => [
    filter.id,
    demo ? countOf(demoParts(filter, items), snapshot) : countOf(entries[keyOf(filter.query, lang)]?.parts, snapshot),
  ])), [filters, demo, items, snapshot, entries, lang]);
}
