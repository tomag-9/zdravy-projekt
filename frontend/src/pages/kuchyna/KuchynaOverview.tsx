/**
 * Uzamknutý prehľad pre kuchyňu (#486).
 *
 * Vedome obsahuje len čítanie: prepínanie dňa a rovnakú tabuľku gramáže, akú
 * vidí admin. Žiadne uzatváranie dňa, žiadne editovanie objednávok, žiadny
 * filter sekcií — kuchyňa má vidieť úplný podklad na naloženie, nie výsek.
 *
 * Backend to nestráži len tu: `gramage-dashboard` beží pod `IsKuchynaOrAbove`,
 * všetko ostatné pod `IsAdminOrAbove`.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Inbox } from 'lucide-react';
import { useAuth } from '../../context/auth';
import { logger } from '../../lib/logger';
import {
    prevWeekday,
    nextWeekday,
    lastWeekdayToday,
    formatDay,
} from '../../lib/businessDay';
import GramageTable, { type TableSpec } from '../admin/GramageTable';
import KuchynaLoading from './KuchynaLoading';

const API = import.meta.env.VITE_API_URL || '/api';

interface DashboardResponse {
    date: string;
    meal_plan_id: number | null;
    spec: TableSpec;
}

const KuchynaOverview: React.FC = () => {
    const { apiFetch } = useAuth();
    const maxDate = React.useMemo(() => lastWeekdayToday(), []);
    const [date, setDate] = useState(maxDate);
    const [data, setData] = useState<DashboardResponse | null>(null);
    const [loading, setLoading] = useState(false);
    // Prehľad = čo sa má naložiť, Nakladanie = odklikávanie. Dve záložky, nie
    // dve obrazovky — kuchyňa medzi nimi počas naberania preskakuje.
    const [tab, setTab] = useState<'prehlad' | 'nakladanie'>('prehlad');

    const fetchData = useCallback(async () => {
        setLoading(true);
        setData(null);
        try {
            const res = await apiFetch(`${API}/admin/meal-plans/gramage-dashboard/?date=${date}`);
            if (res.ok) {
                setData(await res.json());
            }
        } catch (e) {
            logger.error(e);
        } finally {
            setLoading(false);
        }
    }, [apiFetch, date]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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
                            Späť na dnešok
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

            <div className="zpk-tabs" role="tablist">
                <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'prehlad'}
                    className={`zpk-tab${tab === 'prehlad' ? ' is-active' : ''}`}
                    onClick={() => setTab('prehlad')}
                >
                    Prehľad
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'nakladanie'}
                    className={`zpk-tab${tab === 'nakladanie' ? ' is-active' : ''}`}
                    onClick={() => setTab('nakladanie')}
                >
                    Nakladanie
                </button>
            </div>

            {tab === 'nakladanie' ? (
                <KuchynaLoading date={date} />
            ) : loading ? (
                <div className="zpk-empty">
                    <Loader2 className="zpk-spin" />
                    <span>Načítavam…</span>
                </div>
            ) : hasTable ? (
                <GramageTable spec={data.spec} className="zpk-gram" />
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
