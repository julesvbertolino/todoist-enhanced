import { describe, expect, it } from 'vitest';
import { advanceDemoRecurrence, branchOf, deletionRoots, explainFailure, explainFailures, partitionQueue, restoreOrder } from './helpers';
import type { QueuedCommand } from '@/db/idb';
import { emptySnapshot, type Item } from '@/domain/types';
import { due, item } from '@/test/items';

const tree = (...items: Item[]): Record<string, Item> =>
  Object.fromEntries(items.map((entry) => [entry.id, entry]));

const items = tree(
  item({ id: 'grand' }),
  item({ id: 'parent', parent_id: 'grand' }),
  item({ id: 'child', parent_id: 'parent' }),
  item({ id: 'other-child', parent_id: 'parent' }),
  item({ id: 'lone' }),
  item({ id: 'gone', parent_id: 'lone', is_deleted: true }),
);

describe('deletionRoots (#126)', () => {
  it('drops a subtask picked together with its parent', () => {
    expect(deletionRoots(['child', 'parent'], items)).toEqual(['parent']);
  });

  it('keeps unrelated tasks, in the order they were given', () => {
    expect(deletionRoots(['lone', 'parent'], items)).toEqual(['lone', 'parent']);
  });

  it('keeps only the grandparent when a grandchild is picked with it', () => {
    expect(deletionRoots(['child', 'grand'], items)).toEqual(['grand']);
    expect(deletionRoots(['child', 'parent', 'grand'], items)).toEqual(['grand']);
  });

  it('keeps a subtask whose parent was not picked', () => {
    expect(deletionRoots(['child', 'lone'], items)).toEqual(['child', 'lone']);
  });

  it('counts an id given twice once, and drops one it does not know', () => {
    expect(deletionRoots(['lone', 'lone', 'ghost'], items)).toEqual(['lone']);
  });

  it('does not hang on a cycle', () => {
    const loop = tree(item({ id: 'a', parent_id: 'b' }), item({ id: 'b', parent_id: 'a' }));
    expect(deletionRoots(['a'], loop)).toEqual(['a']);
  });
});

describe('branchOf (#126)', () => {
  it('lists a branch parent first, each task once', () => {
    const ids = branchOf(['grand'], items).map((entry) => entry.id);
    expect(ids).toEqual(['grand', 'parent', 'child', 'other-child']);
  });

  it('does not repeat a task that is both a root and a descendant', () => {
    const ids = branchOf(['grand', 'child'], items).map((entry) => entry.id);
    expect(ids).toEqual(['grand', 'parent', 'child', 'other-child']);
  });

  it('skips tasks that are already deleted', () => {
    expect(branchOf(['lone'], items).map((entry) => entry.id)).toEqual(['lone']);
  });

  it('gives back nothing for an id that does not exist', () => {
    expect(branchOf(['ghost'], items)).toEqual([]);
  });
});

describe('restoreOrder (#126)', () => {
  it('lists each task once and leaves the order alone', () => {
    const branch = branchOf(['grand'], items);
    const doubled = [...branch, items.child, items.parent];
    expect(restoreOrder(doubled).map((entry) => entry.id))
      .toEqual(['grand', 'parent', 'child', 'other-child']);
  });
});

describe('advanceDemoRecurrence (#130)', () => {
  const at = (date: string, string: string, lang = 'en') => {
    const snapshot = emptySnapshot();
    snapshot.items.task = item({
      id: 'task',
      due: due(date, { string, lang, is_recurring: true }),
      checked: true,
    });
    return advanceDemoRecurrence(snapshot, 'task').items.task;
  };

  it('moves « tous les jours » one day, not a week', () => {
    expect(at('2026-09-28', 'tous les jours', 'fr').due?.date).toBe('2026-09-29');
    expect(at('2026-09-28', 'chaque jour', 'fr').due?.date).toBe('2026-09-29');
    expect(at('2026-09-28', 'quotidien', 'fr').due?.date).toBe('2026-09-29');
  });

  it('keeps the time of day of a timed task, and unticks it', () => {
    const next = at('2026-09-28T14:00:00', 'tous les jours', 'fr');
    expect(next.due?.date).toBe('2026-09-29T14:00:00');
    expect(next.checked).toBe(false);
  });

  it('moves a daily task one day whatever the time zone is', () => {
    const was = process.env.TZ;
    try {
      for (const zone of ['Pacific/Kiritimati', 'Pacific/Pago_Pago', 'UTC']) {
        process.env.TZ = zone;
        expect(at('2026-09-28', 'every day').due?.date).toBe('2026-09-29');
        expect(at('2026-09-28T23:30:00', 'daily').due?.date).toBe('2026-09-29T23:30:00');
      }
    } finally {
      if (was === undefined) delete process.env.TZ;
      else process.env.TZ = was;
    }
  });

  it('moves « tous les lundis » and "every Monday" to the next Monday', () => {
    // 2026-09-28 is a Monday; a Thursday goes to the Monday after.
    expect(at('2026-09-28', 'every Monday').due?.date).toBe('2026-10-05');
    expect(at('2026-09-24', 'every Monday').due?.date).toBe('2026-09-28');
    expect(at('2026-09-24', 'tous les lundis', 'fr').due?.date).toBe('2026-09-28');
    expect(at('2026-09-28', 'chaque vendredi', 'fr').due?.date).toBe('2026-10-02');
    expect(at('2026-09-28', 'every friday').due?.date).toBe('2026-10-02');
  });

  it('moves the other weekly rules a week', () => {
    expect(at('2026-09-28', 'every week').due?.date).toBe('2026-10-05');
    expect(at('2026-09-28', 'chaque semaine', 'fr').due?.date).toBe('2026-10-05');
    expect(at('2026-09-28', 'hebdomadaire', 'fr').due?.date).toBe('2026-10-05');
  });

  it('does not read « tous les mois » or "every month" as a weekday', () => {
    expect(at('2026-09-28', 'tous les mois', 'fr').due?.date).toBe('2026-09-29');
    expect(at('2026-09-28', 'every month').due?.date).toBe('2026-09-29');
  });

  it('leaves a task that does not repeat alone', () => {
    const snapshot = emptySnapshot();
    snapshot.items.task = item({ id: 'task', due: due('2026-09-28') });
    expect(advanceDemoRecurrence(snapshot, 'task')).toBe(snapshot);
  });
});

describe('partitionQueue (#129)', () => {
  const queued = (uuid: string, userId?: string): QueuedCommand => ({
    type: 'item_update', uuid, args: { id: uuid }, queuedAt: 1, attempts: 0, ...(userId ? { userId } : {}),
  });

  it('keeps the changes of the account that signed in, and sets the others aside', () => {
    const queue = [queued('a', 'u1'), queued('b', 'u2'), queued('c', 'u1')];
    const { mine, foreign } = partitionQueue(queue, 'u1', 'u1');
    expect(mine.map((cmd) => cmd.uuid)).toEqual(['a', 'c']);
    expect(foreign.map((cmd) => cmd.uuid)).toEqual(['b']);
  });

  it('takes a change with no recorded account as the signed-in one only when the cached copy was theirs', () => {
    const queue = [queued('old')];
    expect(partitionQueue(queue, 'u1', 'u1').mine).toHaveLength(1);
    expect(partitionQueue(queue, 'u2', 'u1').foreign).toHaveLength(1);
    expect(partitionQueue(queue, 'u1', null).foreign).toHaveLength(1);
  });

  it('keeps the order it was given', () => {
    const queue = [queued('1', 'u1'), queued('2', 'u1'), queued('3', 'u1')];
    expect(partitionQueue(queue, 'u1', null).mine.map((cmd) => cmd.uuid)).toEqual(['1', '2', '3']);
  });
});

describe('explainFailure (#134)', () => {
  it('explains an invalid recurring close without changing other date errors', () => {
    const failure = { error: 'Date is invalid', errorTag: 'INVALID_DATE', commandType: 'item_close' };
    expect(explainFailures([failure], 1, 'en')).toContain('check its repeat rule');
    expect(explainFailures([failure], 1, 'fr')).toContain('vérifiez sa règle de répétition');
    expect(explainFailures([{ ...failure, commandType: 'item_update' }], 1, 'en')).toContain('Date is invalid');
  });
  it('names a limit in French without an English sentence in the middle', () => {
    const message = explainFailure('Maximum number of projects reached', 'fr');
    expect(message).toMatch(/Limite de projets atteinte/);
    expect(message).not.toMatch(/Maximum|reached/);
  });

  it('quotes Todoist\'s words when they are not a limit, in French', () => {
    expect(explainFailure('Invalid argument value', 'fr')).toContain('« Invalid argument value »');
  });

  it('keeps English as it was', () => {
    expect(explainFailure('Maximum number of projects reached', 'en'))
      .toBe('Maximum number of projects reached — this is a limit on your Todoist account or workspace, not on this app. The change was not saved.');
    expect(explainFailure('Invalid argument value', 'en'))
      .toBe('Todoist refused this: Invalid argument value. The change was not saved.');
  });
});
