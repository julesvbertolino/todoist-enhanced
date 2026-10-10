import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Overlay } from './Overlay';
import { Icon } from '../Icon';
import { Select } from '../Select';
import { ProjectIcon, ProjectIconGrid } from '../ProjectIconPicker';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import { colorValue, markerStyle } from '@/domain/colors';
import { readProjectIcon, stripProjectIcon, withProjectIcon } from '@/domain/projectIcons';
import { parentChoices } from '@/domain/projectParents';
import type { TranslationKey } from '@/i18n';

/** Todoist's own project palette, in Todoist's own order. */
const CHOICES = [
  'berry_red', 'red', 'orange', 'yellow', 'olive_green', 'lime_green',
  'green', 'mint_green', 'teal', 'sky_blue', 'light_blue', 'blue',
  'grape', 'violet', 'lavender', 'magenta', 'salmon', 'charcoal', 'grey', 'taupe',
];

/** The value the destination select uses for the personal space. */
const PERSONAL = 'personal';

/**
 * What the sheet was opened to do.
 *
 * Creating and editing ask for the same three things, so they are one sheet
 * rather than two that drift. `anchor` is what "add project above" means once
 * it reaches the store: a position among the siblings.
 */
export type ProjectSheetTarget =
  | {
      mode: 'create'; workspaceId: string | null;
      anchor?: { siblingId: string; position: 'above' | 'below' };
      /** Told the new project's id, for a caller that was in the middle of something else (the composer). */
      onCreated?: (projectId: string) => void;
    }
  | { mode: 'edit'; projectId: string }
  | null;

interface ProjectSheetProps {
  target: ProjectSheetTarget;
  onClose: () => void;
}

/**
 * Creating a project, and changing one: a name, a colour, a description, and
 * where it goes.
 *
 * The destination is a field like the others rather than a consequence of
 * which button opened the sheet, so it can be read before submitting and
 * changed without starting again.
 */
export function ProjectSheet({ target, onClose }: ProjectSheetProps) {
  const { t } = useT();
  const createProject = useStore((s) => s.createProject);
  const updateProjectFields = useStore((s) => s.updateProjectFields);
  const nestProject = useStore((s) => s.nestProject);
  const moveProjectToWorkspace = useStore((s) => s.moveProjectToWorkspace);
  const setViewPrefs = useStore((s) => s.setViewPrefs);
  const prefs = useStore((s) => s.prefs);
  const snapshot = useStore((s) => s.snapshot);

  const editing = target?.mode === 'edit' ? snapshot.projects[target.projectId] : undefined;

  const [name, setName] = useState('');
  const [color, setColor] = useState('charcoal');
  const [description, setDescription] = useState('');
  const [favourite, setFavourite] = useState(false);
  const [destination, setDestination] = useState(PERSONAL);
  const [saving, setSaving] = useState(false);
  const [icon, setIcon] = useState<string | null>(null);
  /** The project it is filed under; '' is the top level. */
  const [parent, setParent] = useState('');
  const [iconOpen, setIconOpen] = useState(false);
  /** How the project opens. Enhanced keeps its own mode per project; Todoist's `view_style` follows it. */
  const [view, setView] = useState<'list' | 'board'>('list');
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const workspaces = useMemo(
    () => Object.values(snapshot.workspaces).sort((a, b) => a.name.localeCompare(b.name)),
    [snapshot.workspaces],
  );

  /* Each opening starts from the project it was opened on, or from nothing. */
  useEffect(() => {
    if (!target) return;
    setSaving(false);
    if (target.mode === 'edit') {
      const project = snapshot.projects[target.projectId];
      setName(project?.name ?? '');
      setColor(project?.color ?? 'charcoal');
      setDescription(stripProjectIcon(project?.description));
      setIcon(readProjectIcon(project?.description));
      setFavourite(project?.is_favorite ?? false);
      setDestination(project?.workspace_id ?? PERSONAL);
      setParent(project?.parent_id ?? '');
      /* Enhanced's own choice wins; before one is made, Todoist's decides. */
      const own = prefs.views[`project:${target.projectId}`]?.mode;
      setView(own === 'board' || own === 'list' ? own : project?.view_style === 'board' ? 'board' : 'list');
      setIconOpen(false);
      return;
    }
    setName('');
    setColor('charcoal');
    setDescription('');
    setIcon(null);
    setFavourite(false);
    setDestination(target.workspaceId ?? PERSONAL);
    // Added next to a project, it starts in that project's branch.
    setParent((target.anchor && snapshot.projects[target.anchor.siblingId]?.parent_id) || '');
    setView('list');
    setIconOpen(false);
    // Reading the project once, on opening, is the point: later edits are ours.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Seed fields only when opening; later project updates must preserve the draft.
  }, [target]);

  const destinations = useMemo(
    () => [
      { value: PERSONAL, label: t('nav.myProjects') },
      ...workspaces.map((workspace) => ({ value: workspace.id, label: workspace.name })),
    ],
    [workspaces, t],
  );

  /* Where it can be filed depends on the workspace it is in, so a different
     destination empties the choice rather than keeping one that cannot hold. */
  const workspaceId = destination === PERSONAL ? null : destination;
  const parents = useMemo(
    () => parentChoices(snapshot.projects, workspaceId, target?.mode === 'edit' ? target.projectId : undefined),
    [snapshot.projects, workspaceId, target],
  );
  const parentOptions = useMemo(
    () => [
      { value: '', label: t('project.parentNone') },
      ...parents.map((choice) => ({
        value: choice.id, label: choice.name, marker: snapshot.projects[choice.id]?.color, sub: choice.depth > 0,
      })),
    ],
    [parents, snapshot.projects, t],
  );

  /* The description grows with what is typed, so it reads as a line of the
     card until there is more than a line to say. */
  useLayoutEffect(() => {
    const box = descriptionRef.current;
    if (!box) return;
    box.style.height = 'auto';
    box.style.height = `${box.scrollHeight}px`;
  }, [description, target]);

  async function submit() {
    if (!name.trim() || saving || !target) return;
    setSaving(true);

    // The chosen icon rides as a marker on the end of the description —
    // real Todoist data, so it reaches the account this way whichever of
    // the two calls below is the one making the request.
    const finalDescription = withProjectIcon(description, icon);

    if (target.mode === 'edit') {
      await updateProjectFields(target.projectId, {
        name: name.trim(),
        color,
        description: finalDescription,
        is_favorite: favourite,
        view_style: view,
      });
      setViewPrefs(`project:${target.projectId}`, { mode: view });
      const movedSpace = (editing?.workspace_id ?? null) !== (destination === PERSONAL ? null : destination);
      if (movedSpace) await moveProjectToWorkspace(target.projectId, destination === PERSONAL ? null : destination);
      else if (parent !== (editing?.parent_id ?? '')) await nestProject(target.projectId, parent || null);
    } else {
      const id = await createProject(
        name.trim(),
        color,
        destination === PERSONAL ? null : destination,
        target.anchor ?? null,
        { description: finalDescription, favourite, parentId: parent || null, viewStyle: view },
      );
      if (view !== 'list') setViewPrefs(`project:${id}`, { mode: view });
      target.onCreated?.(id);
    }
    onClose();
  }

  const isEdit = target?.mode === 'edit';

  return (
    <Overlay
      open={target !== null}
      onClose={onClose}
      label={isEdit ? t('project.edit') : t('project.create')}
      size="sm"
    >
      <div className="sheet-head">
        <h2>{isEdit ? t('project.edit') : t('project.create')}</h2>
        <button className="iconbtn" aria-label={t('common.close')} onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>

      <div className="sheet-body projectform">
        {/* The card is the form: what the project will look like in the
            sidebar is what is being typed into. */}
        <div className="pcx" style={{ '--c': colorValue(color) } as React.CSSProperties}>
          <button
            type="button"
            className={`pcx-icon${iconOpen ? ' open' : ''}`}
            aria-label={t('project.changeIcon')}
            title={t('project.changeIcon')}
            aria-expanded={iconOpen}
            onClick={() => setIconOpen((v) => !v)}
          >
            <span className="hash" style={markerStyle(color)}>
              {icon ? <ProjectIcon iconId={icon} size="sm" style={{ color: 'inherit' }} /> : '#'}
            </span>
          </button>
          <div className="pcx-main">
            <input
              className="pcx-name"
              data-autofocus
              value={name}
              placeholder={t('project.name')}
              aria-label={t('project.name')}
              autoComplete="off"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
            />
            <textarea
              ref={descriptionRef}
              className="pcx-desc"
              rows={1}
              value={description}
              placeholder={t('project.descriptionPlaceholder')}
              aria-label={t('project.description')}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <button
            type="button"
            className={`starbtn${favourite ? ' on' : ''}`}
            aria-pressed={favourite}
            title={t(favourite ? 'project.removeFavourite' : 'project.favourite')}
            aria-label={t('project.favourite')}
            onClick={() => setFavourite((v) => !v)}
          >
            <Icon name="star" size="sm" />
          </button>
        </div>

        {/* React 18's types do not know `inert` yet; the browser does. */}
        <div className={`iconfold${iconOpen ? ' open' : ''}`} {...({ inert: iconOpen ? undefined : '' } as object)}>
          <div className="iconfold-in">
            <ProjectIconGrid value={icon} onPick={setIcon} />
            <p className="menuhint">{t('project.iconHint')}</p>
          </div>
        </div>

        <div className="formfield">
          <span className="fieldlabel" id="project-colour">
            {t('project.colour')}
            <b className="cname">{t(`colour.${color}` as TranslationKey)}</b>
          </span>
          <div className="swatches" role="radiogroup" aria-labelledby="project-colour">
            {CHOICES.map((choice) => (
              <button
                key={choice}
                type="button"
                role="radio"
                className={`swatch${color === choice ? ' selected' : ''}`}
                style={{ '--swatch': colorValue(choice) } as React.CSSProperties}
                aria-label={t(`colour.${choice}` as TranslationKey)}
                title={t(`colour.${choice}` as TranslationKey)}
                aria-checked={color === choice}
                onClick={() => setColor(choice)}
              >
                {color === choice && <Icon name="check" size="sm" />}
              </button>
            ))}
          </div>
        </div>

        <div className="pjrows">
          {/* Only worth asking when there is somewhere else for it to go. In an
              edit, changing it moves the project, with its tasks. */}
          {workspaces.length > 0 && (
            <div className="pjrow">
              <span>{t('project.workspace')}</span>
              <Select
                value={destination}
                options={destinations}
                ariaLabel={t('project.workspace')}
                onChange={(next) => { setDestination(next); setParent(''); }}
              />
            </div>
          )}
          <div className="pjrow">
            <span>{t('project.parent')}</span>
            <Select
              value={parent}
              options={parentOptions}
              ariaLabel={t('project.parent')}
              onChange={setParent}
            />
          </div>
        </div>

        <div className="formfield">
          <span className="fieldlabel" id="project-view">{t('project.view')}</span>
          <div className="segmented" role="group" aria-labelledby="project-view">
            {(['list', 'board'] as const).map((mode) => (
              <button key={mode} type="button" aria-pressed={view === mode} onClick={() => setView(mode)}>
                <Icon name={mode} size="sm" />
                <small>{t(`toolbar.${mode}` as TranslationKey)}</small>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="sheet-foot">
        <button className="btn quiet" onClick={onClose}>{t('common.cancel')}</button>
        <button
          className="btn primary"
          disabled={!name.trim() || saving}
          onClick={() => void submit()}
        >
          {isEdit ? t('project.save') : t('project.createSubmit')}
        </button>
      </div>
    </Overlay>
  );
}
