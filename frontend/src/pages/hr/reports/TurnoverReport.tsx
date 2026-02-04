import React, { useState, useEffect } from 'react';
import { Users, UserPlus, UserMinus, TrendingUp, Download, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import api from '@/services/api';
import { toast } from 'sonner';

interface TurnoverReport {
  totalEmployees: number;
  newHires: number;
  resignations: number;
  terminations: number;
  turnoverRate: number;
  retentionRate: number;
  byDepartment: {
    department: string;
    employees: number;
    newHires: number;
    exits: number;
    turnoverRate: number;
  }[];
  exitReasons: {
    reason: string;
    count: number;
    percentage: number;
  }[];
  averageTenure: number;
}

const months = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const TurnoverReport: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [report, setReport] = useState<TurnoverReport | null>(null);

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

      const response = await api.get(`/hr/reports/turnover?${params}`);
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
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">معدل الدوران</p>
                    <h3 className="text-3xl font-bold mt-1">{report.turnoverRate}%</h3>
                  </div>
                  <TrendingUp className="h-10 w-10 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">موظفون جدد</p>
                    <h3 className="text-3xl font-bold mt-1 text-green-600">{report.newHires}</h3>
                  </div>
                  <UserPlus className="h-10 w-10 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">استقالات</p>
                    <h3 className="text-3xl font-bold mt-1 text-orange-600">{report.resignations}</h3>
                  </div>
                  <UserMinus className="h-10 w-10 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">معدل الاحتفاظ</p>
                    <h3 className="text-3xl font-bold mt-1 text-purple-600">{report.retentionRate}%</h3>
                  </div>
                  <Users className="h-10 w-10 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-gray-500 text-sm">إجمالي الموظفين</p>
                  <h3 className="text-4xl font-bold mt-2 text-primary">{report.totalEmployees}</h3>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-gray-500 text-sm">متوسط مدة الخدمة</p>
                  <h3 className="text-4xl font-bold mt-2 text-blue-600">{report.averageTenure} سنة</h3>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* By Department */}
          <Card>
            <CardHeader>
              <CardTitle>معدل الدوران حسب القسم</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report.byDepartment.map((dept, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{dept.department}</span>
                      <span className="text-sm text-gray-500">
                        {dept.employees} موظف • +{dept.newHires} -{dept.exits} • {dept.turnoverRate.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={dept.turnoverRate} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Exit Reasons */}
          <Card>
            <CardHeader>
              <CardTitle>أسباب المغادرة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {report.exitReasons.map((reason, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="font-medium">{reason.reason}</p>
                      <p className="text-sm text-gray-500">{reason.count} حالة</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{reason.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default TurnoverReport;
