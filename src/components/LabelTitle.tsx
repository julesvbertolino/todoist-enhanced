import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/store';
import { useT } from '@/hooks/useT';
import { labelRenameError, cleanLabelName, reservedLabel } from '@/domain/renameLabel';
export function LabelTitle({ name }: { name: string }) {
  const { t } = useT();
  const snapshot = useStore((s) => s.snapshot);
  const week = useStore((s) => s.prefs.weekLabel);
  const rename = useStore((s) => s.renameLabel);
  const entry = Object.entries(snapshot.labels).find(([, l]) => l.name === name && !l.is_deleted);
  const label = entry?.[1];
  const id = entry?.[0];
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState<'empty' | 'reserved' | 'duplicate' | null>(null);
  const cancel = useRef(false);
  useEffect(() => { setDraft(name); setError(null); }, [name]);
  if (!label || reservedLabel(name, week)) return <>{name}</>;
  function commit() {
    if (cancel.current) { cancel.current = false; return; }
    if (draft.trim() === name) return;
    const next = cleanLabelName(draft);
    if (next === name) return;
    const reason = id ? labelRenameError(snapshot, id, next, week) : 'empty';
    if (reason) { setDraft(name); setError(reason); return; }
    setError(null); void rename(id!, next);
  }
  return <><input className="titlefield" value={draft} size={Math.max(1, draft.length)} aria-label={t('label.rename')} aria-invalid={!!error || undefined}
    onChange={(e) => { setDraft(e.target.value); setError(null); }} onBlur={commit}
    onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
      if (e.key === 'Escape') { e.preventDefault(); cancel.current = true; setDraft(name); setError(null); e.currentTarget.blur(); } }} />
    {error && <span className="label-rename-error" role="alert">{t(`label.rename${error === 'empty' ? 'Empty' : error === 'reserved' ? 'Reserved' : 'Duplicate'}`)}</span>}</>;
}
