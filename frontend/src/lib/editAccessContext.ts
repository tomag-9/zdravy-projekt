/**
 * Kontext a hooky pre režim „len na čítanie" (#484).
 *
 * Oddelené od providera (`editAccess.tsx`), lebo react-refresh chce mať v
 * súbore buď komponenty, alebo pomocné funkcie — nie oboje.
 */

import { createContext, useContext } from 'react';

export interface EditAccess {
    canEdit: boolean;
}

/** Mimo providera sa nič nezamyká — teda plný prístup, ako doteraz. */
export const EditAccessContext = createContext<EditAccess>({ canEdit: true });

export function useCanEdit(): boolean {
    return useContext(EditAccessContext).canEdit;
}

/** True, ak je obrazovka v režime len na čítanie. */
export function useReadOnly(): boolean {
    return !useCanEdit();
}

/**
 * Doplní `disabled` prvkom, ktoré menia dáta.
 *
 * `allowReadOnly` je vedomá výnimka pre prvky, ktoré nič nemenia — hľadanie,
 * filtre, prepínanie dňa, exporty. Default je teda deny; opačné poradie by
 * pri zabudnutí ticho povolilo editáciu.
 */
export function useDisabled(
    ownDisabled: boolean | undefined,
    allowReadOnly: boolean | undefined,
): boolean | undefined {
    const canEdit = useCanEdit();
    if (ownDisabled) return true;
    if (allowReadOnly || canEdit) return ownDisabled;
    return true;
}
