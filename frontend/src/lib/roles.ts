/**
 * Role loginu (#482). Zdroj pravdy je `UserProfile.role` na backende — tento
 * modul len číta, čo príde z `/api/user/profile/`.
 *
 * Vlastný súbor (nie `context/auth.tsx`), aby sa nemiešali exporty komponentov
 * a pomocných funkcií — react-refresh na to má pravidlo a repo beží na 0 warnings.
 */

export type Role = 'klient' | 'admin' | 'superadmin' | 'kuchyna';

/** Minimálny tvar, ktorý funkcie potrebujú — vyhne sa cyklu s `auth.tsx`. */
export interface RoleBearer {
  is_staff?: boolean;
  role?: Role;
}

/**
 * Rola používateľa s fallbackom na `is_staff`.
 *
 * Fallback musí ostať, kým je vonku čo i len jeden klient so starým tokenom
 * alebo staršou verziou backendu — bez neho by sa admin po deployi ocitol
 * na klientskej ceste.
 */
export function roleOf(user: RoleBearer | null | undefined): Role {
  if (!user) return 'klient';
  if (user.role) return user.role;
  return user.is_staff ? 'admin' : 'klient';
}

/**
 * Rebrík interných rolí — zrkadlí `_LEVEL` v `backend/api/roles.py`.
 * `klient` v ňom zámerne nie je: je to zákazník, nie nižší stupeň zamestnanca.
 */
const LEVEL: Record<string, number> = { kuchyna: 1, admin: 2, superadmin: 3 };

/** True, ak je rola `minimum` alebo vyššia. Klient neprejde žiadnym prahom. */
export function atLeast(user: RoleBearer | null | undefined, minimum: Role): boolean {
  return (LEVEL[roleOf(user)] ?? 0) >= (LEVEL[minimum] ?? 0);
}

/** Vidí admin rozhranie (admin aj superadmin). */
export function isAdminOrAbove(user: RoleBearer | null | undefined): boolean {
  return atLeast(user, 'admin');
}

export function isSuperadmin(user: RoleBearer | null | undefined): boolean {
  return atLeast(user, 'superadmin');
}

/** Kuchyňa a vyššie — prehľady nakladania vidí aj admin. */
export function isKuchynaOrAbove(user: RoleBearer | null | undefined): boolean {
  return atLeast(user, 'kuchyna');
}

/** Presne kuchyňa — na rozhodnutie, kam používateľa po prihlásení poslať. */
export function isKuchyna(user: RoleBearer | null | undefined): boolean {
  return roleOf(user) === 'kuchyna';
}

export function isKlient(user: RoleBearer | null | undefined): boolean {
  return roleOf(user) === 'klient';
}
