import { expect, it } from 'vitest';
import { buildDemoSnapshot, buildDemoCompleted } from './demoData';
it.each(['en', 'fr'] as const)('every seeded %s demo task belongs to an existing project', (locale) => {
  const snapshot = buildDemoSnapshot(locale);
  for (const task of [...Object.values(snapshot.items), ...buildDemoCompleted(locale)]) {
    expect(snapshot.projects[task.project_id], task.content).toBeDefined();
  }
});
