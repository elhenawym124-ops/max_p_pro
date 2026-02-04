import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { Save, ArrowRight } from 'lucide-react';
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
type GoalFormData = {
    title: string;
    description: string;
    targetValue: string;
    currentValue: string;
    unit: string;
    startDate: string;
    endDate: string;
    type: 'INDIVIDUAL' | 'DEPARTMENT' | 'COMPANY';
    employeeId: string;
    departmentId: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
};

const CreateGoal = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, control, watch, formState: { errors } } = useForm<GoalFormData>({
        defaultValues: {
            title: '',
            description: '',
            targetValue: '',
            currentValue: '0',
            unit: '',
            status: 'PENDING',
            type: 'INDIVIDUAL',
        },
    });

    const watchType = watch('type');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [empRes, deptRes] = await Promise.all([
                    api.get('/hr/employees'),
                    api.get('/hr/departments')
                ]);
                
                setEmployees(empRes.data.employees || []);
                setDepartments(deptRes.data || []);
            } catch (error) {
                console.error('Error fetching data:', error);
                toast.error('فشل في تحميل البيانات');
            }
        };
        fetchData();
    }, []);

    const onSubmit = async (data: GoalFormData) => {
        // Manual Validation
        if (data.type === 'INDIVIDUAL' && !data.employeeId) {
            toast.error('يجب اختيار الموظف للهدف الفردي');
            return;
        }
        if (data.type === 'DEPARTMENT' && !data.departmentId) {
            toast.error('يجب اختيار القسم للهدف الخاص بالقسم');
            return;
        }
        if (!data.startDate || !data.endDate) {
            toast.error('تواريخ البدء والانتهاء مطلوبة');
            return;
        }

        try {
            setLoading(true);
            const payload = {
                ...data,
                targetValue: Number(data.targetValue),
                currentValue: Number(data.currentValue),
            };

            await api.post('/hr/goals', payload);
            toast.success('تم إنشاء الهدف بنجاح');
            navigate('/hr/goals');
        } catch (error) {
            console.error('Error creating goal:', error);
            toast.error('فشل في إنشاء الهدف');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 w-full space-y-6" dir="rtl">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/hr/goals')}>
                        <ArrowRight className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">إضافة هدف جديد</h1>
                        <p className="text-gray-500 mt-1">قم بملء البيانات التالية لإنشاء هدف جديد</p>
                    </div>
                </div>
            </div>

            <Card>
                <CardContent className="p-6">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Title */}
                            <div className="space-y-2">
                                <Label htmlFor="title">عنوان الهدف</Label>
                                <Input
                                    id="title"
                                    placeholder="أدخل عنوان الهدف"
                                    {...register('title', { required: 'عنوان الهدف مطلوب', minLength: { value: 3, message: 'يجب أن يكون 3 أحرف على الأقل' } })}
                                />
                                {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
                            </div>

                            {/* Type */}
                            <div className="space-y-2">
                                <Label>نوع الهدف</Label>
                                <Controller
                                    name="type"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="اختر نوع الهدف" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="INDIVIDUAL">فردي</SelectItem>
                                                <SelectItem value="DEPARTMENT">قسم</SelectItem>
                                                <SelectItem value="COMPANY">الشركة</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Conditional Fields based on Type */}
                        {watchType === 'INDIVIDUAL' && (
                            <div className="space-y-2">
                                <Label>الموظف المسؤول</Label>
                                <Controller
                                    name="employeeId"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="اختر الموظف" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {employees.map((emp) => (
                                                    <SelectItem key={emp.id} value={emp.id}>
                                                        {emp.firstName} {emp.lastName}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                        )}

                        {watchType === 'DEPARTMENT' && (
                            <div className="space-y-2">
                                <Label>القسم المسؤول</Label>
                                <Controller
                                    name="departmentId"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="اختر القسم" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {departments.map((dept) => (
                                                    <SelectItem key={dept.id} value={dept.id}>
                                                        {dept.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                        )}

                        {/* Targets */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="targetValue">القيمة المستهدفة</Label>
                                <Input
                                    id="targetValue"
                                    type="number"
                                    placeholder="مثال: 100"
                                    {...register('targetValue', { required: 'القيمة المستهدفة مطلوبة', min: { value: 1, message: 'يجب أن تكون أكبر من 0' } })}
                                />
                                {errors.targetValue && <p className="text-sm text-red-500">{errors.targetValue.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="currentValue">القيمة الحالية (اختياري)</Label>
                                <Input
                                    id="currentValue"
                                    type="number"
                                    placeholder="0"
                                    {...register('currentValue')}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="unit">الوحدة (اختياري)</Label>
                                <Input
                                    id="unit"
                                    placeholder="مثال: مبيعات، ساعات،..."
                                    {...register('unit')}
                                />
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="startDate">تاريخ البدء</Label>
                                {/* Manual date input since Calendar component is missing */}
                                <Input
                                    id="startDate"
                                    type="date"
                                    {...register('startDate', { required: 'تاريخ البدء مطلوب' })}
                                />
                                {errors.startDate && <p className="text-sm text-red-500">{errors.startDate.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="endDate">تاريخ الانتهاء</Label>
                                <Input
                                    id="endDate"
                                    type="date"
                                    {...register('endDate', { required: 'تاريخ الانتهاء مطلوب' })}
                                />
                                {errors.endDate && <p className="text-sm text-red-500">{errors.endDate.message}</p>}
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description">وصف الهدف</Label>
                            <Textarea
                                id="description"
                                placeholder="أدخل تفاصيل إضافية حول الهدف..."
                                className="min-h-[100px]"
                                {...register('description')}
                            />
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={loading} size="lg">
                                {loading ? (
                                    'جاري الحفظ...'
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 ml-2" />
                                        حفظ الهدف
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

export default CreateGoal;

