import { cn } from '../../../../lib/utils';
import { forwardRef, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive';
    size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const variants = {
        default: "zp-btn--primary",
        outline: "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700",
        ghost: "hover:bg-slate-100 text-slate-600 hover:text-slate-900",
        secondary: "zp-btn--secondary",
        destructive: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100"
    };

    const sizes = {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-8 text-lg",
        icon: "h-10 w-10 p-0"
    };

    return (
        <button
            ref={ref}
            className={cn(
                "inline-flex items-center justify-center rounded-xl font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--green-600)] disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        />
    );
});

Button.displayName = "Button";

export { Button };
