import React from 'react';

export const TypingIndicator: React.FC = () => {
    return (
        <div className="flex items-center gap-2 p-4 animate-fade-in">
            <div className="flex items-center gap-2 bg-gray-100 px-4 py-3 rounded-2xl rounded-tl-none max-w-xs shadow-sm">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <span className="text-xs text-gray-500 mr-2 border-r border-gray-300 pr-2">الذكاء الاصطناعي يكتب</span>
            </div>
        </div>
    );
};

export default TypingIndicator;
