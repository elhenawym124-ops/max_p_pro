import React, { useState, useEffect } from 'react';
import { Clock, Users, TrendingUp, TrendingDown, Download, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

const months = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const AttendanceReport: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [report, setReport] = useState<AttendanceReport | null>(null);

  useEffect(() => {
    fetchReport();
  }, [selectedMonth, selectedYear]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        month: selectedMonth.toString(),
        year: selectedYear.toString(),
      });

      const response = await api.get(`/hr/reports/attendance?${params}`);
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
    toast.success('جاري تصدير التقرير...');
  };

  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label className="dark:text-gray-300">الشهر</Label>
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="w-[150px] dark:bg-gray-800 dark:border-gray-700">
                  <SelectValue className="dark:text-white" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {months.map((month, index) => (
                    <SelectItem key={index} value={(index + 1).toString()} className="dark:text-gray-300 dark:focus:bg-gray-700">
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="dark:text-gray-300">السنة</Label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-[120px] dark:bg-gray-800 dark:border-gray-700">
                  <SelectValue className="dark:text-white" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {[2023, 2024, 2025, 2026].map(year => (
                    <SelectItem key={year} value={year.toString()} className="dark:text-gray-300 dark:focus:bg-gray-700">
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 mr-auto">
              <Button variant="outline" onClick={fetchReport} className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700">
                <RefreshCw className="h-4 w-4 ml-2" />
                تحديث
              </Button>
              <Button variant="outline" onClick={handleExport} className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700">
                <Download className="h-4 w-4 ml-2" />
                تصدير
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : report && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">نسبة الحضور</p>
                    <h3 className="text-3xl font-bold mt-1">{report.attendanceRate || 0}%</h3>
                  </div>
                  <TrendingUp className="h-10 w-10 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">أيام الحضور</p>
                    <h3 className="text-3xl font-bold mt-1 text-green-600 dark:text-green-400">{report.presentDays || 0}</h3>
                  </div>
                  <Users className="h-10 w-10 text-green-500 dark:text-green-400/80" />
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">أيام الغياب</p>
                    <h3 className="text-3xl font-bold mt-1 text-red-600 dark:text-red-400">{report.absentDays || 0}</h3>
                  </div>
                  <TrendingDown className="h-10 w-10 text-red-500 dark:text-red-400/80" />
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">متوسط ساعات العمل</p>
                    <h3 className="text-3xl font-bold mt-1 text-purple-600 dark:text-purple-400">{report.averageWorkHours || 0}</h3>
                  </div>
                  <Clock className="h-10 w-10 text-purple-500 dark:text-purple-400/80" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* By Department */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="border-b dark:border-gray-700">
              <CardTitle className="dark:text-white">الحضور حسب القسم</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report.byDepartment && report.byDepartment.length > 0 ? (
                  report.byDepartment.map((dept, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium dark:text-gray-200">{dept.department}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {dept.employees} موظف • {dept.rate}%
                        </span>
                      </div>
                      <Progress value={dept.rate} className="h-2 dark:bg-gray-700" />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">لا توجد بيانات</div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default AttendanceReport;
