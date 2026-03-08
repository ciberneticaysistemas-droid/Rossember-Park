import React from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

interface ToastProps {
    message: string;
    type?: 'error' | 'success' | 'warning' | 'info';
    onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose }) => {
    const colors = {
        error: 'bg-red-50 border-red-300 text-red-800',
        success: 'bg-emerald-50 border-emerald-300 text-emerald-800',
        warning: 'bg-orange-50 border-orange-300 text-orange-800',
        info: 'bg-blue-50 border-blue-300 text-blue-800'
    };

    const icons = {
        error: <AlertCircle size={20} />,
        success: <CheckCircle size={20} />,
        warning: <AlertCircle size={20} />,
        info: <Info size={20} />
    };

    return (
        <div className="fixed top-4 right-4 z-[9999] max-w-md animate-slide-in-right">
            <div className={`${colors[type]} border-2 rounded-xl p-4 shadow-2xl flex items-start gap-3`}>
                <div className="shrink-0 mt-0.5">
                    {icons[type]}
                </div>
                <p className="flex-1 font-medium text-sm leading-relaxed">
                    {message}
                </p>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="shrink-0 hover:opacity-70 transition-opacity"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>
        </div>
    );
};
