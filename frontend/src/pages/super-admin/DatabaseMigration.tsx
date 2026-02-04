import React, { useState, useEffect, useRef } from 'react';
import { buildApiUrl } from '../../utils/urlHelper';
import {
    ServerIcon,
    PlayIcon,
    CheckCircleIcon,
    XCircleIcon,
    ArrowPathIcon,
    CommandLineIcon,
    ArrowDownTrayIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';

interface MigrationProgress {
    step: string;
    message: string;
    users: { total: number; imported: number; skipped: number };
    teamMembers: { total: number; imported: number; skipped: number };
    projects: { total: number; imported: number; skipped: number };
    releases: { total: number; imported: number; skipped: number };
    tasks: { total: number; imported: number; skipped: number };
    percentage: number;
}

interface LogEntry {
    timestamp: string;
    message: string;
    level: 'info' | 'warn' | 'error';
}

const DatabaseMigration: React.FC = () => {

    const [sourceUrl, setSourceUrl] = useState('mysql://u339372869_test2:0165676135Aa%40A@92.113.22.70:3306/u339372869_test2?charset=utf8mb4&collation=utf8mb4_unicode_ci');
    const [testing, setTesting] = useState(false);
    const [migrating, setMigrating] = useState(false);
    const [jobId, setJobId] = useState<string | null>(null);
    const [progress, setProgress] = useState<MigrationProgress | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const logEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // Polling for status if a job is active
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (migrating && jobId) {
            interval = setInterval(fetchJobStatus, 2000);
        }
        return () => clearInterval(interval);
    }, [migrating, jobId]);

    const fetchJobStatus = async () => {
        if (!jobId) return;
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(buildApiUrl(`super-admin/db-migration/status/${jobId}`), {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setProgress(data.data.progress);
                setLogs(data.data.logs);
                if (data.data.status === 'completed') {
                    setMigrating(false);
                    setSuccess('تم الانتهاء من عملية الاستيراد بنجاح!');
                } else if (data.data.status === 'failed') {
                    setMigrating(false);
                    setError(`فشلت العملية: ${data.data.error}`);
                }
            }
        } catch (err) {
            console.error('Failed to fetch status', err);
        }
    };

    const testConnection = async () => {
        setTesting(true);
        setError(null);
        setSuccess(null);
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(buildApiUrl('super-admin/db-migration/test-connection'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ url: sourceUrl })
            });
            const data = await response.json();
            if (data.success) {
                setSuccess('تم الاتصال بقاعدة البيانات بنجاح!');
            } else {
                setError(data.message || 'فشل الاتصال');
            }
        } catch (err) {
            setError('خطأ في الاتصال بالخادم');
        } finally {
            setTesting(false);
        }
    };

    const startMigration = async () => {
        if (!window.confirm('هل أنت متأكد من بدء عملية الاستيراد؟ قد يستغرق ذلك بعض الوقت.')) return;

        setMigrating(true);
        setError(null);
        setSuccess(null);
        setLogs([]);
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(buildApiUrl('super-admin/db-migration/start'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ url: sourceUrl })
            });
            const data = await response.json();
            if (data.success) {
                setJobId(data.data.jobId);
            } else {
                setError(data.message || 'فشل بدء العملية');
                setMigrating(false);
            }
        } catch (err) {
            setError('خطأ في الاتصال بالخادم');
            setMigrating(false);
        }
    };

    return (
        <div className="space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <ServerIcon className="h-8 w-8 text-indigo-500" />
                        استيراد بيانات التطوير
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">نقل المهام والمشاريع من قاعدة بيانات خارجية</p>
                </div>
            </div>

            {/* Configuration Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <CommandLineIcon className="h-5 w-5 text-indigo-500" />
                    إعدادات المصدر
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            رابط الاتصال (Connection URL)
                        </label>
                        <input
                            type="text"
                            value={sourceUrl}
                            onChange={(e) => setSourceUrl(e.target.value)}
                            disabled={migrating}
                            placeholder="mysql://user:pass@host:port/db"
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-gray-100 font-mono text-sm"
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={testConnection}
                            disabled={testing || migrating}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors disabled:opacity-50"
                        >
                            {testing ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <CheckCircleIcon className="h-5 w-5" />}
                            فحص الاتصال
                        </button>
                        <button
                            onClick={startMigration}
                            disabled={testing || migrating}
                            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 shadow-md shadow-indigo-200 dark:shadow-none"
                        >
                            {migrating ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <PlayIcon className="h-5 w-5" />}
                            بدء الاستيراد
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
                        <XCircleIcon className="h-6 w-6 flex-shrink-0" />
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3 text-green-700 dark:text-green-400">
                        <CheckCircleIcon className="h-6 w-6 flex-shrink-0" />
                        <p className="text-sm">{success}</p>
                    </div>
                )}
            </div>

            {/* Progress Section */}
            {(migrating || progress) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Progress Stats */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
                            <ArrowDownTrayIcon className="h-5 w-5 text-indigo-500" />
                            حالة النقل الحالية
                        </h3>

                        <div className="space-y-6">
                            {/* Progress Bar */}
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">الإنجاز الكلي</span>
                                    <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{progress?.percentage || 0}%</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                    <div
                                        className="bg-indigo-600 h-3 rounded-full transition-all duration-500 shadow-inner"
                                        style={{ width: `${progress?.percentage || 0}%` }}
                                    ></div>
                                </div>
                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 animate-pulse">
                                    الخطوة الحالية: <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{progress?.message || 'جاري المعالجة...'}</span>
                                </p>
                            </div>

                            {/* Detailed Stats */}
                            <div className="grid grid-cols-2 gap-4">
                                <StatBox label="المستخدمين" stats={progress?.users} icon={<UserGroupIcon className="h-5 w-5" />} />
                                <StatBox label="فريق العمل" stats={progress?.teamMembers} icon={<UserGroupIcon className="h-5 w-5" />} />
                                <StatBox label="المشاريع" stats={progress?.projects} icon={<FolderIcon className="h-5 w-5" />} />
                                <StatBox label="الإصدارات" stats={progress?.releases} icon={<TagIcon className="h-5 w-5" />} />
                                <div className="col-span-2">
                                    <StatBox label="المهام" stats={progress?.tasks} icon={<ClipboardDocumentListIcon className="h-5 w-5" />} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Terminal Logs */}
                    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 shadow-xl flex flex-col h-[400px]">
                        <div className="flex items-center justify-between mb-3 border-b border-gray-800 pb-2">
                            <div className="flex items-center gap-2 text-gray-400">
                                <CommandLineIcon className="h-4 w-4" />
                                <span className="text-xs font-mono uppercase tracking-wider font-bold">Migration Terminal</span>
                            </div>
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-500/30"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500/30"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500/30"></div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto font-mono text-sm space-y-1.5 custom-scrollbar pr-2">
                            {logs.map((log, i) => (
                                <div key={i} className={`flex gap-2 ${log.level === 'error' ? 'text-red-400' :
                                    log.level === 'warn' ? 'text-yellow-400' :
                                        'text-green-400/80'
                                    }`}>
                                    <span className="text-gray-600">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                    <span>{log.message}</span>
                                </div>
                            ))}
                            <div ref={logEndRef} />
                        </div>
                    </div>
                </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 flex gap-4">
                <InformationCircleIcon className="h-10 w-10 text-blue-500 flex-shrink-0" />
                <div>
                    <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-1 leading-tight">معلومات هامة</h4>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                        <li>يتم تجاهل البيانات الموجودة مسبقاً (Skipped) لتفادي التكرار.</li>
                        <li>يفضل فحص الاتصال (Test Connection) قبل البدء في الاستيراد الفعلي.</li>
                        <li>تأكد من وجود صلاحيات كافية للقراءة من قاعدة البيانات المصدر.</li>
                        <li>العملية تتم في الخلفية، يمكنك مغادرة الصفحة والعودة لمتابعة التقدم.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

interface StatBoxProps {
    label: string;
    stats?: { total: number; imported: number; skipped: number } | undefined;
    icon: React.ReactNode;
}

const StatBox: React.FC<StatBoxProps> = ({ label, stats, icon }) => (
    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700/50">
        <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-white dark:bg-gray-800 rounded shadow-sm text-gray-500">
                {icon}
            </div>
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{label}</span>
        </div>
        <div className="flex justify-between items-center px-1">
            <div className="text-center">
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-none">{stats?.total || 0}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">إجمالي</p>
            </div>
            <div className="h-8 w-px bg-gray-200 dark:bg-gray-800"></div>
            <div className="text-center">
                <p className="text-lg font-bold text-green-600 dark:text-green-500 leading-none">{stats?.imported || 0}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">تـم</p>
            </div>
            <div className="h-8 w-px bg-gray-200 dark:bg-gray-800"></div>
            <div className="text-center">
                <p className="text-lg font-bold text-yellow-600 dark:text-yellow-500 leading-none">{stats?.skipped || 0}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">تخطي</p>
            </div>
        </div>
    </div>
);

// Re-importing missing components from HeroIcons
const UserGroupIcon = (props: any) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.998 5.998 0 00-1.261-3.613m-2.482-4.469A4.5 4.5 0 0115 7.5a4.5 4.5 0 01-3.358 4.358m0 0a4.5 4.5 0 01-3.359-4.358m0 0A4.5 4.5 0 0112 3a4.5 4.5 0 015.753 5.432m-9.43 4.498a4.49 4.49 0 01-1.223 3.18m0 0a4.49 4.49 0 001.223 3.181m0 0a4.493 4.493 0 01-3.18-1.223m0 0a4.491 4.491 0 00-3.181 1.223m0 0A4.49 4.49 0 013 18.72a4.49 4.49 0 003.741-.479a3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.998 5.998 0 00-1.261-3.613m-2.482-4.469A4.5 4.5 0 0115 7.5a4.5 4.5 0 01-3.358 4.358m0 0a4.5 4.5 0 01-3.359-4.358" />
    </svg>
);

const FolderIcon = (props: any) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.625-12a2.25 2.25 0 00-2.25 2.25v2.25H3a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 003 21.75h18a2.25 2.25 0 002.25-2.25V8.25A2.25 2.25 0 0021 6h-8.25V3.75m0 0A2.25 2.25 0 0115.75 6h-3.75v-2.25A2.25 2.25 0 0114.25 1.5h-.75" />
    </svg>
);

const TagIcon = (props: any) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.659A2.25 2.25 0 009.568 3zm.432 0v4.5M4.5 12l4.5 4.5m10.5-1.5l1.5-1.5" />
    </svg>
);

const ClipboardDocumentListIcon = (props: any) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0018 4.5h-1.35m-10.5 0H4.5A2.25 2.25 0 002.25 6.75v12a2.25 2.25 0 002.25 2.25h1.35m10.5-15V3.75A.75.75 0 0015 3h-6a.75.75 0 00-.75.75V4.5m10.5 0H7.5" />
    </svg>
);

export default DatabaseMigration;
