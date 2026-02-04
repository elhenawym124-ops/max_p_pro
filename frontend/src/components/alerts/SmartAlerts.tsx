import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { AlertTriangle, CheckCircle, Info, X, Bell, BellOff, Clock } from 'lucide-react';

interface Alert {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: string;
  priority: 'high' | 'medium' | 'low';
  category: 'performance' | 'quality' | 'system' | 'user';
  actionable: boolean;
  action?: {
    label: string;
    url?: string;
    callback?: () => void;
  };
}

interface SmartAlertsProps {
  qualityStats?: any;
  performanceData?: any;
  className?: string;
}

const SmartAlerts: React.FC<SmartAlertsProps> = ({ 
  qualityStats, 
  performanceData, 
  className = '' 
}) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Generate smart alerts based on data
  useEffect(() => {
    const newAlerts: Alert[] = [];

    if (qualityStats) {
      // Low satisfaction alert
      if (qualityStats.ratings.satisfaction < 70 && qualityStats.ratings.total >= 5) {
        newAlerts.push({
          id: 'low-satisfaction',
          type: 'warning',
          title: 'معدل رضا منخفض',
          message: `معدل الرضا الحالي ${qualityStats.ratings.satisfaction}% أقل من المستوى المطلوب (70%)`,
          timestamp: new Date().toISOString(),
          priority: 'high',
          category: 'quality',
          actionable: false
          // ❌ REMOVED: quality-advanced route - Advanced Quality Dashboard removed
        });
      }

      // High negative rate alert
      if (qualityStats.analysis.negativeRate > 30 && qualityStats.ratings.total >= 3) {
        newAlerts.push({
          id: 'high-negative-rate',
          type: 'error',
          title: 'نسبة عالية من التقييمات السلبية',
          message: `${qualityStats.analysis.negativeRate}% من التقييمات سلبية، مما يتطلب مراجعة فورية`,
          timestamp: new Date().toISOString(),
          priority: 'high',
          category: 'quality',
          actionable: true,
          action: {
            label: 'مراجعة التقييمات السلبية',
            url: '/quality?filter=negative'
          }
        });
      }

      // No ratings alert
      if (qualityStats.responses.totalResponses > 10 && qualityStats.ratings.total === 0) {
        newAlerts.push({
          id: 'no-ratings',
          type: 'info',
          title: 'لا توجد تقييمات',
          message: `تم إرسال ${qualityStats.responses.totalResponses} رد ولكن لم يتم تقييم أي منها بعد`,
          timestamp: new Date().toISOString(),
          priority: 'medium',
          category: 'user',
          actionable: false
        });
      }
    }

    if (performanceData) {
      // Slow response time alert
      if (performanceData.responseTime.average > 5000 && performanceData.totalResponses >= 3) {
        newAlerts.push({
          id: 'slow-response',
          type: 'warning',
          title: 'أوقات استجابة بطيئة',
          message: `متوسط وقت الاستجابة ${(performanceData.responseTime.average / 1000).toFixed(1)}s أعلى من المستوى المطلوب`,
          timestamp: new Date().toISOString(),
          priority: 'high',
          category: 'performance',
          actionable: false
          // ❌ REMOVED: quality-advanced route - Advanced Quality Dashboard removed
        });
      }

      // Low confidence alert
      if (performanceData.aiMetrics.averageConfidence < 70 && performanceData.totalResponses >= 3) {
        newAlerts.push({
          id: 'low-confidence',
          type: 'warning',
          title: 'مستوى ثقة منخفض',
          message: `متوسط ثقة الذكاء الاصطناعي ${performanceData.aiMetrics.averageConfidence}% أقل من المستوى المطلوب`,
          timestamp: new Date().toISOString(),
          priority: 'medium',
          category: 'performance',
          actionable: true,
          action: {
            label: 'مراجعة الإعدادات',
            url: '/settings?section=ai'
          }
        });
      }

      // Low RAG usage alert
      if (performanceData.aiMetrics.ragUsageRate < 30 && performanceData.totalResponses >= 5) {
        newAlerts.push({
          id: 'low-rag-usage',
          type: 'info',
          title: 'استخدام منخفض لقاعدة المعرفة',
          message: `${performanceData.aiMetrics.ragUsageRate}% فقط من الردود تستخدم قاعدة المعرفة`,
          timestamp: new Date().toISOString(),
          priority: 'low',
          category: 'system',
          actionable: true,
          action: {
            label: 'تحسين قاعدة المعرفة',
            url: '/knowledge-base'
          }
        });
      }

      // Excellent performance alert
      if (performanceData.responseTime.average < 2000 && 
          performanceData.aiMetrics.averageConfidence > 90 && 
          performanceData.totalResponses >= 5) {
        newAlerts.push({
          id: 'excellent-performance',
          type: 'success',
          title: 'أداء ممتاز',
          message: 'النظام يعمل بكفاءة عالية مع أوقات استجابة سريعة ومستوى ثقة عالي',
          timestamp: new Date().toISOString(),
          priority: 'low',
          category: 'performance',
          actionable: false
        });
      }
    }

    // Filter out dismissed alerts
    const filteredAlerts = newAlerts.filter(alert => !dismissed.has(alert.id));
    setAlerts(filteredAlerts);
  }, [qualityStats, performanceData, dismissed]);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'error': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default: return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getAlertBg = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'error': return 'bg-red-50 border-red-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const dismissAlert = (alertId: string) => {
    setDismissed(prev => new Set([...prev, alertId]));
  };

  const handleAction = (action: Alert['action']) => {
    if (action?.url) {
      window.location.href = action.url;
    } else if (action?.callback) {
      action.callback();
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (alerts.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-gray-600 mb-1">لا توجد تنبيهات</h3>
            <p className="text-sm text-gray-500">النظام يعمل بشكل طبيعي</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 space-x-reverse">
            <Bell className="w-5 h-5 text-orange-600" />
            <span>التنبيهات الذكية</span>
            <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
              {alerts.length}
            </span>
          </CardTitle>
          <button
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            className={`p-2 rounded-lg transition-colors ${
              notificationsEnabled 
                ? 'text-orange-600 hover:bg-orange-50' 
                : 'text-gray-400 hover:bg-gray-50'
            }`}
            title={notificationsEnabled ? 'إيقاف التنبيهات' : 'تفعيل التنبيهات'}
          >
            {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {alerts.map((alert) => (
            <div key={alert.id} className={`p-4 rounded-lg border ${getAlertBg(alert.type)}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 space-x-reverse flex-1">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-gray-900">{alert.title}</h4>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <span className={`px-2 py-1 text-xs rounded-full ${getPriorityBadge(alert.priority)}`}>
                          {alert.priority === 'high' ? 'عالي' : 
                           alert.priority === 'medium' ? 'متوسط' : 'منخفض'}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatTimestamp(alert.timestamp)}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{alert.message}</p>
                    {alert.actionable && alert.action && (
                      <button
                        onClick={() => handleAction(alert.action)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {alert.action.label} ←
                      </button>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => dismissAlert(alert.id)}
                  className="p-1 hover:bg-white hover:bg-opacity-50 rounded"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SmartAlerts;
