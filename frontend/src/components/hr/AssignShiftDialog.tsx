import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Users, AlertTriangle, Check } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';
import { getDateRange, detectShiftConflict } from '@/utils/shiftHelpers';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  employeeNumber?: string;
  department?: { name: string };
  position?: { title: string };
}

interface Assignment {
  id: string;
  date: string;
  user: { id: string; firstName: string; lastName: string };
}

interface AssignShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shiftId: string;
  shiftName: string;
  onSuccess?: () => void;
}

const AssignShiftDialog: React.FC<AssignShiftDialogProps> = ({
  open,
  onOpenChange,
  shiftId,
  shiftName,
  onSuccess
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [existingAssignments, setExistingAssignments] = useState<Assignment[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [assignmentDate, setAssignmentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>('');
  const [dateRangeMode, setDateRangeMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchData();
    } else {
      // Reset on close
      setSelectedEmployeeIds([]);
      setSearchTerm('');
      setDateRangeMode(false);
      setEndDate('');
    }
  }, [open, shiftId]);

  useEffect(() => {
    if (assignmentDate && open) {
      fetchExistingAssignments(assignmentDate);
    }
  }, [assignmentDate, open]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [shiftRes, employeesRes] = await Promise.all([
        api.get(`/hr/shifts/${shiftId}`),
        api.get('/hr/employees?limit=100&status=active')
      ]);

      setEmployees(employeesRes.data.employees || []);
      setExistingAssignments(shiftRes.data.shift?.assignments || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('فشل في جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingAssignments = async (date: string) => {
    try {
      const response = await api.get(`/hr/shifts/${shiftId}`);
      const assignments = response.data.shift?.assignments?.filter(
        (a: Assignment) => a.date.split('T')[0] === date
      ) || [];
      setExistingAssignments(assignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const handleAssign = async () => {
    if (selectedEmployeeIds.length === 0 || !assignmentDate) {
      toast.error('يرجى اختيار موظف واحد على الأقل والتاريخ');
      return;
    }

    if (dateRangeMode && !endDate) {
      toast.error('يرجى تحديد تاريخ الانتهاء');
      return;
    }

    try {
      setSubmitting(true);

      // Prepare dates array
      const dates = dateRangeMode && endDate 
        ? getDateRange(assignmentDate, endDate)
        : [assignmentDate];

      // Use bulk assignment API
      const response = await api.post('/hr/shifts/bulk-assign', {
        shiftId,
        employeeIds: selectedEmployeeIds,
        dates
      });

      const { results, message } = response.data;

      // Show detailed results
      if (results.failed.length > 0) {
        // Show warning with details
        const failedDetails = results.failed.slice(0, 3).map((f: any) => 
          `${f.employeeName || 'موظف'}: ${f.error}`
        ).join('\n');
        
        toast.warning(
          `${message}\n\nالأخطاء:\n${failedDetails}${results.failed.length > 3 ? `\n...و ${results.failed.length - 3} أخطاء أخرى` : ''}`,
          { duration: 5000 }
        );
      } else {
        toast.success(message);
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error assigning shift:', error);
      const errorMessage = error.response?.data?.error || 'فشل في تعيين المناوبة';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = `${emp.firstName} ${emp.lastName} ${emp.employeeNumber || ''}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const isAlreadyAssigned = detectShiftConflict(
        existingAssignments,
        emp.id,
        assignmentDate
      );

      return matchesSearch && !isAlreadyAssigned;
    });
  }, [employees, searchTerm, existingAssignments, assignmentDate]);

  const toggleEmployeeSelection = (empId: string) => {
    setSelectedEmployeeIds(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl">
            تعيين موظفين - {shiftName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">التاريخ</Label>
              <Button
                variant={dateRangeMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateRangeMode(!dateRangeMode)}
              >
                {dateRangeMode ? 'تاريخ واحد' : 'نطاق تاريخ'}
              </Button>
            </div>
            <div className={dateRangeMode ? 'grid grid-cols-2 gap-3' : ''}>
              <div>
                {dateRangeMode && <Label className="text-xs text-muted-foreground mb-1">من</Label>}
                <Input
                  type="date"
                  value={assignmentDate}
                  onChange={(e) => setAssignmentDate(e.target.value)}
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
                  />
                </div>
              )}
            </div>
          </div>

          {/* Existing Assignments Warning */}
          {existingAssignments.length > 0 && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-orange-900 dark:text-orange-200">
                    {existingAssignments.length} موظف معين بالفعل في {assignmentDate}
                  </p>
                  <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                    تم إخفاؤهم من القائمة
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Employee Search */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              الموظفين {selectedEmployeeIds.length > 0 && `(${selectedEmployeeIds.length} محدد)`}
            </Label>
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث عن موظف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>

          {/* Employee List */}
          <div className="border rounded-lg max-h-[300px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : filteredEmployees.length > 0 ? (
              <div className="divide-y">
                {filteredEmployees.map((emp) => {
                  const isSelected = selectedEmployeeIds.includes(emp.id);
                  return (
                    <div
                      key={emp.id}
                      onClick={() => toggleEmployeeSelection(emp.id)}
                      className={`flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                        isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox checked={isSelected} />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={emp.avatar} />
                          <AvatarFallback className="text-xs">
                            {emp.firstName[0]}{emp.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">
                              {emp.firstName} {emp.lastName}
                            </p>
                            {emp.employeeNumber && (
                              <Badge variant="outline" className="text-xs">
                                #{emp.employeeNumber}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {emp.department?.name || 'بدون قسم'}
                            {emp.position?.title && ` • ${emp.position.title}`}
                          </p>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">
                {searchTerm ? 'لا توجد نتائج مطابقة' : 'لا يوجد موظفين متاحين'}
              </div>
            )}
          </div>

          {/* Summary */}
          {selectedEmployeeIds.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-blue-900 dark:text-blue-200">
                    ملخص التعيين
                  </p>
                  <p className="text-blue-700 dark:text-blue-300">
                    {selectedEmployeeIds.length} موظف
                    {dateRangeMode && endDate
                      ? ` × ${getDateRange(assignmentDate, endDate).length} يوم = ${
                          selectedEmployeeIds.length * getDateRange(assignmentDate, endDate).length
                        } تعيين`
                      : ' × 1 يوم'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            onClick={handleAssign}
            disabled={submitting || selectedEmployeeIds.length === 0 || (dateRangeMode && !endDate)}
          >
            {submitting ? 'جاري الحفظ...' : `تأكيد (${selectedEmployeeIds.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignShiftDialog;
