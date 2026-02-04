import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { Save, ArrowRight, AlertTriangle, AlertCircle } from 'lucide-react';
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
type WarningFormData = {
    employeeId: string;
    type: 'VERBAL' | 'WRITTEN' | 'FINAL' | 'TERMINATION';
    severity: 'minor' | 'medium' | 'major' | 'critical';
    title: string;
    description: string;
    incidentDate: string;
    actionTaken: string;
};

const CreateWarning = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, control, formState: { errors } } = useForm<WarningFormData>({
        defaultValues: {
            employeeId: '',
            type: 'VERBAL',
            severity: 'minor',
            title: '',
            description: '',
            incidentDate: new Date().toISOString().split('T')[0],
            actionTaken: '',
        },
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const empRes = await api.get('/hr/employees');
                setEmployees(empRes.data.employees || []);
                console.log('Employees fetched:', empRes.data.employees?.length);
            } catch (error) {
                console.error('Error fetching data:', error);
                toast.error('فشل في تحميل بيانات الموظفين');
            }
        };
        fetchData();
    }, []);

    const onSubmit = async (data: WarningFormData) => {
        try {
            setLoading(true);
            
            // Validate employeeId before submitting
            if (!data.employeeId || data.employeeId.trim() === '') {
                toast.error('يجب اختيار الموظف');
                return;
            }
            
            console.log('Submitting warning data:', data);
            await api.post('/hr/warnings', data);
            toast.success('تم إصدار الإنذار بنجاح');
            navigate('/hr/warnings');
        } catch (error: any) {
            console.error('Error creating warning:', error);
            toast.error(error.response?.data?.error || 'فشل في إصدار الإنذار');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 w-full space-y-6" dir="rtl">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/hr/warnings')}>
                        <ArrowRight className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <AlertTriangle className="h-8 w-8 text-yellow-500" />
                            إصدار إنذار جديد
                        </h1>
                        <p className="text-gray-500 mt-1">تسجيل مخالفة أو إنذار لموظف</p>
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
                                {employees.length === 0 && (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-2 flex items-start gap-3">
                                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                                        <p className="text-sm text-yellow-700">
                                            لا يوجد موظفين مسجلين في النظام. يجب إضافة موظفين أولاً من قسم الموظفين.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Date */}
                            <div className="space-y-2">
                                <Label htmlFor="incidentDate">تاريخ المخالفة <span className="text-red-500">*</span></Label>
                                <Input
                                    id="incidentDate"
                                    type="date"
                                    {...register('incidentDate', { required: 'التاريخ مطلوب' })}
                                />
                                {errors.incidentDate && <p className="text-sm text-red-500">{errors.incidentDate.message}</p>}
                            </div>

                            {/* Type */}
                            <div className="space-y-2">
                                <Label>نوع الإنذار <span className="text-red-500">*</span></Label>
                                <Controller
                                    name="type"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="اختر النوع" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="VERBAL">لفظي (Verbal)</SelectItem>
                                                <SelectItem value="WRITTEN">كتابي (Written)</SelectItem>
                                                <SelectItem value="FINAL">نهائي (Final)</SelectItem>
                                                <SelectItem value="TERMINATION">إنهاء خدمة (Termination)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>

                            {/* Severity */}
                            <div className="space-y-2">
                                <Label>شدة المخالفة</Label>
                                <Controller
                                    name="severity"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="اختر الشدة" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="minor">بسيطة (Minor)</SelectItem>
                                                <SelectItem value="medium">متوسطة (Medium)</SelectItem>
                                                <SelectItem value="major">كبيرة (Major)</SelectItem>
                                                <SelectItem value="critical">حرجة (Critical)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Title */}
                        <div className="space-y-2">
                            <Label htmlFor="title">عنوان المخالفة <span className="text-red-500">*</span></Label>
                            <Input
                                id="title"
                                placeholder="مثال: تأخير متكرر، سلوك غير لائق..."
                                {...register('title', { required: 'العنوان مطلوب' })}
                            />
                            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description">التفاصيل <span className="text-red-500">*</span></Label>
                            <Textarea
                                id="description"
                                placeholder="شرح تفصيلي للمخالفة..."
                                className="min-h-[120px]"
                                {...register('description', { required: 'التفاصيل مطلوبة' })}
                            />
                            {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
                        </div>

                        {/* Action Taken */}
                        <div className="space-y-2">
                            <Label htmlFor="actionTaken">الإجراء المتخذ (اختياري)</Label>
                            <Textarea
                                id="actionTaken"
                                placeholder="ما الإجراء الذي تم اتخاذه؟ (مثال: خصم يوم، لفت نظر...)"
                                className="min-h-[80px]"
                                {...register('actionTaken')}
                            />
                        </div>

                        <div className="flex justify-end pt-4 gap-4">
                            <Button type="button" variant="outline" onClick={() => navigate('/hr/warnings')}>
                                إلغاء
                            </Button>
                            <Button type="submit" disabled={loading} size="lg" variant="destructive">
                                {loading ? (
                                    'جاري الحفظ...'
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 ml-2" />
                                        حفظ الإنذار
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

export default CreateWarning;

