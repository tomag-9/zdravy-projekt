import { describe, it, expect } from 'vitest';
import { levelOf, canRead, canEdit } from './sections';

describe('úrovne prístupu k sekciám', () => {
  it('číta úroveň z mapy', () => {
    const map = { jedalnicek: 'read', diety: 'edit' } as const;
    expect(levelOf(map, 'jedalnicek')).toBe('read');
    expect(canRead(map, 'jedalnicek')).toBe(true);
    expect(canEdit(map, 'jedalnicek')).toBe(false);
    expect(canEdit(map, 'diety')).toBe(true);
  });

  it('sekcia mimo mapy je bez prístupu', () => {
    expect(levelOf({ diety: 'edit' }, 'logy')).toBe('none');
    expect(canRead({ diety: 'edit' }, 'logy')).toBe(false);
  });

  // Fallback musí ísť smerom hore: starší backend mapu neposiela a UI by sa
  // inak zamklo adminom, ktorí majú prístup podľa role.
  it('chýbajúca mapa znamená plný prístup', () => {
    expect(levelOf(undefined, 'jedalnicek')).toBe('edit');
    expect(canEdit(undefined, 'cokolvek')).toBe(true);
  });
});
