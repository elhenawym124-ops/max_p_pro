import React, { useState, useEffect } from 'react';
import { TrendingUp, Plus, Calendar, Briefcase, Trash2, Edit, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { toast } from 'sonner';

interface Promotion {
  id: string;
  employeeId: string;
  fromPositionId?: string;
  toPositionId: string;
  fromPositionName?: string;
  toPositionName: string;
  fromSalary?: number | string;
  toSalary?: number | string;
  promotionDate: string;
  effectiveDate: string;
  reason: string;
  approvedBy?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
        employee?: {
          firstName: string;
          lastName: string;
          employeeNumber: string;
          avatar?: string;
        };
        user?: {
          firstName: string;
          lastName: string;
          employeeNumber: string;
          avatar?: string;
        };
  fromPosition?: {
    id: string;
    title: string;
  } | null;
  toPosition: {
    id: string;
    title: string;
  };
}

const EmployeesPromotion: React.FC = () => {
  const navigate = useNavigate();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [filteredPromotions, setFilteredPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('promotionDate');

  useEffect(() => {
    fetchPromotions();
  }, []);

  useEffect(() => {
    // Filter promotions based on search term and status
    let filtered = promotions;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(promotion => {
        const employeeName = `${(promotion.user || promotion.employee)?.firstName} ${(promotion.user || promotion.employee)?.lastName}`.toLowerCase();
        const fromPosition = promotion.fromPositionName?.toLowerCase() || '';
        const toPosition = promotion.toPositionName?.toLowerCase() || '';
        const reason = promotion.reason?.toLowerCase() || '';
        
        return employeeName.includes(searchTerm.toLowerCase()) ||
               fromPosition.includes(searchTerm.toLowerCase()) ||
               toPosition.includes(searchTerm.toLowerCase()) ||
               reason.includes(searchTerm.toLowerCase());
      });
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(promotion => promotion.status === statusFilter);
    }

    // Sort promotions
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'promotionDate':
          return new Date(b.promotionDate).getTime() - new Date(a.promotionDate).getTime();
        case 'employeeName':
          const nameA = `${(a.user || a.employee)?.firstName} ${(a.user || a.employee)?.lastName}`.toLowerCase();
          const nameB = `${(b.user || b.employee)?.firstName} ${(b.user || b.employee)?.lastName}`.toLowerCase();
          return nameA.localeCompare(nameB);
        case 'toPosition':
          return (a.toPositionName || '').localeCompare(b.toPositionName || '');
        default:
          return 0;
      }
    });

    setFilteredPromotions(filtered);
  }, [promotions, searchTerm, statusFilter, sortBy]);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/hr/promotions');
      console.log('📊 Promotions response:', response.data);
      
      // الـ backend يعيد { success: true, promotions: [...], total, page, limit }
      if (response.data.success && response.data.promotions) {
        setPromotions(response.data.promotions || []);
      } else {
        // Fallback للـ structure القديم
        setPromotions(response.data.promotions || response.data || []);
      }
    } catch (error: any) {
      console.error('❌ Error fetching promotions:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'فشل في جلب الترقيات';
      toast.error(errorMessage);
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePromotion = async (promotionId: string) => {
    try {
      const response = await api.delete(`/hr/promotions/${promotionId}`);
      if (response.data.success) {
        toast.success('تم حذف الترقية بنجاح');
        fetchPromotions(); // إعادة تحميل القائمة
      } else {
        toast.error(response.data.error || 'فشل في حذف الترقية');
      }
    } catch (error: any) {
      console.error('❌ Error deleting promotion:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'فشل في حذف الترقية';
      toast.error(errorMessage);
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      PENDING: { label: 'قيد المراجعة', color: 'bg-yellow-100 text-yellow-800' },
      APPROVED: { label: 'موافق عليها', color: 'bg-green-100 text-green-800' },
      REJECTED: { label: 'مرفوضة', color: 'bg-red-100 text-red-800' },
      COMPLETED: { label: 'مكتملة', color: 'bg-blue-100 text-blue-800' }
    };
    return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
  };

  // Calculate statistics
  const stats = {
    total: promotions.length,
    pending: promotions.filter(p => p.status === 'PENDING').length,
    approved: promotions.filter(p => p.status === 'APPROVED').length,
    rejected: promotions.filter(p => p.status === 'REJECTED').length,
    completed: promotions.filter(p => p.status === 'COMPLETED').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ترقيات الموظفين</h1>
          <p className="text-gray-500 mt-1">إدارة ترقيات الموظفين والترقي الوظيفي</p>
        </div>
        <Button onClick={() => navigate('/hr/promotions/new')}>
          <Plus className="h-4 w-4 ml-2" />
          ترقية جديدة
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">إجمالي الترقيات</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-500">قيد المراجعة</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-sm text-gray-500">موافق عليها</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <div className="text-sm text-gray-500">مرفوضة</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
            <div className="text-sm text-gray-500">مكتملة</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="بحث بالاسم، المنصب، أو السبب..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
        </div>
        <div className="w-full sm:w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="فلترة بالحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="PENDING">قيد المراجعة</SelectItem>
              <SelectItem value="APPROVED">موافق عليها</SelectItem>
              <SelectItem value="REJECTED">مرفوضة</SelectItem>
              <SelectItem value="COMPLETED">مكتملة</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-48">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue placeholder="ترتيب حسب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="promotionDate">تاريخ الترقية</SelectItem>
              <SelectItem value="employeeName">اسم الموظف</SelectItem>
              <SelectItem value="toPosition">المنصب الجديد</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredPromotions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <TrendingUp className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 mb-4">
              {promotions.length === 0 ? 'لا توجد ترقيات' : 'لا توجد ترقيات تطابق البحث'}
            </p>
            <Button variant="outline" onClick={() => navigate('/hr/promotions/new')}>
              <Plus className="h-4 w-4 ml-2" />
              إضافة ترقية جديدة
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPromotions.map((promotion) => {
            const statusInfo = getStatusLabel(promotion.status);
            return (
              <Card 
                key={promotion.id} 
                className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow" 
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-6 w-6 text-green-500" />
                      <div>
                        <CardTitle className="text-lg">
                          {(promotion.user || promotion.employee)?.firstName} {(promotion.user || promotion.employee)?.lastName}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={statusInfo.color}>
                            {statusInfo.label}
                          </Badge>
                          <Badge variant="outline">
                            {promotion.fromPositionName || 'غير محدد'} → {promotion.toPositionName}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/hr/promotions/${promotion.id}/edit`);
                        }}
                      >
                        <Edit className="h-4 w-4 ml-2" />
                        تعديل
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 ml-2" />
                            حذف
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                            <AlertDialogDescription>
                              هل أنت متأكد من حذف ترقية {(promotion.user || promotion.employee)?.firstName} {(promotion.user || promotion.employee)?.lastName}؟ لا يمكن التراجع عن هذا الإجراء.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeletePromotion(promotion.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              حذف
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase className="h-4 w-4 text-gray-500" />
                      <span>
                        من: {promotion.fromPositionName || 'غير محدد'} → إلى: {promotion.toPositionName}
                      </span>
                    </div>
                    {promotion.fromSalary && promotion.toSalary && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">الراتب:</span>
                        <span>{promotion.fromSalary.toLocaleString()} → {promotion.toSalary.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span>تاريخ الترقية: {new Date(promotion.promotionDate).toLocaleDateString('ar-EG')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span>تاريخ السريان: {new Date(promotion.effectiveDate).toLocaleDateString('ar-EG')}</span>
                    </div>
                    <div className="pt-3 border-t">
                      <p className="text-sm text-gray-700 line-clamp-2">{promotion.reason}</p>
                    </div>
                    {promotion.approvedBy && (
                      <div className="pt-2 text-xs text-gray-500">
                        تمت الموافقة بواسطة: {promotion.approvedBy}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EmployeesPromotion;
