import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { Overlay } from './overlays/Overlay';
import { useConfirm } from './overlays/Confirm';
import { useT } from '@/hooks/useT';
import { usePhoneBehaviour } from '@/hooks/useTouchLayout';
import { useStore } from '@/store/store';

/**
 * What can be done to a team workspace's folder (#463): rename it, and delete
 * it once it is empty. A folder that still holds projects cannot be deleted
 * from here, because what Todoist would do to them is not worth finding out on
 * a team's account.
 */
export function FolderMenu({ folderId, anchor, onClose }: {
  folderId: string;
  anchor: HTMLElement | null;
  onClose: () => void;
}) {
  const { t } = useT();
  const confirm = useConfirm();
  const folder = useStore((s) => s.snapshot.folders?.[folderId]);
  const holdsProjects = useStore((s) => Object.values(s.snapshot.projects).some((p) => p.folder_id === folderId && !p.is_deleted));
  const renameFolder = useStore((s) => s.renameFolder);
  const deleteFolder = useStore((s) => s.deleteFolder);
  const phone = usePhoneBehaviour();
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState('');

  useLayoutEffect(() => {
    if (phone || !anchor || renaming) return;
    const button = anchor.getBoundingClientRect();
    const height = ref.current?.offsetHeight ?? 120;
    const width = ref.current?.offsetWidth ?? 226;
    const margin = 8;
    const below = button.bottom + 4;
    const top = below + height > window.innerHeight - margin ? Math.max(margin, button.top - height - 4) : below;
    setPosition({
      top,
      left: Math.min(Math.max(margin, button.left - 4), Math.max(margin, window.innerWidth - width - margin)),
    });
  }, [anchor, phone, renaming]);

  useEffect(() => {
    if (renaming) return;
    const dismiss = (event: MouseEvent) => {
      if (ref.current?.contains(event.target as Node) || anchor?.contains(event.target as Node)) return;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
    };
    document.addEventListener('mousedown', dismiss);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onClose);
    window.addEventListener('scroll', onClose, true);
    return () => {
      document.removeEventListener('mousedown', dismiss);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [onClose, anchor, renaming]);

  if (!folder) return null;

  async function save() {
    const next = name.trim();
    onClose();
    if (next && next !== folder?.name) await renameFolder(folderId, next);
  }

  async function remove() {
    onClose();
    const ok = await confirm({
      title: t('folder.deleteTitle'),
      body: t('folder.deleteBody', { name: folder?.name ?? '' }),
      confirmLabel: t('project.delete'),
      destructive: true,
    });
    if (ok) await deleteFolder(folderId);
  }

  if (renaming) {
    return (
      <Overlay open onClose={onClose} label={t('folder.rename')} size="sm">
        <div className="sheet-head">
          <h2>{t('folder.rename')}</h2>
          <button className="iconbtn" aria-label={t('common.close')} onClick={onClose}><Icon name="close" /></button>
        </div>
        <div className="sheet-body projectform">
          <input
            className="pcx-name"
            data-autofocus
            value={name}
            aria-label={t('folder.name')}
            autoComplete="off"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void save(); } }}
          />
        </div>
        <div className="sheet-foot">
          <button className="btn quiet" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn primary" disabled={!name.trim()} onClick={() => void save()}>{t('common.save')}</button>
        </div>
      </Overlay>
    );
  }

  return createPortal(
    <div
      className={`popover projectmenu${phone ? ' asSheet' : ''}`}
      role="menu"
      aria-label={t('folder.actions')}
      ref={ref}
      style={phone ? undefined : {
        top: position?.top ?? -9999, left: position?.left ?? -9999, visibility: position ? undefined : 'hidden',
      }}
    >
      <button className="opt" role="menuitem" onClick={() => { setName(folder.name); setRenaming(true); }}>
        <Icon name="edit" size="sm" /><span>{t('folder.rename')}</span>
      </button>
      {!holdsProjects && (
        <>
          <hr />
          <button className="opt danger" role="menuitem" onClick={() => void remove()}>
            <Icon name="close" size="sm" /><span>{t('project.delete')}</span>
          </button>
        </>
      )}
    </div>,
    document.body,
  );
}
