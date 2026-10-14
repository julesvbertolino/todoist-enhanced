/** Shared ordering for the palette and the complete results page. */
export const foldSearch = (text: string): string =>
  text.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
export function searchRank(query: string, name: string, ...others: string[]): number {
  const q = foldSearch(query);
  if (!q) return -1;
  const text = foldSearch(name);
  if (text === q) return 0;
  if (text.startsWith(q)) return 1;
  if (text.split(/[\s/_-]+/).some((word) => word.startsWith(q))) return 2;
  if (text.includes(q)) return 3;
  return others.some((other) => foldSearch(other).includes(q)) ? 4 : -1;
}
/** Case- and accent-insensitive text used by picker filters. */
export const searchText = (value: string): string =>
  value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const matchesSearch = (value: string, query: string): boolean =>
  searchText(value).includes(searchText(query.trim()));
