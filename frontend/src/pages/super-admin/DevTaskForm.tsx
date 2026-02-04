import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { buildApiUrl } from '../../utils/urlHelper';
import {
  ArrowRightIcon,
  LightBulbIcon,
  CheckBadgeIcon,
  SparklesIcon,
  XMarkIcon,
  PencilIcon,
  PhotoIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface Project {
  id: string;
  name: string;
  color: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

interface Release {
  id: string;
  version: string;
  name: string;
}

import {
  TYPE_OPTIONS,
  STATUS_OPTIONS,
  PRIORITY_OPTIONS
} from '../../constants/taskConstants';

// Default component options
const componentOptions = [
  { value: 'frontend', label: 'Frontend' },
  { value: 'backend', label: 'Backend' },
  { value: 'database', label: 'Database' },
  { value: 'api', label: 'API' },
  { value: 'ui', label: 'UI/UX' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'devops', label: 'DevOps' },
  { value: 'testing', label: 'Testing' },
  { value: 'documentation', label: 'Documentation' },
  { value: 'general', label: 'General' }
];

const DevTaskForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    businessValue: '',
    acceptanceCriteria: '',
    type: 'FEATURE',
    priority: 'MEDIUM',
    status: 'BACKLOG',
    component: '',
    assigneeId: '',
    projectId: '',
    releaseId: '',
    dueDate: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      return d.toISOString().split('T')[0];
    })(),
    startDate: new Date().toISOString().split('T')[0], // Default to today
    estimatedHours: '1',
    tags: '',
    gitBranch: '',
    companyId: '',
    ticketId: '',
    campaignId: '',
    targetAudience: '',
    budgetAllocation: '',
    expectedROI: '',
    relatedLinks: [] as { title: string; url: string }[]
  });

  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const checklistInputRef = React.useRef<HTMLInputElement>(null);

  // AI Assistant State
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiMode, setAiMode] = useState<'description' | 'error'>('description');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  // New Features State
  const [settings, setSettings] = useState<any>(null);
  const [watchers, setWatchers] = useState<string[]>([]);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');


  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;

    try {
      setAiGenerating(true);
      setError(null);
      const token = localStorage.getItem('accessToken');

      const endpoint = aiMode === 'description'
        ? 'super-admin/dev-tasks/ai-create'
        : 'super-admin/dev-tasks/ai-analyze';

      const body = aiMode === 'description'
        ? { description: aiPrompt }
        : { errorLog: aiPrompt };

      const response = await fetch(buildApiUrl(endpoint), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.success) {
        setFormData(prev => ({
          ...prev,
          title: data.data.title || prev.title,
          description: data.data.description || prev.description,
          type: data.data.type || prev.type,
          priority: data.data.priority || prev.priority,
          estimatedHours: data.data.estimatedHours?.toString() || prev.estimatedHours,
          tags: data.data.tags ? data.data.tags.join(', ') : prev.tags,
          // Only update status if it's new
          status: 'TODO'
        }));
        setAiModalOpen(false);
        if (data.data.checklist && Array.isArray(data.data.checklist)) {
          setChecklistItems(data.data.checklist);
        }
      } else {
        setError(data.message || 'فشل في توليد المهمة');
      }
    } catch (err) {
      console.error('AI Generation Error:', err);
      setError('فشل في الاتصال بخدمة الذكاء الاصطناعي');
    } finally {
      setAiGenerating(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
    fetchSettings();

    // Set initial status from query params
    const status = searchParams.get('status');
    if (status) {
      setFormData(prev => ({ ...prev, status }));
    }
  }, []);

  // Merge default components with settings-defined ones
  const derivedComponentOptions = React.useMemo(() => {
    const defaultValues = new Set(componentOptions.map(o => o.value));
    const customOptions = settings?.componentMappings ? Object.keys(settings.componentMappings).filter(k => !defaultValues.has(k)).map(k => ({ value: k, label: k })) : [];
    return [...componentOptions, ...customOptions];
  }, [settings]);

  // Auto-Assignment Logic
  useEffect(() => {
    if (settings && settings.componentMappings && formData.component) {
      // Case-insensitive lookup
      const componentKey = Object.keys(settings.componentMappings).find(
        k => k.toLowerCase() === formData.component.toLowerCase()
      );

      const autoAssignee = componentKey ? settings.componentMappings[componentKey] : null;

      if (autoAssignee && !formData.assigneeId) { // Only auto-assign if empty
        // Verify member exists
        const memberExists = teamMembers.find(m => m.id === autoAssignee);
        if (memberExists) {
          setFormData(prev => ({ ...prev, assigneeId: autoAssignee }));
        }
      }
    }
  }, [formData.component, settings, teamMembers]);

  useEffect(() => {
    if (isEdit) {
      fetchTask();
    }
  }, [id]);

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const [projectsRes, teamRes, releasesRes] = await Promise.all([
        fetch(buildApiUrl('super-admin/dev/projects'), { headers }),
        fetch(buildApiUrl('super-admin/dev/team'), { headers }),
        fetch(buildApiUrl('super-admin/dev/releases'), { headers })
      ]);

      const [projectsData, teamData, releasesData] = await Promise.all([
        projectsRes.json(),
        teamRes.json(),
        releasesRes.json()
      ]);

      if (projectsData.success) setProjects(projectsData.data);
      if (teamData.success) setTeamMembers(teamData.data);
      if (releasesData.success) setReleases(releasesData.data);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(buildApiUrl('super-admin/dev/settings'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setSettings(data.data);
    } catch (e) {
      console.error('Failed to fetch settings', e);
    }
  };

  const fetchTask = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`super-admin/dev/tasks/${id}`), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        const task = data.data;
        // Normalize component value to lowercase to match componentOptions
        const normalizedComponent = task.component ? task.component.toLowerCase() : '';
        setFormData({
          title: task.title || '',
          description: task.description || '',
          businessValue: task.businessValue || '',
          acceptanceCriteria: task.acceptanceCriteria || '',
          type: task.type || 'FEATURE',
          priority: task.priority || 'MEDIUM',
          status: task.status || 'BACKLOG',
          component: normalizedComponent,
          assigneeId: task.assigneeId || '',
          projectId: task.projectId || '',
          releaseId: task.releaseId || '',
          dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
          startDate: task.startDate ? task.startDate.split('T')[0] : '',
          estimatedHours: task.estimatedHours?.toString() || '',
          tags: task.tags?.join(', ') || '',
          gitBranch: task.gitBranch || '',
          companyId: task.companyId || '',
          ticketId: task.ticketId || '',
          campaignId: task.campaignId || '',
          targetAudience: task.targetAudience || '',
          budgetAllocation: task.budgetAllocation?.toString() || '',
          expectedROI: task.expectedROI?.toString() || ''
        });

        // Set Watchers
        if (task.watchers && Array.isArray(task.watchers)) {
          // Check if watchers is array of objects { memberId } or just IDs. 
          // Based on Prisma relation, it returns DevTaskWatcher objects which have memberId.
          // But API might return simplified list if I updated controller.
          // Let's assume standard include: { watchers: { memberId: '...' }[] }
          const watcherIds = task.watchers.map((w: any) => w.memberId || w);
          setWatchers(watcherIds);
        }

        // Set Related Links
        if (task.relatedLinks) {
          setFormData(prev => ({
            ...prev,
            relatedLinks: Array.isArray(task.relatedLinks) ? task.relatedLinks : []
          }));
        }
      } else {
        setError(data.error || 'فشل في جلب المهمة');
      }
    } catch (err) {
      setError('فشل في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('العنوان مطلوب');
      return;
    }
    if (!formData.description.trim()) {
      setError('الوصف مطلوب');
      return;
    }
    if (!formData.assigneeId) {
      setError('المسؤول مطلوب');
      return;
    }
    if (!formData.dueDate) {
      setError('تاريخ الاستحقاق مطلوب');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const token = localStorage.getItem('accessToken');

      const payload = {
        ...formData,
        estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : 0,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        assigneeId: formData.assigneeId || null,
        projectId: formData.projectId || null,
        releaseId: formData.releaseId || null,
        dueDate: formData.dueDate || null,
        startDate: formData.startDate || null,
        component: formData.component || null,
        gitBranch: formData.gitBranch || null,
        companyId: formData.companyId || null,
        ticketId: formData.ticketId || null,
        campaignId: formData.campaignId || null,
        targetAudience: formData.targetAudience || null,
        budgetAllocation: formData.budgetAllocation ? parseFloat(formData.budgetAllocation) : null,
        expectedROI: formData.expectedROI ? parseFloat(formData.expectedROI) : null,
        checklistItems: checklistItems.length > 0 ? checklistItems : undefined,
        watchers: watchers,
        relatedLinks: formData.relatedLinks
      };

      const url = isEdit
        ? buildApiUrl(`super-admin/dev/tasks/${id}`)
        : buildApiUrl('super-admin/dev/tasks');

      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (data.success) {
        const taskId = data.data.id;

        // Upload images if selected
        if (selectedImages.length > 0 && taskId) {
          const formData = new FormData();
          selectedImages.forEach(image => {
            formData.append('files', image);
          });

          await fetch(buildApiUrl(`super-admin/dev/tasks/${taskId}/attachments`), {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`
            },
            body: formData
          });
        }

        navigate('/super-admin/dev-tasks');
      } else {
        setError(data.error || 'فشل في حفظ المهمة');
      }
    } catch (err) {
      setError('فشل في الاتصال بالخادم');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const validFiles: File[] = [];

    // Validate each file
    for (const file of fileArray) {
      if (file.size > 20 * 1024 * 1024) {
        setError(`حجم الملف ${file.name} يجب أن يكون أقل من 20 ميجابايت`);
        continue;
      }
      if (!file.type.startsWith('image/')) {
        setError(`الملف ${file.name} يجب أن يكون صورة`);
        continue;
      }
      validFiles.push(file);
    }

    // Check total count
    if (selectedImages.length + validFiles.length > 10) {
      setError('الحد الأقصى 10 صور');
      return;
    }

    // Create previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    setSelectedImages(prev => [...prev, ...validFiles]);
    setError(null);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  const renderMainForm = () => (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-center gap-2">
          <XMarkIcon className="h-5 w-5 text-red-500" />
          <p className="text-red-700 dark:text-red-400 font-medium">{error}</p>
        </div>
      )}
      {/* Basic Info Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-indigo-500" />
          تفاصيل المهمة
        </h3>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              العنوان <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="مثال: إضافة خاصية الدفع الإلكتروني..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-lg font-medium transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              الوصف <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="وصف تفصيلي للمهمة..."
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <PhotoIcon className="h-5 w-5 inline-block ml-2" />
              إضافة صور ({selectedImages.length}/10)
            </label>
            <div className="space-y-3">
              {/* Image Previews Grid */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border-2 border-gray-300 dark:border-gray-600"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 left-1 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                      <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                        {selectedImages[index] ? (selectedImages[index].size / 1024 / 1024).toFixed(1) : '0'}MB
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Area */}
              {selectedImages.length < 10 && (
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-indigo-300 dark:border-indigo-600 rounded-xl cursor-pointer bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-900/30 dark:hover:to-purple-900/30 transition-all">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <PhotoIcon className="h-10 w-10 text-indigo-600 dark:text-indigo-400 mb-2" />
                    <p className="mb-1 text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-bold">📎 اضغط لرفع صور متعددة</span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">يمكنك اختيار حتى 10 صور (20MB لكل صورة)</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Business & Acceptance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/20 p-6">
          <label className="block text-base font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <LightBulbIcon className="h-5 w-5 text-yellow-500" />
            القيمة التجارية (Business Value)
          </label>
          <textarea
            value={formData.businessValue}
            onChange={(e) => handleChange('businessValue', e.target.value)}
            placeholder="لماذا نقوم بهذا العمل؟ ما الفائدة المتوقعة؟"
            rows={5}
            className="w-full px-4 py-3 border border-blue-200 dark:border-blue-800/50 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-all"
          />
        </div>

        <div className="bg-green-50/50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/20 p-6">
          <label className="block text-base font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <CheckBadgeIcon className="h-5 w-5 text-green-500" />
            معايير القبول (Acceptance Criteria)
          </label>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 rounded-lg p-3 mb-3">
            <p className="text-xs text-yellow-800 dark:text-yellow-300">
              💡 <strong>نصيحة:</strong> اكتب كل معيار في سطر منفصل، سيتم عرضها كقائمة تحقق تلقائياً
            </p>
          </div>
          <textarea
            value={formData.acceptanceCriteria}
            onChange={(e) => handleChange('acceptanceCriteria', e.target.value)}
            placeholder="- يجب أن يعمل X عند الضغط على Y&#10;- يجب أن تظهر رسالة نجاح&#10;- يجب حفظ البيانات في قاعدة البيانات"
            rows={5}
            className="w-full px-4 py-3 border border-green-200 dark:border-green-800/50 rounded-xl focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-all"
          />
        </div>
      </div>

      {/* Checklists */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <CheckBadgeIcon className="h-5 w-5 text-indigo-500" />
          قوائم التحقق المبدئية
        </h3>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              ref={checklistInputRef}
              type="text"
              placeholder="أضف عنصر للقائمة..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const val = e.currentTarget.value.trim();
                  if (val) {
                    setChecklistItems([...checklistItems, val]);
                    e.currentTarget.value = '';
                  }
                }
              }}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
            <button
              type="button"
              onClick={() => {
                const val = checklistInputRef.current?.value.trim();
                if (val) {
                  setChecklistItems([...checklistItems, val]);
                  if (checklistInputRef.current) {
                    checklistInputRef.current.value = '';
                  }
                }
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg text-white font-medium transition-colors"
            >
              إضافة
            </button>
          </div>
          <ul className="space-y-2">
            {checklistItems.map((item, idx) => (
              <li key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg group">
                <div className="flex items-center gap-3 flex-1">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">{item}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setChecklistItems(checklistItems.filter((_, i) => i !== idx))}
                  className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Related Links */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm mt-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <ArrowRightIcon className="h-5 w-5 text-indigo-500 rotate-45" />
          الروابط المرتبطة (Related Links)
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="عنوان الرابط (مثال: صفحة المشكلة)"
              value={newLinkTitle}
              onChange={(e) => setNewLinkTitle(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="الرابط (URL)"
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
              <button
                type="button"
                onClick={() => {
                  if (newLinkTitle.trim() && newLinkUrl.trim()) {
                    setFormData(prev => ({
                      ...prev,
                      relatedLinks: [...prev.relatedLinks, { title: newLinkTitle.trim(), url: newLinkUrl.trim() }]
                    }));
                    setNewLinkTitle('');
                    setNewLinkUrl('');
                  }
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg text-white font-medium transition-colors"
              >
                إضافة
              </button>
            </div>
          </div>

          <ul className="space-y-2">
            {formData.relatedLinks.map((link, idx) => (
              <li key={idx} className="flex items-center justify-between p-3 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-lg border border-indigo-100 dark:border-indigo-900/20 group">
                <div className="flex items-center gap-3 overflow-hidden">
                  <ArrowRightIcon className="h-4 w-4 text-indigo-500 flex-shrink-0 rotate-45" />
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-gray-900 dark:text-gray-100 text-sm truncate">{link.title}</span>
                    <span className="text-gray-500 dark:text-gray-400 text-xs truncate dir-ltr text-right">{link.url}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    relatedLinks: prev.relatedLinks.filter((_, i) => i !== idx)
                  }))}
                  className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

    </div>
  );

  const renderSidebarForm = () => (
    <div className="space-y-6">
      {/* Primary Actions Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">الحالة</label>
          <select
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:border-indigo-500 dark:text-white font-medium"
          >
            {(settings?.taskStatuses || STATUS_OPTIONS).map((option: any) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">الأولوية</label>
          <div className="grid grid-cols-3 gap-2">
            {(settings?.taskPriorities || PRIORITY_OPTIONS).map((option: any) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleChange('priority', option.value)}
                className={`px-2 py-2 text-xs font-bold rounded-lg border transition-all ${formData.priority === option.value
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700'
                  }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">النوع</label>
          <select
            value={formData.type}
            onChange={(e) => handleChange('type', e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:border-indigo-500 dark:text-white"
          >
            {TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Assignment Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">التعيين</h4>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">المسؤول</label>
            <select
              value={formData.assigneeId}
              onChange={(e) => handleChange('assigneeId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="">اختر المسؤول...</option>
              {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">المراقبون</label>
            <select
              multiple
              value={watchers}
              onChange={(e) => setWatchers(Array.from(e.target.selectedOptions, o => o.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white h-24 text-sm"
            >
              {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Context Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">السياق</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">المشروع</label>
            <select
              value={formData.projectId}
              onChange={(e) => handleChange('projectId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="">بدون ملف مشروع</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">الإصدار (Release)</label>
            <select
              value={formData.releaseId}
              onChange={(e) => handleChange('releaseId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="">بدون إصدار</option>
              {releases.map(r => <option key={r.id} value={r.id}>{r.name} (v{r.version})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Component</label>
            <select
              value={formData.component}
              onChange={(e) => handleChange('component', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="">General</option>
              {derivedComponentOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Dates & Time Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">التوقيت</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">تاريخ البدء</label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              تاريخ الاستحقاق <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => handleChange('dueDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">ساعات تقديرية</label>
            <input
              type="number"
              placeholder="0.0"
              step="0.5"
              value={formData.estimatedHours}
              onChange={(e) => handleChange('estimatedHours', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Tags Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">الوسوم (مفصول بفاصلة)</label>
        <input
          type="text"
          value={formData.tags}
          onChange={(e) => handleChange('tags', e.target.value)}
          placeholder="react, api, ui..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
        />
      </div>

    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto p-6" dir="rtl">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            <ArrowRightIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              {isEdit ? <PencilIcon className="h-8 w-8 text-indigo-500" /> : <SparklesIcon className="h-8 w-8 text-indigo-500" />}
              {isEdit ? 'تعديل المهمة' : 'إنشاء مهمة جديدة'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {isEdit ? `تحديث بيانات المهمة #${id?.slice(0, 8)}` : 'أضف مهمة جديدة إلى خطة التطوير'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setAiModalOpen(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 transition-all flex items-center gap-2"
          >
            <SparklesIcon className="w-5 h-5" />
            مساعد AI
          </button>
        </div>
      </div>

      {/* AI Modal (Preserved) */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transform transition-all">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <SparklesIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">مساعد المهام الذكي</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">سأقوم بملء التفاصيل نيابة عنك</p>
                </div>
              </div>
              <button onClick={() => setAiModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex bg-gray-100 dark:bg-gray-700/50 rounded-lg p-1 mb-6">
                <button
                  onClick={() => setAiMode('description')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${aiMode === 'description'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                    }`}
                >
                  📝 وصف الفكرة
                </button>
                <button
                  onClick={() => setAiMode('error')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${aiMode === 'error'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                    }`}
                >
                  🐛 تحليل خطأ (Log)
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {aiMode === 'description' ? 'اوصف المهمة التي تريد إنشاءها:' : 'الصق سجل الخطأ (Error Log) هنا:'}
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={aiMode === 'description'
                    ? 'مثال: أريد إضافة زر لتصدير التقارير بصيغة PDF في صفحة المبيعات...'
                    : 'TypeError: Cannot read property of undefined...'}
                  className="w-full h-40 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100 resize-none font-mono text-sm"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setAiModalOpen(false)}
                  className="px-5 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleAiGenerate}
                  disabled={aiGenerating || !aiPrompt.trim()}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-medium shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {aiGenerating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      جاري التحليل...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="w-5 h-5" />
                      توليد المهمة
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8">
        <div className="grid grid-cols-12 gap-8">
          {/* Main Content (8 cols) */}
          <div className="col-span-12 lg:col-span-8">
            {renderMainForm()}

            {/* Form Actions */}
            <div className="mt-8 flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 font-medium transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-bold shadow-lg shadow-indigo-500/20"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                    جاري الحفظ...
                  </>
                ) : (
                  isEdit ? 'حفظ التعديلات' : 'إنشاء المهمة'
                )}
              </button>
            </div>
          </div>

          {/* Sidebar (4 cols) */}
          <div className="col-span-12 lg:col-span-4">
            {renderSidebarForm()}
          </div>
        </div>
      </form>
    </div>
  );
};

export default DevTaskForm;



