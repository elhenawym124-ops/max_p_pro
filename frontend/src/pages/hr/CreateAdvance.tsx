import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowRight, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import api from '@/services/api';
import { toast } from 'sonner';

interface AdvanceFormData {
    employeeId: string;
    amount: string;
    reason: string;
    repaymentType: string;
    installmentsCount: number;
}

interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    position: { title: string } | null;
    hasEmployeeRecord: boolean;
}

const CreateAdvance: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [settings, setSettings] = useState<any>(null); // Store settings
    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<AdvanceFormData>({
        defaultValues: {
            repaymentType: 'ONE_TIME',
            installmentsCount: 1
        }
    });

    const repaymentType = watch('repaymentType');

    useEffect(() => {
        const loadData = async () => {
            try {
                // Fetch Employees
                const empResponse = await api.get('/hr/employees?limit=1000');
                setEmployees(empResponse.data.employees || []);

                // Fetch Settings
                const settingsResponse = await api.get('/hr/settings');
                setSettings(settingsResponse.data.settings);
            } catch (error) {
                console.error('Error fetching data:', error);
                toast.error('حدث خطأ أثناء جلب البيانات');
            }
        };
        loadData();
    }, []);

    const onSubmit = async (data: AdvanceFormData) => {
        try {
            setLoading(true);
            await api.post('/hr/advances', {
                ...data,
                amount: parseFloat(data.amount),
                installmentsCount: data.repaymentType === 'INSTALLMENTS' ? data.installmentsCount : 1
            });

            toast.success('تم إنشاء طلب السلفة بنجاح');
            navigate('/hr/advances');
        } catch (error: any) {
            console.error('Error creating advance:', error);
            // Show detailed error message from backend
            toast.error(error.response?.data?.error || 'حدث خطأ أثناء إنشاء الطلب');
        } finally {
            setLoading(false);
        }
    };

    const maxMonths = settings?.advanceRepaymentMonths || 12;

    return (
        <div className="p-6 w-full" dir="rtl">
            {/* Header */}
            <div className="mb-6">
                <Button
                    variant="ghost"
                    onClick={() => navigate('/hr/advances')}
                    className="mb-4"
                >
                    <ArrowRight className="h-4 w-4 ml-2" />
                    العودة للقائمة
                </Button>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    طلب سلفة جديد
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    إنشاء طلب سلفة لموظف
                </p>
            </div>

            {/* Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        بيانات السلفة
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Employee Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="employeeId">الموظف *</Label>
                            <Select
                                onValueChange={(value) => setValue('employeeId', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر الموظف" />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees
                                        .filter(emp => emp.hasEmployeeRecord)
                                        .map((employee) => (
                                            <SelectItem key={employee.id} value={employee.id}>
                                                {employee.firstName} {employee.lastName} - {employee.position?.title || 'لا يوجد منصب'}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                            {errors.employeeId && (
                                <p className="text-sm text-red-500">هذا الحقل مطلوب</p>
                            )}
                        </div>

                        {/* Amount */}
                        <div className="space-y-2">
                            <Label htmlFor="amount">المبلغ (جنيه) *</Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                placeholder="مثال: 5000"
                                {...register('amount', { required: true, min: 1 })}
                            />
                            {settings && (
                                <p className="text-xs text-gray-500">
                                    الحد الأقصى: {settings.maxAdvancePercentage}% من الراتب
                                </p>
                            )}
                            {errors.amount && (
                                <p className="text-sm text-red-500">يرجى إدخال مبلغ صحيح</p>
                            )}
                        </div>

                        {/* Repayment Type */}
                        <div className="space-y-2">
                            <Label htmlFor="repaymentType">نوع السداد *</Label>
                            <Select
                                defaultValue="ONE_TIME"
                                onValueChange={(value) => setValue('repaymentType', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ONE_TIME">دفعة واحدة (الشهر القادم)</SelectItem>
                                    <SelectItem value="INSTALLMENTS">تقسيط على عدة أشهر</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Installments Count (if INSTALLMENTS) */}
                        {repaymentType === 'INSTALLMENTS' && (
                            <div className="space-y-2">
                                <Label htmlFor="installmentsCount">عدد الأقساط *</Label>
                                <Input
                                    id="installmentsCount"
                                    type="number"
                                    min="2"
                                    max={maxMonths}
                                    placeholder={`بحد أقصى ${maxMonths} أشهر`}
                                    {...register('installmentsCount', {
                                        required: repaymentType === 'INSTALLMENTS',
                                        min: 2,
                                        max: maxMonths
                                    })}
                                />
                                {errors.installmentsCount && (
                                    <p className="text-sm text-red-500">
                                        يرجى إدخال عدد أقساط بين 2 و {maxMonths}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Reason */}
                        <div className="space-y-2">
                            <Label htmlFor="reason">السبب (اختياري)</Label>
                            <Textarea
                                id="reason"
                                placeholder="سبب طلب السلفة..."
                                rows={4}
                                {...register('reason')}
                            />
                        </div>

                        {/* Submit Button */}
                        <div className="flex gap-3 justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate('/hr/advances')}
                            >
                                إلغاء
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'جاري الإنشاء...' : 'إنشاء الطلب'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default CreateAdvance;

