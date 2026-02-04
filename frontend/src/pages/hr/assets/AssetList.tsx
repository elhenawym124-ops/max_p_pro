import React, { useState, useEffect } from 'react';
import {
    MagnifyingGlassIcon,
    FunnelIcon,
    PencilSquareIcon,
    TrashIcon,
    UserPlusIcon,
    ArrowUturnLeftIcon
} from '@heroicons/react/24/outline';
import { companyAwareApi } from '../../../services/companyAwareApi';
import { useCurrency } from '../../../hooks/useCurrency';
import AssetForm from './AssetForm';
import AssetAssignmentModal from './AssetAssignmentModal';

interface AssetListProps {
    refreshTrigger: number;
}

const AssetList: React.FC<AssetListProps> = ({ refreshTrigger }) => {
    const [assets, setAssets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({ status: '', categoryId: '' });
    const [categories, setCategories] = useState<any[]>([]);
    const { formatPrice } = useCurrency();

    // Modals
    const [editingAsset, setEditingAsset] = useState<any>(null);
    const [assigningAsset, setAssigningAsset] = useState<any>(null);

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        fetchAssets();
    }, [refreshTrigger, search, filters]);

    const fetchCategories = async () => {
        try {
            const response = await companyAwareApi.get('/assets/categories');
            if (response.data.success) {
                setCategories(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchAssets = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (filters.status) params.append('status', filters.status);
            if (filters.categoryId) params.append('categoryId', filters.categoryId);

            const response = await companyAwareApi.get(`/assets?${params.toString()}`);
            if (response.data.success) {
                setAssets(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching assets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا الأصل؟')) return;

        try {
            const response = await companyAwareApi.delete(`/assets/${id}`);
            if (response.data.success) {
                fetchAssets();
            }
        } catch (error) {
            console.error('Error deleting asset:', error);
            alert('فشل في حذف الأصل');
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            AVAILABLE: 'bg-green-100 text-green-800',
            IN_USE: 'bg-blue-100 text-blue-800',
            MAINTENANCE: 'bg-yellow-100 text-yellow-800',
            RETIRED: 'bg-gray-100 text-gray-800',
            LOST: 'bg-red-100 text-red-800',
            RESERVED: 'bg-purple-100 text-purple-800',
        };

        const labels: Record<string, string> = {
            AVAILABLE: 'متاح',
            IN_USE: 'في الاستخدام',
            MAINTENANCE: 'في الصيانة',
            RETIRED: 'تالف/مكهن',
            LOST: 'مفقود',
            RESERVED: 'محجوز',
        };

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>
                {labels[status] || status}
            </span>
        );
    };

    return (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
            {/* Filters */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4 md:space-x-reverse">
                    <div className="flex-1 relative">
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pr-10 pl-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                            placeholder="بحث بالاسم، الكود، الرقم التسلسلي..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="flex space-x-2 space-x-reverse">
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            <option value="">جميع الحالات</option>
                            <option value="AVAILABLE">متاح</option>
                            <option value="IN_USE">في الاستخدام</option>
                            <option value="MAINTENANCE">في الصيانة</option>
                            <option value="RETIRED">تالف/مكهن</option>
                            <option value="LOST">مفقود</option>
                        </select>

                        <select
                            value={filters.categoryId}
                            onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
                            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            <option value="">جميع التصنيفات</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                الأصل
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                التصنيف
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                الحالة
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                العهدة الحالية
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                القيمة
                            </th>
                            <th scope="col" className="relative px-6 py-3">
                                <span className="sr-only">إجراءات</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-4 text-center">
                                    <div className="flex justify-center">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                                    </div>
                                </td>
                            </tr>
                        ) : assets.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                    لا توجد أصول مسجلة حالياً
                                </td>
                            </tr>
                        ) : (
                            assets.map((asset) => (
                                <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {asset.name}
                                                </div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    {asset.code && <span className="ml-2 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">{asset.code}</span>}
                                                    {asset.model && <span>{asset.model}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {asset.category?.name || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusBadge(asset.status)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {asset.currentHolder ? (
                                            <div className="flex items-center">
                                                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold ml-2">
                                                    {asset.currentHolder.firstName.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-medium">{asset.currentHolder.firstName} {asset.currentHolder.lastName}</div>
                                                    <div className="text-xs">{asset.currentHolder.employeeNumber}</div>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {asset.purchaseValue ? formatPrice(asset.purchaseValue) : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end space-x-2 space-x-reverse">
                                            {asset.status === 'AVAILABLE' ? (
                                                <button
                                                    onClick={() => setAssigningAsset({ ...asset, type: 'assign' })}
                                                    className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-1 rounded hover:bg-indigo-100"
                                                    title="تسليم عهدة"
                                                >
                                                    <UserPlusIcon className="h-5 w-5" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => setAssigningAsset({ ...asset, type: 'return' })}
                                                    className="text-orange-600 hover:text-orange-900 bg-orange-50 p-1 rounded hover:bg-orange-100"
                                                    title="استرجاع عهدة"
                                                >
                                                    <ArrowUturnLeftIcon className="h-5 w-5" />
                                                </button>
                                            )}

                                            <button
                                                onClick={() => setEditingAsset(asset)}
                                                className="text-blue-600 hover:text-blue-900 bg-blue-50 p-1 rounded hover:bg-blue-100"
                                                title="تعديل"
                                            >
                                                <PencilSquareIcon className="h-5 w-5" />
                                            </button>

                                            <button
                                                onClick={() => handleDelete(asset.id)}
                                                className="text-red-600 hover:text-red-900 bg-red-50 p-1 rounded hover:bg-red-100"
                                                title="حذف"
                                            >
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modals */}
            {editingAsset && (
                <AssetForm
                    initialData={editingAsset}
                    onClose={() => setEditingAsset(null)}
                    onSuccess={() => {
                        setEditingAsset(null);
                        fetchAssets();
                    }}
                />
            )}

            {assigningAsset && (
                <AssetAssignmentModal
                    asset={assigningAsset}
                    type={assigningAsset.type}
                    onClose={() => setAssigningAsset(null)}
                    onSuccess={() => {
                        setAssigningAsset(null);
                        fetchAssets();
                    }}
                />
            )}
        </div>
    );
};

export default AssetList;
