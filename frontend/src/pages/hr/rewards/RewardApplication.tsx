import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, AlertTriangle, Calculator, User } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/services/api';

const RewardApplication: React.FC = () => {
    const { t } = useTranslation();
    const [employees, setEmployees] = useState<any[]>([]);
    const [types, setTypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        userId: '',
        rewardTypeId: '',
        periodStart: new Date().toISOString().split('T')[0],
        periodEnd: new Date().toISOString().split('T')[0],
        reason: ''
    });

    const [calculationPreview, setCalculationPreview] = useState<any>(null);
    const [eligibilityCheck, setEligibilityCheck] = useState<any>(null);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [empRes, typesRes] = await Promise.all([
                api.get('/hr/employees'),
                api.get('/hr/rewards/types')
            ]);
            setEmployees(empRes.data.employees || []);
            setTypes(typesRes.data.data || []);
        } catch (error) {
            console.error('Error loading data', error);
            toast.error('فشل تحميل البيانات');
        }
    };

    const handleApply = async () => {
        try {
            if (!formData.userId || !formData.rewardTypeId) {
                return toast.error('يرجى اختيار الموظف ونوع المكافأة');
            }

            setLoading(true);
            const response = await api.post('/hr/rewards/apply', formData);

            if (response.data.success) {
                toast.success('تم صرف المكافأة بنجاح');
                setFormData({ ...formData, reason: '', userId: '' });
                setCalculationPreview(null);
                setEligibilityCheck(null);
            }
        } catch (error) {
            console.error('Apply error:', error);
            toast.error('فشل صرف المكافأة');
        } finally {
            setLoading(false);
        }
    };

    // Simulate or Call Backend for Preview (Optional enhancement)
    const handleTypeSelect = (typeId: string) => {
        setFormData({ ...formData, rewardTypeId: typeId });
        const selectedType = types.find(t => t.id === typeId);
        if (selectedType && selectedType.calculationMethod === 'FIXED_AMOUNT') {
            setCalculationPreview({ value: selectedType.value });
        } else {
            setCalculationPreview(null); // Need backend call for percentage
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>صرف مكافأة</CardTitle>
                    <CardDescription>اختر الموظف والمكافأة المناسبة</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>الموظف</Label>
                        <Select
                            value={formData.userId}
                            onValueChange={(v) => setFormData({ ...formData, userId: v })}
                        >
                            <SelectTrigger><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
                            <SelectContent>
                                {employees.map(emp => (
                                    <SelectItem key={emp.id} value={emp.id}>
                                        {emp.firstName} {emp.lastName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>نوع المكافأة</Label>
                        <Select
                            value={formData.rewardTypeId}
                            onValueChange={handleTypeSelect}
                        >
                            <SelectTrigger><SelectValue placeholder="اختر المكافأة" /></SelectTrigger>
                            <SelectContent>
                                {types.filter(t => t.isActive).map(type => (
                                    <SelectItem key={type.id} value={type.id}>
                                        {type.name} ({type.category})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>من تاريخ</Label>
                            <Input
                                type="date"
                                value={formData.periodStart}
                                onChange={e => setFormData({ ...formData, periodStart: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>إلى تاريخ</Label>
                            <Input
                                type="date"
                                value={formData.periodEnd}
                                onChange={e => setFormData({ ...formData, periodEnd: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>سبب المكافأة / ملاحظات</Label>
                        <Textarea
                            value={formData.reason}
                            onChange={e => setFormData({ ...formData, reason: e.target.value })}
                            placeholder="اكتب تفاصيل إضافية..."
                        />
                    </div>

                    <Button className="w-full mt-4" onClick={handleApply} disabled={loading}>
                        {loading ? 'جاري التنفيذ...' : 'اعتماد وصرف المكافأة'}
                    </Button>
                </CardContent>
            </Card>

            <Card className="bg-gray-50 dark:bg-gray-800">
                <CardHeader>
                    <CardTitle className="text-base">معاينة</CardTitle>
                </CardHeader>
                <CardContent>
                    {!formData.userId || !formData.rewardTypeId ? (
                        <div className="text-center py-10 text-gray-400">
                            <User className="h-10 w-10 mx-auto mb-2 opacity-20" />
                            <p>اختر الموظف والمكافأة لرؤية التفاصيل</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 rounded-lg border">
                                <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                                    <Calculator className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">القيمة المقدرة</p>
                                    <p className="text-xl font-bold">
                                        {calculationPreview ? `${calculationPreview.value} جنية` : 'سيتم الحساب تلقائياً'}
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-300">
                                <div className="flex gap-2">
                                    <CheckCircle className="h-5 w-5" />
                                    <p>
                                        سيتم التحقق من شروط الاستحقاق تلقائياً قبل الصرف.
                                        في حالة عدم الاستحقاق، ستظهر رسالة توضح السبب.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default RewardApplication;
