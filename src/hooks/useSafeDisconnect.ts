import { useConfirm } from '@/components/overlays/Confirm';
import { pendingDeletes } from '@/store/helpers';
import { useStore } from '@/store/store';
import { useT } from './useT';

/** Explain what happens to work still waiting before signing out. */
export function useSafeDisconnect() {
  const confirm = useConfirm();
  const disconnect = useStore((state) => state.disconnect);
  const { t } = useT();
  return async () => {
    const state = useStore.getState();
    const count = state.pendingCount + [...pendingDeletes.values()].filter((entry) => !entry.queued).length;
    if (!state.demo && count > 0 && !(await confirm({
      title: t('sync.signOutPendingTitle'),
      body: t('sync.signOutPendingBody', { count }),
      confirmLabel: t('nav.signOut'),
    }))) return;
    await disconnect();
  };
}
