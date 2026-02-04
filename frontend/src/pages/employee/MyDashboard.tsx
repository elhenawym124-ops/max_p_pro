/**
 * 🏠 My Dashboard - Employee Dashboard
 * لوحة التحكم الشخصية للموظف
 */

import React, { useState, useEffect } from 'react';
import {
  Clock, Calendar, DollarSign, FileText, TrendingUp,
  AlertCircle, CheckCircle, Users, Award, Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { toast } from 'sonner';

interface EmployeeInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar: string;
  employeeNumber: string;
  department: { name: string; color: string } | null;
  position: { title: string } | null;
  hireDate: string;
  annualLeaveBalance: number;
  sickLeaveBalance: number;
}

interface TodayAttendance {
  checkIn: string | null;
  checkOut: string | null;
  status: string;
}

interface RecentLeave {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: string;
}

interface LastPayroll {
  id: string;
  month: number;
  year: number;
  netSalary: number;
  status: string;
}

const months = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const MyDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance | null>(null);
  const [recentLeaves, setRecentLeaves] = useState<RecentLeave[]>([]);
  const [lastPayroll, setLastPayroll] = useState<LastPayroll | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [empRes, attRes, leavesRes, payrollRes] = await Promise.all([
        api.get('/hr/employees/me'),
        api.get('/hr/attendance/my-today'),
        api.get('/hr/leaves/my-recent?limit=3'),
        api.get('/hr/payroll/my-last')
      ]);

      setEmployee(empRes.data.employee);
      setTodayAttendance(attRes.data.attendance);
      setRecentLeaves(leavesRes.data.leaves || []);
      setLastPayroll(payrollRes.data.payroll);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('حدث خطأ أثناء جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">لم يتم العثور على بيانات الموظف</p>
      </div>
    );
  }

  const canCheckIn = !todayAttendance?.checkIn;
  const canCheckOut = todayAttendance?.checkIn && !todayAttendance?.checkOut;

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen" dir="rtl">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={employee.avatar} />
            <AvatarFallback>
              {employee.firstName?.[0]}{employee.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              مرحباً، {employee.firstName} {employee.lastName}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {employee.position?.title || 'موظف'} - {employee.department?.name || 'بدون قسم'}
            </p>
          </div>
        </div>
        <div className="text-left">
          <p className="text-sm text-gray-500">رقم الموظف</p>
          <p className="text-lg font-bold">{employee.employeeNumber}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/my-attendance')}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">الحضور اليوم</p>
                {todayAttendance?.checkIn ? (
                  <p className="text-lg font-bold text-green-600">
                    {new Date(todayAttendance.checkIn).toLocaleTimeString('ar-EG', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                ) : (
                  <p className="text-lg font-bold text-gray-400">لم يسجل</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/my-leaves')}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">رصيد الإجازات</p>
                <p className="text-lg font-bold">{employee.annualLeaveBalance} يوم</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/my-payroll')}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">آخر راتب</p>
                {lastPayroll ? (
                  <p className="text-lg font-bold">
                    {lastPayroll.netSalary.toLocaleString()} ج.م
                  </p>
                ) : (
                  <p className="text-lg font-bold text-gray-400">-</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/profile')}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">مدة الخدمة</p>
                <p className="text-lg font-bold">
                  {Math.floor((new Date().getTime() - new Date(employee.hireDate).getTime()) / (1000 * 60 * 60 * 24 * 365))} سنة
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Status */}
      {(canCheckIn || canCheckOut) && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <AlertCircle className="h-8 w-8 text-blue-600" />
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {canCheckIn ? 'لم تسجل حضورك بعد!' : 'لم تسجل انصرافك بعد!'}
                  </h3>
                  <p className="text-gray-600">
                    {canCheckIn ? 'سجل حضورك الآن لبدء يوم العمل' : 'سجل انصرافك عند انتهاء يوم العمل'}
                  </p>
                </div>
              </div>
              <Button
                size="lg"
                className={canCheckIn ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}
                onClick={() => navigate('/my-attendance')}
              >
                {canCheckIn ? 'تسجيل حضور' : 'تسجيل انصراف'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Leave Balance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              رصيد الإجازات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">الإجازات السنوية</span>
                <span className="text-lg font-bold text-green-600">
                  {employee.annualLeaveBalance} يوم
                </span>
              </div>
              <Progress value={(employee.annualLeaveBalance / 21) * 100} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">الإجازات المرضية</span>
                <span className="text-lg font-bold text-blue-600">
                  {employee.sickLeaveBalance} يوم
                </span>
              </div>
              <Progress value={(employee.sickLeaveBalance / 15) * 100} className="h-2" />
            </div>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => navigate('/my-leaves', { state: { createNew: true } })}
            >
              طلب إجازة جديدة
            </Button>
          </CardContent>
        </Card>

        {/* Recent Leaves */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              طلبات الإجازات الأخيرة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentLeaves.length > 0 ? (
              <div className="space-y-3">
                {recentLeaves.map((leave) => (
                  <div
                    key={leave.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                    onClick={() => navigate(`/my-leaves/${leave.id}`)}
                  >
                    <div>
                      <p className="font-medium">
                        {new Date(leave.startDate).toLocaleDateString('ar-EG')} - {new Date(leave.endDate).toLocaleDateString('ar-EG')}
                      </p>
                      <p className="text-sm text-gray-500">{leave.totalDays} يوم</p>
                    </div>
                    <Badge
                      className={
                        leave.status === 'APPROVED'
                          ? 'bg-green-100 text-green-800'
                          : leave.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }
                    >
                      {leave.status === 'APPROVED' ? 'موافق عليه' : leave.status === 'PENDING' ? 'قيد الانتظار' : 'مرفوض'}
                    </Badge>
                  </div>
                ))}
                <Button
                  variant="link"
                  className="w-full"
                  onClick={() => navigate('/my-leaves')}
                >
                  عرض جميع الطلبات
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>لا توجد طلبات إجازات</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Last Payroll */}
      {lastPayroll && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              آخر كشف راتب
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">
                  {months[lastPayroll.month - 1]} {lastPayroll.year}
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {lastPayroll.netSalary.toLocaleString()} ج.م
                </p>
                <p className="text-sm text-gray-500 mt-1">صافي الراتب</p>
              </div>
              <div className="text-left">
                <Badge
                  className={
                    lastPayroll.status === 'PAID'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }
                >
                  {lastPayroll.status === 'PAID' ? 'مدفوع' : 'معتمد'}
                </Badge>
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => navigate('/my-payroll')}
                >
                  عرض التفاصيل
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MyDashboard;
