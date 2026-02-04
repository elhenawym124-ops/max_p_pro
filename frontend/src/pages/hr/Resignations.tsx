import React, { useState, useEffect } from 'react';
import { FileText, Plus, Calendar, CheckCircle, XCircle, Calculator } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { toast } from 'sonner';
import SettlementDetailsModal from './SettlementDetailsModal';

interface Resignation {
  id: string;
  resignationDate: string;
  lastWorkingDay: string;
  reason?: string;
  status: string;
  employee: {
    firstName: string;
    lastName: string;
    employeeNumber: string;
    position?: { title: string };
    department?: { name: string };
  };
}

const Resignations: React.FC = () => {
  const navigate = useNavigate();
  const [resignations, setResignations] = useState<Resignation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResignationId, setSelectedResignationId] = useState<string | null>(null);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);

  useEffect(() => {
    fetchResignations();
  }, []);

  const fetchResignations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/hr/resignations');
      setResignations(response.data.resignations || []);
    } catch (error) {
      console.error('Error fetching resignations:', error);
      toast.error('فشل في جلب الاستقالات');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSettlement = (id: string) => {
    setSelectedResignationId(id);
    setIsSettlementModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      PENDING: { label: 'معلق', variant: 'outline' },
      APPROVED: { label: 'موافق عليه', variant: 'default' },
      REJECTED: { label: 'مرفوض', variant: 'destructive' },
      COMPLETED: { label: 'مكتمل', variant: 'default' }
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
          <h1 className="text-3xl font-bold">الاستقالات</h1>
          <p className="text-gray-500 mt-1">إدارة طلبات الاستقالة</p>
        </div>
        <Button onClick={() => navigate('/hr/resignations/new')}>
          <Plus className="h-4 w-4 ml-2" />
          استقالة جديدة
        </Button>
      </div>

      {resignations.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 mb-4">لا توجد استقالات</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {resignations.map((resignation) => (
            <Card key={resignation.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-orange-500" />
                    <div>
                      <CardTitle className="text-lg">
                        {resignation.employee.firstName} {resignation.employee.lastName}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        {resignation.employee.position && (
                          <Badge variant="outline">{resignation.employee.position.title}</Badge>
                        )}
                        {resignation.employee.department && (
                          <Badge variant="outline">{resignation.employee.department.name}</Badge>
                        )}
                        {getStatusBadge(resignation.status)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <span className="text-gray-500">تاريخ الاستقالة:</span>
                        <span className="mr-2 font-medium">
                          {new Date(resignation.resignationDate).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <span className="text-gray-500">آخر يوم عمل:</span>
                        <span className="mr-2 font-medium">
                          {new Date(resignation.lastWorkingDay).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                    </div>
                  </div>
                  {resignation.reason && (
                    <div className="pt-3 border-t">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">السبب: </span>
                        {resignation.reason}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2 pt-3">
                    {resignation.status === 'PENDING' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => navigate(`/hr/resignations/${resignation.id}/approve`)}
                          className="flex-1"
                        >
                          <CheckCircle className="h-4 w-4 ml-2" />
                          موافقة
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => navigate(`/hr/resignations/${resignation.id}/reject`)}
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 ml-2" />
                          رفض
                        </Button>
                      </>
                    )}
                    {resignation.status === 'APPROVED' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenSettlement(resignation.id)}
                        className="flex-1"
                      >
                        <Calculator className="h-4 w-4 ml-2" />
                        حساب التصفية النهائية
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedResignationId && (
        <SettlementDetailsModal
          isOpen={isSettlementModalOpen}
          onClose={() => setIsSettlementModalOpen(false)}
          resignationId={selectedResignationId}
          onSuccess={fetchResignations}
        />
      )}
    </div>
  );
};

export default Resignations;
