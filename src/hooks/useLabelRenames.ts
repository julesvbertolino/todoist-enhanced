import { useEffect, useRef } from 'react';
import { useStore } from '@/store/store';
import { navigate, parseRoute } from './useRoute';
export function useLabelRenames() {
  const labels = useStore((s) => s.snapshot.labels);
  const previous = useRef(labels);
  useEffect(() => {
    const state = useStore.getState();
    let views = state.prefs.views;
    for (const label of Object.values(labels)) {
      const old = previous.current[label.id]?.name;
      if (!old || old === label.name) continue;
      const from = `label:${old}`, to = `label:${label.name}`;
      views = { ...views };
      if (views[from]) { views[to] = views[from]; delete views[from]; }
      for (const [key, view] of Object.entries(views)) {
        views[key] = { ...view, filters: { ...view.filters, labels: view.filters.labels.map((name) => name === old ? label.name : name) } };
      }
      const route = parseRoute(window.location.hash);
      if (route.view === 'label' && route.id === old) navigate('label', label.name);
    }
    if (views !== state.prefs.views) state.setPrefs({ views });
    previous.current = labels;
  }, [labels]);
}
