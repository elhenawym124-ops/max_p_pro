import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, Calendar, User, FileText, ArrowRight, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    position?: { title: string };
    department?: { name: string };
  };
}

const WarningDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [warning, setWarning] = useState<Warning | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchWarning();
    }
  }, [id]);

  const fetchWarning = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/hr/warnings/${id}`);
      setWarning(response.data.warning);
    } catch (error: any) {
      console.error('Error fetching warning:', error);
      toast.error(error.response?.data?.error || 'فشل في جلب تفاصيل الإنذار');
      navigate('/hr/warnings');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الإنذار؟')) {
      return;
    }

    try {
      await api.delete(`/hr/warnings/${id}`);
      toast.success('تم حذف الإنذار بنجاح');
      navigate('/hr/warnings');
    } catch (error: any) {
      console.error('Error deleting warning:', error);
      toast.error(error.response?.data?.error || 'فشل في حذف الإنذار');
    }
  };

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      VERBAL: 'شفوي',
      WRITTEN: 'كتابي',
      FINAL: 'نهائي',
      TERMINATION: 'إنهاء خدمة'
    };
    return typeMap[type] || type;
  };

  const getSeverityColor = (severity: string) => {
    const colorMap: Record<string, string> = {
      minor: 'bg-yellow-100 text-yellow-800',
      moderate: 'bg-orange-100 text-orange-800',
      severe: 'bg-red-100 text-red-800'
    };
    return colorMap[severity] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!warning) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 mb-4">الإنذار غير موجود</p>
            <Button onClick={() => navigate('/hr/warnings')}>
              العودة للإنذارات
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/hr/warnings')}>
            <ArrowRight className="h-4 w-4 ml-2" />
            العودة
          </Button>
          <div>
            <h1 className="text-3xl font-bold">تفاصيل الإنذار</h1>
            <p className="text-gray-500 mt-1">معلومات تفصيلية عن الإنذار</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate(`/hr/warnings/${id}/edit`)}>
            <Edit className="h-4 w-4 ml-2" />
            تعديل
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 ml-2" />
            حذف
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-orange-500" />
                <div className="flex-1">
                  <CardTitle className="text-2xl">{warning.title}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge>{getTypeLabel(warning.type)}</Badge>
                    <Badge className={getSeverityColor(warning.severity)}>
                      {warning.severity}
                    </Badge>
                    {warning.acknowledgedAt && (
                      <Badge variant="default">معترف به</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">الوصف</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{warning.description}</p>
              </div>

              {warning.actionTaken && (
                <div>
                  <h3 className="font-semibold mb-2">الإجراء المتخذ</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{warning.actionTaken}</p>
                </div>
              )}

              {warning.employeeResponse && (
                <div>
                  <h3 className="font-semibold mb-2">رد الموظف</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{warning.employeeResponse}</p>
                </div>
              )}

              {warning.attachments && warning.attachments.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">المرفقات</h3>
                  <div className="space-y-2">
                    {warning.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{attachment}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>معلومات الإنذار</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">تاريخ الحادث</p>
                  <p className="font-medium">
                    {new Date(warning.incidentDate).toLocaleDateString('ar-EG', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {warning.acknowledgedAt && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">تاريخ الاعتراف</p>
                    <p className="font-medium">
                      {new Date(warning.acknowledgedAt).toLocaleDateString('ar-EG', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">تاريخ الإنشاء</p>
                  <p className="font-medium">
                    {new Date(warning.createdAt).toLocaleDateString('ar-EG')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">آخر تحديث</p>
                  <p className="font-medium">
                    {new Date(warning.updatedAt).toLocaleDateString('ar-EG')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>معلومات الموظف</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">الاسم</p>
                  <p className="font-medium">
                    {warning.employee.firstName} {warning.employee.lastName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">رقم الموظف</p>
                  <p className="font-medium">{warning.employee.employeeNumber}</p>
                </div>
              </div>

              {warning.employee.position && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">المنصب</p>
                    <p className="font-medium">{warning.employee.position.title}</p>
                  </div>
                </div>
              )}

              {warning.employee.department && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">القسم</p>
                    <p className="font-medium">{warning.employee.department.name}</p>
                  </div>
                </div>
              )}

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate(`/hr/employees/${warning.employee.id}`)}
              >
                عرض ملف الموظف
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default WarningDetails;
