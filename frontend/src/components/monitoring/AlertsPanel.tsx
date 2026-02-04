import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../../utils/urlHelper';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { AlertTriangle, CheckCircle, XCircle, Clock, RefreshCw, X } from 'lucide-react';

interface Alert {
  id: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  icon: string;
  color: string;
  timestamp: string;
  data: {
    currentValue: any;
    threshold: any;
    details: string;
  };
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

interface AlertsData {
  alerts: Alert[];
  stats: {
    active: number;
    total: number;
    byType: Record<string, number>;
    bySeverity: {
      critical: number;
      warning: number;
      info: number;
    };
    lastCheck: string;
    thresholds: Record<string, number>;
  };
  summary: {
    hasAlerts: boolean;
    totalActive: number;
    critical: number;
    warnings: number;
    lastCheck: string;
    mostRecentAlert: Alert | null;
  };
}

interface AlertsPanelProps {
  className?: string;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({ className = '' }) => {
  const [alertsData, setAlertsData] = useState<AlertsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<Set<string>>(new Set());

  const fetchAlerts = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const response = await fetch(buildApiUrl('monitor/alerts'), {
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
        setAlertsData(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch alerts');
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      setResolving(prev => new Set(prev).add(alertId));
      
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const response = await fetch(buildApiUrl(`monitor/alerts/${alertId}/resolve`), {
        method: 'POST',
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
        // إعادة تحميل التنبيهات
        await fetchAlerts();
      } else {
        throw new Error(data.error || 'Failed to resolve alert');
      }
    } catch (err) {
      console.error('Error resolving alert:', err);
      setError(err instanceof Error ? err.message : 'Failed to resolve alert');
    } finally {
      setResolving(prev => {
        const newSet = new Set(prev);
        newSet.delete(alertId);
        return newSet;
      });
    }
  };

  const triggerCheck = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const response = await fetch(buildApiUrl('monitor/alerts/check'), {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        await fetchAlerts();
      }
    } catch (err) {
      console.error('Error triggering alert check:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();

    // تحديث تلقائي كل 10 دقائق (reduced from 1 minute)
    const interval = setInterval(fetchAlerts, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-100 border-red-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'info':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'info':
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
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

  const formatValue = (value: any) => {
    if (typeof value === 'number') {
      if (value < 100) {
        return `${value.toFixed(2)}%`;
      } else {
        return `${Math.round(value)}ms`;
      }
    }
    return String(value);
  };

  if (loading && !alertsData) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-6">
          <div className="flex items-center space-x-2 space-x-reverse">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>جاري تحميل التنبيهات...</span>
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
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-600 mb-2">خطأ في تحميل التنبيهات</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchAlerts} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              إعادة المحاولة
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!alertsData) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center space-x-2 space-x-reverse">
            {alertsData.summary.hasAlerts ? (
              getSeverityIcon(alertsData.summary.mostRecentAlert?.severity || 'info')
            ) : (
              <CheckCircle className="w-5 h-5 text-green-600" />
            )}
            <span>التنبيهات النشطة</span>
            {alertsData.summary.totalActive > 0 && (
              <Badge variant="destructive">
                {alertsData.summary.totalActive}
              </Badge>
            )}
          </CardTitle>
          <div className="flex space-x-2 space-x-reverse">
            <Button onClick={triggerCheck} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              فحص
            </Button>
            <Button onClick={fetchAlerts} variant="ghost" size="sm">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!alertsData.summary.hasAlerts ? (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-600 mb-2">لا توجد تنبيهات</h3>
            <p className="text-gray-600">النظام يعمل بشكل طبيعي</p>
            <p className="text-sm text-gray-500 mt-2">
              آخر فحص: {formatTimestamp(alertsData.summary.lastCheck)}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* ملخص سريع */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{alertsData.summary.critical}</div>
                <div className="text-sm text-gray-600">حرجة</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{alertsData.summary.warnings}</div>
                <div className="text-sm text-gray-600">تحذيرات</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{alertsData.stats.total}</div>
                <div className="text-sm text-gray-600">إجمالي</div>
              </div>
            </div>

            {/* قائمة التنبيهات */}
            <div className="space-y-3">
              {alertsData.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 space-x-reverse mb-2">
                        <span className="text-2xl">{alert.icon}</span>
                        <h4 className="font-semibold">{alert.message}</h4>
                        <Badge variant="outline" className="text-xs">
                          {alert.severity === 'critical' && 'حرج'}
                          {alert.severity === 'warning' && 'تحذير'}
                          {alert.severity === 'info' && 'معلومات'}
                        </Badge>
                      </div>
                      
                      <p className="text-sm mb-2">{alert.data.details}</p>
                      
                      <div className="flex items-center space-x-4 space-x-reverse text-xs text-gray-600">
                        <span>القيمة: {formatValue(alert.data.currentValue)}</span>
                        <span>العتبة: {formatValue(alert.data.threshold)}</span>
                        <span>{formatTimestamp(alert.timestamp)}</span>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => resolveAlert(alert.id)}
                      disabled={resolving.has(alert.id)}
                      variant="outline"
                      size="sm"
                      className="mr-2"
                    >
                      {resolving.has(alert.id) ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AlertsPanel;
