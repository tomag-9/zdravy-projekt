/**
 * Layout pre rolu Kuchyňa (#486).
 *
 * Zámerne bez bočného menu: kuchyňa má jedinú obrazovku a menu by len ponúkalo
 * cesty, na ktoré aj tak nemá právo. Hlavička je navrhnutá na tablet — veľké
 * klikacie plochy a žiadna interakcia závislá od hoveru, lebo dotykové
 * zariadenie hover nemá.
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/auth';
import { Modal, Button } from '../admin/ui';
import './kuchyna.css';

const KuchynaLayout: React.FC = () => {
    const { logout, user } = useAuth();
    const [showLogoutModal, setShowLogoutModal] = React.useState(false);

    const displayName =
        user?.first_name || user?.last_name
            ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
            : user?.email?.split('@')[0] || 'Kuchyňa';

    return (
        <div className="zpk-app">
            <header className="zpk-topbar">
                <img src="/logo-zdravy-projekt.png" alt="Zdravý projekt" />
                <span className="zpk-badge">Kuchyňa</span>
                <span className="zpk-spacer" />
                <span className="zpk-user">{displayName}</span>
                <button
                    type="button"
                    className="zpk-logout"
                    onClick={() => setShowLogoutModal(true)}
                    aria-label="Odhlásiť sa"
                >
                    <LogOut />
                </button>
            </header>

            <main className="zpk-main">
                <Outlet />
            </main>

            {showLogoutModal && (
                <Modal
                    title="Naozaj sa chcete odhlásiť?"
                    onClose={() => setShowLogoutModal(false)}
                    foot={
                        <>
                            <Button variant="ghost" onClick={() => setShowLogoutModal(false)}>
                                Zrušiť
                            </Button>
                            <Button variant="danger" onClick={() => { setShowLogoutModal(false); void logout(); }}>
                                Odhlásiť sa
                            </Button>
                        </>
                    }
                >
                    <p style={{ margin: 0, color: 'var(--ink-2)' }}>
                        Budete presmerovaný na prihlasovaciu obrazovku.
                    </p>
                </Modal>
            )}
        </div>
    );
};

export default KuchynaLayout;
