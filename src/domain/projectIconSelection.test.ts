import { describe, expect, it } from 'vitest';
import { PROJECT_ICONS, PROJECT_ICON_IDS, PROJECT_ICON_SYNONYMS } from './projectIconCatalog';
import { matchesSearch } from './search';

describe('project and filter icon selection', () => {
  it('offers a small set of valid unique icons while retaining old icons', () => {
    expect(PROJECT_ICON_IDS.length).toBeLessThan(70);
    expect(PROJECT_ICON_IDS).toContain('book-open-text');
    expect(PROJECT_ICON_IDS).not.toContain('book');
    expect(new Set(PROJECT_ICON_IDS).size).toBe(PROJECT_ICON_IDS.length);
    for (const id of PROJECT_ICON_IDS) expect(PROJECT_ICONS[id]).toBeDefined();
    expect(PROJECT_ICONS.ambulance).toBeDefined();
  });
  it('finds icons using related words and ignores accents', () => {
    const find = (q: string) => PROJECT_ICON_IDS.filter(id => [id.replace(/-/g, ' '), ...(PROJECT_ICON_SYNONYMS[id] ?? [])].some(word => matchesSearch(word, q)));
    expect(find('courses')).toContain('shopping-basket');
    expect(find('echecs')).toContain('chess-knight');
    expect(find('social media')).toContain('message-circle');
    expect(find('pointeur')).toContain('mouse-pointer');
  });
});
