import React, { useState, useEffect } from 'react';
import {
  Settings,
  MessageSquare,
  Globe,
  ShoppingCart,
  Palette,
  Brain,
  RotateCcw,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { buildApiUrl } from '../../utils/urlHelper';

// Types
interface RuleOption {
  value: string;
  label: string;
  prompt: string;
  default?: boolean;
}

interface RuleCategory {
  label: string;
  type: 'radio' | 'checkbox';
  options: RuleOption[];
}

interface RulesConfig {
  responseLength: RuleCategory;
  speakingStyle: RuleCategory;
  dialect: RuleCategory;
  salesRules: RuleCategory;
  styleRules: RuleCategory;
  behaviorRules: RuleCategory;
}

interface ResponseRules {
  responseLength: string;
  speakingStyle: string;
  dialect: string;
  rules: string[];
  customRules: string;
  disableDefaultTemplates?: boolean;
}

const ResponseRulesSettings: React.FC = () => {
  const [config, setConfig] = useState<RulesConfig | null>(null);
  const [rules, setRules] = useState<ResponseRules | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    responseLength: true,
    speakingStyle: true,
    dialect: true,
    salesRules: true,
    styleRules: false,
    behaviorRules: false
  });

  // Load config and rules
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load config
      const configRes = await fetch(buildApiUrl('ai/response-rules/config'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const configData = await configRes.json();

      if (configData.success) {
        setConfig(configData.data.config);
      }

      // Load current rules
      const rulesRes = await fetch(buildApiUrl('ai/response-rules'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const rulesData = await rulesRes.json();

      if (rulesData.success) {
        setRules(rulesData.data);
      } else {
        // Use defaults from config
        setRules(configData.data.defaults);
      }
    } catch (err) {
      setError('فشل في تحميل الإعدادات');
      console.error('Error loading response rules:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRadioChange = (category: string, value: string) => {
    if (!rules) return;
    setRules({
      ...rules,
      [category]: value
    });
    setSuccess(null);
  };

  const handleCheckboxChange = (ruleValue: string, checked: boolean) => {
    if (!rules) return;
    const newRules = checked
      ? [...rules.rules, ruleValue]
      : rules.rules.filter(r => r !== ruleValue);

    setRules({
      ...rules,
      rules: newRules
    });
    setSuccess(null);
  };

  const handleCustomRulesChange = (value: string) => {
    if (!rules) return;
    setRules({
      ...rules,
      customRules: value
    });
    setSuccess(null);
  };

  const handleSave = async () => {
    if (!rules) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const res = await fetch(buildApiUrl('ai/response-rules'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(rules)
      });

      const data = await res.json();

      if (data.success) {
        setSuccess('تم حفظ الإعدادات بنجاح! ✅');
      } else {
        setError(data.error || 'فشل في حفظ الإعدادات');
      }
    } catch (err) {
      setError('فشل في حفظ الإعدادات');
      console.error('Error saving response rules:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('هل أنت متأكد من إعادة تعيين جميع القواعد للقيم الافتراضية؟')) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const res = await fetch(buildApiUrl('ai/response-rules/reset'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      const data = await res.json();

      if (data.success) {
        setRules(data.data);
        setSuccess('تم إعادة تعيين القواعد للقيم الافتراضية! ✅');
      } else {
        setError(data.error || 'فشل في إعادة التعيين');
      }
    } catch (err) {
      setError('فشل في إعادة التعيين');
      console.error('Error resetting response rules:', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderRadioGroup = (categoryKey: string, category: RuleCategory) => {
    if (!rules) return null;
    const currentValue = rules[categoryKey as keyof ResponseRules] as string;

    return (
      <div className="space-y-2">
        {category.options.map(option => (
          <label
            key={option.value}
            className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${currentValue === option.value
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
          >
            <input
              type="radio"
              name={categoryKey}
              value={option.value}
              checked={currentValue === option.value}
              onChange={() => handleRadioChange(categoryKey, option.value)}
              className="w-4 h-4 text-blue-600"
            />
            <div className="mr-3 flex-1">
              <span className="font-medium text-gray-900 dark:text-white">
                {option.label}
              </span>
              {option.default && (
                <span className="mr-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                  موصى به
                </span>
              )}
            </div>
          </label>
        ))}
      </div>
    );
  };

  const renderCheckboxGroup = (_categoryKey: string, category: RuleCategory) => {
    if (!rules) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {category.options.map(option => {
          const isChecked = rules.rules.includes(option.value);
          return (
            <label
              key={option.value}
              className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${isChecked
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => handleCheckboxChange(option.value, e.target.checked)}
                className="w-4 h-4 text-green-600 rounded"
              />
              <div className="mr-3 flex-1">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {option.label}
                </span>
                {option.default && (
                  <span className="mr-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                    افتراضي
                  </span>
                )}
              </div>
            </label>
          );
        })}
      </div>
    );
  };

  const getCategoryIcon = (key: string) => {
    switch (key) {
      case 'responseLength': return <MessageSquare className="w-5 h-5" />;
      case 'speakingStyle': return <Palette className="w-5 h-5" />;
      case 'dialect': return <Globe className="w-5 h-5" />;
      case 'salesRules': return <ShoppingCart className="w-5 h-5" />;
      case 'styleRules': return <Palette className="w-5 h-5" />;
      case 'behaviorRules': return <Brain className="w-5 h-5" />;
      default: return <Settings className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="mr-2 text-gray-600">جاري التحميل...</span>
      </div>
    );
  }

  if (!config || !rules) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">
        <AlertCircle className="w-5 h-5 inline ml-2" />
        فشل في تحميل الإعدادات
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-500" />
            قواعد الاستجابة
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            اختر القواعد التي تريد أن يتبعها المساعد الذكي في ردوده
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleReset}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          <RotateCcw className="w-4 h-4" />
          إعادة تعيين
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          حفظ التغييرات
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Radio Categories */}
      {['responseLength', 'speakingStyle', 'dialect'].map(key => {
        const category = config[key as keyof RulesConfig];
        const isExpanded = expandedSections[key];

        return (
          <div key={key} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => toggleSection(key)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                  {getCategoryIcon(key)}
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {category.label}
                </span>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            {isExpanded && (
              <div className="p-4 pt-0 border-t border-gray-100 dark:border-gray-700">
                {renderRadioGroup(key, category)}
              </div>
            )}
          </div>
        );
      })}

      {/* Checkbox Categories */}
      {['salesRules', 'styleRules', 'behaviorRules'].map(key => {
        const category = config[key as keyof RulesConfig];
        const isExpanded = expandedSections[key];
        const checkedCount = category.options.filter(opt => rules.rules.includes(opt.value)).length;

        return (
          <div key={key} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => toggleSection(key)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600">
                  {getCategoryIcon(key)}
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {category.label}
                </span>
                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">
                  {checkedCount}/{category.options.length} مفعّل
                </span>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            {isExpanded && (
              <div className="p-4 pt-0 border-t border-gray-100 dark:border-gray-700">
                {renderCheckboxGroup(key, category)}
              </div>
            )}
          </div>
        );
      })}

      {/* Custom Rules */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <span className="font-semibold text-gray-900 dark:text-white">
              قواعد مخصصة
            </span>
            <p className="text-xs text-gray-500">
              أضف قواعد إضافية خاصة بك (اختياري)
            </p>
          </div>
        </div>
        <textarea
          value={rules.customRules}
          onChange={(e) => handleCustomRulesChange(e.target.value)}
          placeholder="مثال: لا تذكري أي منتجات من شركة X..."
          className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
        />
      </div>
    </div>
  );
};

export default ResponseRulesSettings;
