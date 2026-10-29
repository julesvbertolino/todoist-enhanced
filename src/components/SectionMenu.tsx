import { useDataSnapshot } from '@/hooks/useDataSnapshot';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import { useConfirm } from './overlays/Confirm';
import { usePhoneBehaviour } from '@/hooks/useTouchLayout';
import { copyText, isTemporaryId, todoistSectionUrl } from '@/api/links';
import { projectTree, type ProjectNode } from '@/store/selectors';

export interface SectionMenuProps {
  sectionId: string;
  name: string;
  projectId: string;
  /** Asks the page to confirm and delete, as the trash button used to. */
  onDelete: () => void;
  /** Puts the cursor in the section's name. */
  onEdit: () => void;
  /** The three dots it hangs from. */
  anchor: HTMLElement | null;
  onClose: () => void;
}

const ITEMS = '[role="menuitem"]';

/**
 * What can be done to a real section, in one list (#185).
 *
 * Built like the project menu it sits beside: drawn into the document so a
 * scrolling page does not cut it, placed against its button, a sheet on a
 * phone. Delete stays apart, last and red; Move swaps the list for a choice
 * of project inside the same menu rather than opening a second one.
 */
export function SectionMenu({ sectionId, name, projectId, onDelete, onEdit, anchor, onClose }: SectionMenuProps) {
  const { t } = useT();
  const confirm = useConfirm();
  const snapshot = useDataSnapshot();
  const demo = useStore((s) => s.demo);
  const toast = useStore((s) => s.toast);
  const archiveSection = useStore((s) => s.archiveSection);
  const moveSectionToProject = useStore((s) => s.moveSectionToProject);
  const duplicateSection = useStore((s) => s.duplicateSection);
  const phone = usePhoneBehaviour();
  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<'actions' | 'move'>('actions');
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  /* Closing hands the keyboard back to the button, unless the choice sends it
     somewhere of its own (the name field, a dialog). */
  const close = (restoreFocus = true) => {
    onClose();
    if (restoreFocus) anchor?.focus();
  };

  useLayoutEffect(() => {
    if (phone || !anchor) return;
    const menu = ref.current;
    const button = anchor.getBoundingClientRect();
    const height = menu?.offsetHeight ?? 280;
    const width = menu?.offsetWidth ?? 226;
    const margin = 8;
    const below = button.bottom + 4;
    const top = below + height > window.innerHeight - margin
      ? Math.max(margin, button.top - height - 4)
      : below;
    const left = Math.min(
      Math.max(margin, button.right - width),
      Math.max(margin, window.innerWidth - width - margin),
    );
    setPosition({ top, left });
  }, [anchor, phone, view]);

  useEffect(() => {
    const dismiss = (event: MouseEvent) => {
      if (ref.current?.contains(event.target as Node)) return;
      if (anchor?.contains(event.target as Node)) return;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        if (view === 'move') { setView('actions'); return; }
        onClose();
        anchor?.focus();
        return;
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      const stops = [...(ref.current?.querySelectorAll<HTMLElement>(ITEMS) ?? [])];
      if (stops.length === 0) return;
      event.preventDefault();
      const at = stops.indexOf(document.activeElement as HTMLElement);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      stops[(at + step + stops.length) % stops.length].focus({ preventScroll: true });
    };
    /* A scroll that was already under way when the menu opened (the page
       bringing the button into view) reports itself a frame later; it is not
       the page moving away from the menu. */
    const openedAt = Date.now();
    const away = () => { if (Date.now() - openedAt > 300) onClose(); };
    document.addEventListener('mousedown', dismiss);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', away);
    window.addEventListener('scroll', away, true);
    return () => {
      document.removeEventListener('mousedown', dismiss);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', away);
      window.removeEventListener('scroll', away, true);
    };
  }, [onClose, anchor, view]);

  /* The keyboard goes into the menu when it opens, and to the first choice of
     whichever list is showing. */
  const placed = phone || position !== null;
  useEffect(() => {
    if (placed) ref.current?.querySelector<HTMLElement>(ITEMS)?.focus({ preventScroll: true });
  }, [view, placed]);

  const others = useMemo(() => {
    const rows: { project: ProjectNode['project']; depth: number }[] = [];
    const visit = (node: ProjectNode, depth: number) => {
      if (node.project.id !== projectId && !node.project.is_folder) rows.push({ project: node.project, depth });
      node.children.forEach((child) => visit(child, depth + 1));
    };
    for (const group of projectTree(snapshot)) group.roots.forEach((root) => visit(root, 0));
    return rows;
  }, [snapshot, projectId]);

  async function archive() {
    close(false);
    const ok = await confirm({
      title: t('section.archiveTitle'),
      body: t('section.archiveBody', { name: name || t('section.untitled') }),
      confirmLabel: t('section.archive'),
    });
    if (ok) await archiveSection(sectionId);
  }

  const copyLink = async () => {
    close();
    const ok = await copyText(todoistSectionUrl(sectionId));
    toast(ok ? t('section.linkCopied', { name }) : t('section.linkNotCopied'));
  };

  const menu = (
    <div
      className={`popover projectmenu sectionmenu${phone ? ' asSheet' : ''}`}
      role="menu"
      aria-label={t('section.actions')}
      ref={ref}
      style={phone ? undefined : {
        top: position?.top ?? -9999,
        left: position?.left ?? -9999,
        visibility: position ? undefined : 'hidden',
      }}
    >
      {view === 'actions' ? (
        <>
          <button className="opt" role="menuitem" onClick={() => { close(false); onEdit(); }}>
            <Icon name="edit" size="sm" /><span>{t('section.edit')}</span>
          </button>
          <button className="opt" role="menuitem" onClick={() => setView('move')}>
            <Icon name="arrow-right" size="sm" /><span>{t('section.moveTo')}</span>
          </button>
          <button
            className="opt"
            role="menuitem"
            title={t('section.duplicateHint')}
            onClick={() => {
              close();
              void duplicateSection(sectionId, t('section.copyOf', { name: name || t('section.untitled') }));
            }}
          >
            <Icon name="stack" size="sm" /><span>{t('section.duplicate')}</span>
          </button>
          {/* Not in the demo, whose sections do not exist at Todoist, nor for
              one that has not synced yet: there is no page to link to. */}
          {!demo && !isTemporaryId(sectionId) && (
            <button className="opt" role="menuitem" onClick={() => void copyLink()}>
              <Icon name="link" size="sm" /><span>{t('section.copyLink')}</span>
            </button>
          )}
          <button className="opt" role="menuitem" onClick={() => void archive()}>
            <Icon name="export" size="sm" /><span>{t('section.archive')}</span>
          </button>
          <hr />
          <button className="opt danger" role="menuitem" onClick={() => { close(false); onDelete(); }}>
            <Icon name="close" size="sm" /><span>{t('section.delete')}</span>
          </button>
        </>
      ) : (
        <>
          <button className="opt" role="menuitem" onClick={() => setView('actions')}>
            <Icon name="arrow-left" size="sm" /><span>{t('section.moveBack')}</span>
          </button>
          <hr />
          <p className="menuhint">{others.length > 0 ? t('section.moveHint') : t('section.moveNone')}</p>
          {others.map(({ project, depth }) => (
            <button
              key={project.id}
              className="opt"
              role="menuitem"
              style={{ paddingLeft: 12 + depth * 14 }}
              onClick={() => { close(); void moveSectionToProject(sectionId, project.id); }}
            >
              <span>{project.name}</span>
            </button>
          ))}
        </>
      )}
    </div>
  );

  return createPortal(menu, document.body);
}
