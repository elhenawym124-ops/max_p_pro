import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Settings } from '../types';

export const useWooCommerceSettings = () => {
    const [loading, setLoading] = useState(false);
    const [testingConnection, setTestingConnection] = useState(false);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [settingsForm, setSettingsForm] = useState({
        storeUrl: '',
        consumerKey: '',
        consumerSecret: '',
        syncEnabled: false,
        syncDirection: 'both',
        syncInterval: 15,
        autoImport: false,
        autoExport: false,
        webhookEnabled: false,
        statusMapping: {} as Record<string, string>
    });

    // Ngrok URL state (for local development webhooks)
    const [ngrokUrl, setNgrokUrl] = useState(() => {
        return localStorage.getItem('woocommerce_ngrok_url') || '';
    });

    const loadSettings = useCallback(async () => {
        try {
            const response = await fetch('/api/v1/woocommerce/settings', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            });
            const data = await response.json();
            if (data.success && data.data) {
                setSettings(data.data);
                setSettingsForm({
                    storeUrl: data.data.storeUrl,
                    consumerKey: '', // Security: Don't show actual keys
                    consumerSecret: '',
                    syncEnabled: data.data.syncEnabled,
                    syncDirection: data.data.syncDirection,
                    syncInterval: data.data.syncInterval,
                    autoImport: data.data.syncDirection === 'import_only' || data.data.syncDirection === 'both',
                    autoExport: data.data.syncDirection === 'export_only' || data.data.syncDirection === 'both',
                    webhookEnabled: data.data.webhookEnabled,
                    statusMapping: data.data.statusMapping || {}
                });
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            toast.error('فشل جلب الإعدادات');
        }
    }, []);

    const saveSettings = async () => {
        // Check required fields (allow empty keys if present in system)
        const hasKeys = settings?.hasCredentials || (settingsForm.consumerKey && settingsForm.consumerSecret);

        if (!settingsForm.storeUrl || !hasKeys) {
            toast.error('جميع بيانات الاتصال مطلوبة');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/v1/woocommerce/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                },
                body: JSON.stringify(settingsForm)
            });

            const data = await response.json();
            if (data.success) {
                toast.success('تم حفظ الإعدادات بنجاح');
                loadSettings();
            } else {
                toast.error(data.message);
            }
        } catch (error: any) {
            toast.error('خطأ في حفظ الإعدادات');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const testConnection = async () => {
        if (!settingsForm.storeUrl || !settingsForm.consumerKey || !settingsForm.consumerSecret) {
            toast.error('يرجى ملء جميع الحقول أولاً');
            return;
        }

        setTestingConnection(true);
        try {
            const response = await fetch('/api/v1/woocommerce/fetch-products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                },
                body: JSON.stringify({
                    storeUrl: settingsForm.storeUrl,
                    consumerKey: settingsForm.consumerKey,
                    consumerSecret: settingsForm.consumerSecret
                })
            });

            const data = await response.json();
            if (data.success) {
                toast.success(`✅ الاتصال ناجح! تم العثور على ${data.data.count} منتج`);
            } else {
                toast.error(`❌ فشل الاتصال: ${data.message}`);
            }
        } catch (error: any) {
            toast.error('❌ خطأ في اختبار الاتصال');
        } finally {
            setTestingConnection(false);
        }
    };

    const setupWebhooks = async (customNgrokUrl?: string) => {
        const urlToUse = customNgrokUrl || ngrokUrl;

        // Check for ngrok on localhost
        if (window.location.hostname === 'localhost' && !urlToUse) {
            toast.error('يرجى إدخال ngrok URL للاختبار على localhost');
            return;
        }

        if (urlToUse) {
            localStorage.setItem('woocommerce_ngrok_url', urlToUse);
            setNgrokUrl(urlToUse);
        }

        setLoading(true);
        try {
            const response = await fetch('/api/v1/woocommerce/webhooks/setup', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ngrokUrl: urlToUse || undefined })
            });

            const data = await response.json();
            if (data.success) {
                toast.success(data.message);
                if (data.data?.webhookUrl) {
                    toast.success(`Webhook URL: ${data.data.webhookUrl}`, { duration: 5000 });
                }
                loadSettings();
            } else {
                toast.error(data.message);
            }
        } catch (error: any) {
            toast.error('خطأ في إعداد Webhooks');
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        testingConnection,
        settings,
        settingsForm,
        setSettingsForm,
        ngrokUrl,
        setNgrokUrl,
        loadSettings,
        saveSettings,
        testConnection,
        setupWebhooks
    };
};
