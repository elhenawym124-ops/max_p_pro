import React from 'react';
import {
  DocumentTextIcon,
  CpuChipIcon,
  ServerIcon,
  CircleStackIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

// No data needed outside anymore as it's moved to translation files

const getPriorityLabel = (priority: 'high' | 'medium' | 'low', t: any) => {
  switch (priority) {
    case 'high': return t('advancedAnalyticsPlan.priorityHigh');
    case 'medium': return t('advancedAnalyticsPlan.priorityMedium');
    case 'low': return t('advancedAnalyticsPlan.priorityLow');
    default: return priority;
  }
};

const AdvancedAnalyticsPlan: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const analyticsIds = [
    'profit', 'cogs', 'ads', 'funnel', 'delivery', 'cod',
    'regions', 'customer-quality', 'product-health', 'returns', 'team', 'abandoned'
  ];

  const priorityColors = {
    high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  };

  const getPriorityCount = (priority: string) => {
    // This is a bit of a hack since we moved data to JSON, but we can hardcode the priorities for the summary
    const priorities: Record<string, string> = {
      'profit': 'high',
      'cogs': 'high',
      'ads': 'high',
      'funnel': 'medium',
      'delivery': 'high',
      'cod': 'high',
      'regions': 'medium',
      'customer-quality': 'medium',
      'product-health': 'medium',
      'returns': 'medium',
      'team': 'low',
      'abandoned': 'medium'
    };
    return Object.values(priorities).filter(p => p === priority).length;
  };

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('advancedAnalyticsPlan.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {t('advancedAnalyticsPlan.subtitle')}
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
            <div>
              <p className="text-sm text-red-600 dark:text-red-400">{t('advancedAnalyticsPlan.priorityHigh')}</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                {getPriorityCount('high')}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-3">
            <ClockIcon className="h-6 w-6 text-yellow-500" />
            <div>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">{t('advancedAnalyticsPlan.priorityMedium')}</p>
              <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                {getPriorityCount('medium')}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="h-6 w-6 text-green-500" />
            <div>
              <p className="text-sm text-green-600 dark:text-green-400">{t('advancedAnalyticsPlan.priorityLow')}</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                {getPriorityCount('low')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Items */}
      <div className="space-y-6">
        {analyticsIds.map((id) => {
          const itemKey = `advancedAnalyticsPlan.items.${id}`;
          const priority = (id === 'team') ? 'low' : (['funnel', 'regions', 'customer-quality', 'product-health', 'returns', 'abandoned'].includes(id) ? 'medium' : 'high') as 'high' | 'medium' | 'low';

          // Get localized arrays
          const backendPlan = t(`${itemKey}.backendPlan`, { returnObjects: true }) as string[];
          const trackingPlan = t(`${itemKey}.trackingPlan`, { returnObjects: true }) as string[];

          // Use hardcoded database plans since they are SQL and don't change
          const databasePlanMap: Record<string, string[]> = {
            profit: [
              'ALTER TABLE products ADD COLUMN costPrice DECIMAL(10,2)',
              'CREATE TABLE profit_records (orderId, revenue, cogs, shipping, fees, netProfit)',
            ],
            cogs: [
              'CREATE TABLE product_costs (productId, costPrice, lastUpdated)',
              t('advancedAnalyticsPlan.databasePlan.cogsRel'),
            ],
            ads: [
              'CREATE TABLE ad_campaigns (id, platform, name, spend, clicks, conversions)',
              'CREATE TABLE order_attribution (orderId, campaignId, utmSource, utmMedium)',
            ],
            funnel: [
              'CREATE TABLE events (sessionId, eventType, productId, timestamp)',
              'CREATE TABLE sessions (id, visitorId, startTime, endTime, converted)',
            ],
            delivery: [
              'ALTER TABLE orders ADD COLUMN deliveryStatus ENUM(delivered, returned, rejected)',
              'ALTER TABLE orders ADD COLUMN deliveryDate DATETIME',
            ],
            cod: [
              'ALTER TABLE orders ADD COLUMN rejectionReason VARCHAR(255)',
              'CREATE TABLE cod_analytics (date, region, accepted, rejected, reasons)',
            ],
            regions: [
              'CREATE TABLE regions (id, name, governorate, deliveryRate, avgOrderValue)',
              t('advancedAnalyticsPlan.databasePlan.regionsRel'),
            ],
            'customer-quality': [
              'CREATE TABLE customer_scores (customerId, rfmScore, segment, clv, lastUpdated)',
            ],
            'product-health': [
              'CREATE TABLE product_health (productId, healthScore, category, recommendation)',
            ],
            returns: [
              'CREATE TABLE returns (orderId, reason, status, refundAmount, createdAt)',
            ],
            team: [
              'CREATE TABLE order_actions (orderId, userId, action, timestamp)',
            ],
            abandoned: [
              'CREATE TABLE carts (sessionId, items, total, createdAt, convertedAt)',
            ]
          };

          return (
            <div key={id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <ChartBarIcon className="h-6 w-6 text-blue-500" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t(`${itemKey}.title`)}</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">{t(`${itemKey}.description`)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${priorityColors[priority]}`}>
                      {getPriorityLabel(priority, t)}
                    </span>
                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs text-gray-600 dark:text-gray-300">
                      {id === 'profit' ? '3-5' : (id === 'ads' ? '5-7' : (id === 'funnel' ? '4-6' : (id === 'abandoned' ? '4-5' : '2-3')))} {isRtl ? 'أيام' : 'days'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Why Missing */}
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">{t('advancedAnalyticsPlan.whyMissingLabel')}</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">{t(`${itemKey}.whyMissing`)}</p>
                  </div>
                </div>
              </div>

              {/* Plans */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Backend Plan */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CpuChipIcon className="h-5 w-5 text-purple-500" />
                    <h4 className="font-medium text-gray-900 dark:text-white">{t('advancedAnalyticsPlan.backend')}</h4>
                  </div>
                  <ul className="space-y-2">
                    {Array.isArray(backendPlan) && backendPlan.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="text-purple-500 mt-1">•</span>
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Database Plan */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CircleStackIcon className="h-5 w-5 text-blue-500" />
                    <h4 className="font-medium text-gray-900 dark:text-white">{t('advancedAnalyticsPlan.database')}</h4>
                  </div>
                  <ul className="space-y-2">
                    {databasePlanMap[id]?.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="text-blue-500 mt-1">•</span>
                        <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">{step}</code>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Tracking Plan */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ServerIcon className="h-5 w-5 text-green-500" />
                    <h4 className="font-medium text-gray-900 dark:text-white">{t('advancedAnalyticsPlan.tracking')}</h4>
                  </div>
                  <ul className="space-y-2">
                    {Array.isArray(trackingPlan) && trackingPlan.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="text-green-500 mt-1">•</span>
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdvancedAnalyticsPlan;
