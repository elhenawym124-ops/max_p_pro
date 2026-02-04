import React, { useState, useEffect } from 'react';
import {
  Clock, UserCheck, Calendar, Download,
  ChevronLeft, ChevronRight, Monitor,
  AlertCircle, CheckCircle, XCircle, Timer, MapPin,
  Pencil, Trash2
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import api from '@/services/api';
import { toast } from 'sonner';
import { envConfig } from '@/config/environment';

interface AttendanceRecord {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  checkInLocation: string | null;
  checkOutLocation: string | null;
  status: string;
  workHours: number | null;
  overtimeHours: number | null;
  lateMinutes: number | null;
  earlyLeaveMinutes: number | null;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string;
    employeeNumber: string;
    department: { name: string } | null;
  };
}

interface TodayStats {
  date: string;
  totalEmployees: number;
  present: number;
  late: number;
  absent: number;
  records: AttendanceRecord[];
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  PRESENT: { label: 'حاضر', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  ABSENT: { label: 'غائب', color: 'bg-red-100 text-red-800', icon: XCircle },
  LATE: { label: 'متأخر', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  HALF_DAY: { label: 'نصف يوم', color: 'bg-blue-100 text-blue-800', icon: Timer },
  ON_LEAVE: { label: 'إجازة', color: 'bg-purple-100 text-purple-800', icon: Calendar },
  HOLIDAY: { label: 'عطلة', color: 'bg-gray-100 text-gray-800', icon: Calendar },
  WEEKEND: { label: 'عطلة أسبوعية', color: 'bg-gray-100 text-gray-800', icon: Calendar },
  REMOTE: { label: 'عن بُعد', color: 'bg-indigo-100 text-indigo-800', icon: Monitor },
};

const Attendance: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Filters
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [useDateRange, setUseDateRange] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [employeeId, setEmployeeId] = useState('');

  // Employees list for filters
  const [employees, setEmployees] = useState<Array<{ id: string; firstName: string; lastName: string; employeeNumber: string }>>([]);

  // Dialog states
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number, longitude: number, type: string } | null>(null);

  // Manual attendance form
  const [manualForm, setManualForm] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    checkIn: '09:00',
    checkOut: '17:00',
    status: 'PRESENT',
    notes: ''
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  useEffect(() => {
    fetchTodayStats();
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [pagination.page, selectedDate, endDate, useDateRange, statusFilter, employeeId]);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/hr/employees?limit=1000&status=ACTIVE');
      setEmployees(response.data.employees || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchTodayStats = async () => {
    try {
      const response = await api.get('/hr/attendance/today');
      if (response.data) {
        setTodayStats(response.data);
      }
    } catch (error: any) {
      console.error('Error fetching today stats:', error);
      toast.error(error.response?.data?.message || 'فشل في جلب إحصائيات اليوم');
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);

      // استخدام التواريخ المحددة مباشرة بدون إضافة أيام إضافية
      const searchStartDate = selectedDate;
      const searchEndDate = useDateRange ? endDate : selectedDate;

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        startDate: searchStartDate || '',
        endDate: searchEndDate || '',
      } as Record<string, string>);

      if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter);
      if (employeeId) params.append('employeeId', employeeId);

      const response = await api.get(`/hr/attendance?${params}`);
      setRecords(response.data.records);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages
      }));
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('حدث خطأ أثناء جلب سجل الحضور');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (empId: string) => {
    try {
      await api.post('/hr/attendance/check-in', {
        employeeId: empId,
        method: 'manual'
      });
      toast.success('تم تسجيل الحضور بنجاح');
      fetchTodayStats();
      fetchAttendance();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ أثناء تسجيل الحضور');
    }
  };

  const handleCheckOut = async (empId: string) => {
    try {
      await api.post('/hr/attendance/check-out', {
        employeeId: empId,
        method: 'manual'
      });
      toast.success('تم تسجيل الانصراف بنجاح');
      fetchTodayStats();
      fetchAttendance();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ أثناء تسجيل الانصراف');
    }
  };

  const handleManualAttendance = async () => {
    // ✅ Validation
    if (!manualForm.employeeId) {
      toast.error('يجب اختيار موظف');
      return;
    }

    if (manualForm.checkOut && manualForm.checkIn) {
      const checkInTime = new Date(`2000-01-01T${manualForm.checkIn}`);
      const checkOutTime = new Date(`2000-01-01T${manualForm.checkOut}`);
      if (checkOutTime <= checkInTime) {
        toast.error('وقت الانصراف يجب أن يكون بعد وقت الحضور');
        return;
      }
    }

    try {
      if (isEditMode && editingRecordId) {
        await api.put(`/hr/attendance/${editingRecordId}`, manualForm);
        toast.success('تم تحديث سجل الحضور بنجاح');
      } else {
        await api.post('/hr/attendance/manual', manualForm);
        toast.success('تم إنشاء سجل الحضور بنجاح');
      }

      setShowManualDialog(false);
      resetManualForm();
      fetchTodayStats();
      fetchAttendance();
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'حدث خطأ');
    }
  };

  const resetManualForm = () => {
    setManualForm({
      employeeId: '',
      date: new Date().toISOString().split('T')[0],
      checkIn: '09:00',
      checkOut: '17:00',
      status: 'PRESENT',
      notes: ''
    });
    setIsEditMode(false);
    setEditingRecordId(null);
  };

  const handleDeleteAttendance = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا السجل؟')) return;

    try {
      await api.delete(`/hr/attendance/${id}`);
      toast.success('تم حذف السجل بنجاح');
      fetchTodayStats();
      fetchAttendance();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ أثناء الحذف');
    }
  };

  const handleEditClick = (record: AttendanceRecord) => {
    setManualForm({
      employeeId: record.employee.id,
      date: record.date.split('T')[0],
      checkIn: record.checkIn ? new Date(record.checkIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '09:00',
      checkOut: record.checkOut ? new Date(record.checkOut).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '17:00',
      status: record.status,
      notes: '' // notes are not in the record interface but let's reset it
    });
    setEditingRecordId(record.id);
    setIsEditMode(true);
    setShowManualDialog(true);
  };

  // دالة لفتح الموقع في الخريطة
  const openLocationInMap = (latitude: number, longitude: number, type: string) => {
    setSelectedLocation({ latitude, longitude, type });
    setShowMapModal(true);
  };

  // دالة لعرض بيانات الموقع
  const renderLocationInfo = (checkInLocation: string | null, checkOutLocation: string | null) => {
    const parseLocation = (locationStr: string | null) => {
      if (!locationStr) return null;
      try {
        const location = JSON.parse(locationStr);
        return location;
      } catch {
        return null;
      }
    };

    const checkInLoc = parseLocation(checkInLocation);
    const checkOutLoc = parseLocation(checkOutLocation);

    if (!checkInLoc && !checkOutLoc) {
      return <span className="text-gray-400">-</span>;
    }

    return (
      <div className="space-y-1 text-xs">
        {checkInLoc && (
          <div
            className="flex items-center gap-1 text-green-600 hover:text-green-800 cursor-pointer hover:bg-green-50 p-1 rounded transition-colors"
            onClick={() => openLocationInMap(checkInLoc.latitude, checkInLoc.longitude, 'حضور')}
            title="اضغط لفتح الموقع في الخريطة"
          >
            <MapPin className="h-3 w-3" />
            <span className="underline">حضور: {checkInLoc.latitude?.toFixed(4)}, {checkInLoc.longitude?.toFixed(4)}</span>
          </div>
        )}
        {checkOutLoc && (
          <div
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 cursor-pointer hover:bg-blue-50 p-1 rounded transition-colors"
            onClick={() => openLocationInMap(checkOutLoc.latitude, checkOutLoc.longitude, 'انصراف')}
            title="اضغط لفتح الموقع في الخريطة"
          >
            <MapPin className="h-3 w-3" />
            <span className="underline">انصراف: {checkOutLoc.latitude?.toFixed(4)}, {checkOutLoc.longitude?.toFixed(4)}</span>
          </div>
        )}
      </div>
    );
  };

  const handleExport = async () => {
    try {
      const actualEndDate = useDateRange ? endDate : selectedDate;
      const params = new URLSearchParams({
        startDate: selectedDate || '',
        endDate: actualEndDate || '',
      } as Record<string, string>);

      if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter);
      if (employeeId) params.append('employeeId', employeeId);

      const response = await api.get(`/hr/attendance/export?${params}`, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const fileName = useDateRange
        ? `attendance-${selectedDate}-to-${actualEndDate}.xlsx`
        : `attendance-${selectedDate}.xlsx`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('تم تصدير البيانات بنجاح');
    } catch (error: any) {
      console.error('Error exporting attendance:', error);
      toast.error(error.response?.data?.message || 'فشل في تصدير البيانات');
    }
  };



  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">الحضور والانصراف</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {new Date(selectedDate || new Date()).toLocaleDateString('ar-EG', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => { resetManualForm(); setShowManualDialog(true); }} className="bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800">
            <Clock className="h-4 w-4 ml-2" />
            تسجيل يدوي
          </Button>
          <Button variant="outline" onClick={handleExport} className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
            <Download className="h-4 w-4 ml-2" />
            تصدير
          </Button>
        </div>
      </div>

      {/* Today Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">إجمالي الموظفين</p>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{todayStats?.totalEmployees || 0}</h3>
              </div>
              <div className="p-3 bg-gray-100 dark:bg-gray-900/30 rounded-full">
                <UserCheck className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">حاضر</p>
                <h3 className="text-3xl font-bold text-green-600 dark:text-green-400">{todayStats?.present || 0}</h3>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">متأخر</p>
                <h3 className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{todayStats?.late || 0}</h3>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">التاريخ:</span>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-[160px]"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useRange"
                  checked={useDateRange}
                  onChange={(e) => setUseDateRange(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="useRange" className="text-sm select-none cursor-pointer">
                  فترة زمنية
                </label>
              </div>

              {useDateRange && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                  <span className="text-sm font-medium">إلى:</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-[160px]"
                    min={selectedDate}
                  />
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-4 w-full md:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">الكل</SelectItem>
                  <SelectItem value="PRESENT">حاضر</SelectItem>
                  <SelectItem value="LATE">متأخر</SelectItem>
                  <SelectItem value="ABSENT">غائب</SelectItem>
                  <SelectItem value="ON_LEAVE">إجازة</SelectItem>
                  <SelectItem value="REMOTE">عن بُعد</SelectItem>
                </SelectContent>
              </Select>

              <Select value={employeeId || 'all'} onValueChange={(value) => setEmployeeId(value === 'all' ? '' : value)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="الموظف" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => {
                  setSelectedDate(new Date().toISOString().split('T')[0]);
                  setEndDate(new Date().toISOString().split('T')[0]);
                  setUseDateRange(false);
                  setStatusFilter('');
                  setEmployeeId('');
                }}
                className="px-3"
                title="إعادة تعيين الفلاتر"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle>سجل الحضور</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              <Clock className="h-12 w-12 mb-4 opacity-50" />
              <p>لا توجد سجلات حضور</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الموظف</TableHead>
                  <TableHead className="text-right">اليوم والتاريخ</TableHead>
                  <TableHead className="text-right">القسم</TableHead>
                  <TableHead className="text-right">الحضور</TableHead>
                  <TableHead className="text-right">الانصراف</TableHead>
                  <TableHead className="text-right">الموقع</TableHead>
                  <TableHead className="text-right">ساعات العمل</TableHead>
                  <TableHead className="text-right">ساعات إضافية</TableHead>
                  <TableHead className="text-right">التأخير</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => {
                  const StatusIcon = statusConfig[record.status]?.icon || Clock;
                  return (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={record.employee?.avatar} />
                            <AvatarFallback>
                              {record.employee?.firstName?.[0]}{record.employee?.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {record.employee?.firstName} {record.employee?.lastName}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {record.employee?.employeeNumber}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const rawDate = record.date || record.checkIn || record.checkOut;
                          if (!rawDate) return <span className="text-gray-400">-</span>;

                          const d = new Date(rawDate);
                          if (Number.isNaN(d.getTime())) return <span className="text-gray-400">-</span>;

                          return (
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {d.toLocaleDateString('ar-EG', { weekday: 'long' })}
                              </span>
                              <span className="text-sm text-gray-500">
                                {d.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                              </span>
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {record.employee?.department?.name || '-'}
                      </TableCell>
                      <TableCell>
                        {record.checkIn ? (
                          <span className="text-green-600 font-medium">
                            {new Date(record.checkIn).toLocaleTimeString('ar-EG', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.checkOut ? (
                          <span className="text-blue-600 font-medium">
                            {new Date(record.checkOut).toLocaleTimeString('ar-EG', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {renderLocationInfo(record.checkInLocation, record.checkOutLocation)}
                      </TableCell>
                      <TableCell>
                        {record.workHours ? (
                          <span>{Number(record.workHours).toFixed(1)} ساعة</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.overtimeHours && Number(record.overtimeHours) > 0 ? (
                          <span className="text-blue-600 font-medium">{Number(record.overtimeHours).toFixed(1)} ساعة</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.lateMinutes && record.lateMinutes > 0 ? (
                          <span className="text-red-600">{record.lateMinutes} دقيقة</span>
                        ) : (
                          <span className="text-green-600">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig[record.status]?.color || ''}>
                          <StatusIcon className="h-3 w-3 ml-1" />
                          {statusConfig[record.status]?.label || record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {!record.checkIn && record.id.startsWith('temp-') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCheckIn(record.employee.id)}
                            >
                              تسجيل حضور
                            </Button>
                          )}
                          {record.checkIn && !record.checkOut && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCheckOut(record.employee.id)}
                            >
                              تسجيل انصراف
                            </Button>
                          )}

                          {!record.id.startsWith('temp-') && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => handleEditClick(record)}
                              >
                                <Pencil className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => handleDeleteAttendance(record.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </>
                          )}
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
            <p className="text-sm text-gray-500 dark:text-gray-400">
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

      {/* Manual Attendance Dialog */}
      <Dialog open={showManualDialog} onOpenChange={(open) => { if (!open) resetManualForm(); setShowManualDialog(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'تعديل سجل حضور' : 'تسجيل حضور يدوي'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>الموظف <span className="text-red-500">*</span></Label>
              <Select
                value={manualForm.employeeId}
                onValueChange={(value) => setManualForm({ ...manualForm, employeeId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر موظف" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>التاريخ</Label>
              <Input
                type="date"
                value={manualForm.date}
                onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>وقت الحضور</Label>
                <Input
                  type="time"
                  value={manualForm.checkIn}
                  onChange={(e) => setManualForm({ ...manualForm, checkIn: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>وقت الانصراف</Label>
                <Input
                  type="time"
                  value={manualForm.checkOut}
                  onChange={(e) => setManualForm({ ...manualForm, checkOut: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>الحالة</Label>
              <Select
                value={manualForm.status}
                onValueChange={(value) => setManualForm({ ...manualForm, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRESENT">حاضر</SelectItem>
                  <SelectItem value="LATE">متأخر</SelectItem>
                  <SelectItem value="ABSENT">غائب</SelectItem>
                  <SelectItem value="REMOTE">عن بُعد</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Input
                value={manualForm.notes}
                onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                placeholder="ملاحظات إضافية..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowManualDialog(false); resetManualForm(); }}>
              إلغاء
            </Button>
            <Button onClick={handleManualAttendance}>
              {isEditMode ? 'تحديث' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Map Modal */}
      <Dialog open={showMapModal} onOpenChange={setShowMapModal}>
        <DialogContent className="sm:max-w-4xl sm:max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              موقع {selectedLocation?.type}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {selectedLocation && (
              <>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>الإحداثيات:</strong> {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                  </p>
                </div>

                {/* Google Maps Embed */}
                <div className="w-full h-96 rounded-lg overflow-hidden border">
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={`https://www.google.com/maps/embed/v1/place?key=${envConfig.googleMapsApiKey}&q=${selectedLocation.latitude},${selectedLocation.longitude}&zoom=16`}
                    allowFullScreen
                    title={`خريطة موقع ${selectedLocation.type}`}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const url = `https://www.google.com/maps?q=${selectedLocation.latitude},${selectedLocation.longitude}`;
                      window.open(url, '_blank');
                    }}
                  >
                    فتح في Google Maps
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`${selectedLocation.latitude}, ${selectedLocation.longitude}`);
                      toast.success('تم نسخ الإحداثيات');
                    }}
                  >
                    نسخ الإحداثيات
                  </Button>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMapModal(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Attendance;
