import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, UserX, Download, RefreshCw, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import api from '@/services/api';
import { toast } from 'sonner';

interface LateAbsenceReport {
  totalLateArrivals: number;
  totalAbsences: number;
  totalLateMinutes: number;
  averageLateMinutes: number;
  byDepartment: {
    department: string;
    lateCount: number;
    absenceCount: number;
    avgLateMinutes: number;
  }[];
  frequentLateEmployees: {
    name: string;
    lateCount: number;
    totalMinutes: number;
    department: string;
  }[];
  frequentAbsentEmployees: {
    name: string;
    absenceCount: number;
    department: string;
  }[];
  byDayOfWeek: {
    day: string;
    lateCount: number;
    absenceCount: number;
  }[];
}

const months = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const LateAbsenceReport: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [report, setReport] = useState<LateAbsenceReport | null>(null);

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

      const response = await api.get(`/hr/reports/late-absence?${params}`);
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
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>الشهر</Label>
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
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
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
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

            <div className="flex gap-2 mr-auto">
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
            <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-100 text-sm">حالات التأخير</p>
                    <h3 className="text-3xl font-bold mt-1">{report.totalLateArrivals}</h3>
                  </div>
                  <Clock className="h-10 w-10 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">حالات الغياب</p>
                    <h3 className="text-3xl font-bold mt-1 text-orange-600">{report.totalAbsences}</h3>
                  </div>
                  <UserX className="h-10 w-10 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">إجمالي دقائق التأخير</p>
                    <h3 className="text-3xl font-bold mt-1 text-red-600">{report.totalLateMinutes}</h3>
                  </div>
                  <TrendingDown className="h-10 w-10 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">متوسط التأخير</p>
                    <h3 className="text-3xl font-bold mt-1 text-purple-600">{report.averageLateMinutes} د</h3>
                  </div>
                  <AlertTriangle className="h-10 w-10 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* By Department */}
          <Card>
            <CardHeader>
              <CardTitle>التأخير والغياب حسب القسم</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report.byDepartment.map((dept, index) => (
                  <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{dept.department}</span>
                      <span className="text-sm text-gray-500">
                        متوسط التأخير: {dept.avgLateMinutes} دقيقة
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">حالات التأخير</p>
                        <p className="text-lg font-bold text-red-600">{dept.lateCount}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">حالات الغياب</p>
                        <p className="text-lg font-bold text-orange-600">{dept.absenceCount}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Frequent Late Employees */}
            <Card>
              <CardHeader>
                <CardTitle>الموظفون الأكثر تأخيراً</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.frequentLateEmployees.map((employee, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div>
                        <p className="font-medium">{employee.name}</p>
                        <p className="text-sm text-gray-500">{employee.department}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-600">{employee.lateCount} مرة</p>
                        <p className="text-sm text-gray-500">{employee.totalMinutes} دقيقة</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Frequent Absent Employees */}
            <Card>
              <CardHeader>
                <CardTitle>الموظفون الأكثر غياباً</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.frequentAbsentEmployees.map((employee, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <div>
                        <p className="font-medium">{employee.name}</p>
                        <p className="text-sm text-gray-500">{employee.department}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-orange-600">{employee.absenceCount} يوم</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* By Day of Week */}
          <Card>
            <CardHeader>
              <CardTitle>التوزيع حسب أيام الأسبوع</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {report.byDayOfWeek.map((day, index) => {
                  const total = day.lateCount + day.absenceCount;
                  const maxTotal = Math.max(...report.byDayOfWeek.map(d => d.lateCount + d.absenceCount));
                  const percentage = (total / maxTotal) * 100;
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{day.day}</span>
                        <span className="text-sm text-gray-500">
                          {day.lateCount} تأخير • {day.absenceCount} غياب
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default LateAbsenceReport;
