import React from 'react';
import { Sparkles } from 'lucide-react';

interface AIToggleProps {
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
    loading?: boolean;
}

const AIToggle: React.FC<AIToggleProps> = ({ enabled, onToggle, loading = false }) => {
    return (
        <button
            onClick={() => !loading && onToggle(!enabled)}
            disabled={loading}
            className={`
                group relative flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full transition-all duration-300 border
                ${enabled
                    ? 'bg-gradient-to-r from-violet-100 to-fuchsia-100 border-violet-200 text-violet-700 hover:border-violet-300'
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                }
                ${loading ? 'opacity-70 cursor-wait' : 'cursor-pointer'}
            `}
            title={enabled ? 'AI Auto-Response Active' : 'Enable AI Assistant'}
        >
            <Sparkles
                size={16}
                className={`
                    transition-all duration-300
                    ${enabled ? 'fill-violet-400 text-violet-600' : 'text-gray-400 group-hover:text-gray-600'}
                    ${loading ? 'animate-pulse' : ''}
                `}
            />

            <span className={`text-xs font-medium transition-colors ${enabled ? 'text-violet-700' : 'text-gray-500'}`}>
                {enabled ? 'AI Active' : 'Bot Off'}
            </span>

            {/* Switch UI */}
            <div className={`
                w-8 h-4 rounded-full relative ml-2 transition-colors duration-300
                ${enabled ? 'bg-violet-500' : 'bg-gray-300'}
            `}>
                <div className={`
                    absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300
                    ${enabled ? 'translate-x-4' : 'translate-x-0'}
                `} />
            </div>
        </button>
    );
};

export default AIToggle;
