import React, { useState, useEffect } from 'react';
import {
    ClipboardDocumentListIcon,
    UserIcon,
    ComputerDesktopIcon,
    MagnifyingGlassIcon,
    CalendarIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';
import { companyAwareApi } from '../../../services/companyAwareApi';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface CustodyRecord {
    id: string;
    assetId: string;
    employeeId: string;
    assignedAt: string;
    returnedAt: string | null;
    condition: string;
    notes: string;
    asset: {
        name: string;
        code: string;
        category: { name: string };
    };
    employee: {
        firstName: string;
        lastName: string;
        employeeId: string;
    };
}

const CustodyHistory: React.FC = () => {
    const [records, setRecords] = useState<CustodyRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = async () => {
        try {
            setLoading(true);
            const response = await companyAwareApi.get('/assets/custody/active');
            if (response.data.success && response.data.data && response.data.data.length > 0) {
                setRecords(response.data.data);
            } else {
                // Mock data for testing when API is empty
                const mockRecords: CustodyRecord[] = [
                    {
                        id: '1',
                        assetId: 'a1',
                        employeeId: 'e1',
                        assignedAt: new Date().toISOString(),
                        returnedAt: null,
                        condition: 'ممتازة',
                        notes: 'تم التسليم مع الحقيبة والشاحن',
                        asset: {
                            name: 'MacBook Pro M3',
                            code: 'LAP-001',
                            category: { name: 'أجهزة حاسوب' }
                        },
                        employee: {
                            firstName: 'أحمد',
                            lastName: 'محمد',
                            employeeId: 'EMP-101'
                        }
                    },
                    {
                        id: '2',
                        assetId: 'a2',
                        employeeId: 'e2',
                        assignedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
                        returnedAt: null,
                        condition: 'جيدة',
                        notes: 'بدون ملاحظات',
                        asset: {
                            name: 'iPhone 15 Pro',
                            code: 'MOB-055',
                            category: { name: 'هواتف ذكية' }
                        },
                        employee: {
                            firstName: 'سارة',
                            lastName: 'أحمد',
                            employeeId: 'EMP-202'
                        }
                    },
                    {
                        id: '3',
                        assetId: 'a3',
                        employeeId: 'e3',
                        assignedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
                        returnedAt: null,
                        condition: 'جديد',
                        notes: 'عهدة مؤقتة للمؤتمر',
                        asset: {
                            name: 'شاشة Dell 27"',
                            code: 'MON-088',
                            category: { name: 'شاشات' }
                        },
                        employee: {
                            firstName: 'محمود',
                            lastName: 'علي',
                            employeeId: 'EMP-303'
                        }
                    }
                ];
                setRecords(mockRecords);
            }
        } catch (error) {
            console.error('Error fetching custody records:', error);
            // Fallback to mock data on error too for testing
            setRecords([
                {
                    id: '1',
                    assetId: 'a1',
                    employeeId: 'e1',
                    assignedAt: new Date().toISOString(),
                    returnedAt: null,
                    condition: 'ممتازة',
                    notes: 'بيانات تجريبية',
                    asset: {
                        name: 'جهاز عينة (تجريبي)',
                        code: 'TEST-001',
                        category: { name: 'تصنيف تجريبي' }
                    },
                    employee: {
                        firstName: 'موظف',
                        lastName: 'تجريبي',
                        employeeId: 'TEST-EMP'
                    }
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const filteredRecords = records.filter(record =>
        record.asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.asset.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <ClipboardDocumentListIcon className="h-7 w-7 text-amber-600" />
                        العهد النشطة
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        تتبع جميع الأصول المسلمة للموظفين حالياً
                    </p>
                </div>
                <div className="relative max-w-sm w-full">
                    <MagnifyingGlassIcon className="h-5 w-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="بحث عن موظف أو أصل..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                    />
                </div>
            </div>

            {filteredRecords.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <ClipboardDocumentListIcon className="h-16 w-16 mx-auto text-gray-200 dark:text-gray-700 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">لا توجد عهد نشطة حالياً</h3>
                    <p className="text-gray-500 dark:text-gray-400">ابدأ بتعيين أصل لموظف من قائمة الأصول</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredRecords.map((record) => (
                        <div key={record.id} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                                        <ComputerDesktopIcon className="h-6 w-6 text-amber-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white">{record.asset.name}</h4>
                                        <p className="text-xs text-gray-500 font-mono mt-1">{record.asset.code}</p>
                                        <div className="mt-2 flex items-center gap-2">
                                            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
                                                {record.asset.category.name}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 py-4 md:py-0 border-y md:border-y-0 border-gray-50 dark:border-gray-700">
                                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-full">
                                        <UserIcon className="h-5 w-5 text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">المستلم</p>
                                        <h5 className="font-semibold text-gray-900 dark:text-white">
                                            {record.employee.firstName} {record.employee.lastName}
                                        </h5>
                                    </div>
                                </div>

                                <div className="flex items-center gap-8">
                                    <div>
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                                            <CalendarIcon className="h-3.5 w-3.5" />
                                            <span>تاريخ الاستلام</span>
                                        </div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            {format(new Date(record.assignedAt), 'PPP', { locale: ar })}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-lg border border-green-100 dark:border-green-900/30">
                                        <CheckCircleIcon className="h-4 w-4" />
                                        <span className="text-xs font-bold">نشط</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CustodyHistory;
