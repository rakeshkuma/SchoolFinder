import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLocalFlag, createLocalList } from './localList';

describe('createLocalList', () => {
  beforeEach(() => window.localStorage.clear());

  it('keeps the newest item first, de-duplicates and caps the length', () => {
    const list = createLocalList<string>('t1', 3, (s) => s);
    ['a', 'b', 'c', 'a', 'd'].forEach(list.add);
    expect(list.get()).toEqual(['d', 'a', 'c']);
    expect(JSON.parse(window.localStorage.getItem('t1') ?? '[]')).toEqual(['d', 'a', 'c']);
  });

  it('notifies subscribers and supports remove and clear', () => {
    const list = createLocalList<{ id: number }>('t2', 5, (s) => String(s.id));
    const listener = vi.fn();
    const unsubscribe = list.subscribe(listener);
    list.add({ id: 1 });
    list.add({ id: 2 });
    list.remove({ id: 1 });
    expect(list.get()).toEqual([{ id: 2 }]);
    list.clear();
    expect(list.get()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(4);
    unsubscribe();
    list.add({ id: 3 });
    expect(listener).toHaveBeenCalledTimes(4);
  });

  it('ignores corrupt stored data and still works when storage throws', () => {
    window.localStorage.setItem('t3', '{not json');
    const list = createLocalList<string>('t3', 5, (s) => s);
    expect(list.get()).toEqual([]);

    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });
    list.add('kept in memory');
    expect(list.get()).toEqual(['kept in memory']);
    setItem.mockRestore();
  });

  it('flags default to false and toggle', () => {
    const flag = createLocalFlag('t4');
    expect(flag.get()).toBe(false);
    flag.set(true);
    expect(flag.get()).toBe(true);
    flag.set(false);
    expect(flag.get()).toBe(false);
  });
});
