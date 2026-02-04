import React, { useState, useEffect } from 'react';
import {
  Building2, Plus, Edit, Trash2, Users, MoreVertical,
  ChevronRight, Palette, UserCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import api from '@/services/api';
import { toast } from 'sonner';

interface Department {
  id: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  color: string;
  isActive: boolean;
  parentId: string | null;
  managerId: string | null;
  manager: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string;
  } | null;
  parent: {
    id: string;
    name: string;
  } | null;
  _count: {
    employees: number;
    positions: number;
    children: number;
  };
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  hasEmployeeRecord?: boolean;
}

const colorOptions = [
  { value: '#3B82F6', label: 'أزرق' },
  { value: '#10B981', label: 'أخضر' },
  { value: '#F59E0B', label: 'برتقالي' },
  { value: '#EF4444', label: 'أحمر' },
  { value: '#8B5CF6', label: 'بنفسجي' },
  { value: '#EC4899', label: 'وردي' },
  { value: '#06B6D4', label: 'سماوي' },
  { value: '#84CC16', label: 'ليموني' },
];

const Departments: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    nameEn: '',
    description: '',
    color: '#3B82F6',
    parentId: 'none',
    managerId: 'none',
    isActive: true
  });

  useEffect(() => {
    fetchDepartments();
    fetchEmployees();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/hr/departments?includeInactive=true');
      setDepartments(response.data.departments);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('حدث خطأ أثناء جلب الأقسام');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/hr/employees?limit=100');
      setEmployees(response.data.employees);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleAddDepartment = async () => {
    try {
      const submitData = {
        ...formData,
        parentId: formData.parentId === 'none' ? null : formData.parentId || null,
        managerId: formData.managerId === 'none' ? null : formData.managerId || null,
      };
      await api.post('/hr/departments', submitData);
      toast.success('تم إضافة القسم بنجاح');
      setShowAddDialog(false);
      resetForm();
      fetchDepartments();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ أثناء إضافة القسم');
    }
  };

  const handleEditDepartment = async () => {
    if (!selectedDepartment) return;

    try {
      const submitData = {
        ...formData,
        parentId: formData.parentId === 'none' ? null : formData.parentId || null,
        managerId: formData.managerId === 'none' ? null : formData.managerId || null,
      };
      await api.put(`/hr/departments/${selectedDepartment.id}`, submitData);
      toast.success('تم تحديث القسم بنجاح');
      setShowEditDialog(false);
      setSelectedDepartment(null);
      resetForm();
      fetchDepartments();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ أثناء تحديث القسم');
    }
  };

  const handleDeleteDepartment = async () => {
    if (!selectedDepartment) return;

    try {
      await api.delete(`/hr/departments/${selectedDepartment.id}`);
      toast.success('تم حذف القسم بنجاح');
      setShowDeleteDialog(false);
      setSelectedDepartment(null);
      fetchDepartments();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ أثناء حذف القسم');
    }
  };

  const openEditDialog = (dept: Department) => {
    setSelectedDepartment(dept);
    setFormData({
      name: dept.name,
      nameEn: dept.nameEn || '',
      description: dept.description || '',
      color: dept.color || '#3B82F6',
      parentId: dept.parentId || 'none',
      managerId: dept.managerId || 'none',
      isActive: dept.isActive
    });
    setShowEditDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      nameEn: '',
      description: '',
      color: '#3B82F6',
      parentId: 'none',
      managerId: 'none',
      isActive: true
    });
  };

  const totalEmployees = departments.reduce((sum, d) => sum + d._count.employees, 0);

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            إدارة الأقسام
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {departments.length} قسم • {totalEmployees} موظف
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 ml-2" />
          إضافة قسم
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">إجمالي الأقسام</p>
                <h3 className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{departments.length}</h3>
              </div>
              <Building2 className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">الأقسام النشطة</p>
                <h3 className="text-3xl font-bold mt-1 text-green-600 dark:text-green-400">
                  {departments.filter(d => d.isActive).length}
                </h3>
              </div>
              <Building2 className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">إجمالي الموظفين</p>
                <h3 className="text-3xl font-bold mt-1 text-blue-600 dark:text-blue-400">{totalEmployees}</h3>
              </div>
              <Users className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Departments Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : departments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <Building2 className="h-12 w-12 mb-4 opacity-50" />
            <p>لا توجد أقسام</p>
            <Button
              variant="link"
              className="mt-2"
              onClick={() => setShowAddDialog(true)}
            >
              إضافة قسم جديد
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <Card key={dept.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: dept.color || '#3B82F6' }}
                    />
                    <div>
                      <CardTitle className="text-lg text-gray-900 dark:text-white">{dept.name}</CardTitle>
                      {dept.nameEn && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{dept.nameEn}</p>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(dept)}>
                        <Edit className="h-4 w-4 ml-2" />
                        تعديل
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => {
                          setSelectedDepartment(dept);
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 ml-2" />
                        حذف
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                {dept.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {dept.description}
                  </p>
                )}

                <div className="space-y-3">
                  {/* Manager */}
                  {dept.manager && (
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">المدير:</span>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={dept.manager.avatar} />
                          <AvatarFallback className="text-xs">
                            {dept.manager.firstName?.[0]}{dept.manager.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-200">
                          {dept.manager.firstName} {dept.manager.lastName}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Parent Department */}
                  {dept.parent && (
                    <div className="flex items-center gap-2">
                      <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">تابع لـ:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-200">{dept.parent.name}</span>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-200">{dept._count.employees}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">موظف</span>
                    </div>
                    {dept._count.children > 0 && (
                      <div className="flex items-center gap-1">
                        <Building2 className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-200">{dept._count.children}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">قسم فرعي</span>
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex justify-end">
                    <Badge variant={dept.isActive ? 'default' : 'secondary'}>
                      {dept.isActive ? 'نشط' : 'غير نشط'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Department Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">إضافة قسم جديد</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">اسم القسم *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: قسم المبيعات"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">الاسم بالإنجليزية</Label>
              <Input
                value={formData.nameEn}
                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                placeholder="e.g. Sales Department"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">الوصف</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="وصف مختصر للقسم..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">اللون</Label>
              <div className="flex gap-2 flex-wrap">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === color.value
                      ? 'border-gray-900 dark:border-gray-100 scale-110'
                      : 'border-transparent'
                      }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">القسم الأب</Label>
              <Select
                value={formData.parentId}
                onValueChange={(value) => setFormData({ ...formData, parentId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر القسم الأب (اختياري)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">مدير القسم</Label>
              <Select
                value={formData.managerId}
                onValueChange={(value) => setFormData({ ...formData, managerId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر مدير القسم (اختياري)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون</SelectItem>
                  {employees
                    .filter(emp => emp.hasEmployeeRecord)
                    .map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between gap-4 py-2">
              <Label htmlFor="isActive-add" className="text-gray-700 dark:text-gray-300 cursor-pointer">القسم نشط</Label>
              <Switch
                id="isActive-add"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-600"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="w-full sm:w-auto">
              إلغاء
            </Button>
            <Button onClick={handleAddDepartment} className="w-full sm:w-auto">
              إضافة القسم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Department Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">تعديل القسم</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">اسم القسم *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">الاسم بالإنجليزية</Label>
              <Input
                value={formData.nameEn}
                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">الوصف</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">اللون</Label>
              <div className="flex gap-2 flex-wrap">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === color.value
                      ? 'border-gray-900 dark:border-gray-100 scale-110'
                      : 'border-transparent'
                      }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setFormData({ ...formData, color: color.value })}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">القسم الأب</Label>
              <Select
                value={formData.parentId}
                onValueChange={(value) => setFormData({ ...formData, parentId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر القسم الأب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون</SelectItem>
                  {departments
                    .filter(d => d.id !== selectedDepartment?.id)
                    .map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">مدير القسم</Label>
              <Select
                value={formData.managerId}
                onValueChange={(value) => setFormData({ ...formData, managerId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر مدير القسم" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون</SelectItem>
                  {employees
                    .filter(emp => emp.hasEmployeeRecord)
                    .map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between gap-4 py-2">
              <Label htmlFor="isActive-edit" className="text-gray-700 dark:text-gray-300 cursor-pointer">القسم نشط</Label>
              <Switch
                id="isActive-edit"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-600"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowEditDialog(false)} className="w-full sm:w-auto">
              إلغاء
            </Button>
            <Button onClick={handleEditDepartment} className="w-full sm:w-auto">
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">تأكيد الحذف</DialogTitle>
          </DialogHeader>
          <p className="py-4 text-gray-700 dark:text-gray-300">
            هل أنت متأكد من حذف قسم "{selectedDepartment?.name}"؟
            {selectedDepartment?._count.employees && selectedDepartment._count.employees > 0 && (
              <span className="block text-red-500 text-sm mt-2">
                ⚠️ هذا القسم يحتوي على {selectedDepartment._count.employees} موظف
              </span>
            )}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleDeleteDepartment}>
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Departments;
