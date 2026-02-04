import React, { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Calendar, User, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate, useParams } from 'react-router-dom';
import api from '@/services/api';
import { toast } from 'sonner';

interface Warning {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  incidentDate: string;
  acknowledgedAt?: string;
  employee: {
    firstName: string;
    lastName: string;
    employeeNumber: string;
  };
}

const Warnings: React.FC = () => {
  const { employeeId } = useParams<{ employeeId?: string }>();
  const navigate = useNavigate();
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWarnings();
  }, [employeeId]);

  const fetchWarnings = async () => {
    try {
      setLoading(true);
      const url = employeeId 
        ? `/hr/warnings/employee/${employeeId}`
        : '/hr/warnings';
      const response = await api.get(url);
      setWarnings(response.data.warnings || []);
    } catch (error) {
      console.error('Error fetching warnings:', error);
      toast.error('فشل في جلب الإنذارات');
    } finally {
      setLoading(false);
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

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">الإنذارات</h1>
          <p className="text-gray-500 mt-1">إدارة إنذارات الموظفين</p>
        </div>
        <Button onClick={() => navigate('/hr/warnings/new')}>
          <Plus className="h-4 w-4 ml-2" />
          إنذار جديد
        </Button>
      </div>

      {warnings.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 mb-4">لا توجد إنذارات</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {warnings.map((warning) => (
            <Card key={warning.id} className="border-l-4 border-l-orange-500 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/hr/warnings/${warning.id}`)}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-6 w-6 text-orange-500" />
                    <div>
                      <CardTitle className="text-lg">{warning.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
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
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/hr/warnings/${warning.id}/edit`);
                    }}
                  >
                    <FileText className="h-4 w-4 ml-2" />
                    تعديل
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-gray-500" />
                    <span>
                      {warning.employee.firstName} {warning.employee.lastName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>{new Date(warning.incidentDate).toLocaleDateString('ar-EG')}</span>
                  </div>
                  <div className="pt-3 border-t">
                    <p className="text-sm text-gray-700 line-clamp-2">{warning.description}</p>
                  </div>
                  {warning.acknowledgedAt && (
                    <div className="pt-2 text-xs text-gray-500">
                      تم الاعتراف: {new Date(warning.acknowledgedAt).toLocaleDateString('ar-EG')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Warnings;












































