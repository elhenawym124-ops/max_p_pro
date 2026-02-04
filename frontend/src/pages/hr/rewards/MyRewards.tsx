import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar, DollarSign, Star } from 'lucide-react';
import api from '@/services/api';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface RewardRecord {
    id: string;
    rewardName: string;
    rewardCategory: string;
    calculatedValue: number;
    periodStart: string;
    periodEnd: string;
    appliedAt: string;
    reason: string;
    status: string;
    rewardType: {
        name: string;
        category: string;
    };
}

const MyRewards: React.FC = () => {
    const { t } = useTranslation();
    const [rewards, setRewards] = useState<RewardRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalEarned: 0, count: 0 });

    useEffect(() => {
        fetchMyRewards();
    }, []);

    const fetchMyRewards = async () => {
        try {
            setLoading(true);
            const response = await api.get('/hr/rewards/my-rewards');
            if (response.data.success) {
                setRewards(response.data.data);
                calculateStats(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching rewards:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (data: RewardRecord[]) => {
        const total = data.reduce((sum, r) => sum + Number(r.calculatedValue || 0), 0);
        setStats({
            totalEarned: total,
            count: data.length
        });
    };

    if (loading) {
        return <div className="text-center py-10">جاري تحميل المكافآت...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-yellow-700">إجمالي المكافآت</p>
                            <h3 className="text-3xl font-bold text-yellow-900 mt-2">
                                {stats.totalEarned.toLocaleString()} جنية
                            </h3>
                        </div>
                        <div className="h-12 w-12 bg-yellow-200 rounded-full flex items-center justify-center">
                            <DollarSign className="h-6 w-6 text-yellow-700" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-blue-700">عدد المكافآت</p>
                            <h3 className="text-3xl font-bold text-blue-900 mt-2">
                                {stats.count}
                            </h3>
                        </div>
                        <div className="h-12 w-12 bg-blue-200 rounded-full flex items-center justify-center">
                            <Trophy className="h-6 w-6 text-blue-700" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Rewards List */}
            <Card>
                <CardHeader>
                    <CardTitle>سجل المكافآت</CardTitle>
                </CardHeader>
                <CardContent>
                    {rewards.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">
                            <Star className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p>لا توجد مكافآت مسجلة حتى الآن</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {rewards.map((reward) => (
                                <div key={reward.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="flex items-start gap-4">
                                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                            <GiftIcon category={reward.rewardCategory} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">{reward.rewardName}</h4>
                                            <p className="text-sm text-gray-500 mt-1">{reward.reason}</p>
                                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                                                <Calendar className="h-3 w-3" />
                                                <span>{format(new Date(reward.appliedAt), 'PPP', { locale: ar })}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 md:mt-0 text-left shrink-0">
                                        <div className="font-bold text-lg text-green-600">
                                            {Number(reward.calculatedValue) > 0 ? `+${Number(reward.calculatedValue)} جنية` : 'تقدير معنوي'}
                                        </div>
                                        <Badge variant="outline" className="mt-1">
                                            {getStatusLabel(reward.status)}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

const GiftIcon = ({ category }: { category: string }) => {
    switch (category) {
        case 'ATTENDANCE': return <Calendar className="h-5 w-5 text-green-600" />;
        case 'PERFORMANCE': return <Star className="h-5 w-5 text-yellow-600" />;
        default: return <Trophy className="h-5 w-5 text-purple-600" />;
    }
};

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'APPROVED': return 'تم الصرف';
        case 'PENDING': return 'قيد المراجعة';
        case 'APPLIED': return 'تم ترحيلها للراتب';
        case 'REJECTED': return 'مرفوضة';
        default: return status;
    }
};

export default MyRewards;
