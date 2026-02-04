import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { 
  Briefcase, Plus, Edit2, Trash2, Save, X, 
  Search, ArrowRight, Users, DollarSign, Building
} from 'lucide-react';
import api from '@/services/api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// Types
interface Position {
  id: string;
  title: string;
  description?: string;
  code?: string;
  level: number;
  departmentId?: string;
  minSalary?: number;
  maxSalary?: number;
  department?: {
    id: string;
    name: string;
  };
  _count?: {
    users: number;
  };
}

type PositionFormData = {
  title: string;
  description?: string;
  code?: string;
  level: number;
  departmentId?: string;
  minSalary?: number;
  maxSalary?: number;
};

const PositionsManagement: React.FC = () => {
  const navigate = useNavigate();
  const [positions, setPositions] = useState<Position[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [positionToDelete, setPositionToDelete] = useState<Position | null>(null);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<PositionFormData>({
    defaultValues: {
      title: '',
      description: '',
      code: '',
      level: 1,
      departmentId: '',
      minSalary: undefined,
      maxSalary: undefined,
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (editingPosition) {
      reset({
        title: editingPosition.title,
        description: editingPosition.description || '',
        code: editingPosition.code || '',
        level: editingPosition.level,
        departmentId: editingPosition.departmentId || '',
        minSalary: editingPosition.minSalary || undefined,
        maxSalary: editingPosition.maxSalary || undefined,
      });
    }
  }, [editingPosition, reset]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [positionsRes, departmentsRes] = await Promise.all([
        api.get('/hr/positions'),
        api.get('/hr/departments').catch(() => ({ data: { departments: [] } }))
      ]);
      
      setPositions(positionsRes.data.positions || []);
      setDepartments(departmentsRes.data.departments || []);
    } catch (error: any) {
      console.error('❌ Error fetching data:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'فشل في تحميل البيانات';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const filteredPositions = positions.filter(position =>
    position.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (position.code && position.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (position.description && position.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const onSubmit = async (data: PositionFormData) => {
    try {
      setLoading(true);
      
      if (!data.title || data.title.trim() === '') {
        toast.error('عنوان المنصب مطلوب');
        setLoading(false);
        return;
      }

      const cleanedData = {
        ...data,
        title: data.title.trim(),
        description: data.description?.trim() || undefined,
        code: data.code?.trim() || undefined,
        minSalary: data.minSalary && !isNaN(data.minSalary) ? Number(data.minSalary) : undefined,
        maxSalary: data.maxSalary && !isNaN(data.maxSalary) ? Number(data.maxSalary) : undefined,
      };

      if (editingPosition) {
        // Update existing position
        const response = await api.put(`/hr/positions/${editingPosition.id}`, cleanedData);
        console.log('Position updated:', response.data);
        toast.success('تم تحديث المنصب بنجاح');
        setIsEditDialogOpen(false);
        setEditingPosition(null);
      } else {
        // Create new position
        const response = await api.post('/hr/positions', cleanedData);
        console.log('Position created:', response.data);
        toast.success('تم إنشاء المنصب بنجاح');
        setIsCreateDialogOpen(false);
      }

      reset();
      fetchData();
    } catch (error: any) {
      console.error('❌ Error saving position:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'فشل في حفظ المنصب';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (position: Position) => {
    setEditingPosition(position);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (position: Position) => {
    try {
      setLoading(true);
      await api.delete(`/hr/positions/${position.id}`);
      toast.success('تم حذف المنصب بنجاح');
      setDeleteDialogOpen(false);
      setPositionToDelete(null);
      fetchData();
    } catch (error: any) {
      console.error('❌ Error deleting position:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'فشل في حذف المنصب';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const openDeleteDialog = (position: Position) => {
    setPositionToDelete(position);
    setDeleteDialogOpen(true);
  };

  const getLevelBadge = (level: number) => {
    const colors = ['bg-blue-100 text-blue-800', 'bg-green-100 text-green-800', 'bg-purple-100 text-purple-800', 'bg-orange-100 text-orange-800'];
    const labels = ['مبتدئ', 'متوسط', 'خبير', 'إداري'];
    return {
      color: colors[Math.min(level - 1, colors.length - 1)],
      label: labels[Math.min(level - 1, labels.length - 1)]
    };
  };

  if (loading && positions.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/hr')}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Briefcase className="h-8 w-8 text-blue-500" />
              إدارة المناصب
            </h1>
            <p className="text-gray-500 mt-1">إضافة وتعديل وحذف المناصب الوظيفية</p>
          </div>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => reset()}>
              <Plus className="h-4 w-4 ml-2" />
              منصب جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>إنشاء منصب جديد</DialogTitle>
              <DialogDescription>
                أدخل بيانات المنصب الجديد
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>عنوان المنصب <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="مثال: مدير تسويق"
                    {...register('title', { required: 'عنوان المنصب مطلوب' })}
                  />
                  {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>كود المنصب</Label>
                  <Input
                    placeholder="مثال: MKT-MGR"
                    {...register('code')}
                  />
                </div>

                <div className="space-y-2">
                  <Label>المستوى</Label>
                  <Controller
                    name="level"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value.toString()}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر المستوى" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">مبتدئ</SelectItem>
                          <SelectItem value="2">متوسط</SelectItem>
                          <SelectItem value="3">خبير</SelectItem>
                          <SelectItem value="4">إداري</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label>القسم</Label>
                  <Controller
                    name="departmentId"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر القسم (اختياري)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">بدون قسم</SelectItem>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label>الحد الأدنى للراتب</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...register('minSalary', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>الحد الأعلى للراتب</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...register('maxSalary', { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>الوصف</Label>
                <Textarea
                  placeholder="وصف المنصب ومسؤولياته..."
                  className="min-h-[100px]"
                  {...register('description')}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'جاري الحفظ...' : 'حفظ المنصب'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="بحث في المناصب..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Positions List */}
      {filteredPositions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Briefcase className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'لا توجد نتائج للبحث' : 'لا توجد مناصب'}
            </p>
            {!searchTerm && (
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 ml-2" />
                إضافة منصب جديد
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPositions.map((position) => {
            const levelInfo = getLevelBadge(position.level);
            return (
              <Card key={position.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{position.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(position)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(position)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={levelInfo.color}>
                      {levelInfo.label}
                    </Badge>
                    {position.code && (
                      <Badge variant="outline">{position.code}</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {position.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {position.description}
                      </p>
                    )}
                    
                    {position.department && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Building className="h-4 w-4" />
                        <span>{position.department.name}</span>
                      </div>
                    )}

                    {(position.minSalary || position.maxSalary) && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <DollarSign className="h-4 w-4" />
                        <span>
                          {position.minSalary ? position.minSalary.toLocaleString() : '0'} - 
                          {position.maxSalary ? position.maxSalary.toLocaleString() : 'غير محدد'}
                        </span>
                      </div>
                    )}

                    {position._count && position._count.users > 0 && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Users className="h-4 w-4" />
                        <span>{position._count.users} موظف</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تعديل المنصب</DialogTitle>
            <DialogDescription>
              تعديل بيانات المنصب: {editingPosition?.title}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>عنوان المنصب <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="مثال: مدير تسويق"
                  {...register('title', { required: 'عنوان المنصب مطلوب' })}
                />
                {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>كود المنصب</Label>
                <Input
                  placeholder="مثال: MKT-MGR"
                  {...register('code')}
                />
              </div>

              <div className="space-y-2">
                <Label>المستوى</Label>
                <Controller
                  name="level"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value.toString()}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المستوى" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">مبتدئ</SelectItem>
                        <SelectItem value="2">متوسط</SelectItem>
                        <SelectItem value="3">خبير</SelectItem>
                        <SelectItem value="4">إداري</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label>القسم</Label>
                <Controller
                  name="departmentId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر القسم (اختياري)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">بدون قسم</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label>الحد الأدنى للراتب</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register('minSalary', { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-2">
                <Label>الحد الأعلى للراتب</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register('maxSalary', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea
                placeholder="وصف المنصب ومسؤولياته..."
                className="min-h-[100px]"
                {...register('description')}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsEditDialogOpen(false);
                setEditingPosition(null);
                reset();
              }}>
                إلغاء
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'جاري الحفظ...' : 'تحديث المنصب'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف المنصب "{positionToDelete?.title}"؟ هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => positionToDelete && handleDelete(positionToDelete)}
              className="bg-red-500 hover:bg-red-600"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PositionsManagement;
