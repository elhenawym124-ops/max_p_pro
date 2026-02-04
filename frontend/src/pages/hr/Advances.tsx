import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    DollarSign, Plus, Check, X, Calendar,
    ChevronLeft, ChevronRight, TrendingUp
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Progress } from '@/components/ui/progress';
import api from '@/services/api';
import { toast } from 'sonner';

interface AdvanceRequest {
    id: string;
    amount: number;
    reason: string;
    requestDate: string;
    status: string;
    repaymentType: string;
    installmentsCount: number;
    monthlyAmount: number;
    approvedAt: string | null;
    employee: {
        id: string;
        firstName: string;
        lastName: string;
        employeeNumber: string;
        avatar: string;
        department: { name: string } | null;
        position: { title: string } | null;
    };
    installments: Array<{
        id: string;
        amount: number;
        dueDate: string;
        status: string;
        paidAt: string | null;
    }>;
}

const statusConfig: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'بانتظار الموافقة', color: 'bg-yellow-100 text-yellow-800' },
    APPROVED: { label: 'معتمد', color: 'bg-blue-100 text-blue-800' },
    REJECTED: { label: 'مرفوض', color: 'bg-red-100 text-red-800' },
    COMPLETED: { label: 'مكتمل', color: 'bg-green-100 text-green-800' },
};

const Advances: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<AdvanceRequest[]>([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    });
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        fetchAdvances();
    }, [pagination.page, statusFilter]);

    const fetchAdvances = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: pagination.limit.toString(),
            });

            if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);

            const response = await api.get(`/hr/advances?${params}`);

            // التأكد من وجود البيانات
            const advancesData = response.data.data || [];
            setRequests(Array.isArray(advancesData) ? advancesData : []);

            if (response.data.pagination) {
                setPagination(prev => ({
                    ...prev,
                    total: response.data.pagination.total,
                    totalPages: response.data.pagination.totalPages
                }));
            }
        } catch (error) {
            console.error('Error fetching advances:', error);
            toast.error('حدث خطأ أثناء جلب البيانات');
            setRequests([]); // تعيين array فاضي في حالة الخطأ
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        try {
            await api.post(`/hr/advances/${id}/approve`);
            toast.success('تم الموافقة على الطلب');
            fetchAdvances();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'حدث خطأ');
        }
    };

    const handleReject = async (id: string) => {
        try {
            await api.post(`/hr/advances/${id}/reject`, {
                rejectionReason: 'تم الرفض من قبل الإدارة'
            });
            toast.success('تم رفض الطلب');
            fetchAdvances();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'حدث خطأ');
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ar-EG', {
            style: 'currency',
            currency: 'EGP',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const calculatePaidAmount = (installments: any[]) => {
        if (!installments || !Array.isArray(installments)) return 0;
        return installments
            .filter(i => i.status === 'PAID')
            .reduce((sum, i) => sum + parseFloat(i.amount), 0);
    };

    const calculateProgress = (request: AdvanceRequest) => {
        if (!request.installments || !Array.isArray(request.installments)) return 0;
        const paid = calculatePaidAmount(request.installments);
        return (paid / parseFloat(request.amount.toString())) * 100;
    };

    // حساب الإحصائيات
    const stats = {
        total: requests?.length || 0,
        pending: requests?.filter(r => r.status === 'PENDING').length || 0,
        approved: requests?.filter(r => r.status === 'APPROVED').length || 0,
        totalAmount: requests?.reduce((sum, r) => sum + parseFloat(r.amount.toString()), 0) || 0,
    };

    return (
        <div className="p-6 space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        إدارة السلف
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        متابعة طلبات السلف والأقساط
                    </p>
                </div>
                <Button onClick={() => navigate('/hr/advances/new')}>
                    <Plus className="h-4 w-4 ml-2" />
                    طلب سلفة جديد
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-sm">إجمالي الطلبات</p>
                                <h3 className="text-3xl font-bold mt-1">{stats.total}</h3>
                            </div>
                            <DollarSign className="h-10 w-10 opacity-80" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-yellow-100 text-sm">بانتظار الموافقة</p>
                                <h3 className="text-3xl font-bold mt-1">{stats.pending}</h3>
                            </div>
                            <Calendar className="h-10 w-10 opacity-80" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-green-100 text-sm">معتمد</p>
                                <h3 className="text-3xl font-bold mt-1">{stats.approved}</h3>
                            </div>
                            <Check className="h-10 w-10 opacity-80" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-purple-100 text-sm">إجمالي المبالغ</p>
                                <h3 className="text-2xl font-bold mt-1">
                                    {formatCurrency(stats.totalAmount)}
                                </h3>
                            </div>
                            <TrendingUp className="h-10 w-10 opacity-80" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex gap-4 items-center">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="الحالة" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">الكل</SelectItem>
                                {Object.entries(statusConfig).map(([key, config]) => (
                                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Requests Table */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                            <DollarSign className="h-12 w-12 mb-4 opacity-50" />
                            <p>لا توجد طلبات سلف</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-right">الموظف</TableHead>
                                    <TableHead className="text-right">المبلغ</TableHead>
                                    <TableHead className="text-right">نوع السداد</TableHead>
                                    <TableHead className="text-right">التقدم</TableHead>
                                    <TableHead className="text-right">الحالة</TableHead>
                                    <TableHead className="text-right">الإجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requests.map((request) => (
                                    <TableRow key={request.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage src={request.employee?.avatar} />
                                                    <AvatarFallback>
                                                        {request.employee?.firstName?.[0]}{request.employee?.lastName?.[0]}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">
                                                        {request.employee?.firstName} {request.employee?.lastName}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {request.employee?.position?.title}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-bold">
                                            {formatCurrency(request.amount)}
                                        </TableCell>
                                        <TableCell>
                                            {request.repaymentType === 'ONE_TIME' ? 'دفعة واحدة' : `${request.installmentsCount} أقساط`}
                                        </TableCell>
                                        <TableCell>
                                            {request.status === 'APPROVED' && (
                                                <div className="space-y-1">
                                                    <Progress value={calculateProgress(request)} className="h-2" />
                                                    <p className="text-xs text-gray-500">
                                                        {formatCurrency(calculatePaidAmount(request.installments))} / {formatCurrency(request.amount)}
                                                    </p>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={statusConfig[request.status]?.color || ''}>
                                                {statusConfig[request.status]?.label || request.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                {request.status === 'PENDING' && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleApprove(request.id)}
                                                        >
                                                            <Check className="h-4 w-4 ml-1" />
                                                            موافقة
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleReject(request.id)}
                                                        >
                                                            <X className="h-4 w-4 ml-1" />
                                                            رفض
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
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
        </div>
    );
};

export default Advances;
