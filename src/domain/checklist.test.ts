import { describe, expect, it } from 'vitest';
import {
  MAX_DESCRIPTION, checklistItems, checklistProgress, parseLines, pasteIntoItem,
  checklistPreview, serializeLines, toggleItem, toggleItemAt, withoutChecklist,
} from './checklist';

describe('what counts as a checklist item (#157)', () => {
  const items = (text: string) => checklistItems(text).map(({ checked, text: label }) => [checked, label]);

  it('reads open and done items, with either bullet and up to three spaces of indent', () => {
    expect(items('- [ ] open\n- [x] done\n- [X] shouted\n* [ ] star\n   - [ ] indented')).toEqual([
      [false, 'open'], [true, 'done'], [true, 'shouted'], [false, 'star'], [false, 'indented'],
    ]);
  });

  it('keeps an empty item as an empty item', () => {
    expect(items('- [ ]\n- [x] ')).toEqual([[false, ''], [true, '']]);
  });

  it('leaves a plain bullet, a box with no space, and four spaces of indent as text', () => {
    expect(items('- plain\n- [ ]no space\n    - [ ] code block indent\n[ ] no bullet')).toEqual([]);
  });

  it('ignores anything inside a fenced code block', () => {
    expect(items('before\n```\n- [ ] not an item\n```\n- [ ] an item\n~~~\n- [x] nor this\n~~~')).toEqual([[false, 'an item']]);
  });

  it('reads Windows line endings', () => {
    expect(items('- [ ] one\r\n- [x] two\r\ntext')).toEqual([[false, 'one'], [true, 'two']]);
  });

  it('keeps the text before, between and after', () => {
    expect(withoutChecklist('Intro\n- [ ] a\nmiddle\n- [x] b\nend')).toBe('Intro\nmiddle\nend');
    expect(withoutChecklist('- [ ] only\n- [x] items')).toBe('');
  });
});

describe('the preview a row shows (#393)', () => {
  it('follows the text with the items still to do', () => {
    expect(checklistPreview('Avant l’appel :\n- [x] Ouvrir\n- [ ] Présenter le planning\n- [ ] Lister les décisions'))
      .toBe('Avant l’appel : Présenter le planning, Lister les décisions');
  });

  it('drops the dangling colon once every item is ticked', () => {
    expect(checklistPreview('Avant l’appel :\n- [x] a\n- [x] b')).toBe('Avant l’appel');
    expect(checklistPreview('Before the call:\n- [x] a')).toBe('Before the call');
  });

  it('shows the items alone when there is no text', () => {
    expect(checklistPreview('- [ ] one\n- [x] two\n- [ ] three')).toBe('one, three');
    expect(checklistPreview('- [x] done')).toBe('');
  });

  it('leaves a description without a checklist as it was', () => {
    expect(checklistPreview('Just text:\nand more')).toBe('Just text:\nand more');
    expect(checklistPreview('')).toBe('');
  });
});

describe('round trip', () => {
  const samples = [
    '', 'plain', 'a\nb', '- [ ] a', '- [ ]', '- [ ] ', 'x\r\n- [x] y\r\nz', '- [ ] a\n\n\n- [x] b\n',
    'one\r- [ ] two', '```\n- [ ] code\n```', '  * [X] odd   spacing  \n\ttab', 'mixed\r\nends\n- [ ] here\r',
  ];
  it.each(samples)('writes back exactly what it read: %j', (text) => {
    expect(serializeLines(parseLines(text))).toBe(text);
  });
});

describe('ticking', () => {
  it('changes only that line, and only the box', () => {
    const text = 'Title\r\n- [ ] one\r\nnote\r\n- [x] two\r\n';
    expect(toggleItem(text, 0)).toBe('Title\r\n- [x] one\r\nnote\r\n- [x] two\r\n');
    expect(toggleItem(text, 1)).toBe('Title\r\n- [ ] one\r\nnote\r\n- [ ] two\r\n');
  });

  it('keeps indices stable with text in between, and by line', () => {
    const text = '- [ ] a\ntext\n- [ ] b';
    expect(toggleItem(text, 1)).toBe('- [ ] a\ntext\n- [x] b');
    expect(toggleItemAt(text, 2)).toBe('- [ ] a\ntext\n- [x] b');
    expect(toggleItemAt(text, 1)).toBe(text);
  });

  it('twice is the same text, and an index that is not there changes nothing', () => {
    const text = '- [X] a\n- [ ] b';
    // A shouted X is written as x once it has been round the box.
    expect(toggleItem(toggleItem(text, 0), 0)).toBe('- [x] a\n- [ ] b');
    expect(toggleItem(text, 0)).toBe('- [ ] a\n- [ ] b');
    expect(toggleItem(text, 7)).toBe(text);
  });

  it('applies two ticks in a row to the latest text, losing neither', () => {
    const text = '- [ ] a\n- [ ] b\n- [ ] c';
    expect(toggleItem(toggleItem(text, 0), 2)).toBe('- [x] a\n- [ ] b\n- [x] c');
  });
});

describe('counting', () => {
  it('counts done against total, and zero for none', () => {
    expect(checklistProgress('- [x] a\n- [ ] b\ntext\n- [X] c')).toEqual({ done: 2, total: 3 });
    expect(checklistProgress('nothing here')).toEqual({ done: 0, total: 0 });
  });
});

describe('editing', () => {
  it('makes one item per pasted line, dropping bullets and blank lines', () => {
    const pasted = pasteIntoItem('- [ ] ', 0, 0, 0, '- milk\n\n* [ ] eggs\r\nbread');
    expect(pasted?.description).toBe('- [ ] milk\n- [ ] eggs\n- [ ] bread');
    expect(pasted).toMatchObject({ line: 2, caret: 5 });
  });

  it('pastes into the middle of an item and keeps what came after the caret on the last one', () => {
    const pasted = pasteIntoItem('- [ ] ab', 0, 1, 1, 'X\nY');
    expect(pasted?.description).toBe('- [ ] aX\n- [ ] Yb');
    expect(pasteIntoItem('- [ ] ab', 0, 1, 1, 'X')?.description).toBe('- [ ] aXb');
    expect(pasteIntoItem('- [ ] ab', 0, 0, 2, 'Z')?.description).toBe('- [ ] Z');
  });

  it('refuses a paste that would not fit', () => {
    const near = `${'x'.repeat(MAX_DESCRIPTION - 10)}\n- [ ] `;
    expect(pasteIntoItem(near, 1, 0, 0, 'a\nb\nc\nd')).toBeNull();
  });
});
