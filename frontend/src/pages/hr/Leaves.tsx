import React, { useState, useEffect } from 'react';
import {
  Calendar, Plus, Check, X,
  Clock, ChevronLeft, ChevronRight, Download, Eye,
  Palmtree, Stethoscope, Baby, Heart, GraduationCap, AlertTriangle,
  FileText
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/services/api';
import { toast } from 'sonner';

interface LeaveRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: string;
  reason: string;
  createdAt: string;
  approvedAt: string | null;
  rejectionReason: string | null;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string;
    department: { name: string } | null;
  };
  approver: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

const leaveTypeConfig: Record<string, { label: string; icon: any; color: string }> = {
  ANNUAL: { label: 'سنوية', icon: Palmtree, color: 'bg-green-100 text-green-800' },
  SICK: { label: 'مرضية', icon: Stethoscope, color: 'bg-red-100 text-red-800' },
  UNPAID: { label: 'بدون راتب', icon: Calendar, color: 'bg-gray-100 text-gray-800' },
  MATERNITY: { label: 'أمومة', icon: Baby, color: 'bg-pink-100 text-pink-800' },
  PATERNITY: { label: 'أبوة', icon: Baby, color: 'bg-blue-100 text-blue-800' },
  BEREAVEMENT: { label: 'عزاء', icon: Heart, color: 'bg-purple-100 text-purple-800' },
  MARRIAGE: { label: 'زواج', icon: Heart, color: 'bg-rose-100 text-rose-800' },
  HAJJ: { label: 'حج', icon: Calendar, color: 'bg-amber-100 text-amber-800' },
  STUDY: { label: 'دراسية', icon: GraduationCap, color: 'bg-indigo-100 text-indigo-800' },
  EMERGENCY: { label: 'طارئة', icon: AlertTriangle, color: 'bg-orange-100 text-orange-800' },
  OTHER: { label: 'أخرى', icon: Calendar, color: 'bg-slate-100 text-slate-800' },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'قيد الانتظار', color: 'bg-yellow-100 text-yellow-800' },
  APPROVED: { label: 'موافق عليه', color: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'مرفوض', color: 'bg-red-100 text-red-800' },
  CANCELLED: { label: 'ملغي', color: 'bg-gray-100 text-gray-800' },
};

const Leaves: React.FC = () => {
  const location = useLocation();
  const isMyLeaves = location.pathname === '/my-leaves';
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Form state
  const [formData, setFormData] = useState({
    employeeId: '',
    type: 'ANNUAL',
    startDate: '',
    endDate: '',
    reason: '',
    isHalfDay: false,
    halfDayPeriod: ''
  });

  useEffect(() => {
    fetchLeaveRequests();
    fetchEmployees();
  }, [pagination.page, statusFilter, typeFilter, activeTab]);

  useEffect(() => {
    if (location.state && (location.state as any).createNew) {
      setShowAddDialog(true);
      // Clear state to prevent reopening on refresh (optional, but good practice if possible, though react-router state persists)
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const fetchEmployees = async () => {
    if (isMyLeaves) return; // No need to fetch employees for my-leaves
    try {
      const response = await api.get('/hr/employees?limit=100');
      setEmployees(response.data.employees || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (activeTab === 'pending') {
        params.append('status', 'PENDING');
      } else if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      if (typeFilter && typeFilter !== 'all') params.append('type', typeFilter);

      const endpoint = isMyLeaves ? '/hr/leaves/my-history' : '/hr/leaves';
      const response = await api.get(`${endpoint}?${params}`);
      setRequests(response.data.requests);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages
      }));
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      toast.error('حدث خطأ أثناء جلب طلبات الإجازات');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      await api.post(`/hr/leaves/${requestId}/approve`);
      toast.success('تمت الموافقة على الطلب');
      fetchLeaveRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'المسؤول ليس له ملف موظف أو حدث خطأ');
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    try {
      await api.post(`/hr/leaves/${selectedRequest.id}/reject`, {
        reason: rejectionReason
      });
      toast.success('تم رفض الطلب');
      setShowRejectDialog(false);
      setSelectedRequest(null);
      setRejectionReason('');
      fetchLeaveRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'المسؤول ليس له ملف موظف أو حدث خطأ');
    }
  };

  const handleCancel = async (requestId: string) => {
    try {
      if (!confirm('هل أنت متأكد من إلغاء هذا الطلب؟')) return;

      await api.post(`/hr/leaves/${requestId}/cancel`);
      toast.success('تم إلغاء الطلب بنجاح');
      fetchLeaveRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء إلغاء الطلب');
    }
  };

  const handleAddRequest = async () => {
    try {
      setFieldErrors({});
      // For my-leaves, we don't send employeeId (backend infers it)
      // For admin, we must send it.
      const payload = {
        ...formData,
        totalDays: totalDaysCount
      };

      if (isMyLeaves) {
        delete (payload as any).employeeId;
      }

      await api.post('/hr/leaves', payload);
      toast.success('تم إنشاء طلب الإجازة بنجاح', {
        description: 'تم إرسال طلبك بنجاح وسيتم مراجعته قريباً',
        icon: <Check className="h-4 w-4 text-green-500" />
      });
      setShowAddDialog(false);
      resetForm();
      fetchLeaveRequests();
    } catch (error: any) {
      if (error.response?.data?.errors) {
        const errors: Record<string, string> = {};
        error.response.data.errors.forEach((err: any) => {
          errors[err.field] = err.message;
        });
        setFieldErrors(errors);
        toast.error('فشل التحقق من البيانات', {
          description: 'يرجى التأكد من الحقول المميزة باللون الأحمر'
        });
      } else {
        const message = error.response?.data?.message || 'حدث خطأ أثناء إرسال الطلب';
        const code = error.response?.data?.code;

        toast.error(message, {
          description: code === 'INSUFFICIENT_LEAVE_BALANCE' ? 'حاول طلب عدد أيام أقل أو نوع إجازة آخر' : undefined
        });
      }
    }
  };

  const calculateTotalDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (endDate < startDate) return -1;

    let days = 0;
    const current = new Date(startDate);
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      // Exclude Friday (5) and Saturday (6) to match backend logic
      if (dayOfWeek !== 5 && dayOfWeek !== 6) {
        days++;
      }
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  const totalDaysCount = calculateTotalDays(formData.startDate, formData.endDate);

  const resetForm = () => {
    setFormData({
      employeeId: '',
      type: 'ANNUAL',
      startDate: '',
      endDate: '',
      reason: '',
      isHalfDay: false,
      halfDayPeriod: ''
    });
  };

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isMyLeaves ? 'إجازاتي' : 'إدارة الإجازات'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {pagination.total} طلب إجازة
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Download className="h-4 w-4 ml-2" />
            تصدير
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 ml-2" />
            طلب إجازة جديد
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm">قيد الانتظار</p>
                <h3 className="text-3xl font-bold mt-1">{pendingCount}</h3>
              </div>
              <Clock className="h-10 w-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">موافق عليها</p>
                <h3 className="text-3xl font-bold mt-1 text-green-600">
                  {requests.filter(r => r.status === 'APPROVED').length}
                </h3>
              </div>
              <Check className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">مرفوضة</p>
                <h3 className="text-3xl font-bold mt-1 text-red-600">
                  {requests.filter(r => r.status === 'REJECTED').length}
                </h3>
              </div>
              <X className="h-10 w-10 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">إجمالي الأيام</p>
                <h3 className="text-3xl font-bold mt-1 text-blue-600">
                  {requests.filter(r => r.status === 'APPROVED').reduce((sum, r) => sum + r.totalDays, 0)}
                </h3>
              </div>
              <Calendar className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Filters */}
      <Card>
        <CardContent className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <TabsList>
                <TabsTrigger value="all">الكل</TabsTrigger>
                <TabsTrigger value="pending" className="relative">
                  قيد الانتظار
                  {pendingCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-red-500">
                      {pendingCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <div className="flex gap-4">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="نوع الإجازة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {Object.entries(leaveTypeConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {activeTab === 'all' && (
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Leave Requests Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Calendar className="h-12 w-12 mb-4 opacity-50" />
              <p>لا توجد طلبات إجازات</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {!isMyLeaves && <TableHead className="text-right">الموظف</TableHead>}
                  <TableHead className="text-right">نوع الإجازة</TableHead>
                  <TableHead className="text-right">من</TableHead>
                  <TableHead className="text-right">إلى</TableHead>
                  <TableHead className="text-right">المدة</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => {
                  const typeConfig = leaveTypeConfig[request.type] || leaveTypeConfig['OTHER'];
                  const TypeIcon = typeConfig?.icon || Calendar;

                  return (
                    <TableRow key={request.id}>
                      {!isMyLeaves && (
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={request.employee?.avatar} />
                              <AvatarFallback>
                                {request.employee?.firstName?.[0]}{request.employee?.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {request.employee?.firstName} {request.employee?.lastName}
                              </p>
                              <p className="text-sm text-gray-500">
                                {request.employee?.department?.name}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge className={typeConfig?.color || 'bg-gray-100'}>
                          <TypeIcon className="h-3 w-3 ml-1" />
                          {typeConfig?.label || request.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(request.startDate).toLocaleDateString('ar-EG')}
                      </TableCell>
                      <TableCell>
                        {new Date(request.endDate).toLocaleDateString('ar-EG')}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{request.totalDays}</span> يوم
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig[request.status]?.color || ''}>
                          {statusConfig[request.status]?.label || request.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {request.status === 'PENDING' && !isMyLeaves && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleApprove(request.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowRejectDialog(true);
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}

                          {request.status === 'PENDING' && isMyLeaves && (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="bg-orange-500 hover:bg-orange-600"
                              onClick={() => handleCancel(request.id)}
                            >
                              إلغاء
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowDetailsDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-sm text-gray-500">
              عرض {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} من {pagination.total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add Leave Request Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <DialogHeader className="text-right">
            <DialogTitle className="text-2xl font-bold flex items-center justify-end gap-2">
              <Plus className="h-6 w-6 text-primary" />
              طلب إجازة جديد
            </DialogTitle>
            <DialogDescription className="text-right text-gray-500 dark:text-gray-400">
              قم بملء النموذج التالي لتقديم طلب إجازة جديد.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Employee Selector - Hide in My Leaves mode */}
            {!isMyLeaves && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Eye className="h-4 w-4" />
                  الموظف
                </Label>
                <Select
                  value={formData.employeeId}
                  onValueChange={(value) => setFormData({ ...formData, employeeId: value })}
                >
                  <SelectTrigger className="w-full bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-right dir-rtl">
                    <SelectValue placeholder="اختر الموظف" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id} className="justify-end cursor-pointer">
                        <div className="flex items-center gap-2 flex-row-reverse">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={emp.avatar} />
                            <AvatarFallback className="text-[10px]">
                              {emp.firstName?.[0]}{emp.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span>{emp.firstName} {emp.lastName}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors['employeeId'] && (
                  <p className="text-xs text-red-500 mt-1 mr-1">{fieldErrors['employeeId']}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Palmtree className="h-4 w-4" />
                نوع الإجازة
              </Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger className={`w-full bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-right dir-rtl ${fieldErrors['type'] ? 'border-red-500 ring-red-500' : ''}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                  {Object.entries(leaveTypeConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key} className="justify-end cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-800">
                      <div className="flex items-center gap-2 flex-row-reverse">
                        <config.icon className={`h-4 w-4 ${config.color.split(' ')[1]}`} />
                        <span>{config.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors['type'] && (
                <p className="text-xs text-red-500 mt-1 mr-1">{fieldErrors['type']}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Calendar className="h-4 w-4" />
                  من تاريخ
                </Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className={`bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 ${fieldErrors['startDate'] ? 'border-red-500' : ''}`}
                />
                {fieldErrors['startDate'] && (
                  <p className="text-xs text-red-500 mt-1 mr-1">{fieldErrors['startDate']}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Calendar className="h-4 w-4" />
                  إلى تاريخ
                </Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className={`bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 ${fieldErrors['endDate'] ? 'border-red-500' : ''}`}
                />
                {fieldErrors['endDate'] && (
                  <p className="text-xs text-red-500 mt-1 mr-1">{fieldErrors['endDate']}</p>
                )}
              </div>
            </div>

            {/* Duration Display */}
            {formData.startDate && formData.endDate && (
              <div className={`p-4 rounded-lg flex items-center justify-between ${totalDaysCount === -1
                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30'
                : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30'
                }`}>
                <div className="flex items-center gap-2">
                  {totalDaysCount === -1 ? (
                    <AlertTriangle className="h-5 w-5" />
                  ) : (
                    <Clock className="h-5 w-5" />
                  )}
                  <span className="font-medium">
                    {totalDaysCount === -1
                      ? 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية'
                      : totalDaysCount === 0
                        ? 'الأيام المحددة هي أيام عطلة (جمعة/سبت)'
                        : `مدة الإجازة: ${totalDaysCount} يوم`}
                  </span>
                </div>
              </div>
            )}

            <div className={`p-3 rounded-lg border transition-colors ${formData.isHalfDay ? 'bg-primary/5 border-primary/20' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
              <div className="flex items-center justify-between flex-row-reverse">
                <div className="flex items-center gap-3 flex-row-reverse">
                  <div className="p-2 bg-white dark:bg-gray-900 rounded-md border border-gray-100 dark:border-gray-700">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-right">
                    <Label className="text-sm font-medium">نصف يوم</Label>
                    <p className="text-xs text-gray-500">تقديم طلب لنصف يوم عمل فقط</p>
                  </div>
                </div>
                <Checkbox
                  id="isHalfDay"
                  checked={formData.isHalfDay}
                  onCheckedChange={(checked: boolean) => setFormData({ ...formData, isHalfDay: checked })}
                />
              </div>

              {formData.isHalfDay && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <Label className="text-xs text-gray-500 block text-right">فترة نصف اليوم</Label>
                  <Select
                    value={formData.halfDayPeriod}
                    onValueChange={(value) => setFormData({ ...formData, halfDayPeriod: value })}
                  >
                    <SelectTrigger className={`w-full bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-right ${fieldErrors['halfDayPeriod'] ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder="اختر الفترة" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                      <SelectItem value="MORNING" className="justify-end">الفترة الصباحية</SelectItem>
                      <SelectItem value="AFTERNOON" className="justify-end">الفترة المسائية</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldErrors['halfDayPeriod'] && (
                    <p className="text-xs text-red-500 mt-1 mr-1">{fieldErrors['halfDayPeriod']}</p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <FileText className="h-4 w-4" />
                السبب
              </Label>
              <Textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="أدخل سبب طلب الإجازة..."
                rows={3}
                className={`bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-right ${fieldErrors['reason'] ? 'border-red-500' : ''}`}
              />
              {fieldErrors['reason'] && (
                <p className="text-xs text-red-500 mt-1 mr-1">{fieldErrors['reason']}</p>
              )}
            </div>
          </div>

          <DialogFooter className="flex-row-reverse sm:justify-start gap-2">
            <Button
              onClick={handleAddRequest}
              disabled={totalDaysCount <= 0 || !formData.startDate || !formData.endDate || (!isMyLeaves && !formData.employeeId)}
              className="bg-primary hover:bg-primary/90 text-white w-full sm:w-auto"
            >
              إرسال الطلب
            </Button>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="w-full sm:w-auto">
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تفاصيل طلب الإجازة</DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedRequest.employee?.avatar} />
                  <AvatarFallback>
                    {selectedRequest.employee?.firstName?.[0]}{selectedRequest.employee?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">
                    {selectedRequest.employee?.firstName} {selectedRequest.employee?.lastName}
                  </h3>
                  <p className="text-gray-500">{selectedRequest.employee?.department?.name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">نوع الإجازة</Label>
                  <p className="font-medium">{leaveTypeConfig[selectedRequest.type]?.label}</p>
                </div>
                <div>
                  <Label className="text-gray-500">الحالة</Label>
                  <Badge className={statusConfig[selectedRequest.status]?.color || ''}>
                    {statusConfig[selectedRequest.status]?.label || selectedRequest.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-gray-500">من</Label>
                  <p className="font-medium">{new Date(selectedRequest.startDate).toLocaleDateString('ar-EG')}</p>
                </div>
                <div>
                  <Label className="text-gray-500">إلى</Label>
                  <p className="font-medium">{new Date(selectedRequest.endDate).toLocaleDateString('ar-EG')}</p>
                </div>
                <div>
                  <Label className="text-gray-500">المدة</Label>
                  <p className="font-medium">{selectedRequest.totalDays} يوم</p>
                </div>
                <div>
                  <Label className="text-gray-500">تاريخ الطلب</Label>
                  <p className="font-medium">{new Date(selectedRequest.createdAt).toLocaleDateString('ar-EG')}</p>
                </div>
              </div>

              {selectedRequest.reason && (
                <div>
                  <Label className="text-gray-500">السبب</Label>
                  <p className="mt-1">{selectedRequest.reason}</p>
                </div>
              )}

              {selectedRequest.rejectionReason && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <Label className="text-red-600">سبب الرفض</Label>
                  <p className="mt-1 text-red-700">{selectedRequest.rejectionReason}</p>
                </div>
              )}

              {selectedRequest.approver && (
                <div>
                  <Label className="text-gray-500">تمت المراجعة بواسطة</Label>
                  <p className="font-medium">
                    {selectedRequest.approver.firstName} {selectedRequest.approver.lastName}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض طلب الإجازة</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p>هل أنت متأكد من رفض طلب الإجازة؟</p>
            <div className="space-y-2">
              <Label>سبب الرفض</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="أدخل سبب الرفض..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              رفض الطلب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Leaves;
