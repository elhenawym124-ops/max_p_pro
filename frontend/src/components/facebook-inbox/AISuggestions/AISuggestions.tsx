import React, { useState } from 'react';
import { Sparkles, RefreshCw, X } from 'lucide-react';
import { apiClient } from '../../../services/apiClient';

interface AISuggestionsProps {
    conversationId: string;
    onSelectSuggestion: (text: string) => void;
    visible?: boolean;
}

const AISuggestions: React.FC<AISuggestionsProps> = ({
    conversationId,
    onSelectSuggestion,
    visible = true
}) => {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    const fetchSuggestions = async () => {
        if (!conversationId) return;

        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.get(
                `/conversations/${conversationId}/suggestions`
            );

            if (response.data.success && Array.isArray(response.data.suggestions)) {
                setSuggestions(response.data.suggestions);
                setIsOpen(true);
            }
        } catch (err) {
            console.error('Failed to fetch AI suggestions', err);
            setError('فشل تحميل الاقتراحات');
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch not automatic? Maybe on user interaction or if enabled.
    // For now, let's expose a button to trigger it.

    if (!visible) return null;

    if (!isOpen && !loading) {
        return (
            <button
                onClick={fetchSuggestions}
                className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors mb-2 mx-4 self-start"
            >
                <Sparkles size={14} />
                <span>اقتراح ردود ذكية</span>
            </button>
        );
    }

    return (
        <div className="mx-4 mb-2 animate-fade-in">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Sparkles size={12} className="text-blue-500" />
                    <span>اقتراحات الذكاء الاصطناعي</span>
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={fetchSuggestions}
                        disabled={loading}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                        title="تحديث"
                    >
                        <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                        title="إغلاق"
                    >
                        <X size={12} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-8 bg-gray-100 rounded-lg w-32 animate-pulse flex-shrink-0"></div>
                    ))}
                </div>
            ) : error ? (
                <div className="text-xs text-red-500">{error}</div>
            ) : (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {suggestions.map((text, idx) => (
                        <button
                            key={idx}
                            onClick={() => onSelectSuggestion(text)}
                            className="flex-shrink-0 text-right text-sm bg-white border border-blue-100 hover:border-blue-300 hover:bg-blue-50 text-gray-700 px-3 py-2 rounded-lg transition-all whitespace-pre-wrap max-w-xs shadow-sm"
                        >
                            {text}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AISuggestions;
