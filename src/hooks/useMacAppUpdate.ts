import { useEffect, useState } from 'react';
import { MAC_APP_LATEST } from '@/app-info';
import { macAppNeedsUpdate } from '@/domain/macApp';

const DISMISSED_KEY = 'tde.macapp.dismissed';
/** A test, or a release being checked before the constant is raised, can say which version is the newest. */
const LATEST_OVERRIDE_KEY = 'tde.macapp.latest';

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

/**
 * In the Mac app only: the newest version to offer, when the app is older than
 * it and the person has not already put that version away. Null otherwise.
 */
export function useMacAppUpdate(enabled: boolean): { latest: string; dismiss: () => void } | null {
  const bridge = window.enhancedDesktop;
  const latest = read(LATEST_OVERRIDE_KEY) ?? MAC_APP_LATEST;
  const [needed, setNeeded] = useState(false);
  const [away, setAway] = useState(() => read(DISMISSED_KEY) === latest);

  useEffect(() => {
    if (!enabled || !bridge || away) return;
    let live = true;
    // An app before 1.1.1 has no getVersion: it is offered the update as 1.1.0 or older.
    const asked = bridge.getVersion ? bridge.getVersion().catch(() => null) : Promise.resolve(null);
    void asked.then((version) => { if (live) setNeeded(macAppNeedsUpdate(version, latest)); });
    return () => { live = false; };
  }, [enabled, bridge, away, latest]);

  if (!enabled || !bridge || away || !needed) return null;
  return {
    latest,
    dismiss: () => {
      try { localStorage.setItem(DISMISSED_KEY, latest); } catch { /* storage blocked: it is back next launch */ }
      setAway(true);
    },
  };
}
