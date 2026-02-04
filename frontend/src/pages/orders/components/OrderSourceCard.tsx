import React from 'react';
import { Link } from 'react-router-dom';
import {
    UserIcon,
    ChatBubbleLeftRightIcon,
    GlobeAltIcon,
    UserGroupIcon,
    SparklesIcon,
    ClockIcon
} from '@heroicons/react/24/outline';
import { useDateFormat } from '../../../hooks/useDateFormat';

interface OrderSourceCardProps {
    order: {
        conversationId?: string;
        conversation?: {
            id: string;
            channel: string;
        };
        orderSource?: string;
        sourceType?: string;
        extractionMethod?: string;
        affiliateId?: string;
        affiliate?: {
            id: string;
            affiliateCode?: string;
            status?: string;
            user?: {
                firstName: string;
                lastName: string;
                email: string;
            };
        };
        createdBy?: string;
        createdByName?: string;
        createdByUser?: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
        };
        createdAt: string;
        metadata?: any;
    };
}

const OrderSourceCard: React.FC<OrderSourceCardProps> = ({ order }) => {
    const { formatDateTime } = useDateFormat();

    const getChannelInfo = () => {
        if (!order.conversation && !order.conversationId) return null;

        const channel = order.conversation?.channel || 'UNKNOWN';
        const channelMap: Record<string, { name: string; color: string; icon: string }> = {
            WHATSAPP: { name: 'واتساب', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400', icon: '💬' },
            FACEBOOK: { name: 'فيسبوك', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400', icon: '📘' },
            INSTAGRAM: { name: 'انستجرام', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400', icon: '📷' },
            TELEGRAM: { name: 'تيليجرام', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/20 dark:text-sky-400', icon: '✈️' },
            WEBCHAT: { name: 'الدردشة المباشرة', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400', icon: '💻' }
        };

        return channelMap[channel] || { name: channel, color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400', icon: '📱' };
    };

    const getSourceTypeInfo = () => {
        // محاولة تحديد المصدر من البيانات المتاحة
        let sourceType = order.sourceType;

        // التحقق من extractionMethod أولاً
        if (order.extractionMethod === 'manual' || order.extractionMethod === 'manual_order_modal') {
            sourceType = 'manual';
        }
        // إذا لم يكن هناك sourceType أو كان unknown، نحاول التخمين
        else if (!sourceType || sourceType === 'unknown' || (sourceType === 'ai_conversation' && !order.conversationId)) {
            if (order.conversationId) {
                sourceType = 'ai_conversation';
            } else if (order.createdBy || order.createdByName) {
                sourceType = 'manual';
            } else if (order.metadata?.source === 'storefront' || order.metadata?.isGuestOrder) {
                sourceType = 'storefront';
            } else {
                sourceType = 'unknown';
            }
        }

        const sourceMap: Record<string, { name: string; icon: string }> = {
            ai_conversation: { name: 'محادثة AI', icon: '🤖' },
            manual: { name: 'طلب يدوي', icon: '✍️' },
            manual_order_modal: { name: 'طلب يدوي', icon: '✍️' },
            storefront: { name: 'المتجر الإلكتروني', icon: '🛒' },
            woocommerce: { name: 'WooCommerce', icon: '🛍️' },
            api: { name: 'API', icon: '🔌' },
            import: { name: 'استيراد', icon: '📥' },
            unknown: { name: 'غير محدد', icon: '❓' }
        };

        return sourceMap[sourceType] || { name: 'غير محدد', icon: '📋' };
    };

    const channelInfo = getChannelInfo();
    const sourceTypeInfo = getSourceTypeInfo();

    return (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center">
                    <SparklesIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">مصدر الطلب</h3>
            </div>

            <div className="space-y-4">
                {/* Created By User */}
                {(order.createdBy || order.createdByName || order.createdByUser) && (
                    <div className="flex items-start gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/10 rounded-lg border border-indigo-200 dark:border-indigo-800">
                        <UserIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">أنشئ بواسطة</div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                                {order.createdByUser
                                    ? `${order.createdByUser.firstName} ${order.createdByUser.lastName}`
                                    : order.createdByName || 'موظف'}
                            </div>
                            {order.createdByUser?.email && (
                                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {order.createdByUser.email}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Channel Info */}
                {channelInfo && (
                    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/10 rounded-lg border border-gray-200 dark:border-gray-700">
                        <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">القناة</div>
                            <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium ${channelInfo.color}`}>
                                    <span>{channelInfo.icon}</span>
                                    <span>{channelInfo.name}</span>
                                </span>
                                {order.conversationId && (
                                    <Link
                                        to={`/whatsapp?conversationId=${order.conversationId}`}
                                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                        عرض المحادثة
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Source Type */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/10 rounded-lg border border-gray-200 dark:border-gray-700">
                    <GlobeAltIcon className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">نوع المصدر</div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {sourceTypeInfo.icon} {sourceTypeInfo.name}
                            </span>
                            {order.extractionMethod && order.extractionMethod !== 'manual' && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    ({order.extractionMethod === 'ai_enhanced' ? 'AI محسّن' : order.extractionMethod})
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Affiliate Info */}
                {order.affiliateId && order.affiliate && (
                    <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200 dark:border-purple-800">
                        <UserGroupIcon className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">مسوق بالعمولة</div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                                {order.affiliate.user
                                    ? `${order.affiliate.user.firstName} ${order.affiliate.user.lastName}`
                                    : 'مسوق'}
                            </div>
                            {order.affiliate.affiliateCode && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    كود: {order.affiliate.affiliateCode}
                                </div>
                            )}
                            {order.affiliate.user?.email && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {order.affiliate.user.email}
                                </div>
                            )}
                            <Link
                                to={`/affiliates/${order.affiliateId}`}
                                className="text-xs text-purple-600 dark:text-purple-400 hover:underline mt-1 inline-block"
                            >
                                عرض التفاصيل
                            </Link>
                        </div>
                    </div>
                )}

                {/* Order Source Badge */}
                {order.orderSource && order.orderSource !== 'REGULAR' && (
                    <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800">
                        <SparklesIcon className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">نوع الطلب</div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {order.orderSource === 'AFFILIATE_REFERRAL' && '🔗 إحالة مسوق'}
                                {order.orderSource === 'AFFILIATE_DIRECT' && '👤 طلب مباشر من مسوق'}
                            </div>
                        </div>
                    </div>
                )}

                {/* Creation Time */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/10 rounded-lg border border-gray-200 dark:border-gray-700">
                    <ClockIcon className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">تاريخ الإنشاء</div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {formatDateTime(order.createdAt)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderSourceCard;
