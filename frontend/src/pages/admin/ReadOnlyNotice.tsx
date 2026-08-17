/**
 * Pruh, ktorý povie, prečo sú polia zamknuté (#484).
 *
 * Bez neho vyzerá režim len na čítanie ako rozbitá obrazovka — polia sú
 * neaktívne a nie je zrejmé prečo. Sedí vnútri `EditAccessProvider`, takže
 * sa zobrazí presne na tých obrazovkách, kde prístup nestačí na úpravy.
 */

import React from 'react';
import { Eye } from 'lucide-react';
import { useReadOnly } from '../../lib/editAccessContext';

const ReadOnlyNotice: React.FC = () => {
    if (!useReadOnly()) return null;
    return (
        <div className="zpa-readonly-notice" role="status">
            <Eye />
            <span>
                Túto sekciu máte <strong>len na čítanie</strong>. Zmeny vám nastaví
                superadmin v Správe prístupov.
            </span>
        </div>
    );
};

export default ReadOnlyNotice;
