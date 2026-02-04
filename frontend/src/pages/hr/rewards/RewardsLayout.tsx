import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Gift, Award, ClipboardList, Briefcase, BarChart3, User } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuthSimple';

// Import components (Lazy loaded)
const RewardTypes = React.lazy(() => import('./RewardTypes'));
const RewardApplication = React.lazy(() => import('./RewardApplication'));
const MyRewards = React.lazy(() => import('./MyRewards'));
// const RewardReports = React.lazy(() => import('./RewardReports'));

const RewardsLayout: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('my-rewards');

    const isManager = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'].includes(user?.role || '');

    return (
        <div className="p-6 space-y-6" dir="rtl">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Gift className="h-8 w-8 text-primary" />
                    {t('rewards.pageTitle') || 'نظام المكافآت والحوافز'}
                </h1>
                <p className="text-gray-500 mt-1">
                    {t('rewards.pageDescription') || 'إدارة المكافآت، الحوافز، والتقدير الوظيفي.'}
                </p>
            </div>

            <Tabs defaultValue="my-rewards" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-5 h-auto">
                    <TabsTrigger value="my-rewards" className="py-3 flex gap-2">
                        <User className="h-4 w-4" />
                        {t('rewards.myRewards') || 'مكافآتي'}
                    </TabsTrigger>

                    {isManager && (
                        <>
                            <TabsTrigger value="apply" className="py-3 flex gap-2">
                                <Award className="h-4 w-4" />
                                {t('rewards.apply') || 'صرف مكافأة'}
                            </TabsTrigger>
                            <TabsTrigger value="types" className="py-3 flex gap-2">
                                <Briefcase className="h-4 w-4" />
                                {t('rewards.types') || 'أنواع المكافآت'}
                            </TabsTrigger>
                            {/* Future Implementation
              <TabsTrigger value="reports" className="py-3 flex gap-2">
                <BarChart3 className="h-4 w-4" />
                {t('rewards.reports') || 'التقارير'}
              </TabsTrigger>
              */}
                        </>
                    )}
                </TabsList>

                <div className="mt-6">
                    <React.Suspense fallback={<div className="p-8 text-center">جاري التحميل...</div>}>

                        <TabsContent value="my-rewards">
                            <MyRewards />
                        </TabsContent>

                        {isManager && (
                            <>
                                <TabsContent value="apply">
                                    <RewardApplication />
                                </TabsContent>

                                <TabsContent value="types">
                                    <RewardTypes />
                                </TabsContent>

                                {/* 
                <TabsContent value="reports">
                  <RewardReports />
                </TabsContent> 
                */}
                            </>
                        )}
                    </React.Suspense>
                </div>
            </Tabs>
        </div>
    );
};

export default RewardsLayout;
