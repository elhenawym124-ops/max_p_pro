import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    SparklesIcon,
    PlusIcon,
    DocumentDuplicateIcon,
    GlobeAltIcon,
    BuildingStorefrontIcon,
    ArrowPathIcon,
    TrashIcon,
    PencilIcon,
    EyeIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
    PhotoIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { homepageService, HomepageTemplate } from '../services/homepageService';
import { Chip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';

// Mock Company Templates Data
const MOCK_COMPANY_TEMPLATES: HomepageTemplate[] = [
    {
        id: 'comp_1',
        companyId: 'comp_x',
        name: 'تصميم شركة "الزهور"',
        description: 'تصميم رائع لمحل ورود.',
        content: { sections: [], settings: { containerWidth: 'full', spacing: 'normal', animation: true } },
        thumbnail: 'https://placehold.co/600x400/pink/ffffff?text=Flowers',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'comp_2',
        companyId: 'comp_y',
        name: 'سوبر ماركت البركة',
        description: 'عرض منتجات كثيرة وبنرات عروض.',
        content: { sections: [], settings: { containerWidth: 'full', spacing: 'compact', animation: false } },
        thumbnail: 'https://placehold.co/600x400/orange/ffffff?text=Supermarket',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'comp_3',
        companyId: 'marketing_co',
        name: 'قالب التسويق الرقمي',
        description: 'قالب احترافي من شركة التسويق، يركز على الخدمات والعملاء.',
        content: { sections: [], settings: { containerWidth: 'full', spacing: 'relaxed', animation: true } },
        thumbnail: 'https://placehold.co/600x400/2563eb/ffffff?text=Marketing+Agency',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'comp_4',
        companyId: 'marketing_co',
        name: 'صفحة هبوط للمنتجات',
        description: 'تصميم صفحة هبوط (Landing Page) عالي التحويل.',
        content: { sections: [], settings: { containerWidth: 'contained', spacing: 'normal', animation: true } },
        thumbnail: 'https://placehold.co/600x400/4f46e5/ffffff?text=Landing+Page',
        isActive: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
];

const SuperAdminHomepageTemplates: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'system' | 'harvest'>('system');
    const [systemTemplates, setSystemTemplates] = useState<HomepageTemplate[]>([]);
    const [companyTemplates, setCompanyTemplates] = useState<HomepageTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Metadata Edit State
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [currentTemplate, setCurrentTemplate] = useState<HomepageTemplate | null>(null);
    const [editForm, setEditForm] = useState({ name: '', description: '', thumbnail: '' });

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'system') {
                const response = await homepageService.getSystemTemplates();
                setSystemTemplates(response.data);
            } else {
                // Mock fetch for company templates
                setTimeout(() => {
                    setCompanyTemplates(MOCK_COMPANY_TEMPLATES);
                }, 500);
            }
        } catch (error) {
            console.error('Error loading templates:', error);
            toast.error('فشل تحميل القوالب');
        } finally {
            setLoading(false);
        }
    };

    const handlePromoteToSystem = async (template: HomepageTemplate) => {
        if (!confirm(`هل أنت متأكد من نسخ قالب "${template.name}" إلى مكتبة النظام العامة؟`)) return;

        try {
            setLoading(true);
            await homepageService.promoteToSystem(template.id);
            toast.success(`تم إضافة "${template.name}" إلى مكتبة النظام بنجاح!`);
            setActiveTab('system');
        } catch (error) {
            toast.error('حدث خطأ أثناء نسخ القالب');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSystemTemplate = (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا القالب من النظام؟ سيختفي من مكتبة القوالب لجميع المتاجر.')) return;
        toast.success('تم الحذف (محاكاة)');
        setSystemTemplates(prev => prev.filter(t => t.id !== id));
    };

    const openEditMetadata = (template: HomepageTemplate) => {
        setCurrentTemplate(template);
        setEditForm({
            name: template.name,
            description: template.description || '',
            thumbnail: template.thumbnail || ''
        });
        setEditModalOpen(true);
    };

    const handleSaveMetadata = async () => {
        if (!currentTemplate) return;
        try {
            setLoading(true);
            await homepageService.updateSystemTemplate(currentTemplate.id, {
                ...currentTemplate,
                name: editForm.name,
                description: editForm.description,
                thumbnail: editForm.thumbnail
            });
            toast.success('تم تحديث بيانات القالب بنجاح');
            setEditModalOpen(false);
            loadData(); // Reload to see changes
        } catch (error) {
            toast.error('فشل تحديث البيانات');
        } finally {
            setLoading(false);
        }
    };

    const filteredSystemTemplates = systemTemplates.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredCompanyTemplates = companyTemplates.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-6">
            <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <GlobeAltIcon className="h-8 w-8 text-blue-600" />
                        إدارة قوالب الصفحة الرئيسية
                    </h1>
                    <p className="mt-1 text-gray-500">
                        إدارة المكتبة العامة لقوالب التصميم، وسحب القوالب المميزة من المتاجر.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate('/settings/homepage/new')}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        <PlusIcon className="h-5 w-5" />
                        قالب جديد
                    </button>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="بحث عن قالب..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
                        />
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
                <button
                    onClick={() => setActiveTab('system')}
                    className={`pb-4 px-6 text-sm font-medium transition-colors relative ${activeTab === 'system'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <SparklesIcon className="h-5 w-5" />
                        مكتبة النظام ({filteredSystemTemplates.length})
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('harvest')}
                    className={`pb-4 px-6 text-sm font-medium transition-colors relative ${activeTab === 'harvest'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <BuildingStorefrontIcon className="h-5 w-5" />
                        قوالب المتاجر ({filteredCompanyTemplates.length})
                    </div>
                </button>
            </div>

            {/* Content */}
            {loading && !editModalOpen ? (
                <div className="flex justify-center py-12">
                    <CircularProgress />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeTab === 'system' && filteredSystemTemplates.map(template => (
                        <div key={template.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                            <div className="relative h-48 bg-gray-100 group">
                                <img
                                    src={template.thumbnail || 'https://via.placeholder.com/400x200'}
                                    className="w-full h-full object-cover"
                                    alt={template.name}
                                />
                                <div className="absolute top-2 right-2">
                                    <Chip label="نظام" color="primary" size="small" />
                                </div>
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <button
                                        onClick={() => window.open(`/preview/homepage/${template.id}`, '_blank')}
                                        className="bg-white text-gray-900 px-4 py-2 rounded-full font-medium flex items-center gap-2 hover:bg-gray-100 transform translate-y-2 group-hover:translate-y-0 transition-all"
                                    >
                                        <EyeIcon className="h-5 w-5" />
                                        معاينة
                                    </button>
                                </div>
                            </div>
                            <div className="p-4 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg">{template.name}</h3>
                                    <button
                                        onClick={() => openEditMetadata(template)}
                                        className="text-gray-400 hover:text-indigo-600 p-1 rounded"
                                        title="تعديل البيانات"
                                    >
                                        <PencilIcon className="h-4 w-4" />
                                    </button>
                                </div>
                                <p className="text-sm text-gray-500 mb-4 line-clamp-2 flex-1">{template.description}</p>
                                <div className="flex gap-2 pt-2 border-t border-gray-100">
                                    <button
                                        className="flex-1 px-3 py-2 text-sm bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 flex items-center justify-center gap-1 transition-colors"
                                        onClick={() => navigate(`/settings/homepage/edit/${template.id}`)}
                                    >
                                        <SparklesIcon className="h-4 w-4" />
                                        المحرر المرئي
                                    </button>
                                    <button
                                        className="px-3 py-2 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                                        onClick={() => handleDeleteSystemTemplate(template.id)}
                                        title="حذف القالب"
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {activeTab === 'harvest' && filteredCompanyTemplates.map(template => (
                        <div key={template.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                            <div className="relative h-48 bg-gray-100">
                                <img
                                    src={template.thumbnail || 'https://via.placeholder.com/400x200'}
                                    className="w-full h-full object-cover"
                                    alt={template.name}
                                />
                                <div className="absolute top-2 right-2">
                                    <Chip
                                        label={template.companyId === 'marketing_co' ? 'شركة التسويق' : template.companyId === 'comp_x' ? 'الزهور' : template.companyId === 'comp_y' ? 'البركة' : template.companyId}
                                        variant="outlined"
                                        size="small"
                                        className="bg-white"
                                    />
                                </div>
                            </div>
                            <div className="p-4">
                                <h3 className="font-bold text-lg mb-1">{template.name}</h3>
                                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{template.description}</p>
                                <button
                                    onClick={() => handlePromoteToSystem(template)}
                                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center justify-center gap-2 transition-colors"
                                >
                                    <ArrowPathIcon className="h-4 w-4" />
                                    نسخ إلى النظام (Promote)
                                </button>
                            </div>
                        </div>
                    ))}

                    {activeTab === 'system' && filteredSystemTemplates.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                            <SparklesIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                            لا توجد قوالب نظام تطابق البحث.
                        </div>
                    )}

                    {activeTab === 'harvest' && filteredCompanyTemplates.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                            <BuildingStorefrontIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                            لا توجد قوالب متاجر تطابق البحث.
                        </div>
                    )}
                </div>
            )}

            {/* Edit Metadata Modal */}
            <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle className="flex justify-between items-center text-right" style={{ fontFamily: 'Cairo, sans-serif' }}>
                    تعديل بيانات القالب
                </DialogTitle>
                <DialogContent>
                    <div className="flex flex-col gap-4 py-4">
                        <TextField
                            label="اسم القالب"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            fullWidth
                            variant="outlined"
                        />
                        <TextField
                            label="وصف القالب"
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            fullWidth
                            multiline
                            rows={3}
                            variant="outlined"
                        />
                        <TextField
                            label="رابط الصورة المصغرة (Thumbnail URL)"
                            value={editForm.thumbnail}
                            onChange={(e) => setEditForm({ ...editForm, thumbnail: e.target.value })}
                            fullWidth
                            variant="outlined"
                            InputProps={{
                                endAdornment: editForm.thumbnail && (
                                    <div className="w-8 h-8 rounded overflow-hidden ml-2 border border-gray-200">
                                        <img src={editForm.thumbnail} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                )
                            }}
                        />
                    </div>
                </DialogContent>
                <DialogActions className="p-4">
                    <Button onClick={() => setEditModalOpen(false)} color="inherit">
                        إلغاء
                    </Button>
                    <Button onClick={handleSaveMetadata} variant="contained" color="primary">
                        حفظ التغييرات
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default SuperAdminHomepageTemplates;

