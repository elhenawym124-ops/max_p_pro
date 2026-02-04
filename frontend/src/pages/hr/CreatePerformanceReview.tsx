import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BarChart3, Calendar, User, Target, ArrowRight,
    ShieldCheck, AlertCircle, Save, Plus, TrendingUp
} from 'lucide-react';
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

interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    position?: { title: string };
    department?: { name: string };
    hasEmployeeRecord?: boolean;
}

const CreatePerformanceReview: React.FC = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        employeeId: '',
        reviewerId: '',
        reviewPeriod: '',
        periodStart: new Date().toISOString().split('T')[0],
        periodEnd: new Date().toISOString().split('T')[0],
        overallRating: 5.0,
        strengths: '',
        improvements: '',
        reviewerComments: '',
        status: 'DRAFT'
    });

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const response = await api.get('/hr/employees?limit=100');
            setEmployees(response.data.employees || []);
        } catch (error) {
            console.error('Error fetching employees:', error);
            toast.error('فشل في جلب قائمة الموظفين');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.employeeId || !formData.reviewerId || !formData.reviewPeriod) {
            toast.error('يرجى ملء جميع الحقول الإلزامية');
            return;
        }

        try {
            setSubmitting(true);
            await api.post('/hr/performance-reviews', formData);
            toast.success('تم إنشاء نموذج التقييم بنجاح');
            navigate('/hr/performance-reviews');
        } catch (error: any) {
            console.error('Error creating review:', error);
            toast.error(error.response?.data?.error || 'فشل في إنشاء التقييم');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="w-full p-4 md:p-8 space-y-8" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/hr/performance-reviews')}
                        className="rounded-full bg-white dark:bg-gray-800 shadow-sm border"
                    >
                        <ArrowRight className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                            <Plus className="h-8 w-8 text-primary" />
                            إنشاء تقييم جديد
                        </h1>
                        <p className="text-muted-foreground">قم بإعداد نموذج تقييم أداء جديد للموظف</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: People Selection */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="border-none shadow-xl ring-1 ring-gray-200 dark:ring-gray-800">
                        <CardHeader className="bg-primary/5 rounded-t-xl">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <User className="h-5 w-5 text-primary" />
                                الأطراف المعنية
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <div className="space-y-3">
                                <Label className="font-bold">الموظف المراد تقييمه</Label>
                                <Select
                                    onValueChange={(val) => setFormData({ ...formData, employeeId: val })}
                                    value={formData.employeeId}
                                >
                                    <SelectTrigger className="h-12 rounded-xl bg-gray-50/50">
                                        <SelectValue placeholder="اختر الموظف" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {employees
                                            .filter(emp => emp.hasEmployeeRecord)
                                            .map(emp => (
                                                <SelectItem key={emp.id} value={emp.id}>
                                                    {emp.firstName} {emp.lastName}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3">
                                <Label className="font-bold">المقيّم (Reviewer)</Label>
                                <Select
                                    onValueChange={(val) => setFormData({ ...formData, reviewerId: val })}
                                    value={formData.reviewerId}
                                >
                                    <SelectTrigger className="h-12 rounded-xl bg-gray-50/50">
                                        <SelectValue placeholder="اختر المسئول عن التقييم" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {employees
                                            .filter(emp => emp.hasEmployeeRecord)
                                            .map(emp => (
                                                <SelectItem key={emp.id} value={emp.id}>
                                                    {emp.firstName} {emp.lastName}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-xl border border-orange-100 dark:border-orange-900/30 flex gap-3">
                                <AlertCircle className="h-5 w-5 text-orange-500 shrink-0" />
                                <p className="text-xs text-orange-800 dark:text-orange-300 leading-relaxed">
                                    تأكد من اختيار المقيّم الصحيح، حيث سيصل إشعار للمسؤول للبدء في كتابة التقييم الفني.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-xl bg-gradient-to-br from-primary to-primary-focus text-white">
                        <CardContent className="p-6 space-y-4">
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                <ShieldCheck className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold">معايير التقييم</h3>
                            <p className="text-sm text-primary-foreground leading-relaxed">
                                يتبع النظام معيار تقييم من 1 إلى 5 نجوم، حيث يتم حساب المتوسط الكلي بناءً على المعايير الفنية والسلوكية.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Form Details */}
                <div className="lg:col-span-2 space-y-8">
                    <Card className="border-none shadow-2xl ring-1 ring-gray-200 dark:ring-gray-800">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-primary" />
                                فترة التقييم وبيانات التقرير
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="col-span-full space-y-2">
                                    <Label className="font-bold">عنوان فترة التقييم</Label>
                                    <Input
                                        placeholder="مثال: تقييم الربع السنوي الأول 2024"
                                        value={formData.reviewPeriod}
                                        onChange={(e) => setFormData({ ...formData, reviewPeriod: e.target.value })}
                                        className="h-12 rounded-xl bg-gray-50/50"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="font-bold">بداية الفترة</Label>
                                    <Input
                                        type="date"
                                        value={formData.periodStart}
                                        onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
                                        className="h-12 rounded-xl bg-gray-50/50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-bold">نهاية الفترة</Label>
                                    <Input
                                        type="date"
                                        value={formData.periodEnd}
                                        onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
                                        className="h-12 rounded-xl bg-gray-50/50"
                                    />
                                </div>

                                <div className="col-span-full space-y-4 pt-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="font-bold text-lg">التقييم العام المبدئي</Label>
                                        <span className="text-2xl font-black text-primary">{formData.overallRating.toFixed(1)}</span>
                                    </div>
                                    <Input
                                        type="range"
                                        min="1"
                                        max="5"
                                        step="0.5"
                                        value={formData.overallRating}
                                        onChange={(e) => setFormData({ ...formData, overallRating: parseFloat(e.target.value) })}
                                        className="h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                    <div className="flex justify-between text-xs text-muted-foreground px-1">
                                        <span>ضعيف (1)</span>
                                        <span>مقبول (2)</span>
                                        <span>جيد (3)</span>
                                        <span>ممتاز (4)</span>
                                        <span>استثنائي (5)</span>
                                    </div>
                                </div>
                            </div>

                            <hr className="my-8" />

                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <Label className="font-bold flex items-center gap-2">
                                        <Target className="h-4 w-4 text-green-500" />
                                        نقاط القوة
                                    </Label>
                                    <Textarea
                                        placeholder="ما هي أبرز الإنجازات والمهارات التي أظهرها الموظف؟"
                                        value={formData.strengths}
                                        onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
                                        className="min-h-[100px] rounded-xl bg-gray-50/50 resize-none border-none ring-1 ring-gray-100"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <Label className="font-bold flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-blue-500" />
                                        مجالات التطوير
                                    </Label>
                                    <Textarea
                                        placeholder="ما هي المهارات التي تحتاج إلى تحسين في الفترة القادمة؟"
                                        value={formData.improvements}
                                        onChange={(e) => setFormData({ ...formData, improvements: e.target.value })}
                                        className="min-h-[100px] rounded-xl bg-gray-50/50 resize-none border-none ring-1 ring-gray-100"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <Label className="font-bold flex items-center gap-2">
                                        <BarChart3 className="h-4 w-4 text-purple-500" />
                                        تعليقات المقيّم النهائية
                                    </Label>
                                    <Textarea
                                        placeholder="أي ملاحظات إضافية حول أداء الموظف العام..."
                                        value={formData.reviewerComments}
                                        onChange={(e) => setFormData({ ...formData, reviewerComments: e.target.value })}
                                        className="min-h-[120px] rounded-xl bg-gray-50/50 resize-none border-none ring-1 ring-gray-100"
                                    />
                                </div>
                            </div>
                        </CardContent>

                        <ReviewCardFooter className="p-8 bg-gray-50/50 dark:bg-gray-800/20 border-t flex flex-col md:flex-row gap-4 justify-end rounded-b-2xl">
                            <Button
                                variant="outline"
                                onClick={() => navigate('/hr/performance-reviews')}
                                className="w-full md:w-auto h-12 rounded-xl px-8"
                            >
                                إلغاء
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="w-full md:w-auto h-12 rounded-xl px-12 font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
                            >
                                {submitting ? (
                                    <>
                                        <div className="h-4 w-4 border-2 border-white/30 border-t-white animate-spin rounded-full ml-2" />
                                        جاري الحفظ...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 ml-2" />
                                        حفظ ونشر التقييم
                                    </>
                                )}
                            </Button>
                        </ReviewCardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
};

const ReviewCardFooter = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={className}>{children}</div>
);

export default CreatePerformanceReview;

