import { useEffect, useMemo, useRef, useState } from 'react';
import { Overlay } from './Overlay';
import { Icon } from '../Icon';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import { EstimateField } from '../EstimateField';
import { formatDuration } from '@/domain/estimates';
import { toDisplayPriority, type Item } from '@/domain/types';
import { markerStyle } from '@/domain/colors';
import { plainTitle } from '@/domain/markdown';

interface EstimateBulkProps {
  /** The tasks to put a number on. */
  items: Item[];
  onOpen: (id: string) => void;
  /** Called once the batch has been written. */
  onDone: () => void;
  /** Resets the drafts — pass something that changes when the list is re-opened. */
  resetKey?: unknown;
}

/**
 * Filling in a set of missing estimates.
 *
 * Nothing is written while you type: Tab walks down the column, the total at
 * the foot adds up as it fills, and one button saves the lot. A pass over a
 * page is one decision and one request, not fifteen.
 *
 * It is a component rather than part of the dialog around it because two
 * surfaces ask this same question — the count in a page header, and the "no
 * estimate" tab of Things to settle — and the second one had drifted into a
 * plain read-only list with no way to answer from it.
 */
export function EstimateBulk({ items, onOpen, onDone, resetKey }: EstimateBulkProps) {
  const { t, locale } = useT();
  const snapshot = useStore((s) => s.snapshot);
  const setEstimates = useStore((s) => s.setEstimates);
  const listRef = useRef<HTMLDivElement>(null);

  /** What has been typed but not yet written back. */
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  // Each opening starts from nothing, including one that follows a save.
  useEffect(() => {
    setDrafts({});
    setSaving(false);
  }, [resetKey]);

  const filled = useMemo(() => Object.entries(drafts), [drafts]);
  const total = useMemo(
    () => filled.reduce((sum, [, minutes]) => sum + minutes, 0),
    [filled],
  );

  const record = (id: string, minutes: number | null) =>
    setDrafts((prev) => {
      if (minutes === null) {
        if (!(id in prev)) return prev;
        const { [id]: _removed, ...rest } = prev;
        return rest;
      }
      if (prev[id] === minutes) return prev;
      return { ...prev, [id]: minutes };
    });

  /** Tab and Enter walk the column of fields, skipping everything between. */
  const move = (field: HTMLInputElement, direction: 1 | -1) => {
    const fields = Array.from(listRef.current?.querySelectorAll('input') ?? []);
    const next = fields[fields.indexOf(field) + direction];
    if (next) next.focus();
    else if (direction === 1) field.blur();
  };

  async function save() {
    if (filled.length === 0 || saving) return;
    setSaving(true);
    await setEstimates(filled.map(([id, minutes]) => ({ id, minutes })));
    onDone();
  }

  return (
    <>
      <div className="sheet-body">
        {items.length === 0 ? (
          <p className="empty">{t('issues.none')}</p>
        ) : (
          <>
            <div className="estlist" ref={listRef}>
              {items.map((item, index) => {
                const project = snapshot.projects[item.project_id];
                return (
                  <div
                    className={`estrow${drafts[item.id] !== undefined ? ' filled' : ''}`}
                    key={item.id}
                  >
                    <span className={`check p${toDisplayPriority(item.priority)}`} aria-hidden="true">
                      <Icon name="check" />
                    </span>

                    <button
                      className="estname"
                      /* Out of the tab order: Tab belongs to the fields here,
                         and the row is still reachable by pointer and by the
                         task list behind this sheet. */
                      tabIndex={-1}
                      onClick={() => onOpen(item.id)}
                    >
                      <span className="ttitle">{plainTitle(item.content)}</span>
                      {project && !project.inbox_project && (
                        <span className="meta">
                          <span className="hash" style={markerStyle(project.color)}>#</span>
                          {project.name}
                        </span>
                      )}
                    </button>

                    <EstimateField
                      minutes={null}
                      autoFocus={index === 0}
                      onChange={(minutes) => record(item.id, minutes)}
                      onCommit={(minutes) => record(item.id, minutes)}
                      onAdvance={move}
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {items.length > 0 && (
        <div className="sheet-foot estfoot">
          {/* What the pass adds up to, so the number is read before it lands,
              and what the keyboard does and when anything is written. */}
          <span className="estfoot-tally">
            {t('issues.estimateFilled', { count: filled.length, total: items.length })}
            {total > 0 && <b>{formatDuration(total, locale)}</b>}
            <span className="estfoot-hint">{t('issues.estimateHint')}</span>
          </span>
          <button className="btn quiet" onClick={onDone}>{t('common.cancel')}</button>
          <button
            className="btn primary"
            disabled={filled.length === 0 || saving}
            onClick={() => void save()}
          >
            {t('common.save')}
          </button>
        </div>
      )}
    </>
  );
}

interface UnestimatedProps {
  open: boolean;
  onClose: () => void;
  /** The tasks on the current page that carry no estimate. */
  items: Item[];
  onOpen: (id: string) => void;
}

/** The same pass, opened from the count in a page header. */
export function Unestimated({ open, onClose, items, onOpen }: UnestimatedProps) {
  const { t } = useT();

  return (
    <Overlay open={open} onClose={onClose} label={t('unest.title')} size="sm">
      <div className="sheet-head unest-head">
        <div>
          <h2>{t('unest.title')}</h2>
          <p className="psub">{t('unest.intro', { count: items.length })}</p>
        </div>
        <button className="iconbtn" aria-label={t('common.close')} onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>

      <EstimateBulk
        items={items}
        resetKey={open}
        onOpen={(id) => { onOpen(id); onClose(); }}
        onDone={onClose}
      />
    </Overlay>
  );
}
