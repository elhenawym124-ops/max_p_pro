import React from 'react';
import { Activity } from '../../../types/tasks';

interface TaskActivitiesProps {
    activities: Activity[];
}

const TaskActivities: React.FC<TaskActivitiesProps> = ({ activities }) => {

    const getRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'منذ لحظات';
        if (diffInSeconds < 3600) return `منذ ${Math.floor(diffInSeconds / 60)} دقيقة`;
        if (diffInSeconds < 86400) return `منذ ${Math.floor(diffInSeconds / 3600)} ساعة`;
        if (diffInSeconds < 604800) return `منذ ${Math.floor(diffInSeconds / 86400)} يوم`;
        return date.toLocaleDateString('ar-EG');
    };

    return (
        <div className="space-y-6">
            <div className="relative border-l-2 border-gray-200 dark:border-gray-700 mr-4 space-y-8">
                {activities?.map((activity) => (
                    <div key={activity.id} className="relative flex items-start mr-6">
                        <div className="absolute -right-[31px] bg-white dark:bg-gray-800 p-1 rounded-full border border-gray-200 dark:border-gray-700">
                            {activity.memberAvatar ? (
                                <img src={activity.memberAvatar} alt="" className="w-6 h-6 rounded-full" />
                            ) : (
                                <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-400">
                                    {activity.memberName?.charAt(0)}
                                </div>
                            )}
                        </div>
                        <div className="flex-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-100 dark:border-gray-700 mx-2">
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">{activity.memberName}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{getRelativeTime(activity.createdAt)}</span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                {activity.description}
                                {activity.field && (
                                    <span className="block mt-1 text-xs text-gray-500 font-mono bg-white dark:bg-gray-800 p-1 rounded border border-gray-200 dark:border-gray-600 w-fit">
                                        {activity.oldValue ? `${activity.oldValue} ➔ ` : ''}{activity.newValue}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
            {(!activities || activities.length === 0) && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">لا يوجد نشاط مسجل</p>
            )}
        </div>
    );
};

export default TaskActivities;
