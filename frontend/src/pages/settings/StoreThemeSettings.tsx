
import React, { useState, useEffect } from 'react';
import {
    Palette as PaletteIcon,
    CheckBadgeIcon,
} from '@mui/icons-material';
import { toast } from 'react-hot-toast';

// We reuse the interface for consistency, but in a real app this would be imported
interface ThemeConfig {
    id: string;
    name: string;
    description: string;
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    fontFamily: string;
    borderRadius: string;
    isActive: boolean;
}

const StoreThemeSettings: React.FC = () => {
    const [availableThemes, setAvailableThemes] = useState<ThemeConfig[]>([]);
    const [selectedThemeId, setSelectedThemeId] = useState<string>('1');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mock fetching themes from API
        // In reality this would call an API endpoint
        setTimeout(() => {
            setAvailableThemes([
                {
                    id: '1',
                    name: 'الافتراضي (Default)',
                    description: 'الثيم الافتراضي للمنصة، بسيط وعملي.',
                    primaryColor: '#3b82f6',
                    secondaryColor: '#1e40af',
                    backgroundColor: '#ffffff',
                    textColor: '#1f2937',
                    fontFamily: 'Inter',
                    borderRadius: 'md',
                    isActive: true,
                },
                {
                    id: '2',
                    name: 'ليلي أنيق (Dark Elegant)',
                    description: 'ثيم داكن يناسب المتاجر التقنية والحديثة.',
                    primaryColor: '#8b5cf6',
                    secondaryColor: '#6d28d9',
                    backgroundColor: '#111827',
                    textColor: '#f9fafb',
                    fontFamily: 'Roboto',
                    borderRadius: 'lg',
                    isActive: true,
                },
                {
                    id: '3',
                    name: 'طبيعة (Nature)',
                    description: 'ألوان مستوحاة من الطبيعة، أخضر وهادئ.',
                    primaryColor: '#10b981',
                    secondaryColor: '#059669',
                    backgroundColor: '#f0fdf4',
                    textColor: '#064e3b',
                    fontFamily: 'Cairo',
                    borderRadius: 'sm',
                    isActive: true, // Assuming super admin made it active
                }
            ]);

            // Load saved selection
            const saved = localStorage.getItem('storefront_theme_id');
            if (saved) setSelectedThemeId(saved);

            setLoading(false);
        }, 1000);
    }, []);

    const handleActivateTheme = (themeId: string) => {
        setSelectedThemeId(themeId);
        localStorage.setItem('storefront_theme_id', themeId);
        toast.success('تم تفعيل الثيم بنجاح للمتجر');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="px-6 py-6">
            <div className="border-b border-gray-200 pb-4 mb-6">
                <h2 className="text-xl font-semibold text-gray-900">ثيم المتجر</h2>
                <p className="text-sm text-gray-600 mt-1">اختر الثيم الذي سيظهر لعملائك في المتجر الإلكتروني</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableThemes.map((theme) => (
                    <div
                        key={theme.id}
                        className={`border rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${selectedThemeId === theme.id ? 'ring-2 ring-indigo-500 shadow-lg' : 'hover:shadow-md border-gray-200'}`}
                        onClick={() => handleActivateTheme(theme.id)}
                    >
                        {/* Preview Area */}
                        <div
                            className="h-32 w-full flex items-center justify-center p-4 relative"
                            style={{ backgroundColor: theme.backgroundColor }}
                        >
                            <div className="text-center w-full">
                                <div style={{ color: theme.textColor, fontFamily: theme.fontFamily }} className="text-lg font-bold mb-2">
                                    {theme.name}
                                </div>
                                <div className="flex justify-center gap-2">
                                    <div className="w-8 h-8 rounded-full shadow-sm" style={{ backgroundColor: theme.primaryColor }}></div>
                                    <div className="w-8 h-8 rounded-full shadow-sm" style={{ backgroundColor: theme.secondaryColor }}></div>
                                </div>
                            </div>

                            {selectedThemeId === theme.id && (
                                <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-1 shadow-md">
                                    <CheckCircleIcon className="w-5 h-5" />
                                </div>
                            )}
                        </div>

                        {/* Content Area */}
                        <div className="p-4 bg-white dark:bg-gray-800">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-semibold text-gray-900 dark:text-white">{theme.name}</h3>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                                {theme.description}
                            </p>
                            <div className="flex gap-2 mb-4">
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                                    {theme.fontFamily}
                                </span>
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                                    {theme.borderRadius}
                                </span>
                            </div>

                            <button
                                className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${selectedThemeId === theme.id
                                    ? 'bg-green-100 text-green-700 cursor-default'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                    }`}
                                onClick={(e) => {
                                    e.stopPropagation(); // prevent double trigger
                                    handleActivateTheme(theme.id);
                                }}
                                disabled={selectedThemeId === theme.id}
                            >
                                {selectedThemeId === theme.id ? 'نشط حالياً' : 'تفعيل الثيم'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StoreThemeSettings;
