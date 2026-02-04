import React from 'react';
import {
  SparklesIcon,
  ChartBarIcon,
  BellAlertIcon,
  ShieldExclamationIcon,
  LightBulbIcon,
  CpuChipIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

// Data moved to translation files for multi-language support

// Status logic handled inside component

const AIToolsDesign: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const toolIds = [
    'profit-forecast', 'sales-forecast', 'auto-alerts',
    'smart-recommendations', 'fraud-detection', 'campaign-killswitch'
  ];

  const toolStatuses: Record<string, 'design' | 'planned' | 'future'> = {
    'profit-forecast': 'design',
    'sales-forecast': 'design',
    'auto-alerts': 'design',
    'smart-recommendations': 'planned',
    'fraud-detection': 'design',
    'campaign-killswitch': 'future',
  };

  const statusColors = {
    design: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    planned: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    future: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  };

  const getStatusCount = (status: 'design' | 'planned' | 'future') => {
    return Object.values(toolStatuses).filter(s => s === status).length;
  };

  const getArchitecture = (id: string) => {
    const archMap: Record<string, string[]> = {
      'profit-forecast': [
        'Time Series Model (Prophet/ARIMA)',
        'Feature Engineering: day_of_week, month, holidays, promotions',
        'Training Pipeline: weekly retraining',
        'API: /api/ai/profit-forecast?horizon=30',
      ],
      'sales-forecast': [
        'Demand Forecasting Model per SKU',
        'Inventory Optimization Algorithm',
        'Reorder Point Calculation',
        'API: /api/ai/sales-forecast?productId=X',
      ],
      'auto-alerts': [
        'Anomaly Detection (Isolation Forest/Z-Score)',
        'Threshold-based Rules Engine',
        'Notification Service (Email/SMS/Push)',
        'API: /api/ai/alerts/check',
      ],
      'smart-recommendations': [
        'Collaborative Filtering',
        'Content-based Recommendations',
        'A/B Testing Framework',
        'API: /api/ai/recommendations?customerId=X',
      ],
      'fraud-detection': [
        'Classification Model (Random Forest/XGBoost)',
        'Feature Engineering: order patterns, customer history',
        'Real-time Scoring on Order Creation',
        'API: /api/ai/fraud-score?orderId=X',
      ],
      'campaign-killswitch': [
        'Facebook/Google Ads API Integration',
        'Real-time ROAS Calculation',
        'Automated Campaign Pause/Resume',
        'API: /api/ai/campaign-monitor',
      ]
    };
    return archMap[id] || [];
  };

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <SparklesIcon className="h-8 w-8 text-purple-500" />
          {t('aiToolsDesign.title')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {t('aiToolsDesign.subtitle')}
        </p>
      </div>

      {/* Important Notice */}
      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <CpuChipIcon className="h-6 w-6 text-purple-500 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">{t('aiToolsDesign.importantNote')}</h3>
            <div className="text-purple-700 dark:text-purple-300 mt-2" dangerouslySetInnerHTML={{ __html: t('aiToolsDesign.noticeText') }} />
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors.design}`}>
                {t('aiToolsDesign.statusDesign', { count: getStatusCount('design') })}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors.planned}`}>
                {t('aiToolsDesign.statusPlanned', { count: getStatusCount('planned') })}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors.future}`}>
                {t('aiToolsDesign.statusFuture', { count: getStatusCount('future') })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Tools Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {toolIds.map((id) => {
          const toolKey = `aiToolsDesign.tools.${id}`;
          const status = toolStatuses[id];
          const features = t(`${toolKey}.features`, { returnObjects: true }) as string[];
          const dataRequired = t(`${toolKey}.dataRequired`, { returnObjects: true }) as string[];
          const uiComponents = t(`${toolKey}.uiComponents`, { returnObjects: true }) as string[];
          const architecture = getArchitecture(id);

          return (
            <div key={id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {id === 'profit-forecast' && <ArrowTrendingUpIcon className="h-6 w-6 text-green-500" />}
                    {id === 'sales-forecast' && <ChartBarIcon className="h-6 w-6 text-blue-500" />}
                    {id === 'auto-alerts' && <BellAlertIcon className="h-6 w-6 text-red-500" />}
                    {id === 'smart-recommendations' && <LightBulbIcon className="h-6 w-6 text-yellow-500" />}
                    {id === 'fraud-detection' && <ShieldExclamationIcon className="h-6 w-6 text-orange-500" />}
                    {id === 'campaign-killswitch' && <ExclamationTriangleIcon className="h-6 w-6 text-purple-500" />}
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t(`${toolKey}.title`)}</h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${status ? statusColors[status] : ''}`}>
                    {status ? t(`aiToolsDesign.statusLabels.${status}`) : ''}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm">{t(`${toolKey}.description`)}</p>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Features */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <SparklesIcon className="h-4 w-4 text-purple-500" />
                    {t('aiToolsDesign.featuresLabel')}
                  </h4>
                  <ul className="space-y-1">
                    {Array.isArray(features) && features.map((feature, idx) => (
                      <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                        <span className="text-green-500 mt-1">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Data Required */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
                    {t('aiToolsDesign.dataRequiredLabel')}
                  </h4>
                  <ul className="space-y-1">
                    {Array.isArray(dataRequired) && dataRequired.map((data, idx) => (
                      <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                        <span className="text-yellow-500 mt-1">•</span>
                        {data}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Architecture */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <CpuChipIcon className="h-4 w-4 text-blue-500" />
                    {t('aiToolsDesign.architectureLabel')}
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <ul className="space-y-1">
                      {architecture.map((arch, idx) => (
                        <li key={idx} className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                          {arch}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* UI Components */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">{t('aiToolsDesign.uiComponentsLabel')}</h4>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(uiComponents) && uiComponents.map((component, idx) => (
                      <span key={idx} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300">
                        {component}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Implementation Roadmap */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('aiToolsDesign.roadmapTitle')}</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-24 text-sm font-medium text-gray-500">{t('aiToolsDesign.phase1')}</div>
            <div className="flex-1 bg-blue-100 dark:bg-blue-900/30 rounded-lg p-3">
              <p className="text-sm text-blue-800 dark:text-blue-200" dangerouslySetInnerHTML={{ __html: t('aiToolsDesign.phase1Desc') }} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-24 text-sm font-medium text-gray-500">{t('aiToolsDesign.phase2')}</div>
            <div className="flex-1 bg-green-100 dark:bg-green-900/30 rounded-lg p-3">
              <p className="text-sm text-green-800 dark:text-green-200" dangerouslySetInnerHTML={{ __html: t('aiToolsDesign.phase2Desc') }} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-24 text-sm font-medium text-gray-500">{t('aiToolsDesign.phase3')}</div>
            <div className="flex-1 bg-purple-100 dark:bg-purple-900/30 rounded-lg p-3">
              <p className="text-sm text-purple-800 dark:text-purple-200" dangerouslySetInnerHTML={{ __html: t('aiToolsDesign.phase3Desc') }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIToolsDesign;
