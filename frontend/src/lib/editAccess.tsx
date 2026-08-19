/**
 * Provider režimu „len na čítanie" (#484).
 *
 * Issue vyžaduje **zakázané polia, nie len skryté tlačidlá** — používateľ má
 * hneď vidieť, že meniť nemôže, nie sa to dozvedieť až z chyby pri uložení.
 *
 * Namiesto úprav v každej obrazovke to rieši kontext, ktorý rešpektujú
 * zdieľané `ui` komponenty. Provider sa mountuje raz pri route (viď `App.tsx`),
 * takže nová obrazovka je krytá tým, že sa uvedie jej sekcia.
 *
 * Toto je len UI. Skutočná zábrana je `SectionAccess` na endpointoch.
 */

import React, { useMemo } from 'react';
import { EditAccessContext } from './editAccessContext';

export const EditAccessProvider: React.FC<{
    canEdit: boolean;
    children: React.ReactNode;
}> = ({ canEdit, children }) => {
    const value = useMemo(() => ({ canEdit }), [canEdit]);
    return (
        <EditAccessContext.Provider value={value}>{children}</EditAccessContext.Provider>
    );
};
