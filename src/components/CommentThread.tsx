import { useDataSnapshot } from '@/hooks/useDataSnapshot';
import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { useConfirm } from './overlays/Confirm';
import { useT } from '@/hooks/useT';
import { useMenuKeys } from '@/hooks/useMenuKeys';
import { useStore } from '@/store/store';
import { copyText, isTemporaryId, todoistTaskUrl } from '@/api/links';
import { uploadAttachment } from '@/api/uploads';
import { avatarUrl } from '@/domain/colors';
import { formatRelativeDay } from '@/domain/dates';
import { renderMarkdown } from '@/domain/markdown';
import type { Note, NoteAttachment } from '@/domain/types';
import { assignees } from '@/domain/sharing';
import { encodeMentions, mentionQuery, mentionedUids, renderWithMentions } from '@/domain/mentions';
import { MultiSelect } from './MultiSelect';

/* The full palette and its data load the first time somebody reacts (#27). */
const EmojiPalette = lazy(() => import('./EmojiPalette').then((module) => ({ default: module.EmojiPalette })));

const IMAGE = /^image\//;

/** From this many comments the header offers to turn the thread over. */
const LONG_THREAD = 4;

/** "Today · 10:12", "7 Oct · 16:52": when a comment was written, to the minute. */
function commentTime(iso: string, locale: 'en' | 'fr'): string {
  const date = new Date(iso);
  const clock = new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
  return `${formatRelativeDay(date, locale)} · ${clock}`;
}

const sizeLabel = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

/**
 * What a comment carries besides its words: an image as a thumbnail, any
 * other file as a chip. An image that does not load (a demo's blob URL after
 * a reload, a link Todoist no longer serves) falls back to the chip, never to
 * a broken picture and a raw link (#33).
 */
function Attachment({ file }: { file: NoteAttachment }) {
  const { t } = useT();
  const [broken, setBroken] = useState(false);
  if (!file.file_url) return null;
  const image = IMAGE.test(file.file_type ?? '') || file.resource_type === 'image';
  const name = file.file_name ?? file.file_url.split('/').pop() ?? file.file_url;
  if (image && !broken) {
    return (
      <span className="comment-image">
        <a href={file.file_url} target="_blank" rel="noopener noreferrer" title={name}>
          <img src={file.image ?? file.file_url} alt={name} loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
        </a>
        <a className="comment-download" href={file.file_url} download={name} aria-label={`${t('comment.download')} (${name})`} title={t('comment.download')}>
          <Icon name="download" size="sm" />
        </a>
      </span>
    );
  }
  return (
    <a className="comment-file" href={file.file_url} target="_blank" rel="noopener noreferrer" title={name}>
      <Icon name={image ? 'image' : 'file'} size="sm" />
      <span>{name}</span>
      {file.file_size ? <small>{sizeLabel(file.file_size)}</small> : null}
    </a>
  );
}

/** The field's text cut into plain runs and the picked "@Name"s, in order. */
function mirrorParts(text: string, picked: Array<{ name: string }>): Array<{ text: string; mention: boolean }> {
  const names = picked.map((p) => `@${p.name}`).sort((a, b) => b.length - a.length);
  const parts: Array<{ text: string; mention: boolean }> = [];
  let rest = text;
  while (rest) {
    let at = -1; let found = '';
    for (const name of names) {
      const i = rest.indexOf(name);
      if (i >= 0 && (at < 0 || i < at)) { at = i; found = name; }
    }
    if (at < 0) { parts.push({ text: rest, mention: false }); break; }
    if (at > 0) parts.push({ text: rest.slice(0, at), mention: false });
    parts.push({ text: found, mention: true });
    rest = rest.slice(at + found.length);
  }
  return parts;
}

/** "Alex Martin" → "AM", "anne" → "A": what stands in for a missing picture. */
function initials(name: string | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  return (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase();
}

function Avatar({ picture, name }: { picture: string | null; name: string | undefined }) {
  return (
    <span className="comment-avatar" aria-hidden="true">
      {picture
        ? <img src={picture} alt="" referrerPolicy="no-referrer" />
        : initials(name)}
    </span>
  );
}

function CommentRow({ note, itemId }: { note: Note; itemId: string }) {
  const { t, locale } = useT();
  const confirm = useConfirm();
  const toast = useStore((s) => s.toast);
  const demo = useStore((s) => s.demo);
  const me = useStore((s) => s.snapshot.user);
  const collaborators = useStore((s) => s.snapshot.collaborators);
  const updateComment = useStore((s) => s.updateComment);
  const deleteComment = useStore((s) => s.deleteComment);
  const toggleReaction = useStore((s) => s.toggleReaction);

  const mine = note.posted_uid === me?.id;
  const author = mine ? me?.full_name : collaborators[note.posted_uid]?.full_name;
  const picture = mine ? avatarUrl(me) : avatarUrl(collaborators[note.posted_uid] ?? null);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.content);
  const [menu, setMenu] = useState<'more' | 'react' | null>(null);
  const holder = useRef<HTMLDivElement>(null);
  const reactButton = useRef<HTMLButtonElement>(null);
  const moreButton = useRef<HTMLButtonElement>(null);
  const menuRef = useMenuKeys(menu === 'more', () => setMenu(null));
  /* The ⋯ menu floats over the window, below its button when there is room
     and above it when not, so the task window never cuts it off (#34). */
  const [menuPlace, setMenuPlace] = useState<{ top: number; left: number } | null>(null);
  useLayoutEffect(() => {
    if (menu !== 'more') { setMenuPlace(null); return; }
    const measure = () => {
      const box = moreButton.current?.getBoundingClientRect();
      if (!box) return;
      const width = menuRef.current?.offsetWidth ?? 200;
      const height = menuRef.current?.offsetHeight ?? 160;
      const below = box.bottom + 4;
      const top = below + height + 8 <= window.innerHeight ? below : Math.max(8, box.top - height - 4);
      const left = Math.min(Math.max(8, box.right - width), window.innerWidth - width - 8);
      setMenuPlace({ top, left });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [menu, menuRef]);
  const closeMenu = useCallback(() => setMenu(null), []);

  useEffect(() => { if (!editing) setDraft(note.content); }, [note.content, editing]);

  /* A menu goes away when anything outside it is pressed. */
  useEffect(() => {
    if (menu !== 'more') return;
    const away = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!holder.current?.contains(target) && !menuRef.current?.contains(target)) setMenu(null);
    };
    document.addEventListener('pointerdown', away, true);
    return () => document.removeEventListener('pointerdown', away, true);
  }, [menu, menuRef]);

  const reactions = Object.entries(note.reactions ?? {}).filter(([, who]) => who.length > 0);

  const save = () => {
    const text = draft.trim();
    if (text || note.file_attachment) void updateComment(note.id, text);
    setEditing(false);
  };

  const remove = async () => {
    setMenu(null);
    const ok = await confirm({
      title: t('comment.deleteTitle'),
      body: t('comment.deleteBody'),
      confirmLabel: t('comment.delete'),
      destructive: true,
    });
    if (ok) void deleteComment(note.id);
  };

  return (
    <article className="comment" data-note-id={note.id}>
      <Avatar picture={picture} name={author} />
      <div className="comment-body">
        <header>
          <strong>{author ?? t('detail.someone')}</strong>
          <time dateTime={note.posted_at}>{commentTime(note.posted_at, locale)}</time>
        </header>

        {editing ? (
          <div className="comment-edit">
            <textarea
              className="comment-field"
              autoFocus
              rows={2}
              value={draft}
              aria-label={t('comment.edit')}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !event.nativeEvent.isComposing) { event.preventDefault(); save(); }
                if (event.key === 'Escape') { event.preventDefault(); event.currentTarget.blur(); }
              }}
            />
            <span className="comment-edit-actions" title={t('comment.sendHint')}>
              <button className="btn sm" onClick={() => setEditing(false)}>{t('common.cancel')}</button>
              <button className="btn sm primary" onClick={save}>{t('common.save')}</button>
            </span>
          </div>
        ) : (
          note.content && <div className="md" dangerouslySetInnerHTML={{ __html: renderWithMentions(note.content, renderMarkdown) }} />
        )}

        {note.file_attachment && <Attachment file={note.file_attachment} />}

        {reactions.length > 0 && (
          <div className="comment-reactions">
            {reactions.map(([emoji, who]) => (
              <button
                key={emoji}
                className={`reactionchip${me && who.includes(me.id) ? ' mine' : ''}`}
                onClick={() => void toggleReaction(note.id, emoji)}
              >
                <span>{emoji}</span><small>{who.length}</small>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* On the pointer, or the keyboard being in the comment: two small
          actions at its right edge. */}
      {!editing && (
        <div className={`comment-actions${menu ? ' open' : ''}`} ref={holder}>
          <button
            ref={reactButton}
            className="iconbtn sm"
            aria-label={t('comment.react')}
            title={t('comment.react')}
            aria-expanded={menu === 'react'}
            onClick={() => setMenu((now) => (now === 'react' ? null : 'react'))}
          >
            <Icon name="react" size="sm" />
          </button>
          <button
            ref={moreButton}
            className="iconbtn sm"
            aria-label={t('comment.more')}
            title={t('comment.more')}
            aria-expanded={menu === 'more'}
            onClick={() => setMenu((now) => (now === 'more' ? null : 'more'))}
          >
            <Icon name="more" size="sm" />
          </button>

          {menu === 'react' && (
            <Suspense fallback={null}>
              <EmojiPalette
                anchor={reactButton.current}
                onClose={closeMenu}
                onPick={(emoji) => { setMenu(null); void toggleReaction(note.id, emoji); reactButton.current?.focus(); }}
              />
            </Suspense>
          )}

          {menu === 'more' && createPortal(
            <div
              className="popover rowmenu comment-menu"
              role="menu"
              ref={menuRef}
              style={menuPlace ? { top: menuPlace.top, left: menuPlace.left } : { opacity: 0, pointerEvents: 'none' }}
            >
              {mine && (
                <button className="opt" role="menuitem" onClick={() => { setMenu(null); setEditing(true); }}>
                  <span><Icon name="edit" size="sm" /> {t('comment.edit')}</span>
                </button>
              )}
              <button
                className="opt" role="menuitem"
                onClick={() => {
                  setMenu(null);
                  void copyText(note.content).then((ok) => toast(t(ok ? 'comment.copied' : 'comment.notCopied')));
                }}
              >
                <span><Icon name="copy" size="sm" /> {t('comment.copyText')}</span>
              </button>
              {!demo && !isTemporaryId(itemId) && (
                <button
                  className="opt" role="menuitem"
                  onClick={() => {
                    setMenu(null);
                    void copyText(`${todoistTaskUrl(itemId)}#comment-${note.id}`)
                      .then((ok) => toast(t(ok ? 'task.linkCopied' : 'task.linkNotCopied')));
                  }}
                >
                  <span><Icon name="link" size="sm" /> {t('comment.copyLink')}</span>
                </button>
              )}
              {mine && (
                <>
                  <hr />
                  <button className="opt danger" role="menuitem" onClick={() => void remove()}>
                    <span><Icon name="trash" size="sm" /> {t('comment.delete')}</span>
                  </button>
                </>
              )}
            </div>,
            document.body,
          )}
        </div>
      )}
    </article>
  );
}

/**
 * The comments on a task, and the field to add one.
 *
 * Todoist's own arrangement: the avatar, the name and when (to the minute),
 * the words, then whatever was attached. The field is one rounded box with the
 * paperclip inside it; once there is something to send, a round grey cross
 * takes it back and a round accent arrow sends it.
 */
export function CommentThread({ itemId }: { itemId: string }) {
  const { t } = useT();
  const notes = useStore((s) => s.snapshot.notes);
  const me = useStore((s) => s.snapshot.user);
  const demo = useStore((s) => s.demo);
  const addComment = useStore((s) => s.addComment);
  const toast = useStore((s) => s.toast);

  /* Oldest first is the thread as written. A long thread can be turned over
     for the moment, from its header; opening a task starts it as written
     again, so nothing is remembered (#344). */
  const [newestFirst, setNewestFirst] = useState(false);
  const comments = useMemo(
    () => Object.values(notes)
      .filter((n) => n.item_id === itemId && !n.is_deleted)
      .sort((a, b) => a.posted_at.localeCompare(b.posted_at)),
    [notes, itemId],
  );
  const shown = newestFirst ? [...comments].reverse() : comments;

  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState<NoteAttachment[]>([]);

  /* A shared project: "@" suggests its people, and "Notify" says who hears
     about the comment (#254). A project nobody else is in shows neither. */
  const item = useStore((s) => s.snapshot.items[itemId]);
  const snapshot = useDataSnapshot();
  const people = useMemo(
    () => item ? assignees(snapshot, item.project_id).filter((p) => p.id !== me?.id) : [],
    [snapshot, item, me?.id],
  );
  /* Todoist's own default, as far as it shows: the people already in the
     task — whoever it is assigned to and whoever commented — or everyone when
     nobody is yet. */
  const participants = useMemo(() => {
    const ids = new Set<string>();
    if (item?.responsible_uid) ids.add(item.responsible_uid);
    for (const note of comments) ids.add(note.posted_uid);
    return people.filter((p) => ids.has(p.id)).map((p) => p.id);
  }, [item?.responsible_uid, comments, people]);
  /* `null` is everyone, as in the other people pickers; a list is just them. */
  const [notifyChoice, setNotifyChoice] = useState<string[] | null | undefined>(undefined);
  const notifyValue = notifyChoice !== undefined ? notifyChoice : participants.length > 0 ? participants : null;
  const [picked, setPicked] = useState<Array<{ id: string; name: string }>>([]);
  const [mention, setMention] = useState<{ start: number; query: string } | null>(null);
  const [mentionActive, setMentionActive] = useState(0);
  const suggestions = useMemo(() => {
    if (!mention) return [];
    const q = mention.query.toLowerCase();
    /* You can mention yourself, as in Todoist; you are never notified. */
    const everyone = me && people.length > 0 ? [{ id: me.id, name: me.full_name }, ...people] : people;
    return everyone.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 6);
  }, [mention, people, me]);
  const pick = (person: { id: string; name: string }) => {
    if (!mention) return;
    const end = mention.start + 1 + mention.query.length;
    const next = `${draft.slice(0, mention.start)}@${person.name} ${draft.slice(end)}`;
    setDraft(next);
    setPicked((all) => all.some((p) => p.id === person.id) ? all : [...all, person]);
    setMention(null);
    pendingCaret.current = mention.start + person.name.length + 2;
  };
  /* The caret goes after the inserted name before the next key lands, not a
     frame later, or fast typing ends up on the wrong side of it. */
  const pendingCaret = useRef<number | null>(null);
  const mirror = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (pendingCaret.current === null) return;
    field.current?.setSelectionRange(pendingCaret.current, pendingCaret.current);
    pendingCaret.current = null;
  }, [draft]);
  const notifyIds = (text: string): string[] => {
    const chosen = notifyValue === null ? people.map((p) => p.id) : notifyValue;
    /* Mentioning someone always tells them, whatever Notify says. */
    return [...new Set([...chosen, ...mentionedUids(text)])].filter((id) => id !== me?.id);
  };
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  /* A different task is a different conversation. */
  useEffect(() => { setNewestFirst(false); setDraft(''); setAttachments([]); setPicked([]); setNotifyChoice(undefined); setMention(null); }, [itemId]);

  const ready = Boolean(draft.trim() || attachments.length > 0);

  /* Todoist posts one comment per file: the words go with the first, and a
     refused one comes back into the field with those after it, not lost (#28, #340). */
  const send = () => {
    if (!ready || uploading) return;
    const text = draft;
    const files = attachments;
    const stored = encodeMentions(text, picked);
    const notify = people.length > 0 ? notifyIds(stored) : [];
    setDraft('');
    setAttachments([]);
    setMention(null);
    void (async () => {
      const batch: Array<NoteAttachment | null> = files.length > 0 ? files : [null];
      for (let at = 0; at < batch.length; at += 1) {
        const saved = await addComment(itemId, at === 0 ? stored : '', batch[at], at === 0 ? notify : []);
        if (saved) continue;
        if (at === 0) setDraft((now) => now || text);
        setAttachments((now) => [...batch.slice(at).filter((file): file is NoteAttachment => file !== null), ...now]);
        return;
      }
    })();
  };

  const cancel = () => {
    setDraft('');
    setAttachments([]);
    field.current?.blur();
  };

  /* Every file goes up at once; one that fails is named and the others stay. */
  async function attach(files: File[]) {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const results = await Promise.allSettled(files.map((file) => uploadAttachment(file, demo)));
      const kept: NoteAttachment[] = [];
      results.forEach((result, at) => {
        if (result.status === 'fulfilled') kept.push(result.value);
        else toast(`${t('comment.uploadFailed')} (${files[at].name})`);
      });
      if (kept.length > 0) setAttachments((now) => [...now, ...kept]);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  /* A file on the clipboard — a screenshot, a GIF — goes into the comment
     wherever the paste happens while the task is open, not only in the field.
     The new-task sheet has its own paste and keeps it. */
  const attachRef = useRef(attach);
  attachRef.current = attach;
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []);
      if (files.length === 0 || (event.target as Element | null)?.closest?.('.composerbox')) return;
      event.preventDefault();
      void attachRef.current(files);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, []);

  return (
    <section className="detail-section comments">
      <h3 className="sectionlabel">
        {t('detail.comments')}
        {comments.length > 0 && <span className="count">{comments.length}</span>}
        {comments.length >= LONG_THREAD && (
          <button
            type="button"
            className="comment-order"
            aria-pressed={newestFirst}
            title={t(newestFirst ? 'comment.orderOldest' : 'comment.orderNewest')}
            onClick={() => setNewestFirst((now) => !now)}
          >
            <Icon name="sort" size="sm" />
            <span>{t('comment.newestFirst')}</span>
          </button>
        )}
      </h3>

      {shown.map((note) => <CommentRow key={note.id} note={note} itemId={itemId} />)}

      <div className="comment comment-new">
        <Avatar picture={avatarUrl(me)} name={me?.full_name} />
        <div className={`comment-box${ready ? ' ready' : ''}`}>
          {people.length > 0 && (
            <div className="comment-notify">
              <MultiSelect
                label={t('comment.notify')}
                allLabel={t('comment.notifyEveryone')}
                popupClassName="notify-options"
                value={notifyValue}
                onChange={setNotifyChoice}
                options={people.map((p) => ({ value: p.id, label: p.name, visual: <Avatar picture={avatarUrl(snapshot.collaborators[p.id] ?? null)} name={p.name} /> }))}
                face={<><Icon name="bell" size="sm" /><span>{t('comment.notify')} {notifyValue === null ? t('comment.notifyEveryone') : notifyValue.length === 0 ? t('comment.notifyNobody') : people.filter((p) => notifyValue.includes(p.id)).map((p) => p.name).join(', ')}</span><Icon name="caret" size="sm" /></>}
              />
            </div>
          )}
          {attachments.length > 0 && (
            <div className="comment-attachments">
              {attachments.map((file, at) => {
                const remove = (
                  <button className="iconbtn sm" aria-label={`${t('comment.removeFile')} (${file.file_name})`} onClick={() => setAttachments((now) => now.filter((_, index) => index !== at))}>
                    <Icon name="close" size="sm" />
                  </button>
                );
                return (
                  <span className="comment-attached" key={`${file.file_url}-${at}`} title={file.file_name}>
                    <Icon name="paperclip" size="sm" />
                    <span>{file.file_name}</span>
                    {remove}
                  </span>
                );
              })}
            </div>
          )}
          <div className="comment-row">
            {/* Enter posts it, Shift+Enter is a new line. A picked mention is
                marked behind the text, so it reads as taken into account: the
                field itself cannot style part of its text. */}
            <span className="comment-input">
            {picked.length > 0 && (
              <span className="comment-mirror comment-field" aria-hidden="true" ref={mirror}>
                {mirrorParts(draft, picked).map((part, index) => part.mention
                  ? <mark key={index}>{part.text}</mark>
                  : <span key={index}>{part.text}</span>)}
                {'\u200b'}
              </span>
            )}
            <textarea
              ref={field}
              onScroll={(event) => { if (mirror.current) mirror.current.scrollTop = event.currentTarget.scrollTop; }}
              className="comment-field"
              rows={1}
              value={draft}
              placeholder={t('detail.commentPlaceholder')}
              aria-label={t('detail.commentPlaceholder')}
              onChange={(event) => {
                setDraft(event.target.value);
                const next = people.length > 0 ? mentionQuery(event.target.value, event.target.selectionStart ?? event.target.value.length) : null;
                setMention(next);
                setMentionActive(0);
              }}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.nativeEvent.isComposing) return;
                if (mention && suggestions.length > 0) {
                  if (event.key === 'ArrowDown') { event.preventDefault(); setMentionActive((i) => (i + 1) % suggestions.length); return; }
                  if (event.key === 'ArrowUp') { event.preventDefault(); setMentionActive((i) => (i - 1 + suggestions.length) % suggestions.length); return; }
                  if (event.key === 'Enter' || event.key === 'Tab') { event.preventDefault(); pick(suggestions[mentionActive]); return; }
                }
                if (event.key === 'Escape' && mention) { event.preventDefault(); setMention(null); return; }
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !event.nativeEvent.isComposing) { event.preventDefault(); send(); }
                if (event.key === 'Escape') { event.preventDefault(); event.currentTarget.blur(); }
              }}
              onBlur={() => setTimeout(() => setMention(null), 150)}
            />
            </span>
            <span className="comment-tools">
              <input
                ref={fileInput} type="file" multiple hidden
                onChange={(event) => void attach(Array.from(event.target.files ?? []))}
              />
              <button
                className="iconbtn sm"
                aria-label={t('comment.attach')}
                title={t('comment.attach')}
                disabled={uploading}
                onClick={() => fileInput.current?.click()}
              >
                <Icon name="paperclip" size="sm" />
              </button>
              {ready && (
                <>
                  <button className="roundbtn cancel" aria-label={t('common.cancel')} title={t('common.cancel')} onClick={cancel}>
                    <Icon name="close" size="sm" />
                  </button>
                  <button className="roundbtn send" aria-label={t('comment.send')} title={t('comment.send')} disabled={uploading} onClick={send}>
                    <Icon name="arrow-up" size="sm" />
                  </button>
                </>
              )}
            </span>
          </div>
          {mention && suggestions.length > 0 && (
            <div className="popover mention-list" role="listbox" aria-label={t('comment.mention')}>
              {suggestions.map((person, index) => (
                <button
                  key={person.id}
                  type="button"
                  role="option"
                  aria-selected={index === mentionActive}
                  className={`opt${index === mentionActive ? ' active' : ''}`}
                  onMouseDown={(event) => { event.preventDefault(); pick(person); }}
                >
                  <Avatar picture={person.id === me?.id ? avatarUrl(me) : avatarUrl(snapshot.collaborators[person.id] ?? null)} name={person.name} />
                  <span>{person.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
