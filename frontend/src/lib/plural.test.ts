import { describe, it, expect } from 'vitest';
import { plural, countable } from './plural';

describe('slovenské skloňovanie', () => {
  it.each([
    [0, 'porcií'],
    [1, 'porcia'],
    [2, 'porcie'],
    [4, 'porcie'],
    [5, 'porcií'],
    [11, 'porcií'],
    [28, 'porcií'],
  ])('%i → %s', (n, expected) => {
    expect(plural(n, 'porcia', 'porcie', 'porcií')).toBe(expected);
  });

  it('countable spája číslo s tvarom', () => {
    expect(countable(1, 'položka', 'položky', 'položiek')).toBe('1 položka');
    expect(countable(3, 'položka', 'položky', 'položiek')).toBe('3 položky');
    expect(countable(7, 'položka', 'položky', 'položiek')).toBe('7 položiek');
  });
});
