import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../../utils/urlHelper';
import {
  CheckCircleIcon,
  PlusIcon,
  XMarkIcon,
  TrashIcon,
  PencilIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';

interface ChecklistItem {
  id: string;
  content: string;
  isCompleted: boolean;
  order: number;
}

interface Checklist {
  id: string;
  title: string;
  items: ChecklistItem[];
  completedCount: number;
  totalCount: number;
}

interface TaskChecklistProps {
  taskId: string;
  onUpdate?: () => void;
}

const TaskChecklist: React.FC<TaskChecklistProps> = ({ taskId, onUpdate }) => {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddChecklist, setShowAddChecklist] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newItemContent, setNewItemContent] = useState<Record<string, string>>({});
  const [editingItem, setEditingItem] = useState<{ checklistId: string; itemId: string } | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    fetchChecklists();
  }, [taskId]);

  const fetchChecklists = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`tasks/${taskId}/checklists`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setChecklists(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching checklists:', error);
    } finally {
      setLoading(false);
    }
  };

  const createChecklist = async () => {
    if (!newChecklistTitle.trim()) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`tasks/${taskId}/checklists`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title: newChecklistTitle })
      });

      const data = await response.json();
      if (data.success) {
        fetchChecklists();
        setNewChecklistTitle('');
        setShowAddChecklist(false);
        onUpdate?.();
      }
    } catch (error) {
      console.error('Error creating checklist:', error);
    }
  };

  const deleteChecklist = async (checklistId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه القائمة؟')) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`tasks/checklists/${checklistId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        fetchChecklists();
        onUpdate?.();
      }
    } catch (error) {
      console.error('Error deleting checklist:', error);
    }
  };

  const addItem = async (checklistId: string) => {
    const content = newItemContent[checklistId];
    if (!content?.trim()) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`tasks/checklists/${checklistId}/items`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content })
      });

      const data = await response.json();
      if (data.success) {
        fetchChecklists();
        setNewItemContent({ ...newItemContent, [checklistId]: '' });
        onUpdate?.();
      }
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const toggleItem = async (checklistId: string, itemId: string, isCompleted: boolean) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`tasks/checklists/items/${itemId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isCompleted: !isCompleted })
      });

      const data = await response.json();
      if (data.success) {
        // Update local state immediately for better UX
        setChecklists(prev => prev.map(cl => {
          if (cl.id === checklistId) {
            return {
              ...cl,
              items: cl.items.map(item => 
                item.id === itemId ? { ...item, isCompleted: !isCompleted } : item
              ),
              completedCount: cl.completedCount + (isCompleted ? -1 : 1)
            };
          }
          return cl;
        }));
        onUpdate?.();
      }
    } catch (error) {
      console.error('Error toggling item:', error);
    }
  };

  const updateItem = async (_checklistId: string, itemId: string) => {
    if (!editContent.trim()) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`tasks/checklists/items/${itemId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: editContent })
      });

      const data = await response.json();
      if (data.success) {
        fetchChecklists();
        setEditingItem(null);
        setEditContent('');
        onUpdate?.();
      }
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const deleteItem = async (_checklistId: string, itemId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`tasks/checklists/items/${itemId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        fetchChecklists();
        onUpdate?.();
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const getProgressPercentage = (checklist: Checklist) => {
    if (checklist.totalCount === 0) return 0;
    return Math.round((checklist.completedCount / checklist.totalCount) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <CheckCircleIcon className="h-5 w-5 text-indigo-600 ml-2" />
          قوائم التحقق
        </h3>
        <button
          onClick={() => setShowAddChecklist(true)}
          className="inline-flex items-center px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          <PlusIcon className="h-4 w-4 ml-1" />
          إضافة قائمة
        </button>
      </div>

      {/* Add Checklist Form */}
      {showAddChecklist && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <input
            type="text"
            value={newChecklistTitle}
            onChange={(e) => setNewChecklistTitle(e.target.value)}
            placeholder="عنوان القائمة..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
            autoFocus
            onKeyPress={(e) => e.key === 'Enter' && createChecklist()}
          />
          <div className="flex justify-end space-x-2 space-x-reverse">
            <button
              onClick={() => { setShowAddChecklist(false); setNewChecklistTitle(''); }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
            >
              إلغاء
            </button>
            <button
              onClick={createChecklist}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              إنشاء
            </button>
          </div>
        </div>
      )}

      {/* Checklists */}
      {checklists.length === 0 && !showAddChecklist ? (
        <div className="text-center py-8 text-gray-500">
          <CheckCircleIcon className="h-10 w-10 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">لا توجد قوائم تحقق</p>
        </div>
      ) : (
        checklists.map(checklist => (
          <div key={checklist.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Checklist Header */}
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Bars3Icon className="h-4 w-4 text-gray-400 ml-2" />
                  <h4 className="font-medium text-gray-900">{checklist.title}</h4>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <span className="text-sm text-gray-500">
                    {checklist.completedCount}/{checklist.totalCount}
                  </span>
                  <button
                    onClick={() => deleteChecklist(checklist.id)}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              {/* Progress Bar */}
              {checklist.totalCount > 0 && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        getProgressPercentage(checklist) === 100 ? 'bg-green-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${getProgressPercentage(checklist)}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Checklist Items */}
            <div className="p-2">
              {checklist.items.map(item => (
                <div
                  key={item.id}
                  className={`flex items-center p-2 rounded-lg hover:bg-gray-50 group ${
                    item.isCompleted ? 'opacity-60' : ''
                  }`}
                >
                  <button
                    onClick={() => toggleItem(checklist.id, item.id, item.isCompleted)}
                    className="flex-shrink-0 ml-3"
                  >
                    {item.isCompleted ? (
                      <CheckCircleSolidIcon className="h-5 w-5 text-green-500" />
                    ) : (
                      <div className="h-5 w-5 border-2 border-gray-300 rounded-full hover:border-indigo-500"></div>
                    )}
                  </button>

                  {editingItem?.checklistId === checklist.id && editingItem?.itemId === item.id ? (
                    <div className="flex-1 flex items-center space-x-2 space-x-reverse">
                      <input
                        type="text"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                        onKeyPress={(e) => e.key === 'Enter' && updateItem(checklist.id, item.id)}
                      />
                      <button
                        onClick={() => updateItem(checklist.id, item.id)}
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        حفظ
                      </button>
                      <button
                        onClick={() => { setEditingItem(null); setEditContent(''); }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className={`flex-1 text-sm ${item.isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                        {item.content}
                      </span>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 space-x-reverse">
                        <button
                          onClick={() => { setEditingItem({ checklistId: checklist.id, itemId: item.id }); setEditContent(item.content); }}
                          className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteItem(checklist.id, item.id)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <XMarkIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {/* Add Item */}
              <div className="flex items-center p-2 mt-1">
                <PlusIcon className="h-5 w-5 text-gray-400 ml-3" />
                <input
                  type="text"
                  value={newItemContent[checklist.id] || ''}
                  onChange={(e) => setNewItemContent({ ...newItemContent, [checklist.id]: e.target.value })}
                  placeholder="أضف عنصر..."
                  className="flex-1 px-2 py-1 text-sm border-0 focus:outline-none focus:ring-0 placeholder-gray-400"
                  onKeyPress={(e) => e.key === 'Enter' && addItem(checklist.id)}
                />
                {newItemContent[checklist.id] && (
                  <button
                    onClick={() => addItem(checklist.id)}
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    إضافة
                  </button>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default TaskChecklist;
