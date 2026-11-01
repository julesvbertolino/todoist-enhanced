import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Overlay } from './Overlay';
import { useConfirm } from './Confirm';
import { COLOUR_CHOICES } from './ProjectSheet';
import { Icon } from '../Icon';
import { ProjectIcon, ProjectIconGrid } from '../ProjectIcon';
import { readProjectIcon, stripProjectIcon, withProjectIcon } from '@/domain/projectIcons';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import { navigate } from '@/hooks/useRoute';
import { colorValue, markerStyle } from '@/domain/colors';
import type { FilterFields } from '@/store/types';
import type { TranslationKey } from '@/i18n';

/** What the sheet was opened to do: make a filter, or change one by id. */
export type FilterSheetTarget = { mode: 'create' } | { mode: 'edit'; filterId: string } | null;

/**
 * Making a saved filter, and changing or deleting one: a name, the query
 * Todoist will evaluate, a colour, the star.
 *
 * The query is sent as typed. Todoist is what reads it, so whatever it
 * accepts in its own app works here, and a query it refuses shows its own
 * message on the filter's page.
 */
export function FilterSheet({ target, onClose }: { target: FilterSheetTarget; onClose: () => void }) {
  const { t } = useT();
  const confirm = useConfirm();
  const createFilter = useStore((s) => s.createFilter);
  const updateFilter = useStore((s) => s.updateFilter);
  const deleteFilter = useStore((s) => s.deleteFilter);
  const filters = useStore((s) => s.snapshot.filters);
  const editing = target?.mode === 'edit' ? filters?.[target.filterId] : undefined;

  const [fields, setFields] = useState<FilterFields>({ name: '', query: '', color: 'charcoal', is_favorite: false, description: '' });
  const [saving, setSaving] = useState(false);
  /* The icon rides on the end of the description, as a project's does. */
  const [icon, setIcon] = useState<string | null>(null);
  const [iconOpen, setIconOpen] = useState(false);
  const set = (patch: Partial<FilterFields>) => setFields((current) => ({ ...current, ...patch }));
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  /* The description grows with what is typed, as a project's does, rather
     than running off the side of a one-line field. */
  useLayoutEffect(() => {
    const box = descriptionRef.current;
    if (!box) return;
    box.style.height = 'auto';
    box.style.height = `${box.scrollHeight}px`;
  }, [fields.description, target]);

  /* Each opening starts from the filter it was opened on, or from nothing. */
  useEffect(() => {
    if (!target) return;
    setSaving(false);
    setIconOpen(false);
    setIcon(readProjectIcon(editing?.description));
    setFields(editing
      ? {
          name: editing.name, query: editing.query, color: editing.color,
          is_favorite: editing.is_favorite, description: stripProjectIcon(editing.description),
        }
      : { name: '', query: '', color: 'charcoal', is_favorite: false, description: '' });
    // Read once, on opening: later edits are the user's draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const ready = fields.name.trim() !== '' && fields.query.trim() !== '' && !saving;
  const isEdit = target?.mode === 'edit';
  const frozen = Boolean(editing?.is_frozen);

  async function submit() {
    if (!ready || !target || frozen) return;
    setSaving(true);
    const clean = {
      ...fields, name: fields.name.trim(), query: fields.query.trim(),
      description: withProjectIcon(fields.description?.trim() ?? '', icon),
    };
    if (editing) {
      /* Only what changed is sent, so a change made meanwhile in Todoist to
         another field is not written over. */
      const changed: Partial<FilterFields> = {};
      if (clean.name !== editing.name) changed.name = clean.name;
      if (clean.query !== editing.query) changed.query = clean.query;
      if (clean.color !== editing.color) changed.color = clean.color;
      if (clean.is_favorite !== editing.is_favorite) changed.is_favorite = clean.is_favorite;
      if (clean.description !== (editing.description ?? '')) changed.description = clean.description;
      onClose();
      if (Object.keys(changed).length > 0) await updateFilter(editing.id, changed);
      return;
    }
    onClose();
    await createFilter(clean);
  }

  async function remove() {
    if (!editing) return;
    const yes = await confirm({
      title: t('filters.deleteTitle', { name: editing.name }),
      body: t('filters.deleteBody'),
      confirmLabel: t('filters.delete'),
      destructive: true,
    });
    if (!yes) return;
    onClose();
    navigate('filters');
    await deleteFilter(editing.id);
  }

  const title = isEdit ? t('filters.edit') : t('filters.new');

  return (
    <Overlay open={target !== null} onClose={onClose} label={title} size="sm">
      <div className="sheet-head">
        <h2>{title}</h2>
        <button className="iconbtn" aria-label={t('common.close')} onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>

      <div className="sheet-body projectform filterform">
        {frozen && <p className="menuhint">{t('filters.frozen')}</p>}
        <div className="pcx" style={{ '--c': colorValue(fields.color) } as React.CSSProperties}>
          <button
            type="button"
            className={`pcx-icon${iconOpen ? ' open' : ''}`}
            aria-label={t('project.changeIcon')}
            title={t('project.changeIcon')}
            aria-expanded={iconOpen}
            disabled={frozen}
            onClick={() => setIconOpen((v) => !v)}
          >
            <span className="hash" style={markerStyle(fields.color)}>
              {icon
                ? <ProjectIcon iconId={icon} size="sm" style={{ color: 'inherit' }} />
                : <Icon name="filter" size="sm" />}
            </span>
          </button>
          <div className="pcx-main">
            <input
              className="pcx-name"
              data-autofocus
              value={fields.name}
              placeholder={t('filters.name')}
              aria-label={t('filters.name')}
              autoComplete="off"
              disabled={frozen}
              onChange={(e) => set({ name: e.target.value })}
              /* Kept from reaching the button focus returns to, which the
                 same Enter would otherwise press and open the sheet again. */
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void submit(); } }}
            />
            <textarea
              ref={descriptionRef}
              className="pcx-desc"
              rows={1}
              value={fields.description}
              placeholder={t('filters.description')}
              aria-label={t('filters.description')}
              disabled={frozen}
              onChange={(e) => set({ description: e.target.value })}
            />
          </div>
          <button
            type="button"
            className={`starbtn${fields.is_favorite ? ' on' : ''}`}
            aria-pressed={fields.is_favorite}
            title={t(fields.is_favorite ? 'labels.unfavourite' : 'labels.favourite')}
            aria-label={t('labels.favourite')}
            disabled={frozen}
            onClick={() => set({ is_favorite: !fields.is_favorite })}
          >
            <Icon name="star" size="sm" />
          </button>
        </div>

        {/* React 18's types do not know `inert` yet; the browser does. */}
        <div className={`iconfold${iconOpen ? ' open' : ''}`} {...({ inert: iconOpen ? undefined : '' } as object)}>
          <div className="iconfold-in">
            <ProjectIconGrid value={icon} onPick={setIcon} />
            <p className="menuhint">{t('filters.iconHint')}</p>
          </div>
        </div>

        <div className="formfield">
          <span className="fieldlabel" id="filter-query">{t('filters.query')}</span>
          <textarea
            aria-labelledby="filter-query"
            className="textfield filterform-query"
            rows={3}
            value={fields.query}
            placeholder="today | overdue"
            spellCheck={false}
            disabled={frozen}
            onChange={(e) => set({ query: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void submit(); }
            }}
          />
          <span className="menuhint">
            {t('filters.queryHint')}{' '}
            <a href="https://todoist.com/help/articles/introduction-to-filters-V98wIH" target="_blank" rel="noreferrer">
              {t('filters.queryHelp')}
            </a>
          </span>
        </div>

        <div className="formfield">
          <span className="fieldlabel" id="filter-colour">
            {t('project.colour')}
            <b className="cname">{t(`colour.${fields.color}` as TranslationKey)}</b>
          </span>
          <div className="swatches" role="radiogroup" aria-labelledby="filter-colour">
            {COLOUR_CHOICES.map((choice) => (
              <button
                key={choice}
                type="button"
                role="radio"
                className={`swatch${fields.color === choice ? ' selected' : ''}`}
                style={{ '--swatch': colorValue(choice) } as React.CSSProperties}
                aria-label={t(`colour.${choice}` as TranslationKey)}
                title={t(`colour.${choice}` as TranslationKey)}
                aria-checked={fields.color === choice}
                disabled={frozen}
                onClick={() => set({ color: choice })}
              >
                {fields.color === choice && <Icon name="check" size="sm" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="sheet-foot">
        {editing && (
          <button className="btn danger filterform-delete" onClick={() => void remove()}>
            <Icon name="trash" size="sm" />
            {t('filters.delete')}
          </button>
        )}
        <button className="btn quiet" onClick={onClose}>{t('common.cancel')}</button>
        <button className="btn primary" disabled={!ready || frozen} onClick={() => void submit()}>
          {isEdit ? t('common.save') : t('filters.create')}
        </button>
      </div>
    </Overlay>
  );
}
