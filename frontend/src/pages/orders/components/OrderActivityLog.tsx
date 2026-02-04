import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    CheckCircleIcon,
    ChatBubbleLeftIcon,
    CalendarIcon
} from '@heroicons/react/24/outline';
import { useDateFormat } from '../../../hooks/useDateFormat';
import { OrderDetailsType } from '../types';

interface OrderActivityLogProps {
    order: OrderDetailsType;
    onAddNote: (note: string) => void;
    addingNote: boolean;
}

const OrderActivityLog: React.FC<OrderActivityLogProps> = ({
    order,
    onAddNote,
    addingNote
}) => {
    const { t } = useTranslation();
    const { formatDateTime } = useDateFormat();
    const [note, setNote] = useState('');

    const handleAddNote = () => {
        if (!note.trim()) return;
        onAddNote(note);
        setNote('');
    };

    // Merge status history, notes, and scheduled info for timeline
    const activities = [
        ...(order.statusHistory || []).map((h: any) => ({
            type: 'status',
            content: t('orderDetails.statusChangeTo', { status: h.status }),
            date: h.createdAt,
            author: h.updatedBy || t('orderDetails.system'),
            icon: CheckCircleIcon,
            color: 'bg-blue-500'
        })),
        ...(order.orderNotes || []).map((n: any) => ({
            type: 'note',
            content: n.content,
            date: n.createdAt,
            author: n.authorName || (n.author ? `${n.author.firstName} ${n.author.lastName}` : t('orderDetails.user')),
            icon: ChatBubbleLeftIcon,
            color: 'bg-gray-500'
        })),
        // Add scheduled order entry
        ...(order.isScheduled && order.scheduledDeliveryDate ? [{
            type: 'scheduled',
            content: `تم جدولة الطلب للتسليم في ${new Date(order.scheduledDeliveryDate).toLocaleDateString('ar-EG', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })} الساعة ${new Date(order.scheduledDeliveryDate).toLocaleTimeString('ar-EG', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
            })}${order.scheduledNotes ? `\n📝 ${order.scheduledNotes}` : ''}`,
            date: order.createdAt,
            author: 'النظام',
            icon: CalendarIcon,
            color: 'bg-orange-500'
        }] : [])
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">{t('orderDetails.activityLog')}</h3>

            {/* Add Note */}
            <div className="mb-6">
                <label htmlFor="comment" className="sr-only">{t('orderDetails.addNote')}</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        name="comment"
                        id="comment"
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                        placeholder={t('orderDetails.addNotePlaceholder')}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                    />
                    <button
                        type="button"
                        onClick={handleAddNote}
                        disabled={addingNote || !note.trim()}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        {addingNote ? t('orderDetails.adding') : t('orderDetails.add')}
                    </button>
                </div>
            </div>

            <div className="flow-root">
                <ul className="-mb-8">
                    {activities.map((activity, activityIdx) => (
                        <li key={activityIdx}>
                            <div className="relative pb-8">
                                {activityIdx !== activities.length - 1 ? (
                                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700" aria-hidden="true"></span>
                                ) : null}
                                <div className="relative flex space-x-3 space-x-reverse">
                                    <div>
                                        <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white dark:ring-gray-800 ${
                                            activity.type === 'status' ? 'bg-blue-500' : 
                                            activity.type === 'scheduled' ? 'bg-orange-500' : 
                                            'bg-gray-500'
                                        }`}>
                                            <activity.icon className="h-5 w-5 text-white" aria-hidden="true" />
                                        </span>
                                    </div>
                                    <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4 space-x-reverse">
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 whitespace-pre-line">
                                                {activity.content} <span className="font-medium text-gray-900 dark:text-gray-100">{activity.author}</span>
                                            </p>
                                        </div>
                                        <div className="text-right text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                                            <time dateTime={activity.date}>{formatDateTime(activity.date)}</time>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </li>
                    ))}
                    {activities.length === 0 && (
                        <li className="text-center text-gray-500 dark:text-gray-400 text-sm py-4">
                            لا يوجد نشاط مسجل
                        </li>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default OrderActivityLog;
