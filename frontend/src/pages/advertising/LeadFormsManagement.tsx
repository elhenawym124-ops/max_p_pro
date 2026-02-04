/**
 * 📋 Lead Forms Management
 * 
 * صفحة إدارة نماذج جمع البيانات (Lead Generation)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  FileText,
  Plus,
  Trash2,
  Eye,
  Download,
  RefreshCw,
  Users,
  Mail,
  Phone,
  User,
  MapPin,
  Calendar,
  X,
  Loader2,
  Search
} from 'lucide-react';
import { facebookAdsService } from '../../services/facebookAdsService';

interface LeadForm {
  id: string;
  name: string;
  status: string;
  leads_count?: number;
  created_time?: string;
  questions?: any[];
}

interface Lead {
  id: string;
  created_time: string;
  field_data: Array<{ name: string; values: string[] }>;
}

type QuestionType = 'EMAIL' | 'PHONE' | 'FULL_NAME' | 'FIRST_NAME' | 'LAST_NAME' | 'CITY' | 'STATE' | 'ZIP' | 'COUNTRY' | 'CUSTOM';

const LeadFormsManagement: React.FC = () => {
  useNavigate(); // Keep for future navigation needs
  const [forms, setForms] = useState<LeadForm[]>([]);
  const [selectedForm, setSelectedForm] = useState<LeadForm | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLeadsModal, setShowLeadsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form creation state
  const [newForm, setNewForm] = useState({
    pageId: '',
    name: '',
    privacyPolicyUrl: '',
    questions: [
      { type: 'EMAIL', key: 'email', label: 'البريد الإلكتروني' },
      { type: 'PHONE', key: 'phone', label: 'رقم الهاتف' }
    ],
    thankYouPage: {
      title: 'شكراً لك!',
      body: 'سنتواصل معك قريباً',
      buttonText: 'زيارة الموقع',
      buttonType: 'VIEW_WEBSITE',
      websiteUrl: ''
    }
  });

  const questionTypes = [
    { type: 'EMAIL', label: 'البريد الإلكتروني', icon: Mail },
    { type: 'PHONE', label: 'رقم الهاتف', icon: Phone },
    { type: 'FULL_NAME', label: 'الاسم الكامل', icon: User },
    { type: 'FIRST_NAME', label: 'الاسم الأول', icon: User },
    { type: 'LAST_NAME', label: 'اسم العائلة', icon: User },
    { type: 'CITY', label: 'المدينة', icon: MapPin },
    { type: 'STATE', label: 'المنطقة', icon: MapPin },
    { type: 'ZIP', label: 'الرمز البريدي', icon: MapPin },
    { type: 'COUNTRY', label: 'الدولة', icon: MapPin },
    { type: 'DOB', label: 'تاريخ الميلاد', icon: Calendar }
  ];

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      setLoading(true);
      // Note: This would need a backend endpoint to list forms
      // For now, we'll show empty state
      setForms([]);
    } catch (error) {
      console.error('Error loading forms:', error);
      toast.error('فشل في تحميل النماذج');
    } finally {
      setLoading(false);
    }
  };

  const loadLeads = async (formId: string) => {
    try {
      setLeadsLoading(true);
      const data = await facebookAdsService.getLeads(formId);
      setLeads(data);
    } catch (error) {
      console.error('Error loading leads:', error);
      toast.error('فشل في تحميل البيانات');
    } finally {
      setLeadsLoading(false);
    }
  };

  const handleCreateForm = async () => {
    if (!newForm.pageId || !newForm.name || !newForm.privacyPolicyUrl) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      setLoading(true);
      const formPayload: any = {
        pageId: newForm.pageId,
        name: newForm.name,
        questions: newForm.questions,
        privacyPolicyUrl: newForm.privacyPolicyUrl,
        thankYouPage: newForm.thankYouPage
      };
      await facebookAdsService.createLeadForm(formPayload);
      toast.success('تم إنشاء النموذج بنجاح!');
      setShowCreateModal(false);
      loadForms();
    } catch (error: any) {
      console.error('Error creating form:', error);
      toast.error(error?.response?.data?.error || 'فشل في إنشاء النموذج');
    } finally {
      setLoading(false);
    }
  };

  const handleViewLeads = (form: LeadForm) => {
    setSelectedForm(form);
    setShowLeadsModal(true);
    loadLeads(form.id);
  };

  const addQuestion = (type: string) => {
    const questionType = questionTypes.find(q => q.type === type);
    if (questionType) {
      setNewForm(prev => ({
        ...prev,
        questions: [
          ...prev.questions,
          { type, key: type.toLowerCase(), label: questionType.label }
        ]
      }));
    }
  };

  const removeQuestion = (index: number) => {
    setNewForm(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const exportLeadsToCSV = () => {
    if (leads.length === 0) return;

    const headers = leads[0]?.field_data?.map(f => f.name) || [];
    const rows = leads.map(lead => 
      lead.field_data?.map(f => f.values?.join(', ') || '').join(',') || ''
    );

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leads_${selectedForm?.name || 'export'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('تم تصدير البيانات بنجاح!');
  };

  const filteredForms = forms.filter(form =>
    form.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            نماذج جمع البيانات
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">إدارة نماذج Lead Generation وجمع بيانات العملاء المحتملين</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadForms}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <RefreshCw className="w-4 h-4" />
            تحديث
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 dark:bg-blue-500 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600"
          >
            <Plus className="w-4 h-4" />
            إنشاء نموذج جديد
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="البحث في النماذج..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
        />
      </div>

      {/* Forms List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/20 border border-gray-200 dark:border-gray-700 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">لا توجد نماذج</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">ابدأ بإنشاء نموذج جديد لجمع بيانات العملاء المحتملين</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-white bg-blue-600 dark:bg-blue-500 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600"
          >
            <Plus className="w-4 h-4" />
            إنشاء نموذج جديد
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredForms.map((form) => (
            <div key={form.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/20 border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{form.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {form.created_time ? new Date(form.created_time).toLocaleDateString('ar-EG') : ''}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  form.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {form.status === 'ACTIVE' ? 'نشط' : form.status}
                </span>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{form.leads_count || 0} عميل محتمل</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleViewLeads(form)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                >
                  <Eye className="w-4 h-4" />
                  عرض البيانات
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Form Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border-0 dark:border dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-600 sticky top-0 bg-white dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">إنشاء نموذج جديد</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">معرف الصفحة *</label>
                  <input
                    type="text"
                    value={newForm.pageId}
                    onChange={(e) => setNewForm(prev => ({ ...prev, pageId: e.target.value }))}
                    placeholder="أدخل معرف صفحة Facebook"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم النموذج *</label>
                  <input
                    type="text"
                    value={newForm.name}
                    onChange={(e) => setNewForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="مثال: نموذج التسجيل"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رابط سياسة الخصوصية *</label>
                  <input
                    type="url"
                    value={newForm.privacyPolicyUrl}
                    onChange={(e) => setNewForm(prev => ({ ...prev, privacyPolicyUrl: e.target.value }))}
                    placeholder="https://example.com/privacy"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
              </div>

              {/* Questions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الأسئلة</label>
                <div className="space-y-2 mb-3">
                  {newForm.questions.map((q, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-gray-700 dark:text-gray-300">{q.label}</span>
                      <button
                        onClick={() => removeQuestion(index)}
                        className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  {questionTypes.map((qt) => {
                    const Icon = qt.icon;
                    const isAdded = newForm.questions.some(q => q.type === qt.type);
                    return (
                      <button
                        key={qt.type}
                        onClick={() => !isAdded && addQuestion(qt.type)}
                        disabled={isAdded}
                        className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border ${
                          isAdded
                            ? 'bg-gray-100 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed border-gray-300 dark:border-gray-500'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {qt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Thank You Page */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">صفحة الشكر</label>
                <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <input
                    type="text"
                    value={newForm.thankYouPage.title}
                    onChange={(e) => setNewForm(prev => ({
                      ...prev,
                      thankYouPage: { ...prev.thankYouPage, title: e.target.value }
                    }))}
                    placeholder="العنوان"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  <textarea
                    value={newForm.thankYouPage.body}
                    onChange={(e) => setNewForm(prev => ({
                      ...prev,
                      thankYouPage: { ...prev.thankYouPage, body: e.target.value }
                    }))}
                    placeholder="الرسالة"
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <input
                    type="url"
                    value={newForm.thankYouPage.websiteUrl}
                    onChange={(e) => setNewForm(prev => ({
                      ...prev,
                      thankYouPage: { ...prev.thankYouPage, websiteUrl: e.target.value }
                    }))}
                    placeholder="رابط الموقع (اختياري)"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex gap-3 justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleCreateForm}
                disabled={loading}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                إنشاء النموذج
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leads Modal */}
      {showLeadsModal && selectedForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">بيانات العملاء المحتملين</h2>
                <p className="text-gray-500">{selectedForm.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportLeadsToCSV}
                  disabled={leads.length === 0}
                  className="flex items-center gap-2 px-3 py-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  تصدير CSV
                </button>
                <button onClick={() => setShowLeadsModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {leadsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : leads.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">لا توجد بيانات بعد</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">التاريخ</th>
                        {leads[0]?.field_data?.map((field, i) => (
                          <th key={i} className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                            {field.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {leads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(lead.created_time).toLocaleDateString('ar-EG')}
                          </td>
                          {lead.field_data?.map((field, i) => (
                            <td key={i} className="px-4 py-3 text-sm text-gray-900">
                              {field.values?.join(', ') || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadFormsManagement;
