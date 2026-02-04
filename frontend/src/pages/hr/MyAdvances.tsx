import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuthSimple';
import api from '@/services/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Loader2, PlusIcon } from "lucide-react";
import { BanknotesIcon } from "@heroicons/react/24/outline";
import { useDateFormat } from '../../hooks/useDateFormat';

const MyAdvances: React.FC = () => {
    const { user } = useAuth();
    const { formatDate } = useDateFormat();
    const [advances, setAdvances] = useState<any[]>([]);
    const [loadingAdvances, setLoadingAdvances] = useState(false);
    const [isAdvanceDialogOpen, setIsAdvanceDialogOpen] = useState(false);
    const [advanceForm, setAdvanceForm] = useState({
        amount: '',
        reason: '',
        repaymentType: 'FULL',
        installmentsCount: '1'
    });
    const [submittingAdvance, setSubmittingAdvance] = useState(false);
    const [employeeId, setEmployeeId] = useState<string | null>(null);

    useEffect(() => {
        const fetchEmployeeId = async () => {
            try {
                const response = await api.get('/hr/employees/me');
                if (response.data && response.data.employee) {
                    setEmployeeId(response.data.employee.id);
                }
            } catch (error) {
                console.error("Failed to fetch employee ID", error);
            }
        };
        fetchEmployeeId();
        fetchAdvances();
    }, []);

    const fetchAdvances = async () => {
        try {
            setLoadingAdvances(true);
            const response = await api.get('/hr/advances/my');
            if (response.data && response.data.success) {
                setAdvances(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching advances:', error);
            toast.error('فشل في جلب بيانات السلف');
        } finally {
            setLoadingAdvances(false);
        }
    };

    const handleAdvanceSubmit = async () => {
        if (!advanceForm.amount || !advanceForm.reason) {
            toast.error('يرجى تعبئة جميع الحقول المطلوبة');
            return;
        }

        try {
            setSubmittingAdvance(true);
            const payload = {
                employeeId: employeeId, // Use fetched employee ID
                amount: parseFloat(advanceForm.amount),
                reason: advanceForm.reason,
                repaymentType: advanceForm.repaymentType,
                installmentsCount: parseInt(advanceForm.installmentsCount)
            };

            const response = await api.post('/hr/advances', payload);

            if (response.data && response.data.success) {
                toast.success('تم إرسال طلب السلفة بنجاح');
                setIsAdvanceDialogOpen(false);
                setAdvanceForm({
                    amount: '',
                    reason: '',
                    repaymentType: 'FULL',
                    installmentsCount: '1'
                });
                fetchAdvances();
            }
        } catch (error: any) {
            console.error('Error creating advance request:', error);
            toast.error(error.response?.data?.error || 'فشل في إنشاء طلب السلفة');
        } finally {
            setSubmittingAdvance(false);
        }
    };

    return (
        <div className="container mx-auto p-6" dir="rtl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <BanknotesIcon className="w-8 h-8 text-blue-600" />
                        السلف المالية
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">إدارة وطلب السلف المالية الخاصة بك</p>
                </div>
                <Dialog open={isAdvanceDialogOpen} onOpenChange={setIsAdvanceDialogOpen}>
                    <DialogTrigger asChild>
                        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm">
                            <PlusIcon className="w-5 h-5 ml-2" />
                            طلب سلفة جديدة
                        </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]" dir="rtl">
                        <DialogHeader>
                            <DialogTitle className="text-right">طلب سلفة جديدة</DialogTitle>
                            <DialogDescription className="text-right">
                                قم بملء النموذج أدناه لطلب سلفة مالية. سيتم مراجعة الطلب من قبل الإدارة.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="amount" className="text-right">المبلغ المطلوب</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    placeholder="0.00"
                                    className="text-right"
                                    value={advanceForm.amount}
                                    onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="reason" className="text-right">سبب السلفة</Label>
                                <Textarea
                                    id="reason"
                                    placeholder="مثال: ظروف طارئة..."
                                    className="text-right"
                                    value={advanceForm.reason}
                                    onChange={(e) => setAdvanceForm({ ...advanceForm, reason: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="repaymentType" className="text-right">طريقة السداد</Label>
                                <Select
                                    value={advanceForm.repaymentType}
                                    onValueChange={(value) => setAdvanceForm({ ...advanceForm, repaymentType: value })}
                                >
                                    <SelectTrigger className="w-full dir-rtl">
                                        <SelectValue placeholder="اختر طريقة السداد" />
                                    </SelectTrigger>
                                    <SelectContent dir="rtl">
                                        <SelectItem value="FULL">خصم كامل الراتب القادم</SelectItem>
                                        <SelectItem value="INSTALLMENTS">تقسيط على دفعات</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {advanceForm.repaymentType === 'INSTALLMENTS' && (
                                <div className="grid gap-2">
                                    <Label htmlFor="installments" className="text-right">عدد الأقساط (أشهر)</Label>
                                    <Input
                                        id="installments"
                                        type="number"
                                        min="1"
                                        max="12"
                                        className="text-right"
                                        value={advanceForm.installmentsCount}
                                        onChange={(e) => setAdvanceForm({ ...advanceForm, installmentsCount: e.target.value })}
                                    />
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <button
                                onClick={handleAdvanceSubmit}
                                disabled={submittingAdvance}
                                className={`flex items-center justify-center w-full px-4 py-2 rounded-lg text-white transition shadow-sm bg-green-600 hover:bg-green-700 disabled:opacity-50`}
                            >
                                {submittingAdvance ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                                إرسال الطلب
                            </button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>سجل طلبات السلف</CardTitle>
                </CardHeader>
                <CardContent>
                    {loadingAdvances ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        </div>
                    ) : advances.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 dark:bg-black/20 rounded-lg dashed border-2 border-gray-200 dark:border-gray-800">
                            <BanknotesIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-500 dark:text-gray-400">لا توجد طلبات سلف سابقة</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table dir="rtl">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-right">التاريخ</TableHead>
                                        <TableHead className="text-right">المبلغ</TableHead>
                                        <TableHead className="text-right">السبب</TableHead>
                                        <TableHead className="text-right">الحالة</TableHead>
                                        <TableHead className="text-right">السداد</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {advances.map((advance) => (
                                        <TableRow key={advance.id}>
                                            <TableCell>{formatDate(advance.createdAt)}</TableCell>
                                            <TableCell className="font-bold">{advance.amount.toLocaleString()} ج.م</TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={advance.reason}>{advance.reason}</TableCell>
                                            <TableCell>
                                                <Badge variant={
                                                    advance.status === 'APPROVED' ? 'default' :
                                                        advance.status === 'REJECTED' ? 'destructive' : 'secondary'
                                                }>
                                                    {advance.status === 'APPROVED' ? 'تمت الموافقة' :
                                                        advance.status === 'REJECTED' ? 'مرفوض' : 'قيد الانتظار'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {advance.repaymentType === 'INSTALLMENTS'
                                                    ? `${advance.installmentsCount} أقساط`
                                                    : 'دفعة واحدة'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default MyAdvances;
