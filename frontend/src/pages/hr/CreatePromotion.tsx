import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { Save, ArrowRight, TrendingUp } from 'lucide-react';
import api from '@/services/api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

// Types
type PromotionFormData = {
    employeeId: string;
    fromPositionId?: string;
    fromPositionName?: string;
    toPositionId: string;
    toPositionName?: string;
    fromSalary?: number;
    toSalary?: number;
    promotionDate: string;
    effectiveDate: string;
    reason: string;
    notes?: string;
};

const CreatePromotion = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, control, formState: { errors } } = useForm<PromotionFormData>({
        defaultValues: {
            employeeId: '',
            fromPositionId: undefined,
            fromPositionName: '',
            toPositionId: '',
            toPositionName: '',
            fromSalary: undefined,
            toSalary: undefined,
            promotionDate: new Date().toISOString().split('T')[0],
            effectiveDate: new Date().toISOString().split('T')[0],
            reason: '',
            notes: '',
        },
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const empRes = await api.get('/hr/employees');
                setEmployees(empRes.data.employees || []);
            } catch (error: any) {
                console.error('❌ Error fetching data:', error);
                const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'فشل في تحميل البيانات';
                toast.error(errorMessage);
            }
        };
        fetchData();
    }, []);

    const onSubmit = async (data: PromotionFormData) => {
        try {
            setLoading(true);
            
            if (!data.employeeId || data.employeeId.trim() === '') {
                toast.error('يجب اختيار الموظف');
                setLoading(false);
                return;
            }

            if (!data.toPositionName || data.toPositionName.trim() === '') {
                toast.error('يجب كتابة المنصب الجديد');
                setLoading(false);
                return;
            }

            // التحقق من أن المنصب الجديد مختلف عن السابق
            if (data.fromPositionName && data.toPositionName && data.fromPositionName.trim() === data.toPositionName.trim()) {
                toast.error('المنصب الجديد يجب أن يكون مختلفاً عن المنصب السابق');
                setLoading(false);
                return;
            }

            // Clean up data: always use custom positions
            const cleanedData = {
                ...data,
                fromPositionId: undefined,
                fromPositionName: data.fromPositionName?.trim() || undefined,
                toPositionId: undefined,
                toPositionName: data.toPositionName.trim(),
                // تحويل الرواتب إلى أرقام صحيحة أو null
                fromSalary: data.fromSalary && !isNaN(data.fromSalary) ? Number(data.fromSalary) : undefined,
                toSalary: data.toSalary && !isNaN(data.toSalary) ? Number(data.toSalary) : undefined,
            };

            console.log('Submitting promotion data:', cleanedData);
            const response = await api.post('/hr/promotions', cleanedData);
            console.log('Promotion created:', response.data);
            toast.success('تم إنشاء الترقية بنجاح');
            navigate('/hr/promotions');
        } catch (error: any) {
            console.error('❌ Error creating promotion:', error);
            console.error('❌ Error response:', error.response?.data);
            const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'فشل في إنشاء الترقية';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 w-full space-y-6" dir="rtl">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/hr/promotions')}>
                        <ArrowRight className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <TrendingUp className="h-8 w-8 text-green-500" />
                            ترقية جديدة
                        </h1>
                        <p className="text-gray-500 mt-1">تسجيل ترقية موظف</p>
                    </div>
                </div>
            </div>

            <Card>
                <CardContent className="p-6">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Employee */}
                            <div className="space-y-2">
                                <Label>الموظف <span className="text-red-500">*</span></Label>
                                <Controller
                                    name="employeeId"
                                    control={control}
                                    rules={{ required: 'يجب اختيار الموظف' }}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="اختر الموظف" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {employees.length === 0 ? (
                                                    <SelectItem value="no-employees" disabled>
                                                        لا يوجد موظفين متاحين
                                                    </SelectItem>
                                                ) : (
                                                    employees.map((emp) => (
                                                        <SelectItem key={emp.id} value={emp.id}>
                                                            {emp.firstName} {emp.lastName} - {emp.employeeNumber}
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {errors.employeeId && <p className="text-sm text-red-500">{errors.employeeId.message}</p>}
                            </div>

                            {/* Promotion Date */}
                            <div className="space-y-2">
                                <Label htmlFor="promotionDate">تاريخ الترقية <span className="text-red-500">*</span></Label>
                                <Input
                                    id="promotionDate"
                                    type="date"
                                    {...register('promotionDate', { required: 'التاريخ مطلوب' })}
                                />
                                {errors.promotionDate && <p className="text-sm text-red-500">{errors.promotionDate.message}</p>}
                            </div>

                            {/* From Position */}
                            <div className="space-y-2">
                                <Label>المنصب السابق</Label>
                                <Input
                                    placeholder="اكتب اسم المنصب السابق"
                                    {...register('fromPositionName')}
                                />
                            </div>

                            {/* To Position */}
                            <div className="space-y-2">
                                <Label>المنصب الجديد <span className="text-red-500">*</span></Label>
                                <Input
                                    placeholder="اكتب اسم المنصب الجديد"
                                    {...register('toPositionName', { required: 'يجب كتابة اسم المنصب الجديد' })}
                                />
                                {errors.toPositionName && <p className="text-sm text-red-500">{errors.toPositionName.message}</p>}
                            </div>

                            {/* From Salary */}
                            <div className="space-y-2">
                                <Label htmlFor="fromSalary">الراتب السابق</Label>
                                <Input
                                    id="fromSalary"
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    {...register('fromSalary', { valueAsNumber: true })}
                                />
                            </div>

                            {/* To Salary */}
                            <div className="space-y-2">
                                <Label htmlFor="toSalary">الراتب الجديد</Label>
                                <Input
                                    id="toSalary"
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    {...register('toSalary', { valueAsNumber: true })}
                                />
                            </div>

                            {/* Effective Date */}
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="effectiveDate">تاريخ السريان <span className="text-red-500">*</span></Label>
                                <Input
                                    id="effectiveDate"
                                    type="date"
                                    {...register('effectiveDate', { required: 'تاريخ السريان مطلوب' })}
                                />
                                {errors.effectiveDate && <p className="text-sm text-red-500">{errors.effectiveDate.message}</p>}
                            </div>
                        </div>

                        {/* Reason */}
                        <div className="space-y-2">
                            <Label htmlFor="reason">سبب الترقية <span className="text-red-500">*</span></Label>
                            <Textarea
                                id="reason"
                                placeholder="اشرح سبب الترقية..."
                                className="min-h-[120px]"
                                {...register('reason', { required: 'سبب الترقية مطلوب' })}
                            />
                            {errors.reason && <p className="text-sm text-red-500">{errors.reason.message}</p>}
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label htmlFor="notes">ملاحظات (اختياري)</Label>
                            <Textarea
                                id="notes"
                                placeholder="أي ملاحظات إضافية..."
                                className="min-h-[80px]"
                                {...register('notes')}
                            />
                        </div>

                        <div className="flex justify-end pt-4 gap-4">
                            <Button type="button" variant="outline" onClick={() => navigate('/hr/promotions')}>
                                إلغاء
                            </Button>
                            <Button type="submit" disabled={loading} size="lg">
                                {loading ? (
                                    'جاري الحفظ...'
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 ml-2" />
                                        حفظ الترقية
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default CreatePromotion;

