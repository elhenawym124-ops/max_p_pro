import React, { useState, useEffect } from 'react';
import {
    ChartBarIcon,
    ArrowPathIcon,
    ArrowTrendingUpIcon,
    ExclamationTriangleIcon,
    ArchiveBoxIcon,
    CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { companyAwareApi } from '../../services/companyAwareApi';
import { useCurrency } from '../../hooks/useCurrency';

interface InventoryStats {
    totalItems: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    topMovingItems: { productName: string; movementCount: number }[];
}

const InventoryReports: React.FC = () => {
    const { t } = useTranslation();
    const { formatPrice } = useCurrency();
    const [stats, setStats] = useState<InventoryStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const response = await companyAwareApi.get('/inventory');
            if (response.data.success) {
                const items = response.data.data;

                // Aggregate by product for stats
                const productStats: Record<string, { totalStock: number, price: number }> = {};
                items.forEach((item: any) => {
                    const pid = item.productId;
                    if (!productStats[pid]) {
                        productStats[pid] = { totalStock: 0, price: item.products.price || 0 };
                    }
                    productStats[pid].totalStock += item.quantity;
                });

                const productList = Object.values(productStats);
                const totalItems = productList.length;
                const totalValue = productList.reduce((acc, p) => acc + (p.price * p.totalStock), 0);
                const lowStockCount = productList.filter(p => p.totalStock > 0 && p.totalStock <= 5).length;
                const outOfStockCount = productList.filter(p => p.totalStock === 0).length;

                setStats({
                    totalItems,
                    totalValue,
                    lowStockCount,
                    outOfStockCount,
                    topMovingItems: []
                });
            }
        } catch (error) {
            console.error('Error fetching inventory stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        {
            title: t('dashboard.totalProducts'),
            value: stats?.totalItems || 0,
            icon: ArchiveBoxIcon,
            color: 'bg-blue-50 text-blue-600'
        },
        {
            title: t('common.totalValue', 'إجمالي قيمة المخزون'),
            value: formatPrice(stats?.totalValue || 0),
            icon: CurrencyDollarIcon,
            color: 'bg-green-50 text-green-600'
        },
        {
            title: t('dashboard.lowStock'),
            value: stats?.lowStockCount || 0,
            icon: ExclamationTriangleIcon,
            color: 'bg-yellow-50 text-yellow-600'
        },
        {
            title: t('products.outOfStock'),
            value: stats?.outOfStockCount || 0,
            icon: ArrowTrendingUpIcon, // Closest relevant
            color: 'bg-red-50 text-red-600'
        }
    ];

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <ChartBarIcon className="h-8 w-8 text-blue-600" />
                        {t('sidebar.inventoryReports')}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {t('inventory.reportsDescription', 'تحليلات وإحصائيات المخزون والنمو')}
                    </p>
                </div>

                <button
                    onClick={fetchStats}
                    className="mt-4 md:mt-0 flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                >
                    <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    {t('common.updateData')}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {statCards.map((card, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${card.color}`}>
                            <card.icon className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.title}</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{loading ? '...' : card.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('inventory.stockDistribution', 'توزيع المخزون')}</h2>
                    <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500 italic">
                        {t('common.comingSoon', 'جاري العمل على الرسوم البيانية...')}
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('inventory.topMovingProducts', 'أكثر المنتجات حركة')}</h3>
                    <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500 italic">
                        {t('common.noData')}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InventoryReports;
