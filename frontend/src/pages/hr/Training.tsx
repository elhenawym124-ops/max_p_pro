import React, { useState, useEffect } from 'react';
import { GraduationCap, Plus, Calendar, DollarSign, Award, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate, useParams } from 'react-router-dom';
import api from '@/services/api';
import { toast } from 'sonner';

interface Training {
  id: string;
  trainingName: string;
  provider?: string;
  type: string;
  startDate: string;
  endDate?: string;
  status: string;
  cost?: number;
  duration?: number;
  score?: number;
}

const Training: React.FC = () => {
  const { employeeId } = useParams<{ employeeId?: string }>();
  const navigate = useNavigate();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrainings();
  }, [employeeId]);

  const fetchTrainings = async () => {
    try {
      setLoading(true);
      const url = employeeId 
        ? `/hr/trainings/employee/${employeeId}`
        : '/hr/trainings';
      const response = await api.get(url);
      setTrainings(response.data.trainings || []);
    } catch (error) {
      console.error('Error fetching trainings:', error);
      toast.error('فشل في جلب سجلات التدريب');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      PLANNED: { label: 'مخطط', variant: 'outline' },
      IN_PROGRESS: { label: 'قيد التنفيذ', variant: 'secondary' },
      COMPLETED: { label: 'مكتمل', variant: 'default' },
      CANCELLED: { label: 'ملغي', variant: 'destructive' }
    };
    const statusInfo = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
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
          <h1 className="text-3xl font-bold">التدريب والتطوير</h1>
          <p className="text-gray-500 mt-1">إدارة برامج التدريب للموظفين</p>
        </div>
        <Button onClick={() => navigate('/hr/training/new')}>
          <Plus className="h-4 w-4 ml-2" />
          برنامج تدريب جديد
        </Button>
      </div>

      {trainings.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <GraduationCap className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 mb-4">لا توجد برامج تدريب</p>
            <Button onClick={() => navigate('/hr/training/new')}>
              <Plus className="h-4 w-4 ml-2" />
              إضافة برنامج تدريب
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trainings.map((training) => (
            <Card 
              key={training.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/hr/training/${training.id}`)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <GraduationCap className="h-8 w-8 text-blue-500" />
                  {getStatusBadge(training.status)}
                </div>
                <CardTitle className="text-lg mt-2">{training.trainingName}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {training.provider && (
                    <div className="text-sm text-gray-500">
                      مقدم التدريب: {training.provider}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>{new Date(training.startDate).toLocaleDateString('ar-EG')}</span>
                    {training.endDate && (
                      <>
                        <span>-</span>
                        <span>{new Date(training.endDate).toLocaleDateString('ar-EG')}</span>
                      </>
                    )}
                  </div>
                  {training.duration && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span>{training.duration} ساعة</span>
                    </div>
                  )}
                  {training.cost && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <span>{training.cost.toLocaleString()} EGP</span>
                    </div>
                  )}
                  {training.score && (
                    <div className="flex items-center gap-2 text-sm">
                      <Award className="h-4 w-4 text-yellow-500" />
                      <span>الدرجة: {training.score}</span>
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

export default Training;












































