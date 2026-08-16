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

/** Vidí admin rozhranie (admin aj superadmin) — ekvivalent dnešného `is_staff`. */
export function isAdminOrAbove(user: RoleBearer | null | undefined): boolean {
  const role = roleOf(user);
  return role === 'admin' || role === 'superadmin';
}

export function isSuperadmin(user: RoleBearer | null | undefined): boolean {
  return roleOf(user) === 'superadmin';
}

export function isKuchyna(user: RoleBearer | null | undefined): boolean {
  return roleOf(user) === 'kuchyna';
}
