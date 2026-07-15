import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/auth';
import { useToast } from '../../context/ToastContext';
import { logger } from '../../lib/logger';
import { Modal, Button, Field, Input } from './ui';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface ProfileForm {
    first_name: string;
    last_name: string;
    email: string;
}

/**
 * Self-service profile editor for the logged-in admin.
 * Edits name + email via PATCH /user/profile/ and triggers a
 * password-reset email (the app's established change-password flow).
 */
const AdminProfileModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { apiFetch, user, fetchUserProfile } = useAuth();
    const { success, error: toastError } = useToast();

    const [form, setForm] = useState<ProfileForm>({
        first_name: user?.first_name ?? '',
        last_name: user?.last_name ?? '',
        email: user?.email ?? '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sendingReset, setSendingReset] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await apiFetch(`${API_URL}/user/profile/`);
            if (res.ok) {
                const data = await res.json();
                setForm({
                    first_name: data.first_name ?? '',
                    last_name: data.last_name ?? '',
                    email: data.email ?? '',
                });
            }
        } catch (e) {
            logger.error(e);
        } finally {
            setLoading(false);
        }
    }, [apiFetch]);

    useEffect(() => {
        void load();
    }, [load]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.email.trim()) {
            toastError('Email je povinný.');
            return;
        }
        setSaving(true);
        try {
            const res = await apiFetch(`${API_URL}/user/profile/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (res.ok) {
                await fetchUserProfile();
                success('Profil bol uložený.');
                onClose();
            } else {
                const data = await res.json().catch(() => ({}));
                toastError(data?.email?.[0] || data?.error?.message || 'Nepodarilo sa uložiť profil.');
            }
        } catch (e) {
            logger.error(e);
            toastError('Chyba pri ukladaní profilu.');
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordReset = async () => {
        if (!form.email.trim()) return;
        setSendingReset(true);
        try {
            const res = await apiFetch(`${API_URL}/auth/password-reset/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: form.email }),
            });
            if (res.ok) {
                success(`Odkaz na zmenu hesla bol odoslaný na ${form.email}.`);
            } else {
                toastError('Nepodarilo sa odoslať odkaz na zmenu hesla.');
            }
        } catch (e) {
            logger.error(e);
            toastError('Chyba pri odosielaní odkazu.');
        } finally {
            setSendingReset(false);
        }
    };

    return (
        <Modal
            title="Môj profil"
            onClose={onClose}
            foot={
                <>
                    <Button variant="ghost" onClick={onClose}>Zavrieť</Button>
                    <Button type="submit" form="admin-profile-form" disabled={saving || loading}>
                        {saving ? 'Ukladám…' : 'Uložiť zmeny'}
                    </Button>
                </>
            }
        >
            {loading ? (
                <div className="zpa-empty"><Loader2 className="zpa-spin" /> Načítavam…</div>
            ) : (
                <>
                    <form id="admin-profile-form" onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="zpa-grid-2">
                            <Field label="Meno">
                                <Input value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} />
                            </Field>
                            <Field label="Priezvisko">
                                <Input value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} />
                            </Field>
                        </div>
                        <Field label="Email" req>
                            <Input type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                        </Field>
                    </form>

                    <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 16 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--green-900)', fontSize: 14 }}>Heslo</div>
                        <p style={{ fontSize: 12.5, color: 'var(--ink-3)', margin: '4px 0 12px' }}>
                            Pošleme vám na e-mail odkaz, cez ktorý si nastavíte nové heslo.
                        </p>
                        <Button type="button" variant="secondary" onClick={handlePasswordReset} disabled={sendingReset}>
                            <KeyRound /> {sendingReset ? 'Odosielam…' : 'Zmeniť heslo'}
                        </Button>
                    </div>
                </>
            )}
        </Modal>
    );
};

export default AdminProfileModal;
