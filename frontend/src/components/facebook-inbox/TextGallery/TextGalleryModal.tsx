import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../../services/apiClient';

interface SavedText {
    id: string;
    title: string;
    content: string;
    imageUrls?: string[];
    isPinned?: boolean;
    createdAt: Date;
}

interface TextGalleryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectText: (text: { content: string; imageUrls?: string[] }) => void;
}

const TextGalleryModal: React.FC<TextGalleryModalProps> = ({ isOpen, onClose, onSelectText }) => {
    // States
    const [savedTexts, setSavedTexts] = useState<SavedText[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [updating, setUpdating] = useState(false);
    const [pinning, setPinning] = useState<string | null>(null);

    // New text form
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newImages, setNewImages] = useState<File[]>([]);
    const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);

    // Edit form
    const [editImages, setEditImages] = useState<File[]>([]);
    const [editImagePreviews, setEditImagePreviews] = useState<string[]>([]);
    const [editExistingImages, setEditExistingImages] = useState<string[]>([]);

    // Load texts
    const loadTexts = useCallback(async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/user/text-gallery');
            if (response.data?.texts) {
                // ترتيب النصوص: المثبتة أولاً، ثم الباقي حسب التاريخ (الأحدث أولاً)
                const sortedTexts = [...response.data.texts].sort((a, b) => {
                    // إذا كان كلاهما مثبت أو غير مثبت، رتب حسب التاريخ (الأحدث أولاً)
                    if (!!a.isPinned === !!b.isPinned) {
                        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                    }
                    // النصوص المثبتة تظهر أولاً
                    return a.isPinned ? -1 : 1;
                });
                setSavedTexts(sortedTexts);
            }
        } catch (error) {
            console.error('Error loading text gallery:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            loadTexts();
        }
    }, [isOpen, loadTexts]);

    // Save new text
    const saveText = async () => {
        if (!newContent.trim() && newImages.length === 0) {
            alert('يرجى إدخال محتوى النص أو إرفاق صورة على الأقل');
            return;
        }

        try {
            setSaving(true);
            let imageUrls: string[] = [];

            // Upload images first
            if (newImages.length > 0) {
                for (const file of newImages) {
                    if (!file.type.startsWith('image/')) continue;

                    const formData = new FormData();
                    formData.append('image', file);

                    const uploadResponse = await apiClient.post('/user/image-gallery/upload', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });

                    const imageUrl = uploadResponse.data?.image?.url || uploadResponse.data?.image?.fileUrl;
                    if (imageUrl) {
                        imageUrls.push(imageUrl);
                    }
                }
            }

            // Save text
            await apiClient.post('/user/text-gallery', {
                title: newTitle.trim() || null,
                content: newContent.trim() || null,
                imageUrls: imageUrls.length > 0 ? imageUrls : undefined
            });

            // Reload and clear form
            await loadTexts();
            setNewTitle('');
            setNewContent('');
            setNewImages([]);
            setNewImagePreviews([]);
            alert('✅ تم حفظ النص بنجاح!');
        } catch (error) {
            console.error('Error saving text:', error);
            alert('فشل حفظ النص. حاول مرة أخرى.');
        } finally {
            setSaving(false);
        }
    };

    // Update text
    const updateText = async (textId: string, title: string, content: string) => {
        if (!content.trim() && editExistingImages.length === 0 && editImages.length === 0) {
            alert('يرجى إدخال محتوى النص أو إرفاق صورة على الأقل');
            return;
        }

        try {
            setUpdating(true);
            let imageUrls: string[] = [...editExistingImages];

            // Upload new images
            if (editImages.length > 0) {
                for (const file of editImages) {
                    if (!file.type.startsWith('image/')) continue;

                    const formData = new FormData();
                    formData.append('image', file);

                    const uploadResponse = await apiClient.post('/user/image-gallery/upload', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });

                    const imageUrl = uploadResponse.data?.image?.url || uploadResponse.data?.image?.fileUrl;
                    if (imageUrl) {
                        imageUrls.push(imageUrl);
                    }
                }
            }

            // Update text
            await apiClient.put(`/user/text-gallery/${textId}`, {
                title: title.trim() || null,
                content: content.trim() || null,
                imageUrls: imageUrls.length > 0 ? imageUrls : undefined
            });

            // Reload and clear edit state
            await loadTexts();
            setEditingId(null);
            setEditImages([]);
            setEditImagePreviews([]);
            setEditExistingImages([]);
            alert('✅ تم تحديث النص بنجاح!');
        } catch (error) {
            console.error('Error updating text:', error);
            alert('فشل تحديث النص. حاول مرة أخرى.');
        } finally {
            setUpdating(false);
        }
    };

    // Delete text
    const deleteText = async (textId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('هل أنت متأكد من حذف هذا النص من الحافظة؟')) return;

        try {
            setDeleting(textId);
            await apiClient.delete(`/user/text-gallery/${textId}`);
            setSavedTexts(prev => prev.filter(t => t.id !== textId));
        } catch (error) {
            console.error('Error deleting text:', error);
            alert('فشل حذف النص. حاول مرة أخرى.');
        } finally {
            setDeleting(null);
        }
    };

    // Toggle pin
    const togglePin = async (textId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            setPinning(textId);
            const text = savedTexts.find(t => t.id === textId);
            // استخدام endpoint الصحيح للتثبيت
            await apiClient.patch(`/user/text-gallery/${textId}/pin`, {
                isPinned: !text?.isPinned
            });
            await loadTexts();
        } catch (error) {
            console.error('Error toggling pin:', error);
            alert('فشل تحديث حالة التثبيت. حاول مرة أخرى.');
        } finally {
            setPinning(null);
        }
    };

    // Handle image selection for new text
    const handleNewImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const validFiles: File[] = [];
        const previews: string[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files.item(i);
            if (!file) continue;
            if (file.size > 10 * 1024 * 1024) {
                alert(`حجم الملف ${file.name} كبير جداً. الحد الأقصى 10 ميجابايت.`);
                continue;
            }
            if (!file.type.startsWith('image/')) {
                alert(`الملف ${file.name} ليس صورة.`);
                continue;
            }

            validFiles.push(file);
            previews.push(URL.createObjectURL(file));
        }

        setNewImages(prev => [...prev, ...validFiles]);
        setNewImagePreviews(prev => [...prev, ...previews]);
        e.target.value = '';
    };

    // Handle image selection for edit
    const handleEditImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const validFiles: File[] = [];
        const previews: string[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files.item(i);
            if (!file) continue;
            if (file.size > 10 * 1024 * 1024) continue;
            if (!file.type.startsWith('image/')) continue;

            validFiles.push(file);
            previews.push(URL.createObjectURL(file));
        }

        setEditImages(prev => [...prev, ...validFiles]);
        setEditImagePreviews(prev => [...prev, ...previews]);
        e.target.value = '';
    };

    // Remove image from new text
    const removeNewImage = (index: number) => {
        setNewImages(prev => prev.filter((_, i) => i !== index));
        setNewImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    // Remove existing image from edit
    const removeEditExistingImage = (index: number) => {
        setEditExistingImages(prev => prev.filter((_, i) => i !== index));
    };

    // Remove new image from edit
    const removeEditNewImage = (index: number) => {
        setEditImages(prev => prev.filter((_, i) => i !== index));
        setEditImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    // Start editing
    const startEditing = (text: SavedText, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingId(text.id);
        setEditExistingImages(text.imageUrls || []);
        setEditImages([]);
        setEditImagePreviews([]);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">حافظة النصوص المحفوظة</h3>
                        <span className="text-sm text-gray-500 dark:text-gray-400">({savedTexts.length} نص)</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {/* Add new text form */}
                    <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">إضافة نص جديد</h4>
                        <div className="space-y-3">
                            <input
                                type="text"
                                placeholder="عنوان النص (اختياري)"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
                            />
                            <textarea
                                placeholder="محتوى النص..."
                                value={newContent}
                                onChange={(e) => setNewContent(e.target.value)}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
                            />

                            {/* Image upload */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">إرفاق صور (اختياري)</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleNewImageSelect}
                                    className="hidden"
                                    id="text-gallery-new-image"
                                />
                                <label
                                    htmlFor="text-gallery-new-image"
                                    className="flex items-center justify-center px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 cursor-pointer transition-colors"
                                >
                                    <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    <span className="text-sm text-gray-600 dark:text-gray-400">اختر صور لإرفاقها</span>
                                </label>

                                {newImagePreviews.length > 0 && (
                                    <div className="grid grid-cols-4 gap-2 mt-2">
                                        {newImagePreviews.map((preview, index) => (
                                            <div key={index} className="relative group">
                                                <img src={preview} alt="" className="w-full h-24 object-cover rounded-lg border" />
                                                <button
                                                    onClick={() => removeNewImage(index)}
                                                    className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={saveText}
                                disabled={saving || (!newContent.trim() && newImages.length === 0)}
                                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {saving ? (
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        <span>جاري الحفظ...</span>
                                    </div>
                                ) : 'حفظ النص'}
                            </button>
                        </div>
                    </div>

                    {/* Texts list */}
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 dark:border-green-400 mx-auto mb-4"></div>
                                <p className="text-gray-600 dark:text-gray-400">جاري تحميل النصوص...</p>
                            </div>
                        </div>
                    ) : savedTexts.length === 0 ? (
                        <div className="flex items-center justify-center h-64 text-center">
                            <div>
                                <svg className="w-24 h-24 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">لا توجد نصوص محفوظة</p>
                                <p className="text-gray-500 dark:text-gray-500 text-sm">احفظ النصوص الشائعة هنا للإرسال السريع</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {savedTexts.map((text) => (
                                <div
                                    key={text.id}
                                    className={`p-4 bg-white dark:bg-gray-800 border rounded-lg transition-all group ${
                                        editingId === text.id
                                            ? 'border-blue-500 dark:border-blue-400 shadow-lg'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-400 hover:shadow-md cursor-pointer'
                                    }`}
                                    onClick={() => {
                                        if (editingId !== text.id) {
                                            onSelectText({ content: text.content, ...(text.imageUrls && { imageUrls: text.imageUrls }) });
                                        }
                                    }}
                                >
                                    {editingId === text.id ? (
                                        // Edit mode
                                        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="text"
                                                placeholder="عنوان النص (اختياري)"
                                                defaultValue={text.title || ''}
                                                id={`edit-title-${text.id}`}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                                            />
                                            <textarea
                                                placeholder="محتوى النص..."
                                                defaultValue={text.content}
                                                id={`edit-content-${text.id}`}
                                                rows={4}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                                            />

                                            {/* Existing images */}
                                            {editExistingImages.length > 0 && (
                                                <div className="space-y-2">
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الصور الحالية</label>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {editExistingImages.map((url, index) => (
                                                            <div key={index} className="relative group">
                                                                <img src={url} alt="" className="w-full h-24 object-cover rounded-lg border" />
                                                                <button
                                                                    onClick={() => removeEditExistingImage(index)}
                                                                    className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Add new images */}
                                            <div className="space-y-2">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    onChange={handleEditImageSelect}
                                                    className="hidden"
                                                    id={`edit-image-${text.id}`}
                                                />
                                                <label
                                                    htmlFor={`edit-image-${text.id}`}
                                                    className="flex items-center justify-center px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors"
                                                >
                                                    <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                    </svg>
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">إضافة صور جديدة</span>
                                                </label>

                                                {editImagePreviews.length > 0 && (
                                                    <div className="grid grid-cols-4 gap-2 mt-2">
                                                        {editImagePreviews.map((preview, index) => (
                                                            <div key={index} className="relative group">
                                                                <img src={preview} alt="" className="w-full h-24 object-cover rounded-lg border" />
                                                                <button
                                                                    onClick={() => removeEditNewImage(index)}
                                                                    className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingId(null);
                                                        setEditImages([]);
                                                        setEditImagePreviews([]);
                                                        setEditExistingImages([]);
                                                    }}
                                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                                                >
                                                    إلغاء
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const titleEl = document.getElementById(`edit-title-${text.id}`) as HTMLInputElement;
                                                        const contentEl = document.getElementById(`edit-content-${text.id}`) as HTMLTextAreaElement;
                                                        if (titleEl && contentEl) {
                                                            updateText(text.id, titleEl.value, contentEl.value);
                                                        }
                                                    }}
                                                    disabled={updating}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                                >
                                                    {updating ? 'جاري التحديث...' : 'حفظ التعديلات'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        // View mode
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    {text.isPinned && (
                                                        <svg className="w-4 h-4 text-yellow-500 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                                                        </svg>
                                                    )}
                                                    <h5 className="font-semibold text-gray-900 dark:text-gray-100">{text.title || 'بدون عنوان'}</h5>
                                                </div>
                                                {text.content && (
                                                    <p className="text-gray-600 dark:text-gray-400 text-sm whitespace-pre-wrap line-clamp-3">{text.content}</p>
                                                )}
                                                {text.imageUrls && text.imageUrls.length > 0 && (
                                                    <div className="flex gap-2 mt-2">
                                                        {text.imageUrls.slice(0, 4).map((url, i) => (
                                                            <img key={i} src={url} alt="" className="w-12 h-12 object-cover rounded border" />
                                                        ))}
                                                        {text.imageUrls.length > 4 && (
                                                            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 flex items-center justify-center text-xs text-gray-600 dark:text-gray-400">
                                                                +{text.imageUrls.length - 4}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mr-2">
                                                <button
                                                    onClick={(e) => togglePin(text.id, e)}
                                                    disabled={pinning === text.id}
                                                    className={`p-2 rounded-full transition-colors ${text.isPinned ? 'text-yellow-500 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                                    title={text.isPinned ? 'إلغاء التثبيت' : 'تثبيت'}
                                                >
                                                    <svg className="w-4 h-4" fill={text.isPinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 20 20">
                                                        <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={(e) => startEditing(text, e)}
                                                    className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                                                    title="تعديل"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={(e) => deleteText(text.id, e)}
                                                    disabled={deleting === text.id}
                                                    className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                                    title="حذف"
                                                >
                                                    {deleting === text.id ? (
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                                    ) : (
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TextGalleryModal;
