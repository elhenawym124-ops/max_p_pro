import React, { useState, useEffect } from 'react';
import { useCurrency } from '../../hooks/useCurrency';
import { useDateFormat } from '../../hooks/useDateFormat';
import { buildApiUrl } from '../../utils/urlHelper';
import {
  ChartBarIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  FunnelIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

interface Opportunity {
  id: string;
  title: string;
  customerId: string;
  customerName: string;
  value: number;
  currency: string;
  stage: string;
  probability: number;
  expectedCloseDate: string;
  source: string;
  assignedTo: string;
  assignedToName: string;
  description: string;
  products: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  activities: Array<{
    id: string;
    type: string;
    description: string;
    date: string;
    userId: string;
  }>;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface PipelineStats {
  stages: Record<string, {
    count: number;
    value: number;
    opportunities: Opportunity[];
  }>;
  totals: {
    count: number;
    value: number;
    weightedValue: number;
    averageValue: number;
  };
}

const Opportunities: React.FC = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const { formatPrice } = useCurrency();
  const { formatDate } = useDateFormat();
  const [pipelineStats, setPipelineStats] = useState<PipelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [showOpportunityModal, setShowOpportunityModal] = useState(false);
  const [filters, setFilters] = useState({
    stage: '',
    source: '',
    assignedTo: '',
  });

  const stages = {
    LEAD: { name: 'عميل محتمل', color: 'bg-gray-100 text-gray-800' },
    QUALIFIED: { name: 'مؤهل', color: 'bg-blue-100 text-blue-800' },
    PROPOSAL: { name: 'عرض سعر', color: 'bg-yellow-100 text-yellow-800' },
    NEGOTIATION: { name: 'تفاوض', color: 'bg-orange-100 text-orange-800' },
    CLOSED_WON: { name: 'مغلق - فوز', color: 'bg-green-100 text-green-800' },
    CLOSED_LOST: { name: 'مغلق - خسارة', color: 'bg-red-100 text-red-800' },
  };

  useEffect(() => {
    fetchOpportunities();
    fetchPipelineStats();
  }, [filters]);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      if (filters.stage) queryParams.append('stage', filters.stage);
      if (filters.source) queryParams.append('source', filters.source);
      if (filters.assignedTo) queryParams.append('assignedTo', filters.assignedTo);

      const response = await fetch(buildApiUrl(`opportunities?${queryParams}`));
      const data = await response.json();
      
      if (data.success) {
        setOpportunities(data.data);
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPipelineStats = async () => {
    try {
      const response = await fetch(buildApiUrl('opportunities/stats/pipeline'));
      const data = await response.json();
      
      if (data.success) {
        setPipelineStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching pipeline stats:', error);
    }
  };

  const updateOpportunityStage = async (opportunityId: string, newStage: string) => {
    try {
      const response = await fetch(buildApiUrl(`opportunities/${opportunityId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stage: newStage }),
      });

      const data = await response.json();
      if (data.success) {
        fetchOpportunities();
        fetchPipelineStats();
        alert('تم تحديث مرحلة الفرصة بنجاح');
      }
    } catch (error) {
      console.error('Error updating opportunity stage:', error);
      alert('فشل في تحديث مرحلة الفرصة');
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'facebook':
        return '📘';
      case 'whatsapp':
        return '💬';
      case 'website':
        return '🌐';
      case 'referral':
        return '👥';
      default:
        return '📞';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <ChartBarIcon className="h-8 w-8 text-indigo-600 mr-3" />
              إدارة الفرص التجارية
            </h1>
            <p className="mt-2 text-gray-600">متابعة وإدارة الفرص التجارية ومسار المبيعات</p>
          </div>
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
            <PlusIcon className="h-5 w-5 mr-2" />
            فرصة جديدة
          </button>
        </div>
      </div>

      {/* Pipeline Stats */}
      {pipelineStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      إجمالي الفرص
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {pipelineStats.totals.count}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CurrencyDollarIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      القيمة الإجمالية
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatPrice(pipelineStats.totals.value)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      القيمة المرجحة
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatPrice(pipelineStats.totals.weightedValue)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CurrencyDollarIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      متوسط قيمة الفرصة
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatPrice(pipelineStats.totals.averageValue)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              المرحلة
            </label>
            <select
              value={filters.stage}
              onChange={(e) => setFilters({...filters, stage: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">جميع المراحل</option>
              {Object.entries(stages).map(([key, stage]) => (
                <option key={key} value={key}>{stage.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              المصدر
            </label>
            <select
              value={filters.source}
              onChange={(e) => setFilters({...filters, source: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">جميع المصادر</option>
              <option value="facebook">Facebook</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="website">الموقع الإلكتروني</option>
              <option value="referral">إحالة</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              المسؤول
            </label>
            <select
              value={filters.assignedTo}
              onChange={(e) => setFilters({...filters, assignedTo: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">جميع المسؤولين</option>
              <option value="1">أحمد المدير</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFilters({ stage: '', source: '', assignedTo: '' })}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              إعادة تعيين
            </button>
          </div>
        </div>
      </div>

      {/* Opportunities Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  العنوان
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  العميل
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  القيمة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المرحلة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الاحتمالية
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المصدر
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  تاريخ الإغلاق المتوقع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {opportunities.map((opportunity) => (
                <tr key={opportunity.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {opportunity.title}
                    </div>
                    <div className="text-sm text-gray-500">
                      {opportunity.description.substring(0, 50)}...
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {opportunity.customerName}
                    </div>
                    <div className="text-sm text-gray-500">
                      مسؤول: {opportunity.assignedToName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {opportunity.value.toLocaleString()} {opportunity.currency}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stages[opportunity.stage as keyof typeof stages]?.color}`}>
                      {stages[opportunity.stage as keyof typeof stages]?.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900 mr-2">
                        {opportunity.probability}%
                      </div>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${opportunity.probability}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="mr-1">{getSourceIcon(opportunity.source)}</span>
                    {opportunity.source}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {opportunity.expectedCloseDate ? 
                      formatDate(opportunity.expectedCloseDate) : 
                      'غير محدد'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2 space-x-reverse">
                      <button
                        onClick={() => {
                          setSelectedOpportunity(opportunity);
                          setShowOpportunityModal(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      <button className="text-blue-600 hover:text-blue-900">
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <select
                        value={opportunity.stage}
                        onChange={(e) => updateOpportunityStage(opportunity.id, e.target.value)}
                        className="text-xs border border-gray-300 rounded px-2 py-1"
                      >
                        {Object.entries(stages).map(([key, stage]) => (
                          <option key={key} value={key}>{stage.name}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {opportunities.length === 0 && (
          <div className="text-center py-12">
            <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد فرص تجارية</h3>
            <p className="mt-1 text-sm text-gray-500">لم يتم العثور على فرص تطابق المعايير المحددة.</p>
          </div>
        )}
      </div>

      {/* Opportunity Details Modal */}
      {showOpportunityModal && selectedOpportunity && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  تفاصيل الفرصة التجارية
                </h3>
                <button
                  onClick={() => setShowOpportunityModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">معلومات أساسية</h4>
                  <div className="bg-gray-50 p-3 rounded">
                    <p><strong>العنوان:</strong> {selectedOpportunity.title}</p>
                    <p><strong>العميل:</strong> {selectedOpportunity.customerName}</p>
                    <p><strong>القيمة:</strong> {selectedOpportunity.value.toLocaleString()} {selectedOpportunity.currency}</p>
                    <p><strong>المرحلة:</strong> {stages[selectedOpportunity.stage as keyof typeof stages]?.name}</p>
                    <p><strong>الاحتمالية:</strong> {selectedOpportunity.probability}%</p>
                    <p><strong>المصدر:</strong> {selectedOpportunity.source}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">الوصف</h4>
                  <div className="bg-gray-50 p-3 rounded">
                    <p>{selectedOpportunity.description}</p>
                  </div>
                </div>

                {selectedOpportunity.products.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">المنتجات</h4>
                    <div className="bg-gray-50 p-3 rounded">
                      {selectedOpportunity.products.map((product, index) => (
                        <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-gray-600">الكمية: {product.quantity}</p>
                          </div>
                          <div className="text-left">
                            <p className="font-medium">{formatPrice(product.quantity * product.price)}</p>
                            <p className="text-sm text-gray-600">{formatPrice(product.price)}/قطعة</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedOpportunity.activities.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">الأنشطة</h4>
                    <div className="bg-gray-50 p-3 rounded max-h-40 overflow-y-auto">
                      {selectedOpportunity.activities.map((activity, index) => (
                        <div key={index} className="py-2 border-b border-gray-200 last:border-b-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{activity.description}</p>
                              <p className="text-sm text-gray-600">النوع: {activity.type}</p>
                            </div>
                            <p className="text-sm text-gray-500">
                              {formatDate(activity.date)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedOpportunity.tags && Array.isArray(selectedOpportunity.tags) && selectedOpportunity.tags.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">العلامات</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedOpportunity.tags.map((tag, index) => (
                        <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowOpportunityModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Opportunities;

