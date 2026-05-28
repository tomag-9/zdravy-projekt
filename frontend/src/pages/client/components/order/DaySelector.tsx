import { ChevronLeft, ChevronRight } from 'lucide-react';
import OrderService from '../../services/OrderService';

interface DaySelectorProps {
    selectedDate: string;
    onChange: (date: string) => void;
    holidays?: Set<string>;
}

const DaySelector = ({ selectedDate, onChange, holidays }: DaySelectorProps) => {
    const dateObj = new Date(`${selectedDate}T12:00:00`);

    const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
    const isBlocked = (d: Date) => isWeekend(d) || (holidays?.has(OrderService.toLocalDateString(d)) ?? false);

    const findNextAvailable = (from: Date, direction: 1 | -1, max = 365): Date | null => {
        const d = new Date(from);
        for (let i = 0; i < max; i++) {
            d.setDate(d.getDate() + direction);
            if (!isBlocked(d)) return d;
        }
        return null;
    };

    const handlePrev = () => {
        const result = findNextAvailable(dateObj, -1);
        if (result) onChange(OrderService.toLocalDateString(result));
    };

    const handleNext = () => {
        const result = findNextAvailable(dateObj, 1);
        if (result) onChange(OrderService.toLocalDateString(result));
    };

    const dateFormatter = new Intl.DateTimeFormat('sk-SK', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });

    return (
        <div className="zp-daysel">
            <button className="zp-daysel-nav" aria-label="Predchádzajúci deň" onClick={handlePrev}>
                <ChevronLeft style={{ width: 18, height: 18, strokeWidth: 2 }} />
            </button>
            <div className="zp-daysel-mid">
                <span className="eye">Dátum objednávky</span>
                <h3>{dateFormatter.format(dateObj)}</h3>
            </div>
            <button className="zp-daysel-nav" aria-label="Ďalší deň" onClick={handleNext}>
                <ChevronRight style={{ width: 18, height: 18, strokeWidth: 2 }} />
            </button>
        </div>
    );
};

export default DaySelector;
