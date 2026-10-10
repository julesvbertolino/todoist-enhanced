import { describe, expect, it } from 'vitest';
import {
  countDetailChanges, defaultDetailOrder, defaultTaskFields, moveDetailChip, readDetailOrder,
  readTaskFields, visibleDetailChips,
} from './taskDetails';

describe('readTaskFields', () => {
  it('shows everything for a v1 account, which has no such setting', () => {
    expect(readTaskFields(undefined)).toEqual(defaultTaskFields());
    expect(readTaskFields(7)).toEqual(defaultTaskFields());
  });

  it('turns off only what was turned off', () => {
    const fields = readTaskFields({ description: false, labels: 0, project: 'no' });
    expect(fields.description).toBe(false);
    expect(fields.labels).toBe(true);
    expect(fields.project).toBe(true);
  });
});

describe('readDetailOrder', () => {
  it('starts from the default order', () => {
    expect(readDetailOrder(undefined)).toEqual(['estimate', 'date', 'deadline', 'labels', 'project']);
  });

  it('keeps the order given, once each, and completes it', () => {
    expect(readDetailOrder(['project', 'bogus', 'date', 'project'])).toEqual(
      ['project', 'date', 'estimate', 'deadline', 'labels'],
    );
  });
});

describe('the chips a row draws', () => {
  it('follow the order and leave out what is off', () => {
    const fields = { ...defaultTaskFields(), deadline: false };
    expect(visibleDetailChips(['project', 'deadline', 'date', 'estimate', 'labels'], fields))
      .toEqual(['project', 'date', 'estimate', 'labels']);
  });
});

describe('moveDetailChip', () => {
  it('moves one chip and keeps the rest in order', () => {
    expect(moveDetailChip(defaultDetailOrder(), 'project', 0))
      .toEqual(['project', 'estimate', 'date', 'deadline', 'labels']);
  });
});

describe('countDetailChanges', () => {
  it('counts a hidden field each, and a changed order once', () => {
    expect(countDetailChanges(defaultDetailOrder(), defaultTaskFields())).toBe(0);
    expect(countDetailChanges(moveDetailChip(defaultDetailOrder(), 'project', 0), { ...defaultTaskFields(), description: false })).toBe(2);
  });
});
