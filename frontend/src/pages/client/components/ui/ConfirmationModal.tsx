import { AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';

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
            icon: 'text-blue-600 bg-blue-100',
            button: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${colors[variant].icon}`}>
                        <AlertTriangle className="w-6 h-6" />
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
                    <p className="text-slate-500 mb-6 leading-relaxed">
                        {description}
                    </p>

                    <div className="flex gap-3">
                        <Button
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
    );
};

export default ConfirmationModal;
