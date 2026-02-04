import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../../utils/urlHelper';
import { useTheme } from '../../hooks/useTheme';
import {
  UserGroupIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  UserIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  FunnelIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';

interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar: string | null;
  phone: string | null;
  role: string;
  department: string | null;
  skills: string[];
  availability: string;
  isActive: boolean;
  tasksCount: number;
  projectsCount: number;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

const roleLabels: Record<string, string> = {
  developer: 'مطور',
  designer: 'مصمم',
  project_manager: 'مدير مشروع',
  qa: 'مختبر',
  devops: 'DevOps',
  tech_lead: 'قائد تقني',
  product_manager: 'مدير منتج'
};

const availabilityConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  available: { label: 'متاح', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400', icon: <CheckCircleIcon className="h-4 w-4" /> },
  busy: { label: 'مشغول', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400', icon: <ClockIcon className="h-4 w-4" /> },
  away: { label: 'بعيد', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400', icon: <ClockIcon className="h-4 w-4" /> },
  offline: { label: 'غير متصل', color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400', icon: <XCircleIcon className="h-4 w-4" /> }
};

const DevTeam = () => {
  const { actualTheme } = useTheme();
  const isDark = actualTheme === 'dark';
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [filterRole, setFilterRole] = useState('');
  const [filterAvailability, setFilterAvailability] = useState('');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  useEffect(() => {
    if (showForm && !editingMember) {
      fetchAvailableUsers();
    }
  }, [showForm, editingMember]);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl('super-admin/dev/team'), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setTeamMembers(data.data);
      } else {
        console.error('Failed to fetch team members:', data.error);
      }
    } catch (err) {
      console.error('Error fetching team members:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      setLoadingUsers(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl('super-admin/users?limit=100'), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success && data.data) {
        // Filter out users who are already team members
        const existingUserIds = teamMembers.map(m => m.userId);
        // data.data is an array of users
        const usersArray = Array.isArray(data.data) ? data.data : [];
        const available = usersArray.filter((u: User) => !existingUserIds.includes(u.id));
        setAvailableUsers(available);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا العضو من الفريق؟')) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`super-admin/dev/team/${id}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        fetchTeamMembers();
      } else {
        alert(data.error || 'فشل في حذف العضو');
      }
    } catch (err) {
      alert('فشل في الاتصال بالخادم');
    }
  };

  const handleEdit = (member: TeamMember) => {
    setEditingMember(member);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingMember(null);
  };

  const filteredMembers = teamMembers.filter(member => {
    if (filterRole && member.role !== filterRole) return false;
    if (filterAvailability && member.availability !== filterAvailability) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">👥 فريق التطوير</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">إدارة أعضاء فريق التطوير</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600"
        >
          <PlusIcon className="h-5 w-5" />
          إضافة عضو
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-4">
          <FunnelIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">كل الأدوار</option>
            {Object.entries(roleLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={filterAvailability}
            onChange={(e) => setFilterAvailability(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">كل الحالات</option>
            {Object.entries(availabilityConfig).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          {(filterRole || filterAvailability) && (
            <button
              onClick={() => {
                setFilterRole('');
                setFilterAvailability('');
              }}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-sm"
            >
              مسح الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.map((member) => {
          const availabilityInfo = availabilityConfig[member.availability] || availabilityConfig.offline;
          
          return (
            <div
              key={member.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg dark:hover:shadow-xl transition-shadow"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {member.avatar ? (
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                        <UserIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{member.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(member)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                      title="تعديل"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(member.id)}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      title="حذف"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Role & Department */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BriefcaseIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {roleLabels[member.role] || member.role}
                    </span>
                  </div>
                  {member.department && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mr-6">{member.department}</p>
                  )}
                </div>

                {/* Availability */}
                <div className="mb-4">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${availabilityInfo.color}`}>
                    {availabilityInfo.icon}
                    {availabilityInfo.label}
                  </div>
                  {!member.isActive && (
                    <span className="ml-2 inline-block px-2 py-1 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                      غير نشط
                    </span>
                  )}
                </div>

                {/* Skills */}
                {member.skills && member.skills.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">المهارات:</p>
                    <div className="flex flex-wrap gap-1">
                      {member.skills.slice(0, 3).map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                      {member.skills.length > 3 && (
                        <span className="px-2 py-0.5 text-gray-500 dark:text-gray-500 text-xs">+{member.skills.length - 3}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{member.tasksCount}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">مهمة</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">{member.projectsCount}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">مشروع</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredMembers.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <UserGroupIcon className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">لا يوجد أعضاء في الفريق</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">ابدأ بإضافة أعضاء جدد للفريق</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600"
          >
            <PlusIcon className="h-5 w-5 inline ml-2" />
            إضافة عضو
          </button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <TeamMemberFormModal
          member={editingMember}
          availableUsers={availableUsers}
          loadingUsers={loadingUsers}
          onClose={handleCloseForm}
          onSuccess={() => {
            handleCloseForm();
            fetchTeamMembers();
          }}
        />
      )}
    </div>
  );
};

// Team Member Form Modal Component
const TeamMemberFormModal: React.FC<{
  member: TeamMember | null;
  availableUsers: User[];
  loadingUsers: boolean;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ member, availableUsers, loadingUsers, onClose, onSuccess }) => {
  const { actualTheme } = useTheme();
  const isDark = actualTheme === 'dark';
  const [formData, setFormData] = useState({
    userId: member?.userId || '',
    role: member?.role || 'developer',
    department: member?.department || '',
    skills: member?.skills?.join(', ') || '',
    availability: member?.availability || 'available',
    isActive: member?.isActive !== undefined ? member.isActive : true
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!member && !formData.userId) {
      alert('يرجى اختيار مستخدم');
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('accessToken');
      const url = member
        ? buildApiUrl(`super-admin/dev/team/${member.id}`)
        : buildApiUrl('super-admin/dev/team');

      const payload = {
        ...formData,
        skills: formData.skills ? formData.skills.split(',').map(s => s.trim()).filter(Boolean) : []
      };

      if (!member) {
        payload.userId = formData.userId;
      } else {
        // Remove userId when editing
        delete payload.userId;
      }

      const response = await fetch(url, {
        method: member ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (data.success) {
        onSuccess();
      } else {
        alert(data.error || `فشل في ${member ? 'تحديث' : 'إنشاء'} العضو`);
      }
    } catch (err) {
      alert('فشل في الاتصال بالخادم');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {member ? 'تعديل عضو الفريق' : 'إضافة عضو جديد'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!member && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                المستخدم <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              {loadingUsers ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
                </div>
              ) : (
                <select
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                >
                  <option value="">اختر مستخدم...</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.email})
                    </option>
                  ))}
                </select>
              )}
              {!loadingUsers && availableUsers.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">لا يوجد مستخدمين متاحين</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              الدور <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            >
              {Object.entries(roleLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">القسم</label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              placeholder="مثل: Frontend, Backend, Mobile..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المهارات</label>
            <input
              type="text"
              value={formData.skills}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
              placeholder="مفصولة بفاصلة: React, Node.js, TypeScript..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الحالة</label>
            <select
              value={formData.availability}
              onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              {Object.entries(availabilityConfig).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              نشط
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50"
            >
              {saving ? 'جاري الحفظ...' : (member ? 'تحديث' : 'إضافة')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DevTeam;