import React, { useState, useEffect, useRef } from 'react';
import { useDateFormat } from '../../hooks/useDateFormat';
import {
  CameraIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  StarIcon,
  TrophyIcon,
  CalendarDaysIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  BriefcaseIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  UserIcon,
  CakeIcon,
  SparklesIcon,
  GiftIcon,
  HeartIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../hooks/useAuthSimple';
import api from '@/services/api';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from "lucide-react";
import { motion } from 'framer-motion';

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
  contractType: string;
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
  department: { name: string } | null;
  position: { title: string } | null;
  manager: { firstName: string; lastName: string } | null;
  documents_rel: any[];
}

const statusLabels: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'نشط', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  ON_LEAVE: { label: 'في إجازة', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  SUSPENDED: { label: 'موقوف', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  TERMINATED: { label: 'منتهي', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
  RESIGNED: { label: 'مستقيل', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
};

const contractLabels: Record<string, string> = {
  FULL_TIME: 'دوام كامل',
  PART_TIME: 'دوام جزئي',
  CONTRACT: 'عقد',
  TEMPORARY: 'مؤقت',
  INTERNSHIP: 'تدريب',
  FREELANCE: 'حر',
};

const Profile: React.FC = () => {
  const { formatDate } = useDateFormat();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Form Data for Basic Info Edit
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    bio: ''
  });

  // Theme State
  type Theme = 'pink' | 'ocean' | 'royal' | 'emerald' | 'sunset' | 'lavender' | 'midnight';
  const [currentTheme, setCurrentTheme] = useState<Theme>('royal'); // Default to Royal for unisex appeal

  // State for Full Screen Mode
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Glassmorphic card style for dark mode
  const glassCard = 'dark:bg-gray-900/60 dark:backdrop-blur-md dark:border-white/10';

  const themes = {
    pink: {
      name: 'Princess (Pink)',
      primary: 'pink',
      bgLight: 'bg-gradient-to-br from-pink-50 via-white to-rose-50',
      bgDark: 'dark:bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] dark:from-purple-900 dark:via-gray-900 dark:to-pink-950',
      cardDark: glassCard,
      borderDark: 'dark:border-pink-500/20',
      textAccent: 'dark:text-pink-300',
      textHeading: 'dark:text-pink-50',
      gradient: 'from-pink-600 to-purple-700 dark:from-pink-900 dark:to-purple-900',
      badge: 'bg-pink-100 text-pink-800 dark:bg-pink-500/20 dark:text-pink-200',
      button: 'bg-pink-50 dark:bg-pink-500/20 text-pink-600 dark:text-pink-200 hover:bg-pink-100 dark:hover:bg-pink-500/30 border-pink-100 dark:border-pink-500/30',
      tabActive: 'data-[state=active]:border-pink-600 dark:data-[state=active]:border-pink-400 data-[state=active]:text-pink-600 dark:data-[state=active]:text-pink-400'
    },
    ocean: {
      name: 'Ocean (Teal)',
      primary: 'cyan',
      bgLight: 'bg-gradient-to-br from-cyan-50 via-white to-blue-50',
      bgDark: 'dark:bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] dark:from-cyan-900 dark:via-slate-900 dark:to-blue-950',
      cardDark: glassCard,
      borderDark: 'dark:border-cyan-500/20',
      textAccent: 'dark:text-cyan-300',
      textHeading: 'dark:text-cyan-50',
      gradient: 'from-cyan-600 to-blue-700 dark:from-cyan-900 dark:to-blue-900',
      badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-200',
      button: 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-200 hover:bg-cyan-100 dark:hover:bg-cyan-500/30 border-cyan-100 dark:border-cyan-500/30',
      tabActive: 'data-[state=active]:border-cyan-600 dark:data-[state=active]:border-cyan-400 data-[state=active]:text-cyan-600 dark:data-[state=active]:text-cyan-400'
    },
    royal: {
      name: 'Royal (Indigo)',
      primary: 'indigo',
      bgLight: 'bg-gradient-to-br from-indigo-50 via-white to-violet-50',
      bgDark: 'dark:bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] dark:from-indigo-900 dark:via-slate-900 dark:to-violet-950',
      cardDark: glassCard,
      borderDark: 'dark:border-indigo-500/20',
      textAccent: 'dark:text-indigo-300',
      textHeading: 'dark:text-indigo-50',
      gradient: 'from-indigo-600 to-violet-700 dark:from-indigo-900 dark:to-violet-900',
      badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-200',
      button: 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-500/30 border-indigo-100 dark:border-indigo-500/30',
      tabActive: 'data-[state=active]:border-indigo-600 dark:data-[state=active]:border-indigo-400 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400'
    },
    emerald: {
      name: 'Forest (Green)',
      primary: 'emerald',
      bgLight: 'bg-gradient-to-br from-emerald-50 via-white to-teal-50',
      bgDark: 'dark:bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] dark:from-emerald-900 dark:via-gray-900 dark:to-teal-950',
      cardDark: glassCard,
      borderDark: 'dark:border-emerald-500/20',
      textAccent: 'dark:text-emerald-300',
      textHeading: 'dark:text-emerald-50',
      gradient: 'from-emerald-600 to-teal-700 dark:from-emerald-900 dark:to-teal-900',
      badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
      button: 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-500/30 border-emerald-100 dark:border-emerald-500/30',
      tabActive: 'data-[state=active]:border-emerald-600 dark:data-[state=active]:border-emerald-400 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400'
    },
    sunset: {
      name: 'Sunset (Orange)',
      primary: 'orange',
      bgLight: 'bg-gradient-to-br from-orange-50 via-white to-amber-50',
      bgDark: 'dark:bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] dark:from-orange-900 dark:via-gray-900 dark:to-red-950',
      cardDark: glassCard,
      borderDark: 'dark:border-orange-500/20',
      textAccent: 'dark:text-orange-300',
      textHeading: 'dark:text-orange-50',
      gradient: 'from-orange-600 to-red-600 dark:from-orange-900 dark:to-red-900',
      badge: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200',
      button: 'bg-orange-50 dark:bg-orange-500/20 text-orange-600 dark:text-orange-200 hover:bg-orange-100 dark:hover:bg-orange-500/30 border-orange-100 dark:border-orange-500/30',
      tabActive: 'data-[state=active]:border-orange-600 dark:data-[state=active]:border-orange-400 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400'
    },
    lavender: {
      name: 'Lavender (Soft)',
      primary: 'violet',
      bgLight: 'bg-gradient-to-br from-violet-50 via-white to-purple-50',
      bgDark: 'dark:bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] dark:from-violet-900 dark:via-slate-900 dark:to-fuchsia-950',
      cardDark: glassCard,
      borderDark: 'dark:border-violet-500/20',
      textAccent: 'dark:text-violet-300',
      textHeading: 'dark:text-violet-50',
      gradient: 'from-violet-600 to-fuchsia-600 dark:from-violet-900 dark:to-fuchsia-900',
      badge: 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200',
      button: 'bg-violet-50 dark:bg-violet-500/20 text-violet-600 dark:text-violet-200 hover:bg-violet-100 dark:hover:bg-violet-500/30 border-violet-100 dark:border-violet-500/30',
      tabActive: 'data-[state=active]:border-violet-600 dark:data-[state=active]:border-violet-400 data-[state=active]:text-violet-600 dark:data-[state=active]:text-violet-400'
    },
    midnight: {
      name: 'Midnight (Dark)',
      primary: 'gray',
      bgLight: 'bg-gradient-to-br from-gray-100 via-white to-slate-100',
      bgDark: 'dark:bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] dark:from-slate-900 dark:via-gray-900 dark:to-zinc-900',
      cardDark: 'dark:bg-gray-900/80 dark:backdrop-blur-sm dark:border-gray-800',
      borderDark: 'dark:border-gray-700/50',
      textAccent: 'dark:text-gray-300',
      textHeading: 'dark:text-gray-50',
      gradient: 'from-gray-700 to-gray-900 dark:from-gray-800 dark:to-gray-950',
      badge: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      button: 'bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700',
      tabActive: 'data-[state=active]:border-gray-900 dark:data-[state=active]:border-gray-500 data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-200'
    }
  };

  const theme = themes[currentTheme];

  useEffect(() => {
    fetchProfileData();
  }, []);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      try {
        const response = await api.get('/hr/employees/me');
        const empData = response.data.employee;
        setEmployee(empData);
        setFormData({
          firstName: empData.firstName || user?.firstName || '',
          lastName: empData.lastName || user?.lastName || '',
          email: empData.email || user?.email || '',
          phone: empData.phone || '',
          address: empData.address || '',
          city: empData.city || '',
          country: empData.country || '',
          bio: ''
        });
      } catch (err) {
        console.warn('Could not fetch employee data, falling back to user data', err);
        setFormData({
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          email: user?.email || '',
          phone: '',
          address: '',
          city: '',
          country: '',
          bio: ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('حدث خطأ أثناء جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    toast.info('سيتم تفعيل تحديث البيانات قريباً');
    setIsEditing(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('الرجاء اختيار ملف صورة صالح');
      return;
    }

    try {
      setUploading(true);
      const uploadFormData = new FormData();
      uploadFormData.append('image', file);

      const uploadResponse = await api.post('/user/image-gallery/upload', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (uploadResponse.data && uploadResponse.data.success) {
        const newAvatarUrl = uploadResponse.data.image.url;

        if (employee?.id) {
          await api.put(`/hr/employees/${employee.id}`, { avatar: newAvatarUrl });
        }

        toast.success('تم تحديث الصورة الشخصية بنجاح');
        fetchProfileData();
      } else {
        throw new Error('Upload failed');
      }

    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('فشل في رفع الصورة. يرجى المحاولة مرة أخرى.');
    } finally {
      setUploading(false);
    }
  };

  const calculateAge = (dob: string) => {
    if (!dob) return '-';
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const calculateTenure = (date: string) => {
    if (!date) return '-';
    const start = new Date(date);
    const now = new Date();
    const years = now.getFullYear() - start.getFullYear();
    const months = now.getMonth() - start.getMonth();
    if (years > 0) return `${years} سنة${months > 0 ? ` و ${months} شهر` : ''}`;
    return `${months} شهر`;
  };

  const getNextOccasion = (dateStr: string) => {
    if (!dateStr) return null;
    const today = new Date();
    const currentYear = today.getFullYear();

    let nextDate = new Date(dateStr);
    nextDate.setFullYear(currentYear);

    if (nextDate < today) {
      nextDate.setFullYear(currentYear + 1);
    }

    const diffTime = Math.abs(nextDate.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return { date: nextDate, days: diffDays };
  };

  // Helper for consistent card styling
  const CardContainer = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <Card className={`${theme.cardDark} ${theme.borderDark} transition-colors duration-300 ${className}`}>
      {children}
    </Card>
  );

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen bg-gray-50 ${theme.bgDark}`}>
        <div className={`animate-spin rounded-full h-12 w-12 border-b-2 border-${theme.primary}-500`}></div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={`${isFullScreen ? 'fixed inset-0 z-50 overflow-y-auto' : 'min-h-full'} ${theme.bgLight} ${theme.bgDark} transition-colors duration-300`}
      dir="rtl"
    >
      {/* Full Screen Toggle Button */}
      <button
        onClick={toggleFullScreen}
        className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-50 p-2 sm:p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full shadow-lg text-white hover:bg-white/20 transition-all duration-300 group"
        title={isFullScreen ? "خروج من وضع ملء الشاشة" : "وضع ملء الشاشة"}
      >
        {isFullScreen ? (
          <ArrowsPointingInIcon className="h-5 w-5 sm:h-6 sm:w-6" />
        ) : (
          <ArrowsPointingOutIcon className="h-5 w-5 sm:h-6 sm:w-6" />
        )}
      </button>

      <div className={`container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl ${isFullScreen ? 'py-8' : 'py-4 sm:py-0'}`}>

        {/* Theme Switcher */}
        <div className="flex justify-center sm:justify-end mb-4 sm:mb-6 gap-1.5 sm:gap-2 flex-wrap">
          {Object.keys(themes).map((key) => {
            const t = themes[key as Theme];
            return (
              <button
                key={key}
                onClick={() => setCurrentTheme(key as Theme)}
                className={`px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium transition-all ${currentTheme === key ? t.badge + ' border border-current shadow-sm scale-105' : 'bg-white/50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-white hover:shadow-sm'}`}
              >
                {t.name}
              </button>
            );
          })}
        </div>

        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />

        <div className={`bg-white ${theme.cardDark} rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 ${theme.borderDark} overflow-hidden mb-6 sm:mb-8 transition-colors duration-300`}>
          <div className={`h-32 sm:h-40 md:h-48 bg-gradient-to-l ${theme.gradient} relative transition-all duration-500`}>
            <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
          </div>

          <div className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
            <div className="relative flex flex-col md:flex-row items-center md:items-end -mt-12 sm:-mt-14 md:-mt-16 mb-4 sm:mb-6 gap-4 sm:gap-6">
              <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                <div className="relative">
                  <img
                    src={employee?.avatar || (user as any)?.avatar || '/placeholder-avatar.png'}
                    alt="Profile"
                    className={`w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-xl sm:rounded-2xl border-3 sm:border-4 border-white dark:border-black/20 shadow-lg object-cover bg-white ${theme.bgDark} transition-colors duration-300`}
                  />
                  {uploading && (
                    <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>
                {!uploading && (
                  <div className={`absolute bottom-2 right-2 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg hover:bg-${theme.primary}-700 transform hover:scale-105 bg-${theme.primary}-600 text-white`}>
                    <CameraIcon className="w-5 h-5" />
                  </div>
                )}
              </div>

              <div className="flex-1 text-center md:text-right mb-2 w-full md:w-auto">
                <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                  <h1 className={`text-3xl font-bold text-gray-900 ${theme.textHeading} transition-colors`}>
                    {formData.firstName} {formData.lastName}
                  </h1>
                  {employee?.status && (
                    <Badge className={`${statusLabels[employee.status]?.color} transition-colors`}>
                      {statusLabels[employee.status]?.label}
                    </Badge>
                  )}
                </div>
                <p className={`text-gray-500 dark:text-gray-400 font-medium flex items-center justify-center md:justify-start gap-2 transition-colors`}>
                  <BriefcaseIcon className="w-5 h-5 opacity-70" />
                  {employee?.position?.title || 'موظف'}
                  <span className="opacity-50 mx-2">|</span>
                  <BuildingOfficeIcon className="w-5 h-5 opacity-70" />
                  {employee?.department?.name || 'بدون قسم'}
                </p>
              </div>

              <div className="flex gap-3">
                {isEditing ? (
                  <>
                    <button onClick={handleSave} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-sm">
                      <CheckIcon className="w-4 h-4 ml-2" /> حفظ
                    </button>
                    <button onClick={() => setIsEditing(false)} className={`flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition shadow-sm`}>
                      <XMarkIcon className="w-4 h-4 ml-2" /> إلغاء
                    </button>
                  </>
                ) : (
                  <button onClick={() => setIsEditing(true)} className={`flex items-center px-4 py-2 rounded-lg transition shadow-sm ${theme.button}`}>
                    <PencilIcon className="w-4 h-4 ml-2" /> تعديل الملف
                  </button>
                )}
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className={`w-full justify-start bg-transparent border-b border-gray-200 ${theme.borderDark} rounded-none h-auto p-0 gap-2 sm:gap-4 md:gap-6 overflow-x-auto scrollbar-hide flex-nowrap`}>
                <TabsTrigger value="overview" className={`relative outline-none border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 py-3 sm:py-4 text-sm sm:text-base text-gray-600 dark:text-gray-400 transition-colors whitespace-nowrap ${theme.tabActive}`}>نظرة عامة</TabsTrigger>
                <TabsTrigger value="personal" className={`relative outline-none border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 py-3 sm:py-4 text-sm sm:text-base text-gray-600 dark:text-gray-400 transition-colors whitespace-nowrap ${theme.tabActive}`}>البيانات الشخصية</TabsTrigger>
                <TabsTrigger value="job" className={`relative outline-none border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 py-3 sm:py-4 text-sm sm:text-base text-gray-600 dark:text-gray-400 transition-colors whitespace-nowrap ${theme.tabActive}`}>الوظيفة والراتب</TabsTrigger>
                <TabsTrigger value="documents" className={`relative outline-none border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 py-3 sm:py-4 text-sm sm:text-base text-gray-600 dark:text-gray-400 transition-colors whitespace-nowrap ${theme.tabActive}`}>المستندات</TabsTrigger>
                <TabsTrigger value="events" className={`relative outline-none border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 py-3 sm:py-4 text-sm sm:text-base text-gray-600 dark:text-gray-400 transition-colors whitespace-nowrap ${theme.tabActive}`}>المناسبات</TabsTrigger>
              </TabsList>

              <div className="mt-6 sm:mt-8">
                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4 sm:space-y-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <CardContainer>
                      <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 rounded-xl transition-colors">
                          <CalendarDaysIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">بداية العمل</p>
                          <p className={`font-bold text-gray-900 ${theme.textHeading}`}>{formatDate(employee?.hireDate || '')}</p>
                        </div>
                      </CardContent>
                    </CardContainer>
                    <CardContainer>
                      <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 rounded-xl transition-colors">
                          <ClockIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">مدة الخدمة</p>
                          <p className={`font-bold text-gray-900 ${theme.textHeading}`}>{calculateTenure(employee?.hireDate || '')}</p>
                        </div>
                      </CardContent>
                    </CardContainer>
                    <CardContainer>
                      <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-300 rounded-xl transition-colors">
                          <TrophyIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">رصيد الإجازات</p>
                          <p className={`font-bold text-gray-900 ${theme.textHeading}`}>{employee?.annualLeaveBalance || 0} يوم</p>
                        </div>
                      </CardContent>
                    </CardContainer>
                    <CardContainer>
                      <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-300 rounded-xl transition-colors">
                          <StarIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">تقييم الأداء</p>
                          <div className="flex text-yellow-500">
                            <StarIcon className="w-4 h-4 fill-current" />
                            <StarIcon className="w-4 h-4 fill-current" />
                            <StarIcon className="w-4 h-4 fill-current" />
                            <StarIcon className="w-4 h-4 fill-current" />
                            <StarIcon className="w-4 h-4" />
                          </div>
                        </div>
                      </CardContent>
                    </CardContainer>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <CardContainer className="h-full">
                      <CardHeader>
                        <CardTitle className={`text-gray-900 ${theme.textHeading}`}>معلومات الاتصال السريع</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className={`flex items-center gap-3 text-gray-700 ${theme.textAccent}`}>
                          <EnvelopeIcon className="w-5 h-5 opacity-70" />
                          <span>{formData.email}</span>
                        </div>
                        <div className={`flex items-center gap-3 text-gray-700 ${theme.textAccent}`}>
                          <PhoneIcon className="w-5 h-5 opacity-70" />
                          <span>{formData.phone || 'غير مسجل'}</span>
                        </div>
                        <div className={`flex items-center gap-3 text-gray-700 ${theme.textAccent}`}>
                          <MapPinIcon className="w-5 h-5 opacity-70" />
                          <span>{formData.city ? `${formData.city}, ${formData.country}` : 'غير مسجل'}</span>
                        </div>
                        {employee?.emergencyContactName && (
                          <div className={`pt-4 mt-4 border-t border-gray-100 ${theme.borderDark}`}>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">في حالة الطوارئ</p>
                            <div className="flex items-center justify-between">
                              <span className={`font-medium text-gray-900 ${theme.textHeading}`}>{employee.emergencyContactName}</span>
                              <span className="text-sm bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-1 rounded">{employee.emergencyContactRelation}</span>
                            </div>
                            <p className="text-sm mt-1 dir-ltr text-right text-gray-600 dark:text-gray-400">{employee.emergencyContactPhone}</p>
                          </div>
                        )}
                      </CardContent>
                    </CardContainer>

                    <CardContainer className="h-full">
                      <CardHeader>
                        <CardTitle className={`text-gray-900 ${theme.textHeading}`}>أحدث النشاطات</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          <div className="flex gap-4">
                            <div className="mt-1 bg-blue-100 dark:bg-blue-900/20 p-2 rounded-full h-fit">
                              <ClockIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className={`font-medium text-gray-900 ${theme.textHeading}`}>تسجيل دخول</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">تم تسجيل الدخول بنجاح للنظام</p>
                              <p className="text-xs text-gray-400 mt-1">منذ 2 ساعة</p>
                            </div>
                          </div>
                          <div className="flex gap-4">
                            <div className="mt-1 bg-green-100 dark:bg-green-900/20 p-2 rounded-full h-fit">
                              <CheckIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                              <p className={`font-medium text-gray-900 ${theme.textHeading}`}>اكتمال مهمة</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">تم إكمال المهمة "تحديث بيانات العملاء"</p>
                              <p className="text-xs text-gray-400 mt-1">أمس</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </CardContainer>
                  </div>
                </TabsContent>

                {/* Personal Info Tab */}
                <TabsContent value="personal">
                  <motion.div variants={cardVariants} initial="hidden" animate="visible">
                    <CardContainer>
                      <CardContent className="p-6">
                        <h3 className={`text-lg font-bold mb-6 flex items-center gap-2 text-gray-900 ${theme.textHeading}`}>
                          <UserIcon className="w-5 h-5" />
                          البيانات الشخصية
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 md:gap-x-12 gap-y-4 sm:gap-y-6">
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">الاسم الكامل (عربي)</p>
                            <p className={`font-medium text-lg text-gray-900 ${theme.textHeading}`}>{employee?.firstName} {employee?.lastName}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">تاريخ الميلاد</p>
                            <p className={`font-medium text-lg text-gray-900 ${theme.textHeading}`}>{formatDate(employee?.dateOfBirth || '')} <span className="text-sm text-gray-400">({calculateAge(employee?.dateOfBirth || '')} سنة)</span></p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">الجنس</p>
                            <p className={`font-medium text-lg text-gray-900 ${theme.textHeading}`}>{employee?.gender === 'MALE' ? 'ذكر' : 'أنثى'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">الحالة الاجتماعية</p>
                            <p className={`font-medium text-lg text-gray-900 ${theme.textHeading}`}>{employee?.maritalStatus || '-'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">رقم الهوية / الإقامة</p>
                            <p className={`font-medium text-lg text-gray-900 ${theme.textHeading}`}>{employee?.nationalId || '-'}</p>
                          </div>
                        </div>

                        <div className={`my-8 border-t border-gray-100 ${theme.borderDark}`} />

                        <h3 className={`text-lg font-bold mb-6 flex items-center gap-2 text-gray-900 ${theme.textHeading}`}>
                          <MapPinIcon className="w-5 h-5" />
                          العنوان والسكن
                        </h3>
                        <div className="grid md:grid-cols-2 gap-x-12 gap-y-6">
                          <div className="md:col-span-2">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">العنوان الوطني</p>
                            <p className={`font-medium text-lg text-gray-900 ${theme.textHeading}`}>{employee?.address || '-'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">المدينة</p>
                            <p className={`font-medium text-lg text-gray-900 ${theme.textHeading}`}>{employee?.city || '-'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">الدولة</p>
                            <p className={`font-medium text-lg text-gray-900 ${theme.textHeading}`}>{employee?.country || '-'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </CardContainer>
                  </motion.div>
                </TabsContent>

                {/* Job Info Tab */}
                <TabsContent value="job">
                  <motion.div variants={cardVariants} initial="hidden" animate="visible" className="grid gap-6">
                    <CardContainer>
                      <CardContent className="p-6">
                        <h3 className={`text-lg font-bold mb-6 flex items-center gap-2 text-gray-900 ${theme.textHeading}`}>
                          <BriefcaseIcon className="w-5 h-5" />
                          التفاصيل الوظيفية
                        </h3>
                        <div className="grid md:grid-cols-2 gap-x-12 gap-y-6">
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">الرقم الوظيفي</p>
                            <p className={`font-medium text-lg text-gray-900 ${theme.textHeading}`}>{employee?.employeeNumber}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">تاريخ الانضمام</p>
                            <p className={`font-medium text-lg text-gray-900 ${theme.textHeading}`}>{formatDate(employee?.hireDate || '')}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">نوع العقد</p>
                            <Badge variant="outline" className={`text-base font-normal dark:border-gray-600 ${theme.textAccent}`}>
                              {contractLabels[employee?.contractType || ''] || employee?.contractType}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">المدير المباشر</p>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-200">
                                {employee?.manager?.firstName?.[0]}
                              </div>
                              <p className={`font-medium text-lg text-gray-900 ${theme.textHeading}`}>{employee?.manager?.firstName} {employee?.manager?.lastName}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </CardContainer>

                    <CardContainer>
                      <CardContent className="p-6">
                        <h3 className={`text-lg font-bold mb-6 flex items-center gap-2 text-gray-900 ${theme.textHeading}`}>
                          <CurrencyDollarIcon className="w-5 h-5" />
                          المعلومات المالية والبنكية
                        </h3>
                        <div className="grid md:grid-cols-2 gap-x-12 gap-y-6">
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">الراتب الأساسي</p>
                            <p className="font-bold text-xl text-green-700 dark:text-green-400">{employee?.baseSalary?.toLocaleString() || 0} ج.م</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">اسم البنك</p>
                            <p className={`font-medium text-lg text-gray-900 ${theme.textHeading}`}>{employee?.bankName || '-'}</p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">رقم الـ IBAN</p>
                            <p className={`font-mono text-lg bg-gray-50 dark:bg-black/20 p-2 rounded text-gray-900 ${theme.textHeading}`}>{employee?.bankIban || '-'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </CardContainer>
                  </motion.div>
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="documents">
                  <motion.div variants={cardVariants} initial="hidden" animate="visible">
                    <CardContainer>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className={`flex items-center gap-2 text-gray-900 ${theme.textHeading}`}>
                          <DocumentTextIcon className="w-5 h-5" />
                          مستندات الموظف
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {!employee?.documents_rel?.length ? (
                          <div className={`text-center py-12 bg-gray-50 dark:bg-black/20 rounded-lg dashed border-2 border-gray-200 ${theme.borderDark}`}>
                            <DocumentTextIcon className={`w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3`} />
                            <p className="text-gray-500 dark:text-gray-400">لا توجد مستندات مرفقة في ملفك</p>
                          </div>
                        ) : (
                          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {employee.documents_rel.map((doc: any, idx: number) => (
                              <div key={idx} className={`p-4 border border-gray-200 ${theme.borderDark} rounded-xl hover:shadow-sm transition cursor-pointer bg-white ${theme.cardDark}`}>
                                <div className="flex items-start justify-between mb-2">
                                  <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
                                    <DocumentTextIcon className="w-6 h-6" />
                                  </div>
                                  <Badge variant="secondary" className="dark:bg-gray-700 dark:text-gray-200">{doc.type}</Badge>
                                </div>
                                <h4 className={`font-bold truncate text-gray-900 ${theme.textHeading}`}>{doc.title}</h4>
                                <p className="text-xs text-gray-400 mt-1">{formatDate(doc.createdAt)}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </CardContainer>
                  </motion.div>
                </TabsContent>

                {/* Events Tab */}
                <TabsContent value="events">
                  <motion.div variants={cardVariants} initial="hidden" animate="visible" className="grid gap-6 md:grid-cols-2">
                    {/* Birthday Card */}
                    <CardContainer className="relative overflow-hidden">
                      <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${theme.gradient}`}></div>
                      <CardContent className="p-8 flex flex-col items-center text-center relative z-10">
                        <div className="w-20 h-20 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mb-6 animate-pulse">
                          <CakeIcon className="w-10 h-10 text-pink-500" />
                        </div>
                        <h3 className={`text-2xl font-bold mb-2 ${theme.textHeading}`}>عيد ميلادك القادم</h3>
                        {employee?.dateOfBirth ? (
                          <>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">يوافق {formatDate(getNextOccasion(employee.dateOfBirth)?.date.toISOString() || '')}</p>
                            <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
                              <div className={`p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 ${theme.borderDark}`}>
                                <span className={`block text-2xl font-bold ${theme.textAccent}`}>{getNextOccasion(employee.dateOfBirth)?.days}</span>
                                <span className="text-xs text-gray-400">يوم</span>
                              </div>
                              <div className={`p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 ${theme.borderDark}`}>
                                <span className={`block text-2xl font-bold ${theme.textAccent}`}>{(calculateAge(employee.dateOfBirth) as number) + 1}</span>
                                <span className="text-xs text-gray-400">سنة</span>
                              </div>
                              <div className={`p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 ${theme.borderDark}`}>
                                <span className={`block text-2xl font-bold ${theme.textAccent}`}>🎉</span>
                                <span className="text-xs text-gray-400">احتفال</span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <p className="text-gray-400">لم يتم تحديد تاريخ الميلاد</p>
                        )}

                        {/* Decorative background elements */}
                        <SparklesIcon className="absolute top-10 right-10 w-6 h-6 text-yellow-400 opacity-20" />
                        <HeartIcon className="absolute bottom-10 left-10 w-6 h-6 text-pink-400 opacity-20" />
                      </CardContent>
                    </CardContainer>

                    {/* Work Anniversary Card */}
                    <CardContainer className="relative overflow-hidden">
                      <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${theme.gradient}`}></div>
                      <CardContent className="p-8 flex flex-col items-center text-center relative z-10">
                        <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-6">
                          <GiftIcon className="w-10 h-10 text-blue-500" />
                        </div>
                        <h3 className={`text-2xl font-bold mb-2 ${theme.textHeading}`}>ذكرى انضمامك</h3>
                        {employee?.hireDate ? (
                          <>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">يوافق {formatDate(getNextOccasion(employee.hireDate)?.date.toISOString() || '')}</p>
                            <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
                              <div className={`p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 ${theme.borderDark}`}>
                                <span className={`block text-2xl font-bold ${theme.textAccent}`}>{getNextOccasion(employee.hireDate)?.days}</span>
                                <span className="text-xs text-gray-400">يوم متبقي</span>
                              </div>
                              <div className={`p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 ${theme.borderDark}`}>
                                <span className={`block text-2xl font-bold ${theme.textAccent}`}>
                                  {Math.floor((new Date().getTime() - new Date(employee.hireDate).getTime()) / (1000 * 60 * 60 * 24))}
                                </span>
                                <span className="text-xs text-gray-400">يوم عمل</span>
                              </div>
                              <div className={`p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 ${theme.borderDark}`}>
                                <span className={`block text-2xl font-bold ${theme.textAccent}`}>{calculateTenure(employee.hireDate).split(' ')[0]}</span>
                                <span className="text-xs text-gray-400">سنوات</span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <p className="text-gray-400">لم يتم تحديد تاريخ التعيين</p>
                        )}

                        <SparklesIcon className="absolute top-1/2 right-4 w-12 h-12 text-blue-400 opacity-10 rotate-12" />
                      </CardContent>
                    </CardContainer>
                  </motion.div>
                </TabsContent>
              </div>
            </Tabs>


          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Profile;
