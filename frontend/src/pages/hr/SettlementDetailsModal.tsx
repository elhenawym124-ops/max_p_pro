import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import api from '@/services/api';
import { Loader2, Calculator, CheckCircle, Banknote, Calendar } from 'lucide-react';

interface SettlementDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    resignationId: string;
    onSuccess: () => void;
}

interface SettlementData {
    remainingSalary: number;
    leaveCompensation: number;
    advanceDebt: number;
    finalSettlementAmount: number;
    breakdown: {
        dailyRate: number;
        remainingDays: number;
        leaveBalance: number;
        remainingAdvance: number;
    };
}

const SettlementDetailsModal: React.FC<SettlementDetailsModalProps> = ({
    isOpen,
    onClose,
    resignationId,
    onSuccess
}) => {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [data, setData] = useState<SettlementData | null>(null);

    useEffect(() => {
        if (isOpen && resignationId) {
            fetchSettlement();
        }
    }, [isOpen, resignationId]);

    const fetchSettlement = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/hr/resignations/${resignationId}/settlement`);
            setData(response.data.settlement);
        } catch (error) {
            console.error('Error fetching settlement:', error);
            toast.error('فشل في جلب تفاصيل المستحقات');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!data) return;

        try {
            setSubmitting(true);
            await api.post(`/hr/resignations/${resignationId}/settlement/approve`, {
                amount: data.finalSettlementAmount
            });
            toast.success('تم اعتماد المستحقات وصرفها بنجاح');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error approving settlement:', error);
            toast.error('حدث خطأ أثناء اعتماد المستحقات');
        } finally {
            setSubmitting(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ar-EG', {
            style: 'currency',
            currency: 'EGP'
        }).format(amount);
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md" dir="rtl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-primary" />
                        تفاصيل تصفية المستحقات
                    </DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : data ? (
                    <div className="space-y-6">
                        {/* Breakdown Cards */}
                        <div className="space-y-4">
                            {/* Working Days */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Calendar className="h-4 w-4" />
                                        <span>أيام العمل المتبقية</span>
                                    </div>
                                    <Badge variant="outline">{data.breakdown.remainingDays} يوم</Badge>
                                </div>
                                <div className="flex justify-between items-end">
                                    <span className="text-xs text-muted-foreground">
                                        معدل يومي: {formatCurrency(data.breakdown.dailyRate)}
                                    </span>
                                    <span className="font-semibold text-green-600">
                                        + {formatCurrency(data.remainingSalary)}
                                    </span>
                                </div>
                            </div>

                            {/* Leave Balance */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Calendar className="h-4 w-4" />
                                        <span>رصيد الإجازات</span>
                                    </div>
                                    <Badge variant="outline">{data.breakdown.leaveBalance} يوم</Badge>
                                </div>
                                <div className="flex justify-between items-end">
                                    <span className="text-xs text-muted-foreground">
                                        تعويض نقدي عن الرصيد المتبقي
                                    </span>
                                    <span className="font-semibold text-green-600">
                                        + {formatCurrency(data.leaveCompensation)}
                                    </span>
                                </div>
                            </div>

                            {/* Advances */}
                            {data.breakdown.remainingAdvance > 0 && (
                                <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2 text-sm text-red-600">
                                            <Banknote className="h-4 w-4" />
                                            <span>خصم السلف المتبقية</span>
                                        </div>
                                        <Badge variant="destructive">مديونية</Badge>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs text-red-500">
                                            سيتم خصمها من المستحقات
                                        </span>
                                        <span className="font-semibold text-red-600">
                                            - {formatCurrency(data.advanceDebt)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* Total */}
                        <div className="flex justify-between items-center p-4 bg-primary/5 rounded-lg border border-primary/10">
                            <span className="font-bold text-lg">صافي المستحقات</span>
                            <span className="font-bold text-2xl text-primary">
                                {formatCurrency(data.finalSettlementAmount)}
                            </span>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                onClick={handleApprove}
                                className="flex-1"
                                disabled={submitting || data.finalSettlementAmount < 0}
                            >
                                {submitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                                ) : (
                                    <CheckCircle className="h-4 w-4 ml-2" />
                                )}
                                اعتماد وصرف التصفية
                            </Button>
                            <Button variant="outline" onClick={onClose} disabled={submitting}>
                                إلغاء
                            </Button>
                        </div>

                        {data.finalSettlementAmount < 0 && (
                            <p className="text-xs text-red-500 text-center">
                                تنبيه: المبلغ بالسالب يعني أن الموظف مطالب بسداد المديونية للشركة.
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        لا توجد بيانات متاحة
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default SettlementDetailsModal;
