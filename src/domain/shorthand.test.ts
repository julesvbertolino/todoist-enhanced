import { describe, expect, it } from 'vitest';
import { carryRanges, parseShorthand, savedRefusals, splitTrailingEstimate, trailingEstimate } from './shorthand';
import { emptySnapshot, type Project, type Section, type Snapshot } from './types';

const project = (id: string, name: string): Project => ({
  id, name, color: 'grey', parent_id: null, child_order: 1,
  is_archived: false, is_deleted: false, is_favorite: false, workspace_id: null,
});
const section = (id: string, project_id: string, name: string): Section => ({
  id, project_id, name, section_order: 1, is_archived: false, is_deleted: false,
});

const snapshot: Snapshot = {
  ...emptySnapshot(),
  projects: {
    alias: project('alias', 'aliasdigital.'),
    perso: project('perso', 'Perso'),
    rd: project('rd', 'R&D'),
    home: project('home', 'Maison 🏡'),
  },
  sections: {
    site: section('site', 'alias', 'Site internet'),
    admin: section('admin', 'perso', 'Admin'),
  },
};

const read = (raw: string) => parseShorthand(raw, snapshot, false);
const marked = (raw: string) => {
  const range = read(raw).ranges.find((r) => r.kind === 'project');
  return range ? raw.slice(range.start, range.end) : null;
};

describe('#project names with any character (#102)', () => {
  it('reads a project whose name ends with a full stop, as the list inserts it', () => {
    const parsed = read('Refaire le site #aliasdigital. ');
    expect(parsed.projectId).toBe('alias');
    expect(marked('Refaire le site #aliasdigital. ')).toBe('#aliasdigital.');
  });

  it('reads a project and its section, the section squashed as the list inserts it', () => {
    const parsed = read('Refaire #aliasdigital./Siteinternet ');
    expect(parsed.projectId).toBe('alias');
    expect(parsed.sectionId).toBe('site');
    expect(marked('Refaire #aliasdigital./Siteinternet ')).toBe('#aliasdigital./Siteinternet');
  });

  it('lets go of the full stop that ends a sentence', () => {
    expect(read('Appeler Anne #Perso.').projectId).toBe('perso');
    expect(marked('Appeler Anne #Perso.')).toBe('#Perso');
    expect(read('Ranger #Perso/Admin.').sectionId).toBe('admin');
  });

  it('reads names with & and emoji', () => {
    expect(read('Budget #R&D').projectId).toBe('rd');
    expect(read('Peindre #Maison🏡').projectId).toBe('home');
  });

  it('still reads a plain project, and nothing when the name does not exist', () => {
    expect(read('Courses #perso').projectId).toBe('perso');
    expect(read('Courses #inconnu').projectId).toBeNull();
    expect(read('C# est un langage').projectId).toBeNull();
  });

  it('gives the reading up when it is refused', () => {
    const raw = 'Refaire #aliasdigital. ';
    const start = raw.indexOf('#');
    expect(parseShorthand(raw, snapshot, false, [{ start, end: start + 14 }]).projectId).toBeNull();
  });
});

describe('a saved title opens as plain text (#117)', () => {
  const natural = (raw: string, refused = savedRefusals(raw, snapshot, true)) =>
    parseShorthand(raw, snapshot, true, refused);

  it('reads nothing in a saved title that would otherwise be read', () => {
    for (const title of ['Daily review', 'Call Anne tomorrow p1 @home', 'Plan #Perso (25)']) {
      expect(parseShorthand(title, snapshot, true).ranges.length).toBeGreaterThan(0);
      const parsed = natural(title);
      expect(parsed.ranges).toEqual([]);
      expect(parsed.content).toBe(title);
    }
  });

  it('refuses the next candidate too, when refusing the first lets it in', () => {
    const title = 'Weekly review every monday';
    expect(natural(title).ranges).toEqual([]);
  });

  it('leaves a link shown', () => {
    const title = 'Read https://example.com tomorrow';
    const parsed = natural(title);
    expect(parsed.ranges.map((r) => r.kind)).toEqual(['link']);
    expect(parsed.date).toBeNull();
  });

  it('still reads what is typed after the saved words', () => {
    const saved = 'Daily review';
    const typed = `${saved} p2`;
    const refused = carryRanges(savedRefusals(saved, snapshot, true), saved, typed);
    const parsed = parseShorthand(typed, snapshot, true, refused);
    expect(parsed.priority).toBe(2);
    expect(parsed.recurrence).toBeNull();
    expect(parsed.content).toBe(saved);
  });
});

describe('an estimate at the end of a subtask (#163)', () => {
  it('is read from trailing brackets and taken off the title', () => {
    expect(splitTrailingEstimate('Draft outline (5)')).toEqual({ content: 'Draft outline', minutes: 5 });
    expect(splitTrailingEstimate('Write (25)')).toEqual({ content: 'Write', minutes: 25 });
    expect(splitTrailingEstimate('Call back (1h)')).toEqual({ content: 'Call back', minutes: 60 });
    expect(splitTrailingEstimate('Research (1h15)')).toEqual({ content: 'Research', minutes: 75 });
    expect(splitTrailingEstimate('  Tidy (90 min)  ')).toEqual({ content: 'Tidy', minutes: 90 });
  });

  it('leaves brackets that are not a duration, or not at the end, in the title', () => {
    expect(splitTrailingEstimate('Call Sam (maybe)')).toEqual({ content: 'Call Sam (maybe)', minutes: null });
    expect(splitTrailingEstimate('Review (5 pages)')).toEqual({ content: 'Review (5 pages)', minutes: null });
    expect(splitTrailingEstimate('Read (5) chapters')).toEqual({ content: 'Read (5) chapters', minutes: null });
    expect(splitTrailingEstimate('(5)')).toEqual({ content: '(5)', minutes: null });
    expect(splitTrailingEstimate('Plain title')).toEqual({ content: 'Plain title', minutes: null });
  });
});

describe('the estimate marked at the end of a subtask (#163)', () => {
  it('is located exactly where it is taken from', () => {
    expect(trailingEstimate('Draft outline (5)')).toEqual({ start: 14, end: 17, minutes: 5 });
    expect(trailingEstimate('Draft outline (5)  ')).toEqual({ start: 14, end: 17, minutes: 5 });
    expect(trailingEstimate('Call Sam (maybe)')).toBeNull();
    expect(trailingEstimate('Read (5) chapters')).toBeNull();
    expect(trailingEstimate('(5)')).toBeNull();
  });
});

describe('explicit duration phrases', () => {
  it.each(['Écrire (deux heures)', 'Write (two hours)', 'Write for two hours', 'Écrire pendant deux heures'])('takes %s as an estimate without setting a date', (text) => {
    const value = parseShorthand(text, emptySnapshot(), true);
    expect(value.minutes).toBe(120);
    expect(value.date).toBeNull();
    expect(value.content).toMatch(/^(Écrire|Write)$/);
  });
  it('keeps rejected duration phrases in the title', () => {
    const text = 'Write for one hour';
    const first = parseShorthand(text, emptySnapshot(), true);
    const value = parseShorthand(text, emptySnapshot(), true, first.ranges);
    expect(value.minutes).toBeNull(); expect(value.content).toBe(text);
  });
});
