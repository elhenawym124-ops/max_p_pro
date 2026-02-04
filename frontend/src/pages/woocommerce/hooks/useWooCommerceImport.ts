import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import io, { Socket } from 'socket.io-client';
import { WooOrder, ImportJob, Settings } from '../types';

export const useWooCommerceImport = (settings: Settings | null) => {
    const [loading, setLoading] = useState(false);
    const [wooOrders, setWooOrders] = useState<WooOrder[]>([]);
    const [activeJob, setActiveJob] = useState<ImportJob | null>(null);
    const [importing, setImporting] = useState(false);
    const [totalOrdersCount, setTotalOrdersCount] = useState<number | null>(null);
    const [countingOrders, setCountingOrders] = useState(false);
    const [selectedWooOrders, setSelectedWooOrders] = useState<Set<string>>(new Set());

    // Resume state if any
    const [resumeState, setResumeState] = useState<{
        currentPage: number;
        currentBatch: number;
        processedOrders: number;
        grandTotal: number;
        totalBatches: number;
        timestamp: string;
    } | null>(null);

    const socketRef = useRef<Socket | null>(null);
    const [showImportOptions, setShowImportOptions] = useState(false);
    const [importOptions, setImportOptions] = useState({
        limit: '10' as '10' | '50' | '100' | 'all',
        status: 'any',
        dateFrom: '',
        dateTo: '',
        batchSize: '50' as '50' | '100',
        duplicateAction: 'skip' as 'skip' | 'update'
    });

    // Socket.io initialization for real-time progress
    useEffect(() => {
        socketRef.current = io('/', {
            path: '/socket.io',
            transports: ['websocket'],
            upgrade: false,
            auth: {
                token: localStorage.getItem('accessToken')
            }
        });

        socketRef.current.on('connect', () => {
            console.log('🔌 Socket connected:', socketRef.current?.id);
        });

        socketRef.current.on('import:progress', (data: any) => {
            if (data.jobId && (!activeJob || activeJob.jobId === data.jobId)) {
                setActiveJob(prev => ({
                    ...prev!,
                    jobId: data.jobId,
                    type: 'import',
                    status: 'running',
                    progress: data
                }));
            }
        });

        socketRef.current.on('import:completed', (data: any) => {
            setActiveJob(prev => ({
                ...prev!,
                status: 'completed',
                progress: { ...prev!.progress, ...data.result, percentage: 100 }
            }));
            toast.success('تم اكتمال الاستيراد بنجاح!');
            setTimeout(() => setActiveJob(null), 5000);
        });

        socketRef.current.on('import:failed', (data: any) => {
            setActiveJob(prev => ({
                ...prev!,
                status: 'failed',
                progress: { ...prev!.progress, error: data.error }
            }));
            toast.error(`فشل الاستيراد: ${data.error}`);
        });

        return () => {
            socketRef.current?.disconnect();
        };
    }, []); // Logic simplified for hook context

    const loadActiveJobs = async () => {
        try {
            const response = await fetch('/api/v1/import-jobs/list', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
            });
            const data = await response.json();
            if (data.success && data.data) {
                // Find running job or most recent one
                const runningJob = data.data.find((j: any) => j.status === 'running' || j.status === 'pending');
                if (runningJob) {
                    setActiveJob(runningJob);
                } else if (data.data.length > 0) {
                    // Optionally show last completed job? For now just null if no running job
                    // setActiveJob(data.data[0]); 
                }
            }
        } catch (error) {
            console.error('Error loading active jobs', error);
        }
    };

    const fetchOrdersCount = async () => {
        if (!settings?.hasCredentials) {
            toast.error('يرجى إعداد بيانات الاتصال أولاً');
            return;
        }

        setCountingOrders(true);
        try {
            const response = await fetch('/api/v1/woocommerce/orders/count', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                },
                body: JSON.stringify({
                    status: importOptions.status !== 'any' ? importOptions.status : undefined,
                    after: importOptions.dateFrom || undefined,
                    before: importOptions.dateTo || undefined
                })
            });

            const data = await response.json();
            if (data.success) {
                setTotalOrdersCount(data.data.count);
                toast.success(`إجمالي الطلبات: ${data.data.count}`);
            }
        } catch (error) {
            console.error('Error counting orders:', error);
            toast.error('فشل في جلب عدد الطلبات');
        } finally {
            setCountingOrders(false);
        }
    };

    const fetchWooOrders = async () => {
        if (!settings?.hasCredentials) return;

        setLoading(true);
        setWooOrders([]);
        try {
            const response = await fetch('/api/v1/woocommerce/orders/fetch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                },
                body: JSON.stringify({
                    limit: importOptions.limit === 'all' ? 20 : parseInt(importOptions.limit),
                    status: importOptions.status !== 'any' ? importOptions.status : undefined,
                    after: importOptions.dateFrom || undefined,
                    before: importOptions.dateTo || undefined
                })
            });

            const data = await response.json();
            if (data.success) {
                setWooOrders(data.data.orders);
                toast.success(`تم جلب ${data.data.orders.length} طلب للمراجعة`);
            } else {
                toast.error(data.message);
            }
        } catch (error: any) {
            toast.error('خطأ في جلب الطلبات');
        } finally {
            setLoading(false);
        }
    };

    const startBackendImport = async () => {
        setImporting(true);
        try {
            const response = await fetch('/api/v1/import-jobs/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                },
                body: JSON.stringify({
                    type: 'orders',
                    limit: importOptions.limit === 'all' ? 0 : parseInt(importOptions.limit),
                    batchSize: parseInt(importOptions.batchSize),
                    status: importOptions.status,
                    dateFrom: importOptions.dateFrom,
                    dateTo: importOptions.dateTo,
                    duplicateAction: importOptions.duplicateAction
                })
            });
            const data = await response.json();
            if (data.success) {
                setActiveJob(data.data);
                toast.success('🚀 تم بدء الاستيراد في الخلفية');
            } else {
                toast.error(data.message);
            }
        } catch (error: any) {
            toast.error('فشل بدء الاستيراد');
        } finally {
            setImporting(false);
        }
    };

    const pauseBackendImport = async () => {
        if (!activeJob) return;
        try {
            await fetch(`/api/v1/import-jobs/pause/${activeJob.jobId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
            });
            toast.success('تم إرسال طلب الإيقاف المؤقت');
        } catch (e) { toast.error('فشل الإيقاف'); }
    };

    const resumeBackendImport = async () => {
        if (!activeJob) return;
        try {
            await fetch(`/api/v1/import-jobs/resume/${activeJob.jobId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
            });
            toast.success('تم استئناف الاستيراد');
        } catch (e) { toast.error('فشل الاستئناف'); }
    };

    const cancelBackendImport = async () => {
        if (!activeJob) return;
        try {
            await fetch(`/api/v1/import-jobs/cancel/${activeJob.jobId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
            });
            toast.success('تم إلغاء المهمة');
            setActiveJob(null);
        } catch (e) { toast.error('فشل الإلغاء'); }
    };

    const importSelectedOrders = async () => {
        if (selectedWooOrders.size === 0) return;

        setImporting(true);
        try {
            const ordersToImport = wooOrders.filter(o => selectedWooOrders.has(o.wooCommerceId));

            const response = await fetch('/api/v1/woocommerce/orders/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                },
                body: JSON.stringify({
                    orders: ordersToImport,
                    duplicateAction: importOptions.duplicateAction
                })
            });

            const data = await response.json();
            if (data.success) {
                toast.success(`تم استيراد ${data.data.imported} طلب بنجاح`);
                setSelectedWooOrders(new Set());
                // Remove imported orders from review list
                setWooOrders(prev => prev.filter(o => !selectedWooOrders.has(o.wooCommerceId)));
            } else {
                toast.error(data.message);
            }
        } catch (error: any) {
            toast.error('خطأ في استيراد الطلبات');
        } finally {
            setImporting(false);
        }
    };

    return {
        loading,
        importing,
        wooOrders,
        setWooOrders,
        activeJob,
        setActiveJob,
        totalOrdersCount,
        countingOrders,
        selectedWooOrders,
        setSelectedWooOrders,
        resumeState,
        loadActiveJobs,
        fetchOrdersCount,
        fetchWooOrders,
        startBackendImport,
        pauseBackendImport,
        resumeBackendImport,
        cancelBackendImport,
        importSelectedOrders,
        showImportOptions,
        setShowImportOptions,
        importOptions,
        setImportOptions
    };
};
