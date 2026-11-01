import { calendarDue, calendarMinutes } from '@/domain/calendar';
import { withoutHorizons, type Item } from '@/domain/types';
import { useStore } from './store';
import { translate } from '@/i18n';

/** Route calendar edits through the ordinary offline queue and duration checks.
 * Both a date and an estimate change form one undo, also when done offline. */
export async function scheduleCalendarTask(id: string, day: Date, minutes: number | null, duration?: number) {
  const state = useStore.getState();
  const item: Item | undefined = state.snapshot.items[id];
  if (!item || item.checked || item.is_deleted || item.projection) return;
  const patch: Record<string, unknown> = {
    due: calendarDue(item, day, minutes),
    labels: withoutHorizons(item.labels),
  };
  if (minutes !== null) patch.estimateMinutes = duration ?? calendarMinutes(item);
  const done = state.updateTask(id, patch);
  state.toast(translate(state.prefs.locale, duration === undefined ? 'calendar.moved' : 'calendar.resized'), async () => {
    await done;
    await useStore.getState().updateTask(id, { due: item.due, labels: item.labels,
      ...(minutes !== null && state.prefs.estimateStorage === 'duration' ? { duration: item.duration } : {}),
    });
  });
  await done;
}
