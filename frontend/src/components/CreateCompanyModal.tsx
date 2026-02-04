import React, { useState } from 'react';
import {
    XMarkIcon,
    BuildingOffice2Icon,
    EnvelopeIcon,
    PhoneIcon,
    GlobeAltIcon,
    MapPinIcon,
    CurrencyDollarIcon,
    ClockIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { apiClient } from '../services/apiClient';

interface CreateCompanyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface FormData {
    name: string;
    email: string;
    phone: string;
    website: string;
    address: string;
    plan: string;
    currency: string;
    timezone: string;
}

const CreateCompanyModal: React.FC<CreateCompanyModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<FormData>({
        name: '',
        email: '',
        phone: '',
        website: '',
        address: '',
        plan: 'BASIC',
        currency: 'EGP',
        timezone: 'Africa/Cairo'
    });

    const [errors, setErrors] = useState<Partial<FormData>>({});

    const plans = [
        { value: 'BASIC', label: 'أساسية - Basic' },
        { value: 'PROFESSIONAL', label: 'احترافية - Professional' },
        { value: 'ENTERPRISE', label: 'مؤسسية - Enterprise' }
    ];

    const currencies = [
        { value: 'EGP', label: 'جنيه مصري - EGP', symbol: 'ج.م' },
        { value: 'USD', label: 'دولار أمريكي - USD', symbol: '$' },
        { value: 'SAR', label: 'ريال سعودي - SAR', symbol: 'ر.س' },
        { value: 'AED', label: 'درهم إماراتي - AED', symbol: 'د.إ' },
        { value: 'EUR', label: 'يورو - EUR', symbol: '€' }
    ];

    const timezones = [
        { value: 'Africa/Cairo', label: 'القاهرة (GMT+2)' },
        { value: 'Asia/Riyadh', label: 'الرياض (GMT+3)' },
        { value: 'Asia/Dubai', label: 'دبي (GMT+4)' },
        { value: 'Europe/London', label: 'لندن (GMT+0)' },
        { value: 'America/New_York', label: 'نيويورك (GMT-5)' }
    ];

    const validateForm = (): boolean => {
        const newErrors: Partial<FormData> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'اسم الشركة مطلوب';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'البريد الإلكتروني مطلوب';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'البريد الإلكتروني غير صحيح';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await apiClient.post('/owner/companies', {
                name: formData.name.trim(),
                email: formData.email.trim(),
                phone: formData.phone.trim() || undefined,
                website: formData.website.trim() || undefined,
                address: formData.address.trim() || undefined,
                plan: formData.plan,
                currency: formData.currency,
                timezone: formData.timezone
            });

            if (response.data.success) {
                toast.success('تم إنشاء الشركة بنجاح! 🎉');
                onSuccess();
                handleClose();
            } else {
                toast.error(response.data.message || 'فشل في إنشاء الشركة');
            }
        } catch (error: any) {
            console.error('Error creating company:', error);
            const errorMessage = error.response?.data?.message || 'حدث خطأ أثناء إنشاء الشركة';
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFormData({
            name: '',
            email: '',
            phone: '',
            website: '',
            address: '',
            plan: 'BASIC',
            currency: 'EGP',
            timezone: 'Africa/Cairo'
        });
        setErrors({});
        onClose();
    };

    const handleChange = (field: keyof FormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                {/* Overlay */}
                <div
                    className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80"
                    onClick={handleClose}
                />

                {/* Modal */}
                <div className="inline-block w-full max-w-2xl my-8 overflow-hidden text-right align-middle transition-all transform bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <BuildingOffice2Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">إضافة شركة جديدة</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">أدخل بيانات الشركة الجديدة</p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        {/* Company Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                اسم الشركة <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <BuildingOffice2Icon className="w-5 h-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    className={`block w-full pr-10 border rounded-lg px-4 py-2.5 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                        errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                    placeholder="مثال: شركة التقنية المتقدمة"
                                />
                            </div>
                            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                البريد الإلكتروني <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <EnvelopeIcon className="w-5 h-5 text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    className={`block w-full pr-10 border rounded-lg px-4 py-2.5 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                        errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                    placeholder="company@example.com"
                                />
                            </div>
                            {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                        </div>

                        {/* Phone & Website */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    رقم الهاتف
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                        <PhoneIcon className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => handleChange('phone', e.target.value)}
                                        className="block w-full pr-10 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="+20 123 456 7890"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    الموقع الإلكتروني
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                        <GlobeAltIcon className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="url"
                                        value={formData.website}
                                        onChange={(e) => handleChange('website', e.target.value)}
                                        className="block w-full pr-10 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="https://example.com"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Address */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                العنوان
                            </label>
                            <div className="relative">
                                <div className="absolute top-3 right-0 flex items-center pr-3 pointer-events-none">
                                    <MapPinIcon className="w-5 h-5 text-gray-400" />
                                </div>
                                <textarea
                                    value={formData.address}
                                    onChange={(e) => handleChange('address', e.target.value)}
                                    rows={2}
                                    className="block w-full pr-10 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="العنوان الكامل للشركة"
                                />
                            </div>
                        </div>

                        {/* Plan, Currency, Timezone */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    الخطة
                                </label>
                                <select
                                    value={formData.plan}
                                    onChange={(e) => handleChange('plan', e.target.value)}
                                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    {plans.map(plan => (
                                        <option key={plan.value} value={plan.value}>{plan.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    العملة
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                        <CurrencyDollarIcon className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <select
                                        value={formData.currency}
                                        onChange={(e) => handleChange('currency', e.target.value)}
                                        className="block w-full pr-10 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        {currencies.map(currency => (
                                            <option key={currency.value} value={currency.value}>{currency.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    المنطقة الزمنية
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                        <ClockIcon className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <select
                                        value={formData.timezone}
                                        onChange={(e) => handleChange('timezone', e.target.value)}
                                        className="block w-full pr-10 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        {timezones.map(tz => (
                                            <option key={tz.value} value={tz.value}>{tz.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex-1 px-4 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
                            >
                                إلغاء
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>جاري الإنشاء...</span>
                                    </>
                                ) : (
                                    <>
                                        <BuildingOffice2Icon className="w-5 h-5" />
                                        <span>إنشاء الشركة</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateCompanyModal;
