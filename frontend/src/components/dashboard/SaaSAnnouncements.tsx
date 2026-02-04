import React from 'react';
import { XMarkIcon, SparklesIcon, MegaphoneIcon, RocketLaunchIcon } from '@heroicons/react/24/outline';

// Types
export type AnnouncementType = 'feature' | 'alert' | 'promotion' | 'update';

export interface Announcement {
    id: string;
    type: AnnouncementType;
    title: string;
    message: string;
    actionLabel?: string;
    actionUrl?: string;
    isDismissible?: boolean;
}

interface SaaSAnnouncementsProps {
    announcements?: Announcement[];
    onDismiss?: (id: string) => void;
}

const SaaSAnnouncements: React.FC<SaaSAnnouncementsProps> = ({
    announcements = [],
    onDismiss
}) => {
    // Mock data if no props provided (for development/preview)
    const defaultAnnouncements: Announcement[] = [
        {
            id: '1',
            type: 'feature',
            title: 'أداة الذكاء الاصطناعي الجديدة!',
            message: 'الآن يمكنك كتابة وصف المنتجات وتوليد ردود العملاء تلقائياً باستخدام نموذجنا الجديد المتطور. جربه الآن وارفع كفاءة متجرك.',
            actionLabel: 'جرب الآن',
            actionUrl: '/ai-management',
            isDismissible: true
        }
    ];

    const displayItems = announcements.length > 0 ? announcements : defaultAnnouncements;

    if (displayItems.length === 0) return null;

    const getIcon = (type: AnnouncementType) => {
        switch (type) {
            case 'feature': return <SparklesIcon className="h-6 w-6 text-purple-600" />;
            case 'alert': return <MegaphoneIcon className="h-6 w-6 text-amber-600" />;
            case 'promotion': return <RocketLaunchIcon className="h-6 w-6 text-indigo-600" />;
            case 'update': return <SparklesIcon className="h-6 w-6 text-blue-600" />;
        }
    };

    const getStyles = (type: AnnouncementType) => {
        switch (type) {
            case 'feature':
                return 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200';
            case 'alert':
                return 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200';
            case 'promotion':
                return 'bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200';
            case 'update':
                return 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200';
        }
    };

    return (
        <div className="space-y-4 mb-8">
            {displayItems.map((item) => (
                <div
                    key={item.id}
                    className={`relative overflow-hidden rounded-2xl border p-1 ${getStyles(item.type)} shadow-sm transition-all duration-300 hover:shadow-md`}
                >
                    {/* Background pattern */}
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-40 rounded-full blur-2xl"></div>

                    <div className="relative flex items-center p-4">
                        <div className="flex-shrink-0 p-3 bg-white rounded-xl shadow-sm ml-4">
                            {getIcon(item.type)}
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 text-xs font-bold rounded-full uppercase tracking-wider ${item.type === 'feature' ? 'bg-purple-100 text-purple-700' :
                                        item.type === 'alert' ? 'bg-amber-100 text-amber-700' :
                                            'bg-indigo-100 text-indigo-700'
                                    }`}>
                                    {item.type === 'feature' ? 'جديد' : item.type === 'alert' ? 'تنبيه' : 'تحديث'}
                                </span>
                                <h3 className="font-bold text-gray-900">{item.title}</h3>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                {item.message}
                            </p>

                            {item.actionLabel && (
                                <div className="mt-3">
                                    <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors">
                                        {item.actionLabel}
                                        <span aria-hidden="true">←</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {item.isDismissible && onDismiss && (
                            <button
                                onClick={() => onDismiss(item.id)}
                                className="absolute top-4 left-4 p-1 text-gray-400 hover:text-gray-600 hover:bg-black/5 rounded-full transition-colors"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SaaSAnnouncements;
