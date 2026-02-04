import React, { useState, useEffect } from 'react';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';

interface Tag {
    id: string;
    name: string;
    color: string;
}

interface TagInputProps {
    conversationId: string;
    currentTags: string[];
    onTagsChange: (tags: string[]) => void;
    disabled?: boolean;
}

const TAG_COLORS = [
    { name: 'أزرق', value: 'blue', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
    { name: 'أخضر', value: 'green', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
    { name: 'أحمر', value: 'red', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
    { name: 'أصفر', value: 'yellow', bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
    { name: 'بنفسجي', value: 'purple', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
    { name: 'وردي', value: 'pink', bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300' },
    { name: 'برتقالي', value: 'orange', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
    { name: 'رمادي', value: 'gray', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
];

// Predefined tags
const PREDEFINED_TAGS: Tag[] = [
    { id: 'vip', name: 'VIP', color: 'purple' },
    { id: 'urgent', name: 'عاجل', color: 'red' },
    { id: 'follow-up', name: 'متابعة', color: 'yellow' },
    { id: 'resolved', name: 'محلول', color: 'green' },
    { id: 'complaint', name: 'شكوى', color: 'orange' },
    { id: 'question', name: 'استفسار', color: 'blue' },
    { id: 'order', name: 'طلب', color: 'pink' },
    { id: 'technical', name: 'تقني', color: 'gray' },
];

const TagInput: React.FC<TagInputProps> = ({
    conversationId,
    currentTags,
    onTagsChange,
    disabled = false
}) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [customTagName, setCustomTagName] = useState('');
    const [selectedColor, setSelectedColor] = useState('blue');
    const [showCustomForm, setShowCustomForm] = useState(false);

    const getColorClasses = (color: string) => {
        const colorObj = TAG_COLORS.find(c => c.value === color);
        return colorObj || TAG_COLORS[0];
    };

    const handleAddPredefinedTag = (tagId: string) => {
        if (!currentTags.includes(tagId)) {
            onTagsChange([...currentTags, tagId]);
        }
    };

    const handleRemoveTag = (tagId: string) => {
        onTagsChange(currentTags.filter(t => t !== tagId));
    };

    const handleAddCustomTag = () => {
        if (customTagName.trim()) {
            const customTagId = `custom_${customTagName.trim().toLowerCase().replace(/\s+/g, '_')}`;
            if (!currentTags.includes(customTagId)) {
                onTagsChange([...currentTags, customTagId]);
            }
            setCustomTagName('');
            setShowCustomForm(false);
            setShowDropdown(false);
        }
    };

    const getTagLabel = (tagId: string) => {
        const predefined = PREDEFINED_TAGS.find(t => t.id === tagId);
        if (predefined) return predefined.name;

        // Custom tag
        if (tagId.startsWith('custom_')) {
            return tagId.replace('custom_', '').replace(/_/g, ' ');
        }
        return tagId;
    };

    const getTagColor = (tagId: string) => {
        const predefined = PREDEFINED_TAGS.find(t => t.id === tagId);
        return predefined?.color || selectedColor;
    };

    return (
        <div className="space-y-2">
            {/* Current Tags */}
            <div className="flex flex-wrap gap-2">
                {currentTags.map(tagId => {
                    const colorClasses = getColorClasses(getTagColor(tagId));
                    return (
                        <span
                            key={tagId}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colorClasses.bg} ${colorClasses.text} border ${colorClasses.border}`}
                        >
                            {getTagLabel(tagId)}
                            {!disabled && (
                                <button
                                    onClick={() => handleRemoveTag(tagId)}
                                    className="hover:opacity-70"
                                >
                                    <XMarkIcon className="w-3 h-3" />
                                </button>
                            )}
                        </span>
                    );
                })}

                {/* Add Tag Button */}
                {!disabled && (
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 transition-colors"
                    >
                        <PlusIcon className="w-3 h-3" />
                        إضافة
                    </button>
                )}
            </div>

            {/* Dropdown */}
            {showDropdown && (
                <div className="relative">
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => {
                            setShowDropdown(false);
                            setShowCustomForm(false);
                        }}
                    />
                    <div className="absolute left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20 max-h-80 overflow-y-auto">
                        {!showCustomForm ? (
                            <div className="p-2">
                                <p className="text-xs text-gray-500 px-2 py-1">اختر من القائمة:</p>
                                <div className="space-y-1">
                                    {PREDEFINED_TAGS.map(tag => {
                                        const colorClasses = getColorClasses(tag.color);
                                        const isActive = currentTags.includes(tag.id);
                                        return (
                                            <button
                                                key={tag.id}
                                                onClick={() => handleAddPredefinedTag(tag.id)}
                                                disabled={isActive}
                                                className={`w-full text-right px-2 py-1.5 rounded text-sm transition-colors ${isActive
                                                        ? 'opacity-50 cursor-not-allowed'
                                                        : 'hover:bg-gray-50'
                                                    }`}
                                            >
                                                <span className={`inline-block px-2 py-0.5 rounded-full ${colorClasses.bg} ${colorClasses.text}`}>
                                                    {tag.name}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="border-t mt-2 pt-2">
                                    <button
                                        onClick={() => setShowCustomForm(true)}
                                        className="w-full text-right px-2 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded"
                                    >
                                        + إنشاء تصنيف جديد
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-3">
                                <p className="text-xs text-gray-500 mb-2">تصنيف مخصص:</p>
                                <input
                                    type="text"
                                    value={customTagName}
                                    onChange={(e) => setCustomTagName(e.target.value)}
                                    placeholder="اسم التصنيف"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2"
                                    autoFocus
                                />

                                <div className="flex flex-wrap gap-1 mb-3">
                                    {TAG_COLORS.map(color => (
                                        <button
                                            key={color.value}
                                            onClick={() => setSelectedColor(color.value)}
                                            className={`w-6 h-6 rounded-full ${color.bg} border-2 ${selectedColor === color.value ? 'border-gray-900' : 'border-transparent'
                                                }`}
                                            title={color.name}
                                        />
                                    ))}
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={handleAddCustomTag}
                                        className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                                    >
                                        إضافة
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowCustomForm(false);
                                            setCustomTagName('');
                                        }}
                                        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TagInput;
