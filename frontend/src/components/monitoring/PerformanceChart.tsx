import React, { useState, useEffect, useRef } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { RefreshCw, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import { buildApiUrl } from '../../utils/urlHelper';

// تسجيل مكونات Chart.js
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

interface ChartDataPoint {
  timestamp: string;
  totalResponses: number;
  errorRate: number;
  averageResponseTime: number;
  successRate: number;
  slowRate: number;
  emptyRate: number;
  activeErrors: number;
}

interface ChartData {
  period: string;
  limit: number;
  points: ChartDataPoint[];
  stats: any;
  meta: {
    totalPoints: number;
    oldestPoint: string | null;
    newestPoint: string | null;
    dataRange: string;
  };
}

interface PerformanceChartProps {
  className?: string;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ className = '' }) => {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string>('averageResponseTime');
  const [period, setPeriod] = useState<string>('hourly');
  const chartRef = useRef<ChartJS<'line'>>(null);

  const fetchChartData = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const response = await fetch(buildApiUrl(`monitor/charts?period=${period}&limit=20`), {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setChartData(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch chart data');
      }
    } catch (err) {
      console.error('Error fetching chart data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChartData();

    // تحديث تلقائي كل 10 دقائق (reduced from 1 minute)
    const interval = setInterval(fetchChartData, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [period]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getChartConfig = () => {
    if (!chartData || chartData.points.length === 0) {
      return null;
    }

    const labels = chartData.points.map(point => formatTimestamp(point.timestamp));
    
    const datasets = [];
    
    // إعداد البيانات حسب المقياس المختار
    switch (selectedMetric) {
      case 'averageResponseTime':
        datasets.push({
          label: 'متوسط وقت الاستجابة (ms)',
          data: chartData.points.map(point => point.averageResponseTime),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4
        });
        break;
        
      case 'rates':
        datasets.push(
          {
            label: 'معدل النجاح (%)',
            data: chartData.points.map(point => point.successRate),
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            fill: false,
            tension: 0.4
          },
          {
            label: 'معدل الأخطاء (%)',
            data: chartData.points.map(point => point.errorRate),
            borderColor: 'rgb(239, 68, 68)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            fill: false,
            tension: 0.4
          },
          {
            label: 'معدل الردود البطيئة (%)',
            data: chartData.points.map(point => point.slowRate),
            borderColor: 'rgb(245, 158, 11)',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            fill: false,
            tension: 0.4
          }
        );
        break;
        
      case 'totalResponses':
        datasets.push({
          label: 'إجمالي الردود',
          data: chartData.points.map(point => point.totalResponses),
          borderColor: 'rgb(168, 85, 247)',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          fill: true,
          tension: 0.4
        });
        break;
    }

    return {
      labels,
      datasets
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        rtl: true,
        labels: {
          font: {
            family: 'Arial, sans-serif'
          }
        }
      },
      title: {
        display: true,
        text: getMetricTitle(),
        font: {
          size: 16,
          family: 'Arial, sans-serif'
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        rtl: true,
        titleFont: {
          family: 'Arial, sans-serif'
        },
        bodyFont: {
          family: 'Arial, sans-serif'
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'الوقت',
          font: {
            family: 'Arial, sans-serif'
          }
        },
        ticks: {
          font: {
            family: 'Arial, sans-serif'
          }
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: getYAxisLabel(),
          font: {
            family: 'Arial, sans-serif'
          }
        },
        ticks: {
          font: {
            family: 'Arial, sans-serif'
          }
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  };

  function getMetricTitle() {
    switch (selectedMetric) {
      case 'averageResponseTime':
        return 'متوسط وقت الاستجابة عبر الزمن';
      case 'rates':
        return 'معدلات الأداء عبر الزمن';
      case 'totalResponses':
        return 'إجمالي الردود عبر الزمن';
      default:
        return 'أداء النظام';
    }
  }

  function getYAxisLabel() {
    switch (selectedMetric) {
      case 'averageResponseTime':
        return 'الوقت (ميلي ثانية)';
      case 'rates':
        return 'النسبة المئوية (%)';
      case 'totalResponses':
        return 'عدد الردود';
      default:
        return 'القيمة';
    }
  }

  const chartConfig = getChartConfig();

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-6 h-96">
          <div className="flex items-center space-x-2 space-x-reverse">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span>جاري تحميل الرسوم البيانية...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-600 mb-2">خطأ في تحميل الرسوم البيانية</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchChartData} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              إعادة المحاولة
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData || chartData.points.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 space-x-reverse">
            <TrendingUp className="w-5 h-5" />
            <span>الرسوم البيانية</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">لا توجد بيانات كافية</h3>
            <p className="text-gray-500">سيتم عرض الرسوم البيانية عند توفر بيانات كافية</p>
            <Button onClick={fetchChartData} variant="outline" className="mt-4">
              <RefreshCw className="w-4 h-4 mr-2" />
              تحديث
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center space-x-2 space-x-reverse">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <span>الرسوم البيانية</span>
          </CardTitle>
          <div className="flex space-x-2 space-x-reverse">
            <Button onClick={fetchChartData} variant="ghost" size="sm">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* أزرار التحكم */}
        <div className="flex flex-wrap gap-2 mt-4">
          <div className="flex space-x-2 space-x-reverse">
            <span className="text-sm font-medium text-gray-700">المقياس:</span>
            <button
              onClick={() => setSelectedMetric('averageResponseTime')}
              className={`px-3 py-1 text-xs rounded-full ${
                selectedMetric === 'averageResponseTime'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              وقت الاستجابة
            </button>
            <button
              onClick={() => setSelectedMetric('rates')}
              className={`px-3 py-1 text-xs rounded-full ${
                selectedMetric === 'rates'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              المعدلات
            </button>
            <button
              onClick={() => setSelectedMetric('totalResponses')}
              className={`px-3 py-1 text-xs rounded-full ${
                selectedMetric === 'totalResponses'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              إجمالي الردود
            </button>
          </div>
        </div>
        
        {/* معلومات البيانات */}
        <div className="text-sm text-gray-600 mt-2">
          {chartData.meta.dataRange} • آخر تحديث: {formatTimestamp(chartData.meta.newestPoint || new Date().toISOString())}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="h-96">
          {chartConfig && (
            <Line
              ref={chartRef}
              data={chartConfig}
              options={chartOptions}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceChart;
