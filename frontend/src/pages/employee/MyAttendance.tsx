/**
 * 📍 My Attendance - Employee Self-Service
 * صفحة تسجيل الحضور والانصراف للموظف
 */

import React, { useState, useEffect } from 'react';
import {
  Clock, LogIn, LogOut, Calendar, TrendingUp, AlertCircle,
  CheckCircle, XCircle, Timer, MapPin, Fingerprint, Home
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuthSimple';

interface TodayAttendance {
  id?: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  checkInLocation: string | null;
  checkOutLocation: string | null;
  status: string;
  workHours: number | null;
  lateMinutes: number | null;
  earlyLeaveMinutes: number | null;
}

interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  totalWorkHours: number;
  totalOvertimeHours: number;
  attendanceRate: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  PRESENT: { label: 'حاضر', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  ABSENT: { label: 'غائب', color: 'bg-red-100 text-red-800', icon: XCircle },
  LATE: { label: 'متأخر', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  ON_LEAVE: { label: 'إجازة', color: 'bg-purple-100 text-purple-800', icon: Calendar },
};

const MyAttendance: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance | null>(null);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<TodayAttendance[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showBiometricDialog, setShowBiometricDialog] = useState(false);
  const [biometricMethod, setBiometricMethod] = useState<'fingerprint' | 'face'>('fingerprint');
  const [isProcessingBiometric, setIsProcessingBiometric] = useState(false);
  const [duration, setDuration] = useState<string>('00:00:00');
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number, longitude: number, type: string } | null>(null);

  const setErrorKey = (key: string, message: string) => {
    setErrors(prev => ({ ...prev, [key]: message }));
  };

  const clearErrorKey = (key: string) => {
    setErrors(prev => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    return true;
  };

  useEffect(() => {
    if (todayAttendance?.checkIn && !todayAttendance.checkOut) {
      const startTime = new Date(todayAttendance.checkIn).getTime();

      const interval = setInterval(() => {
        const now = new Date().getTime();
        const diff = now - startTime;

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setDuration(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [todayAttendance]);

  useEffect(() => {
    fetchTodayAttendance();
    fetchStats();
    fetchRecentAttendance();

    // Update clock every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchTodayAttendance = async () => {
    try {
      setLoading(true);
      const response = await api.get('/hr/attendance/my-today');
      setTodayAttendance(response.data.attendance);
      clearErrorKey('today');
    } catch (error: any) {
      console.error('Error fetching today attendance:', error);
      const errorMessage = error.response?.data?.error || 'تعذر تحميل بيانات حضور اليوم. يرجى المحاولة مرة أخرى.';
      setErrorKey('today', errorMessage);
      toast.error(errorMessage, {
        description: 'تأكد من اتصالك بالإنترنت وحاول مرة أخرى',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/hr/attendance/my-stats');
      setStats(response.data.stats);
      clearErrorKey('stats');
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      const errorMessage = error.response?.data?.error || 'تعذر تحميل إحصائيات الحضور.';
      setErrorKey('stats', errorMessage);
      toast.error(errorMessage, {
        description: 'سيتم إعادة المحاولة تلقائياً',
        duration: 4000
      });
    }
  };

  const fetchRecentAttendance = async () => {
    try {
      const response = await api.get('/hr/attendance/my-recent?limit=10');
      setRecentAttendance(response.data.attendance);
      clearErrorKey('recent');
    } catch (error: any) {
      console.error('Error fetching recent attendance:', error);
      const errorMessage = error.response?.data?.error || 'تعذر تحميل سجل الحضور الأخير.';
      setErrorKey('recent', errorMessage);
      toast.error(errorMessage, {
        description: 'يمكنك تحديث الصفحة لإعادة المحاولة',
        duration: 4000
      });
    }
  };

  // دالة لفتح الموقع في الخريطة
  const openLocationInMap = (latitude: number, longitude: number, type: string) => {
    setSelectedLocation({ latitude, longitude, type });
    setShowMapModal(true);
  };

  // دالة لعرض بيانات الموقع
  const renderLocationInfo = (checkInLocation: string | null, checkOutLocation: string | null) => {
    const parseLocation = (locationStr: string | null) => {
      if (!locationStr) return null;
      try {
        const location = JSON.parse(locationStr);
        return location;
      } catch {
        return null;
      }
    };

    const checkInLoc = parseLocation(checkInLocation);
    const checkOutLoc = parseLocation(checkOutLocation);

    if (!checkInLoc && !checkOutLoc) {
      return <span className="text-gray-400">-</span>;
    }

    return (
      <div className="space-y-1 text-xs">
        {checkInLoc && (
          <div
            className="flex items-center gap-1 text-green-600 hover:text-green-800 cursor-pointer hover:bg-green-50 p-1 rounded transition-colors"
            onClick={() => openLocationInMap(checkInLoc.latitude, checkInLoc.longitude, 'حضور')}
            title="اضغط لفتح الموقع في الخريطة"
          >
            <MapPin className="h-3 w-3" />
            <span className="underline">حضور: {checkInLoc.latitude?.toFixed(4)}, {checkInLoc.longitude?.toFixed(4)}</span>
          </div>
        )}
        {checkOutLoc && (
          <div
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 cursor-pointer hover:bg-blue-50 p-1 rounded transition-colors"
            onClick={() => openLocationInMap(checkOutLoc.latitude, checkOutLoc.longitude, 'انصراف')}
            title="اضغط لفتح الموقع في الخريطة"
          >
            <MapPin className="h-3 w-3" />
            <span className="underline">انصراف: {checkOutLoc.latitude?.toFixed(4)}, {checkOutLoc.longitude?.toFixed(4)}</span>
          </div>
        )}
      </div>
    );
  };

  const handleCheckIn = async () => {
    try {
      setCheckingIn(true);

      // Get location if available
      let location = null;
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
        } catch (error) {
          console.log('Location not available');
        }
      }

      await api.post('/hr/attendance/check-in', {
        method: 'self_service',
        location: location ? JSON.stringify(location) : null
      });

      toast.success('تم تسجيل الحضور بنجاح! 🎉');
      fetchTodayAttendance();
      fetchStats();
    } catch (error: any) {
      // Handle geofencing errors with detailed messages
      if (error.response?.status === 403 && error.response?.data?.geofenceData) {
        const { distance, allowedRadius } = error.response.data.geofenceData;
        const distanceToMove = Math.round(distance - allowedRadius);

        // Show toast with detailed message
        toast.error(
          `⛔ أنت خارج نطاق البصمة المسموح!\n\n` +
          `📍 المسافة الحالية: ${Math.round(distance)} متر\n` +
          `✅ المسافة المسموحة: ${allowedRadius} متر\n` +
          `🚶 يجب الاقتراب: ${distanceToMove} متر من المكتب`,
          {
            duration: 8000,
          }
        );
        return; // Don't show additional error messages
      } else if (error.response?.status === 400) {
        toast.error('❌ خطأ في البيانات', {
          description: error.response?.data?.error || 'يرجى التحقق من البيانات المدخلة',
          duration: 5000
        });
      } else if (error.response?.status === 401) {
        toast.error('🔒 انتهت صلاحية الجلسة', {
          description: 'يرجى تسجيل الدخول مرة أخرى',
          duration: 5000
        });
      } else if (!navigator.onLine) {
        toast.error('📡 لا يوجد اتصال بالإنترنت', {
          description: 'تحقق من اتصالك بالإنترنت وحاول مرة أخرى',
          duration: 5000
        });
      } else {
        toast.error('❌ فشل تسجيل الحضور', {
          description: error.response?.data?.error || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى',
          duration: 5000
        });
      }
    } finally {
      setCheckingIn(false);
    }
  };

  const handleBiometricCheckIn = async () => {
    try {
      setIsProcessingBiometric(true);

      // Get location if available
      let location = null;
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
        } catch (error) {
          console.log('Location not available');
        }
      }

      // Simulate biometric verification
      await new Promise(resolve => setTimeout(resolve, 2000));

      await api.post('/hr/attendance/check-in', {
        method: 'biometric_remote',
        biometricType: biometricMethod,
        location: location ? JSON.stringify(location) : null,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          timestamp: new Date().toISOString()
        }
      });

      toast.success(`تم تسجيل الحضور بالبصمة من المنزل بنجاح! 🏠`);
      setShowBiometricDialog(false);
      fetchTodayAttendance();
      fetchStats();
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error('⛔ غير مصرح بالبصمة من المنزل', {
          description: error.response?.data?.error || 'يرجى التواصل مع إدارة الموارد البشرية',
          duration: 6000
        });
      } else {
        toast.error('❌ فشل تسجيل الحضور بالبصمة', {
          description: error.response?.data?.error || 'حدث خطأ أثناء التحقق من البصمة',
          duration: 5000
        });
      }
    } finally {
      setIsProcessingBiometric(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setCheckingOut(true);

      // Get location if available
      let location = null;
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
        } catch (error) {
          console.log('Location not available');
        }
      }

      await api.post('/hr/attendance/check-out', {
        method: 'self_service',
        location: location ? JSON.stringify(location) : null
      });

      toast.success('تم تسجيل الانصراف بنجاح! 👋');
      fetchTodayAttendance();
      fetchStats();
      fetchRecentAttendance();
    } catch (error: any) {
      // Handle geofencing errors with detailed messages
      if (error.response?.status === 403 && error.response?.data?.geofenceData) {
        const { distance, allowedRadius } = error.response.data.geofenceData;
        const distanceToMove = Math.round(distance - allowedRadius);
        toast.error('⛔ أنت خارج نطاق البصمة المسموح!', {
          description: (
            `📍 المسافة الحالية: ${Math.round(distance)} متر\n` +
            `✅ المسافة المسموحة: ${allowedRadius} متر\n` +
            `🚶 يجب الاقتراب: ${distanceToMove} متر من المكتب`
          ),
          duration: 8000,
          action: {
            label: 'فهمت',
            onClick: () => { }
          }
        });
      } else if (error.response?.status === 400) {
        toast.error('❌ خطأ في البيانات', {
          description: error.response?.data?.error || 'لم يتم تسجيل الحضور بعد',
          duration: 5000
        });
      } else if (error.response?.status === 401) {
        toast.error('🔒 انتهت صلاحية الجلسة', {
          description: 'يرجى تسجيل الدخول مرة أخرى',
          duration: 5000
        });
      } else if (!navigator.onLine) {
        toast.error('📡 لا يوجد اتصال بالإنترنت', {
          description: 'تحقق من اتصالك بالإنترنت وحاول مرة أخرى',
          duration: 5000
        });
      } else {
        toast.error('❌ فشل تسجيل الانصراف', {
          description: error.response?.data?.error || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى',
          duration: 5000
        });
      }
    } finally {
      setCheckingOut(false);
    }
  };

  const handleBiometricCheckOut = async () => {
    try {
      setIsProcessingBiometric(true);

      // Get location if available
      let location = null;
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
        } catch (error) {
          console.log('Location not available');
        }
      }

      // Simulate biometric verification
      await new Promise(resolve => setTimeout(resolve, 2000));

      await api.post('/hr/attendance/check-out', {
        method: 'biometric_remote',
        biometricType: biometricMethod,
        location: location ? JSON.stringify(location) : null,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          timestamp: new Date().toISOString()
        }
      });

      toast.success(`تم تسجيل الانصراف بالبصمة من المنزل بنجاح! 🏠`);
      setShowBiometricDialog(false);
      fetchTodayAttendance();
      fetchStats();
      fetchRecentAttendance();
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error('⛔ غير مصرح بالبصمة من المنزل', {
          description: error.response?.data?.error || 'يرجى التواصل مع إدارة الموارد البشرية',
          duration: 6000
        });
      } else {
        toast.error('❌ فشل تسجيل الانصراف بالبصمة', {
          description: error.response?.data?.error || 'حدث خطأ أثناء التحقق من البصمة',
          duration: 5000
        });
      }
    } finally {
      setIsProcessingBiometric(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const canCheckIn = !todayAttendance?.checkIn;
  const canCheckOut = todayAttendance?.checkIn && !todayAttendance?.checkOut;
  const errorMessages = Object.values(errors);

  return (
    <div className="space-y-6 w-full" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">حضوري وانصرافي</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">إدارة أوقات الحضور والانصراف</p>
          {user && (
            <p className="text-lg font-semibold text-blue-600 dark:text-blue-400 mt-2">
              الموظف: {user.firstName} {user.lastName}
            </p>
          )}
        </div>
        <p className="text-gray-500 dark:text-gray-400 sm:mt-0">
          {formatDate(currentTime)}
        </p>
      </div>

      {errorMessages.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <div className="space-y-1">
              {errorMessages.map((message, idx) => (
                <p key={idx} className="text-sm">{message}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Current Time & Check In/Out */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-6 sm:p-8">
          <div className="text-center space-y-4">
            {/* Clock */}
            <div className="flex items-center justify-center">
              <Clock className="h-12 w-12 sm:h-16 sm:w-16 text-blue-600 animate-pulse" />
            </div>

            <div>
              <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-blue-600 dark:text-blue-400">
                {formatTime(currentTime)}
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                الوقت الحالي
              </p>
            </div>

            {/* Today's Status */}
            {todayAttendance && (
              <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />
                    <span className="font-medium text-gray-900 dark:text-white">حالة اليوم:</span>
                  </div>
                  <Badge className={statusConfig[todayAttendance.status]?.color || ''}>
                    {statusConfig[todayAttendance.status]?.label || todayAttendance.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">تسجيل حضور</p>
                    <p className="font-bold text-lg text-gray-900 dark:text-white">
                      {todayAttendance.checkIn
                        ? new Date(todayAttendance.checkIn).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })
                        : '-'
                      }
                      {!todayAttendance.checkOut && todayAttendance.checkIn && (
                        <span className="mt-1 text-sm text-blue-600 font-mono dir-ltr inline-block">
                          ⏱️ {duration}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">تسجيل انصراف</p>
                    <p className="font-bold text-lg text-gray-900 dark:text-white">
                      {todayAttendance.checkOut
                        ? new Date(todayAttendance.checkOut).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })
                        : '-'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
              {canCheckIn && (
                <Button
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-6 text-lg w-full sm:w-auto"
                  onClick={handleCheckIn}
                  disabled={checkingIn}
                >
                  {checkingIn ? (
                    <>
                      <div className="mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      جاري التسجيل...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-6 w-6" />
                      تسجيل الدخول
                    </>
                  )}
                </Button>
              )}

              {canCheckOut && (
                <Button
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-6 text-lg w-full sm:w-auto"
                  onClick={handleCheckOut}
                  disabled={checkingOut}
                >
                  {checkingOut ? (
                    <>
                      <div className="mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      جاري التسجيل...
                    </>
                  ) : (
                    <>
                      <LogOut className="mr-2 h-6 w-6" />
                      تسجيل انصراف
                    </>
                  )}
                </Button>
              )}

              {!canCheckIn && !canCheckOut && (
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                  <p className="text-lg font-semibold text-gray-900">
                    تم تسجيل الحضور والانصراف لهذا اليوم
                  </p>
                </div>
              )}
            </div>

            {/* Location Info */}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <MapPin className="h-4 w-4" />
              <span>سيتم تسجيل موقعك تلقائياً</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">نسبة الحضور</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Number(stats.attendanceRate || 0).toFixed(1)}%</div>
              <Progress value={Math.min(100, Math.max(0, Number(stats.attendanceRate || 0)))} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">أيام الحضور</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.presentDays}</div>
              <p className="text-xs text-gray-500 mt-1">
                من {stats.totalDays} يوم
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">أيام التأخير</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.lateDays}</div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.totalDays ? ((stats.lateDays / stats.totalDays) * 100).toFixed(1) : '0.0'}% من الأيام
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ساعات العمل</CardTitle>
              <Timer className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Number(stats.totalWorkHours || 0).toFixed(1)}</div>
              <p className="text-xs text-gray-500 mt-1">
                إضافي: {Number(stats.totalOvertimeHours || 0).toFixed(1)} ساعة
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Attendance */}
      <Card>
        <CardHeader>
          <CardTitle>سجل الحضور الأخير</CardTitle>
        </CardHeader>
        <CardContent>
          {recentAttendance.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
              لا يوجد سجل حضور حتى الآن
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">الحضور</TableHead>
                    <TableHead className="text-right">الانصراف</TableHead>
                    <TableHead className="text-right">الموقع</TableHead>
                    <TableHead className="text-right">ساعات العمل</TableHead>
                    <TableHead className="text-right">التأخير</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentAttendance.map((record) => {
                    const StatusIcon = statusConfig[record.status]?.icon || Clock;
                    return (
                      <TableRow key={record.id}>
                        <TableCell>
                          {new Date(record.date).toLocaleDateString('ar-EG')}
                        </TableCell>
                        <TableCell>
                          {record.checkIn ? (
                            <span className="text-green-600 font-medium">
                              {new Date(record.checkIn).toLocaleTimeString('ar-EG', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {record.checkOut ? (
                            <span className="text-blue-600 font-medium">
                              {new Date(record.checkOut).toLocaleTimeString('ar-EG', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {renderLocationInfo(record.checkInLocation, record.checkOutLocation)}
                        </TableCell>
                        <TableCell>
                          {record.workHours ? (
                            <span>{Number(record.workHours).toFixed(1)} ساعة</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {Number(record.lateMinutes) > 0 ? (
                            <span className="text-red-600">{record.lateMinutes} دقيقة</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusConfig[record.status]?.color || ''}>
                            <StatusIcon className="h-3 w-3 ml-1" />
                            {statusConfig[record.status]?.label || record.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Biometric Dialog */}
      <Dialog open={showBiometricDialog} onOpenChange={setShowBiometricDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5" />
              تسجيل الحضور بالبصمة من المنزل
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Biometric Method Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium">اختر طريقة التحقق:</label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={biometricMethod === 'fingerprint' ? 'default' : 'outline'}
                  onClick={() => setBiometricMethod('fingerprint')}
                  className="h-16 flex-col gap-2"
                >
                  <Fingerprint className="h-6 w-6" />
                  بصمة الإصبع
                </Button>
                <Button
                  variant={biometricMethod === 'face' ? 'default' : 'outline'}
                  onClick={() => setBiometricMethod('face')}
                  className="h-16 flex-col gap-2"
                >
                  <Home className="h-6 w-6" />
                  التعرف على الوجه
                </Button>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                تعليمات التحقق بالبصمة:
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• تأكد من وجود إضاءة جيدة</li>
                <li>• ضع إصبعك على مستشعر البصمة</li>
                <li>• انتظر حتى يتم التحقق بنجاح</li>
                <li>• سيتم تسجيل موقعك تلقائياً</li>
              </ul>
            </div>

            {/* Biometric Status */}
            <div className="text-center">
              {isProcessingBiometric ? (
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <div className="animate-pulse">
                      <Fingerprint className="h-16 w-16 text-purple-600" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    جاري التحقق من البصمة...
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <Fingerprint className="h-16 w-16 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    اضغط على زر التحقق للمتابعة
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowBiometricDialog(false)}
              disabled={isProcessingBiometric}
            >
              إلغاء
            </Button>
            <Button
              onClick={canCheckIn ? handleBiometricCheckIn : handleBiometricCheckOut}
              disabled={isProcessingBiometric}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isProcessingBiometric ? (
                <>
                  <div className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  جاري التحقق...
                </>
              ) : (
                <>
                  <Fingerprint className="mr-2 h-4 w-4" />
                  {canCheckIn ? 'تسجيل حضور بالبصمة' : 'تسجيل انصراف بالبصمة'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Map Modal */}
      <Dialog open={showMapModal} onOpenChange={setShowMapModal}>
        <DialogContent className="sm:max-w-4xl sm:max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              موقع {selectedLocation?.type}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {selectedLocation && (
              <>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>الإحداثيات:</strong> {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                  </p>
                </div>

                {/* Google Maps Embed */}
                <div className="w-full h-96 rounded-lg overflow-hidden border">
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dO_BcqCGAOtEp4&q=${selectedLocation.latitude},${selectedLocation.longitude}&zoom=16`}
                    allowFullScreen
                    title={`خريطة موقع ${selectedLocation.type}`}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const url = `https://www.google.com/maps?q=${selectedLocation.latitude},${selectedLocation.longitude}`;
                      window.open(url, '_blank');
                    }}
                  >
                    فتح في Google Maps
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`${selectedLocation.latitude}, ${selectedLocation.longitude}`);
                      toast.success('تم نسخ الإحداثيات');
                    }}
                  >
                    نسخ الإحداثيات
                  </Button>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMapModal(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyAttendance;

