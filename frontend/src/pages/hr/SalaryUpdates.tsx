import React, { useState, useEffect } from 'react';
import {
    Save, Search,
    AlertCircle, Loader2, ArrowLeft
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api'; // Ensure this path is correct based on your project structure
import { toast } from 'sonner';

interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    baseSalary: string;
    department: { name: string } | null;
    position: { title: string } | null;
    contractType: string;
    status: string;
}

const SalaryUpdates: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
    const [updates, setUpdates] = useState<Record<string, string>>({});

    const [globalReason, setGlobalReason] = useState('');

    const [historyLoading, setHistoryLoading] = useState(false);
    const [salaryHistory, setSalaryHistory] = useState<any[]>([]);

    // Filters
    const [search, setSearch] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [departments, setDepartments] = useState<any[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        filterData();
    }, [search, departmentFilter, employees]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [empRes, deptRes] = await Promise.all([
                api.get('/hr/employees?limit=1000&status=ACTIVE'), // Fetch all active employees
                api.get('/hr/departments')
            ]);

            setEmployees(empRes.data.employees);
            setDepartments(deptRes.data.departments);

            fetchSalaryHistory();
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('فشل في جلب البيانات');
        } finally {
            setLoading(false);
        }
    };

    const fetchSalaryHistory = async () => {
        try {
            setHistoryLoading(true);
            const res = await api.get('/hr/salary-history?limit=50&page=1');
            setSalaryHistory(res.data.history || []);
        } catch (error) {
            console.error('Error fetching salary history:', error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const filterData = () => {
        let result = [...employees];

        if (search) {
            const q = search.toLowerCase();
            result = result.filter(e =>
                e.firstName.toLowerCase().includes(q) ||
                e.lastName.toLowerCase().includes(q) ||
                e.employeeNumber.includes(q)
            );
        }

        if (departmentFilter !== 'all') {
            result = result.filter(e => e.department?.name === departmentFilter); // Assuming department name or ID match
        }

        setFilteredEmployees(result);
    };

    const parseSalary = (v: unknown) => {
        if (v === null || v === undefined) return null;
        const s = String(v).trim();
        if (s === '') return null;
        const normalized = s.replace(/,/g, '');
        const n = parseFloat(normalized);
        return Number.isFinite(n) ? n : null;
    };

    const isSameSalary = (a: unknown, b: unknown) => {
        const na = parseSalary(a);
        const nb = parseSalary(b);
        if (na === null && nb === null) return true;
        if (na === null || nb === null) return false;
        return na === nb;
    };

    const handleSalaryChange = (id: string, value: string) => {
        console.log('🔍 [SALARY-CHANGE] Salary change detected:', {
            employeeId: id,
            newValue: value,
            trimmedValue: value.trim()
        });
        
        const trimmed = value.trim();
        if (trimmed === '') {
            console.log('🔍 [SALARY-CHANGE] Removing empty value for employee:', id);
            setUpdates(prev => {
                const next = { ...prev };
                delete next[id];
                console.log('🔍 [SALARY-CHANGE] Updated state after removal:', next);
                return next;
            });
            return;
        }

        console.log('🔍 [SALARY-CHANGE] Setting new value for employee:', id, 'value:', value);
        setUpdates(prev => {
            const next = {
                ...prev,
                [id]: value
            };
            console.log('🔍 [SALARY-CHANGE] Updated state after change:', next);
            return next;
        });
    };

    const changedCount = employees.reduce((count, e) => {
        if (updates[e.id] === undefined) return count;
        const isChanged = !isSameSalary(updates[e.id], e.baseSalary);
        if (isChanged) {
            console.log('🔍 [CHANGE-DETECTION] Employee has changes:', {
                employeeId: e.id,
                employeeName: `${e.firstName} ${e.lastName}`,
                originalSalary: e.baseSalary,
                newSalary: updates[e.id],
                isSame: isSameSalary(updates[e.id], e.baseSalary)
            });
        }
        return isChanged ? count + 1 : count;
    }, 0);

    const hasChanges = changedCount > 0;
    
    console.log('🔍 [CHANGE-SUMMARY] Current state:', {
        totalEmployees: employees.length,
        updatesCount: Object.keys(updates).length,
        changedCount,
        hasChanges,
        updates: updates
    });

    const handleSave = async () => {
        try {
            const reason = globalReason.trim();
            console.log('🔍 [SALARY-SAVE] Starting save process with reason:', reason);
            
            if (!reason) {
                console.log('❌ [SALARY-SAVE] No reason provided');
                toast.error('سبب التعديل مطلوب');
                return;
            }

            setSaving(true);

            const payload = employees
                .filter(e => updates[e.id] !== undefined && !isSameSalary(updates[e.id], e.baseSalary))
                .map(e => ({
                    id: e.id,
                    baseSalary: updates[e.id]
                }));

            console.log('🔍 [SALARY-SAVE] Filtered payload:', {
                totalEmployees: employees.length,
                updatesCount: Object.keys(updates).length,
                payloadCount: payload.length,
                payload: payload
            });

            if (payload.length === 0) {
                console.log('ℹ️ [SALARY-SAVE] No actual changes to save');
                toast.info('لا توجد تغييرات فعلية للحفظ');
                setUpdates({});
                return;
            }

            const requestData = { updates: payload, reason };
            console.log('🚀 [SALARY-SAVE] Sending request to /hr/employees/bulk-salaries:', requestData);

            const res = await api.put('/hr/employees/bulk-salaries', requestData);
            
            console.log('✅ [SALARY-SAVE] Response received:', {
                status: res.status,
                data: res.data,
                headers: res.headers
            });

            if (res.data?.success) {
                console.log('✅ [SALARY-SAVE] Save successful, updated count:', res.data.updatedCount);
                toast.success(`تم تحديث ${res.data.updatedCount} موظف بنجاح`);
                setUpdates({});
                setGlobalReason('');
                fetchData(); // Refresh data
            } else {
                console.log('❌ [SALARY-SAVE] Save failed, response:', res.data);
                toast.error(res.data?.error || 'فشل حفظ التغييرات');
            }
        } catch (error: any) {
            console.error('❌ [SALARY-SAVE] Error saving salaries:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                config: error.config
            });
            toast.error(error.response?.data?.error || 'حدث خطأ أثناء الحفظ');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/hr/payroll')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">تحديث الرواتب</h1>
                        <p className="text-gray-500 dark:text-gray-400">تعديل الرواتب الأساسية للموظفين بشكل جماعي</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    {hasChanges && (
                        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-md border border-amber-200">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">يوجد تغييرات غير محفوظة</span>
                        </div>
                    )}
                    <Button
                        onClick={() => {
                            console.log('🔍 [SAVE-BUTTON] Button clicked!', {
                                hasChanges,
                                saving,
                                changedCount,
                                globalReason: globalReason.trim(),
                                updatesCount: Object.keys(updates).length,
                                updates: updates
                            });
                            handleSave();
                        }}
                        disabled={!hasChanges || saving}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                                جاري الحفظ...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4 ml-2" />
                                حفظ التغييرات ({changedCount})
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="p-4 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                            placeholder="بحث بالاسم أو الرقم الوظيفي..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pr-10"
                        />
                    </div>
                    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="القسم" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">جميع الأقسام</SelectItem>
                            {departments.map((dept: any) => (
                                <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">سبب التعديل</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <Input
                        placeholder="اكتب سبب تعديل الرواتب (مطلوب)"
                        value={globalReason}
                        onChange={(e) => setGlobalReason(e.target.value)}
                    />
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[300px] text-right">الموظف</TableHead>
                                <TableHead className="text-right">القسم</TableHead>
                                <TableHead className="text-right">نوع العقد</TableHead>
                                <TableHead className="text-right">الحالة</TableHead>
                                <TableHead className="w-[200px] text-right">الراتب الأساسي (ج.م)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredEmployees.map((employee) => {
                                const currentSalary = updates[employee.id] !== undefined
                                    ? updates[employee.id]
                                    : (employee.baseSalary || '');

                                const isChanged = updates[employee.id] !== undefined && !isSameSalary(updates[employee.id], employee.baseSalary);

                                return (
                                    <TableRow key={employee.id} className={isChanged ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{employee.firstName} {employee.lastName}</p>
                                                <p className="text-xs text-gray-500">{employee.employeeNumber}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {employee.department?.name || '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{employee.contractType}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={
                                                employee.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100'
                                            }>
                                                {employee.status === 'ACTIVE' ? 'نشط' : employee.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    value={currentSalary}
                                                    onChange={(e) => handleSalaryChange(employee.id, e.target.value)}
                                                    className={`${isChanged ? 'border-blue-500 ring-1 ring-blue-500' : ''}`}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {filteredEmployees.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                        لا يوجد موظفين مطابقين للبحث
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 overflow-hidden">
                <CardHeader>
                    <CardTitle className="text-base">سجل تعديلات الرواتب</CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-right">الموظف</TableHead>
                                <TableHead className="text-right">الراتب السابق</TableHead>
                                <TableHead className="text-right">الراتب الجديد</TableHead>
                                <TableHead className="text-right">التاريخ</TableHead>
                                <TableHead className="text-right">السبب</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {historyLoading && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                        جاري تحميل السجل...
                                    </TableCell>
                                </TableRow>
                            )}
                            {!historyLoading && salaryHistory.map((h: any) => (
                                <TableRow key={h.id}>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{h.employee ? `${h.employee.firstName} ${h.employee.lastName}` : h.userId}</p>
                                            {h.employee?.employeeNumber && (
                                                <p className="text-xs text-gray-500">{h.employee.employeeNumber}</p>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>{Number(h.previousSalary || 0).toLocaleString()}</TableCell>
                                    <TableCell>{Number(h.newSalary || 0).toLocaleString()}</TableCell>
                                    <TableCell>{h.effectiveDate ? new Date(h.effectiveDate).toLocaleDateString('ar-EG') : '-'}</TableCell>
                                    <TableCell>{h.reason || '-'}</TableCell>
                                </TableRow>
                            ))}
                            {!historyLoading && salaryHistory.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                        لا يوجد تعديلات رواتب حتى الآن
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
};

export default SalaryUpdates;
