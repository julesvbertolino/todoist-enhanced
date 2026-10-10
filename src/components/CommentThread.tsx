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

/* The full palette and its data load the first time somebody reacts (#27). */
const EmojiPalette = lazy(() => import('./EmojiPalette').then((module) => ({ default: module.EmojiPalette })));

const IMAGE = /^image\//;

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
  const [broken, setBroken] = useState(false);
  if (!file.file_url) return null;
  const image = IMAGE.test(file.file_type ?? '') || file.resource_type === 'image';
  const name = file.file_name ?? file.file_url.split('/').pop() ?? file.file_url;
  if (image && !broken) {
    return (
      <a className="comment-image" href={file.file_url} target="_blank" rel="noopener noreferrer" title={name}>
        <img src={file.image ?? file.file_url} alt={name} loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
      </a>
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

function Avatar({ picture, name }: { picture: string | null; name: string | undefined }) {
  return (
    <span className="comment-avatar" aria-hidden="true">
      {picture
        ? <img src={picture} alt="" referrerPolicy="no-referrer" />
        : (name ?? '?').slice(0, 1).toUpperCase()}
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
                if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); save(); }
                if (event.key === 'Escape') { event.preventDefault(); setEditing(false); }
              }}
            />
            <span className="comment-edit-actions">
              <button className="btn sm" onClick={() => setEditing(false)}>{t('common.cancel')}</button>
              <button className="btn sm primary" onClick={save}>{t('common.save')}</button>
            </span>
          </div>
        ) : (
          note.content && <div className="md" dangerouslySetInnerHTML={{ __html: renderMarkdown(note.content) }} />
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

  const comments = useMemo(
    () => Object.values(notes)
      .filter((n) => n.item_id === itemId && !n.is_deleted)
      .sort((a, b) => a.posted_at.localeCompare(b.posted_at)),
    [notes, itemId],
  );

  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState<NoteAttachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  /* A different task is a different conversation. */
  useEffect(() => { setDraft(''); setAttachment(null); }, [itemId]);

  const ready = Boolean(draft.trim() || attachment);

  const send = () => {
    if (!ready || uploading) return;
    const text = draft;
    const file = attachment;
    setDraft('');
    setAttachment(null);
    /* Refused, the comment comes back into the field rather than being lost (#28). */
    void addComment(itemId, text, file).then((saved) => {
      if (saved) return;
      setDraft((now) => now || text);
      setAttachment((now) => now ?? file);
    });
  };

  const cancel = () => {
    setDraft('');
    setAttachment(null);
    field.current?.blur();
  };

  async function attach(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      setAttachment(await uploadAttachment(file, demo));
    } catch {
      toast(t('comment.uploadFailed'));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  return (
    <section className="detail-section comments">
      <h3 className="sectionlabel">
        {t('detail.comments')}
        {comments.length > 0 && <span className="count">{comments.length}</span>}
      </h3>

      {comments.map((note) => <CommentRow key={note.id} note={note} itemId={itemId} />)}

      <div className="comment comment-new">
        <Avatar picture={avatarUrl(me)} name={me?.full_name} />
        <div className={`comment-box${ready ? ' ready' : ''}`}>
          {attachment && (
            <span className="comment-attached" title={attachment.file_name}>
              <Icon name={IMAGE.test(attachment.file_type ?? '') ? 'image' : 'paperclip'} size="sm" />
              <span>{attachment.file_name}</span>
              <button className="iconbtn sm" aria-label={t('comment.removeFile')} onClick={() => setAttachment(null)}>
                <Icon name="close" size="sm" />
              </button>
            </span>
          )}
          <div className="comment-row">
            {/* Enter posts it, Shift+Enter is a new line. */}
            <textarea
              ref={field}
              className="comment-field"
              rows={1}
              value={draft}
              placeholder={t('detail.commentPlaceholder')}
              aria-label={t('detail.commentPlaceholder')}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); }
                if (event.key === 'Escape' && ready) { event.preventDefault(); cancel(); }
              }}
            />
            <span className="comment-tools">
              <input
                ref={fileInput} type="file" hidden
                onChange={(event) => void attach(event.target.files?.[0])}
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
        </div>
      </div>
    </section>
  );
}
