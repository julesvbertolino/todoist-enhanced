import { useEffect, useState } from 'react';
import { EditableTitle } from './EditableTitle';
import { EditableDescription } from './EditableDescription';
import { FilterMark } from './FilterMark';
import { PageMenu } from './PageMenu';
import { ProjectIconGrid } from './ProjectIcon';
import { useConfirm } from './overlays/Confirm';
import { useT } from '@/hooks/useT';
import { navigate } from '@/hooks/useRoute';
import { useStore } from '@/store/store';
import { copyText, todoistFilterUrl } from '@/api/links';
import { markerStyle } from '@/domain/colors';
import { readProjectIcon, stripProjectIcon, withProjectIcon } from '@/domain/projectIcons';
import type { Filter } from '@/domain/types';

/**
 * A filter page's title, drawn as a project's is: its mark, which opens the
 * icon choice, and its name, which renames in place.
 */
export function FilterTitle({ filter }: { filter: Filter }) {
  const { t } = useT();
  const updateFilter = useStore((s) => s.updateFilter);
  const [iconOpen, setIconOpen] = useState(false);
  const frozen = Boolean(filter.is_frozen);

  useEffect(() => {
    if (!iconOpen) return;
    const away = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('.ptitle-icon')) setIconOpen(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setIconOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', escape); };
  }, [iconOpen]);

  return (
    <span className="ptitle-row">
      <span className="ptitle-icon">
        <button
          type="button"
          className={`ptitle-mark${frozen ? ' static' : ''}`}
          aria-label={t('project.changeIcon')}
          title={t('project.changeIcon')}
          aria-expanded={iconOpen}
          disabled={frozen}
          onClick={() => setIconOpen((open) => !open)}
        >
          <span className="hash" style={markerStyle(filter.color)}>
            <FilterMark filter={filter} style={{ color: 'inherit' }} />
          </span>
        </button>
        {iconOpen && (
          <div className="popover ptitle-icons" role="dialog" aria-label={t('project.icon')}>
            <ProjectIconGrid
              focusSearch
              value={readProjectIcon(filter.description)}
              onPick={(iconId) => {
                void updateFilter(filter.id, {
                  description: withProjectIcon(stripProjectIcon(filter.description), iconId),
                });
                setIconOpen(false);
              }}
            />
          </div>
        )}
      </span>
      {frozen ? (
        <h1 className="titlefield static">{filter.name}</h1>
      ) : (
        <EditableTitle
          value={filter.name}
          label={t('filters.rename')}
          onCommit={(next) => void updateFilter(filter.id, { name: next })}
        />
      )}
    </span>
  );
}

/** The filter's description under its title, edited in place; the icon marker is kept. */
export function FilterDescription({ filter }: { filter: Filter }) {
  const { t } = useT();
  const updateFilter = useStore((s) => s.updateFilter);
  if (filter.is_frozen) {
    const text = stripProjectIcon(filter.description);
    return text ? <span>{text}</span> : null;
  }
  return (
    <EditableDescription
      value={stripProjectIcon(filter.description)}
      placeholder={t('filters.editDescription')}
      onCommit={(next) => void updateFilter(filter.id, {
        description: withProjectIcon(next, readProjectIcon(filter.description)),
      })}
    />
  );
}

/** What can be done to a filter from its page: the same list as on the Filters page. */
export function FilterMenu({ filter, onEdit }: { filter: Filter; onEdit: () => void }) {
  const { t } = useT();
  const confirm = useConfirm();
  const toast = useStore((s) => s.toast);
  const setFavourite = useStore((s) => s.setFilterFavourite);
  const deleteFilter = useStore((s) => s.deleteFilter);
  return (
    <PageMenu
      label={t('filters.actions')}
      items={[
        { key: 'edit', label: t('filters.edit'), icon: 'edit', onPick: onEdit },
        ...(filter.is_frozen ? [] : [{
          key: 'fav', icon: 'star' as const,
          label: filter.is_favorite ? t('labels.unfavourite') : t('labels.favourite'),
          onPick: () => void setFavourite(filter.id, !filter.is_favorite),
        }]),
        {
          key: 'link', label: t('filters.copyLink'), icon: 'link',
          onPick: () => void copyText(todoistFilterUrl(filter.id))
            .then((ok) => toast(t(ok ? 'task.linkCopied' : 'task.linkNotCopied'))),
        },
        {
          key: 'delete', label: t('filters.delete'), icon: 'trash', danger: true,
          onPick: () => void confirm({
            title: t('filters.deleteTitle', { name: filter.name }),
            body: t('filters.deleteBody'),
            confirmLabel: t('filters.delete'),
            destructive: true,
          }).then((yes) => {
            if (!yes) return;
            navigate('filters');
            void deleteFilter(filter.id);
          }),
        },
      ]}
    />
  );
}
