import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tokenManager } from '../../utils/tokenManager';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
    Package,
    Check,
    Star,
    TrendingUp,
    Zap,
    Gift,
    DollarSign,
    ArrowRight,
    ShieldCheck,
    Clock
} from 'lucide-react';

const API_URL = import.meta.env['VITE_API_URL'] || 'https://maxp-ai.pro';

interface Bundle {
    id: string;
    name: string;
    slug: string;
    description: string;
    price: number;
    discount: number;
    isActive: boolean;
    monthlyPrice: number;
    yearlyPrice?: number;
    apps: Array<{
        id: string;
        name: string;
        slug: string;
        description: string;
        monthlyPrice: number;
        logo?: string;
    }>;
}

export default function BundleDetails() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const [bundle, setBundle] = useState<Bundle | null>(null);
    const [loading, setLoading] = useState(true);
    const [activating, setActivating] = useState(false);

    useEffect(() => {
        if (slug) {
            fetchBundleDetails();
        }
    }, [slug]);

    const fetchBundleDetails = async () => {
        try {
            setLoading(true);
            const token = tokenManager.getAccessToken();
            if (!token) {
                // Allow viewing without token, but subscribe will redirect
                // For now, let's assume we need token to fetch full details including status
            }

            const response = await axios.get(
                `${API_URL}/api/v1/marketplace/bundles/${slug}`,
                { headers: token ? { Authorization: `Bearer ${token}` } : {} }
            );

            if (response.data.success) {
                setBundle(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching bundle:', error);
            toast.error('لم يتم العثور على الباقة');
            navigate('/marketplace/bundles');
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async () => {
        const token = tokenManager.getAccessToken();
        if (!token) {
            navigate('/auth/login', { state: { from: `/marketplace/bundle/${slug}` } });
            return;
        }

        try {
            setActivating(true);
            const response = await axios.post(
                `${API_URL}/api/v1/marketplace/bundles/${slug}/subscribe`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                toast.success(response.data.message);
                setTimeout(() => {
                    navigate('/marketplace/my-apps');
                }, 1500);
            }
        } catch (error: any) {
            console.error('Subscription error:', error);
            if (error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error('حدث خطأ أثناء الاشتراك');
            }
        } finally {
            setActivating(false);
        }
    };

    const calculateOriginalPrice = (b: Bundle) => {
        return b.apps.reduce((sum, app) => sum + parseFloat(app.monthlyPrice.toString()), 0);
    };

    const calculateSavings = (b: Bundle) => {
        const original = calculateOriginalPrice(b);
        const bundlePrice = parseFloat(b.monthlyPrice.toString()) || parseFloat(b.price.toString());
        return original - bundlePrice;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    if (!bundle) return null;

    const originalPrice = calculateOriginalPrice(bundle);
    const bundlePrice = parseFloat(bundle.monthlyPrice?.toString() || bundle.price?.toString() || '0');
    const savings = calculateSavings(bundle);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
            {/* Hero Section */}
            <div className="bg-gradient-to-br from-purple-700 via-indigo-600 to-blue-600 text-white pt-24 pb-32 rounded-b-[3rem] shadow-xl relative overflow-hidden">
                {/* Background Patterns */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10">
                    <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-10 right-10 w-96 h-96 bg-yellow-300 rounded-full mix-blend-overlay filter blur-3xl animate-pulse delay-700"></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                        <div className="flex-1 text-center md:text-right">
                            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-6 border border-white/10">
                                <Gift className="w-4 h-4 text-yellow-300" />
                                <span>عرض حصري لفترة محدودة</span>
                            </div>
                            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                                {bundle.name}
                            </h1>
                            <p className="text-xl text-indigo-100 mb-8 max-w-2xl leading-relaxed">
                                {bundle.description}
                            </p>

                            <div className="flex flex-wrap items-center gap-4 justify-center md:justify-start">
                                <div className="flex items-center gap-2 bg-black/20 px-6 py-3 rounded-2xl backdrop-blur-md">
                                    <span className="text-gray-300 line-through text-lg">{originalPrice.toFixed(0)} ج.م</span>
                                    <span className="text-3xl font-bold text-white">{bundlePrice.toFixed(0)} ج.م</span>
                                    <span className="text-sm text-gray-300">/ شهرياً</span>
                                </div>
                                <div className="bg-green-500/20 text-green-300 px-4 py-3 rounded-2xl border border-green-500/30 flex items-center gap-2 font-bold">
                                    <TrendingUp size={20} />
                                    توفير {savings.toFixed(0)} ج.م
                                </div>
                            </div>
                        </div>

                        <div className="hidden md:block">
                            {/* Abstract visual or Icon for bundle */}
                            <div className="bg-white/10 p-8 rounded-3xl backdrop-blur-md border border-white/20 transform rotate-3 hover:rotate-0 transition-all duration-500">
                                <Package size={120} className="text-white opacity-90" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-20">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content (Apps List) */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                                <Zap className="text-yellow-500" />
                                ماذا تتضمن الباقة؟
                            </h2>
                            <div className="space-y-4">
                                {bundle.apps.map((app) => (
                                    <div key={app.id} className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-100 dark:border-gray-700">
                                        <div className="bg-indigo-100 dark:bg-indigo-900/50 p-3 rounded-xl">
                                            <Package className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{app.name}</h3>
                                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600">
                                                    {app.monthlyPrice} ج.م
                                                </span>
                                            </div>
                                            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                                                {app.description}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Features/Trust Section */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg text-center">
                                <ShieldCheck className="w-10 h-10 text-green-500 mx-auto mb-3" />
                                <h3 className="font-bold text-gray-900 dark:text-white mb-1">دفع آمن</h3>
                                <p className="text-sm text-gray-500">عمليات دفع مشفرة وآمنة تماماً</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg text-center">
                                <Clock className="w-10 h-10 text-blue-500 mx-auto mb-3" />
                                <h3 className="font-bold text-gray-900 dark:text-white mb-1">تفعيل فوري</h3>
                                <p className="text-sm text-gray-500">ابدأ استخدام الأدوات فور الاشتراك</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg text-center">
                                <Star className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
                                <h3 className="font-bold text-gray-900 dark:text-white mb-1">دعم فني</h3>
                                <p className="text-sm text-gray-500">فريق دعم جاهز لمساعدتك دائماً</p>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar / Sticky Action Card */}
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 sticky top-24 border border-gray-100 dark:border-gray-700">
                            <div className="text-center mb-6">
                                <p className="text-gray-500 dark:text-gray-400 mb-2">السعر الإجمالي للباقة</p>
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <span className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">
                                        {bundlePrice.toFixed(0)}
                                    </span>
                                    <span className="text-xl font-medium text-gray-400">ج.م</span>
                                </div>
                                <div className="inline-block bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-1 rounded-full text-sm font-medium">
                                    وفرت {savings.toFixed(0)} ج.م ({((savings / originalPrice) * 100).toFixed(0)}%)
                                </div>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">القيمة الفعلية</span>
                                    <span className="text-gray-900 dark:text-white line-through">{originalPrice} ج.م</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">الخصم</span>
                                    <span className="text-green-600 font-bold">-{savings} ج.م</span>
                                </div>
                                <div className="h-px bg-gray-100 dark:bg-gray-700 my-4"></div>
                                <div className="flex justify-between font-bold text-lg">
                                    <span className="text-gray-900 dark:text-white">الإجمالي</span>
                                    <span className="text-indigo-600">{bundlePrice} ج.م</span>
                                </div>
                            </div>

                            <button
                                onClick={handleSubscribe}
                                disabled={activating}
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {activating ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        جاري التفعيل...
                                    </>
                                ) : (
                                    <>
                                        اشترك الآن
                                        <ArrowRight size={20} />
                                    </>
                                )}
                            </button>

                            <p className="text-center text-xs text-gray-400 mt-4">
                                تطبق الشروط والأحكام. يمكنك إلغاء الاشتراك في أي وقت.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
