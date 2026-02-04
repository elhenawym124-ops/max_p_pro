import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { Save, ArrowRight, AlertCircle } from 'lucide-react';
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
type TrainingFormData = {
    employeeId: string;
    trainingName: string;
    provider: string;
    type: string;
    startDate: string;
    endDate: string;
    status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    cost: string;
    duration: string;
    score: string;
    description: string;
};

const CreateTraining = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, control, formState: { errors } } = useForm<TrainingFormData>({
        defaultValues: {
            employeeId: '',
            trainingName: '',
            provider: '',
            type: 'internal',
            cost: '',
            duration: '',
            score: '',
            status: 'PLANNED',
            description: '',
        },
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const empRes = await api.get('/hr/employees');
                setEmployees(empRes.data.employees || []);
            } catch (error) {
                console.error('Error fetching data:', error);
                toast.error('فشل في تحميل بيانات الموظفين');
            }
        };
        fetchData();
    }, []);

    const onSubmit = async (data: TrainingFormData) => {
        try {
            setLoading(true);
            
            if (!data.employeeId || data.employeeId.trim() === '') {
                toast.error('يجب اختيار الموظف');
                return;
            }
            
            const payload = {
                ...data,
                cost: data.cost ? Number(data.cost) : undefined,
                duration: data.duration ? Number(data.duration) : undefined,
                score: data.score ? Number(data.score) : undefined,
            };

            console.log('Submitting training data:', payload);
            await api.post('/hr/trainings', payload);
            toast.success('تم إنشاء البرنامج التدريبي بنجاح');
            navigate('/hr/training');
        } catch (error: any) {
            console.error('Error creating training:', error);
            toast.error(error.response?.data?.error || 'فشل في إنشاء البرنامج التدريبي');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 w-full space-y-6" dir="rtl">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/hr/training')}>
                        <ArrowRight className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">إضافة برنامج تدريبي</h1>
                        <p className="text-gray-500 mt-1">قم بملء البيانات التالية لإنشاء برنامج تدريبي جديد</p>
                    </div>
                </div>
            </div>

            <Card>
                <CardContent className="p-6">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Employee */}
                            <div className="space-y-2">
                                <Label>الموظف</Label>
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
                                            لا يوجد موظفين مسجلين في النظام. يجب إضافة موظفين أولاً.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Training Name */}
                            <div className="space-y-2">
                                <Label htmlFor="trainingName">اسم البرنامج التدريبي</Label>
                                <Input
                                    id="trainingName"
                                    placeholder="أدخل اسم البرنامج"
                                    {...register('trainingName', { required: 'اسم البرنامج مطلوب' })}
                                />
                                {errors.trainingName && <p className="text-sm text-red-500">{errors.trainingName.message}</p>}
                            </div>

                            {/* Provider */}
                            <div className="space-y-2">
                                <Label htmlFor="provider">مقدم التدريب (اختياري)</Label>
                                <Input
                                    id="provider"
                                    placeholder="اسم الجهة المقدمة"
                                    {...register('provider')}
                                />
                            </div>

                            {/* Type */}
                            <div className="space-y-2">
                                <Label htmlFor="type">نوع التدريب</Label>
                                <Input
                                    id="type"
                                    placeholder="مثال: داخلي، خارجي، ورشة عمل..."
                                    {...register('type', { required: 'نوع التدريب مطلوب' })}
                                />
                                {errors.type && <p className="text-sm text-red-500">{errors.type.message}</p>}
                            </div>

                            {/* Status */}
                            <div className="space-y-2">
                                <Label>الحالة</Label>
                                <Controller
                                    name="status"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="اختر الحالة" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="PLANNED">مخطط</SelectItem>
                                                <SelectItem value="IN_PROGRESS">قيد التنفيذ</SelectItem>
                                                <SelectItem value="COMPLETED">مكتمل</SelectItem>
                                                <SelectItem value="CANCELLED">ملغي</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>

                            {/* Cost */}
                            <div className="space-y-2">
                                <Label htmlFor="cost">التكلفة (EGP)</Label>
                                <Input
                                    id="cost"
                                    type="number"
                                    placeholder="0.00"
                                    {...register('cost')}
                                />
                            </div>

                            {/* Duration */}
                            <div className="space-y-2">
                                <Label htmlFor="duration">المدة (ساعات)</Label>
                                <Input
                                    id="duration"
                                    type="number"
                                    placeholder="عدد الساعات"
                                    {...register('duration')}
                                />
                            </div>

                            {/* Score */}
                            <div className="space-y-2">
                                <Label htmlFor="score">الدرجة / التقييم (اختياري)</Label>
                                <Input
                                    id="score"
                                    type="number"
                                    placeholder="درجة من 100"
                                    {...register('score')}
                                />
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="startDate">تاريخ البدء</Label>
                                <Input
                                    id="startDate"
                                    type="date"
                                    {...register('startDate', { required: 'تاريخ البدء مطلوب' })}
                                />
                                {errors.startDate && <p className="text-sm text-red-500">{errors.startDate.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="endDate">تاريخ الانتهاء (اختياري)</Label>
                                <Input
                                    id="endDate"
                                    type="date"
                                    {...register('endDate')}
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description">ملاحظات / وصف</Label>
                            <Textarea
                                id="description"
                                placeholder="تفاصيل إضافية..."
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
                                        حفظ
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

export default CreateTraining;

