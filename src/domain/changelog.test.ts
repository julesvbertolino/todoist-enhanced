import { describe, expect, it } from 'vitest';
import english from '../../CHANGELOG.md?raw';
import french from '../../CHANGELOG.fr.md?raw';
import {
  changePresentation, compareVersions, hasChanges, localisedReleases, parseChangelog, releaseDisplay, unseenFeed, unseenReleases,
} from './changelog';
import { VERSION } from '@/app-info';

const SAMPLE = `# Changelog
The changelog marks every line.

## 1.2.0

The intro, over
two lines.

🆕 **New thing.** It does
something.

🎨 **Redrawn.** Looks better.

🐛 **Fixed.** No longer breaks.

## 1.1.0

🐛 **Only a fix.** Nothing new.

## 1.0.0

🆕 **First.** Hello.
`;

describe('the changelog (#115)', () => {
  const releases = parseChangelog(SAMPLE);

  it('reads each release, its intro and its three kinds of change', () => {
    expect(releases.map((r) => r.version)).toEqual(['1.2.0', '1.1.0', '1.0.0']);
    expect(releases[0].intro).toBe('The intro, over two lines.');
    expect(releases[0].changes.map((c) => c.kind)).toEqual(['new', 'design', 'fix']);
    expect(releases[0].changes[0].text).toBe('**New thing.** It does something.');
  });

  it('compares versions as numbers', () => {
    expect(compareVersions('1.10.0', '1.9.3')).toBe(1);
    expect(compareVersions('1.2.0', '1.2.0')).toBe(0);
    expect(compareVersions('0.9.0', '1.0.0')).toBe(-1);
  });

  it('shows what came after the version last seen, up to the running one', () => {
    expect(unseenReleases(releases, '1.2.0', '1.0.0').map((r) => r.version)).toEqual(['1.2.0', '1.1.0']);
    expect(unseenReleases(releases, '1.1.0', '1.0.0').map((r) => r.version)).toEqual(['1.1.0']);
    expect(unseenReleases(releases, '1.2.0', '1.2.0')).toEqual([]);
  });

  it('shows only the running release to an account that never saw one', () => {
    expect(unseenReleases(releases, '1.2.0', null).map((r) => r.version)).toEqual(['1.2.0']);
  });

  it('is worth a dialog for every release that says something, fixes only included (#148)', () => {
    // 1.1.0 is a release made only of a fix: it used to be marked read in silence.
    expect(hasChanges(unseenReleases(releases, '1.1.0', '1.0.0'))).toBe(true);
    expect(hasChanges(unseenReleases(releases, '1.2.0', '1.1.0'))).toBe(true);
    expect(hasChanges([])).toBe(false);
    expect(hasChanges([{ version: '1.3.0', intro: 'Nothing else.', changes: [] }])).toBe(false);
  });

  it('lists each release from the most visible change to the least (#148)', () => {
    const shuffled = parseChangelog(
      '## 1.0.0\n\n🐛 **Fix A.** One.\n\n🎨 **Look.** Two.\n\n🆕 **Feature.** Three.\n\n🐛 **Fix B.** Four.\n\n🆕 **Second feature.** Five.\n',
    );
    expect(shuffled[0].changes.map((c) => c.kind)).toEqual(['new', 'new', 'design', 'fix', 'fix']);
    // Within a kind, the author's order stands.
    expect(shuffled[0].changes.map((c) => c.text.split('.')[0])).toEqual([
      '**Feature', '**Second feature', '**Look', '**Fix A', '**Fix B',
    ]);
  });

  it('falls back to English for a release that is not translated', () => {
    const fr = parseChangelog('## 1.2.0\n\nEn français.\n\n🆕 **Nouveau.** Oui.\n');
    const merged = localisedReleases(releases, fr);
    expect(merged[0]).toMatchObject({ version: '1.2.0', intro: 'En français.', untranslated: false });
    expect(merged[1]).toMatchObject({ version: '1.1.0', untranslated: true });
  });

  it('reads the real files: the running version is described, and translated whole if at all', () => {
    const en = parseChangelog(english);
    expect(en.find((r) => r.version === VERSION)?.changes.length).toBeGreaterThan(0);
    for (const release of parseChangelog(french)) {
      const original = en.find((r) => r.version === release.version);
      expect(original, `CHANGELOG.fr.md has ${release.version}, CHANGELOG.md does not`).toBeDefined();
      expect(release.changes.map((c) => c.kind)).toEqual(original?.changes.map((c) => c.kind));
    }
  });

  it('the running version opens the window after an update (#148)', () => {
    // Updating from the release just before the running one.
    const entries = parseChangelog(english);
    const previous = entries[entries.findIndex((release) => release.version === VERSION) + 1];
    const running = unseenReleases(parseChangelog(english), VERSION, previous.version);
    expect(running.map((r) => r.version)).toEqual([VERSION]);
    expect(hasChanges(running)).toBe(true);
  });
});

it('gives legacy entries a title without losing their description', () => {
  expect(changePresentation('**A title.** A description.')).toEqual({ title: 'A title', description: 'A description.' });
  expect(changePresentation('A legacy feature. More detail.')).toEqual({ title: 'A legacy feature', description: 'More detail.' });
  expect(changePresentation('Support version 1.2.0. More detail.')).toEqual({ title: 'Support version 1.2.0', description: 'More detail.' });
  expect(changePresentation('A single sentence.')).toEqual({ title: 'A single sentence', description: '' });
});

describe('the post-update feed (#336)', () => {
  const missed = parseChangelog(`## 1.2.0

🆕 **New text.** Plain.

🐛 **Newer fix.** Plain.

## 1.1.0

🐛 **Older fix.** Plain.

🆕 **Older picture.** Drawn.

🎨 **Older redesign.** Plain.
`);
  /* Entries are sorted by kind inside a release: 1.1.0 reads 🆕, 🎨, 🐛. */
  const visualOf = (version: string, index: number) => (version === '1.1.0' && index === 0 ? 'picture' : null);
  const titles = (feed: ReturnType<typeof unseenFeed<string>>) =>
    feed.map((entry) => changePresentation(entry.change.text).title);

  it('puts what carries a picture first, then new things, redesigns and fixes', () => {
    expect(titles(unseenFeed(missed, visualOf))).toEqual([
      'Older picture', 'New text', 'Older redesign', 'Newer fix', 'Older fix',
    ]);
  });

  it('keeps a picture above everything, a fix included, and sorts the pictures by kind', () => {
    const pictures = (version: string, index: number) =>
      (version === '1.2.0' && index === 1) || (version === '1.1.0' && index === 0) ? 'picture' : null;
    expect(titles(unseenFeed(missed, pictures))).toEqual([
      'Older picture', 'Newer fix', 'New text', 'Older redesign', 'Older fix',
    ]);
  });

  it('orders one release the same way, keeping each entry\'s own index', () => {
    const release = missed[1];
    const shown = releaseDisplay(release, visualOf);
    expect(shown.map((entry) => entry.index)).toEqual([0, 1, 2]);
    const fixPicture = releaseDisplay(release, (_v, index) => (index === 2 ? 'picture' : null));
    expect(fixPicture.map((entry) => entry.index)).toEqual([2, 0, 1]);
  });

  it('shows every entry once and keeps its release, place and picture together', () => {
    const feed = unseenFeed(missed, visualOf);
    expect(feed).toHaveLength(5);
    expect(feed[0]).toMatchObject({ version: '1.1.0', index: 0, visual: 'picture' });
    expect(feed.filter((entry) => entry.visual !== null)).toHaveLength(1);
  });

  it('breaks ties with the newest release, then the written order, without touching the releases', () => {
    const before = JSON.stringify(missed);
    const feed = unseenFeed<string>(missed, () => null);
    expect(titles(feed)).toEqual(['New text', 'Older picture', 'Older redesign', 'Newer fix', 'Older fix']);
    expect(JSON.stringify(missed)).toBe(before);
  });

  it('carries the untranslated mark of the release an entry came from', () => {
    const feed = unseenFeed<string>([{ ...missed[0], untranslated: true }, missed[1]], () => null);
    expect(feed.filter((entry) => entry.untranslated).map((entry) => entry.version)).toEqual(['1.2.0', '1.2.0']);
  });

  it('is empty without releases', () => {
    expect(unseenFeed([], () => null)).toEqual([]);
  });
});
