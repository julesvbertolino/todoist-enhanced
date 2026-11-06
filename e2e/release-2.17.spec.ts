import { test, expect, go } from './demo';
type Item = { id: string; project_id: string; [key: string]: unknown };
type Project = { id: string; name: string; [key: string]: unknown };
type State = { snapshot: { items: Record<string, Item>; projects: Record<string, Project>; [key: string]: unknown }; prefs: { views: Record<string, { filters?: Record<string, unknown> }> }; setViewPrefs: (key: string, patch: Record<string, unknown>) => void };
type Store = { getState: () => State; setState: (patch: Partial<State>) => void };
test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'Uses controlled demo data');

test('#319 selects retain their resting outline after a pointer choice', async ({ demo: page }) => {
  await page.getByRole('button', { name: 'Display', exact: true }).click();
  const face = page.getByRole('button', { name: 'Grouping', exact: true });
  await face.click();
  await page.getByRole('option', { name: 'Project', exact: true }).click();
  await expect(face).toHaveClass(/quiet/);
  expect(await face.evaluate((node) => getComputedStyle(node).boxShadow)).not.toBe('none');
  await face.press('ArrowDown');
  await expect(face).not.toHaveClass(/quiet/);
});

test('#325 only a nested child repeating the visible parent project loses its project', async ({ demo: page }) => {
  await page.evaluate(() => {
    const store = (window as unknown as { __store: Store }).__store;
    const s = store.getState(), base = Object.values(s.snapshot.items)[0];
    const make = (id: string, parent_id: string | null, project_id = 'site'): Item => ({ ...base, id, content: id, parent_id, project_id, section_id: null, checked: false, is_deleted: false, due: null, labels: [], description: '' });
    const items = { parent217: make('parent217', null), child217: make('child217', 'parent217'), other217: make('other217', 'parent217', 'home'), solo217: make('solo217', 'missing-parent') };
    store.setState({ snapshot: { ...s.snapshot, items } });
    store.getState().setViewPrefs('someday', { mode: 'list', group: 'none', filters: { ...s.prefs.views.someday?.filters, showSubtasks: true } });
  });
  await go(page, '#/someday');
  const child = page.locator('[data-task-id="child217"]').first();
  await expect(child).toHaveAttribute('data-depth', '1');
  await expect(child.locator('.proj')).toHaveCount(0);
  await expect(page.locator('[data-task-id="parent217"] .proj')).toHaveCount(1);
  await expect(page.locator('[data-task-id="other217"] .proj')).toHaveCount(1);
  await expect(page.locator('[data-task-id="solo217"] .proj')).toHaveCount(1);
  await page.evaluate(() => (window as unknown as { __store: Store }).__store.getState().setViewPrefs('someday', { mode: 'table', tableColumns: ['title', 'project'] }));
  await expect(child.locator('.table-project .proj')).toHaveCount(0);
  await expect(page.locator('[data-task-id="parent217"] .table-project .proj')).toHaveCount(1);
});

test('#327 workspace follows the sidebar tree and changes in order', async ({ demo: page }) => {
  await go(page, '#/workspace/ws-pro');
  const names = page.locator('.workspace-project-name .workspace-name > span:first-child');
  const expected = await page.evaluate(async () => {
    const path = '/src/store/selectors.ts'; const { projectTree } = await import(path);
    const s = (window as unknown as { __store: Store }).__store.getState();
    const out: string[] = [];
    const visit = (node: { project: Project; children: typeof node[] }) => { if (!node.project.is_folder) out.push(node.project.name); node.children.forEach(visit); };
    projectTree(s.snapshot).find((g: { workspaceId: string | null }) => g.workspaceId === 'ws-pro').roots.forEach(visit);
    return out;
  });
  await expect(names).toHaveText(expected);
  await expect(page.locator('.workspace-folder')).not.toHaveCount(0);
  await page.evaluate(() => {
    const store = (window as unknown as { __store: Store }).__store, s = store.getState();
    const projects = { ...s.snapshot.projects, site: { ...s.snapshot.projects.site, child_order: -10 } };
    store.setState({ snapshot: { ...s.snapshot, projects } });
  });
  await expect(names.first()).toHaveText('Website');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('#320 adding a section focuses without moving a fully visible field', async ({ demo: page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await go(page, '#/project/site');
  await page.evaluate(() => (window as unknown as { __store: Store }).__store.getState().setViewPrefs('project:site', { mode: 'board', group: 'none' }));
  const board = page.locator('.screen.active .board');
  const add = board.getByRole('button', { name: 'Add section', exact: true });
  await add.scrollIntoViewIfNeeded();
  const before = await board.evaluate((el) => el.scrollLeft);
  await add.click();
  const field = board.getByRole('textbox', { name: 'Section name' });
  await expect(field).toBeFocused();
  expect(await board.evaluate((el) => el.scrollLeft)).toBe(before);
  await field.fill('Release section'); await field.press('Enter');
  await expect(board).toContainText('Release section');
});

test('#324 overdue action is an accessible red calendar button', async ({ demo: page }) => {
  const button = page.locator('.screen.active .reschedule-overdue').first();
  await expect(button).toHaveAccessibleName('Move all to today');
  await expect(button).toHaveAttribute('title', 'Move all to today');
  await expect(button).toHaveText('');
  expect(await button.evaluate((el) => getComputedStyle(el).borderRadius)).toBe('50%');
  await button.click();
  await expect(page.getByRole('dialog')).toContainText('Move');
});

test('#320 preserves A and B when the Add tile becomes the third section', async ({ demo: page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => {
    const store = (window as unknown as { __store: Store }).__store, s = store.getState();
    store.setState({ snapshot: { ...s.snapshot, items: {}, sections: {
      a217: { id: 'a217', project_id: 'site', name: 'Column A', section_order: 1, is_deleted: false, is_archived: false },
      b217: { id: 'b217', project_id: 'site', name: 'Column B', section_order: 2, is_deleted: false, is_archived: false },
    } } });
    store.getState().setViewPrefs('project:site', { mode: 'board', group: 'none' });
  });
  await go(page, '#/project/site');
  const board = page.locator('.screen.active .board');
  const start = await board.evaluate((node) => node.scrollLeft);
  await expect(board.getByRole('button', { name: 'Add section', exact: true })).toBeInViewport();
  await board.getByRole('button', { name: 'Add section', exact: true }).click();
  const field = board.getByRole('textbox', { name: 'Section name' }).last();
  await field.fill('Column C'); await field.press('Enter');
  await expect(board).toContainText('Column C');
  await expect.poll(() => board.evaluate((node) => node.scrollLeft)).toBe(start);
  const columns = board.locator('.col');
  await expect(columns).toHaveCount(3);
  for (const column of await columns.all()) await expect(column).toBeInViewport({ ratio: 0.99 });
  // A second insertion requires scrolling to Add, but preserves the viewport it was inserted in.
  await board.getByRole('button', { name: 'Add section', exact: true }).scrollIntoViewIfNeeded();
  const next = await board.evaluate((node) => node.scrollLeft);
  await board.getByRole('button', { name: 'Add section', exact: true }).click();
  await field.fill('Column D'); await field.press('Enter');
  await expect(board).toContainText('Column D');
  await expect.poll(() => board.evaluate((node, before) => Math.abs(node.scrollLeft - before), next)).toBeLessThanOrEqual(2);
});

test('#327 sidebar drag reorders repeatedly with a contrasting indicator on coloured floating content', async ({ demo: page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.evaluate(async () => {
    const store = (window as unknown as { __store: Store }).__store, s = store.getState();
    const base = s.snapshot.projects.home;
    const projects = Object.fromEntries(['a', 'b', 'c'].map((key, index) => [`drag217${key}`, { ...base, id: `drag217${key}`, name: `Drag ${key}`, parent_id: null, folder_id: null, workspace_id: null, is_favorite: false, child_order: index + 1, order_key: null }]));
    store.setState({ snapshot: { ...s.snapshot, projects } });
    const path = '/src/store/store.ts'; const { useStore } = await import(path);
    useStore.getState().setPrefs({ layout: 'page-float', background: 'colored' });
  });
  const rows = page.locator('.sidebar [data-project-row]');
  await expect(rows).toHaveCount(3);
  await expect(rows.last()).toBeInViewport();
  const order = () => rows.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-project-row')));
  const drag = async (fromId: string, toId: string, edge: 'before' | 'after') => {
    const source = page.locator(`[data-project-row="${fromId}"]`), target = page.locator(`[data-project-row="${toId}"]`);
    const a = (await source.boundingBox())!, b = (await target.boundingBox())!;
    const x = a.x + 75, y = a.y + 7;
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(x, y + 8, { steps: 3 });
    await page.mouse.move(x, edge === 'before' ? b.y + 3 : b.y + b.height - 3, { steps: 10 });
    await page.screenshot({ path: '../../outputs/sidebar-deplacement-2.17.0.png' });
    await expect(target).toHaveClass(new RegExp(`drop-${edge}`));
    const indicator = await target.evaluate((node) => ({ color: getComputedStyle(node, '::after').backgroundColor, ink: getComputedStyle(node).getPropertyValue('--text') }));
    expect(indicator.color).not.toBe('rgba(0, 0, 0, 0)');
    await page.mouse.up();
  };
  await drag('drag217c', 'drag217a', 'before');
  await expect.poll(order).toEqual(['drag217c', 'drag217a', 'drag217b']);
  await drag('drag217c', 'drag217b', 'after');
  await expect.poll(order).toEqual(['drag217a', 'drag217b', 'drag217c']);
  await drag('drag217a', 'drag217c', 'after');
  await expect.poll(order).toEqual(['drag217b', 'drag217c', 'drag217a']);
});

test('#324 overdue button aligns right in List and follows duration in Table', async ({ demo: page }) => {
  for (const mode of ['list', 'table']) {
    await page.evaluate((mode) => (window as unknown as { __store: Store }).__store.getState().setViewPrefs('week', { mode, group: 'none' }), mode);
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      const header = page.locator('.screen.active .ghead').filter({ has: page.locator('.reschedule-overdue') }).first();
      await expect.poll(async () => {
        const button = await header.locator('.reschedule-overdue').boundingBox();
        const stats = await header.locator('.gstats').boundingBox();
        return button && stats ? Math.abs((button.y + button.height / 2) - (stats.y + stats.height / 2)) : Infinity;
      }).toBeLessThan(12);
      if (mode === 'table') {
      await expect.poll(async () => {
        const button = await header.locator('.reschedule-overdue').boundingBox();
        const stats = await header.locator('.gstats').boundingBox();
        return button && stats ? button.x - (stats.x + stats.width) : Infinity;
      }).toBeLessThan(25);
      } else {
        await expect.poll(async () => {
          const button = await header.locator('.reschedule-overdue').boundingBox();
          const bounds = await header.boundingBox();
          return button && bounds ? Math.abs(bounds.x + bounds.width - button.x - button.width) : Infinity;
        }).toBeLessThan(3);
      }
      await page.screenshot({ path: `../../outputs/retards-${mode}-${width}.png`, fullPage: true });
    }
  }
});

test('#327 project and folder icons share the leading column; progress moves right', async ({ demo: page }) => {
  await go(page, '#/workspace/ws-pro');
  const project = page.locator('.workspace-project').filter({ has: page.getByRole('button', { name: /^Website/ }) });
  const folder = page.locator('.workspace-folder').first();
  await expect(folder).toHaveAttribute('aria-expanded', 'true');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 960 });
    const projectIcon = (await project.locator('.workspace-icon').boundingBox())!;
    const folderIcon = (await folder.locator('.workspace-icon').boundingBox())!;
    expect(Math.abs(projectIcon.x - folderIcon.x)).toBeLessThan(1);
    const progress = (await project.locator('.workspace-progress').boundingBox())!;
    expect(progress.x).toBeGreaterThan(projectIcon.x + projectIcon.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `../../outputs/${width === 390 ? 'apercu-mobile' : 'apercu-espace'}-2.17.0.png`, fullPage: true });
  }
  const before = await page.locator('.workspace-project-name').count();
  await folder.click();
  await expect(folder).toHaveAttribute('aria-expanded', 'false');
  expect(await page.locator('.workspace-project-name').count()).toBeLessThan(before);
  await expect(page.locator('.workspace-page .empty')).toHaveCount(0);
  await folder.click();
  await expect(page.locator('.workspace-project-name')).toHaveCount(before);
});

test('privacy explains the absence of analytics', async ({ demo: page }) => {
  await go(page, '#/settings');
  const section = page.locator('#privacy');
  await expect(section).toBeAttached();
  await section.locator('summary').click();
  await expect(section.getByRole('switch')).toHaveCount(0);
  await expect(section).toContainText('No usage tracking');
  await expect(page.locator('[data-counter]')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await section.locator('summary').scrollIntoViewIfNeeded();
  expect(await section.boundingBox()).toEqual(expect.objectContaining({ width: expect.any(Number) }));
  expect((await section.boundingBox())!.width).toBeGreaterThan(300);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '../../outputs/privacy-mobile-2.17.0.png', fullPage: true });
});
