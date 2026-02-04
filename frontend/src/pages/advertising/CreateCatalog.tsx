/**
 * Create Catalog Page
 * 
 * صفحة إنشاء Product Catalog جديد
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeftIcon,
    PlusIcon,
    ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
    facebookAdsService,
    CreateCatalogData,
} from '../../services/facebookAdsService';

const CreateCatalog: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<CreateCatalogData>({
        name: '',
        description: '',
        businessId: '',
        catalogType: 'PRODUCTS',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [adAccounts, setAdAccounts] = useState<any[]>([]);

    useEffect(() => {
        loadAdAccounts();
    }, []);

    const loadAdAccounts = async () => {
        try {
            const data = await facebookAdsService.getAdAccounts();
            setAdAccounts(data);
        } catch (error) {
            console.error('Error loading ad accounts:', error);
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors['name'] = 'اسم الـ Catalog مطلوب';
        if (!formData.businessId.trim()) newErrors['businessId'] = 'Business ID مطلوب';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            setLoading(true);
            await facebookAdsService.createCatalog(formData);
            toast.success('تم إنشاء Catalog بنجاح');
            navigate('/advertising/facebook-ads/catalogs');
        } catch (error: any) {
            console.error('Error creating catalog:', error);
            const errorMsg = error?.response?.data?.error || 'فشل في إنشاء Catalog';
            toast.error(errorMsg);

            // Map backend errors to fields if possible
            if (errorMsg.toLowerCase().includes('name')) {
                setErrors(prev => ({ ...prev, name: errorMsg }));
            } else if (errorMsg.toLowerCase().includes('business')) {
                setErrors(prev => ({ ...prev, businessId: errorMsg }));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            const newErrors = { ...errors };
            delete newErrors[name];
            setErrors(newErrors);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/advertising/facebook-ads/catalogs')}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-full"
                >
                    <ArrowLeftIcon className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">إنشاء Catalog جديد</h1>
                    <p className="mt-1 text-sm text-gray-600">
                        أدخل بيانات الـ Catalog لربطه بمنتجات متجرك
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg overflow-hidden">
                <div className="p-6 space-y-6">
                    {/* Name */}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                            اسم الـ Catalog <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="مثال: متجر الملابس الرئيسي"
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${errors['name'] ? 'border-red-500' : 'border-gray-300'
                                }`}
                        />
                        {errors['name'] && (
                            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                                <ExclamationCircleIcon className="w-4 h-4" />
                                {errors['name']}
                            </p>
                        )}
                    </div>

                    {/* Business ID */}
                    <div>
                        <label htmlFor="businessId" className="block text-sm font-medium text-gray-700 mb-1">
                            Facebook Business ID <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="businessId"
                            name="businessId"
                            value={formData.businessId}
                            onChange={handleChange}
                            placeholder="أدخل Business ID الخاص بك"
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${errors['businessId'] ? 'border-red-500' : 'border-gray-300'
                                }`}
                        />
                        {errors['businessId'] && (
                            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                                <ExclamationCircleIcon className="w-4 h-4" />
                                {errors['businessId']}
                            </p>
                        )}
                        <p className="mt-2 text-xs text-gray-500">
                            يمكنك الحصول عليه من إعدادات Business Manager
                        </p>
                    </div>

                    {/* Ad Account Selection */}
                    <div>
                        <label htmlFor="adAccountId" className="block text-sm font-medium text-gray-700 mb-1">
                            Ad Account (اختياري)
                        </label>
                        <select
                            id="adAccountId"
                            name="adAccountId"
                            value={formData.adAccountId || ''}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="">اختر Ad Account...</option>
                            {adAccounts.map(account => (
                                <option key={account.id} value={account.id}>
                                    {account.name} ({account.account_id})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                            وصف (اختياري)
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={3}
                            placeholder="اكتب وصفاً مختصراً للـ Catalog"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                </div>

                <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => navigate('/advertising/facebook-ads/catalogs')}
                        className="px-4 py-2 text-gray-700 hover:text-gray-900"
                    >
                        إلغاء
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {loading ? (
                            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                            <PlusIcon className="w-5 h-5" />
                        )}
                        إنشاء Catalog
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateCatalog;
