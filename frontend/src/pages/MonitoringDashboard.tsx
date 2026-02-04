import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { RefreshCw, Activity, AlertTriangle, CheckCircle, XCircle, MessageSquare, Clock, TrendingUp, Target } from 'lucide-react';
import StatsCard from '../components/monitoring/StatsCard';
import AlertsPanel from '../components/monitoring/AlertsPanel';
import PerformanceChart from '../components/monitoring/PerformanceChart';
import { buildApiUrl } from '../utils/urlHelper';

interface MonitoringStats {
  summary: {
    totalResponses: number;
    errorRate: number;
    emptyRate: number;
    slowRate: number;
    successRate: number;
    averageResponseTime: number;
    uptime: number;
    lastActivity: string;
    healthStatus: 'healthy' | 'warning' | 'critical' | 'unknown';
  };
  responses: {
    total: number;
    empty: number;
    slow: number;
    successful: number;
    failed: number;
  };
  performance: {
    responseTimes: number[];
    averageResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number | null;
  };
  errors: {
    total: number;
    recent: Array<{
      id: string;
      message: string;
      type: string;
      timestamp: string;
      context?: any;
    }>;
    byType: Record<string, number>;
  };
  system: {
    startTime: string;
    uptime: number;
    lastActivity: string;
  };
}

const MonitoringDashboard: React.FC = () => {
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = async () => {
    try {
      setError(null);

      // Get auth token from localStorage (try both possible keys)
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');

      const response = await fetch(buildApiUrl('monitor/stats'), {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('يجب تسجيل الدخول لعرض إحصائيات المراقبة');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setStats(data.data);
        setLastUpdated(new Date());
      } else {
        throw new Error(data.error || 'Failed to fetch stats');
      }
    } catch (err) {
      console.error('Error fetching monitoring stats:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Auto-refresh every 5 minutes (reduced from 30 seconds)
    const interval = setInterval(fetchStats, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatUptime = (uptime: number) => {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>جاري تحميل بيانات المراقبة...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <XCircle className="w-12 h-12 text-red-500" />
        <h2 className="text-xl font-semibold text-red-600">خطأ في تحميل البيانات</h2>
        <p className="text-gray-600 text-center max-w-md">{error}</p>
        <Button onClick={fetchStats} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">لا توجد بيانات متاحة</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">لوحة مراقبة النظام</h1>
          <p className="text-gray-600 mt-1">
            آخر تحديث: {lastUpdated ? formatTimestamp(lastUpdated.toISOString()) : 'غير محدد'}
          </p>
        </div>
        <Button onClick={fetchStats} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          تحديث
        </Button>
      </div>

      {/* Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 space-x-reverse">
            {getHealthStatusIcon(stats.summary.healthStatus)}
            <span>حالة النظام</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 space-x-reverse">
            <Badge className={getHealthStatusColor(stats.summary.healthStatus)}>
              {stats.summary.healthStatus === 'healthy' && 'صحي'}
              {stats.summary.healthStatus === 'warning' && 'تحذير'}
              {stats.summary.healthStatus === 'critical' && 'حرج'}
              {stats.summary.healthStatus === 'unknown' && 'غير معروف'}
            </Badge>
            <span className="text-sm text-gray-600">
              وقت التشغيل: {formatUptime(stats.summary.uptime)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Alerts Panel */}
      <AlertsPanel />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="إجمالي الردود"
          value={stats.summary.totalResponses}
          subtitle={`ناجح: ${stats.responses.successful} | فاشل: ${stats.responses.failed}`}
          icon={<MessageSquare className="w-4 h-4" />}
          color="blue"
        />

        <StatsCard
          title="معدل الأخطاء"
          value={`${stats.summary.errorRate.toFixed(2)}%`}
          subtitle={`${stats.errors.total} خطأ إجمالي`}
          icon={<AlertTriangle className="w-4 h-4" />}
          color={stats.summary.errorRate > 10 ? 'red' : stats.summary.errorRate > 5 ? 'yellow' : 'green'}
        />

        <StatsCard
          title="متوسط وقت الاستجابة"
          value={`${stats.summary.averageResponseTime.toLocaleString()}ms`}
          subtitle={`بطيء: ${stats.responses.slow} ردود`}
          icon={<Clock className="w-4 h-4" />}
          color={stats.summary.averageResponseTime > 10000 ? 'red' : stats.summary.averageResponseTime > 5000 ? 'yellow' : 'green'}
        />

        <StatsCard
          title="معدل النجاح"
          value={`${stats.summary.successRate.toFixed(2)}%`}
          subtitle={`فارغ: ${stats.responses.empty} ردود`}
          icon={<Target className="w-4 h-4" />}
          color={stats.summary.successRate < 90 ? 'red' : stats.summary.successRate < 95 ? 'yellow' : 'green'}
        />
      </div>

      {/* Performance Chart */}
      <PerformanceChart />

      {/* Recent Errors Section */}
      {stats.errors.recent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <XCircle className="w-5 h-5 text-red-500" />
              <span>الأخطاء الأخيرة</span>
              <Badge variant="destructive" className="mr-2">
                {stats.errors.total}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.errors.recent.slice(0, 5).map((error) => (
                <div key={error.id} className="border-r-4 border-red-400 bg-red-50 p-3 rounded">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 space-x-reverse mb-1">
                        <Badge variant="outline" className="text-xs">
                          {error.type}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(error.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-red-800 font-medium">
                        {error.message}
                      </p>
                      {error.context && error.context.customerId && (
                        <p className="text-xs text-red-600 mt-1">
                          العميل: {error.context.customerId}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {stats.errors.recent.length > 5 && (
              <div className="mt-4 text-center">
                <Button variant="outline" size="sm">
                  عرض جميع الأخطاء ({stats.errors.total})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <span>ملخص الأداء</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">أسرع استجابة:</span>
                <span className="text-sm font-medium">
                  {stats.performance.minResponseTime !== null
                    ? `${stats.performance.minResponseTime}ms`
                    : 'غير متاح'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">أبطأ استجابة:</span>
                <span className="text-sm font-medium">
                  {stats.performance.maxResponseTime}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">إجمالي البيانات:</span>
                <span className="text-sm font-medium">
                  {stats.performance.responseTimes.length} نقطة
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <Activity className="w-5 h-5 text-green-500" />
              <span>معلومات النظام</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">بدء التشغيل:</span>
                <span className="text-sm font-medium">
                  {formatTimestamp(stats.system.startTime)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">آخر نشاط:</span>
                <span className="text-sm font-medium">
                  {formatTimestamp(stats.system.lastActivity)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">حالة الاتصال:</span>
                <Badge className="bg-green-100 text-green-800">
                  متصل
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MonitoringDashboard;
