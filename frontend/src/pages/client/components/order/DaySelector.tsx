import { ChevronLeft, ChevronRight } from 'lucide-react';
import { fromDateKey, stepBusinessDay, toDateKey } from '../../../../lib/businessDay';

interface DaySelectorProps {
    selectedDate: string;
    onChange: (date: string) => void;
    holidays?: Set<string>;
    /** Voľno konkrétnej prevádzky (#490) — preskakuje sa rovnako ako sviatok. */
    closures?: Set<string>;
}

const DaySelector = ({ selectedDate, onChange, holidays, closures }: DaySelectorProps) => {
    const dateObj = fromDateKey(selectedDate);

    const step = (direction: 1 | -1) => {
        const result = stepBusinessDay(dateObj, direction, { holidays, closures });
        if (result) onChange(toDateKey(result));
    };

    const dateFormatter = new Intl.DateTimeFormat('sk-SK', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });

    return (
        <div className="zp-daysel">
            <button className="zp-daysel-nav" aria-label="Predchádzajúci deň" onClick={() => step(-1)}>
                <ChevronLeft style={{ width: 18, height: 18, strokeWidth: 2 }} />
            </button>
            <div className="zp-daysel-mid">
                <span className="eye">Dátum objednávky</span>
                <h3>{dateFormatter.format(dateObj)}</h3>
            </div>
            <button className="zp-daysel-nav" aria-label="Ďalší deň" onClick={() => step(1)}>
                <ChevronRight style={{ width: 18, height: 18, strokeWidth: 2 }} />
            </button>
        </div>
    );
};

export default DaySelector;
