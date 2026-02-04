import { useState, useEffect } from 'react';
import { buildApiUrl } from '../../utils/urlHelper';
import {
    UserGroupIcon,
    PlusIcon,
    TrashIcon,
    BuildingOfficeIcon,
    ExclamationCircleIcon,
    MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

interface Company {
    id: string;
    name: string;
    slug: string;
}

interface UserCompany {
    companyId: string;
    role: string;
    company: Company;
}

interface StaffUser {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    company?: Company;
    userCompanies: UserCompany[];
}

const StaffCompanyAccess = () => {
    const [staff, setStaff] = useState<StaffUser[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
    const [companySearch, setCompanySearch] = useState('');
    const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newRole, setNewRole] = useState('AGENT');

    useEffect(() => {
        fetchStaff();
        fetchCompanies();
    }, []);

    const fetchStaff = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(buildApiUrl('super-admin/users?limit=100'), {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setStaff(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch staff', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCompanies = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            // Using the standard admin companies endpoint
            const res = await fetch(buildApiUrl('admin/companies?limit=1000'), {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setCompanies(data.data.companies || []);
            }
        } catch (error) {
            console.error('Failed to fetch companies', error);
        }
    };

    const handleAddAccess = async (companyId: string) => {
        if (!selectedUser) return;
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(buildApiUrl('auth/user-company'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: selectedUser.id,
                    companyId: companyId,
                    role: newRole
                })
            });
            const data = await res.json();
            if (data.success) {
                fetchStaff();
                setShowAddModal(false);
                alert('تمت إضافة الصلاحية بنجاح');
            } else {
                alert('فشل: ' + data.message);
            }
        } catch (error) {
            alert('خطأ في الاتصال');
        }
    };

    const handleRemoveAccess = async (userId: string, companyId: string) => {
        if (!confirm('هل أنت متأكد من حذف وصول هذا الموظف لهذه الشركة؟')) return;
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(buildApiUrl(`auth/user-company/${userId}/${companyId}`), {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                fetchStaff();
                alert('تم الحذف بنجاح');
            } else {
                alert('فشل: ' + data.message);
            }
        } catch (error) {
            alert('خطأ في الاتصال');
        }
    };

    const handleSetPrimaryCompany = async (userId: string, userName: string) => {
        if (!confirm(`هل تريد تعيين شركة النظام كشركة أساسية لـ ${userName}؟`)) return;
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(buildApiUrl('auth/set-primary-company'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ userId })
            });
            const data = await res.json();
            if (data.success) {
                fetchStaff();
                alert('تم تعيين شركة النظام كشركة أساسية بنجاح');
            } else {
                alert('فشل: ' + data.message);
            }
        } catch (error) {
            alert('خطأ في الاتصال');
        }
    };

    const getCurrentSystemCompanyId = () => {
        // Get it from the first staff member who has a company
        // System company is the one that appears most or the super admin's company
        // For simplicity, we'll get from first user
        const userWithCompany = staff.find(u => u.company);
        return userWithCompany?.company?.id || '';
    };

    useEffect(() => {
        const searchLower = companySearch.toLowerCase();
        const filtered = companies.filter(c =>
            c.name.toLowerCase().includes(searchLower) ||
            c.slug.toLowerCase().includes(searchLower)
        );
        setFilteredCompanies(filtered);
    }, [companySearch, companies]);

    if (loading) return <div className="p-10 text-center">جاري التحميل...</div>;

    return (
        <div className="space-y-6" dir="rtl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <UserGroupIcon className="h-8 w-8 text-blue-500" />
                        إدارة وصول الموظفين للشركات
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">ربط حسابات إدارة النظام (Staff) بالشركات كأعضاء</p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="relative max-w-md">
                        <MagnifyingGlassIcon className="h-5 w-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="بحث عن موظف..."
                            className="w-full pr-10 pl-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 font-semibold">الموظف</th>
                                <th className="px-6 py-4 font-semibold">الرتبة في السيستم</th>
                                <th className="px-6 py-4 font-semibold">الشركات المرتبطة</th>
                                <th className="px-6 py-4 font-semibold">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {staff.filter(u =>
                                `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
                                u.email.toLowerCase().includes(search.toLowerCase())
                            ).map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold text-gray-900 dark:text-gray-100">{user.firstName} {user.lastName}</span>
                                            <span className="text-xs text-gray-400">{user.email}</span>
                                            {user.company && user.company.id !== getCurrentSystemCompanyId() && (
                                                <div className="flex items-center gap-1 mt-1">
                                                    <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 rounded">
                                                        ⚠️ الشركة الأساسية ليست شركة النظام
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-md text-xs font-bold uppercase">
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-2">
                                            {/* Primary Company Link (from companyId) */}
                                            {user.company && (
                                                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-full border border-blue-100 dark:border-blue-800">
                                                    <BuildingOfficeIcon className="h-3.5 w-3.5 text-blue-500" />
                                                    <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{user.company.name}</span>
                                                    <span className="text-[10px] text-blue-400">(أساسي)</span>
                                                </div>
                                            )}

                                            {/* Secondary Company Links (from UserCompany table) */}
                                            {user.userCompanies && user.userCompanies.length > 0 ? (
                                                user.userCompanies
                                                    .filter(link => !user.company || link.companyId !== user.company.id)
                                                    .map((link) => (
                                                        <div
                                                            key={`${user.id}-${link.companyId}`}
                                                            className="group flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full border border-gray-200 dark:border-gray-600"
                                                        >
                                                            <BuildingOfficeIcon className="h-3.5 w-3.5 text-gray-500" />
                                                            <span className="text-sm font-medium">{link.company.name}</span>
                                                            <span className="text-[10px] text-gray-400">({link.role})</span>
                                                            <button
                                                                onClick={() => handleRemoveAccess(user.id, link.companyId)}
                                                                className="text-red-400 hover:text-red-600 transition-colors"
                                                                title="إزالة الوصول"
                                                            >
                                                                <TrashIcon className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    ))
                                            ) : (
                                                !user.company && <span className="text-xs text-gray-400 italic">لا يوجد شركات مرتبطة</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setShowAddModal(true);
                                                    setCompanySearch('');
                                                }}
                                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-bold text-sm bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-all"
                                            >
                                                <PlusIcon className="h-4 w-4" />
                                                ربط بشركة
                                            </button>
                                            {user.company && user.company.id !== getCurrentSystemCompanyId() && (
                                                <button
                                                    onClick={() => handleSetPrimaryCompany(user.id, `${user.firstName} ${user.lastName}`)}
                                                    className="inline-flex items-center gap-1 text-yellow-600 hover:text-yellow-700 font-bold text-sm bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1.5 rounded-lg transition-all"
                                                    title="تعيين شركة النظام كشركة أساسية"
                                                >
                                                    ⚙️ تصحيح
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Context Modal */}
            {showAddModal && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <BuildingOfficeIcon className="h-6 w-6 text-blue-500" />
                                ربط {selectedUser.firstName} بشركة جديدة
                            </h3>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الدور داخل الشركة</label>
                                <select
                                    className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value)}
                                >
                                    <option value="OWNER">مالك الشركة (Owner)</option>
                                    <option value="COMPANY_ADMIN">مدير الشركة (Admin)</option>
                                    <option value="MANAGER">مدير قسم (Manager)</option>
                                    <option value="AGENT">موظف عادي (Agent)</option>
                                </select>
                            </div>

                            <div className="flex flex-col h-[350px]">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">اختر الشركة</label>
                                <div className="relative mb-3">
                                    <MagnifyingGlassIcon className="h-5 w-5 absolute right-3 top-3 text-gray-400" />
                                    <input
                                        type="text"
                                        className="w-full pr-10 pl-4 py-2.5 border rounded-xl dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="بحث عن اسم أو Slug..."
                                        value={companySearch}
                                        onChange={(e) => setCompanySearch(e.target.value)}
                                        autoFocus
                                    />
                                </div>

                                <div className="flex-1 overflow-y-auto border rounded-xl dark:border-gray-600 divide-y dark:divide-gray-700 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                                    {filteredCompanies.length > 0 ? (
                                        filteredCompanies.map(c => (
                                            <button
                                                key={c.id}
                                                onClick={() => handleAddAccess(c.id)}
                                                className="w-full flex items-center justify-between p-4 text-right hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                                                        <BuildingOfficeIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{c.name}</p>
                                                        <p className="text-xs text-gray-400 tracking-wider">@{c.slug}</p>
                                                    </div>
                                                </div>
                                                <PlusIcon className="h-5 w-5 text-gray-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all" />
                                            </button>
                                        ))
                                    ) : (
                                        <div className="p-10 text-center text-gray-400 flex flex-col items-center gap-2">
                                            <ExclamationCircleIcon className="h-8 w-8 opacity-20" />
                                            <span className="text-sm italic">لا توجد نتائج تطابق بحثك</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 flex justify-end">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="px-6 py-2 text-gray-500 hover:text-gray-700 font-bold text-sm transition-colors"
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

export default StaffCompanyAccess;
