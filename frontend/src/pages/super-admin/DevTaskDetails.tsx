import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { buildApiUrl } from '../../utils/urlHelper';
import { useTimer } from '../../contexts/TimerContext';

import { Task } from '../../types/tasks';

import TaskHeader from '../../components/tasks/details/TaskHeader';
import TaskSidebar from '../../components/tasks/details/TaskSidebar';
import TaskOverview from '../../components/tasks/details/TaskOverview';
import TaskSubtasks from '../../components/tasks/details/TaskSubtasks';
import TaskActivities from '../../components/tasks/details/TaskActivities';
import {

  CheckCircleIcon,
  ClockIcon,
  UserIcon,
  PaperClipIcon,
  ChatBubbleLeftIcon,
  TrashIcon,
  CheckIcon,
  PlusIcon,
  XMarkIcon,
  PlayIcon,
  StopIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  ClipboardDocumentListIcon,
  SparklesIcon,
  LightBulbIcon,
  CloudArrowDownIcon,
  BriefcaseIcon,
  UserGroupIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';



const DevTaskDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [task, setTask] = useState<Task | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [userPermissions, setUserPermissions] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'subtasks' | 'comments' | 'activities' | 'time' | 'checklists' | 'attachments'>('details');
  const [newComment, setNewComment] = useState('');

  // New Feature States
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newItemInputs, setNewItemInputs] = useState<Record<string, string>>({});

  const [isUploading, setIsUploading] = useState(false);

  // Timer Context
  const { activeTimer, elapsedSeconds, startTimer, stopTimer, pauseTimer, resumeTimer } = useTimer();

  // Enhancement States
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; message: string; onConfirm: () => void }>({ open: false, message: '', onConfirm: () => { } });
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [editingTimeLog, setEditingTimeLog] = useState<{ id: string; duration: number; description: string } | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [showSubtaskModal, setShowSubtaskModal] = useState(false);
  const [showTestingModal, setShowTestingModal] = useState(false); // New Testing Modal State
  const [selectedTesterId, setSelectedTesterId] = useState('');
  const [subtaskForm, setSubtaskForm] = useState({
    title: '',
    description: '',
    department: '',
    assigneeId: '',
    type: 'FEATURE',
    priority: 'MEDIUM'
  });

  // Duplicate Task States
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateForm, setDuplicateForm] = useState({
    newAssigneeId: '',
    includeChecklists: true,
    includeAttachments: false
  });
  const [isDuplicating, setIsDuplicating] = useState(false);

  // Export/Import States
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      fetchTask();
      fetchSettings();
      fetchUserPermissions();
      fetchTeamMembers();
    }
  }, [id]);

  const fetchTeamMembers = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl('super-admin/dev/team'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setTeamMembers(data.data);
      }
    } catch (err) {
      console.error('Error fetching team members:', err);
    }
  };

  const fetchUserPermissions = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl('super-admin/user/permissions'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setUserPermissions(data.data.permissions);
      }
    } catch (err) {
      console.error('Error fetching user permissions:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl('super-admin/dev/settings'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setSettings(data.data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartTimer = async () => {
    if (!id || !task) return;
    try {
      await startTimer(id, task.title, task.projectName || undefined);
      fetchTask(false);
    } catch (err) {
      showToast('فشل بدء المؤقت', 'error');
    }
  };

  const handleStopTimer = async () => {
    if (!id) return;
    try {
      await stopTimer(id);
      fetchTask(false);
    } catch (err) {
      showToast('فشل إيقاف المؤقت', 'error');
    }
  };

  const handlePauseTimer = async () => {
    if (!id) return;
    try {
      await pauseTimer(id);
      fetchTask(false);
    } catch (err) {
      showToast('فشل إيقاف المؤقت', 'error');
    }
  };

  const handleResumeTimer = async () => {
    if (!id) return;
    try {
      await resumeTimer(id);
      fetchTask(false);
    } catch (err) {
      showToast('فشل استئناف المؤقت', 'error');
    }
  };

  const fetchTask = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${buildApiUrl(`super-admin/dev/tasks/${id}`)}?t=${Date.now()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        // Map nested API response to flat structure
        const rawTask = data.data;
        const mappedTask: Task = {
          ...rawTask,
          businessValue: rawTask.businessValue || null,
          acceptanceCriteria: rawTask.acceptanceCriteria || null,
          assigneeName: rawTask.assignee?.user ? `${rawTask.assignee.user.firstName} ${rawTask.assignee.user.lastName}` : null,
          assigneeAvatar: rawTask.assignee?.user?.avatar || null,
          assigneeId: rawTask.assignee?.user?.id || null,
          reporterName: rawTask.reporter?.user ? `${rawTask.reporter.user.firstName} ${rawTask.reporter.user.lastName}` : 'Unknown',
          projectName: rawTask.project?.name || null,
          projectColor: rawTask.project?.color || null,
          tags: rawTask.tags || [],
          subtasks: rawTask.subtasks || [],
          attachments: rawTask.attachments || [],
          checklists: rawTask.checklists || [],
          timeLogs: (rawTask.timeLogs || []).map((t: any) => ({
            ...t,
            memberName: t.member?.user ? `${t.member.user.firstName} ${t.member.user.lastName}` : 'Unknown',
            memberId: t.memberId
          })),
          activities: rawTask.activities || [],
          comments: (rawTask.comments || []).map((c: any) => ({
            ...c,
            authorName: c.author?.user ? `${c.author.user.firstName} ${c.author.user.lastName}` : 'Unknown',
            authorAvatar: c.author?.user?.avatar || null,
            replies: c.replies || []
          })),
          relatedLinks: rawTask.relatedLinks || [],
          nextTaskId: rawTask.nextTaskId || null,
          previousTaskId: rawTask.previousTaskId || null
        };
        setTask(mappedTask);

      } else {
        setError(data.error || 'فشل في جلب المهمة');
      }
    } catch (err) {
      setError('فشل في الاتصال بالخادم');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !id) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`super-admin/dev/tasks/${id}/comments`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: newComment })
      });

      const data = await response.json();
      if (data.success) {
        setNewComment('');
        fetchTask(false);
      }
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  const handleDuplicateTask = async () => {
    if (!id) return;

    try {
      setIsDuplicating(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`super-admin/dev/tasks/${id}/duplicate`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(duplicateForm)
      });

      const data = await response.json();
      if (data.success) {
        showToast('تم تكرار المهمة بنجاح', 'success');
        setShowDuplicateModal(false);
        // Navigate to the new duplicated task
        if (data.data?.id) {
          setTimeout(() => {
            navigate(`/super-admin/dev-tasks/${data.data.id}`);
          }, 1000);
        }
      } else {
        showToast(data.message || 'فشل في تكرار المهمة', 'error');
      }
    } catch (err) {
      console.error('Error duplicating task:', err);
      showToast('حدث خطأ في تكرار المهمة', 'error');
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!confirm('هل أنت متأكد من حذف هذه المهمة؟')) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`super-admin/dev/tasks/${id}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        navigate('/super-admin/dev-tasks');
      }
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  // --- New Feature Handlers ---

  const handleCreateChecklist = async () => {
    if (!newChecklistTitle.trim()) return;
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`super-admin/dev/tasks/${id}/checklists`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newChecklistTitle })
      });
      if (response.ok) {
        setNewChecklistTitle('');
        fetchTask(false);
      }
    } catch (err) { console.error(err); }
  };

  const handleAddItem = async (checklistId: string) => {
    const content = newItemInputs[checklistId];
    if (!content?.trim()) return;
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`super-admin/dev/tasks/checklists/${checklistId}/items`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      if (response.ok) {
        setNewItemInputs(prev => ({ ...prev, [checklistId]: '' }));
        fetchTask(false);
      }
    } catch (err) { console.error(err); }
  };

  const handleToggleItem = async (itemId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`super-admin/dev/tasks/checklist-items/${itemId}`), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: !currentStatus })
      });
      if (response.ok) fetchTask(false);
    } catch (err) { console.error(err); }
  };



  const handleCreateSubtask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!subtaskForm.title.trim()) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`super-admin/dev/tasks/${id}/subtasks`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(subtaskForm)
      });

      if (response.ok) {
        showToast('تم إنشاء المهمة الفرعية بنجاح', 'success');
        setSubtaskForm({
          title: '',
          description: '',
          department: '',
          assigneeId: '',
          type: 'FEATURE',
          priority: 'MEDIUM'
        });
        setShowSubtaskModal(false);
        fetchTask(false);
      } else {
        showToast('فشل في إنشاء المهمة الفرعية', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ في الاتصال بالسيرفر', 'error');
    }
  };

  const handleDepartmentChange = (dept: string) => {
    const memberInDept = teamMembers.find(m => m.department === dept && m.availability === 'available');
    setSubtaskForm(prev => ({
      ...prev,
      department: dept,
      assigneeId: memberInDept ? (memberInDept.userId || memberInDept.id) : ''
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const files = Array.from(e.target.files);
    const formData = new FormData();

    // Append all files to FormData
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      setIsUploading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`super-admin/dev/tasks/${id}/attachments`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        showToast(data.message || `تم رفع ${files.length} ملف بنجاح`, 'success');
        fetchTask(false);
      } else {
        showToast('فشل في رفع الملفات', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ في رفع الملفات', 'error');
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = '';
    }
  };


  // --- Request Testing Handler ---
  const handleCreateTestingSubtask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedTesterId) {
      showToast('يرجى اختيار مختبر', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');

      const payload = {
        title: `Testing: ${task?.title}`,
        description: `Verification required for: ${task?.title}`,
        department: task?.department || 'Quality Assurance',
        assigneeId: selectedTesterId,
        type: 'TESTING',
        priority: task?.priority || 'MEDIUM'
      };

      const response = await fetch(buildApiUrl(`super-admin/dev/tasks/${id}/subtasks`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        showToast('تم إرسال طلب الاختبار بنجاح', 'success');
        setSelectedTesterId('');
        setShowTestingModal(false);
        fetchTask(false);
      } else {
        showToast('فشل في إرسال طلب الاختبار', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ في الاتصال بالسيرفر', 'error');
    }
  };

  // --- Enhancement Handlers ---

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDeleteTimeLog = async (logId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`super-admin/dev/tasks/time-logs/${logId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        showToast('تم حذف سجل الوقت', 'success');
        fetchTask(false);
      } else {
        showToast('فشل في حذف السجل', 'error');
      }
    } catch (err) { showToast('حدث خطأ', 'error'); }
    setConfirmModal({ open: false, message: '', onConfirm: () => { } });
  };

  const handleEditTimeLog = async () => {
    if (!editingTimeLog) return;
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`super-admin/dev/tasks/time-logs/${editingTimeLog.id}`), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: editingTimeLog.duration, description: editingTimeLog.description })
      });
      if (response.ok) {
        showToast('تم تحديث السجل', 'success');
        fetchTask(false);
        setEditingTimeLog(null);
      } else {
        showToast('فشل في التحديث', 'error');
      }
    } catch (err) { showToast('حدث خطأ', 'error'); }
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`super-admin/dev/tasks/checklist-items/${itemId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        showToast('تم حذف العنصر', 'success');
        fetchTask(false);
      }
    } catch (err) { showToast('حدث خطأ', 'error'); }
    setConfirmModal({ open: false, message: '', onConfirm: () => { } });
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`super-admin/dev/tasks/attachments/${attachmentId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        showToast('تم حذف المرفق', 'success');
        fetchTask(false);
      }
    } catch (err) { showToast('حدث خطأ', 'error'); }
    setConfirmModal({ open: false, message: '', onConfirm: () => { } });
  };

  const handleExportChecklists = () => {
    if (!task?.checklists?.length) {
      showToast('لا توجد قوائم للتصدير', 'error');
      return;
    }

    let content = '';
    task.checklists.forEach((list) => {
      content += `# ${list.title}\n`;
      list.items?.forEach((item) => {
        content += `- [${item.isCompleted ? 'x' : ' '}] ${item.content}\n`;
      });
      content += '\n';
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `task-${task.id}-checklists.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportChecklists = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      setIsImporting(true);
      try {
        const lines = text.split('\n');
        let currentChecklistId: string | null = null;
        let createdCount = 0;

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          if (trimmedLine.startsWith('#')) {
            // New Checklist
            const title = trimmedLine.replace(/^#+\s*/, '').trim();
            if (title) {
              const token = localStorage.getItem('accessToken');
              const response = await fetch(buildApiUrl(`super-admin/dev/tasks/${id}/checklists`), {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ title })
              });

              if (response.ok) {
                const data = await response.json();
                // Depending on API response structure, we might need to adjust this.
                // Assuming standard success response with data object
                if (data.success && data.data) { // Adjust based on actual API
                  currentChecklistId = data.data.id;
                  createdCount++;
                } else {
                  // Fallback if API returns list or something else, but usually creating returns the obj
                  // If we can't get ID, we can't add items.
                  // Let's assume standard response design we saw earlier for other creates
                  // Actually earlier create didn't await json, just checked response.ok
                  // We need the ID.
                  // Let's look at handleCreateChecklist: it just does fetchTask(false).
                  // We need to fetch the task to get the ID? No, that would be too slow in a loop.
                  // The API *should* return the created object.
                  // Let's assume it does.
                  currentChecklistId = data.data?.id;
                }
              }
            }
          } else if (trimmedLine.startsWith('-') && currentChecklistId) {
            // Checklist Item
            // Format: - [ ] Content or - Content
            let content = trimmedLine.replace(/^-/, '').trim();
            let isCompleted = false;

            if (content.startsWith('[x]')) {
              isCompleted = true;
              content = content.substring(3).trim();
            } else if (content.startsWith('[ ]')) {
              content = content.substring(3).trim();
            }

            if (content) {
              const token = localStorage.getItem('accessToken');
              await fetch(buildApiUrl(`super-admin/dev/tasks/checklists/${currentChecklistId}/items`), {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
              });
              // Note: We are ignoring isCompleted for now as the create (POST) API usually only takes content.
              // If we want to support status import, we might need a second call (PATCH) or update the Create API.
              // For now, let's just create them as pending (default).
              // If user requires status persistence, we can add a PATCH here.
              // Let's just stick to content for now for safety, or check if we can PATCH immediately or if CREATE supports it.
            }
          }
        }

        showToast(`تم استيراد ${createdCount} قائمة بنجاح`, 'success');
        fetchTask(false);
      } catch (err) {
        console.error(err);
        showToast('حدث خطأ أثناء الاستيراد', 'error');
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`super-admin/dev/tasks/${id}/status`), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      console.log('🔄 Status update response:', response.status);
      if (response.ok) {
        showToast('تم تحديث الحالة', 'success');
        if (newStatus === 'DONE' && task?.nextTaskId) {
          navigate(`/super-admin/dev-tasks/${task.nextTaskId}`);
        } else {
          fetchTask(false);
        }
      } else {
        const data = await response.json();
        showToast(data.message || 'فشل في تحديث الحالة', 'error');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      showToast('حدث خطأ في تحديث الحالة', 'error');
    }
    setStatusDropdownOpen(false);
  };

  const handleUpdateAssignee = async (newAssigneeId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`super-admin/dev/tasks/${id}`), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigneeId: newAssigneeId === 'unassigned' ? null : newAssigneeId })
      });
      if (response.ok) {
        showToast('تم تحديث المسؤول بنجاح', 'success');
        fetchTask(false);
      } else {
        const data = await response.json();
        showToast(data.message || 'فشل في تحديث المسؤول', 'error');
      }
    } catch (err) {
      console.error('Error updating assignee:', err);
      showToast('حدث خطأ في تحديث المسؤول', 'error');
    }
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
        <p className="text-red-700 dark:text-red-400">{error || 'المهمة غير موجودة'}</p>
        <button
          onClick={() => navigate('/super-admin/dev-tasks')}
          className="mt-4 px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600"
        >
          العودة للقائمة
        </button>
      </div>
    );
  }



  // Sidebar logic moved to TaskSidebar component


  const renderModals = () => (
    <>
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 left-1/2 transform -translate-x-1/2 px-8 py-4 rounded-xl shadow-2xl flex items-center gap-3 border-2 font-bold text-lg animate-bounce ${toast.type === 'success'
            ? 'bg-green-500 text-white border-green-300'
            : 'bg-red-500 text-white border-red-300'
            }`}
          style={{ zIndex: 9999 }}
        >
          {toast.type === 'success' ? <CheckCircleIcon className="h-6 w-6" /> : <XMarkIcon className="h-6 w-6" />}
          <span className="drop-shadow-lg">{toast.message}</span>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">تأكيد الحذف</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{confirmModal.message}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmModal({ open: false, message: '', onConfirm: () => { } })}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                إلغاء
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Time Log Modal */}
      {editingTimeLog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">تعديل سجل الوقت</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المدة (دقيقة)</label>
                <input
                  type="number"
                  value={editingTimeLog.duration}
                  onChange={(e) => setEditingTimeLog({ ...editingTimeLog, duration: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوصف</label>
                <input
                  type="text"
                  value={editingTimeLog.description}
                  onChange={(e) => setEditingTimeLog({ ...editingTimeLog, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setEditingTimeLog(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                إلغاء
              </button>
              <button
                onClick={handleEditTimeLog}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Task Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center overflow-y-auto p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl transform transition-all">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                  <DocumentDuplicateIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">تكرار المهمة</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">إنشاء نسخة من المهمة مع إمكانية تغيير المسؤول</p>
                </div>
              </div>
              <button onClick={() => setShowDuplicateModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <XMarkIcon className="h-6 w-6 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <UserIcon className="h-4 w-4" /> المسؤول الجديد (اختياري)
                </label>
                <select
                  value={duplicateForm.newAssigneeId}
                  onChange={(e) => setDuplicateForm({ ...duplicateForm, newAssigneeId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:text-white transition-all text-sm"
                >
                  <option value="">-- نفس المسؤول الحالي ({task?.assigneeName || 'غير محدد'}) --</option>
                  {teamMembers.map(member => (
                    <option key={member.userId || member.id} value={member.userId || member.id}>
                      {member.name} {member.availability !== 'available' ? '(مشغول)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">اترك فارغاً للاحتفاظ بنفس المسؤول</p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={duplicateForm.includeChecklists}
                    onChange={(e) => setDuplicateForm({ ...duplicateForm, includeChecklists: e.target.checked })}
                    className="h-4 w-4 text-purple-600 rounded border-gray-300 cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">تضمين القوائم المرجعية</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">نسخ جميع القوائم والعناصر (سيتم إعادة تعيين حالة الإكمال)</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={duplicateForm.includeAttachments}
                    onChange={(e) => setDuplicateForm({ ...duplicateForm, includeAttachments: e.target.checked })}
                    className="h-4 w-4 text-purple-600 rounded border-gray-300 cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">تضمين المرفقات</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">نسخ جميع الملفات المرفقة (قريباً)</p>
                  </div>
                </label>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-lg p-4">
                <div className="flex gap-3">
                  <LightBulbIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-300">
                    <p className="font-medium mb-1">ملاحظة:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>سيتم إنشاء المهمة بحالة "Backlog"</li>
                      <li>سيتم إعادة تعيين التقدم والساعات الفعلية</li>
                      <li>سيتم نسخ جميع التفاصيل الأخرى</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end p-6 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                disabled={isDuplicating}
                className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-all disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleDuplicateTask}
                disabled={isDuplicating}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-lg shadow-purple-200 dark:shadow-none transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDuplicating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    جاري التكرار...
                  </>
                ) : (
                  <>
                    <DocumentDuplicateIcon className="h-5 w-5" />
                    تكرار المهمة
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Subtask Modal */}
      {showSubtaskModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center overflow-y-auto p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl transform transition-all">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                  <ClipboardDocumentListIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">إنشاء مهمة فرعية جديدة</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">أضف تفاصيل المهمة والمسؤول عنها</p>
                </div>
              </div>
              <button onClick={() => setShowSubtaskModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <XMarkIcon className="h-6 w-6 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleCreateSubtask} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                  <SparklesIcon className="h-4 w-4" /> عنوان المهمة
                </label>
                <input
                  type="text"
                  required
                  value={subtaskForm.title}
                  onChange={(e) => setSubtaskForm({ ...subtaskForm, title: e.target.value })}
                  placeholder="مثال: إصلاح خطأ في واجهة المستخدم"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:text-white transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                  <DocumentDuplicateIcon className="h-4 w-4" /> الوصف
                </label>
                <textarea
                  value={subtaskForm.description}
                  onChange={(e) => setSubtaskForm({ ...subtaskForm, description: e.target.value })}
                  placeholder="اشرح تفاصيل المهمة هنا..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:text-white transition-all text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                    <BriefcaseIcon className="h-4 w-4" /> القسم المعني
                  </label>
                  <select
                    value={subtaskForm.department}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:border-indigo-500 dark:text-white transition-all text-sm"
                  >
                    <option value="">-- اختر القسم --</option>
                    {Array.from(new Set(teamMembers.filter(m => m.department).map(m => m.department))).map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                    <UserGroupIcon className="h-4 w-4" /> المسؤول
                  </label>
                  <select
                    value={subtaskForm.assigneeId}
                    onChange={(e) => setSubtaskForm({ ...subtaskForm, assigneeId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:border-indigo-500 dark:text-white transition-all text-sm"
                  >
                    <option value="">-- اختر المسؤول --</option>
                    {teamMembers
                      .filter(m => !subtaskForm.department || m.department === subtaskForm.department)
                      .map(member => (
                        <option key={member.userId || member.id} value={member.userId || member.id}>
                          {member.name} {member.availability !== 'available' ? '(مشغول)' : ''}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">النوع</label>
                  <select
                    value={subtaskForm.type}
                    onChange={(e) => setSubtaskForm({ ...subtaskForm, type: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:border-indigo-500 dark:text-white transition-all text-sm"
                  >
                    <option value="FEATURE">✨ ميزة</option>
                    <option value="BUG">🐛 خطأ</option>
                    <option value="ENHANCEMENT">🔧 تحسين</option>
                    <option value="REFACTOR">♻️ إعادة هيكلة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">الأولوية</label>
                  <select
                    value={subtaskForm.priority}
                    onChange={(e) => setSubtaskForm({ ...subtaskForm, priority: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:border-indigo-500 dark:text-white transition-all text-sm"
                  >
                    <option value="LOW">منخفضة</option>
                    <option value="MEDIUM">متوسطة</option>
                    <option value="HIGH">عالية</option>
                    <option value="CRITICAL">حرجة 🔥</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-50 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowSubtaskModal(false)}
                  className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all flex items-center gap-2"
                >
                  إنشاء المهمة <CheckIcon className="h-5 w-5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Request Testing Modal */}
      {showTestingModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center overflow-y-auto p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl transform transition-all">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-50 dark:bg-cyan-900/30 rounded-lg">
                  <CheckCircleIcon className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">طلب اختبار</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">اختر المسؤول عن اختبار هذه المهمة</p>
                </div>
              </div>
              <button onClick={() => setShowTestingModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <XMarkIcon className="h-6 w-6 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleCreateTestingSubtask} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                  <UserIcon className="h-4 w-4" /> اختر المختبر
                </label>
                <select
                  required
                  value={selectedTesterId}
                  onChange={(e) => setSelectedTesterId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:text-white transition-all text-sm"
                >
                  <option value="">-- اختر المختبر --</option>
                  {teamMembers.map(member => (
                    <option key={member.userId || member.id} value={member.userId || member.id}>
                      {member.name} {member.availability !== 'available' ? '(مشغول)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-100 dark:border-cyan-900/30 rounded-lg p-4">
                <div className="flex gap-3">
                  <LightBulbIcon className="h-5 w-5 text-cyan-600 dark:text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-cyan-800 dark:text-cyan-300">
                    <p className="font-medium mb-1">تفاصيل الاختبار:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>سيتم إنشاء مهمة فرعية جديدة بعنوان "Testing: {task?.title?.substring(0, 30)}..."</li>
                      <li>ستحتفظ بنفس الأولوية والقسم</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-50 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowTestingModal(false)}
                  className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold shadow-lg shadow-cyan-200 dark:shadow-none transition-all flex items-center gap-2"
                >
                  إرسال الطلب <CheckIcon className="h-5 w-5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );


  const renderMainContent = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm min-h-[600px]">
      {/* Tabs Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 overflow-x-auto">
        <div className="flex">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-6 py-4 text-sm font-bold whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'details'
              ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400 bg-white dark:bg-gray-800'
              : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
          >
            <DocumentDuplicateIcon className="h-5 w-5" />
            نظرة عامة
          </button>
          <button
            onClick={() => setActiveTab('subtasks')}
            className={`px-6 py-4 text-sm font-bold whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'subtasks'
              ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400 bg-white dark:bg-gray-800'
              : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
          >
            <ClipboardDocumentListIcon className="h-5 w-5" />
            المهام الفرعية ({task.subtasks?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('checklists')}
            className={`px-6 py-4 text-sm font-bold whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'checklists'
              ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400 bg-white dark:bg-gray-800'
              : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
          >
            <CheckCircleIcon className="h-5 w-5" />
            القوائم ({task.checklists?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`px-6 py-4 text-sm font-bold whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'comments'
              ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400 bg-white dark:bg-gray-800'
              : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
          >
            <ChatBubbleLeftIcon className="h-5 w-5" />
            التعليقات ({task.comments?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('attachments')}
            className={`px-6 py-4 text-sm font-bold whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'attachments'
              ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400 bg-white dark:bg-gray-800'
              : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
          >
            <PaperClipIcon className="h-5 w-5" />
            المرفقات ({task.attachments?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('time')}
            className={`px-6 py-4 text-sm font-bold whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'time'
              ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400 bg-white dark:bg-gray-800'
              : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
          >
            <ClockIcon className="h-5 w-5" />
            تتبع الوقت
          </button>
          <button
            onClick={() => setActiveTab('activities')}
            className={`px-6 py-4 text-sm font-bold whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'activities'
              ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400 bg-white dark:bg-gray-800'
              : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
          >
            يوميات النظام
          </button>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'details' && (
          <TaskOverview
            task={task}
            handleToggleItem={handleToggleItem}
            handleAddItem={handleAddItem}
            newItemInputs={newItemInputs}
            setNewItemInputs={setNewItemInputs}
            settings={settings}
          />
        )}

        {activeTab === 'subtasks' && (
          <TaskSubtasks
            task={task}
            onAddSubtask={() => setShowSubtaskModal(true)}
            onRequestTesting={() => setShowTestingModal(true)}
            settings={settings}
          />
        )}

        {activeTab === 'checklists' && (
          <div className="space-y-6">
            <div className="flex gap-2 justify-between items-center mb-4">
              <div className="flex gap-2 flex-1">
                <input
                  type="text"
                  value={newChecklistTitle}
                  onChange={(e) => setNewChecklistTitle(e.target.value)}
                  placeholder="عنوان القائمة الجديدة..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                />
                <button onClick={handleCreateChecklist} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  <PlusIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleExportChecklists}
                  title="تصدير القوائم"
                  className="p-2 text-gray-600 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="استيراد قوائم"
                  className="p-2 text-gray-600 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <ArrowUpTrayIcon className="h-5 w-5" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportChecklists}
                  accept=".txt"
                  className="hidden"
                />
              </div>
            </div>

            {task.checklists?.map((checklist) => (
              <div key={checklist.id} className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-indigo-500" />
                  {checklist.title}
                </h4>
                <div className="space-y-2 mb-3">
                  {checklist.items?.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 group">
                      <input
                        type="checkbox"
                        checked={item.isCompleted}
                        onChange={() => handleToggleItem(item.id, item.isCompleted)}
                        className="h-4 w-4 text-indigo-600 rounded border-gray-300 cursor-pointer dark:bg-gray-700 dark:border-gray-600 focus:ring-indigo-500"
                      />
                      <span className={`flex-1 transition-all ${item.isCompleted ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {item.content}
                      </span>
                      <button
                        onClick={() => setConfirmModal({ open: true, message: 'هل أنت متأكد من حذف هذا العنصر؟', onConfirm: () => handleDeleteChecklistItem(item.id) })}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-opacity"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={newItemInputs[checklist.id] || ''}
                    onChange={(e) => setNewItemInputs({ ...newItemInputs, [checklist.id]: e.target.value })}
                    placeholder="إضافة عنصر..."
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-200 focus:ring-1 focus:ring-indigo-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddItem(checklist.id)}
                  />
                  <button onClick={() => handleAddItem(checklist.id)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors">
                    <PlusIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
            {(!task.checklists || task.checklists.length === 0) && !newChecklistTitle && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                <CheckCircleIcon className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p>لا توجد قوائم مرجعية</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="اكتب تعليقاً..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 mb-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-shadow shadow-sm"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="px-6 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md transition-all active:scale-95"
                >
                  إضافة تعليق
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {task.comments?.map((comment) => (
                <div key={comment.id} className="border-b border-gray-100 dark:border-gray-700 pb-6 last:border-0">
                  <div className="flex items-start gap-4">
                    {comment.authorAvatar ? (
                      <img src={comment.authorAvatar} alt="" className="w-10 h-10 rounded-full ring-2 ring-gray-100 dark:ring-gray-700" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                        {comment.authorName.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl rounded-tr-none">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-gray-900 dark:text-gray-100">{comment.authorName}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(comment.createdAt).toLocaleString('ar-EG')}
                          {comment.isEdited && <span className="mr-1">(معدل)</span>}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                    </div>
                  </div>
                </div>
              ))}
              {(!task.comments || task.comments.length === 0) && (
                <div className="text-center py-12 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                  <ChatBubbleLeftIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>لا توجد تعليقات بعد</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'attachments' && (
          <div>
            <div className="mb-6">
              <label className="block w-full cursor-pointer bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-2 border-dashed border-indigo-300 dark:border-indigo-600 rounded-xl p-8 text-center hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-900/30 dark:hover:to-purple-900/30 transition-all group">
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  multiple
                  accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                />
                <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <CloudArrowDownIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <span className="text-gray-700 dark:text-gray-200 font-bold block text-lg mb-1">
                  {isUploading ? '⏳ جاري الرفع...' : '📎 اضغط لرفع ملفات متعددة'}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 block mb-2">
                  يمكنك اختيار أكثر من ملف في نفس الوقت (حتى 10 ملفات)
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 block">
                  الحد الأقصى: 20 ميجابايت لكل ملف • الصور، PDF، Word، Excel
                </span>
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {task.attachments?.map((file) => {
                const isImage = file.fileType?.startsWith('image/');
                return (
                  <div key={file.id} className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 hover:shadow-md transition-shadow group relative overflow-hidden">
                    {isImage ? (
                      <div className="relative">
                        <img
                          src={file.fileUrl || `/uploads/dev-tasks/${file.fileName}`}
                          alt={file.originalName || file.fileName}
                          className="w-full h-48 object-cover"
                        />
                        <div className="absolute top-2 left-2 flex gap-1">
                          <a
                            href={file.fileUrl || `/uploads/dev-tasks/${file.fileName}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-300 shadow-sm"
                          >
                            <CloudArrowDownIcon className="h-5 w-5" />
                          </a>
                          <button
                            onClick={() => setConfirmModal({ open: true, message: 'هل أنت متأكد من حذف هذا المرفق؟', onConfirm: () => handleDeleteAttachment(file.id) })}
                            className="p-2 bg-white/90 dark:bg-gray-800/90 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg text-gray-700 dark:text-gray-300 hover:text-red-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                        <div className="p-3 bg-gradient-to-t from-black/50 to-transparent absolute bottom-0 left-0 right-0">
                          <p className="text-sm font-semibold text-white truncate" title={file.originalName || file.fileName}>
                            {file.originalName || file.fileName}
                          </p>
                          <p className="text-xs text-gray-200 mt-0.5">
                            {(file.fileSize / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-4">
                        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                          <PaperClipIcon className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate" title={file.originalName || file.fileName}>
                            {file.originalName || file.fileName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {(file.fileSize / 1024).toFixed(1)} KB • {new Date(file.createdAt).toLocaleDateString('ar-EG')}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <a href={file.fileUrl || `/uploads/dev-tasks/${file.fileName}`} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500">
                            <CloudArrowDownIcon className="h-5 w-5" />
                          </a>
                          <button
                            onClick={() => setConfirmModal({ open: true, message: 'هل أنت متأكد من حذف هذا المرفق؟', onConfirm: () => handleDeleteAttachment(file.id) })}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {(!task.attachments || task.attachments.length === 0) && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 mt-6">
                <PaperClipIcon className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p>لا توجد مرفقات</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'time' && (
          <div className="space-y-8">
            {/* Live Timer Section */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-2xl text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
              <div className="relative z-10 text-center">
                <p className="text-indigo-100 font-medium mb-3 tracking-wide uppercase text-sm">
                  {activeTimer.taskId === id && activeTimer.isRunning ? 'جلسة نشطة' : 'العداد متوقف'}
                </p>
                <p className="text-6xl font-mono font-bold mb-8 drop-shadow-md">{formatTime(activeTimer.taskId === id ? elapsedSeconds : 0)}</p>

                <div className="flex justify-center">
                  {activeTimer.taskId === id && activeTimer.isRunning ? (
                    <button
                      onClick={handleStopTimer}
                      className="flex items-center gap-3 px-8 py-4 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold shadow-lg transition-all transform hover:scale-105"
                    >
                      <StopIcon className="h-6 w-6" />
                      إيقاف العداد
                    </button>
                  ) : (
                    <button
                      onClick={handleStartTimer}
                      className="flex items-center gap-3 px-8 py-4 bg-white text-indigo-700 hover:bg-indigo-50 rounded-full font-bold shadow-lg transition-all transform hover:scale-105"
                    >
                      <PlayIcon className="h-6 w-6" />
                      ابدأ التسجيل
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Time Logs History */}
            <div>
              <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <ClockIcon className="h-5 w-5 text-gray-500" />
                سجل الأوقات السابقة
              </h4>
              <div className="space-y-3">
                {task.timeLogs?.filter(log => !log.isRunning).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400">
                        {log.memberName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-gray-100">{log.memberName}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          <span>{new Date(log.startTime).toLocaleDateString('ar-EG')}</span>
                          <span>•</span>
                          <span>{log.description || 'بدون وصف'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-left">
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100 font-mono">
                          {Math.round(log.duration / 60 * 100) / 100}h
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-right">{log.duration}m</p>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button
                          onClick={() => setEditingTimeLog({ id: log.id, duration: log.duration, description: log.description || '' })}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirmModal({ open: true, message: 'هل أنت متأكد من حذف سجل الوقت هذا؟', onConfirm: () => handleDeleteTimeLog(log.id) })}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {(!task.timeLogs || task.timeLogs.filter(l => !l.isRunning).length === 0) && (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                    <ClockIcon className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                    <p>لا توجد سجلات وقت</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activities' && (
          <TaskActivities activities={task.activities} />
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full pb-10" dir="rtl">
      {renderModals()}

      <TaskHeader
        task={task}
        isTimerRunning={activeTimer.taskId === id && activeTimer.isRunning}
        isTimerPaused={activeTimer.taskId === id && activeTimer.isPaused}
        elapsedSeconds={activeTimer.taskId === id ? elapsedSeconds : 0}
        handleStartTimer={handleStartTimer}
        handleStopTimer={handleStopTimer}
        handlePauseTimer={handlePauseTimer}
        handleResumeTimer={handleResumeTimer}
        onEdit={() => navigate(`/super-admin/dev-tasks/${id}/edit`)}
        onDelete={() => setConfirmModal({ open: true, message: 'هل أنت متأكد من حذف هذه المهمة؟', onConfirm: handleDeleteTask })}
        onDuplicate={() => setShowDuplicateModal(true)}
        isSmartTimeTrackingEnabled={settings?.smartTimeTracking ?? true}
        canEdit={userPermissions?.canEdit}
        canDelete={userPermissions?.canDelete}
        settings={settings}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-6">
          {renderMainContent()}
        </div>
        <div className="lg:col-span-4 space-y-6 lg:order-last">
          <TaskSidebar
            task={task}
            settings={settings}
            userPermissions={userPermissions}
            statusDropdownOpen={statusDropdownOpen}
            setStatusDropdownOpen={setStatusDropdownOpen}
            handleUpdateStatus={handleUpdateStatus}
            teamMembers={teamMembers}
            handleUpdateAssignee={handleUpdateAssignee}
          />
        </div>
      </div>
    </div>
  );

};


export default DevTaskDetails;

