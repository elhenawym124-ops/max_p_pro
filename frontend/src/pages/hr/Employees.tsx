import React, { useState, useEffect } from 'react';
import {
  Users, Plus, Search, MoreVertical, Edit, Trash2,
  Eye, Download, Upload, Loader2, Clock, Shield
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { toast } from 'sonner';
import { validateEmployeeData, getErrorMessage, hasError, ValidationError } from '@/utils/hrValidation';
import { EmployeeTableSkeleton } from '@/components/hr/SkeletonLoader';
import { EmptyState } from '@/components/hr/EmptyState';
import { EnhancedPagination } from '@/components/hr/EnhancedPagination';
import { useDebounce } from '@/hooks/useDebounce';

interface Employee {
  id: string;
  userId?: string | null;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar: string;
  status: string;
  contractType: string;
  hireDate: string;
  department: { id: string; name: string; color: string } | null;
  position: { id: string; title: string; level: number } | null;
  manager: { id: string; firstName: string; lastName: string; avatar: string } | null;
  // ✅ User (HR Integration) data
  user: {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
    isEmailVerified: boolean;
    lastLoginAt: string | null;
    createdAt: string;
  } | null;
}

interface Department {
  id: string;
  name: string;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'نشط', color: 'bg-green-100 text-green-800' },
  ON_LEAVE: { label: 'في إجازة', color: 'bg-yellow-100 text-yellow-800' },
  SUSPENDED: { label: 'موقوف', color: 'bg-red-100 text-red-800' },
  TERMINATED: { label: 'منتهي', color: 'bg-gray-100 text-gray-800' },
  RESIGNED: { label: 'مستقيل', color: 'bg-orange-100 text-orange-800' },
};

const contractLabels: Record<string, string> = {
  FULL_TIME: 'دوام كامل',
  PART_TIME: 'دوام جزئي',
  CONTRACT: 'عقد',
  TEMPORARY: 'مؤقت',
  INTERNSHIP: 'تدريب',
  FREELANCE: 'حر',
};

const Employees: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 500);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [contractFilter, setContractFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState(''); // ✅ Add User Status filter

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    mobile: '',
    password: '', // User field
    role: 'AGENT', // User field
    departmentId: '',
    positionId: '',
    hireDate: new Date().toISOString().split('T')[0],
    contractType: 'FULL_TIME',
    baseSalary: '',
    nationalId: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    city: '',
    country: 'مصر',
    // Deduction settings
    enableAutoDeduction: true,
    monthlyGraceMinutes: 60,
    maxDailyLateMinutes: 10,
    lateDeductionRate: '',
  });

  useEffect(() => {
    setSearch(debouncedSearch);
  }, [debouncedSearch]);

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, [pagination.page, search, statusFilter, departmentFilter, contractFilter, userStatusFilter]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (search) params.append('search', search);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (departmentFilter && departmentFilter !== 'all') params.append('departmentId', departmentFilter);
      if (contractFilter && contractFilter !== 'all') params.append('contractType', contractFilter);
      if (userStatusFilter && userStatusFilter !== 'all') params.append('userStatus', userStatusFilter); // ✅ Add User Status filter

      const response = await api.get(`/hr/employees?${params}`);
      setEmployees(response.data.employees);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages
      }));
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('حدث خطأ أثناء جلب الموظفين');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/hr/departments');
      setDepartments(response.data.departments);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const handleAddEmployee = async () => {
    // Frontend Validation
    const result = validateEmployeeData(formData);
    if (!result.isValid) {
      setErrors(result.errors);
      toast.error('يرجى تصحيح الأخطاء في النموذج');
      return;
    }

    // Check if email is already being used in the current list
    const emailExists = employees.some(emp =>
      emp.email && emp.email.toLowerCase() === formData.email.toLowerCase()
    );

    if (emailExists) {
      toast.error('البريد الإلكتروني مستخدم بالفعل في هذه الشركة');
      return;
    }

    try {
      setSubmitting(true);
      setErrors([]);
      await api.post('/hr/employees', formData);
      toast.success('تم إضافة الموظف بنجاح');
      setShowAddDialog(false);
      resetForm();
      fetchEmployees();
    } catch (error: any) {
      console.error('❌ Frontend error creating employee:', error);
      console.error('❌ Error response:', error.response);

      let errorMsg = error.response?.data?.error || error.response?.data?.message || 'حدث خطأ أثناء إضافة الموظف';

      // Handle specific error codes
      if (error.response?.status === 409) {
        errorMsg = error.response?.data?.error || 'هذا الموظف موجود بالفعل';
      } else if (error.response?.status === 400) {
        errorMsg = error.response?.data?.error || 'بيانات غير صحيحة';
      }

      toast.error(errorMsg);

      // Handle backend validation errors
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEmployee = async (employeeToDelete: Employee) => {
    const previousEmployees = employees;
    const previousPagination = pagination;

    try {
      setDeleting(true);

      setEmployees(prev => prev.filter(emp => emp.id !== employeeToDelete.id));
      setPagination(prev => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
      }));

      await api.delete(`/hr/employees/${employeeToDelete.id}`);
      toast.success('تم حذف الموظف بنجاح');
      fetchEmployees();
    } catch (error: any) {
      setEmployees(previousEmployees);
      setPagination(previousPagination);
      toast.error(error.response?.data?.error || 'حدث خطأ أثناء حذف الموظف');
    } finally {
      setDeleting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      mobile: '',
      password: '', // User field
      role: 'AGENT', // User field
      departmentId: '',
      positionId: '',
      hireDate: new Date().toISOString().split('T')[0],
      contractType: 'FULL_TIME',
      baseSalary: '',
      nationalId: '',
      dateOfBirth: '',
      gender: '',
      address: '',
      city: '',
      country: 'مصر',
      enableAutoDeduction: true,
      monthlyGraceMinutes: 60,
      maxDailyLateMinutes: 10,
      lateDeductionRate: '',
    });
    setErrors([]);
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">الموظفون</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">إدارة بيانات الموظفين</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setShowAddDialog(true)} className="bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800">
            <Plus className="h-4 w-4 ml-2" />
            إضافة موظف
          </Button>
          <Button variant="outline" className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
            <Upload className="h-4 w-4 ml-2" />
            استيراد
          </Button>
          <Button variant="outline" className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
            <Download className="h-4 w-4 ml-2" />
            تصدير
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
              <Input
                placeholder="البحث في الموظفين..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pr-10 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                <SelectValue placeholder="حالة الموظف" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <SelectItem value="all" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">جميع الحالات</SelectItem>
                <SelectItem value="ACTIVE" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">نشط</SelectItem>
                <SelectItem value="INACTIVE" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">غير نشط</SelectItem>
                <SelectItem value="TERMINATED" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">منتهي الخدمة</SelectItem>
              </SelectContent>
            </Select>

            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                <SelectValue placeholder="القسم" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <SelectItem value="all" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">جميع الأقسام</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id} className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={contractFilter} onValueChange={setContractFilter}>
              <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                <SelectValue placeholder="نوع العقد" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <SelectItem value="all" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">جميع الأنواع</SelectItem>
                <SelectItem value="FULL_TIME" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">دوام كامل</SelectItem>
                <SelectItem value="PART_TIME" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">دوام جزئي</SelectItem>
                <SelectItem value="CONTRACT" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">عقد</SelectItem>
                <SelectItem value="INTERNSHIP" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">تدريب</SelectItem>
              </SelectContent>
            </Select>

            {/* ✅ User Status Filter */}
            <Select value={userStatusFilter} onValueChange={setUserStatusFilter}>
              <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                <SelectValue placeholder="حالة الحساب" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <SelectItem value="all" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">جميع الحسابات</SelectItem>
                <SelectItem value="HAS_USER" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">لديه حساب</SelectItem>
                <SelectItem value="NO_USER" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">لا يوجد حساب</SelectItem>
                <SelectItem value="ACTIVE_USER" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">حساب نشط</SelectItem>
                <SelectItem value="INACTIVE_USER" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">حساب غير نشط</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employees Table */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="p-0">
          {loading ? (
            <EmployeeTableSkeleton />
          ) : employees.length === 0 ? (
            <EmptyState
              icon={Users}
              title="لا يوجد موظفين بعد"
              description="ابدأ بإضافة موظفيك لإدارة الحضور والرواتب والإجازات بكل سهولة"
              actionLabel="إضافة أول موظف"
              onAction={() => setShowAddDialog(true)}
              secondaryActionLabel="استيراد من Excel"
              secondaryIcon={Upload}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الموظف</TableHead>
                  <TableHead className="text-right">القسم</TableHead>
                  <TableHead className="text-right">المنصب</TableHead>
                  <TableHead className="text-right">حساب المستخدم</TableHead>
                  <TableHead className="text-right">الصلاحية</TableHead>
                  <TableHead className="text-right">نوع العقد</TableHead>
                  <TableHead className="text-right">تاريخ التعيين</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          {employee.avatar ? (
                            <AvatarImage
                              src={employee.avatar.startsWith('http') ? employee.avatar : `https://maxp-ai.pro${employee.avatar}`}
                              onError={(e) => {
                                e.currentTarget.src = `https://ui-avatars.com/api/?name=${employee.firstName}+${employee.lastName}&background=random`;
                              }}
                            />
                          ) : (
                            <AvatarFallback>
                              {employee.firstName?.[0]}{employee.lastName?.[0]}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {employee.firstName || 'غير محدد'} {employee.lastName || ''}
                          </p>
                          <p className="text-sm text-gray-500">
                            {employee.employeeNumber || 'غير محدد'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {employee.department ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: employee.department.color || '#6B7280' }}
                          />
                          {employee.department.name || 'غير محدد'}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {employee.position?.title || <span className="text-gray-400">-</span>}
                    </TableCell>
                    {/* ✅ User Account Status */}
                    <TableCell>
                      {employee.user ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Badge className={employee.user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {employee.user.isActive ? 'نشط' : 'غير نشط'}
                            </Badge>
                            {employee.user.isEmailVerified && (
                              <Badge className="bg-blue-100 text-blue-800 text-xs">✓ محقق</Badge>
                            )}
                          </div>
                          {employee.user.lastLoginAt && (
                            <span className="text-xs text-gray-500">
                              آخر دخول: {new Date(employee.user.lastLoginAt).toLocaleDateString('ar-EG')}
                            </span>
                          )}
                          {!employee.user.lastLoginAt && (
                            <span className="text-xs text-gray-400">لم يسجل دخول بعد</span>
                          )}
                        </div>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-600">لا يوجد حساب</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {employee.user ? (
                        <Badge className="bg-purple-100 text-purple-800">
                          {employee.user.role === 'COMPANY_ADMIN' ? 'مدير شركة' :
                            employee.user.role === 'MANAGER' ? 'مدير' :
                              employee.user.role === 'AGENT' ? 'موظف' :
                                employee.user.role === 'AFFILIATE' ? 'مسوق بالعمولة' :
                                  employee.user.role || 'غير محدد'}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contractLabels[employee.contractType] || employee.contractType || 'غير محدد'}
                    </TableCell>
                    <TableCell>
                      {employee.hireDate ? new Date(employee.hireDate).toLocaleDateString('ar-EG') : 'غير محدد'}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusLabels[employee.status]?.color || ''}>
                        {statusLabels[employee.status]?.label || employee.status || 'غير محدد'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/hr/employees/${employee.id}`)}>
                            <Eye className="h-4 w-4 ml-2" />
                            عرض
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/hr/employees/${employee.id}/edit`)}>
                            <Edit className="h-4 w-4 ml-2" />
                            تعديل
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => {
                              handleDeleteEmployee(employee);
                            }}
                          >
                            <Trash2 className="h-4 w-4 ml-2" />
                            حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <EnhancedPagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            pageSize={pagination.limit}
            totalItems={pagination.total}
            onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
            onPageSizeChange={(limit) => setPagination(prev => ({ ...prev, limit, page: 1 }))}
          />
        )}
      </Card>

      {/* Add Employee Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إضافة موظف جديد</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>الاسم الأول *</Label>
              <Input
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="أدخل الاسم الأول"
                className={hasError(errors, 'firstName') ? 'border-red-500' : ''}
              />
              {hasError(errors, 'firstName') && (
                <p className="text-sm text-red-500">{getErrorMessage(errors, 'firstName')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>الاسم الأخير *</Label>
              <Input
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="أدخل الاسم الأخير"
                className={hasError(errors, 'lastName') ? 'border-red-500' : ''}
              />
              {hasError(errors, 'lastName') && (
                <p className="text-sm text-red-500">{getErrorMessage(errors, 'lastName')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="example@company.com"
                className={hasError(errors, 'email') ? 'border-red-500' : ''}
              />
              {hasError(errors, 'email') && (
                <p className="text-sm text-red-500">{getErrorMessage(errors, 'email')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>رقم الهاتف</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="01xxxxxxxxx"
                className={hasError(errors, 'phone') ? 'border-red-500' : ''}
              />
              {hasError(errors, 'phone') && (
                <p className="text-sm text-red-500">{getErrorMessage(errors, 'phone')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>كلمة المرور</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="كلمة المرور (اختياري)"
                className={hasError(errors, 'password') ? 'border-red-500' : ''}
              />
              {hasError(errors, 'password') && (
                <p className="text-sm text-red-500">{getErrorMessage(errors, 'password')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>الدور</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الدور" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AGENT">وكيل</SelectItem>
                  <SelectItem value="MANAGER">مدير</SelectItem>
                  <SelectItem value="COMPANY_ADMIN">مدير شركة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>القسم</Label>
              <Select
                value={formData.departmentId}
                onValueChange={(value) => setFormData({ ...formData, departmentId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر القسم" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>نوع العقد *</Label>
              <Select
                value={formData.contractType}
                onValueChange={(value) => setFormData({ ...formData, contractType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL_TIME">دوام كامل</SelectItem>
                  <SelectItem value="PART_TIME">دوام جزئي</SelectItem>
                  <SelectItem value="CONTRACT">عقد</SelectItem>
                  <SelectItem value="TEMPORARY">مؤقت</SelectItem>
                  <SelectItem value="INTERNSHIP">تدريب</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>تاريخ التعيين *</Label>
              <Input
                type="date"
                value={formData.hireDate}
                onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                className={hasError(errors, 'hireDate') ? 'border-red-500' : ''}
              />
              {hasError(errors, 'hireDate') && (
                <p className="text-sm text-red-500">{getErrorMessage(errors, 'hireDate')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>الراتب الأساسي</Label>
              <Input
                type="number"
                value={formData.baseSalary}
                onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                placeholder="0.00"
                className={hasError(errors, 'baseSalary') ? 'border-red-500' : ''}
              />
              {hasError(errors, 'baseSalary') && (
                <p className="text-sm text-red-500">{getErrorMessage(errors, 'baseSalary')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>رقم الهوية</Label>
              <Input
                value={formData.nationalId}
                onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                placeholder="رقم البطاقة الشخصية"
                className={hasError(errors, 'nationalId') ? 'border-red-500' : ''}
              />
              {hasError(errors, 'nationalId') && (
                <p className="text-sm text-red-500">{getErrorMessage(errors, 'nationalId')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>تاريخ الميلاد</Label>
              <Input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className={hasError(errors, 'dateOfBirth') ? 'border-red-500' : ''}
              />
              {hasError(errors, 'dateOfBirth') && (
                <p className="text-sm text-red-500">{getErrorMessage(errors, 'dateOfBirth')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>الجنس</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => setFormData({ ...formData, gender: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">ذكر</SelectItem>
                  <SelectItem value="FEMALE">أنثى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>المدينة</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="المدينة"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>العنوان</Label>
              <Textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="العنوان التفصيلي"
                rows={2}
              />
            </div>

            {/* Deduction Settings */}
            <div className="col-span-2 mt-4">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-orange-500" />
                <h3 className="font-bold">إعدادات التأخير والخصم</h3>
              </div>
              <Separator className="mb-4" />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg bg-orange-50/50 dark:bg-orange-950/10">
                  <div className="space-y-0.5">
                    <Label className="text-sm">تفعيل الخصم التلقائي</Label>
                    <p className="text-xs text-gray-500">إدراج الموظف في نظام الخصم الآلي</p>
                  </div>
                  <Switch
                    checked={formData.enableAutoDeduction}
                    onCheckedChange={(checked) => setFormData({ ...formData, enableAutoDeduction: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">معدل الخصم للدقيقة</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.lateDeductionRate}
                    onChange={(e) => setFormData({ ...formData, lateDeductionRate: e.target.value })}
                    placeholder="تلقائي بناءً على الراتب"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">رصيد التسامح الشهري (دقيقة)</Label>
                  <Input
                    type="number"
                    value={formData.monthlyGraceMinutes}
                    onChange={(e) => setFormData({ ...formData, monthlyGraceMinutes: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">حد التأخير اليومي (دقيقة)</Label>
                  <Input
                    type="number"
                    value={formData.maxDailyLateMinutes}
                    onChange={(e) => setFormData({ ...formData, maxDailyLateMinutes: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={submitting}>
              إلغاء
            </Button>
            <Button onClick={handleAddEmployee} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                'إضافة الموظف'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Employees;
