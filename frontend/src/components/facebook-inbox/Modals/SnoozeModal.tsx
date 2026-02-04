import React, { useState } from 'react';
import { X, Clock, Calendar } from 'lucide-react';

interface SnoozeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSnooze: (until: Date) => void;
}

const SnoozeModal: React.FC<SnoozeModalProps> = ({ isOpen, onClose, onSnooze }) => {
    const [customDate, setCustomDate] = useState('');
    const [customTime, setCustomTime] = useState('');

    if (!isOpen) return null;

    const handlePresets = (hours: number) => {
        const date = new Date();
        date.setHours(date.getHours() + hours);
        onSnooze(date);
    };

    const handleTomorrow = () => {
        const date = new Date();
        date.setDate(date.getDate() + 1);
        date.setHours(9, 0, 0, 0); // 9:00 AM
        onSnooze(date);
    };

    const handleCustomSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (customDate && customTime) {
            const date = new Date(`${customDate}T${customTime}`);
            onSnooze(date);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        تأجيل المحادثة
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X size={20} className="text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                <div className="p-4 space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">اختر متى تريد تذكيرك بهذه المحادثة:</p>

                    <button
                        onClick={() => handlePresets(1)}
                        className="w-full text-right p-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-400 flex items-center gap-3 transition-colors border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                    >
                        <Clock size={16} />
                        <span>لاحقاً اليوم (خلال 1 ساعة)</span>
                    </button>

                    <button
                        onClick={() => handlePresets(4)}
                        className="w-full text-right p-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-400 flex items-center gap-3 transition-colors border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                    >
                        <Clock size={16} />
                        <span>بعد الظهيرة (خلال 4 ساعات)</span>
                    </button>

                    <button
                        onClick={handleTomorrow}
                        className="w-full text-right p-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-400 flex items-center gap-3 transition-colors border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                    >
                        <Calendar size={16} />
                        <span>غداً صباحاً (9:00 ص)</span>
                    </button>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">اختار وقت محدد</p>
                        <form onSubmit={handleCustomSubmit} className="flex gap-2">
                            <input
                                type="date"
                                className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100"
                                value={customDate}
                                onChange={e => setCustomDate(e.target.value)}
                                required
                            />
                            <input
                                type="time"
                                className="w-24 p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100"
                                value={customTime}
                                onChange={e => setCustomTime(e.target.value)}
                                required
                            />
                            <button
                                type="submit"
                                className="bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
                                disabled={!customDate || !customTime}
                            >
                                تأكيد
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SnoozeModal;
