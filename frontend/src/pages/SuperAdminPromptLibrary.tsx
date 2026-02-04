import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
  StarIcon,
  EyeIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { buildApiUrl } from '../utils/urlHelper';

interface PromptLibraryItem {
  id: string;
  name: string;
  nameAr?: string;
  description: string;
  category: string;
  promptContent: string;
  icon?: string;
  isActive: boolean;
  isFeatured: boolean;
  usageCount: number;
}

const SuperAdminPromptLibrary: React.FC = () => {
  const [prompts, setPrompts] = useState<PromptLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptLibraryItem | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    promptContent: ''
  });

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl('prompt-library/admin/all'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setPrompts(data.data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingPrompt
        ? buildApiUrl(`prompt-library/admin/${editingPrompt.id}`)
        : buildApiUrl('prompt-library/admin/create');

      const method = editingPrompt ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        setShowModal(false);
        setEditingPrompt(null);
        setFormData({ name: '', promptContent: '' });
        fetchPrompts();
        alert('تم الحفظ بنجاح! ✅');
      } else {
        alert('خطأ: ' + (data.error || 'فشل الحفظ'));
      }
    } catch (error) {
      console.error('Error:', error);
      alert('خطأ في الاتصال بالسيرفر');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا البرومبت؟')) return;

    try {
      const response = await fetch(buildApiUrl(`prompt-library/admin/${id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        fetchPrompts();
        alert('تم الحذف بنجاح! 🗑️');
      } else {
        alert('خطأ: ' + (data.error || 'فشل الحذف'));
      }
    } catch (error) {
      console.error('Error:', error);
      alert('خطأ في الاتصال بالسيرفر');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <SparklesIcon className="h-8 w-8 text-purple-600 ml-3" />
          مكتبة البرومبتات الجاهزة
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex gap-4 items-center justify-between">
          <input
            type="text"
            placeholder="بحث..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg"
          />
          <button
            onClick={() => {
              setEditingPrompt(null);
              setFormData({ name: '', promptContent: '' });
              setShowModal(true);
            }}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 flex items-center"
          >
            <PlusIcon className="h-5 w-5 ml-2" />
            إضافة برومبت
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      ) : prompts.filter(p => 
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.promptContent.toLowerCase().includes(searchTerm.toLowerCase())
        ).length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <SparklesIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">لا توجد برومبتات</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {prompts
            .filter(p => 
              p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.promptContent.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map(prompt => (
          <div key={prompt.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <span className="text-4xl ml-3">{prompt.icon || '🤖'}</span>
                <div>
                  <h3 className="font-bold">{prompt.nameAr || prompt.name}</h3>
                  <p className="text-sm text-gray-500">{prompt.category}</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">{prompt.description}</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingPrompt(prompt);
                  setFormData({
                    name: prompt.name,
                    promptContent: prompt.promptContent
                  });
                  setShowModal(true);
                }}
                className="flex-1 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200"
              >
                <PencilIcon className="h-4 w-4 inline ml-1" />
                تعديل
              </button>
              <button
                onClick={() => handleDelete(prompt.id)}
                className="flex-1 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200"
              >
                <TrashIcon className="h-4 w-4 inline ml-1" />
                حذف
              </button>
            </div>
          </div>
        ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-6">
              {editingPrompt ? 'تعديل البرومبت' : 'إضافة برومبت جديد'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                required
                placeholder="الاسم"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />

              <textarea
                required
                rows={6}
                placeholder="محتوى البرومبت"
                value={formData.promptContent}
                onChange={(e) => setFormData({ ...formData, promptContent: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg"
                >
                  {editingPrompt ? 'تحديث' : 'إضافة'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingPrompt(null);
                    setFormData({ name: '', promptContent: '' });
                  }}
                  className="flex-1 bg-gray-200 px-6 py-3 rounded-lg"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminPromptLibrary;
