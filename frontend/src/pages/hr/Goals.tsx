import React, { useState, useEffect } from 'react';
import { Target, Plus, TrendingUp, User, Building2, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { toast } from 'sonner';

interface Goal {
  id: string;
  title: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  progress: number;
  status: string;
  startDate: string;
  endDate: string;
  employee?: {
    firstName: string;
    lastName: string;
  };
  department?: {
    name: string;
  };
}

const Goals: React.FC = () => {
  const navigate = useNavigate();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const response = await api.get('/hr/goals');
      setGoals(response.data.goals || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
      toast.error('فشل في جلب الأهداف');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      PENDING: { label: 'معلق', variant: 'outline' },
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
          <h1 className="text-3xl font-bold">الأهداف</h1>
          <p className="text-gray-500 mt-1">إدارة أهداف الموظفين والأقسام</p>
        </div>
        <Button onClick={() => navigate('/hr/goals/new')}>
          <Plus className="h-4 w-4 ml-2" />
          هدف جديد
        </Button>
      </div>

      {goals.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Target className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 mb-4">لا توجد أهداف</p>
            <Button onClick={() => navigate('/hr/goals/new')}>
              <Plus className="h-4 w-4 ml-2" />
              إضافة هدف
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => (
            <Card 
              key={goal.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/hr/goals/${goal.id}`)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Target className="h-8 w-8 text-green-500" />
                  {getStatusBadge(goal.status)}
                </div>
                <CardTitle className="text-lg mt-2">{goal.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {goal.description && (
                    <p className="text-sm text-gray-600">{goal.description}</p>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">التقدم:</span>
                      <span className="font-bold">{goal.progress.toFixed(0)}%</span>
                    </div>
                    <Progress value={goal.progress} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{goal.currentValue.toLocaleString()}</span>
                      <span>/</span>
                      <span>{goal.targetValue.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm pt-2 border-t">
                    {goal.employee ? (
                      <>
                        <User className="h-4 w-4 text-gray-500" />
                        <span>{goal.employee.firstName} {goal.employee.lastName}</span>
                      </>
                    ) : goal.department ? (
                      <>
                        <Building2 className="h-4 w-4 text-gray-500" />
                        <span>{goal.department.name}</span>
                      </>
                    ) : (
                      <span className="text-gray-500">هدف عام</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {new Date(goal.startDate).toLocaleDateString('ar-EG')} - {new Date(goal.endDate).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Goals;












































