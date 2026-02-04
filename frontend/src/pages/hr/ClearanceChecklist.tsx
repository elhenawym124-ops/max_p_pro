import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckSquare, ArrowRight, Save, Circle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

interface ClearanceItem {
    id: string;
    itemName: string;
    description: string;
    isCompleted: boolean;
    completedAt: string | null;
    completedBy: string | null;
    notes: string | null;
}

const ClearanceChecklist = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<ClearanceItem[]>([]);
    const [resignation, setResignation] = useState<any>(null);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [resRes, checklistRes] = await Promise.all([
                api.get(`/hr/resignations/${id}`),
                api.get(`/hr/resignations/${id}/clearance`)
            ]);
            setResignation(resRes.data.resignation);
            setItems(checklistRes.data.items || []);
        } catch (error) {
            console.error('Error fetching clearance data:', error);
            toast.error('فشل في تحميل بيانات إخلاء الطرف');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleItem = async (itemId: string, currentStatus: boolean) => {
        try {
            await api.patch(`/hr/resignations/clearance/${itemId}`, {
                isCompleted: !currentStatus
            });

            // Update local state
            setItems(items.map(item =>
                item.id === itemId
                    ? { ...item, isCompleted: !currentStatus, completedAt: !currentStatus ? new Date().toISOString() : null }
                    : item
            ));

            toast.success(currentStatus ? 'تم إلغاء الاكتمال' : 'تم تحديد البند كمكتمل');
        } catch (error) {
            console.error('Error updating item:', error);
            toast.error('فشل في تحديث الحالة');
        }
    };

    if (loading) return <div className="p-8 text-center">جاري التحميل...</div>;
    if (!resignation) return <div className="p-8 text-center text-red-500">الاستقالة غير موجودة</div>;

    const completedCount = items.filter(i => i.isCompleted).length;
    const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;

    return (
        <div className="p-6 w-full space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/hr/resignations')}>
                        <ArrowRight className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <CheckSquare className="h-8 w-8 text-green-600" />
                            قائمة إخلاء الطرف
                        </h1>
                        <p className="text-gray-500 mt-1">
                            {resignation.employee?.firstName} {resignation.employee?.lastName} - {resignation.employee?.position?.title}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={progress === 100 ? "default" : "secondary"}>
                        {progress === 100 ? 'مكتمل' : 'قيد التنفيذ'}
                    </Badge>
                </div>
            </div>

            {/* Progress */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>نسبة الإنجاز</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ${progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Checklist Items */}
            <div className="space-y-4">
                {items.map((item) => (
                    <Card key={item.id} className={`transition-colors ${item.isCompleted ? 'bg-green-50 border-green-200' : ''}`}>
                        <CardContent className="p-4 flex items-start gap-4">
                            <Checkbox
                                checked={item.isCompleted}
                                onCheckedChange={() => handleToggleItem(item.id, item.isCompleted)}
                                className="mt-1 h-5 w-5"
                            />
                            <div className="flex-1">
                                <h3 className={`font-semibold ${item.isCompleted ? 'text-green-800 line-through decoration-green-500' : 'text-gray-800'}`}>
                                    {item.itemName}
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                                {item.isCompleted && item.completedAt && (
                                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" />
                                        تم الإكمال في {new Date(item.completedAt).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {items.length === 0 && (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                    لا توجد بنود في قائمة إخلاء الطرف
                </div>
            )}
        </div>
    );
};

export default ClearanceChecklist;

