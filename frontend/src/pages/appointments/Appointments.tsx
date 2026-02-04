import React, { useState, useEffect } from 'react';
import { useDateFormat } from '../../hooks/useDateFormat';
import {
  CalendarDaysIcon,
  PlusIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  UserIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';

interface Appointment {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  staffId: string;
  staffName: string;
  title: string;
  description: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  type: string;
  location: string;
  meetingLink?: string;
  notes: string;
  createdAt: string;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  duration: number;
  available: boolean;
}

const Appointments: React.FC = () => {
  const { formatDate } = useDateFormat();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [filters, setFilters] = useState({
    status: '',
    staffId: '',
    type: '',
    dateFrom: '',
    dateTo: '',
  });

  const [newAppointment, setNewAppointment] = useState({
    customerId: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    staffId: '',
    staffName: '',
    title: '',
    description: '',
    appointmentDate: '',
    startTime: '',
    type: 'consultation',
    location: 'المكتب الرئيسي',
    meetingLink: '',
    notes: '',
  });

  useEffect(() => {
    fetchAppointments();
  }, [filters]);

  useEffect(() => {
    if (newAppointment.staffId && newAppointment.appointmentDate) {
      fetchAvailableSlots();
    }
  }, [newAppointment.staffId, newAppointment.appointmentDate]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.error('No access token found');
        setLoading(false);
        return;
      }
      
      const response = await fetch(`https://www.maxp-ai.pro/api/v1/appointments?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error('Unauthorized - please login again');
          return;
        }
        if (response.status === 404) {
          console.error('Appointments endpoint not found');
          setAppointments([]);
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setAppointments(data.data || []);
      } else {
        setAppointments([]);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async () => {
    try {
      if (!newAppointment.staffId || !newAppointment.appointmentDate) {
        setAvailableSlots([]);
        return;
      }
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.error('No access token found');
        setAvailableSlots([]);
        return;
      }
      
      const response = await fetch(
        `https://www.maxp-ai.pro/api/v1/appointments/available-slots?staffId=${newAppointment.staffId}&date=${newAppointment.appointmentDate}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error('Unauthorized - please login again');
          setAvailableSlots([]);
          return;
        }
        if (response.status === 404) {
          console.error('Available slots endpoint not found');
          setAvailableSlots([]);
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        setAvailableSlots(Array.isArray(data.data) ? data.data : []);
      } else {
        setAvailableSlots([]);
      }
    } catch (error) {
      console.error('Error fetching available slots:', error);
      setAvailableSlots([]);
    }
  };

  const createAppointment = async () => {
    try {
      if (!newAppointment.title || !newAppointment.appointmentDate || !newAppointment.startTime || !newAppointment.staffId) {
        alert('يرجى ملء جميع الحقول المطلوبة (العنوان، التاريخ، الوقت، الموظف)');
        return;
      }
      
      if (!newAppointment.customerName) {
        alert('يرجى إدخال اسم العميل');
        return;
      }
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        alert('يرجى تسجيل الدخول أولاً');
        return;
      }
      
      // Prepare appointment data - remove empty customerId
      const appointmentData = {
        ...newAppointment,
        customerId: newAppointment.customerId && newAppointment.customerId.trim() !== '' && newAppointment.customerId !== '1' && newAppointment.customerId !== '0' 
          ? newAppointment.customerId 
          : undefined,
        staffId: newAppointment.staffId || undefined
      };
      
      // Remove undefined values
      Object.keys(appointmentData).forEach(key => {
        if (appointmentData[key] === undefined || appointmentData[key] === '') {
          delete appointmentData[key];
        }
      });
      
      const response = await fetch('https://www.maxp-ai.pro/api/v1/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(appointmentData),
      });

      if (!response.ok) {
        if (response.status === 401) {
          alert('غير مصرح - يرجى تسجيل الدخول مرة أخرى');
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        fetchAppointments();
        setShowCreateModal(false);
        setAvailableSlots([]);
        setNewAppointment({
          customerId: '',
          customerName: '',
          customerEmail: '',
          customerPhone: '',
          staffId: '',
          staffName: '',
          title: '',
          description: '',
          appointmentDate: '',
          startTime: '',
          type: 'consultation',
          location: 'المكتب الرئيسي',
          meetingLink: '',
          notes: '',
        });
        alert('تم حجز الموعد بنجاح');
      } else {
        alert(data.error || data.message || 'فشل في حجز الموعد');
      }
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      alert(error.message || 'فشل في حجز الموعد');
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, status: string, notes = '') => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        alert('يرجى تسجيل الدخول أولاً');
        return;
      }
      
      const response = await fetch(`https://www.maxp-ai.pro/api/v1/appointments/${appointmentId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status, notes }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          alert('غير مصرح - يرجى تسجيل الدخول مرة أخرى');
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        fetchAppointments();
        if (selectedAppointment && selectedAppointment.id === appointmentId) {
          setSelectedAppointment(data.data);
        }
        alert('تم تحديث حالة الموعد بنجاح');
      } else {
        alert(data.error || data.message || 'فشل في تحديث حالة الموعد');
      }
    } catch (error: any) {
      console.error('Error updating appointment status:', error);
      alert(error.message || 'فشل في تحديث حالة الموعد');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />;
      case 'confirmed':
        return <CheckIcon className="h-5 w-5 text-blue-500 dark:text-blue-400" />;
      case 'completed':
        return <CheckIcon className="h-5 w-5 text-green-500 dark:text-green-400" />;
      case 'cancelled':
        return <XMarkIcon className="h-5 w-5 text-red-500 dark:text-red-400" />;
      case 'no_show':
        return <XMarkIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300';
      case 'confirmed':
        return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300';
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300';
      case 'cancelled':
        return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300';
      case 'no_show':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'في الانتظار';
      case 'confirmed':
        return 'مؤكد';
      case 'completed':
        return 'مكتمل';
      case 'cancelled':
        return 'ملغي';
      case 'no_show':
        return 'لم يحضر';
      default:
        return status;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'consultation':
        return 'استشارة';
      case 'training':
        return 'تدريب';
      case 'meeting':
        return 'اجتماع';
      case 'demo':
        return 'عرض توضيحي';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 bg-white dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
              <CalendarDaysIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400 mr-3" />
              إدارة المواعيد والتقويم
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">جدولة ومتابعة المواعيد مع العملاء</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            موعد جديد
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              الحالة
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
              style={{ colorScheme: 'dark' }}
            >
              <option value="" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">جميع الحالات</option>
              <option value="pending" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">في الانتظار</option>
              <option value="confirmed" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">مؤكد</option>
              <option value="completed" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">مكتمل</option>
              <option value="cancelled" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">ملغي</option>
              <option value="no_show" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">لم يحضر</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              الموظف
            </label>
            <select
              value={filters.staffId}
              onChange={(e) => setFilters({...filters, staffId: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
              style={{ colorScheme: 'dark' }}
            >
              <option value="" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">جميع الموظفين</option>
              <option value="1" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">أحمد المدير</option>
              <option value="2" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">سارة المستشارة</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              النوع
            </label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({...filters, type: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
              style={{ colorScheme: 'dark' }}
            >
              <option value="" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">جميع الأنواع</option>
              <option value="consultation" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">استشارة</option>
              <option value="training" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">تدريب</option>
              <option value="meeting" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">اجتماع</option>
              <option value="demo" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">عرض توضيحي</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              من تاريخ
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              إلى تاريخ
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            />
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={() => setFilters({ status: '', staffId: '', type: '', dateFrom: '', dateTo: '' })}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 transition-colors"
          >
            إعادة تعيين
          </button>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  العنوان
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  العميل
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  الموظف
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  التاريخ والوقت
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  النوع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  المكان
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {appointments.map((appointment) => (
                <tr key={appointment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {appointment.title}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {appointment.description?.substring(0, 50) || ''}...
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <UserIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {appointment.customerName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {appointment.customerPhone}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {appointment.staffName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {formatDate(appointment.appointmentDate)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {appointment.startTime} - {appointment.endTime}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                      {getTypeText(appointment.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                      {getStatusIcon(appointment.status)}
                      <span className="mr-1">{getStatusText(appointment.status)}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900 dark:text-gray-100">
                      <MapPinIcon className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-1" />
                      {appointment.location}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2 space-x-reverse">
                      <button
                        onClick={() => {
                          setSelectedAppointment(appointment);
                          setShowAppointmentModal(true);
                        }}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 transition-colors"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      {appointment.status === 'pending' && (
                        <button
                          onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                          className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 transition-colors"
                        >
                          تأكيد
                        </button>
                      )}
                      {appointment.status === 'confirmed' && (
                        <button
                          onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 transition-colors"
                        >
                          إكمال
                        </button>
                      )}
                      {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
                        <button
                          onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors"
                        >
                          إلغاء
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {appointments.length === 0 && (
          <div className="text-center py-12">
            <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">لا توجد مواعيد</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">لم يتم العثور على مواعيد تطابق المعايير المحددة.</p>
          </div>
        )}
      </div>

      {/* Appointment Details Modal */}
      {showAppointmentModal && selectedAppointment && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-black dark:bg-opacity-70 transition-opacity" onClick={() => setShowAppointmentModal(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-right overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full border border-gray-200 dark:border-gray-700">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                    تفاصيل الموعد
                  </h3>
                  <button
                    onClick={() => setShowAppointmentModal(false)}
                    className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">العنوان</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{selectedAppointment.title}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الوصف</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{selectedAppointment.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">العميل</label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{selectedAppointment.customerName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{selectedAppointment.customerEmail}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{selectedAppointment.customerPhone}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الموظف</label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{selectedAppointment.staffName}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">التاريخ</label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{formatDate(selectedAppointment.appointmentDate)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الوقت</label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{selectedAppointment.startTime} - {selectedAppointment.endTime}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">النوع</label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{getTypeText(selectedAppointment.type)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الحالة</label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedAppointment.status)}`}>
                        {getStatusIcon(selectedAppointment.status)}
                        <span className="mr-1">{getStatusText(selectedAppointment.status)}</span>
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">المكان</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{selectedAppointment.location}</p>
                  </div>
                  {selectedAppointment.meetingLink && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">رابط الاجتماع</label>
                      <a href={selectedAppointment.meetingLink} target="_blank" rel="noopener noreferrer" className="mt-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                        {selectedAppointment.meetingLink}
                      </a>
                    </div>
                  )}
                  {selectedAppointment.notes && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ملاحظات</label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{selectedAppointment.notes}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                {selectedAppointment.status === 'pending' && (
                  <button
                    onClick={() => {
                      updateAppointmentStatus(selectedAppointment.id, 'confirmed');
                      setShowAppointmentModal(false);
                    }}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 dark:bg-green-500 text-base font-medium text-white hover:bg-green-700 dark:hover:bg-green-600 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                  >
                    تأكيد الموعد
                  </button>
                )}
                {selectedAppointment.status === 'confirmed' && (
                  <button
                    onClick={() => {
                      updateAppointmentStatus(selectedAppointment.id, 'completed');
                      setShowAppointmentModal(false);
                    }}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 dark:bg-blue-500 text-base font-medium text-white hover:bg-blue-700 dark:hover:bg-blue-600 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                  >
                    إكمال الموعد
                  </button>
                )}
                {(selectedAppointment.status === 'pending' || selectedAppointment.status === 'confirmed') && (
                  <button
                    onClick={() => {
                      updateAppointmentStatus(selectedAppointment.id, 'cancelled');
                      setShowAppointmentModal(false);
                    }}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 dark:bg-red-500 text-base font-medium text-white hover:bg-red-700 dark:hover:bg-red-600 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                  >
                    إلغاء الموعد
                  </button>
                )}
                <button
                  onClick={() => setShowAppointmentModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Appointment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-black dark:bg-opacity-70 transition-opacity" onClick={() => setShowCreateModal(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-right overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full border border-gray-200 dark:border-gray-700">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4 max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                    موعد جديد
                  </h3>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">اسم العميل</label>
                    <input
                      type="text"
                      value={newAppointment.customerName}
                      onChange={(e) => setNewAppointment({...newAppointment, customerName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                      placeholder="اسم العميل"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">البريد الإلكتروني</label>
                      <input
                        type="email"
                        value={newAppointment.customerEmail}
                        onChange={(e) => setNewAppointment({...newAppointment, customerEmail: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                        placeholder="email@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">رقم الهاتف</label>
                      <input
                        type="tel"
                        value={newAppointment.customerPhone}
                        onChange={(e) => setNewAppointment({...newAppointment, customerPhone: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                        placeholder="01234567890"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">العنوان</label>
                    <input
                      type="text"
                      value={newAppointment.title}
                      onChange={(e) => setNewAppointment({...newAppointment, title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                      placeholder="عنوان الموعد"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الوصف</label>
                    <textarea
                      value={newAppointment.description}
                      onChange={(e) => setNewAppointment({...newAppointment, description: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 resize-none"
                      placeholder="وصف الموعد"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">التاريخ</label>
                      <input
                        type="date"
                        value={newAppointment.appointmentDate}
                        onChange={(e) => setNewAppointment({...newAppointment, appointmentDate: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الوقت</label>
                      {availableSlots.length > 0 ? (
                        <select
                          value={newAppointment.startTime}
                          onChange={(e) => setNewAppointment({...newAppointment, startTime: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                          style={{ colorScheme: 'dark' }}
                        >
                          <option value="">اختر الوقت</option>
                          {availableSlots.map((slot, index) => (
                            <option key={index} value={slot.startTime} disabled={!slot.available} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                              {slot.startTime} {slot.endTime ? `- ${slot.endTime}` : ''} ({slot.duration} دقيقة)
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="time"
                          value={newAppointment.startTime}
                          onChange={(e) => setNewAppointment({...newAppointment, startTime: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                          required
                        />
                      )}
                      {newAppointment.appointmentDate && availableSlots.length === 0 && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          أدخل الوقت يدوياً أو انتظر تحميل الأوقات المتاحة
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الموظف *</label>
                      <input
                        type="text"
                        value={newAppointment.staffId}
                        onChange={(e) => setNewAppointment({...newAppointment, staffId: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                        placeholder="معرف الموظف (مثال: user-id)"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">اسم الموظف</label>
                      <input
                        type="text"
                        value={newAppointment.staffName}
                        onChange={(e) => setNewAppointment({...newAppointment, staffName: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                        placeholder="اسم الموظف (سيتم ملؤه تلقائياً إذا كان المعرف صحيحاً)"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">النوع</label>
                      <select
                        value={newAppointment.type}
                        onChange={(e) => setNewAppointment({...newAppointment, type: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                        style={{ colorScheme: 'dark' }}
                      >
                        <option value="consultation" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">استشارة</option>
                        <option value="training" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">تدريب</option>
                        <option value="meeting" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">اجتماع</option>
                        <option value="demo" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">عرض توضيحي</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">المكان</label>
                      <input
                        type="text"
                        value={newAppointment.location}
                        onChange={(e) => setNewAppointment({...newAppointment, location: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                        placeholder="المكان"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">رابط الاجتماع (اختياري)</label>
                    <input
                      type="url"
                      value={newAppointment.meetingLink}
                      onChange={(e) => setNewAppointment({...newAppointment, meetingLink: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ملاحظات (اختياري)</label>
                    <textarea
                      value={newAppointment.notes}
                      onChange={(e) => setNewAppointment({...newAppointment, notes: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 resize-none"
                      placeholder="ملاحظات إضافية"
                    />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                <button
                  onClick={createAppointment}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-base font-medium text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                >
                  حجز الموعد
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;

