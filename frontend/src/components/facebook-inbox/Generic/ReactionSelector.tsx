import React from 'react';

interface ReactionSelectorProps {
    onSelect: (reaction: string) => void;
    currentReaction?: string;
}

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

const ReactionSelector: React.FC<ReactionSelectorProps> = ({ onSelect, currentReaction }) => {
    return (
        <div className="absolute bottom-full left-0 mb-2 bg-white rounded-full shadow-lg border border-gray-100 p-1 flex gap-1 z-10 animate-fade-in">
            {REACTIONS.map(reaction => (
                <button
                    key={reaction}
                    onClick={() => onSelect(reaction)}
                    className={`p-2 hover:bg-gray-100 rounded-full transition-transform hover:scale-125 ${currentReaction === reaction ? 'bg-blue-50' : ''
                        }`}
                    title={reaction}
                >
                    <span className="text-xl leading-none block">{reaction}</span>
                </button>
            ))}
        </div>
    );
};

export default ReactionSelector;
