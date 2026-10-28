import { defaultViewPrefs } from '@/domain/types';
import { viewPrefs } from '@/store/prefs';
import { AssigneeFilter } from '@/components/AssigneeFilter';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import { PERSONAL_WORKSPACE } from '@/store/selectors';
import { Select } from './Select';
import { WorkspaceFilter } from './WorkspaceFilter';
import {
  MATRIX_HORIZONS,
  EISENHOWER_PRIORITIES,
  EISENHOWER_URGENCY_RULES,
  type EisenhowerPriority,
  type EisenhowerUrgencyRule,
  type MatrixLayout,
  type MatrixHorizon,
} from '@/store/prefs';
import type { TranslationKey } from '@/i18n';
import { PanelSheet } from '@/components/SheetChrome';

/**
 * The matrix uses the same Display surface as every task view, while keeping
 * its two classification rules beside its presentation. They are properties
 * of this lens, not hidden global settings and never mutations of Todoist.
 */
export function EisenhowerDisplayMenu() {
  const { t } = useT();
  const prefs = useStore((s) => s.prefs);
  const setPrefs = useStore((s) => s.setPrefs);
  const snapshot = useStore((s) => s.snapshot);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const workspaceSelection = viewPrefs(prefs, 'matrix').filters.workspaces;
  const workspaceChanged = workspaceSelection.length > 0 && ![PERSONAL_WORKSPACE, ...Object.keys(snapshot.workspaces)].every((id) => workspaceSelection.includes(id));
  /* Matrix or list is how the page is drawn, not a setting on what it
     shows: like list or board on the other pages, it does not count. */
  const changed = Number(JSON.stringify(viewPrefs(prefs, 'matrix').filters.assignees) !== JSON.stringify(defaultViewPrefs('matrix').filters.assignees)) + Number(prefs.eisenhowerUrgent.join('|') !== 'overdue|today')
    + Number(prefs.eisenhowerImportant.join('|') !== '1|2')
    + Number(prefs.eisenhowerHorizon !== 'week')
    + Number(prefs.eisenhowerIncludeSomeday)
    + Number(workspaceChanged || prefs.eisenhowerWorkspace !== null);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const reset = () => {
    useStore.getState().setViewPrefs('matrix', defaultViewPrefs('matrix'));
    setPrefs({
    eisenhowerLayout: 'matrix',
    eisenhowerUrgent: ['overdue', 'today'],
    eisenhowerImportant: [1, 2],
    eisenhowerShowFuture: false,
    eisenhowerHorizon: 'week',
    eisenhowerIncludeSomeday: false,
    eisenhowerWorkspace: null,
  });
  };

  const toggleUrgent = (rule: EisenhowerUrgencyRule) => setPrefs({
    eisenhowerUrgent: prefs.eisenhowerUrgent.includes(rule)
      ? prefs.eisenhowerUrgent.filter((value) => value !== rule)
      : EISENHOWER_URGENCY_RULES.filter((value) =>
        value === rule || prefs.eisenhowerUrgent.includes(value)),
  });
  const toggleImportant = (priority: EisenhowerPriority) => setPrefs({
    eisenhowerImportant: prefs.eisenhowerImportant.includes(priority)
      ? prefs.eisenhowerImportant.filter((value) => value !== priority)
      : EISENHOWER_PRIORITIES.filter((value) =>
        value === priority || prefs.eisenhowerImportant.includes(value)),
  });

  return (
    <div className="displaywrap" ref={ref}>
      <button
        className="btn"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t('toolbar.display')}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="sliders" />
        <span className="tb-label">{t('toolbar.display')}</span>
        {changed > 0 && <span className="displaycount">{changed}</span>}
      </button>

      {open && (
        <PanelSheet className="popover displaypanel anchor-right" label={t('toolbar.display')} onClose={() => setOpen(false)}>
          <div className="panelhead">
            <h5>{t('toolbar.display')}</h5>
            <button className="resetbtn" onClick={reset}>{t('toolbar.resetAll')}</button>
          </div>

          <WorkspaceFilter viewKey="matrix" />
          <AssigneeFilter viewKey="matrix" />
          <div className="segmented">
            {(['list', 'matrix'] as MatrixLayout[]).map((layout) => (
              <button
                key={layout}
                aria-pressed={prefs.eisenhowerLayout === layout}
                onClick={() => setPrefs({ eisenhowerLayout: layout })}
              >
                <Icon name={layout === 'list' ? 'list' : 'dashboard'} size="sm" />
                <small>{t(`matrix.layout.${layout}` as TranslationKey)}</small>
              </button>
            ))}
          </div>

          <hr />
          <h5>{t('matrix.visible')}</h5>
          <Select ariaLabel={t('matrix.dateHorizon')} value={prefs.eisenhowerHorizon}
            options={MATRIX_HORIZONS.map(value => ({ value, label: t(`matrix.horizon.${value}` as TranslationKey), face: `${t('matrix.dateHorizon')}: ${t(`matrix.horizon.${value}` as TranslationKey)}` }))}
            onChange={value => setPrefs({ eisenhowerHorizon: value as MatrixHorizon })} />
          <div className="panelrow">
            <span>{t('matrix.includeSomeday')}</span>
            <button
              className="switch"
              role="switch"
              aria-checked={prefs.eisenhowerIncludeSomeday}
              aria-label={t('matrix.includeSomeday')}
              onClick={() => setPrefs({ eisenhowerIncludeSomeday: !prefs.eisenhowerIncludeSomeday })}
            />
          </div>


          {/* Toggle pills, like the filters of every other Display panel (#23). */}
          <h5>{t('matrix.urgent')}</h5>
          <div className="chiprow">
            {EISENHOWER_URGENCY_RULES.map((rule) => (
              <button
                key={rule}
                className="chip"
                aria-pressed={prefs.eisenhowerUrgent.includes(rule)}
                onClick={() => toggleUrgent(rule)}
              >
                {rule === 'week' ? t('matrix.urgent.week', { label: prefs.weekLabel }) : t(`matrix.urgent.${rule}` as TranslationKey)}
              </button>
            ))}
          </div>

          <h5>{t('matrix.important')}</h5>
          <div className="chiprow">
            {EISENHOWER_PRIORITIES.map((priority) => (
              <button
                key={priority}
                className="chip"
                aria-pressed={prefs.eisenhowerImportant.includes(priority)}
                onClick={() => toggleImportant(priority)}
              >
                <span className="flagdot" style={{ background: `var(--p${priority})` }} />
                P{priority}
              </button>
            ))}
          </div>
        </PanelSheet>
      )}
    </div>
  );
}
