import { describe, expect, it } from 'vitest';
import { buildDemoCompleted, buildDemoSnapshot } from './demoData';

it.each(['en', 'fr'] as const)('every seeded %s demo task belongs to an existing project', (locale) => {
  const snapshot = buildDemoSnapshot(locale);
  for (const task of [...Object.values(snapshot.items), ...buildDemoCompleted(locale)]) {
    expect(snapshot.projects[task.project_id], task.content).toBeDefined();
  }
});

describe('the demo is one account in two languages', () => {
  const en = buildDemoSnapshot('en');
  const fr = buildDemoSnapshot('fr');

  it('has the same person, workspace, tags and people', () => {
    expect(fr.user?.full_name).toBe(en.user?.full_name);
    expect(fr.user?.avatar_big).toBe(en.user?.avatar_big);
    expect(fr.workspaces).toEqual(en.workspaces);
    expect(Object.values(fr.labels).map((l) => l.name)).toEqual(Object.values(en.labels).map((l) => l.name));
    expect(fr.collaborators).toEqual(en.collaborators);
    expect(Object.values(en.collaborators).map((c) => c.full_name)).toContain('Jules Bertolino');
    expect(JSON.stringify(en)).not.toContain('Alex Martin');
  });

  it('has the same projects, sections and tasks, on the same days and in the same places', () => {
    const shape = (s: typeof en) => ({
      projects: Object.values(s.projects).map((p) => [p.id, p.parent_id, p.workspace_id, p.is_folder ?? false, p.color]),
      sections: Object.values(s.sections).map((x) => [x.id, x.project_id]),
      items: Object.values(s.items).map((i) => [i.id, i.project_id, i.section_id, i.parent_id, i.priority, i.due?.date, i.deadline?.date, i.labels, i.responsible_uid]),
    });
    expect(shape(fr)).toEqual(shape(en));
    expect(buildDemoCompleted('fr').map((c) => [c.id, c.project_id, c.completed_at]))
      .toEqual(buildDemoCompleted('en').map((c) => [c.id, c.project_id, c.completed_at]));
  });

  it('keeps what the guided tour points at', () => {
    const projects = Object.values(en.projects);
    expect(projects.some((p) => p.is_folder && projects.some((c) => c.parent_id === p.id))).toBe(true);
    expect(projects.filter((p) => p.workspace_id === null && !p.inbox_project).length).toBeGreaterThan(3);
    expect(en.workspaces['ws-pro'].name).toBe('Robin Studio');
    const items = Object.values(en.items);
    const today = new Date().toISOString().slice(0, 10);
    expect(items.some((i) => i.labels.includes('week'))).toBe(true);
    expect(items.some((i) => i.labels.includes('thismonth'))).toBe(true);
    expect(items.some((i) => i.labels.includes('quick'))).toBe(true);
    expect(items.some((i) => i.due && i.due.date.slice(0, 10) < today)).toBe(true);
    expect(items.some((i) => !i.due && i.added_at !== null && Date.now() - Date.parse(i.added_at) > 120 * 86_400_000)).toBe(true);
    expect(buildDemoCompleted('en').some((c) => c.project_id === 'bloom')).toBe(true);
  });
});
