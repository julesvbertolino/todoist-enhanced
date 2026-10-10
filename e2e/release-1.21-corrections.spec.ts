import { test, expect, go, rows, row } from './demo';
import type { Page } from '@playwright/test';
async function drag(page: Page, fromId: string, toId: string, right = 0) {
 const from=page.locator(`.screen.active [data-task-id="${fromId}"]`);
 await from.hover(); const handle=(await from.locator('.drag').boundingBox())!;
 await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();
 await page.mouse.move(handle.x+4,handle.y+20,{steps:5});
 const to=(await page.locator(`.screen.active [data-task-id="${toId}"]`).boundingBox())!;
 await page.mouse.move(handle.x+4+right,to.y+to.height/2,{steps:12});await page.waitForTimeout(150);await page.mouse.up();
}
const task=(page:Page,id:string)=>page.locator(`.screen.active [data-task-id="${id}"]`);
const children=async(page:Page)=>rows(page).filter({has:page.locator('.ttitle')}).evaluateAll(all=>all.filter(n=>(n as HTMLElement).dataset.depth).map(n=>(n as HTMLElement).dataset.taskId!));
test('a single subtask leaves its parent between root tasks, and undo restores it',async({demo:page})=>{
 await go(page,'#/project/site'); const [child]=await children(page);
 const roots=await task(page,child).evaluate(node=>Array.from(node.closest('.group')!.querySelectorAll<HTMLElement>('[data-task-id]:not([data-depth])')).map(n=>n.dataset.taskId!));
 await drag(page,child,roots[0]);await expect(task(page,child)).not.toHaveAttribute('data-depth',/.+/);
 await page.getByRole('button',{name:/^Undo/}).click();await expect(task(page,child)).toHaveAttribute('data-depth','1');
});
test('two selected subtasks move under another parent together',async({demo:page})=>{
 await go(page,'#/project/site'); const [a,b]=await children(page);
 const roots=await task(page,a).evaluate(node=>Array.from(node.closest('.group')!.querySelectorAll<HTMLElement>('[data-task-id]:not([data-depth])')).map(n=>n.dataset.taskId!));
 for(const id of [a,b])await task(page,id).locator('.ttitle').click({modifiers:['ControlOrMeta']});
 await drag(page,a,roots[0],60);
 await expect(task(page,a)).toHaveAttribute('data-depth','1');await expect(task(page,b)).toHaveAttribute('data-depth','1');
 const ids=await rows(page).evaluateAll(all=>all.map(n=>(n as HTMLElement).dataset.taskId));const at=ids.indexOf(roots[0]);expect(ids.slice(at,at+3)).toEqual([roots[0],a,b]);
 await page.getByRole('button',{name:/^Undo/}).click();
});
test('a nested subtask becomes a sibling by dropping on a first-level row',async({demo:page})=>{
 await go(page,'#/project/site');const[a,b,c]=await children(page);
 await drag(page,c,b,60);await expect(task(page,c)).toHaveAttribute('data-depth','2');
 await drag(page,c,a);await expect(task(page,c)).toHaveAttribute('data-depth','1');
});
test('rich text deletes one letter, pastes links on selection, and inserts a link with the toolbar',async({demo:page})=>{
 await page.getByRole('button',{name:'Add task',exact:true}).first().click();const body=page.locator('.descedit.composer .cm-content');await body.click();
 await page.keyboard.type('alpha');await page.keyboard.press('ControlOrMeta+a');await page.keyboard.press('ControlOrMeta+b');
 await expect(body.locator('.md-strong')).toHaveText('alpha');await expect(body).toHaveText('alpha');
 await page.keyboard.press('ArrowRight');await page.keyboard.press('Backspace');await expect(body).toHaveText('alph');
 await page.keyboard.press('ControlOrMeta+a');
 await body.evaluate(el=>{const d=new DataTransfer();d.setData('text/plain','https://example.com');el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:d,bubbles:true,cancelable:true}));});
 await expect(body.locator('.md-link')).toHaveText('alph');await expect(body).toHaveText('alph');
 await page.keyboard.press('ControlOrMeta+a');await page.keyboard.type('beta');await page.keyboard.press('ControlOrMeta+a');
 await page.keyboard.press('ControlOrMeta+k');await page.getByRole('textbox',{name:'Link URL'}).fill('https://openai.com');await page.locator('.md-link-dialog').getByRole('button',{name:'Apply'}).click();
 await expect(body.locator('.md-link')).toHaveText('beta');
});
test('description takes focus and composer starts compact on the title edge',async({demo:page})=>{
 await go(page,'#/week');await row(page,'Prepare the kick-off meeting').locator('.ttitle').click();await page.locator('.descview .md').first().click();await expect(page.locator('.descedit .cm-content')).toBeFocused();await page.keyboard.type('abc');await expect(page.locator('.descedit')).toContainText('abc');await page.keyboard.press('Escape');await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'Add task',exact:true}).first().click();const desc=page.locator('.descedit.composer');await expect(desc.locator('.cm-placeholder')).toHaveText('Description');
 const a=(await page.locator('.composer-name').boundingBox())!,b=(await desc.locator('.cm-content').boundingBox())!;expect(Math.abs(a.x-b.x)).toBeLessThan(3);expect(b.height).toBeLessThan(26);expect((await desc.boundingBox())!.height).toBeLessThan(65);
});
test('year layout stays half width for tags after moving beside the heatmap',async({demo:page})=>{
 await go(page,'#/insights');await page.locator('.periodbar .spanbar button',{hasText:/^Year$/}).click();await page.getByRole('button',{name:'Edit layout'}).click();
 const tags=page.locator('[data-card="tags"]');await tags.getByRole('button',{name:/earlier/}).click();await tags.getByRole('button',{name:/earlier/}).click();await expect(tags).toHaveClass(/w6/);await expect(page.locator('[data-card="heatmap"]')).toHaveClass(/w12/);
});
for(const width of [390,1000])test(`dark offline editing and all weekly review steps at ${width}px`,async({demo:page,context})=>{
 await page.setViewportSize({width,height:844});await go(page,'#/settings');await page.getByRole('radio',{name:'Dark',exact:true}).click();await go(page,'#/review');await page.getByRole('button',{name:'Weekly',exact:true}).click();
 const steps=page.locator('.reviewrail button');for(let i=0;i<await steps.count();i++){await steps.nth(i).click();await expect(steps.nth(i)).toHaveAttribute('aria-current','step');}
 await go(page,'#/week');await page.getByRole('button',{name:'Add task',exact:true}).first().click();await page.locator('.descedit.composer .cm-content').click();await context.setOffline(true);await page.keyboard.type('offline text');await expect(page.locator('.descedit.composer .cm-content')).toHaveText('offline text');await context.setOffline(false);
});

test('bold at an empty caret shows no stars and formats the next letters', async ({ demo: page }) => {
  await page.getByRole('button', { name: 'Add task', exact: true }).first().click();
  const body = page.locator('.descedit.composer .cm-content');
  await body.click();
  await page.keyboard.press('ControlOrMeta+b');
  await expect(body).not.toContainText('*');
  await page.keyboard.type('alpha');
  await expect(body.locator('.md-strong')).toHaveText('alpha');
});
