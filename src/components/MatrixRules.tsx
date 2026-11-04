import { Icon } from './Icon';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import { matrixRulesFor } from '@/domain/eisenhower';
import type { MatrixOverrides } from '@/domain/types';
import {
  EISENHOWER_PRIORITIES,
  EISENHOWER_URGENCY_RULES,
  type EisenhowerPriority,
  type EisenhowerUrgencyRule,
  type MatrixLayout,
} from '@/store/prefs';
import type { TranslationKey } from '@/i18n';

/**
 * Where the matrix settings live. On the Matrix page they are the global ones.
 * On another page (a project, a tag, a filter) they start as a copy of those
 * and the page keeps its own once the user changes one, so the two never
 * affect each other.
 */
export interface MatrixScope {
  urgent: EisenhowerUrgencyRule[];
  important: EisenhowerPriority[];
  layout: MatrixLayout;
  set: (patch: MatrixOverrides) => void;
  /** Only a page with settings of its own can go back to following the Matrix page. */
  custom?: boolean;
  follow?: () => void;
}

/** The global settings, the ones of the Matrix page. */
export function useGlobalMatrix(): MatrixScope {
  const prefs = useStore((s) => s.prefs);
  const setPrefs = useStore((s) => s.setPrefs);
  const rules = matrixRulesFor(prefs);
  return {
    ...rules,
    set: (patch) => setPrefs({
      ...(patch.urgent ? { eisenhowerUrgent: patch.urgent } : {}),
      ...(patch.important ? { eisenhowerImportant: patch.important } : {}),
      ...(patch.layout ? { eisenhowerLayout: patch.layout } : {}),
    }),
  };
}

/** One page's settings: its own where it has them, the Matrix page's otherwise. */
export function usePageMatrix(own: MatrixOverrides | undefined, save: (next: MatrixOverrides | undefined) => void): MatrixScope {
  const prefs = useStore((s) => s.prefs);
  const rules = matrixRulesFor(prefs, own);
  return {
    ...rules,
    /* The first change copies what the page followed, so it keeps all three from then on. */
    set: (patch) => save({ ...rules, ...own, ...patch }),
    custom: own !== undefined,
    follow: () => save(undefined),
  };
}

/** Matrix or list: how the four quadrants are drawn. */
export function MatrixLayoutToggle({ scope }: { scope: MatrixScope }) {
  const { t } = useT();
  return (
    <div className="segmented" role="group" aria-label={t('matrix.layout')}>
      {(['list', 'matrix'] as MatrixLayout[]).map((option) => (
        <button key={option} type="button" aria-pressed={scope.layout === option} onClick={() => scope.set({ layout: option })}>
          <Icon name={option === 'list' ? 'list' : 'dashboard'} size="sm" />
          <small>{t(`matrix.layout.${option}` as TranslationKey)}</small>
        </button>
      ))}
    </div>
  );
}

/**
 * What makes a task urgent and what makes it important: the two rules that
 * put a task in a quadrant. Toggle pills, like the filters of every other
 * Display panel (#23).
 */
export function MatrixRules({ scope }: { scope: MatrixScope }) {
  const { t } = useT();
  const weekLabel = useStore((s) => s.prefs.weekLabel);

  const toggleUrgent = (rule: EisenhowerUrgencyRule) => scope.set({
    urgent: scope.urgent.includes(rule)
      ? scope.urgent.filter((value) => value !== rule)
      : EISENHOWER_URGENCY_RULES.filter((value) => value === rule || scope.urgent.includes(value)),
  });
  const toggleImportant = (priority: EisenhowerPriority) => scope.set({
    important: scope.important.includes(priority)
      ? scope.important.filter((value) => value !== priority)
      : EISENHOWER_PRIORITIES.filter((value) => value === priority || scope.important.includes(value)),
  });

  return (
    <>
      <h5>{t('matrix.urgent')}</h5>
      <div className="chiprow">
        {EISENHOWER_URGENCY_RULES.map((rule) => (
          <button key={rule} type="button" className="chip" aria-pressed={scope.urgent.includes(rule)} onClick={() => toggleUrgent(rule)}>
            {rule === 'week' ? t('matrix.urgent.week', { label: weekLabel }) : t(`matrix.urgent.${rule}` as TranslationKey)}
          </button>
        ))}
      </div>

      <h5>{t('matrix.important')}</h5>
      <div className="chiprow">
        {EISENHOWER_PRIORITIES.map((priority) => (
          <button key={priority} type="button" className="chip" aria-pressed={scope.important.includes(priority)} onClick={() => toggleImportant(priority)}>
            <span className="flagdot" style={{ background: `var(--p${priority})` }} />
            P{priority}
          </button>
        ))}
      </div>

      {scope.follow && (
        scope.custom
          ? <button type="button" className="resetbtn" onClick={scope.follow}>{t('matrix.followPage')}</button>
          : <p className="calendar-pref-hint">{t('matrix.followsPage')}</p>
      )}
    </>
  );
}
