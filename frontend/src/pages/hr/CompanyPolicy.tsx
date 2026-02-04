import React, { useState } from 'react';
import {
    FileText, Plus, Edit, Trash2, Save,
    ChevronDown, ChevronRight, BookOpen, Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Policy {
    id: string;
    title: string;
    content: string;
    category: string;
    lastUpdated: string;
    isPublished: boolean;
}

const categories = [
    { value: 'attendance', label: 'الحضور والانصراف' },
    { value: 'leaves', label: 'الإجازات' },
    { value: 'conduct', label: 'السلوك المهني' },
    { value: 'compensation', label: 'التعويضات والمزايا' },
    { value: 'safety', label: 'الصحة والسلامة' },
    { value: 'general', label: 'سياسات عامة' },
];

const CompanyPolicy: React.FC = () => {
    const [policies, setPolicies] = useState<Policy[]>([
        {
            id: '1',
            title: 'سياسة الحضور والانصراف',
            content: `## ساعات العمل الرسمية
- من الأحد إلى الخميس: 9:00 صباحاً - 5:00 مساءً
- فترة الراحة: 12:00 ظهراً - 1:00 مساءً

## التأخير
- التأخير لأكثر من 15 دقيقة يُسجَّل رسمياً
- 3 تأخيرات شهرياً = إنذار كتابي

## الغياب
- يجب الإبلاغ عن الغياب قبل بداية الدوام`,
            category: 'attendance',
            lastUpdated: '2026-01-01',
            isPublished: true
        },
        {
            id: '2',
            title: 'سياسة الإجازات السنوية',
            content: `## رصيد الإجازات
- كل موظف يستحق 21 يوم إجازة سنوية
- الإجازة المرضية: 15 يوم سنوياً

## طلب الإجازة
- يجب تقديم طلب الإجازة قبل 5 أيام عمل

## ترحيل الإجازات
- يُسمح بترحيل 5 أيام فقط للعام التالي`,
            category: 'leaves',
            lastUpdated: '2026-01-01',
            isPublished: true
        },
        {
            id: '3',
            title: 'قواعد السلوك المهني',
            content: `## المظهر المهني
- الالتزام بالزي الرسمي

## التعامل مع الزملاء
- الاحترام المتبادل
- الحفاظ على بيئة عمل إيجابية

## السرية
- الحفاظ على سرية معلومات الشركة`,
            category: 'conduct',
            lastUpdated: '2026-01-01',
            isPublished: true
        }
    ]);

    const [expandedPolicies, setExpandedPolicies] = useState<string[]>([]);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        category: 'general',
    });

    const togglePolicy = (id: string) => {
        setExpandedPolicies(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const handleAddPolicy = () => {
        if (!formData.title || !formData.content) {
            toast.error('يرجى ملء جميع الحقول المطلوبة');
            return;
        }

        const newPolicy: Policy = {
            id: Date.now().toString(),
            title: formData.title,
            content: formData.content,
            category: formData.category,
            lastUpdated: new Date().toISOString().split('T')[0],
            isPublished: true
        };

        setPolicies([...policies, newPolicy]);
        setFormData({ title: '', content: '', category: 'general' });
        setShowAddDialog(false);
        toast.success('تم إضافة السياسة بنجاح');
    };

    const handleEditPolicy = () => {
        if (!editingPolicy) return;

        const updatedPolicies = policies.map(p => {
            if (p.id === editingPolicy.id) {
                return {
                    ...editingPolicy,
                    lastUpdated: new Date().toISOString().split('T')[0]
                };
            }
            return p;
        });
        setPolicies(updatedPolicies);
        setEditingPolicy(null);
        toast.success('تم تحديث السياسة بنجاح');
    };

    const handleDeletePolicy = (id: string) => {
        if (confirm('هل أنت متأكد من حذف هذه السياسة؟')) {
            setPolicies(policies.filter(p => p.id !== id));
            toast.success('تم حذف السياسة');
        }
    };

    const groupedPolicies = categories.map(category => ({
        ...category,
        policies: policies.filter(p => p.category === category.value)
    })).filter(group => group.policies.length > 0);

    return (
        <div className="p-6 space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        سياسة الشركة
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        إدارة سياسات ولوائح الشركة
                    </p>
                </div>
                <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة سياسة جديدة
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-sm">إجمالي السياسات</p>
                                <h3 className="text-3xl font-bold mt-1">{policies.length}</h3>
                            </div>
                            <FileText className="h-10 w-10 opacity-80" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-green-100 text-sm">السياسات المنشورة</p>
                                <h3 className="text-3xl font-bold mt-1">
                                    {policies.filter(p => p.isPublished).length}
                                </h3>
                            </div>
                            <BookOpen className="h-10 w-10 opacity-80" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-purple-100 text-sm">الفئات</p>
                                <h3 className="text-3xl font-bold mt-1">
                                    {new Set(policies.map(p => p.category)).size}
                                </h3>
                            </div>
                            <Clock className="h-10 w-10 opacity-80" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Policies List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        لوائح وسياسات الشركة
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {policies.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                            <FileText className="h-12 w-12 mb-4 opacity-50" />
                            <p>لا توجد سياسات بعد</p>
                            <Button
                                variant="link"
                                className="mt-2"
                                onClick={() => setShowAddDialog(true)}
                            >
                                إضافة سياسة جديدة
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {groupedPolicies.map((group) => (
                                <div key={group.value} className="space-y-2">
                                    <h3 className="font-semibold text-lg text-gray-700 dark:text-gray-300 mb-2">
                                        {group.label}
                                    </h3>
                                    {group.policies.map((policy) => (
                                        <div key={policy.id} className="border rounded-lg">
                                            <button
                                                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 text-right"
                                                onClick={() => togglePolicy(policy.id)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {expandedPolicies.includes(policy.id) ? (
                                                        <ChevronDown className="h-5 w-5 text-gray-500" />
                                                    ) : (
                                                        <ChevronRight className="h-5 w-5 text-gray-500" />
                                                    )}
                                                    <FileText className="h-5 w-5 text-blue-500" />
                                                    <div>
                                                        <p className="font-medium">{policy.title}</p>
                                                        <p className="text-sm text-gray-500">
                                                            آخر تحديث: {new Date(policy.lastUpdated).toLocaleDateString('ar-EG')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>
                                            {expandedPolicies.includes(policy.id) && (
                                                <div className="px-4 pb-4 space-y-4 border-t">
                                                    <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap pt-4">
                                                        {policy.content}
                                                    </div>
                                                    <div className="flex gap-2 pt-4 border-t">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setEditingPolicy(policy)}
                                                        >
                                                            <Edit className="h-4 w-4 ml-1" />
                                                            تعديل
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-red-600 hover:text-red-700"
                                                            onClick={() => handleDeletePolicy(policy.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4 ml-1" />
                                                            حذف
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add Policy Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>إضافة سياسة جديدة</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>عنوان السياسة *</Label>
                            <Input
                                value={formData.title}
                                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="مثال: سياسة العمل عن بُعد"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>الفئة</Label>
                            <select
                                className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                                value={formData.category}
                                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                            >
                                {categories.map(cat => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label>محتوى السياسة *</Label>
                            <Textarea
                                value={formData.content}
                                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                                placeholder="اكتب تفاصيل السياسة هنا..."
                                rows={10}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                            إلغاء
                        </Button>
                        <Button onClick={handleAddPolicy}>
                            <Save className="h-4 w-4 ml-2" />
                            حفظ السياسة
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Policy Dialog */}
            <Dialog open={!!editingPolicy} onOpenChange={() => setEditingPolicy(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>تعديل السياسة</DialogTitle>
                    </DialogHeader>

                    {editingPolicy && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>عنوان السياسة</Label>
                                <Input
                                    value={editingPolicy.title}
                                    onChange={(e) => setEditingPolicy({ ...editingPolicy, title: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>الفئة</Label>
                                <select
                                    className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                                    value={editingPolicy.category}
                                    onChange={(e) => setEditingPolicy({ ...editingPolicy, category: e.target.value })}
                                >
                                    {categories.map(cat => (
                                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label>محتوى السياسة</Label>
                                <Textarea
                                    value={editingPolicy.content}
                                    onChange={(e) => setEditingPolicy({ ...editingPolicy, content: e.target.value })}
                                    rows={10}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingPolicy(null)}>
                            إلغاء
                        </Button>
                        <Button onClick={handleEditPolicy}>
                            <Save className="h-4 w-4 ml-2" />
                            حفظ التغييرات
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CompanyPolicy;
