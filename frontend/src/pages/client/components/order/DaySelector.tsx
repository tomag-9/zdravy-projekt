import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
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

    const handlePrev = () => {
        const newDate = new Date(dateObj);
        newDate.setDate(newDate.getDate() - 1);
        while (isBlocked(newDate)) {
            newDate.setDate(newDate.getDate() - 1);
        }
        onChange(OrderService.toLocalDateString(newDate));
    };

    const handleNext = () => {
        const newDate = new Date(dateObj);
        newDate.setDate(newDate.getDate() + 1);
        while (isBlocked(newDate)) {
            newDate.setDate(newDate.getDate() + 1);
        }
        onChange(OrderService.toLocalDateString(newDate));
    };

    const dateFormatter = new Intl.DateTimeFormat('sk-SK', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });

    return (
        <Card className="flex items-center justify-between p-2 mb-6 bg-white/95 backdrop-blur-md sticky top-2 md:top-[80px] z-40 shadow-sm border-indigo-100 transition-all duration-300">
            <Button variant="ghost" size="icon" onClick={handlePrev}>
                <ChevronLeft className="w-5 h-5 text-indigo-600" />
            </Button>

            <div className="flex flex-col items-center">
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Dátum objednávky
                </span>
                <h2 className="text-lg font-bold text-slate-900 capitalize">
                    {dateFormatter.format(dateObj)}
                </h2>
            </div>

            <Button variant="ghost" size="icon" onClick={handleNext}>
                <ChevronRight className="w-5 h-5 text-indigo-600" />
            </Button>
        </Card>
    );
};

export default DaySelector;
