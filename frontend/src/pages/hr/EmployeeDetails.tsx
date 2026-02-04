import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User, Mail, Phone, MapPin, Calendar, Briefcase, Building2,
  DollarSign, Clock, FileText, Award, AlertTriangle, GraduationCap,
  Edit, ArrowRight, UserCircle, CreditCard, Heart, ShieldHalf
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import api from '@/services/api';
import { toast } from 'sonner';

interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  mobile: string;
  avatar: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  nationalId: string;
  address: string;
  city: string;
  country: string;
  hireDate: string;
  probationEndDate: string;
  contractType: string;
  contractEndDate: string;
  status: string;
  baseSalary: number;
  annualLeaveBalance: number;
  sickLeaveBalance: number;
  bankName: string;
  bankAccountNumber: string;
  bankIban: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  enableAutoDeduction: boolean;
  monthlyGraceMinutes: number;
  maxDailyLateMinutes: number;
  lateDeductionRate: number;
  department: { id: string; name: string; color: string } | null;
  position: { id: string; title: string; level: number } | null;
  manager: { id: string; firstName: string; lastName: string; avatar: string } | null;
  subordinates: any[];
  employeeDocuments: any[];
  leaveRequests: any[];
  attendance: any[];
}

const statusLabels: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'نشط', color: 'bg-green-100 text-green-800' },
  ON_LEAVE: { label: 'في إجازة', color: 'bg-yellow-100 text-yellow-800' },
  SUSPENDED: { label: 'موقوف', color: 'bg-red-100 text-red-800' },
  TERMINATED: { label: 'منتهي', color: 'bg-gray-100 text-gray-800' },
  RESIGNED: { label: 'مستقيل', color: 'bg-orange-100 text-orange-800' },
};

const contractLabels: Record<string, string> = {
  FULL_TIME: 'دوام كامل',
  PART_TIME: 'دوام جزئي',
  CONTRACT: 'عقد',
  TEMPORARY: 'مؤقت',
  INTERNSHIP: 'تدريب',
  FREELANCE: 'حر',
};

const genderLabels: Record<string, string> = {
  MALE: 'ذكر',
  FEMALE: 'أنثى',
};

const maritalLabels: Record<string, string> = {
  SINGLE: 'أعزب',
  MARRIED: 'متزوج',
  DIVORCED: 'مطلق',
  WIDOWED: 'أرمل',
};

const EmployeeDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (id) {
      fetchEmployee();
    }
  }, [id]);

  const fetchEmployee = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/hr/employees/${id}`);
      setEmployee(response.data.employee);
    } catch (error) {
      console.error('Error fetching employee:', error);
      toast.error('حدث خطأ أثناء جلب بيانات الموظف');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const calculateTenure = (hireDate: string) => {
    const today = new Date();
    const hire = new Date(hireDate);
    const years = today.getFullYear() - hire.getFullYear();
    const months = today.getMonth() - hire.getMonth();

    if (years > 0) {
      return `${years} سنة${months > 0 ? ` و ${months} شهر` : ''}`;
    }
    return `${months} شهر`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-500">
        <User className="h-16 w-16 mb-4 opacity-50" />
        <p className="text-xl">الموظف غير موجود</p>
        <Button variant="link" onClick={() => navigate('/hr/employees')}>
          العودة لقائمة الموظفين
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/hr/employees')}>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            ملف الموظف
          </h1>
        </div>
        <Button variant="outline" onClick={() => navigate(`/hr/employees/${id}/edit`)}>
          <Edit className="h-4 w-4 ml-2" />
          تعديل
        </Button>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar & Basic Info */}
            <div className="flex flex-col items-center md:items-start gap-4">
              <Avatar className="h-32 w-32">
                <AvatarImage src={employee.avatar} />
                <AvatarFallback className="text-3xl">
                  {employee.firstName?.[0]}{employee.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="text-center md:text-right">
                <h2 className="text-2xl font-bold">
                  {employee.firstName} {employee.lastName}
                </h2>
                <p className="text-gray-500">{employee.employeeNumber}</p>
                <Badge className={`mt-2 ${statusLabels[employee.status]?.color || ''}`}>
                  {statusLabels[employee.status]?.label || employee.status}
                </Badge>
              </div>
            </div>

            {/* Quick Info */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">القسم:</span>
                  <span className="font-medium">{employee.department?.name || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">المنصب:</span>
                  <span className="font-medium">{employee.position?.title || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">تاريخ التعيين:</span>
                  <span className="font-medium">
                    {new Date(employee.hireDate).toLocaleDateString('ar-EG')}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">البريد:</span>
                  <span className="font-medium">{employee.email || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">الهاتف:</span>
                  <span className="font-medium">{employee.phone || employee.mobile || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserCircle className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">المدير:</span>
                  <span className="font-medium">
                    {employee.manager
                      ? `${employee.manager.firstName} ${employee.manager.lastName}`
                      : '-'
                    }
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">مدة الخدمة:</span>
                  <span className="font-medium">{calculateTenure(employee.hireDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">نوع العقد:</span>
                  <span className="font-medium">
                    {contractLabels[employee.contractType] || employee.contractType}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">الراتب:</span>
                  <span className="font-medium">{formatCurrency(employee.baseSalary)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-7 w-full max-w-3xl">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="personal">البيانات الشخصية</TabsTrigger>
          <TabsTrigger value="attendance">الحضور</TabsTrigger>
          <TabsTrigger value="leaves">الإجازات</TabsTrigger>
          <TabsTrigger value="documents">المستندات</TabsTrigger>
          <TabsTrigger value="salary">سجل الرواتب</TabsTrigger>
          <TabsTrigger value="performance">الأداء</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Leave Balance */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  رصيد الإجازات السنوية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {employee.annualLeaveBalance} يوم
                </div>
                <Progress value={(employee.annualLeaveBalance / 21) * 100} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  رصيد الإجازات المرضية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {employee.sickLeaveBalance} يوم
                </div>
                <Progress value={(employee.sickLeaveBalance / 15) * 100} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  أيام الحضور (هذا الشهر)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {employee.attendance?.filter((a: any) => a.status === 'PRESENT' || a.status === 'LATE').length || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  المرؤوسين
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  {employee.subordinates?.length || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Attendance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  آخر سجلات الحضور
                </CardTitle>
              </CardHeader>
              <CardContent>
                {employee.attendance?.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">لا توجد سجلات</p>
                ) : (
                  <div className="space-y-3">
                    {employee.attendance?.slice(0, 5).map((att: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <span className="text-sm">
                          {new Date(att.date).toLocaleDateString('ar-EG')}
                        </span>
                        <div className="flex items-center gap-2">
                          {att.checkIn && (
                            <span className="text-sm text-green-600">
                              {new Date(att.checkIn).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {att.checkOut && (
                            <>
                              <span className="text-gray-400">-</span>
                              <span className="text-sm text-blue-600">
                                {new Date(att.checkOut).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Leave Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  آخر طلبات الإجازات
                </CardTitle>
              </CardHeader>
              <CardContent>
                {employee.leaveRequests?.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">لا توجد طلبات</p>
                ) : (
                  <div className="space-y-3">
                    {employee.leaveRequests?.slice(0, 5).map((leave: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div>
                          <span className="text-sm font-medium">{leave.type}</span>
                          <span className="text-sm text-gray-500 mr-2">
                            ({leave.totalDays} يوم)
                          </span>
                        </div>
                        <Badge variant={leave.status === 'APPROVED' ? 'default' : 'secondary'}>
                          {leave.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Subordinates */}
          {employee.subordinates && employee.subordinates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  المرؤوسين
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {employee.subordinates.map((sub: any) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                      onClick={() => navigate(`/hr/employees/${sub.id}`)}
                    >
                      <Avatar>
                        <AvatarImage src={sub.avatar} />
                        <AvatarFallback>
                          {sub.firstName?.[0]}{sub.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{sub.firstName} {sub.lastName}</p>
                        <p className="text-xs text-gray-500">{sub.position?.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Deduction Settings Card */}
          <Card className="border-orange-100 bg-orange-50/20 dark:bg-orange-950/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl flex items-center gap-2 text-orange-700 dark:text-orange-400">
                <ShieldHalf className="h-5 w-5" />
                سياسة الخصم والتأخير للموظف
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <p className="text-sm text-gray-500 font-medium">حالة الخصم التلقائي</p>
                  {employee.enableAutoDeduction !== false ? (
                    <Badge className="bg-green-100 text-green-800 border-green-200">مفعل</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-800 border-red-200">مستثنى (Whitelisted)</Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500 font-medium">رصيد المرونة الشهري</p>
                  <p className="font-bold text-lg">{employee.monthlyGraceMinutes ?? 60} دقيقة</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500 font-medium">حد التأخير اليومي</p>
                  <p className="font-bold text-lg">{employee.maxDailyLateMinutes ?? 10} دقائق</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500 font-medium">معدل الخصم للدقيقة</p>
                  <p className="font-bold text-lg">
                    {employee.lateDeductionRate ? `${employee.lateDeductionRate} جنيه` : 'حساب تلقائي'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Personal Tab */}
        <TabsContent value="personal" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  المعلومات الشخصية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">تاريخ الميلاد</p>
                    <p className="font-medium">
                      {employee.dateOfBirth
                        ? `${new Date(employee.dateOfBirth).toLocaleDateString('ar-EG')} (${calculateAge(employee.dateOfBirth)} سنة)`
                        : '-'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">الجنس</p>
                    <p className="font-medium">{genderLabels[employee.gender] || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">الحالة الاجتماعية</p>
                    <p className="font-medium">{maritalLabels[employee.maritalStatus] || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">رقم الهوية</p>
                    <p className="font-medium">{employee.nationalId || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  معلومات الاتصال
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">البريد الإلكتروني</p>
                    <p className="font-medium">{employee.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">الهاتف</p>
                    <p className="font-medium">{employee.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">الجوال</p>
                    <p className="font-medium">{employee.mobile || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  العنوان
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">العنوان</p>
                    <p className="font-medium">{employee.address || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">المدينة</p>
                    <p className="font-medium">{employee.city || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">الدولة</p>
                    <p className="font-medium">{employee.country || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  جهة اتصال الطوارئ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">الاسم</p>
                    <p className="font-medium">{employee.emergencyContactName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">الهاتف</p>
                    <p className="font-medium">{employee.emergencyContactPhone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">صلة القرابة</p>
                    <p className="font-medium">{employee.emergencyContactRelation || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bank Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  المعلومات البنكية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">اسم البنك</p>
                    <p className="font-medium">{employee.bankName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">رقم الحساب</p>
                    <p className="font-medium">{employee.bankAccountNumber || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">IBAN</p>
                    <p className="font-medium">{employee.bankIban || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>سجل الحضور</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-center py-8">
                سيتم عرض سجل الحضور التفصيلي هنا
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leaves Tab */}
        <TabsContent value="leaves">
          <Card>
            <CardHeader>
              <CardTitle>سجل الإجازات</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-center py-8">
                سيتم عرض سجل الإجازات التفصيلي هنا
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>المستندات</CardTitle>
                <Button onClick={() => navigate(`/hr/documents/${employee.id}`)}>
                  <FileText className="h-4 w-4 ml-2" />
                  إدارة المستندات
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {employee.employeeDocuments?.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">لا توجد مستندات</p>
                  <Button onClick={() => navigate(`/hr/documents/${employee.id}`)}>
                    <FileText className="h-4 w-4 ml-2" />
                    إضافة مستند
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {employee.employeeDocuments?.map((doc: any) => (
                    <div key={doc.id} className="flex items-center gap-3 p-4 border rounded-lg">
                      <FileText className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="font-medium">{doc.title}</p>
                        <p className="text-sm text-gray-500">{doc.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Salary History Tab */}
        <TabsContent value="salary">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>سجل الرواتب</CardTitle>
                <Button onClick={() => navigate(`/hr/salary-history/${employee.id}`)}>
                  <DollarSign className="h-4 w-4 ml-2" />
                  عرض السجل الكامل
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">عرض سجل التغييرات في الراتب</p>
                <Button onClick={() => navigate(`/hr/salary-history/${employee.id}`)}>
                  <DollarSign className="h-4 w-4 ml-2" />
                  عرض سجل الرواتب
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>تقييمات الأداء</CardTitle>
                <Button onClick={() => navigate(`/hr/performance-reviews?employeeId=${employee.id}`)}>
                  <Award className="h-4 w-4 ml-2" />
                  عرض جميع التقييمات
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">عرض تقييمات الأداء للموظف</p>
                <Button onClick={() => navigate(`/hr/performance-reviews?employeeId=${employee.id}`)}>
                  <Award className="h-4 w-4 ml-2" />
                  عرض التقييمات
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeDetails;
