import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../context/auth';
import { useToast } from '../../../context/ToastContext';
import { logger } from '../../../lib/logger';
import { Card, CardHead, Button, TableWrap } from '../ui';

const API = import.meta.env.VITE_API_URL || '/api';

interface PrevadzkaRow {
    id: number;
    nazov: string;
    celok_nazov: string;
    is_active: boolean;
    billing_portion_coefficients: Record<string, string>;
}

interface PortionType {
    id: number;
    name: string;
    is_active: boolean;
}

// {prevadzkaId: {portionTypeName: draftValue}}
type Drafts = Record<number, Record<string, string>>;

const draftsFromPrevadzky = (rows: PrevadzkaRow[]): Drafts =>
    Object.fromEntries(rows.map((p) => [p.id, { ...p.billing_portion_coefficients }]));

/**
 * Fakturačné koeficienty porcií žijú na `Prevadzka.billing_portion_coefficients`
 * (chýbajúci typ = 1.0), ale doteraz sa dali meniť len cez seed/data-migráciu —
 * žiadna UI. Tu ich vystavujeme ako maticu prevádzka × typ porcie v Systémových
 * nastaveniach, priamo cez existujúci `/admin/facility-prevadzky/<id>/` CRUD.
 */
const BillingCoefficientsTab: React.FC = () => {
    const { apiFetch } = useAuth();
    const { success, error } = useToast();
    const [prevadzky, setPrevadzky] = useState<PrevadzkaRow[]>([]);
    const [portionTypes, setPortionTypes] = useState<PortionType[]>([]);
    const [drafts, setDrafts] = useState<Drafts>({});
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<number | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [prevRes, ptRes] = await Promise.all([
                apiFetch(`${API}/admin/facility-prevadzky/`),
                apiFetch(`${API}/admin/portion-types/`),
            ]);
            if (prevRes.ok) {
                const data = await prevRes.json();
                const list: PrevadzkaRow[] = (Array.isArray(data) ? data : data.results || [])
                    .filter((p: PrevadzkaRow) => p.is_active);
                setPrevadzky(list);
                setDrafts(draftsFromPrevadzky(list));
            }
            if (ptRes.ok) {
                const data = await ptRes.json();
                const list: PortionType[] = Array.isArray(data) ? data : data.results || [];
                setPortionTypes(list.filter((pt) => pt.is_active));
            }
        } catch (e) {
            logger.error(e);
            error('Nepodarilo sa načítať koeficienty');
        } finally {
            setLoading(false);
        }
    }, [apiFetch, error]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const setDraft = (prevadzkaId: number, ptName: string, value: string) => {
        setDrafts((current) => ({
            ...current,
            [prevadzkaId]: { ...current[prevadzkaId], [ptName]: value },
        }));
    };

    const saveRow = async (prevadzkaId: number) => {
        const rowDraft = drafts[prevadzkaId] || {};
        const coefficients: Record<string, string> = {};
        for (const pt of portionTypes) {
            const raw = (rowDraft[pt.name] ?? '').trim();
            if (!raw) continue;
            if (Number.isNaN(Number(raw))) {
                error(`Neplatný koeficient pre "${pt.name}"`);
                return;
            }
            coefficients[pt.name] = raw;
        }

        setSavingId(prevadzkaId);
        try {
            const res = await apiFetch(`${API}/admin/facility-prevadzky/${prevadzkaId}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ billing_portion_coefficients: coefficients }),
            });
            if (res.ok) {
                success('Koeficienty boli uložené');
                await fetchAll();
            } else {
                error('Nepodarilo sa uložiť koeficienty');
            }
        } catch (e) {
            logger.error(e);
            error('Chyba pripojenia');
        } finally {
            setSavingId(null);
        }
    };

    if (loading) return <div className="zpa-empty">Načítavam…</div>;

    return (
        <Card pad>
            <CardHead
                title="Koeficienty a porcie"
                desc="Fakturačný koeficient prepočítava počet porcií daného typu pri fakturácii prevádzke — nezávisí od gramáže na tanieri. Chýbajúca hodnota = 1,0 (počíta sa po hlavách)."
            />
            {portionTypes.length === 0 || prevadzky.length === 0 ? (
                <p style={{ fontSize: 14, color: 'var(--ink-mute)', fontStyle: 'italic', marginTop: 12 }}>
                    Žiadne aktívne prevádzky alebo typy porcií.
                </p>
            ) : (
                <TableWrap style={{ marginTop: 12 }}>
                    <table className="zpa-table">
                        <thead>
                            <tr>
                                <th>Prevádzka</th>
                                {portionTypes.map((pt) => (
                                    <th key={pt.id} className="c">{pt.name}</th>
                                ))}
                                <th className="r">Akcie</th>
                            </tr>
                        </thead>
                        <tbody>
                            {prevadzky.map((p) => (
                                <tr key={p.id}>
                                    <td>
                                        {p.nazov}
                                        <div style={{ fontSize: 12, color: 'var(--ink-mute)' }}>{p.celok_nazov}</div>
                                    </td>
                                    {portionTypes.map((pt) => (
                                        <td key={pt.id} className="c">
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                placeholder="1"
                                                value={drafts[p.id]?.[pt.name] ?? ''}
                                                onChange={(e) => setDraft(p.id, pt.name, e.target.value)}
                                                aria-label={`Koeficient — ${p.nazov} — ${pt.name}`}
                                                style={{
                                                    width: 64,
                                                    textAlign: 'center',
                                                    border: '1px solid var(--line-soft)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    padding: '6px 4px',
                                                    fontSize: 13,
                                                }}
                                            />
                                        </td>
                                    ))}
                                    <td className="r">
                                        <Button sm variant="secondary" onClick={() => saveRow(p.id)} disabled={savingId === p.id}>
                                            {savingId === p.id ? 'Ukladám…' : 'Uložiť'}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </TableWrap>
            )}
        </Card>
    );
};

export default BillingCoefficientsTab;
