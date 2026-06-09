import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { useScrollLock } from '../../../../hooks/useScrollLock';
import { useEffect, useId, useRef } from 'react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
}

const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Potvrdiť',
    cancelText = 'Zrušiť',
    variant = 'danger'
}: ConfirmationModalProps) => {
    const titleId = useId();
    const descriptionId = useId();
    const dialogRef = useRef<HTMLDivElement>(null);
    const cancelButtonRef = useRef<HTMLButtonElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);
    useScrollLock(isOpen);

    useEffect(() => {
        if (!isOpen) return;
        previousFocusRef.current = document.activeElement as HTMLElement;
        window.setTimeout(() => cancelButtonRef.current?.focus(), 0);

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
                return;
            }

            if (event.key !== 'Tab') return;
            const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (!focusable || focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            const previous = previousFocusRef.current;
            previousFocusRef.current = null;
            if (previous && document.contains(previous)) {
                window.setTimeout(() => previous.focus(), 0);
            }
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const colors = {
        danger: {
            icon: 'text-red-600 bg-red-100',
            button: 'bg-red-600 hover:bg-red-700 text-white shadow-red-200'
        },
        warning: {
            icon: 'text-amber-600 bg-amber-100',
            button: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200'
        },
        info: {
            icon: 'bg-[rgba(74,124,63,0.12)]',
            button: ''
        }
    };

    return createPortal(
        <div className="zp-centered-modal z-50 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                ref={dialogRef}
                className="rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
                style={{ background: "var(--bg-cream)" }}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
            >
                <div className="p-6">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${colors[variant].icon}`}>
                        <AlertTriangle className="w-6 h-6" aria-hidden="true" />
                    </div>

                    <h3 id={titleId} className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
                    <p id={descriptionId} className="text-slate-500 mb-6 leading-relaxed">
                        {description}
                    </p>

                    <div className="flex gap-3">
                        <Button
                            ref={cancelButtonRef}
                            className="flex-1 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 border shadow-sm"
                            onClick={onClose}
                        >
                            {cancelText}
                        </Button>
                        <Button
                            className={`flex-1 shadow-lg ${colors[variant].button}`}
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                        >
                            {confirmText}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    , document.body);
};

export default ConfirmationModal;
