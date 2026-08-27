/**
 * Kuchyňská obrazovka (#486, #487).
 *
 * Postavená na tom, ako sa reálne naberá: jeden človek má na starosti JEDNU
 * položku (napr. polievku) a prechádza s ňou prevádzky zhora nadol. Preto si
 * najprv vyberie stanovisko a potom odklikáva prevádzky priamo v riadkoch
 * prehľadu — nie v samostatnom zozname, kde by stratil kontext, koľko čoho
 * do ktorej prevádzky ide.
 *
 * Tabuľka je tá istá, akú vidí admin; kuchyni k nej pribudne akcia v riadku.
 * Meniť cez ňu nič nejde — obsah riadi spec z backendu.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Loader2, Inbox, PackageCheck } from 'lucide-react';
import { useAuth } from '../../context/auth';
import { useToast } from '../../context/ToastContext';
import { logger } from '../../lib/logger';
import { plural } from '../../lib/plural';
import {
    prevWeekday,
    nextWeekday,
    dashboardMaxDate,
    toDateString,
    formatDay,
} from '../../lib/businessDay';
import GramageTable, { type TableSpec } from '../admin/GramageTable';

const API = import.meta.env.VITE_API_URL || '/api';

interface DashboardResponse {
    date: string;
    meal_plan_id: number | null;
    spec: TableSpec;
}

interface LoadingItem {
    key: string;
    label: string;
    is_loaded: boolean;
}

interface LoadingPrevadzka {
    prevadzka_id: number;
    nazov: string;
    items: LoadingItem[];
    loaded_count: number;
    items_count: number;
    is_confirmed: boolean;
}

interface LoadingOverview {
    date: string;
    items: Array<{ key: string; label: string }>;
    prevadzky: LoadingPrevadzka[];
}

const KuchynaOverview: React.FC = () => {
    const { apiFetch } = useAuth();
    const { error: toastError, success: toastSuccess } = useToast();
    // Od 12:00 sa odomkne aj zajtrajšok — British School sa scrapuje o 12:15
    // deň vopred, tak jej riadok potrebuje byť vidno ešte pred tým (#535).
    const maxDate = useMemo(() => dashboardMaxDate(), []);
    const actualToday = useMemo(() => toDateString(new Date()), []);
    const [date, setDate] = useState(maxDate);
    const [data, setData] = useState<DashboardResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [work, setWork] = useState<LoadingOverview | null>(null);
    /** Stanovisko — položka, ktorú tento človek práve naberá. */
    const [station, setStation] = useState<string | null>(null);
    const [busy, setBusy] = useState<number | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [dashRes, workRes] = await Promise.all([
                apiFetch(`${API}/admin/meal-plans/gramage-dashboard/?date=${date}`),
                apiFetch(`${API}/kuchyna/loading/?date=${date}`),
            ]);
            setData(dashRes.ok ? await dashRes.json() : null);
            setWork(workRes.ok ? await workRes.json() : null);
        } catch (e) {
            logger.error(e);
        } finally {
            setLoading(false);
        }
    }, [apiFetch, date]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    // Prvé stanovisko sa predvolí samo, nech sa dá začať jedným klikom.
    useEffect(() => {
        if (work?.items.length && !work.items.some((i) => i.key === station)) {
            setStation(work.items[0].key);
        }
    }, [work, station]);

    const byPrevadzka = useMemo(() => {
        const map = new Map<number, LoadingPrevadzka>();
        for (const p of work?.prevadzky ?? []) map.set(p.prevadzka_id, p);
        return map;
    }, [work]);

    const stationProgress = useMemo(() => {
        if (!work || !station) return null;
        const total = work.prevadzky.length;
        const done = work.prevadzky.filter(
            (p) => p.items.find((i) => i.key === station)?.is_loaded,
        ).length;
        return { done, total };
    }, [work, station]);

    const toggle = async (prevadzkaId: number, isLoaded: boolean) => {
        if (!station) return;
        setBusy(prevadzkaId);
        try {
            const res = await apiFetch(`${API}/kuchyna/loading/item/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date,
                    prevadzka: prevadzkaId,
                    item_key: station,
                    is_loaded: !isLoaded,
                }),
            });
            if (!res.ok) {
                toastError('Nepodarilo sa uložiť stav.');
                return;
            }
            const workRes = await apiFetch(`${API}/kuchyna/loading/?date=${date}`);
            if (workRes.ok) setWork(await workRes.json());
        } catch (e) {
            logger.error(e);
            toastError('Nepodarilo sa uložiť stav.');
        } finally {
            setBusy(null);
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
            await fetchAll();
        } catch (e) {
            logger.error(e);
            toastError('Prevádzku sa nepodarilo potvrdiť.');
        }
    };

    /** Akcia vpravo v riadku prevádzky: odklik môjho stanoviska + finálne potvrdenie. */
    const renderRowAction = (prevadzkaId: number) => {
        const entry = byPrevadzka.get(prevadzkaId);
        if (!entry || !station) return null;
        const item = entry.items.find((i) => i.key === station);
        if (!item) return null;

        const allDone = entry.loaded_count === entry.items_count;
        return (
            <span className="zpk-row-actions">
                <button
                    type="button"
                    className={`zpk-tick${item.is_loaded ? ' is-loaded' : ''}`}
                    onClick={() => toggle(prevadzkaId, item.is_loaded)}
                    disabled={busy === prevadzkaId}
                    aria-pressed={item.is_loaded}
                    aria-label={`${item.label} — ${entry.nazov}`}
                    title={item.label}
                >
                    <span className="zpk-tick-box">{item.is_loaded && <Check />}</span>
                </button>

                {entry.is_confirmed ? (
                    <span className="zpk-done" title="Prevádzka je celá naložená">
                        <PackageCheck /> Naložené
                    </span>
                ) : (
                    allDone && (
                        <button
                            type="button"
                            className="zpk-confirm"
                            onClick={() => confirm(entry)}
                        >
                            Potvrdiť celú
                        </button>
                    )
                )}
            </span>
        );
    };

    const hasTable =
        data && (data.spec.rows.length > 0 || data.spec.header.groups.length > 0);

    return (
        <>
            <div className="zpk-daybar">
                <button
                    type="button"
                    className="zpk-daybtn"
                    onClick={() => setDate((d) => prevWeekday(d))}
                    aria-label="Predchádzajúci deň"
                >
                    <ChevronLeft />
                </button>

                <div className="zpk-day">
                    <span className="zpk-day-label">{formatDay(date)}</span>
                    {date !== maxDate && (
                        <button type="button" className="zpk-today" onClick={() => setDate(maxDate)}>
                            {/* Po 12:00 je maxDate zajtrajšok (British School, #535) —
                                tlačidlo vtedy nesmie tvrdiť, že vedie „na dnešok". */}
                            {maxDate === actualToday ? 'Späť na dnešok' : 'Späť na najnovší deň'}
                        </button>
                    )}
                </div>

                <button
                    type="button"
                    className="zpk-daybtn"
                    onClick={() => setDate((d) => nextWeekday(d))}
                    aria-label="Nasledujúci deň"
                >
                    <ChevronRight />
                </button>
            </div>

            {work && work.items.length > 0 && (
                <div className="zpk-stations">
                    <span className="zpk-stations-label">Naberám:</span>
                    <div className="zpk-station-list" role="tablist">
                        {work.items.map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                role="tab"
                                aria-selected={station === item.key}
                                className={`zpk-station${station === item.key ? ' is-active' : ''}`}
                                onClick={() => setStation(item.key)}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                    {stationProgress && (
                        <span className="zpk-station-progress">
                            {stationProgress.done} z {stationProgress.total}{' '}
                            {plural(stationProgress.total, 'prevádzky', 'prevádzok', 'prevádzok')}
                        </span>
                    )}
                </div>
            )}

            {loading && !data ? (
                <div className="zpk-empty">
                    <Loader2 className="zpk-spin" />
                    <span>Načítavam…</span>
                </div>
            ) : hasTable ? (
                <GramageTable
                    spec={data.spec}
                    className="zpk-gram"
                    renderClientAction={renderRowAction}
                />
            ) : (
                <div className="zpk-empty">
                    <Inbox />
                    <span>Na tento deň nie je zadaný jedálniček.</span>
                </div>
            )}
        </>
    );
};

export default KuchynaOverview;
