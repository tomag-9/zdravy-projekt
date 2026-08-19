/**
 * Matica oprávnení pre jeden login (#484).
 *
 * Riadok = sekcia, stĺpce = úrovne. Okrem troch úrovní je tu aj štvrtá voľba
 * „Podľa role" — to je stav bez override, ktorý sa líši od explicitného
 * nastavenia rovnakej hodnoty: keď sa neskôr zmení rola, dedená hodnota sa
 * posunie s ňou, kým explicitná ostane.
 *
 * Sekcie mimo dosahu role sú vypnuté. Override vie prístup len obmedziť —
 * povýšiť sa ním nedá, na to je zmena role.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/auth';
import { useToast } from '../../context/ToastContext';
import { logger } from '../../lib/logger';
import type { Level } from '../../lib/sections';
import { Card } from './ui';

const API = import.meta.env.VITE_API_URL || '/api';

interface MatrixRow {
    section: string;
    label: string;
    default: Level;
    override: Level | null;
    effective: Level;
    available: boolean;
}

interface MatrixResponse {
    user_id: number;
    email: string;
    role: string;
    rows: MatrixRow[];
}

/** `null` = bez override, teda „podľa role". */
type Choice = Level | null;

const CHOICES: Array<{ value: Choice; label: string }> = [
    { value: null, label: 'Podľa role' },
    { value: 'edit', label: 'Plný prístup' },
    { value: 'read', label: 'Len čítanie' },
    { value: 'none', label: 'Bez prístupu' },
];

const LEVEL_LABEL: Record<Level, string> = {
    edit: 'Plný prístup',
    read: 'Len čítanie',
    none: 'Bez prístupu',
};

const SectionPermissionMatrix: React.FC<{ userId: number }> = ({ userId }) => {
    const { apiFetch } = useAuth();
    const { error: toastError, success: toastSuccess } = useToast();
    const [data, setData] = useState<MatrixResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    const fetchMatrix = useCallback(async () => {
        try {
            const res = await apiFetch(`${API}/admin/section-permissions/${userId}/`);
            if (res.ok) setData(await res.json());
        } catch (e) {
            logger.error(e);
        } finally {
            setLoading(false);
        }
    }, [apiFetch, userId]);

    useEffect(() => {
        fetchMatrix();
    }, [fetchMatrix]);

    const setLevel = async (section: string, choice: Choice) => {
        setSaving(section);
        try {
            const res = await apiFetch(`${API}/admin/section-permissions/${userId}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ overrides: { [section]: choice } }),
            });
            if (!res.ok) {
                toastError('Oprávnenie sa nepodarilo uložiť.');
                return;
            }
            setData(await res.json());
            toastSuccess('Oprávnenie uložené.');
        } catch (e) {
            logger.error(e);
            toastError('Oprávnenie sa nepodarilo uložiť.');
        } finally {
            setSaving(null);
        }
    };

    if (loading) {
        return (
            <Card>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 16 }}>
                    <Loader2 className="zpa-spin" /> Načítavam oprávnenia…
                </div>
            </Card>
        );
    }

    if (!data) return null;

    const reachable = data.rows.filter((row) => row.available);
    const outOfReach = data.rows.filter((row) => !row.available);

    return (
        <Card>
            <div className="zpa-perm-head">
                <ShieldCheck />
                <div>
                    <h3>Prístup k sekciám</h3>
                    <p>
                        Rola <strong>{data.role}</strong> určuje, čo je dostupné. Nastavením
                        sa dá prístup už len obmedziť.
                    </p>
                </div>
            </div>

            <div className="zpa-perm-rows">
                {reachable.map((row) => (
                    <div key={row.section} className="zpa-perm-row">
                        <div className="zpa-perm-label">
                            <span>{row.label}</span>
                            {row.override === null && (
                                <small>dedí z role — {LEVEL_LABEL[row.default]}</small>
                            )}
                        </div>
                        <div className="zpa-perm-choices" role="radiogroup" aria-label={row.label}>
                            {CHOICES.map((choice) => {
                                const active = row.override === choice.value;
                                return (
                                    <button
                                        key={String(choice.value)}
                                        type="button"
                                        role="radio"
                                        aria-checked={active}
                                        className={`zpa-perm-choice${active ? ' is-active' : ''}`}
                                        disabled={saving === row.section}
                                        onClick={() => setLevel(row.section, choice.value)}
                                    >
                                        {choice.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {outOfReach.length > 0 && (
                <p className="zpa-perm-note">
                    Mimo dosahu role: {outOfReach.map((row) => row.label).join(', ')}.
                    Sprístupniť sa dajú len zmenou role.
                </p>
            )}
        </Card>
    );
};

export default SectionPermissionMatrix;
