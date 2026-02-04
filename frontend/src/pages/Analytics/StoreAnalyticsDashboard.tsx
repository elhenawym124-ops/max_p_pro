import React, { useState, useEffect, useMemo } from 'react';
import analyticsService from '../../services/analyticsService';
import { 
  ChartBarIcon, 
  ShoppingCartIcon, 
  CurrencyDollarIcon,
  UserGroupIcon,
  EyeIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AnalyticsData {
  totalVisits: number;
  uniqueVisitors: number;
  totalProductViews: number;
  addToCarts: number;
  checkouts: number;
  purchases: number;
  totalRevenue: number;
  conversionRate: number;
  productConversionRate?: number;
  avgOrderValue: number;
  addToCartRate: number;
  checkoutRate: number;
  purchaseRate: number;
}

interface TopProduct {
  id: string;
  name: string;
  price: number;
  images: string;
  views: number;
  addToCarts: number;
  purchases: number;
  conversionRate: number;
}

const StoreAnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [period, setPeriod] = useState('30');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));
  
  useEffect(() => {
    // لو الفترة مخصصة، مش هنعمل fetch لحد ما المستخدم يختار التواريخ ويضغط "تطبيق"
    if (period !== 'custom') {
      fetchAnalytics();
    }
  }, [period]);
  
  // Monitor dark mode changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);
  
  // Memoize chart options to update when dark mode changes
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: isDarkMode ? '#e5e7eb' : '#374151',
          font: {
            family: 'Cairo, sans-serif'
          }
        }
      },
      tooltip: {
        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
        titleColor: isDarkMode ? '#e5e7eb' : '#111827',
        bodyColor: isDarkMode ? '#e5e7eb' : '#374151',
        borderColor: isDarkMode ? '#374151' : '#e5e7eb',
        borderWidth: 1,
        rtl: true
      }
    },
    scales: {
      x: {
        grid: {
          color: isDarkMode ? '#374151' : '#e5e7eb'
        },
        ticks: {
          color: isDarkMode ? '#9ca3af' : '#6b7280'
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          color: isDarkMode ? '#374151' : '#e5e7eb'
        },
        ticks: {
          color: isDarkMode ? '#9ca3af' : '#6b7280'
        },
        title: {
          display: true,
          text: 'الزيارات',
          color: isDarkMode ? '#9ca3af' : '#6b7280'
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        grid: {
          drawOnChartArea: false
        },
        ticks: {
          color: isDarkMode ? '#9ca3af' : '#6b7280'
        },
        title: {
          display: true,
          text: 'الإيرادات (جنيه)',
          color: isDarkMode ? '#9ca3af' : '#6b7280'
        }
      }
    }
  }), [isDarkMode]);
  
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // إذا كانت فترة مخصصة، تأكد من وجود التواريخ
      if (period === 'custom' && (!startDate || !endDate)) {
        setError('الرجاء اختيار تاريخ البداية والنهاية');
        setLoading(false);
        return;
      }
      
      const [analyticsResponse, topProductsResponse, dailyResponse] = await Promise.all([
        analyticsService.getStoreAnalytics(period, startDate, endDate),
        analyticsService.getTopProducts(period, 10, startDate, endDate),
        analyticsService.getDailyAnalytics(period, startDate, endDate)
      ]);
      
      setAnalytics(analyticsResponse.data);
      setTopProducts(topProductsResponse.data);
      setDailyData(dailyResponse.data || []);
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      setError(err.response?.data?.message || 'خطأ في جلب الإحصائيات');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors" dir="rtl">
        <div className="w-full">
          {/* Header Skeleton */}
          <div className="mb-6 flex justify-between items-center">
            <div>
              <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-2"></div>
            </div>
            <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
          
          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-2"></div>
                  </div>
                  <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Secondary Stats Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-2"></div>
                  </div>
                  <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Funnel Skeleton */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <div className="flex justify-between mb-2">
                    <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Table Skeleton */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center space-x-4 space-x-reverse">
                  <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1"></div>
                  </div>
                  <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 text-lg">{error}</p>
          <button 
            onClick={fetchAnalytics}
            className="mt-4 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors" dir="rtl">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">📊 تحليلات المتجر</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">تتبع أداء متجرك ومعدلات التحويل</p>
          </div>
          
          {/* Period Selector */}
          <div className="flex gap-2 items-center">
            <select 
              value={period} 
              onChange={(e) => {
                const value = e.target.value;
                setPeriod(value);
                if (value === 'custom') {
                  setShowCustomRange(true);
                } else {
                  setShowCustomRange(false);
                }
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
            >
              <option value="1">اليوم</option>
              <option value="yesterday">أمس</option>
              <option value="2">اليوم وأمس</option>
              <option value="7">آخر 7 أيام</option>
              <option value="30">آخر 30 يوم</option>
              <option value="90">آخر 90 يوم</option>
              <option value="180">آخر 6 شهور</option>
              <option value="365">آخر سنة</option>
              <option value="custom">فترة مخصصة</option>
            </select>
            
            {showCustomRange && (
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
                  placeholder="من"
                />
                <span className="text-gray-600 dark:text-gray-400">إلى</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-colors"
                  placeholder="إلى"
                />
                <button
                  onClick={() => {
                    if (startDate && endDate) {
                      fetchAnalytics();
                    }
                  }}
                  disabled={!startDate || !endDate}
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  تطبيق
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="إجمالي الزيارات" 
            value={analytics?.totalVisits || 0}
            icon={<UserGroupIcon className="w-8 h-8" />}
            color="blue"
          />
          <StatCard 
            title="الزوار الفريدون" 
            value={analytics?.uniqueVisitors || 0}
            icon={<EyeIcon className="w-8 h-8" />}
            color="purple"
          />
          <StatCard 
            title="معدل التحويل" 
            value={`${analytics?.conversionRate || 0}%`}
            icon={<ArrowTrendingUpIcon className="w-8 h-8" />}
            color="green"
            highlight
          />
          <StatCard 
            title="إجمالي الإيرادات" 
            value={`${analytics?.totalRevenue?.toFixed(2) || 0} جنيه`}
            icon={<CurrencyDollarIcon className="w-8 h-8" />}
            color="yellow"
          />
        </div>
        
        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard 
            title="مشاهدات المنتجات" 
            value={analytics?.totalProductViews || 0}
            icon={<EyeIcon className="w-6 h-6" />}
            color="indigo"
            small
          />
          <StatCard 
            title="إضافات للسلة" 
            value={analytics?.addToCarts || 0}
            icon={<ShoppingCartIcon className="w-6 h-6" />}
            color="pink"
            small
          />
          <StatCard 
            title="متوسط قيمة الطلب" 
            value={`${analytics?.avgOrderValue?.toFixed(2) || 0} جنيه`}
            icon={<CurrencyDollarIcon className="w-6 h-6" />}
            color="orange"
            small
          />
        </div>
        
        {/* Visits Chart */}
        {dailyData.length > 0 && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8 transition-colors">
            <h2 className="text-xl font-bold mb-6 flex items-center text-gray-900 dark:text-white">
              <ArrowTrendingUpIcon className="w-6 h-6 ml-2 text-blue-600 dark:text-blue-400" />
              الزيارات والإيرادات خلال الفترة
            </h2>
            <div className="h-80">
              <Line
                data={{
                  labels: dailyData.map(d => new Date(d.date).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })),
                  datasets: [
                    {
                      label: 'الزيارات',
                      data: dailyData.map(d => d.totalVisits),
                      borderColor: 'rgb(59, 130, 246)',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      fill: true,
                      tension: 0.4,
                      yAxisID: 'y'
                    },
                    {
                      label: 'الإيرادات (جنيه)',
                      data: dailyData.map(d => parseFloat(d.totalRevenue || 0)),
                      borderColor: 'rgb(34, 197, 94)',
                      backgroundColor: 'rgba(34, 197, 94, 0.1)',
                      fill: true,
                      tension: 0.4,
                      yAxisID: 'y1'
                    }
                  ]
                }}
                options={chartOptions}
              />
            </div>
          </div>
        )}
        
        {/* Conversion Funnel */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8 transition-colors">
          <h2 className="text-xl font-bold mb-6 flex items-center text-gray-900 dark:text-white">
            <ArrowTrendingUpIcon className="w-6 h-6 ml-2 text-blue-600 dark:text-blue-400" />
            قمع التحويل
          </h2>
          <div className="space-y-4">
            <FunnelStep 
              label="زيارات المتجر" 
              value={analytics?.totalVisits || 0}
              percentage={100}
              color="blue"
            />
            <FunnelStep 
              label="مشاهدات المنتجات" 
              value={analytics?.totalProductViews || 0}
              percentage={analytics?.totalVisits ? ((analytics?.totalProductViews / analytics?.totalVisits) * 100) : 0}
              color="cyan"
            />
            <FunnelStep 
              label="إضافة للسلة" 
              value={analytics?.addToCarts || 0}
              percentage={analytics?.totalVisits ? ((analytics?.addToCarts / analytics?.totalVisits) * 100) : 0}
              color="purple"
            />
            <FunnelStep 
              label="بدء الدفع" 
              value={analytics?.checkouts || 0}
              percentage={analytics?.totalVisits ? ((analytics?.checkouts / analytics?.totalVisits) * 100) : 0}
              color="indigo"
            />
            <FunnelStep 
              label="إتمام الشراء" 
              value={analytics?.purchases || 0}
              percentage={analytics?.totalVisits ? ((analytics?.purchases / analytics?.totalVisits) * 100) : 0}
              color="green"
            />
          </div>
        </div>
        
        {/* Top Products */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md transition-colors">
          <h2 className="text-xl font-bold mb-6 flex items-center text-gray-900 dark:text-white">
            <ChartBarIcon className="w-6 h-6 ml-2 text-blue-600 dark:text-blue-400" />
            أفضل المنتجات أداءً
          </h2>
          
          {topProducts.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">لا توجد بيانات كافية لعرض أفضل المنتجات</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      المنتج
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      المشاهدات
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      إضافات للسلة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      المبيعات
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      معدل التحويل
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {topProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 ml-3">
                            {product.images ? (
                              <img 
                                className="h-10 w-10 rounded object-cover" 
                                src={JSON.parse(product.images)[0]} 
                                alt={product.name}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-400 text-xs">صورة</span>
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{product.price} جنيه</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        {product.views}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        {product.addToCarts}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        {product.purchases}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          product.conversionRate >= 5 ? 'bg-green-100 text-green-800' :
                          product.conversionRate >= 2 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {product.conversionRate.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  highlight?: boolean;
  small?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, highlight = false, small = false }) => {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    green: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
    pink: 'bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400',
    orange: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
  };
  
  return (
    <div className={`p-6 rounded-lg shadow-md transition-colors ${
      highlight 
        ? 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/40 dark:to-green-800/40 border-2 border-green-500 dark:border-green-400' 
        : 'bg-white dark:bg-gray-800'
    }`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">{title}</p>
          <p className={`font-bold mt-2 text-gray-900 dark:text-white ${small ? 'text-xl' : 'text-3xl'}`}>{value}</p>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color as keyof typeof colorClasses]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

interface FunnelStepProps {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

const FunnelStep: React.FC<FunnelStepProps> = ({ label, value, percentage, color }) => {
  const colorClasses = {
    blue: 'bg-blue-600 dark:bg-blue-500',
    cyan: 'bg-cyan-600 dark:bg-cyan-500',
    purple: 'bg-purple-600 dark:bg-purple-500',
    indigo: 'bg-indigo-600 dark:bg-indigo-500',
    green: 'bg-green-600 dark:bg-green-500'
  };
  
  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-gray-600 dark:text-gray-400">{value.toLocaleString()} ({percentage.toFixed(1)}%)</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
        <div 
          className={`h-4 rounded-full transition-all duration-500 ${colorClasses[color as keyof typeof colorClasses]}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
};

export default StoreAnalyticsDashboard;

