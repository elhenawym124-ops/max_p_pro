import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../../utils/urlHelper';
import {
  DocumentDuplicateIcon,
  PlusIcon,
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  ClipboardDocumentIcon,
  TagIcon,
  ClockIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';

interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  taskTitle: string;
  taskDescription: string;
  priority: string;
  type: string;
  estimatedHours: number;
  tags: string[];
  projectId: string | null;
  projectName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  createdAt: string;
  usageCount: number;
}

interface Project {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

const TaskTemplates: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    taskTitle: '',
    taskDescription: '',
    priority: 'medium',
    type: 'general',
    estimatedHours: 0,
    tags: [] as string[],
    projectId: '',
    categoryId: '',
  });

  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    fetchTemplates();
    fetchProjects();
    fetchCategories();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl('tasks/templates'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setTemplates(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl('projects'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setProjects(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl('tasks/categories/list'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setCategories(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const createTemplate = async () => {
    if (!newTemplate.name.trim() || !newTemplate.taskTitle.trim()) {
      alert('اسم القالب وعنوان المهمة مطلوبان');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl('tasks/templates'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newTemplate)
      });

      const data = await response.json();
      if (data.success) {
        fetchTemplates();
        setShowCreateModal(false);
        resetForm();
        alert('تم إنشاء القالب بنجاح');
      } else {
        alert(data.error || 'فشل في إنشاء القالب');
      }
    } catch (error) {
      console.error('Error creating template:', error);
      alert('فشل في إنشاء القالب');
    }
  };

  const updateTemplate = async () => {
    if (!editingTemplate) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`tasks/templates/${editingTemplate.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editingTemplate)
      });

      const data = await response.json();
      if (data.success) {
        fetchTemplates();
        setShowEditModal(false);
        setEditingTemplate(null);
        alert('تم تحديث القالب بنجاح');
      } else {
        alert(data.error || 'فشل في تحديث القالب');
      }
    } catch (error) {
      console.error('Error updating template:', error);
      alert('فشل في تحديث القالب');
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا القالب؟')) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`tasks/templates/${templateId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        fetchTemplates();
        alert('تم حذف القالب بنجاح');
      } else {
        alert(data.error || 'فشل في حذف القالب');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('فشل في حذف القالب');
    }
  };

  const useTemplate = async (template: TaskTemplate) => {
    // Navigate to tasks page with template data pre-filled
    navigate('/tasks', {
      state: {
        openCreateModal: true,
        templateData: {
          title: template.taskTitle,
          description: template.taskDescription,
          priority: template.priority,
          type: template.type,
          estimatedHours: template.estimatedHours,
          tags: template.tags,
          projectId: template.projectId,
          categoryId: template.categoryId,
        }
      }
    });
  };

  const resetForm = () => {
    setNewTemplate({
      name: '',
      description: '',
      taskTitle: '',
      taskDescription: '',
      priority: 'medium',
      type: 'general',
      estimatedHours: 0,
      tags: [],
      projectId: '',
      categoryId: '',
    });
    setTagInput('');
  };

  const addTag = (tagsArray: string[], setTags: (tags: string[]) => void) => {
    if (tagInput.trim() && !tagsArray.includes(tagInput.trim())) {
      setTags([...tagsArray, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string, tagsArray: string[], setTags: (tags: string[]) => void) => {
    setTags(tagsArray.filter(t => t !== tag));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300';
      case 'high': return 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300';
      case 'medium': return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300';
      case 'low': return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'عاجل';
      case 'high': return 'عالي';
      case 'medium': return 'متوسط';
      case 'low': return 'منخفض';
      default: return priority;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 bg-white dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 space-x-reverse">
            <Link
              to="/tasks"
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 dark:text-gray-100"
            >
              <ArrowLeftIcon className="h-5 w-5 ml-2" />
              العودة
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
              <DocumentDuplicateIcon className="h-7 w-7 text-indigo-600 ml-2" />
              قوالب المهام
            </h1>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
          >
            <PlusIcon className="h-5 w-5 ml-2" />
            قالب جديد
          </button>
        </div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">أنشئ قوالب للمهام المتكررة لتوفير الوقت</p>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <DocumentDuplicateIcon className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">لا توجد قوالب بعد</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            <PlusIcon className="h-5 w-5 ml-2" />
            إنشاء أول قالب
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(template => (
            <div
              key={template.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{template.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{template.description}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(template.priority)}`}>
                    {getPriorityText(template.priority)}
                  </span>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">عنوان المهمة:</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{template.taskTitle}</p>
                  {template.taskDescription && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{template.taskDescription}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {template.estimatedHours > 0 && (
                    <span className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <ClockIcon className="h-3 w-3 ml-1" />
                      {template.estimatedHours} ساعة
                    </span>
                  )}
                  {template.projectName && (
                    <span className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <FolderIcon className="h-3 w-3 ml-1" />
                      {template.projectName}
                    </span>
                  )}
                  {template.categoryName && (
                    <span className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <TagIcon className="h-3 w-3 ml-1" />
                      {template.categoryName}
                    </span>
                  )}
                </div>

                {template.tags && Array.isArray(template.tags) && template.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {template.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    استُخدم {template.usageCount || 0} مرة
                  </span>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <button
                      onClick={() => useTemplate(template)}
                    className="inline-flex items-center px-3 py-1.5 text-sm bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4 ml-1" />
                    استخدام
                  </button>
                    <button
                      onClick={() => {
                        setEditingTemplate(template);
                        setShowEditModal(true);
                      }}
                      className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteTemplate(template.id)}
                      className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-black dark:bg-opacity-70 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border border-gray-200 dark:border-gray-700 w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">إنشاء قالب جديد</h3>
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 dark:text-gray-400"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم القالب *</label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    placeholder="مثال: مهمة مراجعة أسبوعية"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">وصف القالب</label>
                  <input
                    type="text"
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                    placeholder="وصف مختصر للقالب"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>

                <div className="col-span-2 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">تفاصيل المهمة</h4>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">عنوان المهمة *</label>
                  <input
                    type="text"
                    value={newTemplate.taskTitle}
                    onChange={(e) => setNewTemplate({ ...newTemplate, taskTitle: e.target.value })}
                    placeholder="عنوان المهمة التي ستُنشأ"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">وصف المهمة</label>
                  <textarea
                    value={newTemplate.taskDescription}
                    onChange={(e) => setNewTemplate({ ...newTemplate, taskDescription: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الأولوية</label>
                  <select
                    value={newTemplate.priority}
                    onChange={(e) => setNewTemplate({ ...newTemplate, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="low" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">منخفض</option>
                    <option value="medium" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">متوسط</option>
                    <option value="high" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">عالي</option>
                    <option value="urgent" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">عاجل</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الساعات المقدرة</label>
                  <input
                    type="number"
                    min="0"
                    value={newTemplate.estimatedHours}
                    onChange={(e) => setNewTemplate({ ...newTemplate, estimatedHours: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المشروع</label>
                  <select
                    value={newTemplate.projectId}
                    onChange={(e) => setNewTemplate({ ...newTemplate, projectId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">بدون مشروع</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">{project.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">القسم</label>
                  <select
                    value={newTemplate.categoryId}
                    onChange={(e) => setNewTemplate({ ...newTemplate, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">بدون قسم</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">{category.name}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوسوم</label>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag(newTemplate.tags, (tags) => setNewTemplate({ ...newTemplate, tags })))}
                      placeholder="أضف وسم واضغط Enter"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                    <button
                      type="button"
                      onClick={() => addTag(newTemplate.tags, (tags) => setNewTemplate({ ...newTemplate, tags }))}
                      className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      إضافة
                    </button>
                  </div>
                  {newTemplate.tags && Array.isArray(newTemplate.tags) && newTemplate.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {newTemplate.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded text-sm"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag, newTemplate.tags, (tags) => setNewTemplate({ ...newTemplate, tags }))}
                            className="mr-1 text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-200"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-2 space-x-reverse">
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={createTemplate}
                className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
              >
                إنشاء القالب
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Template Modal */}
      {showEditModal && editingTemplate && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-black dark:bg-opacity-70 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border border-gray-200 dark:border-gray-700 w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">تعديل القالب</h3>
              <button
                onClick={() => { setShowEditModal(false); setEditingTemplate(null); }}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 dark:text-gray-400"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم القالب *</label>
                  <input
                    type="text"
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">وصف القالب</label>
                  <input
                    type="text"
                    value={editingTemplate.description}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">عنوان المهمة *</label>
                  <input
                    type="text"
                    value={editingTemplate.taskTitle}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, taskTitle: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">وصف المهمة</label>
                  <textarea
                    value={editingTemplate.taskDescription}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, taskDescription: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 resize-none placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الأولوية</label>
                  <select
                    value={editingTemplate.priority}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="low" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">منخفض</option>
                    <option value="medium" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">متوسط</option>
                    <option value="high" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">عالي</option>
                    <option value="urgent" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">عاجل</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الساعات المقدرة</label>
                  <input
                    type="number"
                    min="0"
                    value={editingTemplate.estimatedHours}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, estimatedHours: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-2 space-x-reverse">
              <button
                onClick={() => { setShowEditModal(false); setEditingTemplate(null); }}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={updateTemplate}
                className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
              >
                حفظ التغييرات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskTemplates;

