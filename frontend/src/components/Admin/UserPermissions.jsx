/**
 * صلاحيات المستخدمين
 * User Permissions Component
 */

import React, { useState } from 'react';

const UserPermissions = () => {
  const [users, setUsers] = useState([
    {
      id: 1,
      name: 'أحمد محمد',
      email: 'ahmed@company.com',
      role: 'admin',
      permissions: ['read', 'write', 'delete', 'manage_users'],
      status: 'active',
      lastLogin: '2024-01-16'
    },
    {
      id: 2,
      name: 'فاطمة علي',
      email: 'fatima@company.com',
      role: 'manager',
      permissions: ['read', 'write', 'manage_ai'],
      status: 'active',
      lastLogin: '2024-01-15'
    },
    {
      id: 3,
      name: 'محمد حسن',
      email: 'mohamed@company.com',
      role: 'operator',
      permissions: ['read'],
      status: 'inactive',
      lastLogin: '2024-01-10'
    }
  ]);

  const [roles] = useState({
    admin: {
      name: 'مدير النظام',
      permissions: ['read', 'write', 'delete', 'manage_users', 'manage_ai', 'manage_settings'],
      color: 'red'
    },
    manager: {
      name: 'مدير',
      permissions: ['read', 'write', 'manage_ai', 'view_analytics'],
      color: 'blue'
    },
    operator: {
      name: 'مشغل',
      permissions: ['read', 'view_analytics'],
      color: 'green'
    }
  });

  const toggleUserStatus = (userId) => {
    setUsers(prev => 
      prev.map(user => 
        user.id === userId 
          ? { ...user, status: user.status === 'active' ? 'inactive' : 'active' }
          : user
      )
    );
  };

  const changeUserRole = (userId, newRole) => {
    setUsers(prev => 
      prev.map(user => 
        user.id === userId 
          ? { ...user, role: newRole, permissions: roles[newRole].permissions }
          : user
      )
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            👥 صلاحيات المستخدمين
          </h1>
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
            + إضافة مستخدم جديد
          </button>
        </div>

        {/* Roles Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {Object.entries(roles).map(([roleKey, role]) => (
            <div key={roleKey} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <h3 className={`font-medium text-${role.color}-600 dark:text-${role.color}-400 mb-2`}>
                {role.name}
              </h3>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                الصلاحيات: {role.permissions.length}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {role.permissions.slice(0, 3).join(', ')}
                {role.permissions.length > 3 && '...'}
              </div>
            </div>
          ))}
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th className="px-6 py-3">المستخدم</th>
                <th className="px-6 py-3">الدور</th>
                <th className="px-6 py-3">الصلاحيات</th>
                <th className="px-6 py-3">الحالة</th>
                <th className="px-6 py-3">آخر دخول</th>
                <th className="px-6 py-3">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                      <div className="text-gray-500 dark:text-gray-400">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={user.role}
                      onChange={(e) => changeUserRole(user.id, e.target.value)}
                      className="p-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    >
                      {Object.entries(roles).map(([roleKey, role]) => (
                        <option key={roleKey} value={roleKey}>{role.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {user.permissions.slice(0, 2).map((permission) => (
                        <span
                          key={permission}
                          className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded"
                        >
                          {permission}
                        </span>
                      ))}
                      {user.permissions.length > 2 && (
                        <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                          +{user.permissions.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      user.status === 'active' 
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400'
                    }`}>
                      {user.status === 'active' ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-900 dark:text-white">
                    {user.lastLogin}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleUserStatus(user.id)}
                        className={`px-2 py-1 text-xs rounded ${
                          user.status === 'active'
                            ? 'bg-red-100 text-red-800 hover:bg-red-200'
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                        }`}
                      >
                        {user.status === 'active' ? 'إيقاف' : 'تفعيل'}
                      </button>
                      <button className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200">
                        تعديل
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserPermissions;
