import React, { useState, useEffect } from 'react';
import { Calendar, FileText, TrendingUp, TrendingDown, Download, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/services/api';
import { toast } from 'sonner';

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

const months = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const LeaveReport: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [report, setReport] = useState<LeaveReport | null>(null);

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

      const response = await api.get(`/hr/reports/leaves?${params}`);
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
                    <p className="text-purple-100 text-sm">إجمالي الطلبات</p>
                    <h3 className="text-3xl font-bold mt-1">{report.totalRequests}</h3>
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
                    <h3 className="text-3xl font-bold mt-1 text-green-600">{report.approved}</h3>
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
                    <h3 className="text-3xl font-bold mt-1 text-red-600">{report.rejected}</h3>
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
                    <h3 className="text-3xl font-bold mt-1 text-blue-600">{report.totalDaysTaken}</h3>
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
                {report.byType && report.byType.length > 0 ? (
                  report.byType.map((type, index) => (
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
    </div>
  );
};

export default LeaveReport;
