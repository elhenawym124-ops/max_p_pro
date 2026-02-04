import React, { useState, useEffect } from 'react';
import { BarChart3, Plus, Star, Calendar, User, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate, useParams } from 'react-router-dom';
import api from '@/services/api';
import { toast } from 'sonner';

interface PerformanceReview {
  id: string;
  reviewPeriod: string;
  overallRating: number;
  status: string;
  periodStart: string;
  periodEnd: string;
  employee: {
    firstName: string;
    lastName: string;
    employeeNumber: string;
  };
  reviewer: {
    firstName: string;
    lastName: string;
  };
}

const PerformanceReviews: React.FC = () => {
  const { employeeId } = useParams<{ employeeId?: string }>();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, [employeeId]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const url = employeeId
        ? `/hr/performance-reviews/employee/${employeeId}`
        : '/hr/performance-reviews';
      const response = await api.get(url);
      setReviews(response.data.reviews || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('فشل في جلب التقييمات');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      DRAFT: { label: 'مسودة', variant: 'outline' },
      SUBMITTED: { label: 'مقدم', variant: 'secondary' },
      ACKNOWLEDGED: { label: 'معترف به', variant: 'default' },
      COMPLETED: { label: 'مكتمل', variant: 'default' }
    };
    const statusInfo = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-500';
    if (rating >= 3) return 'text-yellow-500';
    return 'text-red-500';
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
          <h1 className="text-3xl font-bold">تقييمات الأداء</h1>
          <p className="text-gray-500 mt-1">تتبع وتقييم أداء الموظفين</p>
        </div>
        <Button onClick={() => navigate('/hr/performance-reviews/new')}>
          <Plus className="h-4 w-4 ml-2" />
          تقييم جديد
        </Button>
      </div>

      {reviews.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 mb-4">لا توجد تقييمات</p>
            <Button onClick={() => navigate('/hr/performance-reviews/new')}>
              <Plus className="h-4 w-4 ml-2" />
              إنشاء أول تقييم
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="cursor-pointer"
              onClick={() => navigate(`/hr/performance-reviews/${review.id}`)}
            >
              <Card className="hover:shadow-lg transition-shadow h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{review.reviewPeriod}</CardTitle>
                    {getStatusBadge(review.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">
                        {review.employee.firstName} {review.employee.lastName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-500">
                        {new Date(review.periodStart).toLocaleDateString('ar-EG')} - {new Date(review.periodEnd).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <Star className={`h-5 w-5 ${getRatingColor(Number(review.overallRating))}`} />
                        <span className={`text-2xl font-bold ${getRatingColor(Number(review.overallRating))}`}>
                          {Number(review.overallRating).toFixed(1)}
                        </span>
                      </div>
                      <TrendingUp className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PerformanceReviews;












































