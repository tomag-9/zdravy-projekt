/**
 * Naberací workflow (#487).
 *
 * Kuchyňa prechádza prevádzky zhora nadol; pri každej odklikne položky
 * (polievka, hlavný chod, olovrant, diéty) a keď má všetko, prejde kontrolným
 * krokom a prevádzku potvrdí.
 *
 * Kontrola je zámerne aj na backende (`confirm_prevadzka`) — modál tu je pre
 * pohodlie, nie ako jediná zábrana. Odškrtnutie položky potvrdenie ruší, aby
 * nemohol vzniknúť záznam „naložené", ktorý nezodpovedá realite.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Check, CircleAlert, Loader2, PackageCheck } from 'lucide-react';
import { useAuth } from '../../context/auth';
import { useToast } from '../../context/ToastContext';
import { logger } from '../../lib/logger';
import { countable } from '../../lib/plural';
import { Modal, Button } from '../admin/ui';

const API = import.meta.env.VITE_API_URL || '/api';

interface LoadingItem {
    key: string;
    label: string;
    is_loaded: boolean;
    marked_by: string | null;
}

export interface LoadingPrevadzka {
    prevadzka_id: number;
    nazov: string;
    portions: string;
    items: LoadingItem[];
    loaded_count: number;
    items_count: number;
    is_confirmed: boolean;
    confirmed_by: string | null;
}

interface LoadingOverview {
    date: string;
    prevadzky: LoadingPrevadzka[];
    confirmed_count: number;
}

const KuchynaLoading: React.FC<{ date: string }> = ({ date }) => {
    const { apiFetch } = useAuth();
    const { error: toastError, success: toastSuccess } = useToast();
    const [data, setData] = useState<LoadingOverview | null>(null);
    const [loading, setLoading] = useState(false);
    const [busyKey, setBusyKey] = useState<string | null>(null);
    const [confirmTarget, setConfirmTarget] = useState<LoadingPrevadzka | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiFetch(`${API}/kuchyna/loading/?date=${date}`);
            if (res.ok) setData(await res.json());
        } catch (e) {
            logger.error(e);
        } finally {
            setLoading(false);
        }
    }, [apiFetch, date]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const toggleItem = async (prevadzka: LoadingPrevadzka, item: LoadingItem) => {
        setBusyKey(`${prevadzka.prevadzka_id}:${item.key}`);
        try {
            const res = await apiFetch(`${API}/kuchyna/loading/item/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date,
                    prevadzka: prevadzka.prevadzka_id,
                    item_key: item.key,
                    is_loaded: !item.is_loaded,
                }),
            });
            if (!res.ok) {
                toastError('Nepodarilo sa uložiť stav.');
                return;
            }
            await fetchData();
        } catch (e) {
            logger.error(e);
            toastError('Nepodarilo sa uložiť stav.');
        } finally {
            setBusyKey(null);
        }
    };

    const confirm = async (prevadzka: LoadingPrevadzka) => {
        try {
            const res = await apiFetch(`${API}/kuchyna/loading/confirm/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date, prevadzka: prevadzka.prevadzka_id }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                toastError(
                    body?.missing?.length
                        ? `Ešte chýba: ${body.missing.join(', ')}`
                        : 'Prevádzku sa nepodarilo potvrdiť.',
                );
                return;
            }
            toastSuccess(`${prevadzka.nazov} — naložené.`);
            setConfirmTarget(null);
            await fetchData();
        } catch (e) {
            logger.error(e);
            toastError('Prevádzku sa nepodarilo potvrdiť.');
        }
    };

    if (loading && !data) {
        return (
            <div className="zpk-empty">
                <Loader2 className="zpk-spin" />
                <span>Načítavam…</span>
            </div>
        );
    }

    if (!data || data.prevadzky.length === 0) {
        return (
            <div className="zpk-empty">
                <CircleAlert />
                <span>Na tento deň nie sú objednávky na naloženie.</span>
            </div>
        );
    }

    return (
        <>
            <div className="zpk-progress">
                Naložené {data.confirmed_count} z {countable(data.prevadzky.length, 'prevádzky', 'prevádzok', 'prevádzok')}
            </div>

            <div className="zpk-cards">
                {data.prevadzky.map((prevadzka) => {
                    const complete = prevadzka.loaded_count === prevadzka.items_count;
                    return (
                        <section
                            key={prevadzka.prevadzka_id}
                            className={`zpk-card${prevadzka.is_confirmed ? ' is-confirmed' : ''}`}
                        >
                            <header className="zpk-card-head">
                                <div>
                                    <h2>{prevadzka.nazov}</h2>
                                    <span className="zpk-card-meta">
                                        {prevadzka.portions
                                            ? `${countable(Number(prevadzka.portions), 'porcia', 'porcie', 'porcií')} · `
                                            : ''}
                                        {prevadzka.loaded_count}/{prevadzka.items_count} položiek
                                    </span>
                                </div>
                                {prevadzka.is_confirmed && (
                                    <span className="zpk-done">
                                        <PackageCheck /> Naložené
                                    </span>
                                )}
                            </header>

                            <div className="zpk-items">
                                {prevadzka.items.map((item) => {
                                    const key = `${prevadzka.prevadzka_id}:${item.key}`;
                                    return (
                                        <button
                                            key={item.key}
                                            type="button"
                                            className={`zpk-item${item.is_loaded ? ' is-loaded' : ''}`}
                                            onClick={() => toggleItem(prevadzka, item)}
                                            disabled={busyKey === key}
                                            aria-pressed={item.is_loaded}
                                        >
                                            <span className="zpk-check">
                                                {item.is_loaded && <Check />}
                                            </span>
                                            <span className="zpk-item-label">{item.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {!prevadzka.is_confirmed && (
                                <Button
                                    onClick={() => setConfirmTarget(prevadzka)}
                                    disabled={!complete}
                                >
                                    {complete
                                        ? 'Skontrolovať a potvrdiť'
                                        : `Ešte ${countable(
                                              prevadzka.items_count - prevadzka.loaded_count,
                                              'položka',
                                              'položky',
                                              'položiek',
                                          )}`}
                                </Button>
                            )}
                        </section>
                    );
                })}
            </div>

            {confirmTarget && (
                <Modal
                    title={`Kontrola — ${confirmTarget.nazov}`}
                    onClose={() => setConfirmTarget(null)}
                    icon={<PackageCheck />}
                    foot={
                        <>
                            <Button variant="ghost" onClick={() => setConfirmTarget(null)}>
                                Späť
                            </Button>
                            <Button onClick={() => confirm(confirmTarget)}>
                                Potvrdiť naloženie
                            </Button>
                        </>
                    }
                >
                    <p style={{ marginTop: 0, color: 'var(--ink-2)' }}>
                        Skontrolujte, či je naložené naozaj všetko:
                    </p>
                    <ul className="zpk-checklist">
                        {confirmTarget.items.map((item) => (
                            <li key={item.key}>
                                <Check /> {item.label}
                            </li>
                        ))}
                    </ul>
                    <p style={{ marginBottom: 0, color: 'var(--ink-mute)', fontSize: 14 }}>
                        {confirmTarget.portions
                            ? `Spolu ${countable(Number(confirmTarget.portions), 'porcia', 'porcie', 'porcií')}.`
                            : 'Počet porcií nie je známy.'}
                    </p>
                </Modal>
            )}
        </>
    );
};

export default KuchynaLoading;
