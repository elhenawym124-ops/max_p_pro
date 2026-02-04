import React, { useState, useEffect } from 'react';
import {
    BuildingOffice2Icon,
    UsersIcon,
    CheckCircleIcon,
    XCircleIcon,
    ArrowDownTrayIcon,
    CalendarDaysIcon,
    ClockIcon,
    ShoppingCartIcon,
    CurrencyDollarIcon,
    ChatBubbleLeftRightIcon,
    ExclamationTriangleIcon,
    ArrowRightIcon,
    ChartBarIcon,
    PlusIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import CreateCompanyModal from '../../components/CreateCompanyModal';

// Types
interface CompanyStats {
    company: {
        id: string;
        name: string;
        logo: string | null;
        plan: string;
    };
    stats: {
        totalUsers: number;
        todayOrders: number;
        todayRevenue: number;
        unreadConversations: number;
        lowStockProducts: number;
        attendance: {
            present: number;
            late: number;
            absent: number;
        };
    };
}

interface DashboardOverview {
    totalCompanies: number;
    totalUsers: number;
    totalTodayOrders: number;
    totalTodayRevenue: number;
    totalUnreadConversations: number;
    totalLowStockProducts: number;
}

interface DashboardResponse {
    success: boolean;
    data: {
        overview: DashboardOverview;
        byCompany: CompanyStats[];
    };
}

const MyCompaniesDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'attendance'>('overview');
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [dashboardData, setDashboardData] = useState<DashboardResponse['data'] | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Filter States
    const [currentDate] = useState(new Date());
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

    // Helper to construct image URL
    const getImageUrl = (path: string | null) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        const backendUrl = import.meta.env['VITE_API_URL']?.replace('/api/v1', '') || 'https://maxp-ai.pro';
        return `${backendUrl}/${path.replace(/^\/+/, '')}`;
    };

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            setIsLoading(true);
            const response = await apiClient.get('owner/dashboard');
            if (response.data.success) {
                setDashboardData(response.data.data);
            } else {
                toast.error(response.data.message || 'فشل تحميل البيانات');
            }
        } catch (error) {
            console.error('Failed to fetch dashboard', error);
            toast.error('فشل تحميل لوحة التحكم');
        } finally {
            setIsLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            setIsExporting(true);
            // TODO: Implement export
            toast.success('جاري التصدير...');
        } catch (error) {
            toast.error('فشل التصدير');
        } finally {
            setIsExporting(false);
        }
    };

    const switchToCompany = async (companyId: string) => {
        try {
            // Call backend to switch company and get new token
            const response = await apiClient.post(`/auth/switch-company/${companyId}`);

            if (response.data.success) {
                // Update token in localStorage
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('selectedCompanyId', companyId);

                // Navigate to dashboard and reload to apply new context
                navigate('/dashboard');
                window.location.reload();
            }
        } catch (error) {
            console.error('Error switching company:', error);
            alert('فشل في تبديل الشركة. حاول مرة أخرى.');
        }
    };

    if (isLoading) {
        return <DashboardSkeleton />;
    }

    const overview = dashboardData?.overview;
    const companies = dashboardData?.byCompany || [];

    return (
        <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen" dir="rtl">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">لوحة تحكم شركاتي</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">متابعة شاملة لجميع فروعك وشركاتك من مكان واحد</p>
                </div>
                <div className="mt-4 md:mt-0 flex gap-3">
                    <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                        >
                            نظرة عامة
                        </button>
                        <button
                            onClick={() => setActiveTab('attendance')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'attendance' ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                        >
                            الحضور
                        </button>
                        <button
                            onClick={() => setActiveTab('reports')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'reports' ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                        >
                            التقارير
                        </button>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        <PlusIcon className="w-5 h-5" />
                        <span>إضافة شركة</span>
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        {isExporting ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <ArrowDownTrayIcon className="w-5 h-5" />
                        )}
                        <span>تصدير</span>
                    </button>
                </div>
            </div>

            {activeTab === 'overview' && overview && (
                <div className="space-y-6 animate-fadeIn">
                    {/* Overview Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                        <StatCard
                            title="الشركات"
                            value={overview.totalCompanies}
                            icon={<BuildingOffice2Icon className="w-6 h-6" />}
                            color="bg-gradient-to-r from-blue-500 to-blue-600"
                            textColor="text-white"
                        />
                        <StatCard
                            title="الموظفين"
                            value={overview.totalUsers}
                            icon={<UsersIcon className="w-6 h-6" />}
                            color="bg-white dark:bg-gray-800"
                        />
                        <StatCard
                            title="طلبات اليوم"
                            value={overview.totalTodayOrders}
                            icon={<ShoppingCartIcon className="w-6 h-6" />}
                            color="bg-white dark:bg-gray-800"
                        />
                        <StatCard
                            title="إيرادات اليوم"
                            value={`${overview.totalTodayRevenue.toLocaleString()} ج.م`}
                            icon={<CurrencyDollarIcon className="w-6 h-6" />}
                            color="bg-gradient-to-r from-green-500 to-green-600"
                            textColor="text-white"
                        />
                        <StatCard
                            title="رسائل جديدة"
                            value={overview.totalUnreadConversations}
                            icon={<ChatBubbleLeftRightIcon className="w-6 h-6" />}
                            color="bg-white dark:bg-gray-800"
                            alert={overview.totalUnreadConversations > 10}
                        />
                        <StatCard
                            title="منتجات نفذت"
                            value={overview.totalLowStockProducts}
                            icon={<ExclamationTriangleIcon className="w-6 h-6" />}
                            color="bg-white dark:bg-gray-800"
                            alert={overview.totalLowStockProducts > 0}
                        />
                    </div>

                    {/* Companies Grid */}
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">الشركات</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {companies.map((item) => (
                            <div key={item.company.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                                            {item.company.logo ? (
                                                <img src={getImageUrl(item.company.logo) || ''} alt={item.company.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <BuildingOffice2Icon className="w-6 h-6 text-gray-400" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800 dark:text-white">{item.company.name}</h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{item.company.plan} • {item.stats.totalUsers} موظف</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => switchToCompany(item.company.id)}
                                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
                                    >
                                        إدارة <ArrowRightIcon className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-3 gap-3 mt-4">
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                                        <ShoppingCartIcon className="w-5 h-5 mx-auto text-blue-600 mb-1" />
                                        <p className="text-lg font-bold text-gray-800 dark:text-white">{item.stats.todayOrders}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">طلب</p>
                                    </div>
                                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                                        <CurrencyDollarIcon className="w-5 h-5 mx-auto text-green-600 mb-1" />
                                        <p className="text-lg font-bold text-gray-800 dark:text-white">{item.stats.todayRevenue.toLocaleString()}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">ج.م</p>
                                    </div>
                                    <div className={`p-3 rounded-lg text-center ${item.stats.unreadConversations > 0 ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-gray-50 dark:bg-gray-700'}`}>
                                        <ChatBubbleLeftRightIcon className={`w-5 h-5 mx-auto mb-1 ${item.stats.unreadConversations > 0 ? 'text-orange-600' : 'text-gray-400'}`} />
                                        <p className="text-lg font-bold text-gray-800 dark:text-white">{item.stats.unreadConversations}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">رسالة</p>
                                    </div>
                                </div>

                                {/* Alerts */}
                                {item.stats.lowStockProducts > 0 && (
                                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-2">
                                        <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                                        <span className="text-sm text-red-700 dark:text-red-400">{item.stats.lowStockProducts} منتج على وشك النفاد</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'attendance' && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex gap-4 items-center">
                        <div className="flex items-center gap-2">
                            <CalendarDaysIcon className="w-5 h-5 text-gray-400" />
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                className="form-select rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                    <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('ar-EG', { month: 'long' })}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="form-select rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                                {[2024, 2025, 2026].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Attendance by Company */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {companies.map((item) => (
                            <div key={item.company.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                        {item.company.logo ? (
                                            <img src={getImageUrl(item.company.logo) || ''} alt="" className="w-full h-full object-cover rounded-lg" />
                                        ) : (
                                            <BuildingOffice2Icon className="w-5 h-5 text-gray-400" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800 dark:text-white">{item.company.name}</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.stats.totalUsers} موظف</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                                        <CheckCircleIcon className="w-5 h-5 mx-auto text-green-600 mb-1" />
                                        <p className="text-xl font-bold text-gray-800 dark:text-white">{item.stats.attendance.present}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">حاضر</p>
                                    </div>
                                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center">
                                        <ClockIcon className="w-5 h-5 mx-auto text-yellow-600 mb-1" />
                                        <p className="text-xl font-bold text-gray-800 dark:text-white">{item.stats.attendance.late}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">متأخر</p>
                                    </div>
                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                                        <XCircleIcon className="w-5 h-5 mx-auto text-red-600 mb-1" />
                                        <p className="text-xl font-bold text-gray-800 dark:text-white">{item.stats.attendance.absent}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">غائب</p>
                                    </div>
                                </div>

                                {/* Attendance Bar */}
                                <div className="mt-4 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
                                    <div
                                        style={{ width: `${(item.stats.attendance.present / item.stats.totalUsers) * 100}%` }}
                                        className="bg-green-500 h-full"
                                    />
                                    <div
                                        style={{ width: `${(item.stats.attendance.late / item.stats.totalUsers) * 100}%` }}
                                        className="bg-yellow-500 h-full"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'reports' && (
                <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                    <ChartBarIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">التقارير الموحدة</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">قريباً... يمكنك الوصول للتقارير من صفحة التقارير الموحدة</p>
                    <button
                        onClick={() => navigate('/my-companies/reports')}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        الذهاب للتقارير
                    </button>
                </div>
            )}

            {/* Create Company Modal */}
            <CreateCompanyModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => {
                    fetchDashboard();
                }}
            />
        </div>
    );
};

// Reusable Components
const StatCard = ({ title, value, icon, subValue, color, textColor = 'text-gray-800 dark:text-white', alert = false }: any) => (
    <div className={`${color} p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-transform hover:-translate-y-1 ${alert ? 'ring-2 ring-red-400' : ''}`}>
        <div className="flex justify-between items-start">
            <div>
                <p className={`text-xs font-medium ${textColor === 'text-white' ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>{title}</p>
                <h3 className={`text-xl font-bold mt-1 ${textColor}`}>{value}</h3>
                {subValue && (
                    <p className={`text-xs mt-1 ${textColor === 'text-white' ? 'text-white/70' : 'text-gray-500'}`}>{subValue}</p>
                )}
            </div>
            <div className={`p-2 rounded-lg ${color === 'bg-white dark:bg-gray-800' ? 'bg-gray-50 dark:bg-gray-700' : 'bg-white/20'} ${alert ? 'text-red-600' : textColor === 'text-white' ? 'text-white' : 'text-blue-600'}`}>
                {icon}
            </div>
        </div>
    </div>
);

const DashboardSkeleton = () => (
    <div className="p-6 space-y-6 min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"></div>
        <div className="grid grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"></div>)}
        </div>
        <div className="grid grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"></div>)}
        </div>
    </div>
);

export default MyCompaniesDashboard;
