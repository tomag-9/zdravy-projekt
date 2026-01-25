import { Info } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { cn } from '../../lib/utils';
import { ReactNode, ComponentType } from 'react';

interface MealCardProps {
    title: string;
    isActive: boolean;
    onToggle: () => void;
    copyAction?: ReactNode | null;
    children: ReactNode;
    icon: ComponentType<{ className?: string }>;
}

const MealCard = ({
    title,
    isActive,
    onToggle,
    copyAction,
    children,
    icon: Icon,
    className
}: MealCardProps & { className?: string }) => {
    return (
        <Card className={cn("transition-all duration-300", isActive ? "ring-2 ring-indigo-500/10 shadow-md" : "opacity-90", className)}>
            <CardHeader className="flex flex-row items-center justify-between py-3">
                <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg transition-colors", isActive ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500")}>
                        {Icon && <Icon className="w-5 h-5" />}
                    </div>
                    <CardTitle className={cn("text-base transition-colors", !isActive && "text-slate-500 font-medium")}>{title}</CardTitle>
                </div>

                {/* Toggle Switch */}
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={isActive}
                        onChange={onToggle}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
            </CardHeader>

            {isActive && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    {copyAction && (
                        <div className="px-5 py-2 bg-indigo-50/50 border-b border-indigo-50 flex items-center gap-2">
                            <Info className="w-4 h-4 text-indigo-500" />
                            {copyAction}
                        </div>
                    )}
                    <CardContent className="space-y-4 pt-4">
                        {children}
                    </CardContent>
                </div>
            )}
        </Card>
    );
};

export default MealCard;
