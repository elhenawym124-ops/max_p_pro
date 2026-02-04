
import React, { useState, useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { buildApiUrl } from '../../utils/urlHelper';
import {
    TrophyIcon,
    FireIcon,
    StarIcon,
    UserIcon,
    SparklesIcon
} from '@heroicons/react/24/solid';

interface LeaderboardEntry {
    id: string;
    rank: number;
    name: string;
    avatar: string | null;
    xp: number;
    level: number;
    badges: string[];
}

const DevLeaderboard: React.FC = () => {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const fetchLeaderboard = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(buildApiUrl('super-admin/dev/leaderboard'), {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setLeaderboard(data.data);
            }
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const TopThree = ({ first, second, third }: { first?: LeaderboardEntry, second?: LeaderboardEntry, third?: LeaderboardEntry }) => (
        <div className="flex justify-center items-end gap-4 mb-12">
            {/* Second Place */}
            {second && (
                <div className="flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full border-4 border-gray-300 dark:border-gray-600 overflow-hidden mb-2 relative">
                        {second.avatar ? (
                            <img src={second.avatar} alt={second.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                <UserIcon className="h-10 w-10 text-gray-400" />
                            </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100 w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 border-white dark:border-gray-800">
                            2
                        </div>
                    </div>
                    <div className="text-center">
                        <h3 className="font-bold text-gray-900 dark:text-gray-100">{second.name}</h3>
                        <p className="text-sm text-gray-500 font-semibold">{second.xp} XP</p>
                    </div>
                    <div className="h-24 w-20 bg-gray-200 dark:bg-gray-700 rounded-t-lg mt-2 flex items-end justify-center pb-2">
                        <span className="text-3xl">🥈</span>
                    </div>
                </div>
            )}

            {/* First Place */}
            {first && (
                <div className="flex flex-col items-center transform -translate-y-4">
                    <div className="relative">
                        <FireIcon className="h-8 w-8 text-orange-500 absolute -top-10 left-1/2 transform -translate-x-1/2 animate-bounce" />
                        <div className="w-24 h-24 rounded-full border-4 border-yellow-400 overflow-hidden mb-2 relative shadow-[0_0_15px_rgba(250,204,21,0.5)]">
                            {first.avatar ? (
                                <img src={first.avatar} alt={first.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                                    <UserIcon className="h-12 w-12 text-yellow-500" />
                                </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 border-white dark:border-gray-800">
                                1
                            </div>
                        </div>
                    </div>
                    <div className="text-center">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{first.name}</h3>
                        <p className="text-sm text-yellow-600 dark:text-yellow-400 font-bold">{first.xp} XP</p>
                    </div>
                    <div className="h-32 w-24 bg-yellow-400/20 dark:bg-yellow-400/10 border-t-4 border-yellow-400 rounded-t-lg mt-2 flex items-end justify-center pb-4">
                        <TrophyIcon className="h-12 w-12 text-yellow-500" />
                    </div>
                </div>
            )}

            {/* Third Place */}
            {third && (
                <div className="flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full border-4 border-orange-300 dark:border-orange-800 overflow-hidden mb-2 relative">
                        {third.avatar ? (
                            <img src={third.avatar} alt={third.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                <UserIcon className="h-10 w-10 text-orange-400" />
                            </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 bg-orange-300 dark:bg-orange-800 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 border-white dark:border-gray-800">
                            3
                        </div>
                    </div>
                    <div className="text-center">
                        <h3 className="font-bold text-gray-900 dark:text-gray-100">{third.name}</h3>
                        <p className="text-sm text-gray-500 font-semibold">{third.xp} XP</p>
                    </div>
                    <div className="h-20 w-20 bg-orange-100 dark:bg-orange-900/20 rounded-t-lg mt-2 flex items-end justify-center pb-2">
                        <span className="text-3xl">🥉</span>
                    </div>
                </div>
            )}
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="w-full" dir="rtl">
            <div className="text-center mb-10">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center justify-center gap-3">
                    <SparklesIcon className="h-8 w-8 text-yellow-500" />
                    لوحة أبطال التطوير
                    <SparklesIcon className="h-8 w-8 text-yellow-500" />
                </h1>
                <p className="text-gray-500 mt-2">ترتيب المطورين بناءً على نقاط الخبرة (XP) والإنجازات</p>
            </div>

            <TopThree first={leaderboard[0]} second={leaderboard[1]} third={leaderboard[2]} />

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                            <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المطور</th>
                            <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المستوى</th>
                            <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نقاط الخبرة (XP)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {leaderboard.slice(3).map((member) => (
                            <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {member.rank}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                        {member.avatar ? (
                                            <img src={member.avatar} alt="" className="w-8 h-8 rounded-full" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                                                {member.name.charAt(0)}
                                            </div>
                                        )}
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{member.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400">
                                        Level {member.level}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                    {member.xp.toLocaleString()} XP
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DevLeaderboard;

