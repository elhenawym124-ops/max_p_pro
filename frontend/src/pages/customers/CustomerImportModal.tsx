import React, { useState, useRef } from 'react';
import { XMarkIcon, ArrowUpTrayIcon, DocumentArrowUpIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { apiClient } from '../../services/apiClient';

interface CustomerImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface ParsedCustomer {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    status?: string;
}

const CustomerImportModal: React.FC<CustomerImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<ParsedCustomer[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<{ success: boolean; count: number } | null>(null);

    const parseCSV = (text: string): ParsedCustomer[] => {
        const lines = text.trim().split('\n');
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
        const customers: ParsedCustomer[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''));
            const customer: any = {};

            headers.forEach((header, index) => {
                const value = values[index] || '';
                // Map common header names
                if (header.includes('first') || header === 'الاسم الأول') customer.firstName = value;
                else if (header.includes('last') || header === 'الاسم الأخير') customer.lastName = value;
                else if (header.includes('name') || header === 'الاسم') {
                    const parts = value.split(' ');
                    customer.firstName = parts[0];
                    customer.lastName = parts.slice(1).join(' ');
                }
                else if (header.includes('email') || header === 'البريد') customer.email = value;
                else if (header.includes('phone') || header.includes('mobile') || header === 'الهاتف') customer.phone = value;
                else if (header.includes('address') || header === 'العنوان') customer.address = value;
                else if (header.includes('city') || header === 'المدينة') customer.city = value;
                else if (header.includes('country') || header === 'البلد') customer.country = value;
                else if (header.includes('status') || header === 'الحالة') customer.status = value.toUpperCase();
            });

            if (customer.firstName || customer.phone || customer.email) {
                customers.push(customer);
            }
        }

        return customers;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setError('');
        setResult(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const parsed = parseCSV(text);
                setParsedData(parsed);
                if (parsed.length === 0) {
                    setError('لم يتم العثور على بيانات صالحة في الملف');
                }
            } catch (err) {
                setError('فشل في قراءة الملف');
            }
        };
        reader.readAsText(selectedFile);
    };

    const handleImport = async () => {
        if (parsedData.length === 0) return;

        setIsLoading(true);
        setError('');

        try {
            const response = await apiClient.post('/customers/import', { customers: parsedData });
            setResult({ success: true, count: response.data.importedCount || parsedData.length });
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.message || 'فشل في استيراد العملاء');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setParsedData([]);
        setError('');
        setResult(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
            <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <ArrowUpTrayIcon className="h-5 w-5" />
                        استيراد عملاء من CSV
                    </h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-500">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
                    {/* Upload Area */}
                    {!result && (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-500 transition-colors"
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <DocumentArrowUpIcon className="h-12 w-12 mx-auto text-gray-400" />
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                {file ? file.name : 'اضغط لاختيار ملف CSV أو اسحب الملف هنا'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                الأعمدة المطلوبة: firstName, lastName, phone, email
                            </p>
                        </div>
                    )}

                    {/* Preview */}
                    {parsedData.length > 0 && !result && (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                                تم العثور على {parsedData.length} عميل:
                            </p>
                            <div className="max-h-40 overflow-y-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="text-gray-500 dark:text-gray-400">
                                            <th className="text-right py-1 px-2">الاسم</th>
                                            <th className="text-right py-1 px-2">الهاتف</th>
                                            <th className="text-right py-1 px-2">البريد</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedData.slice(0, 5).map((c, i) => (
                                            <tr key={i} className="text-gray-800 dark:text-gray-200">
                                                <td className="py-1 px-2">{c.firstName} {c.lastName}</td>
                                                <td className="py-1 px-2">{c.phone || '-'}</td>
                                                <td className="py-1 px-2">{c.email || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {parsedData.length > 5 && (
                                    <p className="text-xs text-gray-500 mt-2">... و {parsedData.length - 5} عميل آخر</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Success Result */}
                    {result?.success && (
                        <div className="text-center py-8">
                            <CheckCircleIcon className="h-16 w-16 mx-auto text-green-500" />
                            <p className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                                تم استيراد {result.count} عميل بنجاح!
                            </p>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">
                            <ExclamationTriangleIcon className="h-5 w-5" />
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-4 border-t dark:border-gray-700">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                        {result ? 'إغلاق' : 'إلغاء'}
                    </button>
                    {!result && (
                        <button
                            onClick={handleImport}
                            disabled={parsedData.length === 0 || isLoading}
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    جاري الاستيراد...
                                </>
                            ) : (
                                <>
                                    <ArrowUpTrayIcon className="h-4 w-4 ml-2" />
                                    استيراد {parsedData.length} عميل
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CustomerImportModal;
