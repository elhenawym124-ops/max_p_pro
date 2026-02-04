/**
 * 🤖 Automation Rules Management
 * 
 * صفحة إدارة قواعد الأتمتة للإعلانات
 * v22.0 Feature
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Zap,
  Plus,
  Trash2,
  Edit,
  Play,
  Pause,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Loader2,
  ChevronDown
} from 'lucide-react';
import { facebookAdsService } from '../../services/facebookAdsService';

// ============================================
// Types
// ============================================

interface AutomationRule {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED';
  entityType: 'CAMPAIGN' | 'ADSET' | 'AD';
  actionType: string;
  conditions: RuleCondition[];
  schedule: string;
  createdAt: string;
  lastTriggered?: string;
}

interface RuleCondition {
  field: string;
  operator: string;
  value: number;
}

interface CreateRuleForm {
  name: string;
  entityType: 'CAMPAIGN' | 'ADSET' | 'AD';
  actionType: string;
  conditions: RuleCondition[];
  schedule: string;
}

// ============================================
// Constants
// ============================================

const ENTITY_TYPES = [
  { value: 'CAMPAIGN', label: 'الحملات' },
  { value: 'ADSET', label: 'المجموعات الإعلانية' },
  { value: 'AD', label: 'الإعلانات' }
];

const ACTION_TYPES = [
  { value: 'PAUSE', label: 'إيقاف مؤقت', icon: <Pause className="w-4 h-4" /> },
  { value: 'UNPAUSE', label: 'استئناف', icon: <Play className="w-4 h-4" /> },
  { value: 'INCREASE_BUDGET', label: 'زيادة الميزانية', icon: <TrendingUp className="w-4 h-4" /> },
  { value: 'DECREASE_BUDGET', label: 'تقليل الميزانية', icon: <TrendingDown className="w-4 h-4" /> },
  { value: 'SEND_NOTIFICATION', label: 'إرسال إشعار', icon: <AlertCircle className="w-4 h-4" /> }
];

const CONDITION_FIELDS = [
  { value: 'cost_per_result', label: 'تكلفة النتيجة' },
  { value: 'ctr', label: 'معدل النقر (CTR)' },
  { value: 'cpc', label: 'تكلفة النقرة (CPC)' },
  { value: 'cpm', label: 'تكلفة الألف ظهور (CPM)' },
  { value: 'spend', label: 'الإنفاق' },
  { value: 'impressions', label: 'مرات الظهور' },
  { value: 'clicks', label: 'النقرات' },
  { value: 'conversions', label: 'التحويلات' },
  { value: 'frequency', label: 'التكرار' },
  { value: 'roas', label: 'العائد على الإنفاق (ROAS)' }
];

const OPERATORS = [
  { value: 'GREATER_THAN', label: 'أكبر من' },
  { value: 'LESS_THAN', label: 'أقل من' },
  { value: 'EQUAL', label: 'يساوي' },
  { value: 'IN_RANGE', label: 'في النطاق' }
];

const SCHEDULES = [
  { value: 'SEMI_HOURLY', label: 'كل 30 دقيقة' },
  { value: 'HOURLY', label: 'كل ساعة' },
  { value: 'DAILY', label: 'يومياً' },
  { value: 'WEEKLY', label: 'أسبوعياً' }
];

// ============================================
// Component
// ============================================

const AutomationRules: React.FC = () => {
  const navigate = useNavigate();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  
  const [formData, setFormData] = useState<CreateRuleForm>({
    name: '',
    entityType: 'CAMPAIGN',
    actionType: 'PAUSE',
    conditions: [{ field: 'cost_per_result', operator: 'GREATER_THAN', value: 0 }],
    schedule: 'DAILY'
  });

  // Load rules
  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const data = await facebookAdsService.getAutomatedRules();
      setRules(data);
    } catch (error: any) {
      console.error('Error loading rules:', error);
      toast.error('فشل في تحميل القواعد');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async () => {
    if (!formData.name.trim()) {
      toast.error('اسم القاعدة مطلوب');
      return;
    }

    try {
      setCreating(true);
      await facebookAdsService.createAutomatedRule({
        name: formData.name,
        entityType: formData.entityType,
        actionType: formData.actionType,
        evaluationSpec: {
          evaluationType: formData.schedule,
          filters: formData.conditions.map(c => ({
            field: c.field,
            operator: c.operator,
            value: c.value
          }))
        },
        executionSpec: {
          executionType: formData.actionType
        }
      });
      
      toast.success('تم إنشاء القاعدة بنجاح');
      setShowCreateModal(false);
      resetForm();
      await loadRules();
    } catch (error: any) {
      console.error('Error creating rule:', error);
      toast.error(error?.response?.data?.error || 'فشل في إنشاء القاعدة');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه القاعدة؟')) return;

    try {
      await facebookAdsService.deleteAutomatedRule(ruleId);
      toast.success('تم حذف القاعدة');
      await loadRules();
    } catch (error: any) {
      toast.error('فشل في حذف القاعدة');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      entityType: 'CAMPAIGN',
      actionType: 'PAUSE',
      conditions: [{ field: 'cost_per_result', operator: 'GREATER_THAN', value: 0 }],
      schedule: 'DAILY'
    });
  };

  const addCondition = () => {
    setFormData(prev => ({
      ...prev,
      conditions: [...prev.conditions, { field: 'ctr', operator: 'LESS_THAN', value: 0 }]
    }));
  };

  const removeCondition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index)
    }));
  };

  const updateCondition = (index: number, field: keyof RuleCondition, value: any) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.map((c, i) => i === index ? { ...c, [field]: value } : c)
    }));
  };

  // ============================================
  // Render
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Zap className="w-8 h-8 text-yellow-500" />
            قواعد الأتمتة
          </h1>
          <p className="text-gray-600 mt-1">
            أنشئ قواعد لأتمتة إدارة حملاتك الإعلانية تلقائياً
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          قاعدة جديدة
        </button>
      </div>

      {/* Rules List */}
      {rules.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <Zap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">لا توجد قواعد أتمتة</h3>
          <p className="text-gray-500 mb-6">أنشئ قاعدة جديدة لأتمتة إدارة حملاتك</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            إنشاء قاعدة
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {rules.map((rule) => (
            <div key={rule.id} className="bg-white rounded-xl shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${rule.status === 'ACTIVE' ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Zap className={`w-6 h-6 ${rule.status === 'ACTIVE' ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{rule.name}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        {ENTITY_TYPES.find(e => e.value === rule.entityType)?.label}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {SCHEDULES.find(s => s.value === rule.schedule)?.label}
                      </span>
                    </div>
                    <div className="mt-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        rule.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {rule.status === 'ACTIVE' ? <CheckCircle className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                        {rule.status === 'ACTIVE' ? 'نشط' : 'متوقف'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">إنشاء قاعدة أتمتة جديدة</h2>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Rule Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">اسم القاعدة</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="مثال: إيقاف الإعلانات منخفضة الأداء"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Entity Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">تطبيق على</label>
                <select
                  value={formData.entityType}
                  onChange={(e) => setFormData(prev => ({ ...prev, entityType: e.target.value as any }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {ENTITY_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* Action Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الإجراء</label>
                <div className="grid grid-cols-2 gap-3">
                  {ACTION_TYPES.map(action => (
                    <button
                      key={action.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, actionType: action.value }))}
                      className={`flex items-center gap-2 p-3 border-2 rounded-lg transition-all ${
                        formData.actionType === action.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {action.icon}
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الشروط</label>
                <div className="space-y-3">
                  {formData.conditions.map((condition, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <select
                        value={condition.field}
                        onChange={(e) => updateCondition(index, 'field', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        {CONDITION_FIELDS.map(field => (
                          <option key={field.value} value={field.value}>{field.label}</option>
                        ))}
                      </select>
                      <select
                        value={condition.operator}
                        onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        {OPERATORS.map(op => (
                          <option key={op.value} value={op.value}>{op.label}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={condition.value}
                        onChange={(e) => updateCondition(index, 'value', parseFloat(e.target.value))}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      {formData.conditions.length > 1 && (
                        <button
                          onClick={() => removeCondition(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addCondition}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة شرط
                  </button>
                </div>
              </div>

              {/* Schedule */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">التكرار</label>
                <select
                  value={formData.schedule}
                  onChange={(e) => setFormData(prev => ({ ...prev, schedule: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {SCHEDULES.map(schedule => (
                    <option key={schedule.value} value={schedule.value}>{schedule.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                إلغاء
              </button>
              <button
                onClick={handleCreateRule}
                disabled={creating}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري الإنشاء...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    إنشاء القاعدة
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomationRules;
