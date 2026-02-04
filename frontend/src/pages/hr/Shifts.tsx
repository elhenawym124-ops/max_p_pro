import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Clock, Plus, Users, Edit, Trash2, Search,
  TrendingUp, LayoutGrid, Table as TableIcon,
  Copy, MoreVertical, CheckSquare, X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { toast } from 'sonner';
import ShiftsSkeleton from '@/components/hr/ShiftsSkeleton';
import ShiftsTableView from '@/components/hr/ShiftsTableView';
import AssignShiftDialog from '@/components/hr/AssignShiftDialog';
import useKeyboardShortcuts from '@/hooks/useKeyboardShortcuts';
import { cn } from '@/lib/utils';
import { calculateWorkHours, validateShiftTimes, SHIFT_TEMPLATES } from '@/utils/shiftHelpers';

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

const Shifts: React.FC = () => {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // State
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    return (localStorage.getItem('shiftsViewMode') as 'grid' | 'table') || 'grid';
  });

  // Dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [shiftToAssign, setShiftToAssign] = useState<{ id: string; name: string } | null>(null);

  // Selection
  const [selectedShifts, setSelectedShifts] = useState<string[]>([]);
  const [shiftToDelete, setShiftToDelete] = useState<string | null>(null);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'startTime' | 'employees'>('name');

  // Form
  const [formData, setFormData] = useState({
    name: '',
    startTime: '09:00',
    endTime: '17:00',
    breakDuration: 60,
    color: '#3B82F6'
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchShifts();
  }, []);

  useEffect(() => {
    localStorage.setItem('shiftsViewMode', viewMode);
  }, [viewMode]);

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/hr/shifts');
      setShifts(response.data.shifts || []);
    } catch (error: any) {
      console.error('❌ Error fetching shifts:', error);
      toast.error(error.response?.data?.error || 'فشل في جلب المناوبات');
      setShifts([]);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors['name'] = 'يرجى إدخال اسم المناوبة';

    const validation = validateShiftTimes(
      formData.startTime,
      formData.endTime,
      formData.breakDuration
    );

    if (!validation.valid && validation.error) {
      errors['time'] = validation.error;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({ name: '', startTime: '09:00', endTime: '17:00', breakDuration: 60, color: '#3B82F6' });
    setFormErrors({});
    setEditingShift(null);
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    try {
      await api.post('/hr/shifts', formData);
      toast.success('تم إنشاء المناوبة بنجاح');
      setDialogOpen(false);
      resetForm();
      fetchShifts();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'فشل في إنشاء المناوبة');
    }
  };

  const handleUpdate = async () => {
    if (!editingShift || !validateForm()) return;
    try {
      await api.put(`/hr/shifts/${editingShift.id}`, formData);
      toast.success('تم تحديث المناوبة بنجاح');
      setDialogOpen(false);
      resetForm();
      fetchShifts();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'فشل في تحديث المناوبة');
    }
  };

  const handleToggleStatus = async (shiftId: string, currentStatus: boolean) => {
    try {
      setShifts(prev => prev.map(s => s.id === shiftId ? { ...s, isActive: !currentStatus } : s));

      await api.put(`/hr/shifts/${shiftId}`, { isActive: !currentStatus });
      toast.success(currentStatus ? 'تم تعطيل المناوبة' : 'تم تفعيل المناوبة');
    } catch (error) {
      setShifts(prev => prev.map(s => s.id === shiftId ? { ...s, isActive: currentStatus } : s));
      toast.error('فشل في تغيير حالة المناوبة');
    }
  };

  const handleDuplicate = async (shift: Shift) => {
    setFormData({
      name: `${shift.name} (نسخة)`,
      startTime: shift.startTime,
      endTime: shift.endTime,
      breakDuration: shift.breakDuration,
      color: shift.color
    });
    setEditingShift(null);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!shiftToDelete) return;
    try {
      if (shiftToDelete === 'bulk') {
        await Promise.all(selectedShifts.map(id => api.delete(`/hr/shifts/${id}`)));
        toast.success(`تم حذف ${selectedShifts.length} مناوبة`);
        setSelectedShifts([]);
      } else {
        await api.delete(`/hr/shifts/${shiftToDelete}`);
        toast.success('تم حذف المناوبة بنجاح');
      }
      setDeleteDialogOpen(false);
      setShiftToDelete(null);
      fetchShifts();
    } catch (error) {
      toast.error('فشل في حذف المناوبة');
    }
  };


  const filteredAndSortedShifts = useMemo(() => {
    return shifts
      .filter(shift => {
        if (searchTerm && !shift.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        if (statusFilter === 'active' && !shift.isActive) return false;
        if (statusFilter === 'inactive' && shift.isActive) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name, 'ar');
        if (sortBy === 'startTime') return a.startTime.localeCompare(b.startTime);
        if (sortBy === 'employees') return (b._count?.assignments || 0) - (a._count?.assignments || 0);
        return 0;
      });
  }, [shifts, searchTerm, statusFilter, sortBy]);

  const stats = useMemo(() => {
    const total = shifts.length;
    const active = shifts.filter(s => s.isActive).length;
    const totalAssignments = shifts.reduce((sum, s) => sum + (s._count?.assignments || 0), 0);
    return { total, active, inactive: total - active, totalAssignments };
  }, [shifts]);

  // Keyboard Shortcuts
  useKeyboardShortcuts({
    'n': (e: KeyboardEvent) => {
      resetForm();
      setDialogOpen(true);
    },
    '/': (e: KeyboardEvent) => {
      e.preventDefault();
      searchInputRef.current?.focus();
    },
    'escape': (e: KeyboardEvent) => {
      setDialogOpen(false);
      setDeleteDialogOpen(false);
    }
  });

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">المناوبات</h1>
          <p className="text-gray-500 mt-1">إدارة مناوبات العمل وجداول الموظفين</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <Button
            variant={viewMode === 'grid' ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode('grid')}
            className={viewMode === 'grid' ? 'shadow-sm bg-white dark:bg-gray-700' : ''}
          >
            <LayoutGrid className="h-4 w-4 ml-2" />
            شبكة
          </Button>
          <Button
            variant={viewMode === 'table' ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode('table')}
            className={viewMode === 'table' ? 'shadow-sm bg-white dark:bg-gray-700' : ''}
          >
            <TableIcon className="h-4 w-4 ml-2" />
            جدول
          </Button>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 ml-2" />
          مناوبة جديدة
        </Button>
      </div>

      {/* Stats - Compact */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">الإجمالي</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
            <Clock className="h-5 w-5 text-blue-500 dark:text-blue-400 opacity-80" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">نشطة</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">{stats.active}</p>
            </div>
            <TrendingUp className="h-5 w-5 text-green-500 dark:text-green-400 opacity-80" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">معطلة</p>
              <p className="text-xl font-bold text-gray-600 dark:text-gray-400">{stats.inactive}</p>
            </div>
            <Clock className="h-5 w-5 text-gray-400 dark:text-gray-500 opacity-80" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">الموظفين</p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{stats.totalAssignments}</p>
            </div>
            <Users className="h-5 w-5 text-purple-500 dark:text-purple-400 opacity-80" />
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions Bar */}
      {selectedShifts.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-blue-800 dark:text-blue-200">تم تحديد {selectedShifts.length} مناوبة</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"
              onClick={() => { setShiftToDelete('bulk'); setDeleteDialogOpen(true); }}
            >
              <Trash2 className="h-4 w-4 ml-2" />
              حذف المحدد
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedShifts([])}
            >
              <X className="h-4 w-4 ml-2" />
              إلغاء التحديد
            </Button>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            ref={searchInputRef}
            placeholder="ابحث عن مناوبة... (/)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
          <SelectTrigger className="w-full md:w-[150px]">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="active">نشط</SelectItem>
            <SelectItem value="inactive">غير نشط</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className="w-full md:w-[150px]">
            <SelectValue placeholder="ترتيب حسب" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">الاسم</SelectItem>
            <SelectItem value="startTime">وقت البدء</SelectItem>
            <SelectItem value="employees">عدد الموظفين</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <ShiftsSkeleton viewMode={viewMode} />
      ) : filteredAndSortedShifts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center flex flex-col items-center">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-full mb-4">
              <Search className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
              {searchTerm ? 'لا توجد نتائج مطابقة' : 'لا توجد مناوبات'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-sm">
              {searchTerm
                ? `لم يتم العثور على أي مناوبات تطابق "${searchTerm}". جرب مصطلحات بحث مختلفة.`
                : 'قم بإنشاء أول مناوبة عمل لتنظيم جدول الموظفين.'}
            </p>
            {searchTerm ? (
              <Button variant="outline" onClick={() => setSearchTerm('')}>
                مسح البحث
              </Button>
            ) : (
              <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 ml-2" />
                إنشاء مناوبة الآن
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === 'table' ? (
            <ShiftsTableView
              shifts={filteredAndSortedShifts}
              selectedShifts={selectedShifts}
              onToggleSelect={(id) => setSelectedShifts(prev =>
                prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
              )}
              onToggleSelectAll={() => setSelectedShifts(
                selectedShifts.length === filteredAndSortedShifts.length ? [] : filteredAndSortedShifts.map(s => s.id)
              )}
              onEdit={(shift) => {
                setEditingShift(shift); setFormData({
                  name: shift.name,
                  startTime: shift.startTime,
                  endTime: shift.endTime,
                  breakDuration: shift.breakDuration,
                  color: shift.color
                }); setDialogOpen(true);
              }}
              onDelete={(id) => { setShiftToDelete(id); setDeleteDialogOpen(true); }}
              onDuplicate={handleDuplicate}
              onToggleStatus={handleToggleStatus}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAndSortedShifts.map((shift) => (
                <div
                  key={shift.id}
                  className={cn(
                    "transition-all hover:shadow-md cursor-pointer group relative rounded-xl border bg-card text-card-foreground shadow",
                    selectedShifts.includes(shift.id) ? "ring-2 ring-blue-500" : ""
                  )}
                  style={{
                    borderRight: `4px solid ${shift.color}`,
                    background: `linear-gradient(to left, ${shift.color}08, transparent)`
                  }}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (!target.closest('button') && !target.closest('.no-click')) {
                      navigate(`/hr/shifts/${shift.id}`);
                    }
                  }}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedShifts.includes(shift.id)}
                          onCheckedChange={(checked) => {
                            checked
                              ? setSelectedShifts([...selectedShifts, shift.id])
                              : setSelectedShifts(selectedShifts.filter(id => id !== shift.id));
                          }}
                          className="no-click"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <CardTitle className="text-lg">{shift.name}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2 no-click" onClick={e => e.stopPropagation()}>
                        <Switch
                          checked={shift.isActive}
                          onCheckedChange={() => handleToggleStatus(shift.id, shift.isActive)}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">الوقت:</span>
                        <div className="flex items-center gap-2 font-medium bg-white dark:bg-gray-700 px-2 py-1 rounded border border-gray-200 dark:border-gray-600">
                          <Clock className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                          {shift.startTime} - {shift.endTime}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">ساعات العمل:</span>
                        <span className="font-bold">
                          {calculateWorkHours(shift.startTime, shift.endTime, shift.breakDuration)} ساعة
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">الموظفين:</span>
                        <Badge variant="secondary" className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                          <Users className="h-3 w-3 ml-1" />
                          {shift._count?.assignments || 0}
                        </Badge>
                      </div>

                      <div className="pt-3 flex items-center justify-end gap-2 no-click" onClick={e => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); navigate(`/hr/shifts/${shift.id}`); }}
                          title="التفاصيل"
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" dir="rtl">
                            <DropdownMenuItem onClick={() => {
                              setEditingShift(shift);
                              setFormData({
                                name: shift.name,
                                startTime: shift.startTime,
                                endTime: shift.endTime,
                                breakDuration: shift.breakDuration,
                                color: shift.color
                              });
                              setDialogOpen(true);
                            }}>
                              <Edit className="h-4 w-4 ml-2" />
                              تعديل
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(shift)}>
                              <Copy className="h-4 w-4 ml-2" />
                              نسخ
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setShiftToAssign({ id: shift.id, name: shift.name });
                              setAssignDialogOpen(true);
                            }}>
                              <Users className="h-4 w-4 ml-2" />
                              تعيين موظفين
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => { setShiftToDelete(shift.id); setDeleteDialogOpen(true); }}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 ml-2" />
                              حذف
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingShift ? 'تعديل المناوبة' : 'مناوبة جديدة'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Quick Templates - Only show when creating new shift */}
            {!editingShift && (
              <div>
                <Label className="text-sm font-medium mb-2 block">قوالب جاهزة</Label>
                <div className="grid grid-cols-2 gap-2">
                  {SHIFT_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => {
                        setFormData({
                          name: template.name,
                          startTime: template.startTime,
                          endTime: template.endTime,
                          breakDuration: template.breakDuration,
                          color: template.color
                        });
                      }}
                      className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-right"
                    >
                      <span className="text-2xl">{template.icon}</span>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{template.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{template.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">أو أدخل يدوياً</span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label>اسم المناوبة</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: صباحي A، مسائي، ليل"
                className={formErrors['name'] ? 'border-red-500' : ''}
              />
              {formErrors['name'] && (
                <p className="text-sm text-red-500 mt-1">{formErrors['name']}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>وقت البدء</Label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div>
                <Label>وقت الانتهاء</Label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className={formErrors['endTime'] ? 'border-red-500' : ''}
                />
                {formErrors['endTime'] && (
                  <p className="text-sm text-red-500 mt-1">{formErrors['endTime']}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>مدة الراحة (دقائق)</Label>
                <Input
                  type="number"
                  value={formData.breakDuration}
                  onChange={(e) => setFormData({ ...formData, breakDuration: parseInt(e.target.value) || 0 })}
                  className={formErrors['breakDuration'] ? 'border-red-500' : ''}
                />
              </div>
              <div className="flex-1">
                <Label>لون التمييز</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-12 h-10 p-1"
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400">{formData.color}</span>
                </div>
              </div>
            </div>

            {/* Live Preview of Hours */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md text-sm text-blue-800 dark:text-blue-200 flex justify-between items-center">
              <span>ساعات العمل الصافية:</span>
              <span className="font-bold text-lg">
                {calculateWorkHours(formData.startTime, formData.endTime, formData.breakDuration)}
              </span>
            </div>

            {formErrors['time'] && (
              <p className="text-sm text-red-500">{formErrors['time']}</p>
            )}

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={editingShift ? handleUpdate : handleCreate}>
              {editingShift ? 'تحديث' : 'إنشاء'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              {shiftToDelete === 'bulk'
                ? `سيتم حذف ${selectedShifts.length} مناوبة. لا يمكن التراجع عن هذا الإجراء.`
                : 'سيتم حذف هذه المناوبة بشكل نهائي. لا يمكن التراجع عن هذا الإجراء.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign Shift Dialog */}
      {shiftToAssign && (
        <AssignShiftDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          shiftId={shiftToAssign.id}
          shiftName={shiftToAssign.name}
          onSuccess={fetchShifts}
        />
      )}
    </div>
  );
};

export default Shifts;
