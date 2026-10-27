import { describe, expect, it, vi } from 'vitest';
import { confirmUndatedMove, registerMoveConfirmation } from './confirmUndatedMove';
import type { Item } from './types';
const repeating = { due: { is_recurring: true } } as Item;
describe('moving a series to an undated destination (#332)', () => {
  it('does not ask for non-recurring or dated moves', async () => {
    const ask = vi.fn(async () => false); const clean = registerMoveConfirmation(ask);
    expect(await confirmUndatedMove([repeating], { kind: 'today' }, 'en')).toBe(true);
    expect(await confirmUndatedMove([{ due: null } as Item], { kind: 'anytime' }, 'en')).toBe(true);
    expect(ask).not.toHaveBeenCalled(); clean();
  });
  it('asks once for a mixed selection and honours cancellation', async () => {
    const ask = vi.fn(async () => false); const clean = registerMoveConfirmation(ask);
    expect(await confirmUndatedMove([repeating, repeating], { kind: 'anytime' }, 'en')).toBe(false);
    expect(ask).toHaveBeenCalledTimes(1); clean();
  });
  it('requires explicit confirmation for Someday too', async () => {
    const ask = vi.fn(async () => true); const clean = registerMoveConfirmation(ask);
    expect(await confirmUndatedMove([repeating], { kind: 'someday' }, 'fr')).toBe(true);
    expect(ask.mock.calls).toHaveLength(1); clean();
    expect(await confirmUndatedMove([repeating], { kind: 'someday' }, 'fr')).toBe(false);
  });
});
