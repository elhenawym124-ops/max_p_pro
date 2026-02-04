import React, { useState, useEffect } from 'react';
import { Award, TrendingUp, Target, Download, RefreshCw, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import api from '@/services/api';
import { toast } from 'sonner';

interface PerformanceReport {
  totalReviews: number;
  averageScore: number;
  excellentCount: number;
  goodCount: number;
  needsImprovementCount: number;
  byDepartment: {
    department: string;
    avgScore: number;
    reviews: number;
  }[];
  topPerformers: {
    name: string;
    score: number;
    department: string;
  }[];
  goalsAchievement: {
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
  };
}

const months = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const PerformanceReport: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [report, setReport] = useState<PerformanceReport | null>(null);

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

      const response = await api.get(`/hr/reports/performance?${params}`);
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
            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">متوسط الأداء</p>
                    <h3 className="text-3xl font-bold mt-1">{report.averageScore.toFixed(1)}/5</h3>
                  </div>
                  <Award className="h-10 w-10 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">ممتاز</p>
                    <h3 className="text-3xl font-bold mt-1 text-green-600">{report.excellentCount}</h3>
                  </div>
                  <TrendingUp className="h-10 w-10 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">جيد</p>
                    <h3 className="text-3xl font-bold mt-1 text-blue-600">{report.goodCount}</h3>
                  </div>
                  <Users className="h-10 w-10 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">يحتاج تحسين</p>
                    <h3 className="text-3xl font-bold mt-1 text-orange-600">{report.needsImprovementCount}</h3>
                  </div>
                  <Target className="h-10 w-10 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Goals Achievement */}
          <Card>
            <CardHeader>
              <CardTitle>إنجاز الأهداف</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-500">إجمالي الأهداف</p>
                  <h4 className="text-2xl font-bold mt-1">{report.goalsAchievement.total}</h4>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-green-600 dark:text-green-400">مكتملة</p>
                  <h4 className="text-2xl font-bold mt-1 text-green-600">{report.goalsAchievement.completed}</h4>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-600 dark:text-blue-400">قيد التنفيذ</p>
                  <h4 className="text-2xl font-bold mt-1 text-blue-600">{report.goalsAchievement.inProgress}</h4>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-500">لم تبدأ</p>
                  <h4 className="text-2xl font-bold mt-1">{report.goalsAchievement.notStarted}</h4>
                </div>
              </div>
              <div className="mt-4">
                <Progress 
                  value={(report.goalsAchievement.completed / report.goalsAchievement.total) * 100} 
                  className="h-3" 
                />
                <p className="text-sm text-gray-500 mt-2 text-center">
                  نسبة الإنجاز: {((report.goalsAchievement.completed / report.goalsAchievement.total) * 100).toFixed(1)}%
                </p>
              </div>
            </CardContent>
          </Card>

          {/* By Department */}
          <Card>
            <CardHeader>
              <CardTitle>الأداء حسب القسم</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report.byDepartment.map((dept, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{dept.department}</span>
                      <span className="text-sm text-gray-500">
                        {dept.reviews} تقييم • {dept.avgScore.toFixed(1)}/5
                      </span>
                    </div>
                    <Progress value={(dept.avgScore / 5) * 100} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Performers */}
          <Card>
            <CardHeader>
              <CardTitle>أفضل الموظفين أداءً</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {report.topPerformers.map((performer, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center text-white font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{performer.name}</p>
                        <p className="text-sm text-gray-500">{performer.department}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">{performer.score.toFixed(1)}/5</p>
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

export default PerformanceReport;
