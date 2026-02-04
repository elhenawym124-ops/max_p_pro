import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import api from '@/services/api';
import { toast } from 'sonner';

interface Warning {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  incidentDate: string;
  actionTaken?: string;
  employeeResponse?: string;
  acknowledgedAt?: string;
  employee: {
    firstName: string;
    lastName: string;
  };
}

const EditWarning: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'WRITTEN',
    severity: 'moderate',
    incidentDate: '',
    actionTaken: '',
    employeeResponse: ''
  });

  useEffect(() => {
    if (id) {
      fetchWarning();
    }
  }, [id]);

  const fetchWarning = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/hr/warnings/${id}`);
      const warning = response.data.warning;
      
      setFormData({
        title: warning.title || '',
        description: warning.description || '',
        type: warning.type || 'WRITTEN',
        severity: warning.severity || 'moderate',
        incidentDate: warning.incidentDate ? new Date(warning.incidentDate).toISOString().split('T')[0] : '',
        actionTaken: warning.actionTaken || '',
        employeeResponse: warning.employeeResponse || ''
      });
    } catch (error: any) {
      console.error('Error fetching warning:', error);
      toast.error(error.response?.data?.error || 'فشل في جلب بيانات الإنذار');
      navigate('/hr/warnings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('الرجاء ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      setSaving(true);
      await api.put(`/hr/warnings/${id}`, formData);
      toast.success('تم تحديث الإنذار بنجاح');
      navigate(`/hr/warnings/${id}`);
    } catch (error: any) {
      console.error('Error updating warning:', error);
      toast.error(error.response?.data?.error || 'فشل في تحديث الإنذار');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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
          <Button variant="outline" onClick={() => navigate(`/hr/warnings/${id}`)}>
            <ArrowRight className="h-4 w-4 ml-2" />
            العودة
          </Button>
          <div>
            <h1 className="text-3xl font-bold">تعديل الإنذار</h1>
            <p className="text-gray-500 mt-1">تحديث معلومات الإنذار</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              معلومات الإنذار
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title">العنوان *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="incidentDate">تاريخ الحادث *</Label>
                <Input
                  id="incidentDate"
                  type="date"
                  value={formData.incidentDate}
                  onChange={(e) => setFormData({ ...formData, incidentDate: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">نوع الإنذار *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VERBAL">شفوي</SelectItem>
                    <SelectItem value="WRITTEN">كتابي</SelectItem>
                    <SelectItem value="FINAL">نهائي</SelectItem>
                    <SelectItem value="TERMINATION">إنهاء خدمة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="severity">الشدة *</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(value) => setFormData({ ...formData, severity: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minor">خفيف</SelectItem>
                    <SelectItem value="moderate">متوسط</SelectItem>
                    <SelectItem value="severe">شديد</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">الوصف *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={5}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="actionTaken">الإجراء المتخذ</Label>
              <Textarea
                id="actionTaken"
                value={formData.actionTaken}
                onChange={(e) => setFormData({ ...formData, actionTaken: e.target.value })}
                rows={4}
                placeholder="وصف الإجراء الذي تم اتخاذه..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employeeResponse">رد الموظف</Label>
              <Textarea
                id="employeeResponse"
                value={formData.employeeResponse}
                onChange={(e) => setFormData({ ...formData, employeeResponse: e.target.value })}
                rows={4}
                placeholder="رد الموظف على الإنذار..."
              />
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/hr/warnings/${id}`)}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 ml-2" />
                    حفظ التغييرات
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default EditWarning;
