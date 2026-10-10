import { test, expect, go, rows, row } from './demo';
import type { Page } from '@playwright/test';
async function drop(page: Page, from: string, to: string, fraction = .8) {
  await page.waitForTimeout(400);
  const source = page.locator(`.screen.active [data-task-id="${from}"]`);
  await source.hover();
  const a = (await source.locator('.drag').boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2, a.y + 20, { steps: 5 });
  const b = (await page.locator(`.screen.active [data-task-id="${to}"]`).boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, b.y + b.height * fraction, { steps: 12 });
  await page.waitForTimeout(150); await page.mouse.up();
}
for (const hash of ['#/week', '#/project/site']) test(`last child can become first at the parent seam and above first child in ${hash}`, async ({ demo: page }) => {
  await go(page, hash);
  const getChildren = () => rows(page).evaluateAll(all => all.filter(n => (n as HTMLElement).dataset.depth === '1').map(n => (n as HTMLElement).dataset.taskId!));
  const [a,b,c] = await getChildren();
  const parent = await page.locator(`[data-task-id="${a}"]`).evaluate(n => (n.previousElementSibling as HTMLElement).dataset.taskId!);
  await drop(page,c,parent); await expect.poll(getChildren).toEqual([c,a,b]);
  await drop(page,c,b); await expect.poll(getChildren).toEqual([a,b,c]);
  await drop(page,c,a,.2); await expect.poll(getChildren).toEqual([c,a,b]);
  await page.waitForTimeout(400); await page.locator(`[data-task-id="${parent}"] .ttitle`).first().click();
  await expect(page.getByRole('dialog').locator('.subtasktitle').first()).toHaveText(await page.locator(`[data-task-id="${c}"] .ttitle`).first().innerText());
});
test('description click stays open, selection toolbar preserves words, link dialog restores normal typing', async ({ demo: page }) => {
  await row(page,'Prepare the kick-off meeting').locator('.ttitle').click();
  await page.getByRole('button',{name:'Description',exact:true}).click();
  const body = page.locator('.descedit.detail .cm-content'); await expect(body).toBeFocused();
  await page.keyboard.press('ControlOrMeta+a'); await page.keyboard.type('word word');
  for(let i=0;i<4;i++)await page.keyboard.press('Shift+ArrowLeft');
  const bar = page.getByRole('toolbar',{name:'Formatting'}); await expect(bar).toBeVisible();
  await expect(bar.getByRole('button')).toHaveCount(11);
  if(process.env.REVIEW_SCREENSHOTS)await page.screenshot({path:`${process.env.REVIEW_SCREENSHOTS}/description-selection.png`});
  await bar.getByRole('button',{name:'Bold',exact:true}).click(); await expect(body.locator('.md-strong')).toHaveText('word');
  await bar.getByRole('button',{name:'Bold',exact:true}).click(); await expect(body.locator('.md-strong')).toHaveCount(0);
  await bar.getByRole('button',{name:'Link',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Link',exact:true}); await expect(dialog).toBeVisible();
  if(process.env.REVIEW_SCREENSHOTS)await page.screenshot({path:`${process.env.REVIEW_SCREENSHOTS}/description-lien.png`});
  await expect(dialog.getByRole('textbox',{name:'Text to display'})).toHaveValue('word');
  await dialog.getByRole('textbox',{name:'Link URL'}).fill('https://example.com'); await dialog.getByRole('button',{name:'Apply'}).click();
  await expect(body).toBeFocused(); await page.keyboard.type(' normal');
  await expect(body.locator('.md-link')).toHaveText('word'); await expect(body).toHaveText('word word normal');
  await page.keyboard.press('Escape'); await expect(page.locator('.descview')).toHaveText('word word normal');
});
test('selected clipboard link ends before subsequent typing and undo restores selected words',async({demo:page,context})=>{
  await context.grantPermissions(['clipboard-read','clipboard-write']);
  await page.getByRole('button',{name:'Add task',exact:true}).first().click(); const body=page.locator('.descedit.composer .cm-content'); await body.click();
  await page.keyboard.type('word word');for(let i=0;i<4;i++)await page.keyboard.press('Shift+ArrowLeft');
  await page.evaluate(()=>navigator.clipboard.writeText('https://example.com')); await page.keyboard.press('ControlOrMeta+v');
  await page.keyboard.type(' normal'); await expect(body.locator('.md-link')).toHaveText('word'); await expect(body).toHaveText('word word normal');
  await page.keyboard.press('ControlOrMeta+z'); await page.keyboard.press('ControlOrMeta+z'); await expect(body.locator('.md-link')).toHaveCount(0);
});
test('three independent metadata choices, plain default',async({demo:page})=>{
  await go(page,'#/settings'); const choices=page.locator('.chipschoice'); await expect(choices.getByRole('radio')).toHaveCount(3); await expect(choices.getByRole('radio',{name:'Todoist inspired'})).toHaveAttribute('aria-checked','true');
  if(process.env.REVIEW_SCREENSHOTS)await page.screenshot({path:`${process.env.REVIEW_SCREENSHOTS}/quatre-styles.png`});
  await expect(page.getByRole('button',{name:'Notepad',exact:true})).toHaveCount(0);
});
test('layout controls add no card height and chart contents align on the same row',async({demo:page})=>{
  await go(page,'#/insights'); await page.getByRole('button',{name:'Year',exact:true}).click();
  const sizes=await page.locator('.dashboard-bento .card').evaluateAll(cards=>cards.map(c=>({id:(c as HTMLElement).dataset.card,height:c.getBoundingClientRect().height})));
  await page.getByRole('button',{name:'Edit layout'}).click();
  for(const size of sizes){const b=(await page.locator(`[data-card="${size.id}"]`).boundingBox())!;expect(b.height, size.id).toBeCloseTo(size.height,0);}
  const controls=await page.locator('.dash-edit').evaluateAll(all=>all.map(c=>({top:c.getBoundingClientRect().top,card:c.closest('.card')!.getBoundingClientRect().top})));
  for(const c of controls)expect(c.top-c.card).toBeLessThan(24);
  const donuts=await page.locator('.dashboard-card-content > .donut').evaluateAll(all=>all.flatMap(d=>{
    const body=d.getBoundingClientRect();return Array.from(d.children).map(child=>({body:body.y+body.height/2,child:child.getBoundingClientRect().y+child.getBoundingClientRect().height/2}));
  }));
  for(const d of donuts)expect(Math.abs(d.body-d.child)).toBeLessThan(2);
  if(process.env.REVIEW_SCREENSHOTS)await page.screenshot({path:`${process.env.REVIEW_SCREENSHOTS}/dashboard-alignment.png`,fullPage:true});
});

for(const [label,kind] of [['Heading 1','md-h1'],['Heading 2','md-h2'],['Quote','md-quote'],['Bulleted list','md-bullet'],['Numbered list','md-number'],['Checklist','md-task']] as const)test(`selection toolbar toggles ${label}, keeps words and undo`,async({demo:page})=>{
  await row(page,'Send this month’s invoice').locator('.ttitle').click(); await page.locator('.descview').click();
  const body=page.locator('.descedit.detail .cm-content');await expect(body).toBeFocused();await page.keyboard.type('First line');await page.keyboard.press('ControlOrMeta+a');
  const bar=page.getByRole('toolbar',{name:'Formatting'});await bar.getByRole('button',{name:label,exact:true}).click();
  await expect(body.locator(`.${kind}`)).toHaveCount(1);await expect(body).toContainText('First line');
  await bar.getByRole('button',{name:label,exact:true}).click();await expect(body.locator(`.${kind}`)).toHaveCount(0);
  await page.keyboard.press('ControlOrMeta+z');await expect(body.locator(`.${kind}`)).toHaveCount(1);
});
test('link cancellation returns to the editor, shortcut stays inside it and Escape saves before closing task',async({demo:page})=>{
  await row(page,'Send this month’s invoice').locator('.ttitle').click();await page.locator('.descview').click();const body=page.locator('.descedit.detail .cm-content');await page.keyboard.type('words');await page.keyboard.press('ControlOrMeta+a');await page.keyboard.press('ControlOrMeta+k');
  const link=page.getByRole('dialog',{name:'Link',exact:true});await expect(link).toBeVisible();await page.keyboard.press('Escape');await expect(link).toHaveCount(0);await expect(body).toBeFocused();await expect(body).toHaveText('words');await expect(page.getByRole('dialog',{name:'Search',exact:true})).toHaveCount(0);
  await page.keyboard.press('Escape');await expect(page.locator('.descview')).toHaveText('words');await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
});

for(const width of [1280,390])test(`header keeps the published title size at either density at ${width}px`,async({demo:page})=>{
  await page.setViewportSize({width,height:844});await go(page,'#/settings');
  for(const density of ['Comfortable','Compact']){
    await page.getByRole('radio',{name:density,exact:true}).click();await go(page,'#/week');await expect(page.locator('.screen.active .ptitle')).toHaveCSS('font-size',width>720?'27px':'22px');await go(page,'#/settings');
  }
});

for(const variant of ['composer','detail'])test(`bold and links stay rich across paragraph breaks in ${variant}`,async({demo:page})=>{
  if(variant==='composer')await page.getByRole('button',{name:'Add task',exact:true}).first().click();
  else{await row(page,'Send this month’s invoice').locator('.ttitle').click();await page.locator('.descview').click();}
  const body=page.locator(`.descedit.${variant} .cm-content`);await body.click();
  await page.keyboard.press('ControlOrMeta+b');await page.keyboard.type('hello');await page.keyboard.press('Enter');await page.keyboard.type('world');
  await expect(body.locator('.md-strong')).toHaveText(['hello','world']);await expect(body).not.toContainText('*');
  await page.keyboard.press('ControlOrMeta+b');await page.keyboard.type(' normal');await expect(body.locator('.md-strong').last()).toHaveText('world');
  await page.keyboard.press('Enter');await page.keyboard.type('link');for(let i=0;i<4;i++)await page.keyboard.press('Shift+ArrowLeft');
  await page.keyboard.press('ControlOrMeta+k');const dialog=page.getByRole('dialog',{name:'Link',exact:true});
  await dialog.getByRole('textbox',{name:'Link URL'}).fill('free.fr');await dialog.getByRole('button',{name:'Apply'}).click();
  await page.keyboard.press('Enter');await page.keyboard.type('plain text');
  await expect(body.locator('.md-link')).toHaveText('link');await expect(body.locator('.md-link')).toHaveAttribute('data-href','https://free.fr');
  await expect(body).not.toContainText('*');await expect(body).not.toContainText('](https');await expect(body).toContainText('plain text');
});
test('metadata preview type remains the same size across styles',async({demo:page})=>{
  await go(page,'#/settings');
  const font=()=>page.locator('.preview-task .meta > *').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).fontSize));
  const before=await font();expect(before.length).toBeGreaterThan(0);
  for(const name of ['Neutral','Inherited colours','Todoist inspired']){
    await page.locator('.chipschoice').getByRole('radio',{name,exact:true}).click();expect(await font()).toEqual(before);
  }
});

test('Enter replacing formatted words stays invisible and saves cleanly',async({demo:page})=>{
  await row(page,'Send this month’s invoice').locator('.ttitle').click();await page.locator('.descview').click();const body=page.locator('.descedit.detail .cm-content');
  await page.keyboard.press('ControlOrMeta+b');await page.keyboard.type('hello');for(let i=0;i<5;i++)await page.keyboard.press('Shift+ArrowLeft');
  await page.keyboard.press('Enter');await page.keyboard.type('normal');await expect(body).not.toContainText('*');await expect(body).toContainText('normal');
  await page.keyboard.press('ControlOrMeta+a');await page.keyboard.type('bold');await page.keyboard.press('ControlOrMeta+a');await page.keyboard.press('ControlOrMeta+b');
  await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowLeft');await page.keyboard.press('Enter');await page.keyboard.press('Escape');await expect(page.locator('.descview')).not.toContainText('*');
});

for(const theme of ['Light','Dark'])test(`neutral recurrence badge is grey in ${theme}`,async({demo:page})=>{
  await go(page,'#/settings');await page.getByRole('radio',{name:theme,exact:true}).click();await page.getByRole('radiogroup',{name:'Task metadata'}).getByRole('radio',{name:'Neutral',exact:true}).click();await go(page,'#/week');
  const badge=row(page,'Take out the recycling').locator('.repeatdot');
  const colours=await badge.evaluate(n=>({actual:getComputedStyle(n).color,muted:getComputedStyle(n.parentElement!.querySelector('.est')!).color}));
  await expect(badge).toHaveCSS('color',colours.muted);
});
