import { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FileText, Filter, CheckCircle, XCircle, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import api from '@/services/api';

interface AuditLog {
    id: string;
    action: 'APPROVE' | 'REJECT' | 'UPDATE' | 'CREATE' | string;
    entityType: 'LEAVE' | 'ADVANCE' | 'RESIGNATION' | 'EMPLOYEE' | 'DEPARTMENT' | string;
    entityId: string;
    actorId: string;
    actorName: string;
    details: any;
    createdAt: string;
    actor?: {
        avatar?: string;
    };
}

const AuditLogs = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
    const [filters, setFilters] = useState({
        entityType: '',
        action: '',
        startDate: '',
        endDate: ''
    });

    useEffect(() => {
        fetchAuditLogs();
    }, [pagination.page, filters]);

    const fetchAuditLogs = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                ...filters
            };

            const response = await api.get('/hr/audit-logs', { params });

            if (response.data.success) {
                setLogs(response.data.logs || []);
                setPagination(response.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
            } else {
                setLogs([]);
            }
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'APPROVE':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'REJECT':
                return <XCircle className="h-4 w-4 text-red-500" />;
            case 'UPDATE':
                return <Edit className="h-4 w-4 text-blue-500" />;
            case 'SETTLEMENT':
                return <CheckCircle className="h-4 w-4 text-emerald-500" />;
            default:
                return <FileText className="h-4 w-4 text-gray-500" />;
        }
    };

    const getActionBadge = (action: string) => {
        const variants: Record<string, string> = {
            APPROVE: 'bg-green-100 text-green-800 border-green-200',
            REJECT: 'bg-red-100 text-red-800 border-red-200',
            UPDATE: 'bg-blue-100 text-blue-800 border-blue-200',
            CREATE: 'bg-purple-100 text-purple-800 border-purple-200',
            SETTLEMENT: 'bg-emerald-100 text-emerald-800 border-emerald-200'
        };

        const labels: Record<string, string> = {
            APPROVE: 'موافقة',
            REJECT: 'رفض',
            UPDATE: 'تحديث',
            CREATE: 'إنشاء',
            SETTLEMENT: 'تصفية مستحقات'
        };

        return (
            <Badge className={variants[action] || 'bg-gray-100 text-gray-800'}>
                {labels[action] || action}
            </Badge>
        );
    };

    const getEntityTypeBadge = (entityType: string) => {
        const labels: Record<string, string> = {
            LEAVE: 'إجازة',
            ADVANCE: 'سلفة',
            RESIGNATION: 'استقالة',
            EMPLOYEE: 'موظف',
            DEPARTMENT: 'قسم'
        };

        return (
            <Badge variant="outline">
                {labels[entityType] || entityType}
            </Badge>
        );
    };

    const formatDetails = (details: any) => {
        try {
            const parsed = typeof details === 'string' ? JSON.parse(details) : details;
            return (
                <div className="text-sm text-gray-600 mt-1 space-y-1">
                    {parsed.leaveType && <div>النوع: {parsed.leaveType === 'ANNUAL' ? 'سنوية' : 'مرضية'}</div>}
                    {parsed.totalDays && <div>عدد الأيام: {parsed.totalDays}</div>}
                    {parsed.rejectionReason && <div>سبب الرفض: {parsed.rejectionReason}</div>}
                    {parsed.newStatus && <div>الحالة الجديدة: {parsed.newStatus}</div>}
                </div>
            );
        } catch {
            return null;
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-6" dir="rtl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">📝 سجلات التدقيق</h1>
                    <p className="text-gray-500 mt-1">سجل كامل لجميع العمليات والتغييرات</p>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        تصفية السجلات
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Select
                            value={filters.entityType || 'all'}
                            onValueChange={(value) => setFilters({ ...filters, entityType: value === 'all' ? '' : value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="نوع الكيان" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">الكل</SelectItem>
                                <SelectItem value="LEAVE">إجازة</SelectItem>
                                <SelectItem value="ADVANCE">سلفة</SelectItem>
                                <SelectItem value="RESIGNATION">استقالة</SelectItem>
                                <SelectItem value="EMPLOYEE">موظف</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={filters.action || 'all'}
                            onValueChange={(value) => setFilters({ ...filters, action: value === 'all' ? '' : value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="نوع العملية" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">الكل</SelectItem>
                                <SelectItem value="APPROVE">موافقة</SelectItem>
                                <SelectItem value="REJECT">رفض</SelectItem>
                                <SelectItem value="UPDATE">تحديث</SelectItem>
                                <SelectItem value="CREATE">إنشاء</SelectItem>
                                <SelectItem value="SETTLEMENT">تصفية مستحقات</SelectItem>
                            </SelectContent>
                        </Select>

                        <Input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            placeholder="من تاريخ"
                        />

                        <Input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            placeholder="إلى تاريخ"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Logs List */}
            <Card>
                <CardHeader>
                    <CardTitle>السجلات ({pagination.total})</CardTitle>
                    <CardDescription>
                        عرض {logs?.length || 0} من أصل {pagination?.total || 0} سجل
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8">جاري التحميل...</div>
                    ) : !logs || logs.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                            لا توجد سجلات
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {logs.map((log) => (
                                <div
                                    key={log.id}
                                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex-shrink-0 mt-1">
                                        {getActionIcon(log.action)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            {getActionBadge(log.action)}
                                            {getEntityTypeBadge(log.entityType)}
                                        </div>

                                        <div className="flex items-center gap-2 mb-1">
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={log.actor?.avatar} />
                                                <AvatarFallback>
                                                    {log.actorName?.charAt(0) || 'U'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium">{log.actorName}</span>
                                            <span className="text-gray-500">•</span>
                                            <span className="text-sm text-gray-500">
                                                {format(new Date(log.createdAt), 'dd MMM yyyy, HH:mm', { locale: ar })}
                                            </span>
                                        </div>

                                        {formatDetails(log.details)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6 pt-4 border-t">
                            <Button
                                variant="outline"
                                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                                disabled={pagination.page === 1}
                            >
                                السابق
                            </Button>
                            <span className="text-sm text-gray-600">
                                صفحة {pagination.page} من {pagination.totalPages}
                            </span>
                            <Button
                                variant="outline"
                                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                                disabled={pagination.page === pagination.totalPages}
                            >
                                التالي
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default AuditLogs;
