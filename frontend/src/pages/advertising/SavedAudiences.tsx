/**
 * 👥 Saved Audiences
 * 
 * إدارة الجماهير المحفوظة
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Users,
  Plus,
  Search,
  Trash2,
  Eye,
  Loader2,
  ArrowLeft,
  Target,
  Calendar,
  MoreVertical,
  CheckCircle
} from 'lucide-react';
import { facebookAdsService } from '../../services/facebookAdsService';

interface SavedAudience {
  id: string;
  name: string;
  description?: string;
  targeting: any;
  approximateCount?: number;
  createdAt: string;
}

const SavedAudiences: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [audiences, setAudiences] = useState<SavedAudience[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedAudience, setSelectedAudience] = useState<SavedAudience | null>(null);

  const [newAudience, setNewAudience] = useState({
    name: '',
    description: '',
    ageMin: 18,
    ageMax: 65,
    genders: [] as number[],
    countries: ['SA'],
    interests: ''
  });

  const countries = [
    { code: 'SA', name: 'السعودية' },
    { code: 'AE', name: 'الإمارات' },
    { code: 'EG', name: 'مصر' },
    { code: 'KW', name: 'الكويت' },
    { code: 'QA', name: 'قطر' },
    { code: 'BH', name: 'البحرين' },
    { code: 'OM', name: 'عمان' },
    { code: 'JO', name: 'الأردن' }
  ];

  useEffect(() => {
    loadAudiences();
  }, []);

  const loadAudiences = async () => {
    try {
      setLoading(true);
      const data = await facebookAdsService.getSavedAudiences();
      setAudiences(data || []);
    } catch (error) {
      console.error('Error loading audiences:', error);
      toast.error('فشل في تحميل الجماهير');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newAudience.name.trim()) {
      toast.error('يرجى إدخال اسم الجمهور');
      return;
    }

    try {
      setCreating(true);

      const targeting: any = {
        age_min: newAudience.ageMin,
        age_max: newAudience.ageMax,
        geo_locations: {
          countries: newAudience.countries
        }
      };

      if (newAudience.genders.length > 0) {
        targeting.genders = newAudience.genders;
      }

      if (newAudience.interests.trim()) {
        targeting.flexible_spec = [{
          interests: newAudience.interests.split(',').map(i => ({ name: i.trim() }))
        }];
      }

      const audiencePayload: any = {
        name: newAudience.name,
        targeting
      };
      if (newAudience.description) {
        audiencePayload.description = newAudience.description;
      }
      await facebookAdsService.createSavedAudience(audiencePayload);

      toast.success('تم إنشاء الجمهور بنجاح! ✅');
      setShowCreateModal(false);
      setNewAudience({
        name: '',
        description: '',
        ageMin: 18,
        ageMax: 65,
        genders: [],
        countries: ['SA'],
        interests: ''
      });
      loadAudiences();
    } catch (error: any) {
      console.error('Error creating audience:', error);
      toast.error(error?.response?.data?.error || 'فشل في إنشاء الجمهور');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الجمهور؟')) return;

    try {
      await facebookAdsService.deleteSavedAudience(id);
      toast.success('تم حذف الجمهور');
      setAudiences(prev => prev.filter(a => a.id !== id));
    } catch (error: any) {
      console.error('Error deleting audience:', error);
      toast.error(error?.response?.data?.error || 'فشل في حذف الجمهور');
    }
  };

  const filteredAudiences = audiences.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleGender = (gender: number) => {
    setNewAudience(prev => ({
      ...prev,
      genders: prev.genders.includes(gender)
        ? prev.genders.filter(g => g !== gender)
        : [...prev.genders, gender]
    }));
  };

  const toggleCountry = (code: string) => {
    setNewAudience(prev => ({
      ...prev,
      countries: prev.countries.includes(code)
        ? prev.countries.filter(c => c !== code)
        : [...prev.countries, code]
    }));
  };

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/advertising/facebook-ads/audiences')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              الجماهير المحفوظة
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">إنشاء وإدارة الجماهير المستهدفة القابلة لإعادة الاستخدام</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 dark:bg-blue-500 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600"
        >
          <Plus className="w-5 h-5" />
          جمهور جديد
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="البحث في الجماهير..."
          className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
        />
      </div>

      {/* Audiences List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : filteredAudiences.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">لا توجد جماهير محفوظة</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">أنشئ جمهوراً جديداً لاستخدامه في حملاتك</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-white bg-blue-600 dark:bg-blue-500 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600"
          >
            إنشاء جمهور
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAudiences.map((audience) => (
            <div key={audience.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{audience.name}</h3>
                      {audience.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{audience.description}</p>
                      )}
                    </div>
                  </div>
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>

                {audience.approximateCount && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Users className="w-4 h-4" />
                    <span>~{audience.approximateCount.toLocaleString()} شخص</span>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(audience.createdAt).toLocaleDateString('ar-EG')}</span>
                </div>
              </div>

              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 flex gap-2">
                <button
                  onClick={() => setSelectedAudience(audience)}
                  className="flex-1 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg flex items-center justify-center gap-1"
                >
                  <Eye className="w-4 h-4" />
                  عرض
                </button>
                <button
                  onClick={() => handleDelete(audience.id)}
                  className="flex-1 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto border-0 dark:border dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-600">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">إنشاء جمهور جديد</h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم الجمهور *</label>
                <input
                  type="text"
                  value={newAudience.name}
                  onChange={(e) => setNewAudience(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="مثال: عملاء السعودية 25-45"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوصف</label>
                <textarea
                  value={newAudience.description}
                  onChange={(e) => setNewAudience(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="وصف اختياري للجمهور"
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الفئة العمرية</label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 dark:text-gray-400">من</label>
                    <input
                      type="number"
                      value={newAudience.ageMin}
                      onChange={(e) => setNewAudience(prev => ({ ...prev, ageMin: Number(e.target.value) }))}
                      min={13}
                      max={65}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500">إلى</label>
                    <input
                      type="number"
                      value={newAudience.ageMax}
                      onChange={(e) => setNewAudience(prev => ({ ...prev, ageMax: Number(e.target.value) }))}
                      min={13}
                      max={65}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الجنس</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => toggleGender(1)}
                    className={`flex-1 p-2 rounded-lg border-2 transition-all ${
                      newAudience.genders.includes(1)
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200'
                    }`}
                  >
                    ذكور
                  </button>
                  <button
                    onClick={() => toggleGender(2)}
                    className={`flex-1 p-2 rounded-lg border-2 transition-all ${
                      newAudience.genders.includes(2)
                        ? 'border-pink-500 bg-pink-50 text-pink-700'
                        : 'border-gray-200'
                    }`}
                  >
                    إناث
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">اترك فارغاً لاستهداف الجميع</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الدول</label>
                <div className="flex flex-wrap gap-2">
                  {countries.map((country) => (
                    <button
                      key={country.code}
                      onClick={() => toggleCountry(country.code)}
                      className={`px-3 py-1.5 rounded-lg border-2 text-sm transition-all ${
                        newAudience.countries.includes(country.code)
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200'
                      }`}
                    >
                      {country.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاهتمامات</label>
                <input
                  type="text"
                  value={newAudience.interests}
                  onChange={(e) => setNewAudience(prev => ({ ...prev, interests: e.target.value }))}
                  placeholder="مثال: تسوق, موضة, تقنية (افصل بفاصلة)"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
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
                onClick={handleCreate}
                disabled={creating}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري الإنشاء...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    إنشاء الجمهور
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Audience Modal */}
      {selectedAudience && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{selectedAudience.name}</h2>
              <button
                onClick={() => setSelectedAudience(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              {selectedAudience.description && (
                <p className="text-gray-600 mb-4">{selectedAudience.description}</p>
              )}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">إعدادات الاستهداف</h3>
                <pre className="text-xs text-gray-600 overflow-auto max-h-60">
                  {JSON.stringify(selectedAudience.targeting, null, 2)}
                </pre>
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50">
              <button
                onClick={() => setSelectedAudience(null)}
                className="w-full py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedAudiences;
