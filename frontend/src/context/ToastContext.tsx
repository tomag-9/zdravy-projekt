/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    addToast: (message: string, type: ToastType) => void;
    removeToast: (id: string) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const addToast = useCallback((message: string, type: ToastType) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);

        // Auto remove after 3 seconds
        setTimeout(() => {
            removeToast(id);
        }, 3000);
    }, [removeToast]);

    const success = useCallback((msg: string) => addToast(msg, 'success'), [addToast]);
    const error = useCallback((msg: string) => addToast(msg, 'error'), [addToast]);
    const info = useCallback((msg: string) => addToast(msg, 'info'), [addToast]);
    const warning = useCallback((msg: string) => addToast(msg, 'warning'), [addToast]);

    return (
        <ToastContext.Provider value={{ addToast, removeToast, success, error, info, warning }}>
            {children}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`
                            flex items-center w-full max-w-xs p-4 text-gray-500 bg-white rounded-lg shadow dark:text-gray-400 dark:bg-gray-800
                            animate-in slide-in-from-right fade-in duration-300
                            border-l-4
                            ${toast.type === 'success' ? 'border-green-500' : ''}
                            ${toast.type === 'error' ? 'border-red-500' : ''}
                            ${toast.type === 'info' ? 'border-blue-500' : ''}
                            ${toast.type === 'warning' ? 'border-yellow-500' : ''}
                        `}
                        role="alert"
                    >
                        <div className={`
                            inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg
                            ${toast.type === 'success' ? 'text-green-500 bg-green-100 dark:bg-green-800 dark:text-green-200' : ''}
                            ${toast.type === 'error' ? 'text-red-500 bg-red-100 dark:bg-red-800 dark:text-red-200' : ''}
                            ${toast.type === 'info' ? 'text-blue-500 bg-blue-100 dark:bg-blue-800 dark:text-blue-200' : ''}
                            ${toast.type === 'warning' ? 'text-orange-500 bg-orange-100 dark:bg-orange-700 dark:text-orange-200' : ''}
                        `}>
                            {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
                            {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
                            {toast.type === 'info' && <Info className="w-5 h-5" />}
                            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                        </div>
                        <div className="ml-3 text-sm font-normal">{toast.message}</div>
                        <button
                            type="button"
                            className="ml-auto -mx-1.5 -my-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex items-center justify-center h-8 w-8 dark:text-gray-500 dark:hover:text-white dark:bg-gray-800 dark:hover:bg-gray-700"
                            onClick={() => removeToast(toast.id)}
                            aria-label="Close"
                        >
                            <span className="sr-only">Close</span>
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
