import React, { useState, useEffect } from 'react';
import { User, Download, RefreshCw, Calendar, Clock, DollarSign, FileText, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/services/api';
import { toast } from 'sonner';

interface EmployeeReportData {
  employee: {
    id: string;
    name: string;
    employeeNumber: string;
    department: string;
    position: string;
  };
  attendance: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    totalLateMinutes: number;
    totalWorkHours: number;
    overtimeHours: number;
    records: {
      date: string;
      checkIn: string | null;
      checkOut: string | null;
      status: string;
      workHours: number;
      lateMinutes: number;
    }[];
  };
  leaves: {
    totalRequests: number;
    approved: number;
    pending: number;
    rejected: number;
    totalDaysTaken: number;
    requests: {
      id: string;
      type: string;
      startDate: string;
      endDate: string;
      days: number;
      status: string;
      reason: string;
    }[];
  };
  advances: {
    totalRequests: number;
    totalAmount: number;
    pending: number;
    approved: number;
    requests: {
      id: string;
      amount: number;
      requestDate: string;
      status: string;
      reason: string;
    }[];
  };
  payroll: {
    baseSalary: number;
    allowances: number;
    deductions: number;
    overtimePay: number;
    netSalary: number;
    lastPayment: string | null;
  };
  performance: {
    lastReview: {
      date: string;
      score: number;
      reviewer: string;
    } | null;
    activeGoals: number;
    completedGoals: number;
  };
  warnings: {
    total: number;
    recent: {
      id: string;
      type: string;
      date: string;
      description: string;
    }[];
  };
}

const EmployeeReport: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [report, setReport] = useState<EmployeeReportData | null>(null);

  useEffect(() => {
    fetchEmployees();

    // Set default dates (current month)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    setStartDate(firstDay.toISOString().split('T')[0] || '');
    setEndDate(lastDay.toISOString().split('T')[0] || '');
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/hr/employees');
      setEmployees(response.data?.employees || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('فشل في جلب قائمة الموظفين');
    }
  };

  const fetchReport = async () => {
    if (!selectedEmployee) {
      toast.error('الرجاء اختيار موظف');
      return;
    }

    if (!startDate || !endDate) {
      toast.error('الرجاء تحديد الفترة الزمنية');
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams({
        employeeId: selectedEmployee,
        startDate,
        endDate,
      });

      const response = await api.get(`/hr/reports/employee?${params}`);
      setReport(response.data?.report || null);
    } catch (error) {
      console.error('Error fetching report:', error);
      toast.error('فشل في جلب التقرير');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!report) return;
    toast.success('جاري تصدير التقرير...');
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PRESENT: 'text-green-600 bg-green-50',
      ABSENT: 'text-red-600 bg-red-50',
      LATE: 'text-orange-600 bg-orange-50',
      ON_LEAVE: 'text-blue-600 bg-blue-50',
      APPROVED: 'text-green-600 bg-green-50',
      PENDING: 'text-yellow-600 bg-yellow-50',
      REJECTED: 'text-red-600 bg-red-50',
    };
    return colors[status] || 'text-gray-600 bg-gray-50';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PRESENT: 'حاضر',
      ABSENT: 'غائب',
      LATE: 'متأخر',
      ON_LEAVE: 'إجازة',
      APPROVED: 'موافق عليه',
      PENDING: 'معلق',
      REJECTED: 'مرفوض',
    };
    return labels[status] || status;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100">
      {/* Filters */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="dark:text-gray-300">الموظف</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700">
                  <SelectValue placeholder="اختر موظف" className="dark:text-gray-400" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id} className="dark:text-gray-300 dark:focus:bg-gray-700">
                      {emp.firstName} {emp.lastName} - {emp.employeeNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="dark:text-gray-300">من تاريخ</Label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="dark:text-gray-300">إلى تاريخ</Label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="invisible">Actions</Label>
              <div className="flex gap-2">
                <Button onClick={fetchReport} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                  <RefreshCw className="h-4 w-4 ml-2" />
                  عرض
                </Button>
                {report && (
                  <Button variant="outline" onClick={handleExport} className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300">
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : report ? (
        <>
          {/* Employee Info */}
          <Card className="border-none shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-xl">
                  <User className="h-10 w-10" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold">{report.employee?.name}</CardTitle>
                  <p className="text-blue-100 text-sm mt-1 flex items-center gap-2">
                    <span>{report.employee?.employeeNumber}</span>
                    <span className="opacity-50">•</span>
                    <span>{report.employee?.department}</span>
                    <span className="opacity-50">•</span>
                    <span>{report.employee?.position}</span>
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">نسبة الحضور</p>
                    <h3 className="text-3xl font-bold mt-1 text-green-600 dark:text-green-400">
                      {report.attendance?.totalDays > 0
                        ? ((report.attendance?.presentDays / report.attendance?.totalDays) * 100).toFixed(1)
                        : 0}%
                    </h3>
                  </div>
                  <Clock className="h-10 w-10 text-green-500 dark:text-green-400/80" />
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">طلبات الإجازات</p>
                    <h3 className="text-3xl font-bold mt-1 text-blue-600 dark:text-blue-400">{report.leaves?.totalRequests || 0}</h3>
                  </div>
                  <Calendar className="h-10 w-10 text-blue-500 dark:text-blue-400/80" />
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">السلف المطلوبة</p>
                    <h3 className="text-xl font-bold mt-1 text-orange-600 dark:text-orange-400">
                      {formatCurrency(report.advances?.totalAmount || 0)}
                    </h3>
                  </div>
                  <DollarSign className="h-10 w-10 text-orange-500 dark:text-orange-400/80" />
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">الإنذارات</p>
                    <h3 className="text-3xl font-bold mt-1 text-red-600 dark:text-red-400">{report.warnings?.total || 0}</h3>
                  </div>
                  <AlertCircle className="h-10 w-10 text-red-500 dark:text-red-400/80" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Attendance Details */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="border-b dark:border-gray-700">
              <CardTitle className="dark:text-white">سجل الحضور والانصراف</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 rounded-xl">
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">أيام الحضور</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{report.attendance?.presentDays || 0}</p>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-xl">
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">أيام الغياب</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{report.attendance?.absentDays || 0}</p>
                </div>
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/30 rounded-xl">
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">أيام التأخير</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                    {report.attendance?.lateDays || 0} <span className="text-sm font-normal opacity-70">({report.attendance?.totalLateMinutes || 0} دقيقة)</span>
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border dark:border-gray-700">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr className="border-b dark:border-gray-700">
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">التاريخ</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">الحضور</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">الانصراف</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ساعات العمل</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">التأخير</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                    {report.attendance?.records?.length > 0 ? (
                      report.attendance.records.map((record, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium dark:text-gray-200">{new Date(record.date).toLocaleDateString('ar-EG')}</td>
                          <td className="px-4 py-3 text-sm dark:text-gray-300">{record.checkIn || '-'}</td>
                          <td className="px-4 py-3 text-sm dark:text-gray-300">{record.checkOut || '-'}</td>
                          <td className="px-4 py-3 text-sm dark:text-gray-300">{Number(record.workHours || 0).toFixed(1)} ساعة</td>
                          <td className="px-4 py-3 text-sm dark:text-gray-300 text-orange-600 dark:text-orange-400">{record.lateMinutes} دقيقة</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${getStatusColor(record.status)}`}>
                              {getStatusLabel(record.status)}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                          لا توجد سجلات حضور
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Leaves */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="border-b dark:border-gray-700">
              <CardTitle className="dark:text-white">طلبات الإجازات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 border dark:border-gray-700 rounded-xl">
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">إجمالي الطلبات</p>
                  <p className="text-2xl font-bold dark:text-white mt-1">{report.leaves?.totalRequests || 0}</p>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 rounded-xl">
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">موافق عليها</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{report.leaves?.approved || 0}</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800/30 rounded-xl">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">معلقة</p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">{report.leaves?.pending || 0}</p>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-xl">
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">مرفوضة</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{report.leaves?.rejected || 0}</p>
                </div>
              </div>

              <div className="space-y-3">
                {report.leaves?.requests?.length > 0 ? (
                  report.leaves.requests.map((leave) => (
                    <div key={leave.id} className="p-4 border dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold dark:text-white text-lg">{leave.type}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(leave.startDate).toLocaleDateString('ar-EG')} - {new Date(leave.endDate).toLocaleDateString('ar-EG')}
                            <span className="font-bold text-blue-600 dark:text-blue-400 mx-1">({leave.days} يوم)</span>
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(leave.status)}`}>
                          {getStatusLabel(leave.status)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30 p-2 rounded mt-2">{leave.reason}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 bg-gray-50 dark:bg-gray-900/30 rounded-xl border-2 border-dashed dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400">لا توجد طلبات إجازات</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Advances */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="border-b dark:border-gray-700">
              <CardTitle className="dark:text-white">طلبات السلف</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {report.advances?.requests?.length > 0 ? (
                  report.advances.requests.map((advance) => (
                    <div key={advance.id} className="p-4 border dark:border-gray-700 rounded-xl flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div>
                        <p className="font-bold text-xl text-orange-600 dark:text-orange-400">{formatCurrency(advance.amount)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {new Date(advance.requestDate).toLocaleDateString('ar-EG')}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 border-r-2 border-orange-500 pr-2">{advance.reason}</p>
                      </div>
                      <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${getStatusColor(advance.status)}`}>
                        {getStatusLabel(advance.status)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 bg-gray-50 dark:bg-gray-900/30 rounded-xl border-2 border-dashed dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400">لا توجد طلبات سلف</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payroll & Performance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="border-b dark:border-gray-700">
                <CardTitle className="dark:text-white">معلومات الراتب</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900/30 p-3 rounded-lg">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">الراتب الأساسي</span>
                  <span className="font-bold text-lg dark:text-white">{formatCurrency(report.payroll?.baseSalary || 0)}</span>
                </div>
                <div className="flex justify-between items-center p-2 px-3">
                  <span className="text-green-600 dark:text-green-400 font-medium">البدلات</span>
                  <span className="font-bold text-green-600">+{formatCurrency(report.payroll?.allowances || 0)}</span>
                </div>
                <div className="flex justify-between items-center p-2 px-3">
                  <span className="text-red-600 dark:text-red-400 font-medium">الخصومات</span>
                  <span className="font-bold text-red-600">-{formatCurrency(report.payroll?.deductions || 0)}</span>
                </div>
                <div className="flex justify-between items-center p-2 px-3">
                  <span className="text-blue-600 dark:text-blue-400 font-medium">العمل الإضافي</span>
                  <span className="font-bold text-blue-600">+{formatCurrency(report.payroll?.overtimePay || 0)}</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t dark:border-gray-700 text-xl">
                  <span className="font-bold dark:text-white">صافي الراتب</span>
                  <span className="font-black text-blue-600 dark:text-blue-400">{formatCurrency(report.payroll?.netSalary || 0)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="border-b dark:border-gray-700">
                <CardTitle className="dark:text-white">الأداء والأهداف</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {report.performance?.lastReview ? (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-xl text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">آخر تقييم</p>
                    <div className="flex justify-center items-baseline gap-1 mt-2">
                      <span className="text-4xl font-black text-blue-600 dark:text-blue-400">{report.performance.lastReview.score}</span>
                      <span className="text-gray-400">/ 5</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      تم التقييم في {new Date(report.performance.lastReview.date).toLocaleDateString('ar-EG')}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 dark:bg-gray-900/30 rounded-xl border dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400">لا توجد تقييمات سابقة</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800/30">
                    <p className="text-xs text-green-600 dark:text-green-400 font-bold uppercase">أهداف مكتملة</p>
                    <p className="text-3xl font-black text-green-600 dark:text-green-400 mt-1">{report.performance?.completedGoals || 0}</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase">أهداف نشطة</p>
                    <p className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">{report.performance?.activeGoals || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Warnings */}
          {report.warnings?.total > 0 && (
            <Card className="dark:bg-gray-800 dark:border-gray-700 overflow-hidden">
              <CardHeader className="border-b dark:border-gray-700 bg-red-50/50 dark:bg-red-950/20">
                <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  الإنذارات والتحذيرات التأديبية
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y dark:divide-gray-700">
                  {report.warnings?.recent?.map((warning) => (
                    <div key={warning.id} className="p-4 hover:bg-red-50/30 dark:hover:bg-red-900/10 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-bold text-red-600 dark:text-red-400">{warning.type}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">{warning.description}</p>
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {new Date(warning.date).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-20">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <FileText className="w-20 h-20 mx-auto mb-6 opacity-20" />
              <h3 className="text-xl font-bold dark:text-white">جاهز لعرض التقرير</h3>
              <p className="mt-2">اختر موظف وحدد الفترة الزمنية من القائمة أعلاه</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmployeeReport;
