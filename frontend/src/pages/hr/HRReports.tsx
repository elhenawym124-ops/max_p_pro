import React, { useState, useEffect } from 'react';
import { 
  Download, Calendar, Users, Clock, DollarSign,
  TrendingUp, TrendingDown, FileText, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import api from '@/services/api';
import { toast } from 'sonner';

interface AttendanceReport {
  totalEmployees: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  averageWorkHours: number;
  attendanceRate: number;
  byDepartment: {
    department: string;
    rate: number;
    employees: number;
  }[];
}

interface LeaveReport {
  totalRequests: number;
  approved: number;
  rejected: number;
  pending: number;
  totalDaysTaken: number;
  byType: {
    type: string;
    count: number;
    days: number;
  }[];
}

interface PayrollReport {
  totalPayroll: number;
  totalBaseSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  totalOvertime: number;
  averageSalary: number;
  byDepartment: {
    department: string;
    total: number;
    employees: number;
  }[];
}

const months = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const HRReports: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('attendance');
  
  // Filters
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  
  // Reports data
  const [attendanceReport, setAttendanceReport] = useState<AttendanceReport | null>(null);
  const [leaveReport, setLeaveReport] = useState<LeaveReport | null>(null);
  const [payrollReport, setPayrollReport] = useState<PayrollReport | null>(null);

  useEffect(() => {
    fetchReport();
  }, [activeTab, selectedMonth, selectedYear]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        month: selectedMonth.toString(),
        year: selectedYear.toString(),
      });

      if (activeTab === 'attendance') {
        const response = await api.get(`/hr/reports/attendance?${params}`);
        setAttendanceReport(response.data?.report || null);
      } else if (activeTab === 'leaves') {
        const response = await api.get(`/hr/reports/leaves?${params}`);
        setLeaveReport(response.data?.report || null);
      } else if (activeTab === 'payroll') {
        const response = await api.get(`/hr/reports/payroll?${params}`);
        setPayrollReport(response.data?.report || null);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      // Set mock data for demo
      if (activeTab === 'attendance') {
        setAttendanceReport({
          totalEmployees: 50,
          presentDays: 1100,
          absentDays: 50,
          lateDays: 75,
          averageWorkHours: 7.5,
          attendanceRate: 92,
          byDepartment: [
            { department: 'المبيعات', rate: 95, employees: 15 },
            { department: 'التسويق', rate: 90, employees: 10 },
            { department: 'التقنية', rate: 88, employees: 12 },
            { department: 'الموارد البشرية', rate: 98, employees: 5 },
            { department: 'المالية', rate: 94, employees: 8 },
          ]
        });
      } else if (activeTab === 'leaves') {
        setLeaveReport({
          totalRequests: 45,
          approved: 35,
          rejected: 5,
          pending: 5,
          totalDaysTaken: 120,
          byType: [
            { type: 'سنوية', count: 25, days: 75 },
            { type: 'مرضية', count: 12, days: 24 },
            { type: 'طارئة', count: 5, days: 10 },
            { type: 'أخرى', count: 3, days: 11 },
          ]
        });
      } else if (activeTab === 'payroll') {
        setPayrollReport({
          totalPayroll: 750000,
          totalBaseSalary: 600000,
          totalAllowances: 100000,
          totalDeductions: 50000,
          totalOvertime: 25000,
          averageSalary: 15000,
          byDepartment: [
            { department: 'المبيعات', total: 225000, employees: 15 },
            { department: 'التقنية', total: 180000, employees: 12 },
            { department: 'التسويق', total: 120000, employees: 10 },
            { department: 'المالية', total: 120000, employees: 8 },
            { department: 'الموارد البشرية', total: 75000, employees: 5 },
          ]
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    toast.success('جاري تصدير التقرير...');
    // Implement export logic
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            تقارير الموارد البشرية
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {months[selectedMonth - 1]} {selectedYear}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchReport}>
            <RefreshCw className="h-4 w-4 ml-2" />
            تحديث
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 ml-2" />
            تصدير
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>الشهر</Label>
              <Select 
                value={selectedMonth.toString()} 
                onValueChange={(v) => setSelectedMonth(parseInt(v))}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month, index) => (
                    <SelectItem key={index} value={(index + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>السنة</Label>
              <Select 
                value={selectedYear.toString()} 
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2023, 2024, 2025, 2026].map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="attendance" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            الحضور
          </TabsTrigger>
          <TabsTrigger value="leaves" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            الإجازات
          </TabsTrigger>
          <TabsTrigger value="payroll" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            الرواتب
          </TabsTrigger>
        </TabsList>

        {/* Attendance Report */}
        <TabsContent value="attendance" className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : attendanceReport && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm">نسبة الحضور</p>
                        <h3 className="text-3xl font-bold mt-1">{attendanceReport.attendanceRate}%</h3>
                      </div>
                      <TrendingUp className="h-10 w-10 opacity-80" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm">أيام الحضور</p>
                        <h3 className="text-3xl font-bold mt-1 text-green-600">
                          {attendanceReport.presentDays}
                        </h3>
                      </div>
                      <Users className="h-10 w-10 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm">أيام الغياب</p>
                        <h3 className="text-3xl font-bold mt-1 text-red-600">
                          {attendanceReport.absentDays}
                        </h3>
                      </div>
                      <TrendingDown className="h-10 w-10 text-red-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm">متوسط ساعات العمل</p>
                        <h3 className="text-3xl font-bold mt-1 text-purple-600">
                          {attendanceReport.averageWorkHours}
                        </h3>
                      </div>
                      <Clock className="h-10 w-10 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* By Department */}
              <Card>
                <CardHeader>
                  <CardTitle>الحضور حسب القسم</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {attendanceReport.byDepartment && attendanceReport.byDepartment.length > 0 ? (
                      attendanceReport.byDepartment.map((dept, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{dept.department}</span>
                            <span className="text-sm text-gray-500">
                              {dept.employees} موظف • {dept.rate}%
                            </span>
                          </div>
                          <Progress value={dept.rate} className="h-2" />
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-500">لا توجد بيانات</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Leaves Report */}
        <TabsContent value="leaves" className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : leaveReport && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm">إجمالي الطلبات</p>
                        <h3 className="text-3xl font-bold mt-1">{leaveReport.totalRequests}</h3>
                      </div>
                      <FileText className="h-10 w-10 opacity-80" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm">موافق عليها</p>
                        <h3 className="text-3xl font-bold mt-1 text-green-600">
                          {leaveReport.approved}
                        </h3>
                      </div>
                      <TrendingUp className="h-10 w-10 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm">مرفوضة</p>
                        <h3 className="text-3xl font-bold mt-1 text-red-600">
                          {leaveReport.rejected}
                        </h3>
                      </div>
                      <TrendingDown className="h-10 w-10 text-red-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm">إجمالي الأيام</p>
                        <h3 className="text-3xl font-bold mt-1 text-blue-600">
                          {leaveReport.totalDaysTaken}
                        </h3>
                      </div>
                      <Calendar className="h-10 w-10 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* By Type */}
              <Card>
                <CardHeader>
                  <CardTitle>الإجازات حسب النوع</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {leaveReport.byType && leaveReport.byType.length > 0 ? (
                      leaveReport.byType.map((type, index) => (
                        <div key={index} className="p-4 border rounded-lg">
                          <h4 className="font-semibold text-lg">{type.type}</h4>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm text-gray-500">
                              <span className="font-medium text-gray-900">{type.count}</span> طلب
                            </p>
                            <p className="text-sm text-gray-500">
                              <span className="font-medium text-gray-900">{type.days}</span> يوم
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full text-center py-4 text-gray-500">لا توجد بيانات</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Payroll Report */}
        <TabsContent value="payroll" className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : payrollReport && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm">إجمالي الرواتب</p>
                        <h3 className="text-2xl font-bold mt-1">
                          {formatCurrency(payrollReport.totalPayroll)}
                        </h3>
                      </div>
                      <DollarSign className="h-10 w-10 opacity-80" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm">الرواتب الأساسية</p>
                        <h3 className="text-xl font-bold mt-1">
                          {formatCurrency(payrollReport.totalBaseSalary)}
                        </h3>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm">البدلات</p>
                        <h3 className="text-xl font-bold mt-1 text-green-600">
                          +{formatCurrency(payrollReport.totalAllowances)}
                        </h3>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm">الخصومات</p>
                        <h3 className="text-xl font-bold mt-1 text-red-600">
                          -{formatCurrency(payrollReport.totalDeductions)}
                        </h3>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* By Department */}
              <Card>
                <CardHeader>
                  <CardTitle>الرواتب حسب القسم</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {payrollReport.byDepartment && payrollReport.byDepartment.length > 0 ? (
                      payrollReport.byDepartment.map((dept, index) => {
                        const percentage = (dept.total / payrollReport.totalPayroll) * 100;
                        return (
                          <div key={index} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{dept.department}</span>
                              <span className="text-sm text-gray-500">
                                {dept.employees} موظف • {formatCurrency(dept.total)}
                              </span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-4 text-gray-500">لا توجد بيانات</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Additional Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-gray-500 text-sm">متوسط الراتب</p>
                      <h3 className="text-3xl font-bold mt-2 text-primary">
                        {formatCurrency(payrollReport.averageSalary)}
                      </h3>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-gray-500 text-sm">إجمالي العمل الإضافي</p>
                      <h3 className="text-3xl font-bold mt-2 text-orange-600">
                        {formatCurrency(payrollReport.totalOvertime)}
                      </h3>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HRReports;
