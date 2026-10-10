import { test, expect, go, row } from './demo';
import type { Page } from '@playwright/test';
const task=(page:Page,id:string)=>page.locator(`.screen.active [data-task-id="${id}"]`);
async function drop(page:Page,fromId:string,toId:string,position:'above'|'below'='below',indent=false){
 await page.waitForTimeout(350);const from=task(page,fromId);await from.hover();const a=(await from.locator('.drag').boundingBox())!;
 await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(a.x+4,a.y+18,{steps:5});
 const b=(await task(page,toId).boundingBox())!;await page.mouse.move(a.x+a.width/2+(indent?60:0),b.y+b.height*(position==='below'?.8:.2),{steps:12});await page.waitForTimeout(150);await page.mouse.up();
}
test('new subtasks follow the upper and lower drop position; nested child can drop just below its parent',async({demo:page})=>{
 await go(page,'#/project/site');const roots=await page.locator('.screen.active [data-task-id]:not([data-depth])').evaluateAll(nodes=>nodes.map(n=>(n as HTMLElement).dataset.taskId!));
 const [parent,a,b]=roots;await drop(page,a,parent,'below',true);await expect(task(page,a)).toHaveAttribute('data-depth','1');
 await drop(page,b,a,'below');await expect(task(page,b)).toHaveAttribute('data-depth','1');
 let all=await page.locator('.screen.active [data-task-id]').evaluateAll(nodes=>nodes.map(n=>(n as HTMLElement).dataset.taskId));expect(all.indexOf(b)).toBeGreaterThan(all.indexOf(a));
 await drop(page,b,a,'below',true);await expect(task(page,b)).toHaveAttribute('data-depth','2');
 await drop(page,b,a,'below');await expect(task(page,b)).toHaveAttribute('data-depth','2');
 await drop(page,b,a,'above');await expect(task(page,b)).toHaveAttribute('data-depth','1');
 all=await page.locator('.screen.active [data-task-id]').evaluateAll(nodes=>nodes.map(n=>(n as HTMLElement).dataset.taskId));expect(all.indexOf(b)).toBeLessThan(all.indexOf(a));
 await drop(page,b,a,'above');all=await page.locator('.screen.active [data-task-id]').evaluateAll(nodes=>nodes.map(n=>(n as HTMLElement).dataset.taskId));expect(all.indexOf(b)).toBeLessThan(all.indexOf(a));
});
test('empty description edits on its first click; composer has no toolbar; bold toggles off without stars',async({demo:page})=>{
 await go(page,'#/week');await row(page,'Send this month’s invoice').locator('.ttitle').click();
 await page.locator('.descview').click();const detail=page.locator('.descedit .cm-content');await expect(detail).toBeFocused();await page.keyboard.type('Edited description');await page.keyboard.press('Escape');await expect(page.locator('.descview')).toContainText('Edited description');await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'Add task',exact:true}).first().click();const body=page.locator('.descedit.composer .cm-content');await body.click();await expect(page.locator('.descedit.composer .md-toolbar')).toHaveCount(0);
 await page.keyboard.type('normal ');await page.keyboard.press('ControlOrMeta+b');await page.keyboard.type('bold');await page.keyboard.press('ControlOrMeta+b');await page.keyboard.type(' normal');await expect(body).toHaveText('normal bold normal');await expect(body.locator('.md-strong')).toHaveText('bold');
 await page.keyboard.press('ControlOrMeta+a');await page.keyboard.type('**Markdown bold**');await expect(body.locator('.md-strong')).toHaveText('Markdown bold');await expect(body).toHaveText('Markdown bold');
 await page.keyboard.press('ControlOrMeta+a');await page.keyboard.type('Before\n---\nAfter');await expect(body.locator('.md-rule')).toHaveCount(1);await expect(body).not.toContainText('---');
});
test('native clipboard URL over selected words preserves the words as a link',async({demo:page,context})=>{
 await context.grantPermissions(['clipboard-read','clipboard-write']);await page.getByRole('button',{name:'Add task',exact:true}).first().click();const body=page.locator('.descedit.composer .cm-content');await body.click();await page.keyboard.type('Selected words');await page.keyboard.press('ControlOrMeta+a');
 await page.evaluate(()=>navigator.clipboard.writeText('https://example.com/\n'));await page.keyboard.press('ControlOrMeta+v');await expect(body.locator('.md-link')).toHaveText('Selected words');await expect(body).toHaveText('Selected words');
 await page.keyboard.press('ControlOrMeta+a');await page.keyboard.type('Visit website today');
 const box=await body.locator('.cm-line').evaluate(el=>{const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let node;while((node=walker.nextNode())){const at=node.textContent?.indexOf('website')??-1;if(at>=0){const range=document.createRange();range.setStart(node,at);range.setEnd(node,at+7);const rect=range.getBoundingClientRect();return {x:rect.x+rect.width/2,y:rect.y+rect.height/2};}}throw new Error('word missing');});
 await page.mouse.dblclick(box.x,box.y);await page.keyboard.press('ControlOrMeta+v');await expect(body.locator('.md-link')).toHaveText('website');await expect(body).toHaveText('Visit website today');
});
test('dashboard layout uses click controls and retains widths',async({demo:page})=>{
 await go(page,'#/insights');await page.locator('.periodbar .spanbar button',{hasText:/^Year$/}).click();await page.getByRole('button',{name:'Edit layout'}).click();await expect(page.locator('.dash-grip').first()).toBeVisible();const tags=page.locator('[data-card="tags"]');await tags.getByRole('button',{name:/earlier/}).click();await expect(tags).toHaveClass(/w6/);await expect(page.locator('[data-card="heatmap"]')).toHaveClass(/w12/);
});
