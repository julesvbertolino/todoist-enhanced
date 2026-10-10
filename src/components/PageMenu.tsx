import { useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from './Icon';
import { useT } from '@/hooks/useT';

export interface PageMenuItem {
  key: string;
  label: string;
  icon?: IconName;
  /** Drawn with a tick: the current choice among several. */
  checked?: boolean;
  onPick: () => void;
}

/**
 * The three dots on a page that is not a project: what can be done to the page
 * itself, in one small list. A project has its own, richer menu.
 */
export function PageMenu({ items, label }: { items: PageMenuItem[]; label?: string }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  const name = label ?? t('page.actions');

  useEffect(() => {
    if (!open) return;
    const away = (event: MouseEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', escape); };
  }, [open]);

  return (
    <span className="pmenu-wrap pagemenu" ref={wrap}>
      <button
        type="button"
        className="iconbtn"
        aria-label={name}
        title={name}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="more" />
      </button>
      {open && (
        <div className="popover pagemenu-list" role="menu" aria-label={name}>
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              className="opt"
              role="menuitemradio"
              aria-checked={item.checked}
              onClick={() => { setOpen(false); item.onPick(); }}
            >
              {item.icon && <Icon name={item.icon} size="sm" />}
              <span>{item.label}</span>
              {item.checked && <Icon name="check" size="sm" />}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}
