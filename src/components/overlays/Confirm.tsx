import { registerMoveConfirmation } from '@/domain/confirmUndatedMove';
import { createContext, useCallback, useEffect, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Overlay } from './Overlay';
import { useT } from '@/hooks/useT';

/**
 * Confirmation, asked inside the app.
 *
 * The browser's own dialog cannot be styled, steals the window, and reads as
 * something the page did to you rather than something the page is asking. This
 * puts the same question in the product's own language and layout.
 */

export interface ConfirmRequest {
  title: string;
  /** The consequence, spelled out. */
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Paints the confirming button as destructive. */
  destructive?: boolean;
  /** A third way out, between cancelling and confirming: "Archive" beside "Delete". */
  alternateLabel?: string;
}

type Ask = (request: ConfirmRequest) => Promise<boolean>;
export type Choice = 'cancel' | 'alternate' | 'confirm';
type AskChoice = (request: ConfirmRequest) => Promise<Choice>;

const ConfirmContext = createContext<Ask | null>(null);
const ChoiceContext = createContext<AskChoice | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useT();
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const resolver = useRef<((value: Choice) => void) | null>(null);

  const askChoice = useCallback<AskChoice>((next) => {
    /* A question asked while another is open replaces it, and the first must
       still be answered: its promise would never settle, and whatever awaits
       it would wait for good (#125). Closing over it counts as "no". */
    resolver.current?.('cancel');
    setRequest(next);
    return new Promise<Choice>((resolve) => {
      resolver.current = resolve;
    });
  }, []);
  const ask = useCallback<Ask>((next) => askChoice(next).then((choice) => choice === 'confirm'), [askChoice]);

  useEffect(() => registerMoveConfirmation(ask), [ask]);

  const settle = useCallback((value: Choice) => {
    setRequest(null);
    resolver.current?.(value);
    resolver.current = null;
  }, []);

  const value = useMemo(() => ask, [ask]);

  return (
    <ConfirmContext.Provider value={value}>
      <ChoiceContext.Provider value={askChoice}>
      {children}

      {request && (
        <Overlay open onClose={() => settle('cancel')} label={request.title} size="sm">
          {/* Cmd+Enter answers yes wherever the focus happens to be. It is the
              app's "do it" everywhere else — it saves in the composer and in
              the task panel — and a question that can only be answered by
              aiming at a button is not answerable from the keyboard. */}
          <div
            className="confirmbox"
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || !(e.metaKey || e.ctrlKey)) return;
              e.preventDefault();
              e.stopPropagation();
              settle('confirm');
            }}
          >
            <h2>{request.title}</h2>
            {request.body && <p className="confirmbody">{request.body}</p>}
            <div className="confirmactions">
              <button className="btn quiet" onClick={() => settle('cancel')}>
                {request.cancelLabel ?? t('common.cancel')}
              </button>
              {request.alternateLabel && (
                <button className="btn" onClick={() => settle('alternate')}>
                  {request.alternateLabel}
                </button>
              )}
              {/* `autoFocus` is not enough on its own: the dialog shell moves
                  the focus itself once it is up, and without a marker it takes
                  the first focusable thing in the box — which is Cancel,
                  written first so the pair reads left to right. Enter then
                  answered no, every time, and there was no way through this
                  dialog from a keyboard at all. */}
              <button
                className={`btn ${request.destructive ? 'danger' : 'primary'}`}
                data-autofocus
                onClick={() => settle('confirm')}
              >
                {request.confirmLabel ?? t('common.confirm')}
              </button>
            </div>
          </div>
        </Overlay>
      )}
      </ChoiceContext.Provider>
    </ConfirmContext.Provider>
  );
}

/** Asks the question and resolves to what the user chose. */
export function useConfirm(): Ask {
  const ask = useContext(ConfirmContext);
  if (!ask) throw new Error('useConfirm used outside ConfirmProvider');
  return ask;
}

/** Like useConfirm, for a question with a second answer: which of the three was chosen. */
export function useChoice(): AskChoice {
  const ask = useContext(ChoiceContext);
  if (!ask) throw new Error('useChoice used outside ConfirmProvider');
  return ask;
}
