import React, { useState, useEffect } from 'react';

import { TrendingUp, DollarSign, ArrowUp, ArrowDown } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Badge } from '@/components/ui/badge';

import { useParams } from 'react-router-dom';

import api from '@/services/api';

import { toast } from 'sonner';



interface SalaryHistory {

  id: string;

  userId?: string;

  previousSalary: number;

  newSalary: number;

  changeType: string;

  changePercentage?: number;

  effectiveDate: string;

  reason?: string;

  employee?: {

    id: string;

    firstName: string;

    lastName: string;

    employeeNumber?: string | null;

  } | null;

}



const SalaryHistory: React.FC = () => {

  const { employeeId } = useParams<{ employeeId: string }>();

  const [history, setHistory] = useState<SalaryHistory[]>([]);

  const [loading, setLoading] = useState(true);



  useEffect(() => {

    fetchHistory();

  }, [employeeId]);



  const fetchHistory = async () => {

    try {

      setLoading(true);

      if (employeeId) {

        const response = await api.get(`/hr/salary-history/employee/${employeeId}`);

        setHistory(response.data.history || []);

      } else {

        const response = await api.get('/hr/salary-history?limit=100&page=1');

        setHistory(response.data.history || []);

      }

    } catch (error) {

      console.error('Error fetching salary history:', error);

      toast.error('فشل في جلب سجل الرواتب');

    } finally {

      setLoading(false);

    }

  };



  const getChangeTypeLabel = (type: string) => {

    const typeMap: Record<string, string> = {

      promotion: 'ترقية',

      annual_increase: 'زيادة سنوية',

      adjustment: 'تعديل',

      demotion: 'إنزال'

    };

    return typeMap[type] || type;

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

      <div>

        <h1 className="text-3xl font-bold text-foreground">سجل تعديلات الرواتب</h1>

        <p className="text-muted-foreground mt-1">

          {employeeId ? 'تاريخ التغييرات في راتب الموظف' : 'تاريخ التغييرات في الرواتب داخل الشركة'}

        </p>

      </div>



      {history.length === 0 ? (

        <Card>

          <CardContent className="p-12 text-center">

            <TrendingUp className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />

            <p className="text-muted-foreground">لا يوجد سجل للرواتب</p>

          </CardContent>

        </Card>

      ) : (

        <div className="space-y-4">

          {history.map((item) => (

            <Card key={item.id}>

              <CardHeader>

                <div className="flex items-center justify-between">

                  <div className="flex items-center gap-3">

                    {item.changePercentage && item.changePercentage > 0 ? (

                      <ArrowUp className="h-6 w-6 text-green-500 dark:text-green-400" />

                    ) : item.changePercentage && item.changePercentage < 0 ? (

                      <ArrowDown className="h-6 w-6 text-red-500 dark:text-red-400" />

                    ) : (

                      <DollarSign className="h-6 w-6 text-muted-foreground" />

                    )}

                    <div>

                      <CardTitle className="text-lg">

                        {getChangeTypeLabel(item.changeType)}

                      </CardTitle>

                      {!employeeId && item.employee && (

                        <div className="text-sm text-muted-foreground mt-1">

                          {item.employee.firstName} {item.employee.lastName}

                          {item.employee.employeeNumber ? ` - ${item.employee.employeeNumber}` : ''}

                        </div>

                      )}

                      <div className="flex items-center gap-2 mt-1">

                        <Badge variant="secondary">

                          {new Date(item.effectiveDate).toLocaleDateString('ar-EG')}

                        </Badge>

                        {item.changePercentage && (

                          <Badge 

                            variant={item.changePercentage > 0 ? 'default' : 'destructive'}

                          >

                            {item.changePercentage > 0 ? '+' : ''}{typeof item.changePercentage === 'number' ? item.changePercentage.toFixed(1) : '0'}%

                          </Badge>

                        )}

                      </div>

                    </div>

                  </div>

                </div>

              </CardHeader>

              <CardContent>

                <div className="space-y-3">

                  <div className="grid grid-cols-2 gap-4">

                    <div>

                      <p className="text-sm text-muted-foreground">الراتب السابق</p>

                      <p className="text-lg font-bold text-foreground">{item.previousSalary.toLocaleString()} EGP</p>

                    </div>

                    <div>

                      <p className="text-sm text-muted-foreground">الراتب الجديد</p>

                      <p className="text-lg font-bold text-green-600 dark:text-green-400">

                        {item.newSalary.toLocaleString()} EGP

                      </p>

                    </div>

                  </div>

                  {item.reason && (

                    <div className="pt-3 border-t border-border">

                      <p className="text-sm text-foreground">

                        <span className="font-medium">السبب: </span>

                        {item.reason}

                      </p>

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



export default SalaryHistory;

























































































