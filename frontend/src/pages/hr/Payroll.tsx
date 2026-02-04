import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  DollarSign, Plus, Download, Filter, Eye, Edit, Trash2,
  ChevronLeft, ChevronRight, Check, CreditCard, FileText,
  Calculator, TrendingUp, Users, Calendar, MoreVertical
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Checkbox } from '@/components/ui/checkbox';
import api from '@/services/api';
import { toast } from 'sonner';

interface Payroll {
  id: string;
  month: number;
  year: number;
  baseSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  overtimeAmount: number;
  bonuses: number;
  socialInsurance: number;
  taxAmount: number;
  grossSalary: number;
  netSalary: number;
  attendanceDeduction: number;
  absentDays: number;
  latePenalty: number;
  status: string;
  paidAt: string | null;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    avatar: string;
    department: { name: string } | null;
    position: { title: string } | null;
  };
}

interface PayrollSummary {
  month: number;
  year: number;
  totalEmployees: number;
  totalBaseSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  totalOvertime: number;
  totalBonuses: number;
  totalGross: number;
  totalNet: number;
  byStatus: Record<string, number>;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'مسودة', color: 'bg-gray-100 text-gray-800' },
  PENDING_APPROVAL: { label: 'بانتظار الاعتماد', color: 'bg-yellow-100 text-yellow-800' },
  APPROVED: { label: 'معتمد', color: 'bg-blue-100 text-blue-800' },
  PAID: { label: 'مدفوع', color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'ملغي', color: 'bg-red-100 text-red-800' },
  PROJECTION: { label: 'توقع (تقريبي)', color: 'bg-purple-100 text-purple-800 border-purple-200' },
};

const months = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const Payroll: React.FC = () => {
  const location = useLocation();
  const isMyPayroll = location.pathname.includes('/my-payroll');

  const [loading, setLoading] = useState(true);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Filters
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [statusFilter, setStatusFilter] = useState('all');

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Dialog states
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [forceRegenerate, setForceRegenerate] = useState(false);

  // Edit form data
  const [editFormData, setEditFormData] = useState({
    baseSalary: 0,
    totalAllowances: 0,
    totalDeductions: 0,
    overtimeAmount: 0,
    bonuses: 0,
    socialInsurance: 0,
    taxAmount: 0,
  });

  useEffect(() => {
    fetchPayrolls();
    if (!isMyPayroll) {
      fetchSummary();
    }
  }, [pagination.page, selectedMonth, selectedYear, statusFilter]);

  const fetchPayrolls = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        month: selectedMonth.toString(),
        year: selectedYear.toString(),
      });

      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);

      const endpoint = isMyPayroll ? '/hr/payroll/my-history' : '/hr/payroll';
      const response = await api.get(`${endpoint}?${params}`);

      let fetchedPayrolls = response.data.payrolls;

      // If My Payroll and Current Month, verify if we need to show projection
      if (isMyPayroll) {
        const now = new Date();
        const isCurrentMonth = selectedMonth === (now.getMonth() + 1) && selectedYear === now.getFullYear();

        // If current month and no payroll exists (or even if it does, logic can vary, best to show projection if no valid payroll)
        const hasCurrentPayroll = fetchedPayrolls.some((p: any) => p.month === selectedMonth && p.year === selectedYear);

        if (isCurrentMonth && !hasCurrentPayroll) {
          try {
            const projResponse = await api.get('/hr/payroll/my-projection');
            
            if (projResponse.data.success && projResponse.data.projection) {
              fetchedPayrolls = [projResponse.data.projection, ...fetchedPayrolls];
            }
          } catch (err) {
            console.error('❌ [Payroll] Failed to fetch projection:', err);
          }
        }
      }
      
      setPayrolls(fetchedPayrolls);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination.total + (fetchedPayrolls.length > response.data.payrolls.length ? 1 : 0),
        totalPages: response.data.pagination.totalPages
      }));
    } catch (error) {
      console.error('❌ [Payroll] Error fetching payrolls:', error);
      toast.error('حدث خطأ أثناء جلب كشوف الرواتب');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await api.get(`/hr/payroll/summary?month=${selectedMonth}&year=${selectedYear}`);
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const handleGeneratePayroll = async () => {
    try {
      setGenerating(true);
      const response = await api.post('/hr/payroll/generate', {
        month: selectedMonth,
        year: selectedYear,
        forceRegenerate
      });

      const result = response.data.result;
      
      // Show success message
      if (result.success.length > 0) {
        toast.success(`تم توليد ${result.success.length} كشف راتب جديد`);
      }
      
      // Show regenerated message
      if (result.regenerated && result.regenerated.length > 0) {
        toast.success(`تم إعادة توليد ${result.regenerated.length} كشف راتب`);
      }
      
      // Show skipped message
      if (result.skipped && result.skipped.length > 0) {
        toast.info(`تم تخطي ${result.skipped.length} موظف (لديهم كشوف رواتب مسبقاً)`);
      }
      
      // Show failed message
      if (result.failed.length > 0) {
        toast.warning(`فشل توليد ${result.failed.length} كشف`);
      }

      setShowGenerateDialog(false);
      setForceRegenerate(false);
      fetchPayrolls();
      fetchSummary();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (payrollId: string) => {
    try {
      await api.post(`/hr/payroll/${payrollId}/approve`);
      toast.success('تم اعتماد كشف الراتب');
      fetchPayrolls();
      if (!isMyPayroll) {
        fetchSummary();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const handlePay = async (payrollId: string) => {
    try {
      await api.post(`/hr/payroll/${payrollId}/pay`, {
        method: 'bank_transfer'
      });
      toast.success('تم صرف الراتب');
      fetchPayrolls();
      if (!isMyPayroll) {
        fetchSummary();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const handleBulkPay = async () => {
    if (selectedIds.length === 0) {
      toast.error('اختر كشوف الرواتب أولاً');
      return;
    }

    try {
      await api.post('/hr/payroll/bulk-pay', {
        payrollIds: selectedIds,
        paymentData: { method: 'bank_transfer' }
      });
      toast.success(`تم صرف ${selectedIds.length} راتب`);
      setSelectedIds([]);
      fetchPayrolls();
      if (!isMyPayroll) {
        fetchSummary();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const formatCurrency = (amount: number | undefined | null) => {
    const value = amount ?? 0;
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === payrolls.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(payrolls.map(p => p.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleEdit = (payroll: Payroll) => {
    setSelectedPayroll(payroll);
    setEditFormData({
      baseSalary: payroll.baseSalary,
      totalAllowances: payroll.totalAllowances,
      totalDeductions: payroll.totalDeductions,
      overtimeAmount: payroll.overtimeAmount,
      bonuses: payroll.bonuses,
      socialInsurance: payroll.socialInsurance,
      taxAmount: payroll.taxAmount,
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedPayroll) return;
    try {
      setSaving(true);
      await api.put(`/hr/payroll/${selectedPayroll.id}`, editFormData);
      toast.success('تم تحديث كشف الراتب بنجاح');
      setShowEditDialog(false);
      fetchPayrolls();
      fetchSummary();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ أثناء التحديث');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = (payroll: Payroll) => {
    // إنشاء محتوى الطباعة
    const printContent = `
      <html dir="rtl">
        <head>
          <title>كشف راتب - ${payroll.employee?.firstName} ${payroll.employee?.lastName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; direction: rtl; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .employee-info { margin-bottom: 20px; }
            .salary-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .salary-table th, .salary-table td { border: 1px solid #ddd; padding: 8px; text-align: right; }
            .salary-table th { background-color: #f5f5f5; }
            .total-row { font-weight: bold; background-color: #f0f8ff; }
            .net-salary { font-size: 18px; color: #2563eb; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>كشف راتب</h1>
            <h2>${months[(payroll.month || selectedMonth) - 1]} ${payroll.year || selectedYear}</h2>
          </div>
          
          <div class="employee-info">
            <h3>بيانات الموظف</h3>
            <p><strong>الاسم:</strong> ${payroll.employee?.firstName} ${payroll.employee?.lastName}</p>
            <p><strong>رقم الموظف:</strong> ${payroll.employee?.employeeNumber || '-'}</p>
            <p><strong>القسم:</strong> ${payroll.employee?.department?.name || '-'}</p>
            <p><strong>المنصب:</strong> ${payroll.employee?.position?.title || '-'}</p>
          </div>

          <table class="salary-table">
            <thead>
              <tr>
                <th>البيان</th>
                <th>المبلغ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>الراتب الأساسي</td>
                <td>${formatCurrency(payroll.baseSalary)}</td>
              </tr>
              <tr>
                <td>البدلات</td>
                <td>${formatCurrency(payroll.totalAllowances)}</td>
              </tr>
              <tr>
                <td>العمل الإضافي</td>
                <td>${formatCurrency(payroll.overtimeAmount)}</td>
              </tr>
              <tr>
                <td>المكافآت</td>
                <td>${formatCurrency(payroll.bonuses)}</td>
              </tr>
              <tr class="total-row">
                <td>إجمالي الاستحقاقات</td>
                <td>${formatCurrency(payroll.grossSalary)}</td>
              </tr>
              <tr>
                <td>الخصومات الأخرى</td>
                <td>-${formatCurrency(payroll.totalDeductions - payroll.attendanceDeduction - payroll.latePenalty)}</td>
              </tr>
              ${payroll.attendanceDeduction > 0 ? `
              <tr>
                <td>خصم الغياب (${payroll.absentDays} يوم)</td>
                <td>-${formatCurrency(payroll.attendanceDeduction)}</td>
              </tr>
              ` : ''}
              ${payroll.latePenalty > 0 ? `
              <tr>
                <td>خصم التأخير</td>
                <td>-${formatCurrency(payroll.latePenalty)}</td>
              </tr>
              ` : ''}
              ${payroll.socialInsurance > 0 ? `
              <tr>
                <td>التأمينات الاجتماعية</td>
                <td>-${formatCurrency(payroll.socialInsurance)}</td>
              </tr>
              ` : ''}
              ${payroll.taxAmount > 0 ? `
              <tr>
                <td>الضرائب</td>
                <td>-${formatCurrency(payroll.taxAmount)}</td>
              </tr>
              ` : ''}
              <tr class="total-row net-salary">
                <td>صافي الراتب</td>
                <td>${formatCurrency(payroll.netSalary)}</td>
              </tr>
            </tbody>
          </table>

          <div style="margin-top: 40px;">
            <p><strong>تاريخ الطباعة:</strong> ${new Date().toLocaleDateString('ar-EG')}</p>
            ${payroll.paidAt ? `<p><strong>تاريخ الصرف:</strong> ${new Date(payroll.paidAt).toLocaleDateString('ar-EG')}</p>` : ''}
          </div>
        </body>
      </html>
    `;

    // فتح نافذة طباعة جديدة
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    } else {
      toast.error('فشل في فتح نافذة الطباعة');
    }
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isMyPayroll ? 'رواتبي' : 'إدارة الرواتب'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {months[selectedMonth - 1]} {selectedYear}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Download className="h-4 w-4 ml-2" />
            تصدير
          </Button>
          {!isMyPayroll && (
            <Button onClick={() => setShowGenerateDialog(true)}>
              <Calculator className="h-4 w-4 ml-2" />
              توليد الرواتب
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {!isMyPayroll && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">عدد الموظفين</p>
                  <h3 className="text-3xl font-bold mt-1">{summary?.totalEmployees || 0}</h3>
                </div>
                <Users className="h-10 w-10 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">إجمالي الرواتب</p>
                  <h3 className="text-2xl font-bold mt-1">
                    {formatCurrency(summary?.totalGross || 0)}
                  </h3>
                </div>
                <DollarSign className="h-10 w-10 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">صافي الرواتب</p>
                  <h3 className="text-2xl font-bold mt-1">
                    {formatCurrency(summary?.totalNet || 0)}
                  </h3>
                </div>
                <CreditCard className="h-10 w-10 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">الخصومات</p>
                  <h3 className="text-2xl font-bold mt-1">
                    {formatCurrency(summary?.totalDeductions || 0)}
                  </h3>
                </div>
                <TrendingUp className="h-10 w-10 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
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

            {selectedIds.length > 0 && !isMyPayroll && (
              <Button onClick={handleBulkPay} className="mr-auto">
                <CreditCard className="h-4 w-4 ml-2" />
                صرف المحدد ({selectedIds.length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payroll Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : payrolls.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <DollarSign className="h-12 w-12 mb-4 opacity-50" />
              <p>لا توجد كشوف رواتب</p>
              {!isMyPayroll && (
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => setShowGenerateDialog(true)}
                >
                  توليد كشوف الرواتب
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {!isMyPayroll && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIds.length === payrolls.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                  )}
                  {!isMyPayroll && <TableHead className="text-right">الموظف</TableHead>}
                  {isMyPayroll && <TableHead className="text-right">الفترة</TableHead>}
                  <TableHead className="text-right">الراتب الأساسي</TableHead>
                  <TableHead className="text-right">البدلات</TableHead>
                  <TableHead className="text-right">الخصومات</TableHead>
                  <TableHead className="text-right">صافي الراتب</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrolls.map((payroll) => {
                  return (
                    <TableRow key={payroll.id}>
                      {!isMyPayroll && (
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(payroll.id)}
                            onCheckedChange={() => toggleSelect(payroll.id)}
                          />
                        </TableCell>
                      )}
                      {!isMyPayroll && (
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={payroll.employee?.avatar} />
                              <AvatarFallback>
                                {payroll.employee?.firstName?.[0]}{payroll.employee?.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {payroll.employee?.firstName} {payroll.employee?.lastName}
                              </p>
                              <p className="text-sm text-gray-500">
                                {payroll.employee?.position?.title}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      )}
                      {isMyPayroll && (
                        <TableCell>
                          {months[(payroll.month || selectedMonth) - 1]} {payroll.year || selectedYear}
                        </TableCell>
                      )}
                      <TableCell>{formatCurrency(payroll.baseSalary)}</TableCell>
                      <TableCell className="text-green-600">
                        +{formatCurrency(payroll.totalAllowances)}
                      </TableCell>
                      <TableCell className="text-red-600">
                        -{formatCurrency(payroll.totalDeductions)}
                      </TableCell>
                      <TableCell className={`font-bold ${payroll.netSalary < 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'} ltr:text-left rtl:text-right`}>
                        <span dir="ltr">{formatCurrency(payroll.netSalary)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig[payroll.status]?.color || ''}>
                          {statusConfig[payroll.status]?.label || payroll.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedPayroll(payroll);
                              setShowDetailsDialog(true);
                            }}>
                              <Eye className="h-4 w-4 ml-2" />
                              عرض التفاصيل
                            </DropdownMenuItem>
                            {!isMyPayroll && payroll.status === 'DRAFT' && (
                              <>
                                <DropdownMenuItem onClick={() => handleEdit(payroll)}>
                                  <Edit className="h-4 w-4 ml-2" />
                                  تعديل
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleApprove(payroll.id)}>
                                  <Check className="h-4 w-4 ml-2" />
                                  اعتماد
                                </DropdownMenuItem>
                              </>
                            )}
                            {!isMyPayroll && payroll.status === 'APPROVED' && (
                              <DropdownMenuItem onClick={() => handlePay(payroll.id)}>
                                <CreditCard className="h-4 w-4 ml-2" />
                                صرف
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handlePrint(payroll)}>
                              <FileText className="h-4 w-4 ml-2" />
                              طباعة
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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

      {/* Generate Payroll Dialog */}
      {!isMyPayroll && (
        <Dialog open={showGenerateDialog} onOpenChange={(open) => {
          setShowGenerateDialog(open);
          if (!open) setForceRegenerate(false);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>توليد كشوف الرواتب</DialogTitle>
            </DialogHeader>

          <div className="py-4 space-y-4">
            <p className="text-gray-600">
              سيتم توليد كشوف رواتب لجميع الموظفين النشطين لشهر {months[selectedMonth - 1]} {selectedYear}
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 text-sm">
                ⚠️ سيتم حساب الرواتب بناءً على سجلات الحضور والإجازات للشهر المحدد
              </p>
            </div>

            <div className="flex items-center space-x-2 space-x-reverse bg-orange-50 border border-orange-200 rounded-lg p-4">
              <Checkbox
                id="forceRegenerate"
                checked={forceRegenerate}
                onCheckedChange={(checked) => setForceRegenerate(checked === true)}
              />
              <div className="flex-1">
                <Label htmlFor="forceRegenerate" className="text-orange-800 font-medium cursor-pointer">
                  إعادة توليد الكشوف الموجودة
                </Label>
                <p className="text-orange-600 text-xs mt-1">
                  ⚠️ سيتم حذف كشوف الرواتب الموجودة لهذا الشهر وإعادة توليدها من جديد
                </p>
              </div>
            </div>
          </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
                إلغاء
              </Button>
              <Button 
                onClick={handleGeneratePayroll} 
                disabled={generating}
                variant={forceRegenerate ? "destructive" : "default"}
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                    جاري التوليد...
                  </>
                ) : forceRegenerate ? (
                  'إعادة توليد الرواتب'
                ) : (
                  'توليد الرواتب'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Payroll Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تفاصيل كشف الراتب</DialogTitle>
          </DialogHeader>

          {selectedPayroll && (
            <div className="space-y-6 py-4">
              {/* Employee Info */}
              <div className="flex items-center gap-4 pb-4 border-b">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedPayroll.employee?.avatar} />
                  <AvatarFallback>
                    {selectedPayroll.employee?.firstName?.[0]}{selectedPayroll.employee?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">
                    {selectedPayroll.employee?.firstName} {selectedPayroll.employee?.lastName}
                  </h3>
                  <p className="text-gray-500">{selectedPayroll.employee?.position?.title}</p>
                  <p className="text-sm text-gray-400">{selectedPayroll.employee?.employeeNumber}</p>
                </div>
                <Badge className={`mr-auto ${statusConfig[selectedPayroll.status]?.color}`}>
                  {statusConfig[selectedPayroll.status]?.label}
                </Badge>
              </div>

              {/* Salary Breakdown */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-semibold text-green-600">الاستحقاقات</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">الراتب الأساسي</span>
                      <span className="font-medium">{formatCurrency(selectedPayroll.baseSalary)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">البدلات</span>
                      <span className="font-medium text-green-600">+{formatCurrency(selectedPayroll.totalAllowances)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">العمل الإضافي</span>
                      <span className="font-medium text-green-600">+{formatCurrency(selectedPayroll.overtimeAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">المكافآت</span>
                      <span className="font-medium text-green-600">+{formatCurrency(selectedPayroll.bonuses)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-red-600">الاستقطاعات</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">الخصومات (أخرى)</span>
                      <span className="font-medium text-red-600">-{formatCurrency(selectedPayroll.totalDeductions - selectedPayroll.attendanceDeduction - selectedPayroll.latePenalty)}</span>
                    </div>
                    {selectedPayroll.absentDays > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">خصم الغياب ({selectedPayroll.absentDays} يوم)</span>
                        <span className="font-medium text-red-600">-{formatCurrency(selectedPayroll.attendanceDeduction)}</span>
                      </div>
                    )}
                    {selectedPayroll.latePenalty > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">خصم التأخير</span>
                        <span className="font-medium text-red-600">-{formatCurrency(selectedPayroll.latePenalty)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">التأمينات</span>
                      <span className="font-medium text-red-600">-{formatCurrency(selectedPayroll.socialInsurance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">الضرائب</span>
                      <span className="font-medium text-red-600">-{formatCurrency(selectedPayroll.taxAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Totals */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">إجمالي الراتب</span>
                  <span className="font-bold">{formatCurrency(selectedPayroll.grossSalary)}</span>
                </div>
                <div className="flex justify-between text-xl">
                  <span className="font-semibold text-primary">صافي الراتب</span>
                  <span className="font-bold text-primary">{formatCurrency(selectedPayroll.netSalary)}</span>
                </div>
              </div>

              {selectedPayroll.paidAt && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800">
                    ✓ تم الصرف بتاريخ {new Date(selectedPayroll.paidAt).toLocaleDateString('ar-EG')}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              إغلاق
            </Button>
            <Button variant="outline" onClick={() => selectedPayroll && handlePrint(selectedPayroll)}>
              <FileText className="h-4 w-4 ml-2" />
              طباعة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Payroll Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تعديل كشف الراتب</DialogTitle>
          </DialogHeader>

          {selectedPayroll && (
            <div className="space-y-6 py-4">
              {/* Employee Info */}
              <div className="flex items-center gap-4 pb-4 border-b">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedPayroll.employee?.avatar} />
                  <AvatarFallback>
                    {selectedPayroll.employee?.firstName?.[0]}{selectedPayroll.employee?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">
                    {selectedPayroll.employee?.firstName} {selectedPayroll.employee?.lastName}
                  </h3>
                  <p className="text-sm text-gray-500">{selectedPayroll.employee?.position?.title}</p>
                </div>
              </div>

              {/* Edit Form */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الراتب الأساسي</Label>
                  <Input
                    type="number"
                    value={editFormData.baseSalary}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, baseSalary: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>البدلات</Label>
                  <Input
                    type="number"
                    value={editFormData.totalAllowances}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, totalAllowances: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>الخصومات</Label>
                  <Input
                    type="number"
                    value={editFormData.totalDeductions}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, totalDeductions: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>العمل الإضافي</Label>
                  <Input
                    type="number"
                    value={editFormData.overtimeAmount}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, overtimeAmount: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>المكافآت</Label>
                  <Input
                    type="number"
                    value={editFormData.bonuses}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, bonuses: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>التأمينات</Label>
                  <Input
                    type="number"
                    value={editFormData.socialInsurance}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, socialInsurance: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>الضرائب</Label>
                  <Input
                    type="number"
                    value={editFormData.taxAmount}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, taxAmount: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              {/* Calculated Totals */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">صافي الراتب المتوقع</span>
                  <span className="font-bold text-primary">
                    {formatCurrency(
                      editFormData.baseSalary +
                      editFormData.totalAllowances +
                      editFormData.overtimeAmount +
                      editFormData.bonuses -
                      editFormData.totalDeductions -
                      editFormData.socialInsurance -
                      editFormData.taxAmount
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                  جاري الحفظ...
                </>
              ) : (
                'حفظ التغييرات'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payroll;
