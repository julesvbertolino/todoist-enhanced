import { useEffect, useRef, useState } from 'react';
import { useT } from '@/hooks/useT';
import { formatDuration, parseDurationInput } from '@/domain/estimates';

interface EstimateFieldProps {
  /** Current value in minutes, or null when the task has no estimate. */
  minutes: number | null;
  onCommit: (minutes: number | null) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
  placeholder?: string;
  unitLabel?: string;
  inputMode?: 'numeric' | 'text';
  /**
   * Reports every keystroke, for a list that holds its answers and saves them
   * in one go rather than writing each field as it is left.
   */
  onChange?: (minutes: number | null) => void;
  /**
   * Moves focus along the list the field belongs to. Enter and Tab both ask
   * for the next one, Shift+Tab for the one before.
   */
  onAdvance?: (field: HTMLInputElement, direction: 1 | -1) => void;
}

/**
 * The one way an estimate is entered anywhere in the product.
 *
 * A number, then the unit spelled out beside it, so there is never a bare box
 * whose meaning has to be guessed. Anything a person would reasonably type is
 * accepted and normalised: 25, 1h15, 90 min.
 */
export function EstimateField({
  minutes, onCommit, onCancel, autoFocus, placeholder, onChange, onAdvance, unitLabel, inputMode = 'numeric',
}: EstimateFieldProps) {
  const { t, locale } = useT();
  /* Said as a duration ("45 min", "1 h 30") and typed as one, so there is no unit to put beside it. */
  const show = (value: number | null) => (value === null ? '' : formatDuration(value, locale));
  const [draft, setDraft] = useState(show(minutes));
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Not while it is being filled in — see EditableTitle for the same guard.
    if (document.activeElement === ref.current) return;
    setDraft(show(minutes));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `show` only reads the locale
  }, [minutes, locale]);

  const parsed = parseDurationInput(draft);
  const invalid = draft.trim() !== '' && parsed === null;

  function commit() {
    if (draft.trim() === '') {
      onCommit(null);
      return;
    }
    if (parsed === null) return;
    onCommit(parsed);
  }

  return (
    <span className={`estfield${invalid ? ' invalid' : ''}`}>
      <input
        ref={ref}
        className="estinput"
        inputMode={inputMode}
        autoFocus={autoFocus}
        /* Also claims the focus a dialog hands out on opening, which lands on
           the close button otherwise. */
        data-autofocus={autoFocus || undefined}
        value={draft}
        placeholder={placeholder ?? t('task.estimatePlaceholder')}
        aria-label={t('task.setEstimate')}
        aria-invalid={invalid || undefined}
        onChange={(e) => {
          setDraft(e.target.value);
          if (onChange) {
            const next = e.target.value.trim();
            onChange(next === '' ? null : parseDurationInput(next));
          }
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            // Validate, and nothing else: no dialog closing behind it, no row
            // re-opening, no form submitting.
            e.preventDefault();
            e.stopPropagation();
            commit();
            if (onAdvance) onAdvance(e.currentTarget, 1);
          }
          /* Tab is what a hand filling a column reaches for, and left alone it
             lands on whatever sits between the rows. Keep it on the fields. */
          if (e.key === 'Tab' && onAdvance) {
            e.preventDefault();
            commit();
            onAdvance(e.currentTarget, e.shiftKey ? -1 : 1);
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            /* Somewhere to cancel back to — a menu that opened for this and
               nothing else — and Escape closes it, unchanged. Where there is
               not, the field is a property of the thing being edited and
               Escape simply leaves it, saving on the way out exactly as
               clicking away would. Either way it stops here: there is no
               reading of Escape in a field that means "close the dialog". */
            if (onCancel) {
              setDraft(show(minutes));
              onCancel();
              return;
            }
            commit();
            e.currentTarget.blur();
          }
        }}
      />
      {unitLabel && <span className="estunit" aria-hidden="true">{unitLabel}</span>}
    </span>
  );
}
