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
import { Checkbox } from '@/components/ui/checkbox';

// Types
type FeedbackFormData = {
    toEmployeeId: string;
    type: string;
    category: string;
    content: string;
    rating: string;
    isAnonymous: boolean;
};

const CreateFeedback = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, control, formState: { errors } } = useForm<FeedbackFormData>({
        defaultValues: {
            toEmployeeId: '',
            type: 'PEER',
            category: '',
            content: '',
            rating: '',
            isAnonymous: false,
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

    const onSubmit = async (data: FeedbackFormData) => {
        try {
            setLoading(true);
            const payload = {
                ...data,
                rating: data.rating ? Number(data.rating) : undefined,
            };

            await api.post('/hr/feedback', payload);
            toast.success('تم إرسال التغذية الراجعة بنجاح');
            navigate('/hr/feedback');
        } catch (error) {
            console.error('Error creating feedback:', error);
            toast.error('فشل في إرسال التغذية الراجعة');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 w-full space-y-6" dir="rtl">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/hr/feedback')}>
                        <ArrowRight className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">إضافة تغذية راجعة</h1>
                        <p className="text-gray-500 mt-1">قم بإرسال ملاحظاتك أو تقييمك لموظف آخر</p>
                    </div>
                </div>
            </div>

            <Card>
                <CardContent className="p-6">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* To Employee */}
                            <div className="space-y-2">
                                <Label>الموظف المستهدف</Label>
                                <Controller
                                    name="toEmployeeId"
                                    control={control}
                                    rules={{ required: 'يجب اختيار الموظف' }}
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
                                {errors.toEmployeeId && <p className="text-sm text-red-500">{errors.toEmployeeId.message}</p>}
                            </div>

                            {/* Type */}
                            <div className="space-y-2">
                                <Label>نوع التغذية الراجعة</Label>
                                <Controller
                                    name="type"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="اختر النوع" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="PEER">زميل</SelectItem>
                                                <SelectItem value="MANAGER">مدير</SelectItem>
                                                <SelectItem value="SUBORDINATE">مرؤوس</SelectItem>
                                                <SelectItem value="OTHER">آخر</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>

                            {/* Category */}
                            <div className="space-y-2">
                                <Label htmlFor="category">التصنيف (اختياري)</Label>
                                <Input
                                    id="category"
                                    placeholder="مثال: أداء، سلوك، تعاون..."
                                    {...register('category')}
                                />
                            </div>

                            {/* Rating */}
                            <div className="space-y-2">
                                <Label htmlFor="rating">التقييم (1-5)</Label>
                                <Input
                                    id="rating"
                                    type="number"
                                    min="1"
                                    max="5"
                                    placeholder="اختر رقم من 1 إلى 5"
                                    {...register('rating')}
                                />
                            </div>
                        </div>

                        {/* Content */}
                        <div className="space-y-2">
                            <Label htmlFor="content">المحتوى</Label>
                            <Textarea
                                id="content"
                                placeholder="اكتب ملاحظاتك هنا..."
                                className="min-h-[150px]"
                                {...register('content', { required: 'المحتوى مطلوب' })}
                            />
                            {errors.content && <p className="text-sm text-red-500">{errors.content.message}</p>}
                        </div>

                        {/* Anonymous */}
                        <div className="flex items-center space-x-2 space-x-reverse">
                            <Controller
                                name="isAnonymous"
                                control={control}
                                render={({ field }) => (
                                    <Checkbox
                                        id="isAnonymous"
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                )}
                            />
                            <Label htmlFor="isAnonymous" className="cursor-pointer">إرسال كمجهول الهوية</Label>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={loading} size="lg">
                                {loading ? (
                                    'جاري الإرسال...'
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 ml-2" />
                                        إرسال
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

export default CreateFeedback;

