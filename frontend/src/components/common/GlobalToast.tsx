import React, { useEffect, useState } from 'react';
import { XMarkIcon, CheckCircleIcon, XCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

export interface ToastEventDetail {
    message: string;
    type: 'success' | 'error' | 'info';
}

const GlobalToast: React.FC = () => {
    const [toast, setToast] = useState<ToastEventDetail | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleToast = (event: Event) => {
            const customEvent = event as CustomEvent<ToastEventDetail>;
            setToast(customEvent.detail);
            setIsVisible(true);

            // Auto hide after 3 seconds
            setTimeout(() => {
                setIsVisible(false);
                // Clear toast after animation
                setTimeout(() => setToast(null), 300);
            }, 3000);
        };

        window.addEventListener('show-toast', handleToast);
        return () => window.removeEventListener('show-toast', handleToast);
    }, []);

    if (!toast) return null;

    const bgColors = {
        success: 'bg-green-50 border-green-200',
        error: 'bg-red-50 border-red-200',
        info: 'bg-blue-50 border-blue-200'
    };

    const textColors = {
        success: 'text-green-800',
        error: 'text-red-800',
        info: 'text-blue-800'
    };

    const icons = {
        success: <CheckCircleIcon className="w-5 h-5 text-green-500" />,
        error: <XCircleIcon className="w-5 h-5 text-red-500" />,
        info: <InformationCircleIcon className="w-5 h-5 text-blue-500" />
    };

    return (
        <div
            className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}
        >
            <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${bgColors[toast.type]} min-w-[300px]`}>
                {icons[toast.type]}
                <p className={`flex-1 text-sm font-medium ${textColors[toast.type]}`}>
                    {toast.message}
                </p>
                <button
                    onClick={() => setIsVisible(false)}
                    className={`p-1 rounded-full hover:bg-black/5 ${textColors[toast.type]}`}
                >
                    <XMarkIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default GlobalToast;
