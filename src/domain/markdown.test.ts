import { describe, expect, it } from 'vitest';
import { plainTitle, renderTitle, titleLinks } from './markdown';

describe('task titles with links (#101)', () => {
  it('renders a Markdown link and a bare address as anchors that open a new tab', () => {
    const html = renderTitle('Read [the brief](https://example.com/a_b) and https://todoist.com/x');
    expect(html).toContain('<a href="https://example.com/a_b" target="_blank" rel="noopener noreferrer">the brief</a>');
    expect(html).toContain('<a href="https://todoist.com/x"');
  });

  it('never lets markup through', () => {
    expect(renderTitle('<img src=x onerror=alert(1)>')).not.toContain('<img');
    expect(renderTitle('[x](javascript:alert(1))')).not.toContain('<a');
  });

  it('reads as plain words where a title is text', () => {
    expect(plainTitle('Read [the brief](https://example.com) **now**')).toBe('Read the brief now');
  });

  it('lists the links a title carries, in order', () => {
    expect(titleLinks('[a](https://a.com) then https://b.com')).toEqual([
      { label: 'a', href: 'https://a.com' },
      { label: 'https://b.com', href: 'https://b.com' },
    ]);
    expect(titleLinks('no links here')).toEqual([]);
  });
});

describe('bare domains without a scheme (#101 follow-up)', () => {
  it('links a bare domain typed with no http:// in front of it', () => {
    const html = renderTitle('Voir free.fr pour le tarif');
    expect(html).toContain('<a href="https://free.fr" target="_blank" rel="noopener noreferrer">free.fr</a>');
  });

  it('keeps the path, but not trailing punctuation from the sentence', () => {
    expect(renderTitle('Voir example.com/tarifs.'))
      .toContain('<a href="https://example.com/tarifs" target="_blank" rel="noopener noreferrer">example.com/tarifs</a>');
  });

  it('never turns an abbreviation, an initial or a decimal into a link', () => {
    for (const text of ['e.g. see the docs', 'M. Dupont a appelé', 'Verse 3.5 says']) {
      expect(renderTitle(text)).not.toContain('<a');
    }
  });

  it('leaves the domain half of an email address alone', () => {
    expect(renderTitle('Contact user@example.com')).not.toContain('<a');
  });

  it('is listed by titleLinks and plainTitle keeps its own text', () => {
    expect(titleLinks('Voir free.fr')).toEqual([{ label: 'free.fr', href: 'https://free.fr' }]);
    expect(plainTitle('Voir free.fr')).toBe('Voir free.fr');
  });
});

describe('text that looks like an internal placeholder (#135)', () => {
  it('shows @@link0@@ and @@code0@@ as the words they are', () => {
    expect(renderTitle('Fill @@link0@@ in')).toBe('Fill @@link0@@ in');
    expect(renderTitle('Fill @@link3@@ in')).not.toContain('undefined');
    expect(renderTitle('Fill @@code0@@ in')).toBe('Fill @@code0@@ in');
  });

  it('keeps a real code span and a real link while the lookalike stays text', () => {
    const html = renderTitle('`a` and @@code0@@ and [x](https://example.com) @@link0@@');
    expect(html.match(/<code>a<\/code>/g)).toHaveLength(1);
    expect(html).toContain('@@code0@@');
    expect(html).toContain('@@link0@@');
    expect(html.match(/<a /g)).toHaveLength(1);
    expect(html).not.toContain('undefined');
  });

  it('cannot be forged with the characters slots are made of', () => {
    const html = renderTitle('x c9 y');
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('');
  });

  it('still renders a code span inside a link label', () => {
    expect(renderTitle('[`x`](https://example.com)'))
      .toContain('<a href="https://example.com" target="_blank" rel="noopener noreferrer"><code>x</code></a>');
  });
});

describe('links to other apps (deep links)', () => {
  it('renders a Markdown deep link as an anchor that hands over to the app', () => {
    const html = renderTitle('[My note](upnote://x-callback-url/openNote?noteId=1&notebookId=2)');
    expect(html).toContain('<a href="upnote://x-callback-url/openNote?noteId=1&amp;notebookId=2" rel="noopener noreferrer">My note</a>');
    expect(html).not.toContain('target=');
  });

  it('reads Evernote, OneNote, Obsidian and Notion links, bare or labelled', () => {
    for (const href of ['evernote:///view/1/s1/abc/abc/', 'onenote:https://d.docs.live.net/x', 'obsidian://open?vault=a', 'notion://www.notion.so/x']) {
      expect(renderTitle(`[n](${href})`)).toContain('<a href=');
    }
    expect(titleLinks('See evernote:///view/1/s1/abc/ now')).toEqual([{ label: 'evernote:///view/1/s1/abc/', href: 'evernote:///view/1/s1/abc/' }]);
  });

  it('keeps web links in a new tab and code-running schemes as text', () => {
    expect(renderTitle('[a](https://a.com)')).toContain('target="_blank"');
    for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'vbscript:x', 'file:///etc/passwd', 'JavaScript://%0aalert(1)']) {
      expect(renderTitle(`[x](${bad})`)).not.toContain('<a');
      expect(renderTitle(`go ${bad}`)).not.toContain('<a');
    }
  });

  it('reads an app\'s bare scheme as the link that opens the app, but not an empty web address', () => {
    expect(titleLinks('open applenotes:// now')).toEqual([{ label: 'applenotes://', href: 'applenotes://' }]);
    expect(titleLinks('see https:// here')).toEqual([]);
  });

  it('keeps a long Spark link whole, with its encoded line breaks', () => {
    const href = 'readdle-spark://bl=QTpqdWxlc3ZhbGVudGluYmVydG9saW5v%0D%0AMDk1Ny4zLmY2MzA4MjlhNTk0NmZiZjYu%3D';
    expect(titleLinks(`Mail ${href}`)).toEqual([{ label: href, href }]);
  });
});
