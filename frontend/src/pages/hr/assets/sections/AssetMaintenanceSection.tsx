import React, { useState, useEffect } from 'react';
import {
    WrenchScrewdriverIcon,
    CalendarDaysIcon,
    BellAlertIcon,
    PlusIcon,
    ChartBarIcon,
    ShieldExclamationIcon,
    ClockIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { companyAwareApi } from '../../../../services/companyAwareApi';
import { useCurrency } from '../../../../hooks/useCurrency';
import { toast } from 'react-hot-toast';

interface MaintenanceRecord {
    id: string;
    assetId: string;
    type: string;
    description: string;
    cost: number;
    status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    startDate: string;
    completionDate?: string;
    performedBy?: string;
    notes?: string;
    asset?: {
        name: string;
        code: string;
    };
}

interface Alert {
    assetId?: string;
    maintenanceId?: string;
    name: string;
    code: string;
    endDate?: string;
    scheduledDate?: string;
    maintenanceType?: string;
    type: 'WARRANTY' | 'MAINTENANCE';
}

const AssetMaintenanceSection: React.FC = () => {
    const [alerts, setAlerts] = useState<{ expiringWarranties: Alert[], upcomingMaintenance: Alert[] }>({
        expiringWarranties: [],
        upcomingMaintenance: []
    });
    const [history, setHistory] = useState<MaintenanceRecord[]>([]);
    const [assets, setAssets] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const { formatPrice } = useCurrency();

    const [newRecord, setNewRecord] = useState({
        assetId: '',
        type: 'صيانة دورية',
        description: '',
        cost: '',
        status: 'COMPLETED',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        performedBy: '',
        notes: ''
    });

    const fetchData = async () => {
        setLoading(true);
        console.log('🔄 Fetching maintenance data...');
        try {
            // Fetch assets
            const assetsRes = await companyAwareApi.get('/assets');
            if (assetsRes.data.success) {
                console.log('✅ Assets fetched:', assetsRes.data.data.length);
                setAssets(assetsRes.data.data);
            }

            // Fetch alerts
            try {
                const alertsRes = await companyAwareApi.get('/assets/alerts');
                if (alertsRes.data.success) setAlerts(alertsRes.data.data);
            } catch (e) {
                console.error('Error fetching alerts:', e);
            }

            // Fetch history
            try {
                const historyRes = await companyAwareApi.get('/assets/maintenance');
                if (historyRes.data.success) setHistory(historyRes.data.data);
            } catch (e) {
                console.error('Error fetching maintenance history:', e);
            }

        } catch (error) {
            console.error('Error in main maintenance fetch:', error);
            toast.error('حدث خطأ أثناء تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddMaintenance = async () => {
        if (!newRecord.assetId || !newRecord.description) {
            toast.error('يرجى اكمال البيانات المطلوبة');
            return;
        }

        try {
            const response = await companyAwareApi.post(`/assets/${newRecord.assetId}/maintenance`, newRecord);
            if (response.data.success) {
                toast.success('تم تسجيل سجل الصيانة بنجاح');
                setShowAddModal(false);
                fetchData();
            }
        } catch (error) {
            toast.error('فشل في حفظ سجل الصيانة');
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                        <WrenchScrewdriverIcon className="h-8 w-8 text-indigo-600" />
                        الصيانة والضمان
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        إدارة سجلات الصيانة، جدولة المواعيد، ومتابعة تنبيهات الضمان
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
                    >
                        <PlusIcon className="h-5 w-5" />
                        تسجيل صيانة
                    </button>
                    <button
                        onClick={fetchData}
                        className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 transition-all"
                    >
                        <ArrowPathIcon className={`h-5 w-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Alerts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Due Warranties */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-red-100 dark:border-red-900/20 overflow-hidden shadow-sm">
                    <div className="bg-red-50 dark:bg-red-900/10 px-6 py-4 border-b border-red-100 dark:border-red-900/20 flex items-center gap-3">
                        <ShieldExclamationIcon className="h-5 w-5 text-red-600" />
                        <h3 className="font-black text-red-900 dark:text-red-400">تنبيهات انتهاء الضمان (خلال 30 يوم)</h3>
                    </div>
                    <div className="p-4 space-y-3">
                        {alerts.expiringWarranties.length === 0 ? (
                            <p className="text-center py-8 text-gray-400 italic text-sm">لا توجد ضمانات قاربت على الانتهاء</p>
                        ) : alerts.expiringWarranties.map((alert, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-red-50/30 dark:bg-red-900/5 rounded-2xl border border-red-50 dark:border-red-900/10 transition-all hover:scale-[1.01]">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600">
                                        <BellAlertIcon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">{alert.name}</h4>
                                        <p className="text-[10px] text-gray-400 font-mono">{alert.code}</p>
                                    </div>
                                </div>
                                <div className="text-left">
                                    <span className="text-[10px] text-gray-400 block mb-1">تاريخ الانتهاء</span>
                                    <span className="text-xs font-black text-red-600">
                                        {alert.endDate ? format(new Date(alert.endDate), 'yyyy/MM/dd') : '-'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Upcoming Maintenance */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-amber-100 dark:border-amber-900/20 overflow-hidden shadow-sm">
                    <div className="bg-amber-50 dark:bg-amber-900/10 px-6 py-4 border-b border-amber-100 dark:border-amber-900/20 flex items-center gap-3">
                        <CalendarDaysIcon className="h-5 w-5 text-amber-600" />
                        <h3 className="font-black text-amber-900 dark:text-amber-400">مواعيد الصيانة القادمة</h3>
                    </div>
                    <div className="p-4 space-y-3">
                        {alerts.upcomingMaintenance.length === 0 ? (
                            <p className="text-center py-8 text-gray-400 italic text-sm">لا توجد صيانات مجدولة حالياً</p>
                        ) : alerts.upcomingMaintenance.map((alert, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-amber-50/30 dark:bg-amber-900/5 rounded-2xl border border-amber-50 dark:border-amber-900/10 transition-all hover:scale-[1.01]">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
                                        <ClockIcon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">{alert.name}</h4>
                                        <p className="text-[10px] text-gray-400 font-bold text-amber-600 uppercase">{alert.maintenanceType}</p>
                                    </div>
                                </div>
                                <div className="text-left">
                                    <span className="text-[10px] text-gray-400 block mb-1">تاريخ الصيانة</span>
                                    <span className="text-xs font-black text-gray-900 dark:text-white">
                                        {alert.scheduledDate ? format(new Date(alert.scheduledDate), 'yyyy/MM/dd') : '-'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Maintenance History Table */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <ChartBarIcon className="h-6 w-6 text-indigo-600" />
                        سجل العمليات الأخير
                    </h3>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden">
                    <table className="w-full text-right">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                                <th className="px-6 py-5">الأصل</th>
                                <th className="px-6 py-5">النوع</th>
                                <th className="px-6 py-5">التكلفة</th>
                                <th className="px-6 py-5">التاريخ</th>
                                <th className="px-6 py-5">الحالة</th>
                                <th className="px-6 py-5">بواسطة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                            {history.map(rec => (
                                <tr key={rec.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-900 dark:text-white text-sm">{rec.asset?.name}</span>
                                            <span className="text-[10px] text-gray-400 font-mono">{rec.asset?.code}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-gray-700 dark:text-gray-300 text-sm">{rec.type}</span>
                                            <p className="text-[10px] text-gray-400 italic truncate max-w-[150px]">{rec.description}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="font-black text-sm text-gray-900 dark:text-white">{formatPrice(rec.cost)}</span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="text-xs font-bold text-gray-500">{format(new Date(rec.startDate), 'yyyy/MM/dd')}</span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black border ${rec.status === 'COMPLETED' ? 'bg-green-100 text-green-700 border-green-200' :
                                            rec.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                'bg-gray-100 text-gray-600 border-gray-200'
                                            }`}>
                                            {rec.status === 'COMPLETED' ? 'مكتمل' : 'مجدول'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-sm text-gray-500">
                                        {rec.performedBy || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Maintenance Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-[2.5rem] p-10 shadow-2xl animate-scale-in">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white">تسجيل عملية صيانة / جدولة</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 text-3xl font-light transition-colors">&times;</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">اختيار الأصل</label>
                                <select
                                    value={newRecord.assetId}
                                    onChange={(e) => setNewRecord({ ...newRecord, assetId: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-600 rounded-2xl px-5 py-3 text-sm font-bold dark:text-white focus:border-indigo-500 outline-none transition-all"
                                >
                                    <option value="">-- اختر الأصل من القائمة --</option>
                                    {assets.map(a => (
                                        <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">نوع العملية</label>
                                <select
                                    value={newRecord.type}
                                    onChange={(e) => setNewRecord({ ...newRecord, type: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-600 rounded-2xl px-5 py-3 text-sm font-bold dark:text-white focus:border-indigo-500 outline-none transition-all"
                                >
                                    <option>صيانة دورية</option>
                                    <option>إصلاح عطل</option>
                                    <option>تحديث (Upgrade)</option>
                                    <option>فحص وقائي</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">الحالة</label>
                                <select
                                    value={newRecord.status}
                                    onChange={(e) => setNewRecord({ ...newRecord, status: e.target.value as any })}
                                    className="w-full bg-gray-50 dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-600 rounded-2xl px-5 py-3 text-sm font-bold dark:text-white focus:border-indigo-500 outline-none transition-all"
                                >
                                    <option value="COMPLETED">تمت بنجاح (سجل تاريخي)</option>
                                    <option value="SCHEDULED">مجدولة (تنبيه مستقبلي)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">التكلفة المتوقعة/الفعلية</label>
                                <input
                                    type="number"
                                    value={newRecord.cost}
                                    onChange={(e) => setNewRecord({ ...newRecord, cost: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-600 rounded-2xl px-5 py-3 text-sm font-bold dark:text-white focus:border-indigo-500 outline-none transition-all"
                                    placeholder="0.00"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">التاريخ</label>
                                <input
                                    type="date"
                                    value={newRecord.startDate}
                                    onChange={(e) => setNewRecord({ ...newRecord, startDate: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-600 rounded-2xl px-5 py-3 text-sm font-bold dark:text-white focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">وصف العملية / ملاحظات</label>
                                <textarea
                                    value={newRecord.description}
                                    onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-600 rounded-2xl px-5 py-4 text-sm font-bold dark:text-white h-24 outline-none focus:border-indigo-500 transition-all"
                                    placeholder="اكتب تفاصيل ما تم أو ما سيتم القيام به..."
                                ></textarea>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-10">
                            <button
                                onClick={handleAddMaintenance}
                                className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-indigo-700 shadow-xl shadow-indigo-100 dark:shadow-none transform hover:-translate-y-1 transition-all"
                            >
                                حفظ السجل / الجدولة
                            </button>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 py-4 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all"
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssetMaintenanceSection;
