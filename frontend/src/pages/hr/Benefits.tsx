import React, { useState, useEffect } from 'react';
import {
  Gift, Plus, Users, DollarSign, CheckCircle, Trash2,
  HeartPulse, Shield, PiggyBank, Save
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '@/services/api';
import { toast } from 'sonner';

interface Benefit {
  id: string;
  name: string;
  description?: string;
  type: string;
  cost?: number;
  currency: string;
  isActive: boolean;
  activeEnrollments?: number;
}

const Benefits: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'health_insurance',
    cost: 0,
    currency: 'EGP',
    isActive: true
  });

  useEffect(() => {
    fetchBenefits();
    // التحقق مما إذا كان المسار ينتهي بـ /new لفتح النافذة تلقائياً
    if (location.pathname.endsWith('/new')) {
      setDialogOpen(true);
    }
  }, [location.pathname]);

  const fetchBenefits = async () => {
    try {
      setLoading(true);
      const response = await api.get('/hr/benefits');
      setBenefits(response.data.benefits || []);
    } catch (error) {
      console.error('Error fetching benefits:', error);
      toast.error('فشل في جلب المزايا');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name) {
      toast.error('اسم الميزة مطلوب');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/hr/benefits', formData);
      toast.success('تم إنشاء الميزة بنجاح');
      setDialogOpen(false);
      resetForm();
      fetchBenefits();
      if (location.pathname.endsWith('/new')) {
        navigate('/hr/benefits');
      }
    } catch (error: any) {
      console.error('Error creating benefit:', error);
      toast.error(error.response?.data?.error || 'فشل في إنشاء الميزة');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('هل أنت متأكد من حذف هذه الميزة؟')) return;

    try {
      await api.delete(`/hr/benefits/${id}`);
      toast.success('تم حذف الميزة بنجاح');
      fetchBenefits();
    } catch (error) {
      console.error('Error deleting benefit:', error);
      toast.error('فشل في حذف الميزة');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'health_insurance',
      cost: 0,
      currency: 'EGP',
      isActive: true
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'health_insurance': return <HeartPulse className="h-5 w-5 text-red-500" />;
      case 'life_insurance': return <Shield className="h-5 w-5 text-blue-500" />;
      case 'retirement': return <PiggyBank className="h-5 w-5 text-green-500" />;
      default: return <Gift className="h-5 w-5 text-purple-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      health_insurance: 'تأمين صحي',
      life_insurance: 'تأمين على الحياة',
      retirement: 'تقاعد',
      other: 'أخرى'
    };
    return typeMap[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50/30 dark:bg-gray-900/30">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground animate-pulse">جاري تحميل المزايا...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 bg-gray-50/20 min-h-screen" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Gift className="h-8 w-8 text-primary" />
            المزايا والتعويضات
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            إدارة المزايا الإضافية وبرامج الرعاية الخاصة بالموظفين
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setDialogOpen(true);
            navigate('/hr/benefits/new');
          }}
          className="h-12 px-6 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95"
        >
          <Plus className="h-5 w-5 ml-2" />
          إضافة ميزة جديدة
        </Button>
      </div>

      {benefits.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent">
          <CardContent className="p-20 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <Gift className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">لا توجد مزايا مسجلة</h3>
            <p className="text-muted-foreground mb-8 max-w-sm">
              لم تقم بإضافة أي مزايا موظفين حتى الآن. ابدأ بإضافة التأمين الصحي أو برامج التقاعد.
            </p>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(true)}
              className="h-11 rounded-full px-8"
            >
              <Plus className="h-4 w-4 ml-2" />
              أضف أول ميزة
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit: Benefit) => (
            <div
              key={benefit.id}
              className="group relative"
              onClick={() => navigate(`/hr/benefits/${benefit.id}`)}
            >
              <Card
                className="relative overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer ring-1 ring-gray-200 dark:ring-gray-800 h-full"
              >
                {/* Decorative Accent */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />

                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl group-hover:bg-primary/10 transition-colors">
                      {getTypeIcon(benefit.type)}
                    </div>
                    <div className="flex gap-2">
                      {benefit.isActive ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-none">نشط</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-500">متوقف</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50"
                        onClick={(e) => handleDelete(e, benefit.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-xl font-bold mt-4">{benefit.name}</CardTitle>
                  <CardDescription className="line-clamp-2 min-h-[40px] mt-1">
                    {benefit.description || 'لا يوجد وصف متاح لهذه الميزة'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-5 pt-0">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="rounded-md font-medium px-2 py-0.5 border-gray-200">
                      {getTypeLabel(benefit.type)}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">التكلفة الشهرية</p>
                        <p className="font-black text-primary">
                          {benefit.cost?.toLocaleString() || 0} <span className="text-xs font-medium">{benefit.currency}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-left bg-white dark:bg-gray-900 p-2 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold text-center">المشتركون</p>
                      <div className="flex items-center gap-1 font-bold text-sm">
                        <Users className="h-3 w-3 text-orange-500" />
                        {benefit.activeEnrollments || 0}
                      </div>
                    </div>
                  </div>
                </CardContent>

                <div className="px-6 py-4 bg-gray-50/30 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 flex justify-end group-hover:bg-primary/5 transition-colors">
                  <span className="text-xs font-bold text-primary flex items-center gap-2">
                    عرض التفاصيل والاشتراكات
                    <CheckCircle className="h-3 w-3" />
                  </span>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open && location.pathname.endsWith('/new')) {
            navigate('/hr/benefits');
          }
        }}
      >
        <DialogContent className="sm:max-w-xl rounded-3xl" dir="rtl">
          <DialogHeader className="space-y-3">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-2">
              <Gift className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-black">إضافة ميزة موظفين جديدة</DialogTitle>
            <DialogDescription>
              قم بتعريف ميزة جديدة، مثل التأمين الطبي أو بدلات السكن، ليتمكن الموظفون من الاستفادة منها.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-4">
            <div className="col-span-full space-y-2">
              <Label className="font-bold flex items-center gap-2">
                اسم الميزة
                <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: تأمين طبي VIP، بدل سكن"
                className="h-11 rounded-xl bg-gray-50/50"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold">نوع الميزة</Label>
              <Select
                value={formData.type}
                onValueChange={(val) => setFormData({ ...formData, type: val })}
              >
                <SelectTrigger className="h-11 rounded-xl bg-gray-50/50">
                  <SelectValue placeholder="اختر النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="health_insurance">تأمين صحي</SelectItem>
                  <SelectItem value="life_insurance">تأمين على الحياة</SelectItem>
                  <SelectItem value="retirement">تقاعد ومساهمات</SelectItem>
                  <SelectItem value="transportation">بدل انتقال</SelectItem>
                  <SelectItem value="housing">بدل سكن</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="font-bold">التكلفة الشهرية</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                  className="h-11 rounded-xl bg-gray-50/50 pl-10"
                />
              </div>
            </div>

            <div className="col-span-full space-y-2">
              <Label className="font-bold">وصف الميزة</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="تفاصيل حول شروط الميزة وطريقة الاستحقاق..."
                className="min-h-[100px] rounded-xl bg-gray-50/50 resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex-col md:flex-row gap-3 pt-6 border-t border-gray-100 mt-2">
            <Button
              onClick={handleCreate}
              disabled={submitting}
              className="w-full md:w-auto md:min-w-[150px] h-12 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  حفظ الميزة
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setDialogOpen(false);
                if (location.pathname.endsWith('/new')) navigate('/hr/benefits');
              }}
              className="w-full md:w-auto h-12 rounded-xl text-muted-foreground hover:bg-gray-100"
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Benefits;












































