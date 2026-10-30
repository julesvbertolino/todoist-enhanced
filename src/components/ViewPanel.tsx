import { useMemo, useState } from 'react';
import { Icon, type IconName } from '@/components/Icon';
import { AnchoredPanel } from '@/components/AnchoredPanel';
import { DisplayFields } from '@/components/DisplayFields';
import { PROJECT_GROUPS, PROJECT_SORTS } from '@/components/DisplayMenu';
import { VIEW_MODES } from '@/components/viewModes';
import { useConfirm } from '@/components/overlays/Confirm';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import { viewPrefs } from '@/store/prefs';
import { cloneSettings } from '@/domain/projectViews';
import { defaultViewPrefs, type ViewPrefs } from '@/domain/types';
import type { TranslationKey } from '@/i18n';
import type { ProjectViewsApi } from '@/hooks/useProjectViews';

/** A round button with an icon and nothing else: its name is its tooltip. */
function RoundAction({ icon, label, kind, disabled, onClick }: {
  icon: IconName; label: string; kind?: 'primary' | 'danger'; disabled?: boolean; onClick: () => void;
}) {
  return (
    <button type="button" className={`vround${kind ? ` ${kind}` : ''}`} aria-label={label} title={label} aria-disabled={disabled}
      onClick={() => { if (!disabled) onClick(); }}>
      <Icon name={icon} size="sm" />
    </button>
  );
}

/** The name of a view, and everything it is made of: the same in the window that adds one and the panel that edits it. */
function ViewBody({ api, name, onName, onNameBlur, onNameEnter, value, onChange }: {
  api: ProjectViewsApi;
  name: string; onName: (value: string) => void; onNameBlur?: () => void; onNameEnter?: () => void;
  value: ViewPrefs; onChange: (patch: Partial<ViewPrefs>) => void;
}) {
  const { t } = useT();
  const labels = useStore((s) => s.snapshot.labels);
  const tags = useMemo(
    () => Object.values(labels).filter((label) => !label.name.startsWith('est-') && !label.name.startsWith('step-')),
    [labels],
  );
  return (
    <>
      <input
        className="viewname" value={name} maxLength={60} placeholder={t('views.namePlaceholder')} aria-label={t('views.name')} autoFocus
        onChange={(event) => onName(event.target.value)} onBlur={onNameBlur}
        onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); onNameEnter?.(); } }}
      />
      <DisplayFields
        value={value} onChange={onChange} viewKey={api.keyOf('draft')} modes={VIEW_MODES} groups={PROJECT_GROUPS} sorts={PROJECT_SORTS}
        tags={tags} completedToggle scheduledLabel={value.mode === 'calendar' ? undefined : 'filter.includeScheduled'}
      />
    </>
  );
}

/** The panel that adds a view: the one that edits a view, hanging from the plus, with a view made at the end. */
export function NewViewPanel({ api, anchor, onClose }: { api: ProjectViewsApi; anchor: HTMLElement; onClose: () => void }) {
  const { t } = useT();
  const prefs = useStore((s) => s.prefs);
  const [name, setName] = useState('');
  const [draft, setDraft] = useState<ViewPrefs>(() => defaultViewPrefs(api.keyOf('draft')));
  const create = () => {
    api.add(name || t(`toolbar.${draft.mode}` as TranslationKey), draft);
    onClose();
  };
  return (
    <AnchoredPanel anchor={anchor} onClose={onClose} label={t('views.panelNew')} className="viewpanel viewnew">
      <div className="viewhead">
        <h5>{t('views.panelNew')}</h5>
        <div className="vactions">
          <RoundAction icon="close" label={t('views.cancel')} onClick={onClose} />
          <RoundAction icon="copy" label={t('views.duplicateCurrent')} onClick={() => setDraft(cloneSettings(viewPrefs(prefs, api.activeKey)))} />
          <RoundAction icon="check" label={t('views.create')} kind="primary" onClick={create} />
        </div>
      </div>
      <ViewBody api={api} name={name} onName={setName} onNameEnter={create} value={draft} onChange={(patch) => setDraft((now) => ({ ...now, ...patch }))} />
    </AnchoredPanel>
  );
}

/** The panel that changes a view, hanging from its pill: saved as it is touched. */
export function EditViewPanel({ api, id, anchor, onClose }: { api: ProjectViewsApi; id: string; anchor: HTMLElement; onClose: () => void }) {
  const { t } = useT();
  const confirm = useConfirm();
  const prefs = useStore((s) => s.prefs);
  const setView = useStore((s) => s.setViewPrefs);
  const tab = api.tabs.find((one) => one.id === id);
  const [name, setName] = useState(tab?.name ?? '');
  if (!tab) return null;
  const key = api.keyOf(id);
  const cur = viewPrefs(prefs, key);
  const last = api.tabs.length < 2;
  const commit = () => { if (name.trim() && name.trim() !== tab.name) api.rename(id, name); };
  const close = () => { commit(); onClose(); };
  const ask = async () => {
    onClose();
    const ok = await confirm({
      title: t('views.deleteTitle'), body: t('views.deleteBody', { name: tab.name }), confirmLabel: t('views.delete'), destructive: true,
    });
    if (ok) api.remove(id);
  };
  return (
    <AnchoredPanel anchor={anchor} onClose={close} label={t('views.actions', { name: tab.name })} className="viewpanel viewedit">
      <div className="viewhead">
        <h5>{t('views.panel')}</h5>
        <div className="vactions">
          <RoundAction icon="reset" label={t('views.reset')} onClick={() => api.reset(id)} />
          <RoundAction icon="copy" label={t('views.duplicate')} disabled={api.full} onClick={() => { api.duplicate(id); onClose(); }} />
          <RoundAction icon="trash" label={last ? t('views.deleteLast') : t('views.delete')} kind="danger" disabled={last} onClick={() => void ask()} />
          <RoundAction icon="check" label={t('views.done')} kind="primary" onClick={close} />
        </div>
      </div>
      <ViewBody api={api} name={name} onName={setName} onNameBlur={commit} onNameEnter={close} value={cur}
        onChange={(patch) => { if (patch.mode && Object.keys(patch).length === 1) api.setMode(id, patch.mode); else setView(key, patch); }} />
    </AnchoredPanel>
  );
}

