import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChartBarIcon,
    ArrowDownTrayIcon,
    CalendarDaysIcon,
    BuildingOffice2Icon,
    ShoppingCartIcon,
    CurrencyDollarIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    UserGroupIcon,
    ExclamationCircleIcon,
    SunIcon,
    ArrowUturnLeftIcon,
    CalendarIcon,
    Squares2X2Icon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { apiClient } from '../../services/apiClient';

interface CompanySalesData {
    company: {
        id: string;
        name: string;
        logo: string | null;
    };
    stats: {
        totalOrders: number;
        totalRevenue: number;
        completedOrders: number;
        cancelledOrders: number;
        completionRate: number;
    };
}

interface SalesReportData {
    dateRange: { start: string; end: string };
    overview: {
        totalCompanies: number;
        totalOrders: number;
        totalRevenue: number;
        totalCompleted: number;
        totalCancelled: number;
    };
    byCompany: CompanySalesData[];
}

interface TodayAttendanceRecord {
    id: string;
    employee: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        avatar: string | null;
        employeeNumber: string | null;
    };
    company: {
        id: string;
        name: string;
        logo: string | null;
    };
    checkIn: string;
    checkOut: string | null;
    workHours: number | null;
    lateMinutes: number;
    status: 'PRESENT' | 'LATE';
}

interface TodayAttendanceData {
    date: string;
    totalPresent: number;
    totalLate: number;
    records: TodayAttendanceRecord[];
}

const OwnerReports: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'sales' | 'todayAttendance'>('todayAttendance');
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [reportData, setReportData] = useState<SalesReportData | null>(null);
    const [todayAttendanceData, setTodayAttendanceData] = useState<TodayAttendanceData | null>(null);

    // Date filters for sales
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    // Date filters for attendance
    const [attendanceStartDate, setAttendanceStartDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [attendanceEndDate, setAttendanceEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [attendancePreset, setAttendancePreset] = useState<string>('today');

    const handleRangeSelect = (range: string) => {
        const end = new Date();
        const start = new Date();

        switch (range) {
            case 'today':
                break;
            case 'yesterday':
                start.setDate(start.getDate() - 1);
                end.setDate(end.getDate() - 1);
                break;
            case 'week':
                start.setDate(start.getDate() - 7);
                break;
            case 'month':
                start.setMonth(start.getMonth() - 1);
                break;
            case 'thisMonth':
                start.setDate(1);
                break;
            case 'lastMonth':
                start.setMonth(start.getMonth() - 1);
                start.setDate(1);
                end.setDate(0);
                break;
            case 'year':
                start.setFullYear(start.getFullYear() - 1);
                break;
        }

        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    };

    const handleAttendancePresetChange = (preset: string) => {
        setAttendancePreset(preset);
        const today = new Date();
        let start = new Date();
        let end = new Date();

        switch (preset) {
            case 'today':
                start = today;
                end = today;
                break;
            case 'yesterday':
                start.setDate(today.getDate() - 1);
                end.setDate(today.getDate() - 1);
                break;
            case 'lastWeek':
                start.setDate(today.getDate() - 7);
                end = today;
                break;
            case 'thisMonth':
                start.setDate(1);
                end = today;
                break;
            case 'lastMonth':
                start.setMonth(today.getMonth() - 1);
                start.setDate(1);
                end.setMonth(today.getMonth());
                end.setDate(0);
                break;
            default:
                return; // Custom
        }

        setAttendanceStartDate(start.toISOString().split('T')[0]);
        setAttendanceEndDate(end.toISOString().split('T')[0]);
    };

    const getImageUrl = (path: string | null) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        const backendUrl = import.meta.env['VITE_API_URL']?.replace('/api/v1', '') || 'https://maxp-ai.pro';
        return `${backendUrl}/${path.replace(/^\/+/, '')}`;
    };

    const handleSwitchToCompany = async (companyId: string) => {
        try {
            const response = await apiClient.post(`/auth/switch-company/${companyId}`);
            if (response.data.success) {
                // Update token if new one is returned
                if (response.data.token) {
                    localStorage.setItem('accessToken', response.data.token);
                }
                toast.success('تم التبديل للشركة بنجاح');
                // Reload to stay on current page with new company context
                window.location.reload();
            } else {
                toast.error(response.data.message || 'فشل التبديل للشركة');
            }
        } catch (error) {
            console.error('Failed to switch company:', error);
            toast.error('فشل التبديل للشركة');
        }
    };

    useEffect(() => {
        if (activeTab === 'sales') {
            fetchSalesReport();
        } else {
            fetchTodayAttendance();
        }
    }, [startDate, endDate, attendanceStartDate, attendanceEndDate, activeTab]);

    const fetchSalesReport = async () => {
        try {
            setIsLoading(true);
            const response = await apiClient.get('owner/reports/sales', {
                params: { startDate, endDate }
            });
            if (response.data.success) {
                setReportData(response.data.data);
            } else {
                toast.error(response.data.message || 'فشل تحميل التقرير');
            }
        } catch (error) {
            console.error('Failed to fetch report', error);
            toast.error('فشل تحميل التقرير');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchTodayAttendance = async () => {
        try {
            setIsLoading(true);
            const response = await apiClient.get('owner/reports/today-attendance', {
                params: {
                    startDate: attendanceStartDate,
                    endDate: attendanceEndDate
                }
            });
            if (response.data.success) {
                // Now we get actual attendance records including employee names
                const attendanceData = response.data.data;
                const transformedData: TodayAttendanceData = {
                    date: attendanceData.date,
                    totalPresent: attendanceData.totalPresent,
                    totalLate: attendanceData.totalLate,
                    records: attendanceData.records
                };
                setTodayAttendanceData(transformedData);
            } else {
                toast.error(response.data.message || 'فشل تحميل تقرير الحضور');
            }
        } catch (error) {
            console.error('Failed to fetch attendance', error);
            toast.error('فشل تحميل تقرير الحضور');
        } finally {
            setIsLoading(false);
        }
    };

    const handleExportSales = async () => {
        try {
            setIsExporting(true);
            if (!reportData) return;

            const headers = ['الشركة', 'الطلبات', 'الإيرادات', 'مكتمل', 'ملغي', 'نسبة الإكمال'];
            const rows = reportData.byCompany.map(c => [
                c.company.name,
                c.stats.totalOrders,
                c.stats.totalRevenue,
                c.stats.completedOrders,
                c.stats.cancelledOrders,
                `${c.stats.completionRate}%`
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(r => r.join(','))
            ].join('\n');

            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `sales-report-${startDate}-to-${endDate}.csv`;
            link.click();

            toast.success('تم تصدير التقرير');
        } catch (error) {
            toast.error('فشل التصدير');
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportAttendance = async () => {
        try {
            setIsExporting(true);
            if (!todayAttendanceData) return;

            const headers = ['الموظف', 'الشركة', 'وقت الحضور', 'وقت الانصراف', 'ساعات العمل', 'التأخير (دقيقة)', 'الحالة'];
            const rows = todayAttendanceData.records.map(r => [
                `${r.employee.firstName} ${r.employee.lastName}`,
                r.company.name,
                new Date(r.checkIn).toLocaleTimeString('ar-EG'),
                r.checkOut ? new Date(r.checkOut).toLocaleTimeString('ar-EG') : 'لم ينصرف بعد',
                r.workHours ? r.workHours.toFixed(2) : '-',
                r.lateMinutes,
                r.status === 'LATE' ? 'متأخر' : 'في الوقت'
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(r => r.join(','))
            ].join('\n');

            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `today-attendance-${todayAttendanceData.date}.csv`;
            link.click();

            toast.success('تم تصدير التقرير');
        } catch (error) {
            toast.error('فشل التصدير');
        } finally {
            setIsExporting(false);
        }
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (isLoading) {
        return (
            <div className="p-6 space-y-6 min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-lg font-medium text-gray-600 dark:text-gray-400">جاري تحميل البيانات...</p>
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">يرجى الانتظار قليلاً</p>
                    </div>
                </div>
            </div>
        );
    }

    const overview = reportData?.overview;
    const companies = reportData?.byCompany || [];

    return (
        <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen" dir="rtl">
            {/* Header with Tabs */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex flex-col md:flex-row justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <ChartBarIcon className="w-7 h-7 text-blue-600" />
                            التقارير الموحدة
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">تقارير شاملة لجميع شركاتك</p>
                    </div>
                    <div className="mt-4 md:mt-0 flex gap-2">
                        <button
                            onClick={activeTab === 'sales' ? handleExportSales : handleExportAttendance}
                            disabled={isExporting}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
                        >
                            {isExporting ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <ArrowDownTrayIcon className="w-4 h-4" />
                            )}
                            تصدير
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                    <button
                        onClick={() => setActiveTab('todayAttendance')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'todayAttendance'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                    >
                        <ClockIcon className="w-5 h-5" />
                        حضور اليوم
                    </button>
                    <button
                        onClick={() => setActiveTab('sales')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'sales'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                    >
                        <ShoppingCartIcon className="w-5 h-5" />
                        تقرير المبيعات
                    </button>
                </div>
            </div>

            {/* Today's Attendance Tab */}
            {activeTab === 'todayAttendance' && todayAttendanceData && (
                <>
                    {/* Date Filters for Attendance - Improved UX */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                        <div className="flex items-center gap-2 mb-3">
                            <CalendarDaysIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">اختر الفترة الزمنية</h3>
                        </div>

                        {/* Quick Filter Buttons */}
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => handleAttendancePresetChange('today')}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${attendancePreset === 'today'
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                <SunIcon className="w-4 h-4" />
                                <span className="text-sm">اليوم</span>
                            </button>

                            <button
                                onClick={() => handleAttendancePresetChange('yesterday')}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${attendancePreset === 'yesterday'
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                <ArrowUturnLeftIcon className="w-4 h-4" />
                                <span className="text-sm">أمس</span>
                            </button>

                            <button
                                onClick={() => handleAttendancePresetChange('lastWeek')}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${attendancePreset === 'lastWeek'
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                <CalendarIcon className="w-4 h-4" />
                                <span className="text-sm">آخر 7 أيام</span>
                            </button>

                            <button
                                onClick={() => handleAttendancePresetChange('thisMonth')}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${attendancePreset === 'thisMonth'
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                <Squares2X2Icon className="w-4 h-4" />
                                <span className="text-sm">هذا الشهر</span>
                            </button>

                            <button
                                onClick={() => handleAttendancePresetChange('lastMonth')}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${attendancePreset === 'lastMonth'
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                <CalendarDaysIcon className="w-4 h-4" />
                                <span className="text-sm">الشهر الماضي</span>
                            </button>
                        </div>

                        {/* Custom Date Range */}
                        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2 mb-2">
                                <input
                                    type="checkbox"
                                    id="customRange"
                                    checked={attendancePreset === 'custom'}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setAttendancePreset('custom');
                                        }
                                    }}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="customRange" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    فترة مخصصة
                                </label>
                            </div>

                            {attendancePreset === 'custom' && (
                                <div className="flex flex-wrap items-center gap-3 mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/30 animate-fadeIn">
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">من:</label>
                                        <input
                                            type="date"
                                            value={attendanceStartDate}
                                            onChange={(e) => setAttendanceStartDate(e.target.value)}
                                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                    <span className="text-gray-400 font-bold">→</span>
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">إلى:</label>
                                        <input
                                            type="date"
                                            value={attendanceEndDate}
                                            onChange={(e) => setAttendanceEndDate(e.target.value)}
                                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 p-5 rounded-xl text-white shadow-lg">
                            <div className="flex items-center gap-2 text-sm opacity-90 mb-2">
                                <CalendarDaysIcon className="w-5 h-5" />
                                <span className="font-medium">الفترة المختارة</span>
                            </div>
                            <p className="text-lg font-bold leading-relaxed">
                                {attendanceStartDate === attendanceEndDate
                                    ? new Date(attendanceStartDate).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                                    : `${new Date(attendanceStartDate).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })} - ${new Date(attendanceEndDate).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })}`
                                }
                            </p>
                            <div className="mt-3 pt-3 border-t border-white/20">
                                <p className="text-xs opacity-80">
                                    {attendanceStartDate === attendanceEndDate ? 'يوم واحد' :
                                        `${Math.ceil((new Date(attendanceEndDate).getTime() - new Date(attendanceStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} يوم`}
                                </p>
                            </div>
                        </div>
                        <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-xl text-white">
                            <div className="flex items-center gap-2 text-sm opacity-80">
                                <UserGroupIcon className="w-4 h-4" />
                                إجمالي الحضور
                            </div>
                            <p className="text-3xl font-bold mt-1">{todayAttendanceData.totalPresent}</p>
                        </div>
                        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-4 rounded-xl text-white">
                            <div className="flex items-center gap-2 text-sm opacity-80">
                                <ExclamationCircleIcon className="w-4 h-4" />
                                متأخرين
                            </div>
                            <p className="text-3xl font-bold mt-1">{todayAttendanceData.totalLate}</p>
                        </div>
                    </div>

                    {/* Attendance Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <ClockIcon className="w-5 h-5 text-blue-600" />
                                سجل حضور اليوم
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">الموظفين اللي سجلوا حضورهم اليوم فقط</p>
                        </div>

                        {todayAttendanceData.records.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                <ClockIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p className="text-lg font-medium">لا يوجد حضور مسجل اليوم</p>
                                <p className="text-sm">لم يسجل أي موظف حضوره حتى الآن</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-900">
                                        <tr>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">الموظف</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">الشركة</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">وقت الحضور</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">وقت الانصراف</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ساعات العمل</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">الحالة</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {todayAttendanceData.records.map((record) => (
                                            <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
                                                            {record.employee.avatar ? (
                                                                <img src={getImageUrl(record.employee.avatar) || ''} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="text-lg font-bold text-gray-400">
                                                                    {record.employee.firstName?.charAt(0)}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-white">
                                                                {record.employee.firstName} {record.employee.lastName}
                                                            </p>
                                                            {record.employee.employeeNumber && (
                                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                    #{record.employee.employeeNumber}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center overflow-hidden">
                                                            {record.company.logo ? (
                                                                <img src={getImageUrl(record.company.logo) || ''} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <BuildingOffice2Icon className="w-3 h-3 text-gray-400" />
                                                            )}
                                                        </div>
                                                        <span className="text-sm text-gray-700 dark:text-gray-300">{record.company.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-green-600 dark:text-green-400 font-medium">
                                                        {formatTime(record.checkIn)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {record.checkOut ? (
                                                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                                                            {formatTime(record.checkOut)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 text-sm">لم ينصرف بعد</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {record.workHours ? (
                                                        <span className="font-medium text-gray-700 dark:text-gray-300">
                                                            {record.workHours.toFixed(1)} ساعة
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {record.status === 'LATE' ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-full text-xs font-medium">
                                                            <ExclamationCircleIcon className="w-3.5 h-3.5" />
                                                            متأخر {record.lateMinutes} دقيقة
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full text-xs font-medium">
                                                            <CheckCircleIcon className="w-3.5 h-3.5" />
                                                            في الوقت
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Sales Tab */}
            {activeTab === 'sales' && (
                <>
                    {/* Date Filters */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex flex-wrap gap-3 items-center justify-center md:justify-start">
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => handleRangeSelect('today')} className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors">اليوم</button>
                                <button onClick={() => handleRangeSelect('yesterday')} className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors">أمس</button>
                                <button onClick={() => handleRangeSelect('week')} className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors">آخر 7 أيام</button>
                                <button onClick={() => handleRangeSelect('month')} className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors">آخر 30 يوم</button>
                                <button onClick={() => handleRangeSelect('thisMonth')} className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors">هذا الشهر</button>
                                <button onClick={() => handleRangeSelect('lastMonth')} className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors">الشهر الماضي</button>
                            </div>
                            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900/50 p-1.5 rounded-lg border border-gray-100 dark:border-gray-700">
                                <CalendarDaysIcon className="w-4 h-4 text-gray-400 mr-1" />
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent border-none text-sm text-gray-700 dark:text-gray-200 focus:ring-0 p-0 w-32" />
                                <span className="text-gray-400 text-sm">إلى</span>
                                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent border-none text-sm text-gray-700 dark:text-gray-200 focus:ring-0 p-0 w-32" />
                            </div>
                        </div>
                    </div>

                    {/* Overview Stats */}
                    {overview && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-xl text-white">
                                <p className="text-sm opacity-80">عدد الشركات</p>
                                <p className="text-2xl font-bold mt-1">{overview.totalCompanies}</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                                    <ShoppingCartIcon className="w-4 h-4" /> إجمالي الطلبات
                                </div>
                                <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{overview.totalOrders}</p>
                            </div>
                            <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-xl text-white">
                                <div className="flex items-center gap-2 text-sm opacity-80">
                                    <CurrencyDollarIcon className="w-4 h-4" /> إجمالي الإيرادات
                                </div>
                                <p className="text-2xl font-bold mt-1">{overview.totalRevenue.toLocaleString()} ج.م</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-2 text-green-600 text-sm">
                                    <CheckCircleIcon className="w-4 h-4" /> مكتمل
                                </div>
                                <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{overview.totalCompleted}</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-2 text-red-600 text-sm">
                                    <XCircleIcon className="w-4 h-4" /> ملغي
                                </div>
                                <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{overview.totalCancelled}</p>
                            </div>
                        </div>
                    )}

                    {/* Companies Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white">مقارنة الشركات</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-900">
                                    <tr>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">الشركة</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">الطلبات</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">الإيرادات</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">مكتمل</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ملغي</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">نسبة الإكمال</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {companies.map((item) => (
                                        <tr 
                                            key={item.company.id} 
                                            className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                                                        {item.company.logo ? (
                                                            <img src={getImageUrl(item.company.logo) || ''} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <BuildingOffice2Icon className="w-4 h-4 text-gray-400" />
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigate(`/my-companies/company/${item.company.id}/orders`);
                                                            }}
                                                            className="font-semibold text-blue-600 dark:text-blue-400 hover:underline text-right cursor-pointer"
                                                        >
                                                            🏢 {item.company.name}
                                                        </button>
                                                        <span className="text-xs text-gray-400">اضغط لعرض التفاصيل</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{item.stats.totalOrders}</td>
                                            <td className="px-6 py-4 text-green-600 font-medium">{item.stats.totalRevenue.toLocaleString()} ج.م</td>
                                            <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{item.stats.completedOrders}</td>
                                            <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{item.stats.cancelledOrders}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.stats.completionRate >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                                    item.stats.completionRate >= 50 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                                    }`}>
                                                    {item.stats.completionRate}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default OwnerReports;
