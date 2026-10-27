import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';
const boot = readFileSync(new URL('../../public/theme-boot.js', import.meta.url), 'utf8');
it.each([['light', true, 'light'], ['dark', false, 'dark'], ['system', true, 'dark']])('uses the saved %s theme for the first browser canvas', (choice, systemDark, expected) => {
  const meta = { content: 'light dark' };
  const root = { dataset: {} as Record<string, string>, style: { setProperty() {} } };
  runInNewContext(boot, { localStorage: { getItem: (key: string) => key === 'theme' ? choice : null },
    document: { documentElement: root, querySelector: () => meta }, window: { matchMedia: () => ({ matches: systemDark }) } });
  expect(root.dataset.theme).toBe(expected); expect(meta.content).toBe(expected);
});
