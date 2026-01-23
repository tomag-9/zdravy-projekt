import { cn } from '../../lib/utils';
import { HTMLAttributes } from 'react';

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("px-5 py-4 border-b border-slate-50 bg-slate-50/30", className)}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h3
            className={cn("text-lg font-bold text-slate-900", className)}
            {...props}
        >
            {children}
        </h3>
    );
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("p-5", className)} {...props}>
            {children}
        </div>
    );
}
