import { DescriptionEditor } from '../Checklist';
import { useCreateTag } from '@/hooks/useCreateTag';
import { useEffect, useRef, useState } from 'react';
import { Overlay } from './Overlay';
import { useConfirm } from './Confirm';
import { Icon } from '../Icon';
import { EstimateField } from '../EstimateField';
import { PlacementField } from '../PlacementField';
import { Select } from '../Select';
import { ProjectSheet } from './ProjectSheet';
import { DateField } from '../DateField';
import { TaskNameField } from '../TaskNameField';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import { formatDuration } from '@/domain/estimates';
import { markerStyle } from '@/domain/colors';
import { toTodoistPriority, type DisplayPriority } from '@/domain/types';
import {
  parseShorthand, splitTrailingEstimate, type HighlightKind, type Shorthand, type TextRange,
} from '@/domain/shorthand';
import { matchesSearch } from '@/domain/search';
import { byLabelOrder } from '@/domain/orderKey';

interface ComposerProps {
  open: boolean;
  onClose: () => void;
  /** Where a task lands when the current page implies a project. */
  defaultProjectId?: string;
  /** Pre-filled placement when the task is added from inside a section. */
  defaultSectionId?: string;
  /** Pre-filled date when the task is added from a dated section. */
  defaultDate?: string;
  /** Pre-filled tags, for a page that is one tag. */
  defaultLabels?: string[];
  defaultPriority?: DisplayPriority;
}

/**
 * Adding a task.
 *
 * Every field the product cares about is here, and each one is labelled: the
 * name and the description are separate boxes, and date, deadline, project,
 * priority, tags and the estimate all sit on the row below.
 */
export function Composer({
  open, onClose, defaultProjectId, defaultSectionId, defaultDate, defaultLabels, defaultPriority,
}: ComposerProps) {
  const { t } = useT();
  const snapshot = useStore((s) => s.snapshot);
  const createTask = useStore((s) => s.createTask);
  const createTasks = useStore((s) => s.createTasks);
  const confirm = useConfirm();
  const naturalDates = useStore((s) => s.prefs.naturalDates);
  const dateFormat = useStore((s) => s.prefs.dateFormat);

  /* Where a task goes when nothing else says: the account's Inbox, however it is found. */
  const inboxId = snapshot.user?.inbox_project_id
    || Object.values(snapshot.projects).find((p) => p.inbox_project && !p.is_deleted)?.id
    || '';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [priority, setPriority] = useState<DisplayPriority>(4);
  const [date, setDate] = useState('');
  const [recurrence, setRecurrence] = useState<Shorthand['recurrence']>(null);
  const [deadline, setDeadline] = useState('');
  /** The tags picked by hand (or given by the page the composer opened on). */
  const [labels, setLabels] = useState<string[]>([]);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [tagsOpen, setTagsOpen] = useState(false);
  /** The project sheet, opened from the project chip's "New project…". */
  const [newProject, setNewProject] = useState(false);
  const [tagQuery, setTagQuery] = useState('');
  const newTag = useCreateTag(tagQuery);
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [subtaskDraft, setSubtaskDraft] = useState('');
  /** The readings of the name that have been turned down, by position in it. */
  const [refusals, setRefusals] = useState<TextRange[]>([]);

  useEffect(() => {
    if (!open) return;
    setName('');
    setDescription('');
    setPriority(4);
    setLabels(defaultLabels ?? []);
    setPriority(defaultPriority ?? 4);
    setMinutes(null);
    setTagsOpen(false);
    setTagQuery('');
    setSubtasks([]);
    setSubtaskDraft('');
    setRefusals([]);
    setProjectId(defaultProjectId || inboxId);
    setSectionId(defaultSectionId ?? '');
    setDate(defaultDate ?? '');
    setRecurrence(null);
    setDeadline('');
    /* eslint-disable-next-line react-hooks/exhaustive-deps -- the array is
       built fresh by the caller on every render; its contents are the dep. */
  }, [open, defaultProjectId, defaultSectionId, defaultDate, defaultPriority, defaultLabels?.join('\u0000'),
    inboxId]);

  const tags = Object.values(snapshot.labels)
    .filter((l) => !l.is_deleted && !l.name.startsWith('est-'))
    .sort(byLabelOrder);
  const filteredTags = tags.filter((label) => matchesSearch(label.name, tagQuery));

  const parsed = parseShorthand(name, snapshot, naturalDates, refusals, dateFormat);

  /*
   * The task's tags: the ones picked by hand, and the ones the name says right
   * now.
   *
   * The name's used to be pushed into the picked list as they were read, and
   * never taken back out: typing "@week" read "@w", then "@we", then "@wee",
   * and each was kept, so the task went to Todoist with four tags and Todoist
   * made all four. What the name says is read again on every keystroke
   * instead, so only the word as it stands is a tag.
   */
  const sameTag = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  const allTags = parsed.labels.reduce(
    (tags, read) => (tags.some((tag) => sameTag(tag, read)) ? tags : [...tags, read]),
    labels,
  );

  /** Takes a tag off: out of the picked list, and its reading out of the name. */
  const dropTag = (tag: string) => {
    setLabels((prev) => prev.filter((l) => !sameTag(l, tag)));
    const marks = parsed.ranges.filter((range) => range.kind === 'label'
      && sameTag(name.slice(range.start + 1, range.end), tag));
    if (marks.length > 0) {
      setRefusals((prev) => [...prev, ...marks.map(({ start, end }) => ({ start, end }))]);
    }
  };

  const toggleTag = (tag: string) => {
    if (allTags.some((l) => sameTag(l, tag))) dropTag(tag);
    else setLabels((prev) => [...prev, tag]);
  };

  async function createAndPickTag() {
    const name = await newTag.create();
    if (name) { setLabels((previous) => [...new Set([...previous, name])]); setTagQuery(''); }
  }

  /* The default the project field falls back to, which is where a refused
     `#project` leaves it: the composer was opened on somewhere, and "nowhere"
     is not a project a task can be created in. */
  const fallbackProject = defaultProjectId || inboxId;

  /**
   * A reading turned down takes its value back out of the field it filled.
   *
   * Without this the mark disappears from the name and the date, the project
   * or the repeat it had pushed down stays sitting in the form — the task
   * would still be created with the very thing that was just refused.
   */
  const unfill = (reading: HighlightKind) => {
    if (reading === 'date') setDate(defaultDate ?? '');
    if (reading === 'recurrence') setRecurrence(null);
    if (reading === 'priority') setPriority(4);
    if (reading === 'duration') setMinutes(null);
    if (reading === 'project') { setProjectId(fallbackProject); setSectionId(''); }
    /* A tag read from the name needs nothing here: it is read again from the
       name every time, so refusing it is enough to take it off. */
  };

  /*
   * The fields below follow the name.
   *
   * They used to be two independent readings of the same task: typing
   * "Friday #Work p1" marked those words in the name and left the date, the
   * project and the priority pickers showing something else entirely, so the
   * dialog could be displaying two different tasks at once and only one of
   * them was going to be created. Now anything the name yields is pushed down
   * into the field that owns it, and the field is the single thing that is
   * saved. Each effect watches its own value, so a picker changed by hand
   * afterwards stays changed until the name says something new.
   */
  const { date: readDate, projectId: readProject, sectionId: readSection,
    priority: readPriority, minutes: readMinutes, recurrence: readRepeat } = parsed;

  /*
   * Each of these also watches `refusals`, whose identity changes only when a
   * reading is turned down or taken back. Refusing one of two identical
   * readings is why: in "Weekly review weekly" the first is refused, the
   * second is then read, and the rule it yields is the same string as before —
   * so an effect watching the value alone would never fire, and the field
   * that the refusal had just emptied would stay empty while the name showed
   * the second word marked. The refusal empties the field; the effect fills it
   * again from whatever is still being read, and runs after it.
   */
  /* What the name said a moment ago. When a reading disappears because the
     words were deleted, the field it filled lets go of it too — unless the
     field was changed by hand since, which is then left alone. */
  const wasRead = useRef<{
    date: string | null; repeat: string | null; project: string | null; section: string | null;
    priority: DisplayPriority | null; minutes: number | null;
  }>({ date: null, repeat: null, project: null, section: null, priority: null, minutes: null });
  useEffect(() => {
    const was = wasRead.current;
    if (was.date && !readDate) setDate((now) => (now === was.date ? (defaultDate ?? '') : now));
    if (was.repeat && !readRepeat) setRecurrence((now) => (now?.string === was.repeat ? null : now));
    if (was.project && !readProject) {
      setProjectId((now) => (now === was.project ? fallbackProject : now));
      setSectionId((now) => (now === was.section ? (defaultSectionId ?? '') : now));
    }
    if (was.priority && !readPriority) setPriority((now) => (now === was.priority ? (defaultPriority ?? 4) : now));
    if (was.minutes !== null && readMinutes === null) setMinutes((now) => (now === was.minutes ? null : now));
    wasRead.current = {
      date: readDate ?? null, repeat: readRepeat?.string ?? null, project: readProject ?? null,
      section: readSection ?? null, priority: readPriority ?? null, minutes: readMinutes ?? null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the readings themselves, not on the fallbacks.
  }, [readDate, readRepeat?.string, readProject, readSection, readPriority, readMinutes]);
  useEffect(() => { if (readDate) setDate(readDate); }, [readDate, refusals]);
  /* Depends on the rule's text, not on the object: the parser builds a new one
     on every keystroke and the effect would never stop firing. */
  useEffect(() => {
    if (readRepeat) setRecurrence(readRepeat);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- The rule text is stable; the parser recreates the object on each keystroke.
  }, [readRepeat?.string, refusals]);
  useEffect(() => { if (readProject) setProjectId(readProject); }, [readProject, refusals]);
  /* The section follows the project it was named with. It watches both, so
     naming a project on its own clears a section belonging to the last one —
     and it does not re-run while the rest of the name is typed, which is what
     lets a section chosen by hand in the field stand. */
  useEffect(() => {
    if (readProject) setSectionId(readSection ?? '');
  }, [readProject, readSection, refusals]);
  useEffect(() => { if (readPriority) setPriority(readPriority); }, [readPriority, refusals]);
  useEffect(() => {
    if (readMinutes !== null) setMinutes(readMinutes);
  }, [readMinutes, refusals]);

  /**
   * One creation at a time (#142).
   *
   * The sheet stays open while the task is sent, so a second click, or Enter
   * pressed twice, used to start a second creation before the first was done:
   * two tasks with two ids, not one task drawn twice. The ref is what shuts the
   * door, because two calls in the same moment both read the same render's
   * state; the state only draws the wait. A task that failed to save leaves the
   * sheet as it was, ready to be sent again, and two tasks with the same name
   * typed on purpose are still two tasks: nothing here compares titles.
   */
  const submitting = useRef(false);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (submitting.current) return;
    const content = parsed.content;
    if (!content) return;
    submitting.current = true;
    setSaving(true);
    try {
      await create(content);
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  /**
   * A pasted list (#152): one independent task per line, after asking.
   *
   * Each line is read on its own, the way a title typed here is, so `(25)`, a
   * date, `#Project` or `p1` in a line applies to that task. What was chosen
   * in the window, its date, priority, tags and project, is not carried over:
   * the lines are the whole of what is asked for. Nothing is created until it
   * is confirmed, and refusing puts the text into the field as an ordinary
   * paste, so the draft is not lost.
   */
  async function pasteList(lines: string[], keepAsText: () => void) {
    if (submitting.current) return;
    const ok = await confirm({
      title: t('composer.pasteListTitle', { count: lines.length }),
      body: t('composer.pasteListBody', { count: lines.length }),
      confirmLabel: t('composer.pasteListConfirm', { count: lines.length }),
    });
    if (!ok) {
      keepAsText();
      return;
    }
    if (submitting.current) return;
    submitting.current = true;
    setSaving(true);
    try {
      const inbox = snapshot.user?.inbox_project_id;
      await createTasks(lines.map((line) => {
        const read = parseShorthand(line, snapshot, naturalDates, [], dateFormat);
        return {
          content: read.content || line,
          project_id: read.projectId || inbox,
          section_id: read.sectionId || undefined,
          priority: toTodoistPriority(read.priority ?? 4),
          labels: read.labels,
          ...(read.minutes !== null ? { estimateMinutes: read.minutes } : {}),
          due: read.recurrence
            ? { string: read.recurrence.string, lang: read.recurrence.lang, is_recurring: true }
            : read.date
              ? { date: read.date, timezone: null, string: read.date, lang: 'en', is_recurring: false }
              : undefined,
        };
      }));
      onClose();
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  async function create(content: string) {
    const allLabels = [...allTags];


    /* `||`, not `??`: an unset picker is an empty string, not null, and an
       empty string sent as project_id is what Todoist answers "invalid
       argument value" to — which is a task that never gets created. */
    const targetProject = projectId || inboxId;
    const dueDate = date;
    const repeat = recurrence;
    const pending = subtaskDraft.trim();
    /* A subtask can end with its own estimate, read the way the name's is and
       written the same way (#163). */
    const allSubtasks = (pending ? [...subtasks, pending] : subtasks).map((line) => {
      const { content: title, minutes: estimate } = splitTrailingEstimate(line);
      return { content: title, ...(estimate === null ? {} : { estimateMinutes: estimate }) };
    });

    await createTask({
      content,
      description: description.trim() || undefined,
      project_id: targetProject,
      section_id: sectionId || undefined,
      priority: toTodoistPriority(priority),
      labels: allLabels,
      ...(minutes !== null ? { estimateMinutes: minutes } : {}),
      /* A recurrence is sent as the rule and nothing else. Todoist resolves
         it, and a date sent alongside would pin the first occurrence to
         whatever this device worked out — which is the one number the app has
         no business computing. */
      due: repeat
        ? { string: repeat.string, lang: repeat.lang, is_recurring: true }
        : dueDate
          ? { date: dueDate, timezone: null, string: dueDate, lang: 'en', is_recurring: false }
          : undefined,
      deadline: deadline ? { date: deadline, lang: 'en' } : undefined,
      subtasks: allSubtasks,
    });

    onClose();
  }

  return (
    <>
    <Overlay open={open} onClose={onClose} label={t('nav.addTask')} size="sm">
      <div
        className="composerbox"
        /* Cmd+Enter saves, from any field in the sheet — Todoist's own key for
           it, and the one anybody writing in the description or filling in
           subtasks reaches for rather than aiming at the button. Plain Enter
           still belongs to the field it is pressed in: it commits a name, and
           it adds a subtask and asks for the next. */
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || !(e.metaKey || e.ctrlKey)) return;
          if (!name.trim()) return;
          e.preventDefault();
          e.stopPropagation();
          void submit();
        }}
      >
        <TaskNameField
          value={name}
          onChange={setName}
          onSubmit={() => void submit()}
          onPasteList={(lines, keepAsText) => void pasteList(lines, keepAsText)}
          placeholder={t('composer.namePlaceholder')}
          ariaLabel={t('composer.name')}
          snapshot={snapshot}
          naturalDates={naturalDates}
          refusals={refusals}
          onRefusals={(next, change) => {
            setRefusals(next);
            if (change?.kind === 'refused') unfill(change.reading);
          }}
        />

        {/* Level 1, the task itself: the description sits under the title on
            the same left edge, quieter, and grows with what is written in it
            rather than being a box to fill (#113). */}
        <DescriptionEditor
          variant="composer"
          value={description}
          onChange={setDescription}
          onCommit={() => undefined}
          placeholder={t('composer.descriptionPlaceholder')}
          ariaLabel={t('detail.description')}
        />

        {/* Level 2, planning, as one line of chips (direction B of #113): a
            value that is set is a filled chip saying it, one that is not is a
            dashed "+ Deadline". Every chip is the same picker it always was;
            only its closed face changed. */}
        <div className="composer-chips composer-tags" role="group" aria-label={t('composer.planning')}>
          {/* A repeat answers the same question a date does, so it stands in
              the date's own place: a task cannot be both on Tuesday and every
              Monday. */}
          {recurrence ? (
            <button
              type="button"
              className="fselect-face chipface crepeat"
              onClick={() => setRecurrence(null)}
              title={t('composer.clearRepeat')}
            >
              <Icon name="repeat" size="sm" />
              <span className="fselect-value">{recurrence.string}</span>
              <Icon name="close" size="sm" />
            </button>
          ) : (
            <DateField variant="chip" withTime value={date} onChange={setDate} label={t('composer.date')} />
          )}

          <DateField
            variant="chip"
            icon="deadline"
            value={deadline}
            onChange={setDeadline}
            label={t('detail.deadline')}
          />

          <Select
            variant="chip"
            label={t('composer.priority')}
            ariaLabel={t('composer.priority')}
            unset={priority === 4}
            unsetLabel={t('composer.priority')}
            chipIcon={<Icon name="flag" size="sm" style={{ color: `var(--p${priority})` }} />}
            value={String(priority)}
            onChange={(next) => setPriority(Number(next) as DisplayPriority)}
            options={([1, 2, 3, 4] as const).map((p) => ({
              value: String(p),
              label: `P${p}`,
            }))}
          />

          {allTags.map((label) => {
            const known = tags.find((l) => l.name === label);
            return (
              <button
                key={label}
                type="button"
                className="fselect-face chipface tagchip"
                title={t('composer.removeTag', { name: label })}
                onClick={() => dropTag(label)}
              >
                <Icon name="tag" size="sm" className="taglabel" style={markerStyle(known?.color, false)} />
                <span className="fselect-value">{label}</span>
                <Icon name="close" size="sm" />
              </button>
            );
          })}

          <button
            type="button"
            className="fselect-face chipface unset"
            aria-expanded={tagsOpen}
            onClick={() => setTagsOpen((openNow) => {
              if (!openNow) setTagQuery('');
              return !openNow;
            })}
          >
            <Icon name="tag" size="sm" />
            <span className="fselect-value">{t('composer.tag')}</span>
          </button>

          {tagsOpen && (
            <div
              className="popover tagpicker"
              role="dialog"
              aria-label={t('composer.labels')}
              ref={(node) => node?.scrollIntoView({ block: 'nearest' })}
            >
              <div className="pickersearch">
                <Icon name="search" size="sm" />
                <input
                  autoFocus
                  value={tagQuery}
                  placeholder={t('nav.search')}
                  aria-label={t('nav.search')}
                  onChange={(event) => setTagQuery(event.target.value)}
                  onKeyDown={(event) => {
                    event.stopPropagation();
                    if (event.key === 'Enter' && newTag.available) {
                      event.preventDefault(); void createAndPickTag();
                    } else if (event.key === 'Enter' && filteredTags[0]) {
                      event.preventDefault();
                      toggleTag(filteredTags[0].name);
                    }
                    if (event.key === 'Escape') setTagsOpen(false);
                  }}
                />
              </div>
              {newTag.available && <button className="opt" disabled={newTag.busy} onClick={() => void createAndPickTag()}><Icon name="plus" size="sm" />{t('estimates.createTag', { name: newTag.name })}</button>}
              {tags.length === 0 && <p className="menuhint">{t('labels.none')}</p>}
              {tags.length > 0 && filteredTags.length === 0 && <p className="menuhint">{t('search.noResults')}</p>}
              {filteredTags.map((label) => (
                <label className="checkrow" key={label.id}>
                  <input
                    type="checkbox"
                    checked={allTags.some((l) => sameTag(l, label.name))}
                    onChange={() => toggleTag(label.name)}
                  />
                  <Icon name="tag" size="sm" className="taglabel" style={markerStyle(label.color, false)} />
                  <span>{label.name}</span>
                </label>
              ))}
            </div>
          )}
          <EstimateChip minutes={minutes} onChange={setMinutes} />

          {/* One chip for both: a section is a place, not a setting applied
              to the project chosen before it. The Inbox is a project like any
              other, so this chip is never empty. */}
          <PlacementField
            variant="chip"
            label={t('composer.project')}
            value={{ projectId: projectId || inboxId, sectionId: sectionId || null }}
            onNewProject={() => setNewProject(true)}
            onChange={(place) => {
              setProjectId(place.projectId);
              setSectionId(place.sectionId ?? '');
            }}
          />
        </div>

        {/* Level 3, subtasks: open, with a heading and a count, one of the
            things this composer does that a quick-add does not. */}
        <div className="composer-subs">
          <span className="composer-subhead">
            <strong>{t('detail.subtasks')}</strong>
            {subtasks.length > 0 && <small>{subtasks.length}</small>}
          </span>
          {subtasks.map((content, index) => (
            <div className="composer-sub" key={index}>
              <span className="check p4" aria-hidden="true" />
              <TaskNameField
                estimateOnly
                autoFocus={false}
                fieldClassName="subtaskfield"
                value={content}
                onChange={(value) => setSubtasks((prev) => prev.map((s, i) => (i === index ? value : s)))}
                onBlur={() => setSubtasks((prev) => {
                  const trimmed = prev[index]?.trim();
                  if (!trimmed) return prev.filter((_, i) => i !== index);
                  return trimmed === prev[index] ? prev : prev.map((s, i) => (i === index ? trimmed : s));
                })}
                onSubmit={() => (document.activeElement as HTMLElement | null)?.blur()}
                placeholder=""
                ariaLabel={t('detail.subtasks')}
                snapshot={snapshot}
                naturalDates={false}
                refusals={[]}
                onRefusals={() => {}}
              />
              <button
                className="iconbtn"
                aria-label={t('common.cancel')}
                onClick={() => setSubtasks((prev) => prev.filter((_, i) => i !== index))}
              >
                <Icon name="close" size="sm" />
              </button>
            </div>
          ))}
          <div className="composer-sub adding">
            <span className="check p4" aria-hidden="true" />
            <TaskNameField
              estimateOnly
              autoFocus={false}
              fieldClassName="subtaskfield"
              value={subtaskDraft}
              onChange={setSubtaskDraft}
              onSubmit={() => {
                const value = subtaskDraft.trim();
                if (!value) return;
                setSubtasks((prev) => [...prev, value]);
                setSubtaskDraft('');
              }}
              placeholder={t('composer.subtaskPlaceholder')}
              ariaLabel={t('detail.addSubtask')}
              snapshot={snapshot}
              naturalDates={false}
              refusals={[]}
              onRefusals={() => {}}
            />
          </div>
        </div>

        {/* Level 4, the way out, on its own bar: always in the same place. */}
        <div className="composer-actions">
          <span className="composer-hint" aria-hidden="true">
            <kbd>⌘</kbd><kbd>↵</kbd> {t('composer.hintAdd')}
          </span>
          <button className="btn quiet" onClick={onClose}>{t('composer.cancel')}</button>
          <button
            className="btn primary"
            disabled={!name.trim() || saving}
            aria-busy={saving}
            onClick={() => void submit()}
          >
            {t('composer.add')}
          </button>
        </div>
      </div>
    </Overlay>
    <ProjectSheet
      target={newProject
        ? {
            mode: 'create',
            workspaceId: null,
            onCreated: (id) => { setProjectId(id); setSectionId(''); },
          }
        : null}
      onClose={() => setNewProject(false)}
    />
    </>
  );
}

/**
 * The estimate as a chip (#113): "+ Estimate" until there is one, then the
 * duration. Clicked, it turns into the estimate field every other place in
 * the app uses, and back into a chip once the number is in.
 */
function EstimateChip({
  minutes, onChange,
}: { minutes: number | null; onChange: (minutes: number | null) => void }) {
  const { t, locale } = useT();
  const [editing, setEditing] = useState(false);
  const faceRef = useRef<HTMLButtonElement>(null);
  /* Enter and Escape leave the field from the keyboard, and the keyboard
     goes back to the chip; a click elsewhere leaves the focus where it went. */
  const refocus = useRef(false);

  useEffect(() => {
    if (editing || !refocus.current) return;
    refocus.current = false;
    faceRef.current?.focus();
  }, [editing]);

  if (editing) {
    return (
      <span
        className="fselect-face chipface chipedit"
        onKeyDownCapture={(e) => { if (e.key === 'Enter' || e.key === 'Escape') refocus.current = true; }}
      >
        <Icon name="clock" size="sm" />
        <EstimateField
          autoFocus
          minutes={minutes}
          onCommit={(value) => { onChange(value); setEditing(false); }}
          onCancel={() => setEditing(false)}
        />
      </span>
    );
  }
  return (
    <button
      type="button"
      ref={faceRef}
      className={`fselect-face chipface${minutes === null ? ' unset' : ''}`}
      onClick={() => setEditing(true)}
    >
      <Icon name="clock" size="sm" />
      <span className="fselect-value">
        {minutes === null ? t('composer.duration') : formatDuration(minutes, locale)}
      </span>
    </button>
  );
}
