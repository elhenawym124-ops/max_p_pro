import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Clock, Calendar, ArrowRight, UserPlus, Check, AlertCircle,
    Search, ShieldCheck, Briefcase, Users, Filter, X, CalendarRange, AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import api from '@/services/api';
import { toast } from 'sonner';

interface Shift {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    color: string;
}

interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    employeeNumber?: string;
    isActive?: boolean;
    department?: {
        id: string;
        name: string;
    };
    position?: {
        id: string;
        title: string;
    };
}

interface Assignment {
    id: string;
    date: string;
    user: {
        id: string;
        firstName: string;
        lastName: string;
        employeeNumber?: string;
    };
}

const AssignShift: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [shift, setShift] = useState<Shift | null>(null);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [existingAssignments, setExistingAssignments] = useState<Assignment[]>([]);
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
    const [assignmentDate, setAssignmentDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState<string>('all');
    const [positionFilter, setPositionFilter] = useState<string>('all');
    const [dateRangeMode, setDateRangeMode] = useState(false);

    useEffect(() => {
        if (id) {
            fetchData();
        }
    }, [id]);

    const fetchData = async () => {
        if (!id) return;

        try {
            setLoading(true);
            const [shiftRes, employeesRes] = await Promise.all([
                api.get(`/hr/shifts/${id}`),
                api.get('/hr/employees?limit=1000')
            ]);

            setShift(shiftRes.data.shift);
            setEmployees(employeesRes.data.employees || []);
            
            // Fetch existing assignments for the selected date
            if (assignmentDate) {
                fetchExistingAssignments(assignmentDate);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('فشل في جلب البيانات المطلوبة');
        } finally {
            setLoading(false);
        }
    };

    const fetchExistingAssignments = async (date: string) => {
        try {
            const response = await api.get(`/hr/shifts/${id}`);
            const assignments = response.data.shift?.assignments?.filter(
                (a: Assignment) => a.date.split('T')[0] === date
            ) || [];
            setExistingAssignments(assignments);
        } catch (error) {
            console.error('Error fetching assignments:', error);
        }
    };

    useEffect(() => {
        if (assignmentDate && id) {
            fetchExistingAssignments(assignmentDate);
        }
    }, [assignmentDate, id]);

    const handleAssign = async () => {
        if (selectedEmployeeIds.length === 0 || !assignmentDate) {
            toast.error('يرجى اختيار موظف واحد على الأقل والتاريخ');
            return;
        }

        // Check for duplicate assignments
        const alreadyAssigned = selectedEmployeeIds.filter(empId => 
            existingAssignments.some(a => a.user?.id === empId)
        );

        if (alreadyAssigned.length > 0 && !dateRangeMode) {
            const employee = employees.find(e => e.id === alreadyAssigned[0]);
            toast.error(`الموظف ${employee?.firstName} ${employee?.lastName} معيّن بالفعل في هذا التاريخ`);
            return;
        }

        try {
            setSubmitting(true);
            
            if (dateRangeMode && endDate) {
                // Assign for date range
                const dates = getDateRange(assignmentDate, endDate);
                const promises = selectedEmployeeIds.flatMap(userId =>
                    dates.map(date =>
                        api.post('/hr/shifts/assign', {
                            shiftId: id,
                            userId,
                            date
                        })
                    )
                );
                await Promise.all(promises);
                toast.success(`تم تعيين ${selectedEmployeeIds.length} موظف لـ ${dates.length} يوم`);
            } else {
                // Single or bulk assignment for one date
                const promises = selectedEmployeeIds.map(userId =>
                    api.post('/hr/shifts/assign', {
                        shiftId: id,
                        userId,
                        date: assignmentDate
                    })
                );
                await Promise.all(promises);
                toast.success(`تم تعيين ${selectedEmployeeIds.length} موظف بنجاح`);
            }

            navigate(`/hr/shifts/${id}`);
        } catch (error: any) {
            console.error('Error assigning shift:', error);
            toast.error(error.response?.data?.error || 'فشل في تعيين المناوبة');
        } finally {
            setSubmitting(false);
        }
    };

    const getDateRange = (start: string, end: string): string[] => {
        const dates: string[] = [];
        const startDate = new Date(start);
        const endDate = new Date(end);
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            dates.push(new Date(d).toISOString().split('T')[0]);
        }
        
        return dates;
    };

    const toggleEmployeeSelection = (empId: string) => {
        setSelectedEmployeeIds(prev => 
            prev.includes(empId) 
                ? prev.filter(id => id !== empId)
                : [...prev, empId]
        );
    };

    const departments = useMemo(() => {
        const depts = new Set(employees.map(e => e.department?.name).filter(Boolean));
        return Array.from(depts);
    }, [employees]);

    const positions = useMemo(() => {
        const pos = new Set(employees.map(e => e.position?.title).filter(Boolean));
        return Array.from(pos);
    }, [employees]);

    const filteredEmployees = useMemo(() => {
        return employees.filter(emp => {
            const matchesSearch = `${emp.firstName} ${emp.lastName} ${emp.employeeNumber || ''}`
                .toLowerCase()
                .includes(searchTerm.toLowerCase());
            
            const matchesDepartment = departmentFilter === 'all' || emp.department?.name === departmentFilter;
            const matchesPosition = positionFilter === 'all' || emp.position?.title === positionFilter;
            
            // Filter out already assigned employees
            const isAlreadyAssigned = existingAssignments.some(a => a.user?.id === emp.id);
            
            return matchesSearch && matchesDepartment && matchesPosition && !isAlreadyAssigned;
        });
    }, [employees, searchTerm, departmentFilter, positionFilter, existingAssignments]);

    const assignedEmployeeNames = useMemo(() => {
        return existingAssignments
            .filter(a => a.user)
            .map(a => `${a.user.firstName} ${a.user.lastName}`)
            .join('، ');
    }, [existingAssignments]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!shift) {
        return (
            <div className="p-6 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
                <h2 className="text-xl font-bold">المناوبة غير موجودة</h2>
                <Button onClick={() => navigate('/hr/shifts')} className="mt-4">العودة للمناوبات</Button>
            </div>
        );
    }

    return (
        <div className="w-full p-4 md:p-6 space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/hr/shifts/${id}`)}
                        className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        <ArrowRight className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">تعيين مناوبة</h1>
                        <p className="text-muted-foreground text-sm">اختر موظف أو عدة موظفين لتعيينهم في المناوبة</p>
                    </div>
                </div>
                <Button
                    variant={dateRangeMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDateRangeMode(!dateRangeMode)}
                >
                    <CalendarRange className="h-4 w-4 ml-2" />
                    {dateRangeMode ? 'إلغاء نطاق التاريخ' : 'نطاق تاريخ'}
                </Button>
            </div>

            {/* Existing Assignments Alert */}
            {existingAssignments.length > 0 && (
                <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
                    <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-semibold text-orange-900 dark:text-orange-200">
                                    موظفين معينين بالفعل في {assignmentDate}
                                </p>
                                <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                                    {assignedEmployeeNames}
                                </p>
                                <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                                    هؤلاء الموظفين مخفيون من القائمة لتجنب التعيين المكرر
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Shift Details Card */}
                <Card className="md:col-span-1 border-primary/20 bg-primary/5">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Clock className="h-5 w-5 text-primary" />
                            تفاصيل المناوبة
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-primary/10 shadow-sm">
                            <span className="text-sm font-medium">{shift.name}</span>
                            <div
                                className="w-3 h-3 rounded-full shadow-sm"
                                style={{ backgroundColor: shift.color }}
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm px-1">
                                <span className="text-muted-foreground">وقت البدء</span>
                                <span className="font-bold text-primary">{shift.startTime}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm px-1">
                                <span className="text-muted-foreground">وقت الانتهاء</span>
                                <span className="font-bold text-primary">{shift.endTime}</span>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-primary/10">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/10 p-2 rounded">
                                <ShieldCheck className="h-3 w-3" />
                                <span>سيتم تسجيل هذا التعيين في ملف الموظف</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Assignment Form Card */}
                <Card className="md:col-span-2 shadow-lg border-none ring-1 ring-gray-200 dark:ring-gray-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5 text-green-500" />
                            بيانات التعيين
                        </CardTitle>
                        <CardDescription>اختر الموظف والتاريخ لإتمام العملية</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Filters */}
                        <div className="flex items-center gap-3">
                            <div className="flex-1">
                                <Label className="text-xs text-muted-foreground">القسم</Label>
                                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="كل الأقسام" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">كل الأقسام</SelectItem>
                                        {departments.map(dept => (
                                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex-1">
                                <Label className="text-xs text-muted-foreground">المنصب</Label>
                                <Select value={positionFilter} onValueChange={setPositionFilter}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="كل المناصب" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">كل المناصب</SelectItem>
                                        {positions.map(pos => (
                                            <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {(departmentFilter !== 'all' || positionFilter !== 'all') && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setDepartmentFilter('all');
                                        setPositionFilter('all');
                                    }}
                                    className="mt-5"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>

                        {/* Employee Selection */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-semibold">
                                    الموظفين {selectedEmployeeIds.length > 0 && `(${selectedEmployeeIds.length} محدد)`}
                                </Label>
                                <Badge variant="secondary">
                                    {filteredEmployees.length} متاح
                                </Badge>
                            </div>
                            <div className="relative">
                                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    placeholder="ابحث عن الموظف باسمه أو رقمه..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pr-10 bg-gray-50/50 focus:bg-white dark:bg-gray-800/50"
                                />
                            </div>

                            <div className="border rounded-xl overflow-hidden bg-gray-50/30 dark:bg-gray-900/30 max-h-[350px] overflow-y-auto">
                                {filteredEmployees.length > 0 ? (
                                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {filteredEmployees.map((emp) => {
                                            const isSelected = selectedEmployeeIds.includes(emp.id);
                                            return (
                                                <div
                                                    key={emp.id}
                                                    onClick={() => toggleEmployeeSelection(emp.id)}
                                                    className={`flex items-center justify-between p-3 cursor-pointer transition-all hover:bg-primary/5 ${
                                                        isSelected ? 'bg-primary/10 border-r-4 border-primary' : ''
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-10 w-10 border-2 border-white dark:border-gray-800 shadow-sm">
                                                            <AvatarImage src={emp.avatar} />
                                                            <AvatarFallback className="bg-primary/10 text-primary">
                                                                {emp.firstName[0]}{emp.lastName[0]}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="text-right">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-bold">{emp.firstName} {emp.lastName}</p>
                                                                {emp.employeeNumber && (
                                                                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                                                                        #{emp.employeeNumber}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                                                                <span className="flex items-center gap-1">
                                                                    <Briefcase className="h-3 w-3" />
                                                                    {emp.department?.name || 'بدون قسم'}
                                                                </span>
                                                                {emp.position?.title && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span>{emp.position.title}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {isSelected && (
                                                        <div className="bg-primary text-white p-1 rounded-full">
                                                            <Check className="h-3 w-3" />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-muted-foreground italic text-sm">
                                        لا يوجد موظفين يطابقون البحث
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Date Selection */}
                        <div className="space-y-3">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-orange-500" />
                                {dateRangeMode ? 'نطاق التاريخ' : 'تاريخ العمل'}
                            </Label>
                            <div className={dateRangeMode ? 'grid grid-cols-2 gap-3' : ''}>
                                <div>
                                    {dateRangeMode && (
                                        <Label className="text-xs text-muted-foreground mb-1">من</Label>
                                    )}
                                    <Input
                                        type="date"
                                        value={assignmentDate}
                                        onChange={(e) => setAssignmentDate(e.target.value)}
                                        className="bg-gray-50/50 dark:bg-gray-800/50"
                                    />
                                </div>
                                {dateRangeMode && (
                                    <div>
                                        <Label className="text-xs text-muted-foreground mb-1">إلى</Label>
                                        <Input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            min={assignmentDate}
                                            className="bg-gray-50/50 dark:bg-gray-800/50"
                                        />
                                    </div>
                                )}
                            </div>
                            <p className="text-[10px] text-muted-foreground px-1">
                                {dateRangeMode 
                                    ? '* سيتم تعيين الموظفين المحددين لجميع الأيام في النطاق المحدد'
                                    : '* يمكنك تعيين المناوبة للموظفين في هذا اليوم'
                                }
                            </p>
                        </div>

                        {/* Summary */}
                        {selectedEmployeeIds.length > 0 && (
                            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
                                <CardContent className="pt-4">
                                    <div className="flex items-start gap-3">
                                        <Check className="h-5 w-5 text-blue-600 mt-0.5" />
                                        <div className="flex-1 text-sm">
                                            <p className="font-semibold text-blue-900 dark:text-blue-200">
                                                ملخص التعيين
                                            </p>
                                            <p className="text-blue-700 dark:text-blue-300 mt-1">
                                                {selectedEmployeeIds.length} موظف
                                                {dateRangeMode && endDate 
                                                    ? ` × ${getDateRange(assignmentDate, endDate).length} يوم = ${selectedEmployeeIds.length * getDateRange(assignmentDate, endDate).length} تعيين`
                                                    : ' × 1 يوم = ' + selectedEmployeeIds.length + ' تعيين'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Action Buttons */}
                        <div className="pt-4 flex gap-3">
                            <Button
                                onClick={handleAssign}
                                disabled={submitting || selectedEmployeeIds.length === 0 || (dateRangeMode && !endDate)}
                                className="flex-1 h-12 text-lg font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
                            >
                                {submitting ? 'جاري الحفظ...' : `تأكيد التعيين (${selectedEmployeeIds.length})`}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => navigate(`/hr/shifts/${id}`)}
                                className="h-12 border-gray-200 dark:border-gray-800"
                            >
                                إلغاء
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AssignShift;

