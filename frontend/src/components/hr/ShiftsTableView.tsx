import React from 'react';
import { Edit, Trash2, Copy, Users, MoreVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { calculateWorkHours } from '@/utils/shiftHelpers';

interface Shift {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    breakDuration: number;
    color: string;
    isActive: boolean;
    _count?: {
        assignments: number;
    };
}

interface ShiftsTableViewProps {
    shifts: Shift[];
    selectedShifts: string[];
    onToggleSelect: (shiftId: string) => void;
    onToggleSelectAll: () => void;
    onEdit: (shift: Shift) => void;
    onDelete: (shiftId: string) => void;
    onDuplicate: (shift: Shift) => void;
    onToggleStatus: (shiftId: string, currentStatus: boolean) => void;
}

const ShiftsTableView: React.FC<ShiftsTableViewProps> = ({
    shifts,
    selectedShifts,
    onToggleSelect,
    onToggleSelectAll,
    onEdit,
    onDelete,
    onDuplicate,
    onToggleStatus,
}) => {
    const navigate = useNavigate();

    const allSelected = shifts.length > 0 && selectedShifts.length === shifts.length;
    const someSelected = selectedShifts.length > 0 && selectedShifts.length < shifts.length;

    return (
        <Card>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full" dir="rtl">
                        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-4 py-3 text-right w-12">
                                    <Checkbox
                                        checked={someSelected ? "indeterminate" : allSelected}
                                        onCheckedChange={onToggleSelectAll}
                                    />
                                </th>
                                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    الاسم
                                </th>
                                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    البدء
                                </th>
                                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    الانتهاء
                                </th>
                                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    الراحة
                                </th>
                                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    ساعات العمل
                                </th>
                                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    الموظفين
                                </th>
                                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    الحالة
                                </th>
                                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    الإجراءات
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {shifts.map((shift) => (
                                <tr
                                    key={shift.id}
                                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    style={{
                                        borderRight: `4px solid ${shift.color}`,
                                        background: `linear-gradient(to left, ${shift.color}08, transparent)`,
                                    }}
                                >
                                    <td className="px-4 py-4">
                                        <Checkbox
                                            checked={selectedShifts.includes(shift.id)}
                                            onCheckedChange={() => onToggleSelect(shift.id)}
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: shift.color }}
                                            />
                                            <button
                                                onClick={() => navigate(`/hr/shifts/${shift.id}`)}
                                                className="font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-right"
                                            >
                                                {shift.name}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{shift.startTime}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{shift.endTime}</td>
                                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                                        {shift.breakDuration} دقيقة
                                    </td>
                                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                        {calculateWorkHours(shift.startTime, shift.endTime, shift.breakDuration)} ساعة
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant="secondary" className="flex items-center gap-1 w-fit bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                            <Users className="h-3 w-3" />
                                            {shift._count?.assignments || 0}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={shift.isActive}
                                                onCheckedChange={() => onToggleStatus(shift.id, shift.isActive)}
                                            />
                                            <Badge variant={shift.isActive ? 'default' : 'outline'}>
                                                {shift.isActive ? 'نشط' : 'غير نشط'}
                                            </Badge>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => navigate(`/hr/shifts/${shift.id}`)}
                                                title="عرض التفاصيل"
                                            >
                                                <Users className="h-4 w-4" />
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => onEdit(shift)}>
                                                        <Edit className="h-4 w-4 ml-2" />
                                                        تعديل
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => onDuplicate(shift)}>
                                                        <Copy className="h-4 w-4 ml-2" />
                                                        نسخ
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => navigate(`/hr/shifts/${shift.id}/assign`)}
                                                    >
                                                        <Users className="h-4 w-4 ml-2" />
                                                        تعيين موظفين
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => onDelete(shift.id)}
                                                        className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                                                    >
                                                        <Trash2 className="h-4 w-4 ml-2" />
                                                        حذف
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
};

export default ShiftsTableView;
