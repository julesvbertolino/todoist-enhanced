import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import { PERSONAL_WORKSPACE } from '@/store/selectors';
import {
  EISENHOWER_PRIORITIES,
  EISENHOWER_URGENCY_RULES,
  type EisenhowerPriority,
  type EisenhowerUrgencyRule,
  type MatrixLayout,
} from '@/store/prefs';
import type { TranslationKey } from '@/i18n';

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
  const workspaces = Object.values(snapshot.workspaces);
  /* Matrix or list is how the page is drawn, not a setting on what it
     shows: like list or board on the other pages, it does not count. */
  const changed = Number(prefs.eisenhowerUrgent.join('|') !== 'overdue|today')
    + Number(prefs.eisenhowerImportant.join('|') !== '1|2')
    + Number(prefs.eisenhowerShowFuture)
    + Number(prefs.eisenhowerIncludeSomeday)
    + Number(prefs.eisenhowerWorkspace !== null);

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

  const reset = () => setPrefs({
    eisenhowerLayout: 'matrix',
    eisenhowerUrgent: ['overdue', 'today'],
    eisenhowerImportant: [1, 2],
    eisenhowerShowFuture: false,
    eisenhowerIncludeSomeday: false,
    eisenhowerWorkspace: null,
  });

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
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="sliders" />
        {t('toolbar.display')}
        {changed > 0 && <span className="displaycount">{changed}</span>}
      </button>

      {open && (
        <div className="popover displaypanel anchor-right" role="dialog" aria-label={t('toolbar.display')}>
          <div className="panelhead">
            <h5>{t('toolbar.display')}</h5>
            <button className="resetbtn" onClick={reset}>{t('toolbar.resetAll')}</button>
          </div>

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
          <div className="panelrow">
            <span>{t('matrix.showFuture')}</span>
            <button
              className="switch"
              role="switch"
              aria-checked={prefs.eisenhowerShowFuture}
              aria-label={t('matrix.showFuture')}
              onClick={() => setPrefs({ eisenhowerShowFuture: !prefs.eisenhowerShowFuture })}
            />
          </div>
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

          {/* "My projects" isn't a workspace Todoist hands back — it's the
              absence of one — so this has nothing to offer it against until
              the account has added a real workspace. */}
          {workspaces.length > 0 && (
            <>
              <h5>{t('filter.workspaces')}</h5>
              <div className="segmented small">
                <button
                  aria-pressed={prefs.eisenhowerWorkspace === null}
                  onClick={() => setPrefs({ eisenhowerWorkspace: null })}
                >
                  <small>{t('filter.any')}</small>
                </button>
                <button
                  aria-pressed={prefs.eisenhowerWorkspace === PERSONAL_WORKSPACE}
                  onClick={() => setPrefs({ eisenhowerWorkspace: PERSONAL_WORKSPACE })}
                >
                  <small>{t('nav.myProjects')}</small>
                </button>
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    aria-pressed={prefs.eisenhowerWorkspace === workspace.id}
                    onClick={() => setPrefs({ eisenhowerWorkspace: workspace.id })}
                  >
                    <small>{workspace.name}</small>
                  </button>
                ))}
              </div>
            </>
          )}

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
                {t(`matrix.urgent.${rule}` as TranslationKey)}
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
          <p className="displayhelp">{t('matrix.settings.help')}</p>
        </div>
      )}
    </div>
  );
}
