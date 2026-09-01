import { describe, expect, it } from 'vitest';
import { filterMenusByDay } from './useOrder';

describe('filterMenusByDay', () => {
    it('keeps everything when there are no restrictions at all', () => {
        expect(filterMenusByDay(['A', 'B', 'C'], null, '2026-09-04')).toEqual(['A', 'B', 'C']);
        expect(filterMenusByDay(['A', 'B', 'C'], undefined, '2026-09-04')).toEqual(['A', 'B', 'C']);
    });

    it('keeps a menu with an empty restriction list (means "every day")', () => {
        expect(filterMenusByDay(['A', 'B'], { B: [] }, '2026-09-01')).toEqual(['A', 'B']);
    });

    it('hides menu B on a day it is not restricted to (2026-09-01 is a Tuesday)', () => {
        expect(filterMenusByDay(['A', 'B', 'C'], { B: [5] }, '2026-09-01')).toEqual(['A', 'C']);
    });

    it('shows menu B on the Friday it is restricted to (2026-09-04)', () => {
        expect(filterMenusByDay(['A', 'B', 'C'], { B: [5] }, '2026-09-04')).toEqual(['A', 'B', 'C']);
    });
});
