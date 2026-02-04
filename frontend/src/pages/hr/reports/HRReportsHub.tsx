import React, { useState, useEffect } from 'react';
import {
  Settings,
  Clock,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  Award,
  GraduationCap,
  AlertTriangle,
  FileText,
  BarChart3,
  ChevronLeft
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ErrorBoundary from '@/components/ErrorBoundary';
import AttendanceReport from './AttendanceReport';
import LeaveReport from './LeaveReport';
import PayrollReport from './PayrollReport';
import PerformanceReport from './PerformanceReport';
import TurnoverReport from './TurnoverReport';
import OvertimeReport from './OvertimeReport';
import LateAbsenceReport from './LateAbsenceReport';
import EmployeeReport from './EmployeeReport';



type TabId = 'employee' | 'attendance' | 'leaves' | 'payroll' | 'performance' | 'turnover' | 'overtime' | 'late-absence' | 'training' | 'warnings' | 'kpis';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
  description: string;
}

const HRReportsHub: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>((searchParams.get('tab') as TabId) || 'employee');



  useEffect(() => {
    const tab = searchParams.get('tab') as TabId;
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const tabs: Tab[] = [
    { id: 'employee', label: 'تقرير الموظف الشامل', icon: Users, description: 'جميع أنشطة موظف معين' },
    { id: 'attendance', label: 'تقرير الحضور', icon: Clock, description: 'الحضور والانصراف والتأخير' },
    { id: 'leaves', label: 'تقرير الإجازات', icon: Calendar, description: 'طلبات الإجازات والرصيد' },
    { id: 'payroll', label: 'تقرير الرواتب', icon: DollarSign, description: 'الرواتب والبدلات والخصومات' },
    { id: 'performance', label: 'تقرير الأداء', icon: Award, description: 'تقييمات الأداء والأهداف' },
    { id: 'turnover', label: 'معدل دوران الموظفين', icon: Users, description: 'التوظيف والاستقالات' },
    { id: 'overtime', label: 'تقرير العمل الإضافي', icon: TrendingUp, description: 'ساعات العمل الإضافي' },
    { id: 'late-absence', label: 'التأخير والغياب', icon: AlertTriangle, description: 'تحليل التأخير والغياب' },
    { id: 'training', label: 'تقرير التدريب', icon: GraduationCap, description: 'البرامج التدريبية' },
    { id: 'warnings', label: 'تقرير الإنذارات', icon: FileText, description: 'الإنذارات والجزاءات' },
    { id: 'kpis', label: 'مؤشرات الأداء', icon: BarChart3, description: 'KPIs الموارد البشرية' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300" dir="rtl">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/hr')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400 rotate-180" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">تقارير الموارد البشرية</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">تقارير شاملة لجميع أنشطة الموارد البشرية</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex gap-6">
            {/* Sidebar Tabs */}
            <div className="w-72 flex-shrink-0">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden sticky top-6">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="font-semibold text-gray-900 dark:text-white">التقارير المتاحة</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">اختر التقرير المطلوب</p>
                </div>
                <nav className="p-2 max-h-[calc(100vh-200px)] overflow-y-auto font-ar">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`w-full flex items-start gap-3 px-4 py-3 rounded-lg text-right transition-colors mb-1 ${activeTab === tab.id
                        ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                      <tab.icon
                        className={`w-5 h-5 mt-0.5 flex-shrink-0 ${activeTab === tab.id ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'
                          }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{tab.label}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 text-right">
                          {tab.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-w-0">
              <ErrorBoundary>
                {activeTab === 'employee' && <EmployeeReport />}
                {activeTab === 'attendance' && <AttendanceReport />}
                {activeTab === 'leaves' && <LeaveReport />}
                {activeTab === 'payroll' && <PayrollReport />}
                {activeTab === 'performance' && <PerformanceReport />}
                {activeTab === 'turnover' && <TurnoverReport />}
                {activeTab === 'overtime' && <OvertimeReport />}
                {activeTab === 'late-absence' && <LateAbsenceReport />}
                {activeTab === 'training' && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
                    <div className="text-center">
                      <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        تقرير التدريب
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        قريباً - تقرير البرامج التدريبية وفعاليتها
                      </p>
                    </div>
                  </div>
                )}
                {activeTab === 'warnings' && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
                    <div className="text-center">
                      <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        تقرير الإنذارات
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        قريباً - تقرير الإنذارات والجزاءات التأديبية
                      </p>
                    </div>
                  </div>
                )}
                {activeTab === 'kpis' && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
                    <div className="text-center">
                      <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        مؤشرات الأداء الرئيسية
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        قريباً - Dashboard شامل لجميع مؤشرات الأداء الرئيسية
                      </p>
                    </div>
                  </div>
                )}
              </ErrorBoundary>
            </div>
          </div>
        </div>
    </div>
  );
};

export default HRReportsHub;

