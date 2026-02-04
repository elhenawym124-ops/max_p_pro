import React, { useState, useEffect } from 'react';
import {
    DocumentDuplicateIcon,
    LightBulbIcon,
    CheckBadgeIcon,
    PhotoIcon,
    CheckCircleIcon,
    LinkIcon,
    PlusIcon
} from '@heroicons/react/24/outline';
import { Task } from '../../../types/tasks';

interface TaskOverviewProps {
    task: Task;
    handleToggleItem?: (itemId: string, currentStatus: boolean) => void;
    handleAddItem?: (checklistId: string) => void;
    newItemInputs?: Record<string, string>;
    setNewItemInputs?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    settings?: any;
}

const TaskOverview: React.FC<TaskOverviewProps> = ({
    task,
    handleToggleItem,
    handleAddItem,
    newItemInputs,
    setNewItemInputs,
    settings
}) => {
    const visibility = settings?.taskDetailsVisibility || {
        showDescription: true,
        showRelatedLinks: true,
        showChecklists: true,
        showBusinessValue: true,
        showAcceptanceCriteria: true,
        showAttachments: true,
        showCreatedAt: true
    };

    const [imageBlobUrls, setImageBlobUrls] = useState<Record<string, string>>({});

    const imageAttachments = task.attachments?.filter((file: any) =>
        file.fileType?.startsWith('image/')
    ) || [];

    // Parse acceptance criteria into checklist items
    const parseAcceptanceCriteria = (criteria: string | null | undefined): string[] => {
        if (!criteria) return [];

        // Split by newlines and filter out empty lines
        const lines = criteria.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        // Remove common prefixes like "- ", "* ", "• ", numbers, etc.
        return lines.map(line => {
            return line
                .replace(/^[-*•]\s*/, '')  // Remove bullet points
                .replace(/^\d+\.\s*/, '')  // Remove numbered lists
                .replace(/^✓\s*/, '')      // Remove checkmarks
                .replace(/^☐\s*/, '')      // Remove empty checkboxes
                .replace(/^☑\s*/, '')      // Remove filled checkboxes
                .trim();
        }).filter(line => line.length > 0);
    };

    const acceptanceCriteriaItems = parseAcceptanceCriteria(task.acceptanceCriteria);

    useEffect(() => {
        const loadImages = async () => {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const urls: Record<string, string> = {};

            for (const file of imageAttachments) {
                try {
                    // استخدام file.fileUrl مباشرة من الـ API
                    const imageUrl = file.fileUrl || `/uploads/dev-tasks/${file.fileName}`;
                    const response = await fetch(imageUrl, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (response.ok) {
                        const blob = await response.blob();
                        urls[file.id] = URL.createObjectURL(blob);
                    }
                } catch (error) {
                    console.error('Error loading image:', error);
                }
            }

            setImageBlobUrls(urls);
        };

        if (imageAttachments.length > 0) {
            loadImages();
        }

        return () => {
            Object.values(imageBlobUrls).forEach(url => URL.revokeObjectURL(url));
        };
    }, [task.id]);

    return (
        <div className="space-y-6">
            {/* Description */}
            {visibility.showDescription && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                        <DocumentDuplicateIcon className="h-5 w-5 text-indigo-500" />
                        الوصف
                    </h3>
                    <div className="prose max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {task.description}
                    </div>
                </div>
            )}

            {/* Related Links */}
            {visibility.showRelatedLinks && task.relatedLinks && task.relatedLinks.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                        <LinkIcon className="h-5 w-5 text-indigo-500" />
                        الروابط المرتبطة (Related Links)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {task.relatedLinks.map((link, idx) => (
                            <a
                                key={idx}
                                href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-lg border border-indigo-100 dark:border-indigo-900/20 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group"
                            >
                                <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                                    <LinkIcon className="h-4 w-4 text-indigo-500" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="font-bold text-gray-900 dark:text-gray-100 text-sm truncate">{link.title}</span>
                                    <span className="text-gray-500 dark:text-gray-400 text-xs truncate dir-ltr text-right">{link.url}</span>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Lists/Checklists Section */}
            {visibility.showChecklists && task.checklists && task.checklists.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                        <CheckCircleIcon className="h-5 w-5 text-indigo-500" />
                        القوائم المرجعية (Checklists)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {task.checklists.map((checklist) => (
                            <div key={checklist.id} className="bg-gray-50/50 dark:bg-gray-900/20 rounded-xl p-4 border border-gray-100 dark:border-gray-800/50 flex flex-col">
                                <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                    {checklist.title}
                                    <span className="mr-auto text-[10px] px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-full font-medium">
                                        {checklist.items?.length || 0} عناصر
                                    </span>
                                </h4>
                                <div className="space-y-2 flex-1">
                                    {checklist.items?.map((item) => (
                                        <div key={item.id} className="flex items-center gap-3 group">
                                            <input
                                                type="checkbox"
                                                checked={item.isCompleted}
                                                onChange={() => handleToggleItem?.(item.id, item.isCompleted)}
                                                className="h-4 w-4 text-indigo-600 rounded border-gray-300 cursor-pointer dark:bg-gray-700 dark:border-gray-600 focus:ring-indigo-500"
                                            />
                                            <span
                                                onClick={() => handleToggleItem?.(item.id, item.isCompleted)}
                                                className={`text-sm flex-1 cursor-pointer transition-all ${item.isCompleted ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}
                                            >
                                                {item.content}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {handleAddItem && newItemInputs && setNewItemInputs && (
                                    <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                                        <input
                                            type="text"
                                            value={newItemInputs[checklist.id] || ''}
                                            onChange={(e) => setNewItemInputs({ ...newItemInputs, [checklist.id]: e.target.value })}
                                            onKeyPress={(e) => e.key === 'Enter' && handleAddItem(checklist.id)}
                                            placeholder="إضافة عنصر..."
                                            className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-indigo-500 dark:text-gray-200"
                                        />
                                        <button
                                            onClick={() => handleAddItem(checklist.id)}
                                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                        >
                                            <PlusIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Attached Images - Separate Section */}
            {visibility.showAttachments && imageAttachments.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                        <PhotoIcon className="h-5 w-5 text-indigo-500" />
                        الصور المرفقة ({imageAttachments.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {imageAttachments.map((file: any) => {
                            const imageUrl = imageBlobUrls[file.id];
                            return (
                                <div key={file.id} className="group relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
                                    {imageUrl ? (
                                        <>
                                            <img
                                                src={imageUrl}
                                                alt={file.originalName}
                                                className="w-full h-48 object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                                                <a
                                                    href={imageUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="opacity-0 group-hover:opacity-100 px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg font-medium transition-opacity"
                                                >
                                                    عرض بالحجم الكامل
                                                </a>
                                            </div>
                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                                                <p className="text-white text-xs font-medium truncate">{file.originalName}</p>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="w-full h-48 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Business & Acceptance */}
            {(visibility.showBusinessValue || visibility.showAcceptanceCriteria) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Business Value */}
                    {visibility.showBusinessValue && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm h-full">
                            <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                                <LightBulbIcon className="h-5 w-5 text-yellow-500" />
                                القيمة التجارية
                            </h4>
                            <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-lg p-4 h-[calc(100%-2rem)]">
                                <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                    {task.businessValue || <span className="text-gray-400 italic text-sm">لم يتم تحديد القيمة التجارية</span>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Acceptance Criteria */}
                    {visibility.showAcceptanceCriteria && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm h-full">
                            <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                                <CheckBadgeIcon className="h-5 w-5 text-green-500" />
                                معايير القبول
                                {acceptanceCriteriaItems.length > 0 && (
                                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                                        {acceptanceCriteriaItems.length} معيار
                                    </span>
                                )}
                            </h4>
                            <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-4 h-[calc(100%-2rem)] overflow-y-auto">
                                {acceptanceCriteriaItems.length > 0 ? (
                                    <div className="space-y-2">
                                        {acceptanceCriteriaItems.map((item, index) => (
                                            <div
                                                key={index}
                                                className="flex items-start gap-3 p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors group"
                                            >
                                                <div className="flex-shrink-0 mt-0.5">
                                                    <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                                                </div>
                                                <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed flex-1">
                                                    {item}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center py-8">
                                        <CheckBadgeIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-2" />
                                        <span className="text-gray-400 dark:text-gray-500 italic text-sm">
                                            لم يتم تحديد معايير القبول
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TaskOverview;
