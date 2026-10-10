import { describe, expect, it } from 'vitest';
import {
  defaultPreferences, hydratePreferences, mergeSynced, readSettingsComment, SETTINGS_COMMENT_MARKER,
  settingsCommentContent, settingsCommentMatches, syncedPreferences, type Preferences,
} from './prefs';
import { defaultViewPrefs } from '@/domain/types';

function prefs(overrides: Partial<Preferences> = {}): Preferences {
  return { ...defaultPreferences('en'), ...overrides };
}

const boardProject = {
  ...defaultViewPrefs('project:site'),
  mode: 'board' as const,
};

describe('syncedPreferences', () => {
  it('leaves out what belongs to this window', () => {
    const synced = syncedPreferences(prefs({ sidebarCollapsed: true }));
    expect(synced).not.toHaveProperty('sidebarCollapsed');
  });

  it("shares a project's display, and not other pages'", () => {
    const synced = syncedPreferences(prefs({
      views: { 'project:site': boardProject, week: defaultViewPrefs('week') },
    }));
    expect(Object.keys(synced.views)).toEqual(['project:site']);
    expect(synced.views['project:site']).toMatchObject({ mode: 'board' });
    expect(synced.views['project:site']).not.toHaveProperty('filters');
  });

  it('writes the same text whatever order the views were added in', () => {
    const a = { 'project:a': defaultViewPrefs('project:a'), 'project:b': defaultViewPrefs('project:b') };
    const b = { 'project:b': a['project:b'], 'project:a': a['project:a'] };
    expect(JSON.stringify(syncedPreferences(prefs({ views: a }))))
      .toBe(JSON.stringify(syncedPreferences(prefs({ views: b }))));
  });
});

describe('the settings comment', () => {
  it('reads back what it wrote, stamped', () => {
    const content = settingsCommentContent(prefs({ theme: 'dark' }), 1234);
    expect(content.startsWith(SETTINGS_COMMENT_MARKER)).toBe(true);
    expect(readSettingsComment(content)).toMatchObject({ theme: 'dark', savedAt: 1234 });
  });

  it("ignores a comment that is not the app's", () => {
    expect(readSettingsComment('Buy milk')).toBeNull();
    expect(readSettingsComment(`${SETTINGS_COMMENT_MARKER}\n\nnot json`)).toBeNull();
  });

  it('matches the same settings whatever the stamp', () => {
    const current = prefs({ theme: 'dark' });
    expect(settingsCommentMatches(settingsCommentContent(current, 1), current)).toBe(true);
    expect(settingsCommentMatches(settingsCommentContent(current, 1), prefs({ theme: 'light' })))
      .toBe(false);
  });
});

describe('mergeSynced', () => {
  it('takes the account settings and keeps what belongs to this device', () => {
    const local = prefs({ sidebarCollapsed: true, theme: 'light' });
    const merged = mergeSynced(local, { theme: 'dark', savedAt: 1 }, 'en');
    expect(merged.theme).toBe('dark');
    expect(merged.sidebarCollapsed).toBe(true);
  });

  it("lays a project's shared display over this device's filters", () => {
    const mine = defaultViewPrefs('project:site');
    const local = prefs({ views: { 'project:site': mine, week: defaultViewPrefs('week') } });
    const merged = mergeSynced(local, {
      views: {
        'project:site': {
          mode: 'board', group: mine.group, sort: mine.sort, showSubtasks: false, showCompleted: true,
        },
      },
    }, 'en');
    expect(merged.views['project:site'].mode).toBe('board');
    expect(merged.views['project:site'].filters.showSubtasks).toBe(false);
    expect(merged.views['project:site'].filters.showCompleted).toBe(true);
    expect(merged.views.week).toEqual(local.views.week);
  });
});

describe('the Gathering dust settings (#161)', () => {
  it('start on, at three months', () => {
    expect(defaultPreferences('en')).toMatchObject({ showDustGroup: true, dustAfterMonths: 3 });
  });

  it('travel with the account', () => {
    const synced = syncedPreferences(prefs({ showDustGroup: false, dustAfterMonths: 6 }));
    expect(synced).toMatchObject({ showDustGroup: false, dustAfterMonths: 6 });
    const merged = mergeSynced(prefs(), synced, 'en');
    expect(merged).toMatchObject({ showDustGroup: false, dustAfterMonths: 6 });
  });

  it.each([1, 2, 3, 6, 12])('accept %i months', (months) => {
    expect(hydratePreferences({ dustAfterMonths: months }, 'en').dustAfterMonths).toBe(months);
  });

  it.each([0, 4, 24, -3, 2.5, '3', null, 'soon'])('reject %j and read the default', (value) => {
    expect(hydratePreferences({ dustAfterMonths: value }, 'en').dustAfterMonths).toBe(3);
  });

  it('read an older settings comment, which has neither, as the defaults', () => {
    const content = settingsCommentContent(prefs());
    const stored = JSON.parse(content.slice(SETTINGS_COMMENT_MARKER.length).trim());
    delete stored.showDustGroup;
    delete stored.dustAfterMonths;
    const merged = mergeSynced(prefs(), stored, 'en');
    expect(merged).toMatchObject({ showDustGroup: true, dustAfterMonths: 3 });
  });

  it('turn the group off only when told to', () => {
    expect(hydratePreferences({ showDustGroup: false }, 'en').showDustGroup).toBe(false);
    expect(hydratePreferences({ showDustGroup: 'no' }, 'en').showDustGroup).toBe(true);
  });
});

describe('estimate storage preference', () => {
  it('defaults to not asked, rejects unknown values and syncs a confirmed choice', () => {
    expect(defaultPreferences('en').estimateStorage).toBeNull();
    expect(hydratePreferences({ estimateStorage: 'unknown' }, 'en').estimateStorage).toBeNull();
    expect(syncedPreferences(prefs({ estimateStorage: 'duration' })).estimateStorage).toBe('duration');
    expect(mergeSynced(prefs(), syncedPreferences(prefs({ estimateStorage: 'tag' })), 'en').estimateStorage).toBe('tag');
  });
  it('does not mark old synced settings as a confirmed choice', () => {
    const { estimateStorage: _unused, ...legacy } = syncedPreferences(prefs());
    expect(mergeSynced(prefs({ estimateStorage: 'duration' }), legacy, 'en').estimateStorage).toBeNull();
  });
});

describe('the v2 look settings', () => {
  const comment = (stored: object) => `${SETTINGS_COMMENT_MARKER}\n\n${JSON.stringify(stored)}`;

  it('gives a v1 comment, which has neither, the defaults', () => {
    const { layout: _l, background: _b, ...v1 } = syncedPreferences(prefs());
    const stored = readSettingsComment(comment(v1));
    const merged = mergeSynced(prefs(), stored!, 'en');
    expect(merged.layout).toBe('page-float');
    expect(merged.background).toBe('neutral');
  });

  it('reads back what it wrote', () => {
    const wrote = prefs({ layout: 'sidebar-float', background: 'colored', accent: 'graphite' });
    const stored = readSettingsComment(settingsCommentContent(wrote));
    const merged = mergeSynced(prefs(), stored!, 'en');
    expect(merged).toMatchObject({ layout: 'sidebar-float', background: 'colored', accent: 'graphite' });
  });

  it('ignores a value it does not know instead of keeping it', () => {
    const hydrated = hydratePreferences({ layout: 'overlay', background: 'rainbow', accent: 'mauve' }, 'en');
    expect(hydrated).toMatchObject({ layout: 'page-float', background: 'neutral', accent: 'red' });
  });

  it('opens a task in a window unless the account says otherwise', () => {
    const { taskOpen: _t, ...v1 } = syncedPreferences(prefs());
    const merged = mergeSynced(prefs(), readSettingsComment(comment(v1))!, 'en');
    expect(merged.taskOpen).toBe('window');
    expect(hydratePreferences({ taskOpen: 'drawer' }, 'en').taskOpen).toBe('window');

    const wrote = prefs({ taskOpen: 'panel' });
    const back = mergeSynced(prefs(), readSettingsComment(settingsCommentContent(wrote))!, 'en');
    expect(back.taskOpen).toBe('panel');
  });

  it('keeps every accent id a 1.x account may have stored', () => {
    for (const accent of ['red', 'orange', 'amber', 'green', 'teal', 'blue', 'indigo', 'purple', 'pink', 'custom']) {
      expect(hydratePreferences({ accent }, 'en').accent).toBe(accent);
    }
  });

  it('carries keys it has not heard of through a merge, so an older build does not wipe them', () => {
    const stored = readSettingsComment(comment({ ...syncedPreferences(prefs()), later: 'kept' }));
    const merged = mergeSynced(prefs(), stored!, 'en') as unknown as Record<string, unknown>;
    expect(merged.later).toBe('kept');
  });
});

describe('the sidebar settings', () => {
  it('give a v1 account the full sidebar it always had', () => {
    const hydrated = hydratePreferences({ homepage: 'week' }, 'en');
    expect(hydrated.sidebarSearch).toBe(true);
    expect(hydrated.sidebarCounts).toBe(true);
    expect(hydrated.sidebarNav.main.map((e) => e.id)).toEqual(['inbox', 'today', 'week', 'upcoming', 'someday']);
    expect(hydrated.sidebarNav.other.map((e) => e.id)).toContain('logbook');
  });

  it('survive a round trip through the settings comment', () => {
    const nav = hydratePreferences({
      sidebarNav: {
        main: ['week', 'inbox', 'today', 'upcoming', 'someday'].map((id) => ({ id, on: true })),
        other: [{ id: 'review', on: false }],
      },
      sidebarSearch: false, sidebarCounts: false,
    }, 'en');
    const stored = readSettingsComment(settingsCommentContent(prefs(nav)));
    const merged = mergeSynced(prefs(), stored!, 'en');
    expect(merged.sidebarSearch).toBe(false);
    expect(merged.sidebarCounts).toBe(false);
    expect(merged.sidebarNav.main[0].id).toBe('week');
    expect(merged.sidebarNav.other.find((e) => e.id === 'review')?.on).toBe(false);
  });

  it('read a damaged list as the default instead of throwing', () => {
    expect(hydratePreferences({ sidebarNav: 42 }, 'en').sidebarNav).toEqual(prefs().sidebarNav);
  });
});

describe('what a task row shows', () => {
  it('is everything, in the default order, for an account that never set it', () => {
    const hydrated = hydratePreferences({}, 'en');
    expect(Object.values(hydrated.taskFields).every(Boolean)).toBe(true);
    expect(hydrated.detailOrder).toEqual(['estimate', 'date', 'deadline', 'labels', 'project']);
  });

  it('travels with the account, and a damaged value is the default', () => {
    const set = hydratePreferences({ taskFields: { description: false }, detailOrder: ['project', 'x'] }, 'en');
    const stored = readSettingsComment(settingsCommentContent(prefs(set)));
    const merged = mergeSynced(prefs(), stored!, 'en');
    expect(merged.taskFields.description).toBe(false);
    expect(merged.detailOrder[0]).toBe('project');
    expect(hydratePreferences({ taskFields: 'x', detailOrder: 3 }, 'en').detailOrder).toHaveLength(5);
  });

  it('reads a comment from before the 2.0 setup as not yet set up, and keeps a stored answer', () => {
    const { setupDone: _s, ...v1 } = syncedPreferences(prefs());
    expect(mergeSynced(prefs({ setupDone: true }), v1 as never, 'en').setupDone).toBe(true);
    expect(hydratePreferences({ setupDone: 'yes' }, 'en').setupDone).toBe(false);
    expect(hydratePreferences({ setupDone: true }, 'en').setupDone).toBe(true);
  });

  it('reads a missing or malformed group order as Todoist\'s own', () => {
    expect(hydratePreferences({}, 'en').workspaceOrder).toEqual([]);
    expect(hydratePreferences({ workspaceOrder: 'w1' }, 'en').workspaceOrder).toEqual([]);
    expect(hydratePreferences({ workspaceOrder: ['w1', 3, 'personal'] }, 'en').workspaceOrder).toEqual(['w1', 'personal']);
  });
});
