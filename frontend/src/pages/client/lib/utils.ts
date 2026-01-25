import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Returns correct Slovak word form based on count.
 * @param count Number of items
 * @param one Form for 1 (e.g., 'diéta')
 * @param few Form for 2-4 (e.g., 'diéty')
 * @param many Form for 5+ and 0 (e.g., 'diét')
 */
export const getSlovakPlural = (count: number, one: string, few: string, many: string): string => {
    if (count === 1) return one;
    if (count >= 2 && count <= 4) return few;
    return many;
};
