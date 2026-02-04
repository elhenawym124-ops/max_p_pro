import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Check, X, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/services/api';

interface RewardType {
    id: string;
    name: string;
    category: string;
    calculationMethod: string;
    value: number;
    isActive: boolean;
    triggerType: string;
    eligibilityConditions: any;
}

const RewardTypes: React.FC = () => {
    const { t } = useTranslation();
    const [types, setTypes] = useState<RewardType[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingType, setEditingType] = useState<RewardType | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        category: 'PERFORMANCE',
        calculationMethod: 'FIXED_AMOUNT',
        value: 0,
        triggerType: 'SEMI_AUTOMATIC',
        eligibilityConditions: {
            minTargetProgress: 0,
            maxLatenessCount: 0,
            maxAbsenceCount: 0,
            maxErrorRate: 0,
            minProjectScore: 0,
            minSalesAmount: 0,
            requiresManagerNomination: false,
            requiresHRApproval: false
        }
    });

    useEffect(() => {
        fetchTypes();
    }, []);

    const fetchTypes = async () => {
        try {
            setLoading(true);
            const response = await api.get('/hr/rewards/types');
            if (response.data.success) {
                setTypes(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching types:', error);
            toast.error('فشل تحميل أنواع المكافآت');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            if (!formData.name) return toast.error('يرجى إدخال اسم المكافأة');

            let response;
            if (editingType) {
                response = await api.put(`/hr/rewards/types/${editingType.id}`, formData);
            } else {
                response = await api.post('/hr/rewards/types', formData);
            }

            if (response.data.success) {
                toast.success(editingType ? 'تم التعديل بنجاح' : 'تم الإنشاء بنجاح');
                setIsDialogOpen(false);
                fetchTypes();
                resetForm();
            }
        } catch (error) {
            console.error('Error saving type:', error);
            toast.error('حدث خطأ أثناء الحفظ');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من الحذف؟')) return;
        try {
            await api.delete(`/hr/rewards/types/${id}`);
            toast.success('تم الحذف بنجاح');
            fetchTypes();
        } catch (error) {
            toast.error('لا يمكن حذف هذا النوع لارتباطه بسجلات سابقة');
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            await api.patch(`/hr/rewards/types/${id}/toggle`, { isActive: !currentStatus });
            toast.success('تم تغيير الحالة');
            fetchTypes();
        } catch (error) {
            toast.error('فشل تغيير الحالة');
        }
    };

    const resetForm = () => {
        setEditingType(null);
        setFormData({
            name: '',
            category: 'PERFORMANCE',
            calculationMethod: 'FIXED_AMOUNT',
            value: 0,
            triggerType: 'SEMI_AUTOMATIC',
            eligibilityConditions: {
                minTargetProgress: 0,
                maxLatenessCount: 0,
                maxAbsenceCount: 0,
                maxErrorRate: 0,
                minProjectScore: 0,
                minSalesAmount: 0,
                requiresManagerNomination: false,
                requiresHRApproval: false
            }
        });
    };

    const openEdit = (type: any) => {
        setEditingType(type);
        setFormData({
            name: type.name,
            category: type.category,
            calculationMethod: type.calculationMethod,
            value: type.value,
            triggerType: type.triggerType,
            eligibilityConditions: type.eligibilityConditions || {
                minTargetProgress: 0,
                maxLatenessCount: 0,
                maxAbsenceCount: 0,
                maxErrorRate: 0,
                minProjectScore: 0,
                minSalesAmount: 0,
                requiresManagerNomination: false,
                requiresHRApproval: false
            }
        });
        setIsDialogOpen(true);
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>أنواع المكافآت</CardTitle>
                    <CardDescription>إدارة تعريفات المكافآت والحوافز</CardDescription>
                </div>
                <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة جديد
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>الاسم</TableHead>
                            <TableHead>التصنيف</TableHead>
                            <TableHead>القيمة</TableHead>
                            <TableHead>الحالة</TableHead>
                            <TableHead>الإجراءات</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {types.map((type) => (
                            <TableRow key={type.id}>
                                <TableCell className="font-medium">{type.name}</TableCell>
                                <TableCell>{t(`rewards.category.${type.category}`) || type.category}</TableCell>
                                <TableCell>
                                    {type.calculationMethod === 'FIXED_AMOUNT' ? `${type.value} جنية` : `${type.value}%`}
                                </TableCell>
                                <TableCell>
                                    <Switch
                                        checked={type.isActive}
                                        onCheckedChange={() => handleToggleStatus(type.id, type.isActive)}
                                    />
                                </TableCell>
                                <TableCell className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => openEdit(type)}>
                                        <Edit className="h-4 w-4 text-blue-500" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(type.id)}>
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingType ? 'تعديل مكافأة' : 'إضافة مكافأة جديدة'}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>اسم المكافأة</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="مثال: مكافأة التميز"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>التصنيف</Label>
                                    <Select
                                        value={formData.category}
                                        onValueChange={(v) => setFormData({ ...formData, category: v })}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="PERFORMANCE">أداء عام</SelectItem>
                                            <SelectItem value="TARGET_ACHIEVEMENT">تحقيق التارجت</SelectItem>
                                            <SelectItem value="TARGET_EXCEED">تجاوز التارجت</SelectItem>
                                            <SelectItem value="PUNCTUALITY">التزام بالمواعيد</SelectItem>
                                            <SelectItem value="NO_ABSENCE">عدم غياب</SelectItem>
                                            <SelectItem value="QUALITY">جودة العمل</SelectItem>
                                            <SelectItem value="EMPLOYEE_OF_MONTH">موظف الشهر</SelectItem>
                                            <SelectItem value="INITIATIVE">مبادرة مميزة</SelectItem>
                                            <SelectItem value="PROJECT_SUCCESS">مشروع ناجح</SelectItem>
                                            <SelectItem value="SALES">مبيعات</SelectItem>
                                            <SelectItem value="ADMINISTRATIVE">مكافأة إدارية</SelectItem>
                                            <SelectItem value="SEASONAL">موسمي</SelectItem>
                                            <SelectItem value="ACHIEVEMENT">إنجاز آخر</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>طريقة الحساب</Label>
                                    <Select
                                        value={formData.calculationMethod}
                                        onValueChange={(v) => setFormData({ ...formData, calculationMethod: v })}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="FIXED_AMOUNT">مبلغ ثابت</SelectItem>
                                            <SelectItem value="PERCENTAGE_SALARY">نسبة من الراتب</SelectItem>
                                            <SelectItem value="PERCENTAGE_SALES">نسبة من المبيعات</SelectItem>
                                            <SelectItem value="PERCENTAGE_PROJECT_PROFIT">نسبة من أرباح المشروع</SelectItem>
                                            <SelectItem value="POINTS">نقاط</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>
                                    القيمة {['PERCENTAGE_SALARY', 'PERCENTAGE_SALES', 'PERCENTAGE_PROJECT_PROFIT'].includes(formData.calculationMethod) ? '(%)' : ''}
                                </Label>
                                <Input
                                    type="number"
                                    value={formData.value}
                                    onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                                />
                            </div>

                            {/* Eligibility Conditions Section */}
                            <div className="p-4 bg-gray-50 rounded-lg space-y-4 border border-gray-200">
                                <Label className="text-blue-600 font-bold block mb-2 border-b pb-2">شروط الاستحقاق</Label>

                                {(['TARGET_ACHIEVEMENT', 'TARGET_EXCEED'].includes(formData.category)) && (
                                    <div className="space-y-2">
                                        <Label>الحد الأدنى لتحقيق التارجت (%)</Label>
                                        <Input
                                            type="number"
                                            value={formData.eligibilityConditions.minTargetProgress}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                eligibilityConditions: { ...formData.eligibilityConditions, minTargetProgress: Number(e.target.value) }
                                            })}
                                        />
                                    </div>
                                )}

                                {formData.category === 'PUNCTUALITY' && (
                                    <div className="space-y-2">
                                        <Label>أقصى عدد مرات تأخير مسموح</Label>
                                        <Input
                                            type="number"
                                            value={formData.eligibilityConditions.maxLatenessCount}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                eligibilityConditions: { ...formData.eligibilityConditions, maxLatenessCount: Number(e.target.value) }
                                            })}
                                        />
                                    </div>
                                )}

                                {formData.category === 'NO_ABSENCE' && (
                                    <div className="space-y-2">
                                        <Label>أقصى عدد أيام غياب مسموح</Label>
                                        <Input
                                            type="number"
                                            value={formData.eligibilityConditions.maxAbsenceCount}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                eligibilityConditions: { ...formData.eligibilityConditions, maxAbsenceCount: Number(e.target.value) }
                                            })}
                                        />
                                    </div>
                                )}

                                {formData.category === 'QUALITY' && (
                                    <div className="space-y-2">
                                        <Label>أقصى نسبة أخطاء مسموحة (%)</Label>
                                        <Input
                                            type="number"
                                            value={formData.eligibilityConditions.maxErrorRate}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                eligibilityConditions: { ...formData.eligibilityConditions, maxErrorRate: Number(e.target.value) }
                                            })}
                                        />
                                    </div>
                                )}

                                {formData.category === 'PROJECT_SUCCESS' && (
                                    <div className="space-y-2">
                                        <Label>الحد الأدنى لتقييم المشروع</Label>
                                        <Input
                                            type="number"
                                            value={formData.eligibilityConditions.minProjectScore}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                eligibilityConditions: { ...formData.eligibilityConditions, minProjectScore: Number(e.target.value) }
                                            })}
                                        />
                                    </div>
                                )}

                                {formData.category === 'SALES' && (
                                    <div className="space-y-2">
                                        <Label>الحد الأدنى لقيمة المبيعات</Label>
                                        <Input
                                            type="number"
                                            value={formData.eligibilityConditions.minSalesAmount}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                eligibilityConditions: { ...formData.eligibilityConditions, minSalesAmount: Number(e.target.value) }
                                            })}
                                        />
                                    </div>
                                )}

                                <div className="flex items-center justify-between gap-4 pt-2">
                                    <div className="flex items-center space-x-2 space-x-reverse">
                                        <Switch
                                            checked={formData.eligibilityConditions.requiresManagerNomination}
                                            onCheckedChange={(checked) => setFormData({
                                                ...formData,
                                                eligibilityConditions: { ...formData.eligibilityConditions, requiresManagerNomination: checked }
                                            })}
                                        />
                                        <Label>ترشيح مدير</Label>
                                    </div>
                                    <div className="flex items-center space-x-2 space-x-reverse">
                                        <Switch
                                            checked={formData.eligibilityConditions.requiresHRApproval}
                                            onCheckedChange={(checked) => setFormData({
                                                ...formData,
                                                eligibilityConditions: { ...formData.eligibilityConditions, requiresHRApproval: checked }
                                            })}
                                        />
                                        <Label>موافقة HR</Label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSubmit}>حفظ</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
};

export default RewardTypes;
