import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Icon } from './Icon';
import { DraggableTask } from './dnd/DraggableTask';
import { Droppable } from './dnd/Droppable';
import type { DropTarget, RowOrder } from '@/domain/dnd';
import { GROUP_ATTR, RowListContext, groupAnswers } from './dnd/RowList';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import { TaskRow } from './TaskRow';
import { SectionMenu } from './SectionMenu';
import { formatDuration, effectiveEstimate } from '@/domain/estimates';
import type { Item } from '@/domain/types';

interface TaskGroupProps {
  title?: string;
  items: Item[];
  childrenOf: (id: string) => Item[];
  onOpen: (id: string) => void;
  /** Extra visual weight for Behind schedule and Quick. */
  tint?: 'late' | 'quick';
  actions?: ReactNode;
  showProject?: boolean;
  /** Names each task's section in its row, for a group gathered from several. */
  showSection?: boolean;
  defaultCollapsed?: boolean;
  /** Adds a task straight into this section. */
  onAddTask?: () => void;
  /**
   * Which of Todoist's orders this list is kept in, when a task can be dropped
   * into a place in it. Left out, the rows take no drop of their own.
   */
  reorderable?: RowOrder;
  /** The page this group is on, so a drop can make its order the view's own. */
  viewKey?: string;
  /** Stays on the page with nothing in it, so the line that fills it is there. */
  keepWhenEmpty?: boolean;
  /** An accent for the sections that carry meaning: late, quick, and gathering dust. */
  accent?: 'late' | 'quick' | 'dust';
  /** Said quietly after the title, as "over 3 months" is after Gathering dust. */
  subtitle?: string;
  /** The tasks here have been gathering dust: each row says its age and offers three actions. */
  dust?: boolean;
  /** When set, the whole group accepts tasks dropped onto it. */
  dropTarget?: DropTarget;
  /** A real section can be renamed, moved and deleted; a derived grouping cannot. */
  sectionId?: string;
  /** The project a real section belongs to, for its menu (Move needs to leave it out). */
  projectId?: string;
  onRename?: (name: string) => void;
  onDelete?: () => void;
  /** Decision views can reuse rows while explicitly forbidding drag semantics. */
  draggable?: boolean;
  /** A group that is always open: no caret, and the title is not a button. */
  collapsible?: boolean;
  /** Each task on a card of its own, as in a board column. */
  cards?: boolean;
}

export function TaskGroup({
  title, items, childrenOf, onOpen, tint, actions,
  showProject = true, showSection = false, defaultCollapsed = false, dropTarget, onAddTask, accent,
  sectionId, projectId, onRename, onDelete, reorderable, viewKey, keepWhenEmpty = false, draggable = true,
  subtitle, dust = false, collapsible = true, cards = false,
}: TaskGroupProps) {
  const { t, locale } = useT();
  const dragging = useStore((s) => s.draggingTaskId !== null);
  const [collapsed, setCollapsedNow] = useState(() => (sectionId ? readCollapsed(sectionId) : null) ?? defaultCollapsed);
  /* A real section remembers being folded across reloads, on this device. */
  const setCollapsed = (next: (current: boolean) => boolean) => {
    setCollapsedNow((current) => {
      const value = next(current);
      if (sectionId) writeCollapsed(sectionId, value);
      return value;
    });
  };
  const [menuOpen, setMenuOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);

  // An empty derived grouping is noise. A real section is not: it is somewhere
  // you chose to make, and a section you just created has to be visible before
  // it can be named or filled. Nor is the project's own block above its first
  // section: empty, it is still the only way to add a task outside them.
  if (items.length === 0 && !sectionId && !keepWhenEmpty && !(dropTarget && dragging)) return null;

  const totalMinutes = items.reduce(
    (acc, item) => acc + (effectiveEstimate(item, childrenOf).minutes ?? 0),
    0,
  );

  // The meaning stays in the heading's colour rather than a panel behind it.
  const mark = accent ?? tint;
  const className = `group${mark ? ` accent-${mark}` : ''}`;

  const body = (isOver: boolean) => (
    <section
      ref={(node) => { if (node) groupAnswers.set(node, { list, target: dropTarget }); }}
      {...{ [GROUP_ATTR]: '' }}
      className={`${className}${sectionId ? ' has-section-slots' : ''}${isOver ? ' dropping' : ''}`}
      /* The tour points at these by name rather than by class, so renaming a
         class cannot silently leave it highlighting the wrong thing. */
      data-tour={mark === 'quick' ? 'quick' : undefined}
    >
      {sectionId && <SectionDropSlots id={sectionId} />}
      {/* A section just created has no name yet, and it is the heading that
          carries the field you name it in. */}
      {(title || sectionId) && (
        <div className="gheadblock">
        <div className="ghead">
          {/* A section is dragged by its own handle, so a click on the heading
              still collapses it. */}
          {sectionId && <SectionHandle id={sectionId} label={t('section.move')} />}
          {/* The caret sits in the gutter, left of the title, so the titles
              stay lined up with the tasks under them (#185) — on every group,
              a derived one as much as a real section. */}
          {collapsible && (
            <button
              className="gcaret"
              aria-expanded={!collapsed}
              aria-label={collapsed ? t('section.expand') : t('section.collapse')}
              title={collapsed ? t('section.expand') : t('section.collapse')}
              onClick={() => setCollapsed((v) => !v)}
            >
              <Icon name="caret" size="sm" />
            </button>
          )}
          <button
            className="gtoggle"
            aria-expanded={collapsible ? !collapsed : undefined}
            onClick={collapsible ? () => setCollapsed((v) => !v) : undefined}
            style={collapsible ? undefined : { cursor: 'default' }}
          >
            {onRename && sectionId ? (
              <SectionName
                id={sectionId}
                value={title ?? ''}
                placeholder={t('section.untitled')}
                label={t('section.name')}
                onRename={onRename}
              />
            ) : (
              <span className="gname">{title}</span>
            )}
            {subtitle && <span className="gsub">{subtitle}</span>}
            {/* The round count follows the title, then the time (#185). */}
            <span className="gstats">
              <span className="gcount">{t('metrics.tasks', { count: items.length })}</span>
              {totalMinutes > 0 && <span className="gtime">{formatDuration(totalMinutes, locale)}</span>}
            </span>
          </button>
          {actions && <span className="gactions">{actions}</span>}
          {sectionId ? (
            onDelete && projectId && (
              <>
                <button
                  ref={moreRef}
                  className="gmore"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label={t('section.actions')}
                  title={t('section.actions')}
                  onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
                >
                  <Icon name="more" size="sm" />
                </button>
                {menuOpen && (
                  <SectionMenu
                    sectionId={sectionId}
                    name={title ?? ''}
                    projectId={projectId}
                    anchor={moreRef.current}
                    onClose={() => setMenuOpen(false)}
                    onDelete={onDelete}
                    onEdit={() => {
                      const field = document.querySelector<HTMLInputElement>(`[data-section-name="${CSS.escape(sectionId)}"]`);
                      field?.focus();
                      field?.select();
                    }}
                  />
                )}
              </>
            )
          ) : null}
        </div>

        </div>
      )}

      {!collapsed &&
        items.map((item) => draggable ? (
          <DraggableTask
            key={item.id}
            item={item}
            childrenOf={childrenOf}
            onOpen={onOpen}
            showProject={showProject}
            showSection={showSection}
            dust={dust}
          />
        ) : cards ? (
          <div className="taskwrap" key={item.id}>
            <TaskRow
              item={item}
              childrenOf={childrenOf}
              onOpen={onOpen}
              showProject={showProject}
              showSection={showSection}
              dust={dust}
              nestable={false}
            />
          </div>
        ) : (
          <TaskRow
            key={item.id}
            item={item}
            childrenOf={childrenOf}
            onOpen={onOpen}
            showProject={showProject}
            showSection={showSection}
            dust={dust}
          />
        ))}

      {/* Over the section itself rather than over one of its rows (an empty
          section, the gap below the last task): the line the rows draw, at the
          end of the list, instead of a border round the whole section (#184). */}
      {isOver && <div className="dropbar" aria-hidden="true" />}

      {/* A block with no heading has nothing to say it is empty about: the
          add line under it is the whole point of it being there. */}
      {/* With a line to add a task, that line is where the first task would
          be: saying "Nothing here" above it is saying it twice. */}
      {!collapsed && items.length === 0 && (title || sectionId) && !onAddTask && (
        <p className="empty">{t('group.empty')}</p>
      )}

      {!collapsed && onAddTask && (
        <button className="addline sectionadd" onClick={onAddTask}>
          <Icon name="plus" size="sm" />
          {t('nav.addTaskHere')}
        </button>
      )}
    </section>
  );

  /* Everything a row needs to answer a drop: how this list is numbered, what
     is in it, and what the list itself means for a task arriving from
     somewhere else. */
  const list = reorderable
    ? { order: reorderable, ids: items.map((item) => item.id), target: dropTarget, viewKey, closed: mark === 'quick' }
    : null;
  const wrapped = (isOver: boolean) => (
    <RowListContext.Provider value={list}>{body(isOver)}</RowListContext.Provider>
  );

  if (!dropTarget) return wrapped(false);
  /* Several sections can offer the same destination — Behind schedule, Quick
     and Today all mean "today" — and droppables sharing an id all report
     themselves as hovered at once. The title separates them. */
  return (
    <Droppable target={dropTarget} scope={`group:${sectionId ?? title ?? ''}`}>
      {/* A section being reordered passes over the groups too, and only the
          seams between them are its destinations. */}
      {({ isOver }) => wrapped(isOver && dragging)}
    </Droppable>
  );
}

const collapsedKey = (sectionId: string) => `enhanced.section-collapsed.${sectionId}`;
function readCollapsed(sectionId: string): boolean | null {
  try {
    const value = localStorage.getItem(collapsedKey(sectionId));
    return value === null ? null : value === '1';
  } catch { return null; }
}
function writeCollapsed(sectionId: string, collapsed: boolean) {
  try {
    if (collapsed) localStorage.setItem(collapsedKey(sectionId), '1');
    else localStorage.removeItem(collapsedKey(sectionId));
  } catch { /* storage refused: the fold lasts for the session */ }
}

/** The upper and lower halves of a real section are explicit reorder targets. */
function SectionDropSlots({ id }: { id: string }) {
  const dragging = useStore((s) => s.draggingSectionId);
  const disabled = !dragging || dragging === id;
  const before = useDroppable({ id: `section-slot:${id}:before`, disabled });
  const after = useDroppable({ id: `section-slot:${id}:after`, disabled });

  return (
    <>
      <span
        ref={before.setNodeRef}
        className={`section-position before${before.isOver ? ' over' : ''}`}
        aria-hidden="true"
      />
      <span
        ref={after.setNodeRef}
        className={`section-position after${after.isOver ? ' over' : ''}`}
        aria-hidden="true"
      />
    </>
  );
}

/**
 * A section's name, typed where it is read.
 *
 * The field is sized from its own text rather than filling the row: a field
 * that stretches pushes the duration and the count halfway across the page for
 * no reason.
 */
export function SectionName({
  id, value, placeholder, label, onRename, wrap = false,
}: {
  id: string;
  value: string;
  placeholder: string;
  label: string;
  onRename: (name: string) => void;
  /** A board column: the name is read on up to two lines, and is a field only while edited (#21). */
  wrap?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);
  useEffect(() => { setDraft(value); }, [value]);

  if (wrap && !editing) {
    return (
      <span
        className="gname gnamewrap"
        data-section-name={id}
        role="button"
        tabIndex={0}
        aria-label={label}
        title={value || placeholder}
        onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        onFocus={() => setEditing(true)}
      >
        {value || placeholder}
      </span>
    );
  }

  /* Full width of the column, height from the text: sizing the width to the
     text as well made a long word break at a narrower width than the column. */
  const fit = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };
  const common = {
    autoFocus: wrap,
    className: 'gname gnamefield',
    'data-section-name': id,
    value: draft,
    placeholder,
    'aria-label': label,
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
    /* An emptied name is put back rather than sent: Todoist refuses a
       section with no name. */
    onBlur: () => {
      setEditing(false);
      if (!draft.trim()) setDraft(value);
      else if (draft.trim() !== value) onRename(draft.trim());
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
      if (e.key === 'Escape') { setDraft(value); e.currentTarget.blur(); }
    },
  };

  /* A column's name is typed in a box that grows with its text and wraps, so
     the whole name stays in view while it is written (#21). */
  if (wrap) {
    return (
      <textarea
        {...common}
        ref={fit}
        rows={1}
        className="gname gnamefield gnamearea"
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setDraft(e.target.value.replace(/\n/g, ' '))}
      />
    );
  }

  return (
    <input
      {...common}
      size={Math.max(placeholder.length, draft.length + 1)}
      onChange={(e) => setDraft(e.target.value)}
    />
  );
}

/** The grip a section is dragged by. */
function SectionHandle({ id, label }: { id: string; label: string }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: `section:${id}` });
  return (
    <span
      ref={setNodeRef}
      className="sectiondrag"
      title={label}
      aria-label={label}
      {...attributes}
      {...listeners}
    >
      <Icon name="drag" size="sm" />
    </span>
  );
}
