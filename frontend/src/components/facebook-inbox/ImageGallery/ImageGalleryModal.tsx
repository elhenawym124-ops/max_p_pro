import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../../services/apiClient';

interface SavedImage {
    id: string;
    url: string;
    filename: string;
    uploadedAt: Date;
}

interface ImageGalleryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectImage: (imageUrl: string, filename: string) => void;
    onSelectMultipleImages: (images: Array<{ url: string; filename: string }>) => void;
}

const ImageGalleryModal: React.FC<ImageGalleryModalProps> = ({
    isOpen,
    onClose,
    onSelectImage,
    onSelectMultipleImages
}) => {
    // States
    const [savedImages, setSavedImages] = useState<SavedImage[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
    const [sendingMultiple, setSendingMultiple] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    // Load images
    const loadImages = useCallback(async () => {
        try {
            setLoading(true);
            console.log('🖼️ [IMAGE-GALLERY] Loading images...');
            const response = await apiClient.get('/user/image-gallery');
            console.log('🖼️ [IMAGE-GALLERY] Response:', response.data);
            if (response.data?.images) {
                console.log('🖼️ [IMAGE-GALLERY] Found', response.data.images.length, 'images');
                setSavedImages(response.data.images);
            } else {
                console.log('🖼️ [IMAGE-GALLERY] No images in response');
                setSavedImages([]);
            }
        } catch (error) {
            console.error('🖼️ [IMAGE-GALLERY] Error loading:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            loadImages();
            setSelectedImages(new Set()); // Reset selection when opening
        }
    }, [isOpen, loadImages]);

    // Upload images to gallery
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        let successCount = 0;

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files.item(i);
                if (!file || !file.type.startsWith('image/')) continue;

                const formData = new FormData();
                formData.append('image', file);

                const response = await apiClient.post('/user/image-gallery/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                if (response.data?.image) {
                    successCount++;
                }
            }

            if (successCount > 0) {
                alert(`✅ تم حفظ ${successCount} صورة في الحافظة!`);
                await loadImages();
            }
        } catch (error) {
            console.error('Error uploading images:', error);
            alert('حدث خطأ أثناء رفع الصور');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    // Delete image
    const deleteImage = async (imageId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('هل أنت متأكد من حذف هذه الصورة من الحافظة؟')) return;

        try {
            setDeleting(imageId);
            await apiClient.delete(`/user/image-gallery/${imageId}`);
            setSavedImages(prev => prev.filter(img => img.id !== imageId));
            setSelectedImages(prev => {
                const newSet = new Set(prev);
                newSet.delete(imageId);
                return newSet;
            });
        } catch (error) {
            console.error('Error deleting image:', error);
            alert('فشل حذف الصورة. حاول مرة أخرى.');
        } finally {
            setDeleting(null);
        }
    };

    // Toggle image selection
    const toggleSelection = (imageId: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setSelectedImages(prev => {
            const newSet = new Set(prev);
            if (newSet.has(imageId)) {
                newSet.delete(imageId);
            } else {
                newSet.add(imageId);
            }
            console.log('🖼️ [IMAGE-GALLERY] Selection toggled:', imageId, 'New size:', newSet.size);
            return newSet;
        });
    };

    // Send selected images
    const sendSelectedImages = async () => {
        if (selectedImages.size === 0) return;

        setSendingMultiple(true);
        const imagesToSend = savedImages
            .filter(img => selectedImages.has(img.id))
            .map(img => ({ url: img.url, filename: img.filename }));

        onSelectMultipleImages(imagesToSend);
        setSelectedImages(new Set());
        setSendingMultiple(false);
        setIsSelectionMode(false);
        onClose();
    };

    // Select all / Deselect all
    const toggleSelectAll = () => {
        if (selectedImages.size === savedImages.length) {
            setSelectedImages(new Set());
        } else {
            setSelectedImages(new Set(savedImages.map(img => img.id)));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">حافظة الصور المحفوظة</h3>
                        <span className="text-sm text-gray-500 dark:text-gray-400">({savedImages.length} صورة)</span>
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

                {/* Actions Bar */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                    {/* Upload Button */}
                    <div className="flex items-center gap-2">
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleUpload}
                            className="hidden"
                            id="gallery-upload-input"
                            disabled={uploading}
                        />
                        <label
                            htmlFor="gallery-upload-input"
                            className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {uploading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>جاري الرفع...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    <span>رفع صور جديدة</span>
                                </>
                            )}
                        </label>

                        <div className="flex items-center gap-2">
                            {/* Select All Button - Only visible in Selection Mode */}
                            {isSelectionMode && savedImages.length > 0 && (
                                <button
                                    onClick={toggleSelectAll}
                                    className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    {selectedImages.size === savedImages.length ? 'إلغاء الكل' : 'تحديد الكل'}
                                </button>
                            )}

                            {/* Selection Mode Toggle */}
                            {savedImages.length > 0 && (
                                <button
                                    onClick={() => {
                                        setIsSelectionMode(!isSelectionMode);
                                        if (isSelectionMode) {
                                            setSelectedImages(new Set()); // Clear selection when turning off
                                        }
                                    }}
                                    className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors border ${isSelectionMode
                                        ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700'
                                        : 'text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>{isSelectionMode ? 'إلغاء التحديد' : 'تحديد متعدد'}</span>
                                </button>
                            )}
                        </div>

                        {/* Send Selected Button */}
                        {selectedImages.size > 0 && (
                            <button
                                onClick={sendSelectedImages}
                                disabled={sendingMultiple}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                                {sendingMultiple ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        <span>جاري الإرسال...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                        <span>إرسال {selectedImages.size} صورة</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
                                    <p className="text-gray-600 dark:text-gray-400">جاري تحميل الصور...</p>
                                </div>
                            </div>
                        ) : savedImages.length === 0 ? (
                            <div className="flex items-center justify-center h-64 text-center">
                                <div>
                                    <svg className="w-24 h-24 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">لا توجد صور محفوظة</p>
                                    <p className="text-gray-500 dark:text-gray-500 text-sm">ارفع صور هنا للإرسال السريع لاحقاً</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {savedImages.map((image) => (
                                    <div
                                        key={image.id}
                                        className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${selectedImages.has(image.id)
                                            ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-800'
                                            : isSelectionMode
                                                ? 'border-dashed border-gray-300 dark:border-gray-500 hover:border-blue-300 dark:hover:border-blue-500'
                                                : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
                                            }`}
                                        onClick={() => {
                                            if (isSelectionMode || selectedImages.size > 0) {
                                                // If we have selected items OR are in selection mode, toggle
                                                toggleSelection(image.id);
                                                // Auto-enable mode if checking (optional, but good for consistency if they click image which is selected)
                                                if (!isSelectionMode) setIsSelectionMode(true);
                                            } else {
                                                // Simple click = send immediately if NOT in selection mode
                                                console.log('🖼️ [IMAGE-GALLERY] Single click - sending:', image.filename);
                                                onSelectImage(image.url, image.filename);
                                                onClose();
                                            }
                                        }}
                                    >
                                        <img
                                            src={image.url}
                                            alt={image.filename}
                                            className="w-full h-32 object-cover"
                                        />

                                        {/* Selection checkbox - visible in selection mode or on hover */}
                                        <div
                                            className={`absolute top-2 left-2 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer shadow-md ${selectedImages.has(image.id)
                                                ? 'bg-blue-600 dark:bg-blue-500 border-blue-600 dark:border-blue-500'
                                                : 'bg-white/90 dark:bg-gray-800/90 border-gray-400 dark:border-gray-500 hover:border-blue-500 dark:hover:border-blue-400'
                                                } ${isSelectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleSelection(image.id);
                                                if (!isSelectionMode) setIsSelectionMode(true);
                                            }}
                                        >
                                            {selectedImages.has(image.id) ? (
                                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : (
                                                <span className="text-gray-400 dark:text-gray-500 text-xs font-bold">+</span>
                                            )}
                                        </div>

                                        {/* Delete button */}
                                        <button
                                            onClick={(e) => deleteImage(image.id, e)}
                                            disabled={deleting === image.id}
                                            className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                                            title="حذف الصورة"
                                        >
                                            {deleting === image.id ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            )}
                                        </button>

                                        {/* Filename */}
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                                            <p className="text-white text-xs truncate">{image.filename}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Selected Images Preview */}
                    {selectedImages.size > 0 && (
                        <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                    الصور المختارة ({selectedImages.size}):
                                </span>
                                <button
                                    onClick={() => setSelectedImages(new Set())}
                                    className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                >
                                    إلغاء الكل
                                </button>
                            </div>
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {savedImages
                                    .filter(img => selectedImages.has(img.id))
                                    .map((image) => (
                                        <div
                                            key={image.id}
                                            className="relative flex-shrink-0 group"
                                        >
                                            <img
                                                src={image.url}
                                                alt={image.filename}
                                                className="w-16 h-16 object-cover rounded-lg border-2 border-blue-500 dark:border-blue-400"
                                            />
                                            <button
                                                onClick={(e) => toggleSelection(image.id, e)}
                                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 shadow-md"
                                            >
                                                ✕
                                            </button>
                                            <p className="text-xs text-center text-gray-600 dark:text-gray-400 mt-1 truncate w-16">
                                                {image.filename.length > 8 ? image.filename.substring(0, 8) + '...' : image.filename}
                                            </p>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}

                    {/* Footer hint */}
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400 flex justify-between items-center">
                        <span>
                            {selectedImages.size > 0
                                ? '💡 اضغط على "إرسال" لإرسال الصور المحددة'
                                : '💡 اضغط على الصورة لإرسالها مباشرة، أو استخدم علامة (+) لتحديد أكثر من صورة'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageGalleryModal;
