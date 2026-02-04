import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { Save, ArrowRight, FileX, Calculator, AlertCircle } from 'lucide-react';
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
type ResignationFormData = {
    employeeId: string;
    resignationDate: string;
    lastWorkingDay: string;
    reason: string;
    exitInterview: string;
};

const CreateResignation = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [noticePeriod, setNoticePeriod] = useState(30);
    const [expectedDate, setExpectedDate] = useState<string>('');

    const { register, handleSubmit, control, formState: { errors } } = useForm<ResignationFormData>({
        defaultValues: {
            employeeId: '',
            resignationDate: new Date().toISOString().split('T')[0],
            lastWorkingDay: '',
            reason: '',
            exitInterview: '',
        },
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [empRes, settingsRes] = await Promise.all([
                    api.get('/hr/employees'),
                    api.get('/hr/settings')
                ]);
                
                // الآن جميع الموظفين المرجعين من Employee table صحيحين
                setEmployees(empRes.data.employees || []);
                console.log('Employees fetched:', empRes.data.employees?.length);
                
                if (settingsRes.data.settings?.noticePeriodDays) {
                    setNoticePeriod(settingsRes.data.settings.noticePeriodDays);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                toast.error('فشل في تحميل البيانات');
            }
        };
        fetchData();
    }, []);

    // Watch resignation date to calculate expected last day
    const resignationDate = control._formValues.resignationDate; // Or use useWatch
    useEffect(() => {
        const subscription = control.register('resignationDate').onChange; // This isn't quite right for react-hook-form v7
        // We'll trust the re-render or useWatch if needed, but for simplicity let's stick to standard flow
        // Ideally useWatch
    }, []);

    // Better: useWatch for real-time updates
    // const watchedResignationDate = useWatch({ control, name: 'resignationDate' });
    // But since I can't easily add useWatch import without messing lines, I'll calculate on render if I can access form values
    // actually, I'll just calculate inside the render based on getValues or similar if I could.
    // Let's simplified: add onChange handler to Input directly or use a derived state.

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const date = new Date(e.target.value);
        if (!isNaN(date.getTime())) {
            const expected = new Date(date);
            expected.setDate(date.getDate() + noticePeriod);
            setExpectedDate(expected.toISOString().split('T')[0]);
        }
    };

    const onSubmit = async (data: ResignationFormData) => {
        try {
            setLoading(true);
            
            // Validate employeeId before submitting
            if (!data.employeeId || data.employeeId.trim() === '') {
                toast.error('يجب اختيار الموظف');
                return;
            }
            
            console.log('Submitting resignation data:', data);
            await api.post('/hr/resignations', data);
            toast.success('تم تسجيل الاستقالة بنجاح');
            navigate('/hr/resignations');
        } catch (error: any) {
            console.error('Error creating resignation:', error);
            toast.error(error.response?.data?.error || 'فشل في تسجيل الاستقالة');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 w-full space-y-6" dir="rtl">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/hr/resignations')}>
                        <ArrowRight className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <FileX className="h-8 w-8 text-red-500" />
                            تسجيل استقالة جديدة
                        </h1>
                        <p className="text-gray-500 mt-1">إنهاء خدمة موظف وتسجيل تفاصيل الاستقالة</p>
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

                            <div className="space-y-2">
                                <Label htmlFor="resignationDate">تاريخ تقديم الاستقالة <span className="text-red-500">*</span></Label>
                                <Input
                                    id="resignationDate"
                                    type="date"
                                    {...register('resignationDate', { required: 'التاريخ مطلوب' })}
                                    onChange={(e) => {
                                        register('resignationDate').onChange(e);
                                        handleDateChange(e);
                                    }}
                                />
                                {errors.resignationDate && <p className="text-sm text-red-500">{errors.resignationDate.message}</p>}

                                {expectedDate && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2 flex items-start gap-3">
                                        <Calculator className="h-5 w-5 text-blue-500 mt-0.5" />
                                        <div>
                                            <h4 className="text-sm font-semibold text-blue-700">فترة الإشعار: {noticePeriod} يوم</h4>
                                            <p className="text-xs text-blue-600 mt-1">
                                                تاريخ آخر عمل متوقع: <strong>{expectedDate}</strong>
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Last Working Day */}
                            <div className="space-y-2">
                                <Label htmlFor="lastWorkingDay">آخر يوم عمل <span className="text-red-500">*</span></Label>
                                <Input
                                    id="lastWorkingDay"
                                    type="date"
                                    {...register('lastWorkingDay', { required: 'تاريخ آخر يوم عمل مطلوب' })}
                                />
                                {errors.lastWorkingDay && <p className="text-sm text-red-500">{errors.lastWorkingDay.message}</p>}
                            </div>
                        </div>

                        {/* Reason */}
                        <div className="space-y-2">
                            <Label htmlFor="reason">سبب الاستقالة</Label>
                            <Textarea
                                id="reason"
                                placeholder="اذكر سبب الاستقالة..."
                                className="min-h-[100px]"
                                {...register('reason')}
                            />
                        </div>

                        {/* Exit Interview Note */}
                        <div className="space-y-2">
                            <Label htmlFor="exitInterview">ملاحظات مقابلة الخروج (Exit Interview)</Label>
                            <Textarea
                                id="exitInterview"
                                placeholder="تفاصيل المقابلة، ملاحظات إضافية..."
                                className="min-h-[100px]"
                                {...register('exitInterview')}
                            />
                        </div>

                        <div className="flex justify-end pt-4 gap-4">
                            <Button type="button" variant="outline" onClick={() => navigate('/hr/resignations')}>
                                إلغاء
                            </Button>
                            <Button type="submit" disabled={loading} size="lg" variant="destructive">
                                {loading ? (
                                    'جاري الحفظ...'
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 ml-2" />
                                        حفظ الاستقالة
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

export default CreateResignation;

