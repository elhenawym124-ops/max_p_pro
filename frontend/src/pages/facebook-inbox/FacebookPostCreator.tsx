import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { companyAwareApi } from '../../services/companyAwareApi';
import { uploadService } from '../../services/uploadService';
import {
    PhotoIcon,
    VideoCameraIcon,
    LinkIcon,
    CalendarIcon,
    XMarkIcon,
    CheckCircleIcon,
    PaperAirplaneIcon,
    ClockIcon,
    DocumentTextIcon
} from '@heroicons/react/24/outline';

interface FacebookPage {
    id: string;
    pageId: string;
    pageName: string;
    status: string;
}

type TabType = 'STATUS' | 'MEDIA' | 'LINK';
type PostType = 'FEED' | 'STORY';

const FacebookPostCreator: React.FC = () => {
    const navigate = useNavigate();
    const [pages, setPages] = useState<FacebookPage[]>([]);
    const [selectedPages, setSelectedPages] = useState<string[]>([]);

    // UI State
    const [activeTab, setActiveTab] = useState<TabType>('STATUS');
    const [postType, setPostType] = useState<PostType>('FEED');
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduledDate, setScheduledDate] = useState('');

    // Content State
    const [message, setMessage] = useState('');
    const [linkUrl, setLinkUrl] = useState('');
    const [mediaFiles, setMediaFiles] = useState<File[]>([]);
    const [mediaPreviews, setMediaPreviews] = useState<{ url: string, type: 'image' | 'video' }[]>([]);

    // Processing State
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<any>(null);
    const hasFetchedPages = useRef(false);

    useEffect(() => {
        if (!hasFetchedPages.current) {
            hasFetchedPages.current = true;
            fetchPages();
        }
    }, []);

    const fetchPages = async () => {
        // Prevent multiple simultaneous calls
        if (loading) {
            return;
        }
        
        setLoading(true);
        try {
            const response = await companyAwareApi.get('/integrations/facebook/connected');
            if (response.data.success) {
                setPages(response.data.pages || []);
            }
        } catch (error) {
            console.error('Error fetching pages:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // For Stories, only allow one media
        if (postType === 'STORY' && (mediaFiles.length + files.length > 1)) {
            alert('القصص (Stories) تدعم ملف وسائط واحد فقط.');
            return;
        }

        const newPreviews = files.map(file => ({
            url: URL.createObjectURL(file),
            type: file.type.startsWith('video/') ? 'video' : 'image' as 'image' | 'video'
        }));

        setMediaFiles(prev => [...prev, ...files]);
        setMediaPreviews(prev => [...prev, ...newPreviews]);
    };

    const removeMedia = (index: number) => {
        setMediaFiles(prev => prev.filter((_, i) => i !== index));
        setMediaPreviews(prev => {
            // Revoke URL to avoid memory leaks
            URL.revokeObjectURL(prev[index].url);
            return prev.filter((_, i) => i !== index);
        });
    };

    const togglePageSelection = (pageId: string) => {
        setSelectedPages(prev =>
            prev.includes(pageId)
                ? prev.filter(id => id !== pageId)
                : [...prev, pageId]
        );
    };

    const handleSelectAll = () => {
        if (selectedPages.length === pages.length) {
            setSelectedPages([]);
        } else {
            setSelectedPages(pages.map(p => p.pageId));
        }
    };

    const handleSubmit = async () => {
        if (selectedPages.length === 0) {
            alert('يرجى اختيار صفحة واحدة على الأقل');
            return;
        }

        // Validation
        if (postType === 'STORY' && mediaFiles.length === 0) {
            alert('يجب إضافة صورة أو فيديو لنشر القصة');
            return;
        }
        if (activeTab === 'LINK' && !linkUrl) {
            alert('يرجى إدخال الرابط');
            return;
        }
        if (activeTab === 'STATUS' && !message && mediaFiles.length === 0) {
            alert('يرجى كتابة نص أو إضافة وسائط');
            return;
        }
        if (isScheduled && !scheduledDate) {
            alert('يرجى تحديد موعد النشر');
            return;
        }

        setSubmitting(true);
        setResult(null);

        try {
            // 1. Upload Media if any
            const uploadedMediaUrls: string[] = [];
            if (mediaFiles.length > 0) {
                for (const file of mediaFiles) {
                    const uploadRes = await uploadService.uploadMedia(file);
                    if (uploadRes.success && uploadRes.data) {
                        let finalUrl = uploadRes.data.fullUrl || uploadRes.data.url;
                        if (finalUrl && !finalUrl.startsWith('http')) {
                            finalUrl = window.location.origin + finalUrl;
                        }
                        uploadedMediaUrls.push(finalUrl);
                    } else {
                        throw new Error(`فشل رفع الملف: ${file.name}`);
                    }
                }
            }

            // 2. Determine Media Type
            let mediaType = 'NONE';
            if (mediaFiles.length > 0) {
                // Check if video
                const hasVideo = mediaFiles.some(f => f.type.startsWith('video/'));
                if (hasVideo) mediaType = 'VIDEO';
                else if (mediaFiles.length > 1) mediaType = 'CAROUSEL'; // Or just multiple images
                else mediaType = 'IMAGE';
            }

            // 3. Prepare Payload
            const payload = {
                pageIds: selectedPages,
                message: message,
                mediaUrls: uploadedMediaUrls,
                mediaType: mediaType,
                linkUrl: activeTab === 'LINK' ? linkUrl : undefined,
                postType: postType,
                scheduledTime: isScheduled ? scheduledDate : undefined
            };

            const response = await companyAwareApi.post('/integrations/facebook/publish', payload);

            if (response.data.success) {
                setResult(response.data);
                // Reset form partially
                setMessage('');
                setMediaFiles([]);
                setMediaPreviews([]);
                setLinkUrl('');
            } else {
                alert('حدث خطأ أثناء النشر');
            }

        } catch (error: any) {
            console.error('Publishing error:', error);
            alert('فشل في عملية النشر: ' + (error.message || 'خطأ غير معروف'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="w-full p-6 space-y-6 min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">إنشاء ومجدولة المنشورات</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">انشر أو جدول محتواك على فيسبوك بكل سهولة</p>
                </div>
                <button
                    onClick={() => navigate('/facebook-inbox')}
                    className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center"
                >
                    <XMarkIcon className="w-5 h-5 ml-1" />
                    إلغاء
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Creator */}
                <div className="lg:col-span-2 space-y-6">

                    {/* 1. Page Selector */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-bold text-gray-800 dark:text-white flex items-center">
                                <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-xs ml-2">1</span>
                                اختر الصفحات
                            </h2>
                            <button onClick={handleSelectAll} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                                {selectedPages.length === pages.length ? 'إلغاء التحديد' : 'تحديد الكل'}
                            </button>
                        </div>

                        {loading ? (
                            <div className="animate-pulse space-y-2">
                                <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded"></div>
                                <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded"></div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                {pages.map(page => (
                                    <div
                                        key={page.id}
                                        onClick={() => togglePageSelection(page.pageId)}
                                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${selectedPages.includes(page.pageId)
                                            ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                                            : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        <div className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center mr-3 transition-colors ${selectedPages.includes(page.pageId) ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600'
                                            }`}>
                                            {selectedPages.includes(page.pageId) && <CheckCircleIcon className="w-4 h-4" />}
                                        </div>
                                        <span className="text-gray-700 dark:text-gray-300 font-medium truncate">{page.pageName}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">تم تحديد {selectedPages.length} صفحة</p>
                    </div>

                    {/* 2. Content Creator */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-4 border-b pb-4">
                            <div className="flex space-x-4 space-x-reverse">
                                <button
                                    onClick={() => setPostType('FEED')}
                                    className={`pb-2 px-1 text-sm font-semibold border-b-2 transition-colors ${postType === 'FEED' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                >
                                    منشور (Feed)
                                </button>
                                <button
                                    onClick={() => { setPostType('STORY'); setActiveTab('MEDIA'); }}
                                    className={`pb-2 px-1 text-sm font-semibold border-b-2 transition-colors ${postType === 'STORY' ? 'border-pink-600 text-pink-600' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                >
                                    قصة (Story)
                                </button>
                            </div>
                        </div>

                        {/* Tabs for Feed */}
                        {postType === 'FEED' && (
                            <div className="flex space-x-2 space-x-reverse mb-4">
                                <button onClick={() => setActiveTab('STATUS')} className={`flex items-center px-3 py-1.5 rounded-full text-sm ${activeTab === 'STATUS' ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                    <DocumentTextIcon className="w-4 h-4 ml-1" /> حالة
                                </button>
                                <button onClick={() => setActiveTab('MEDIA')} className={`flex items-center px-3 py-1.5 rounded-full text-sm ${activeTab === 'MEDIA' ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                    <PhotoIcon className="w-4 h-4 ml-1" /> صور/فيديو
                                </button>
                                <button onClick={() => setActiveTab('LINK')} className={`flex items-center px-3 py-1.5 rounded-full text-sm ${activeTab === 'LINK' ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                    <LinkIcon className="w-4 h-4 ml-1" /> رابط
                                </button>
                            </div>
                        )}

                        {/* Input Area */}
                        <div className="space-y-4">
                            {/* Text Input */}
                            {(activeTab !== 'LINK' || postType === 'FEED') && (
                                <textarea
                                    className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-base"
                                    placeholder={postType === 'STORY' ? "ملاحظة: القصص لا تدعم النص المرفق بشكل كامل في API." : "اكتب شيئاً مميزاً..."}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                            )}

                            {/* Link Input */}
                            {activeTab === 'LINK' && postType === 'FEED' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رابط المقال أو الصفحة</label>
                                    <div className="flex">
                                        <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm">
                                            https://
                                        </span>
                                        <input
                                            type="text"
                                            className="flex-1 min-w-0 block w-full px-3 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            placeholder="www.example.com"
                                            value={linkUrl}
                                            onChange={(e) => setLinkUrl(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Media Uploader */}
                            {(activeTab === 'MEDIA' || postType === 'STORY') && (
                                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                    <input
                                        type="file"
                                        id="mediaUpload"
                                        multiple={postType === 'FEED'} // Stories take 1 file
                                        accept="image/*,video/*"
                                        className="hidden"
                                        onChange={handleMediaChange}
                                    />
                                    <label htmlFor="mediaUpload" className="cursor-pointer flex flex-col items-center">
                                        <div className="bg-blue-50 p-3 rounded-full mb-3">
                                            <VideoCameraIcon className="w-8 h-8 text-blue-500" />
                                        </div>
                                        <span className="text-gray-900 dark:text-white font-medium">اضغط لإضافة صور أو فيديو</span>
                                        <span className="text-gray-500 dark:text-gray-400 text-xs mt-1">يدعم JPG, PNG, MP4</span>
                                    </label>
                                </div>
                            )}

                            {/* Previews */}
                            {mediaPreviews.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {mediaPreviews.map((preview, idx) => (
                                        <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 aspect-square">
                                            {preview.type === 'video' ? (
                                                <video src={preview.url} className="w-full h-full object-cover" />
                                            ) : (
                                                <img src={preview.url} alt="preview" className="w-full h-full object-cover" />
                                            )}
                                            <button
                                                onClick={() => removeMedia(idx)}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity transform hover:scale-110"
                                            >
                                                <XMarkIcon className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. Scheduling & Publish Action */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center space-x-2 space-x-reverse mb-2">
                                    <input
                                        type="checkbox"
                                        id="schedule"
                                        checked={isScheduled}
                                        onChange={(e) => setIsScheduled(e.target.checked)}
                                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                                    />
                                    <label htmlFor="schedule" className="text-gray-700 dark:text-gray-300 font-medium cursor-pointer select-none">
                                        جدولة المنشور لوقت لاحق
                                    </label>
                                </div>
                                {isScheduled && (
                                    <div className="mt-2">
                                        <input
                                            type="datetime-local"
                                            value={scheduledDate}
                                            onChange={(e) => setScheduledDate(e.target.value)}
                                            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        />
                                        <p className="text-xs text-amber-600 mt-1">يجب أن يكون الوقت بين 10 دقائق و 6 أشهر من الآن</p>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={submitting || selectedPages.length === 0}
                                className={`w-full sm:w-auto px-8 py-3 rounded-lg text-white font-bold shadow-lg flex items-center justify-center transition-all transform hover:-translate-y-0.5 ${submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                                    }`}
                            >
                                {submitting ? (
                                    'جاري النشر...'
                                ) : (
                                    <>
                                        <PaperAirplaneIcon className={`w-5 h-5 ml-2 ${isScheduled ? 'hidden' : ''}`} />
                                        <CalendarIcon className={`w-5 h-5 ml-2 ${!isScheduled ? 'hidden' : ''}`} />
                                        {isScheduled ? 'جدولة المنشور' : 'نشر الآن'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                </div>

                {/* Right Column: Preview & Results */}
                <div className="space-y-6">
                    {/* Live Preview Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden sticky top-6">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex items-center justify-between">
                            <h3 className="font-bold text-gray-700 dark:text-gray-300">معاينة البوست</h3>
                            <span className="text-xs font-mono text-gray-400 dark:text-gray-500">Desktop Preview</span>
                        </div>
                        <div className="p-4">
                            <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-700">
                                {/* Fake Header */}
                                <div className="flex items-center mb-3">
                                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full mr-3"></div>
                                    <div className="flex-1">
                                        <div className="w-24 h-4 bg-gray-200 dark:bg-gray-600 rounded mb-2"></div>
                                        <div className="w-16 h-3 bg-gray-100 dark:bg-gray-700 rounded"></div>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="space-y-3">
                                    <p className="text-gray-800 dark:text-gray-200 text-sm whitespace-pre-line dir-auto">
                                        {message || 'سيظهر نص منشورك هنا...'}
                                    </p>

                                    {linkUrl && activeTab === 'LINK' && (
                                        <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                                            <div className="text-blue-600 text-sm truncate">{linkUrl}</div>
                                            <div className="h-20 bg-gray-200 dark:bg-gray-600 rounded mt-2"></div>
                                        </div>
                                    )}

                                    {/* Media Grid Preview */}
                                    {mediaPreviews.length > 0 && (
                                        <div className={`grid gap-1 ${mediaPreviews.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} rounded-lg overflow-hidden border border-gray-100 dark:border-gray-600`}>
                                            {mediaPreviews.slice(0, 4).map((p, i) => (
                                                <div key={i} className={`relative bg-black dark:bg-gray-900 ${mediaPreviews.length === 3 && i === 0 ? 'col-span-2' : ''} h-40`}>
                                                    {p.type === 'video' ? (
                                                        <div className="w-full h-full flex items-center justify-center text-white bg-gray-800 dark:bg-gray-700">
                                                            <VideoCameraIcon className="w-8 h-8" />
                                                        </div>
                                                    ) : (
                                                        <img src={p.url} className="w-full h-full object-cover" />
                                                    )}
                                                </div>
                                            ))}
                                            {mediaPreviews.length > 4 && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white font-bold text-xl">
                                                    +{mediaPreviews.length - 4}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Results Area */}
                    {result && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-green-200 dark:border-green-700 overflow-hidden animate-fade-in">
                            <div className="p-4 border-b border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/30">
                                <h3 className="font-bold text-green-800 dark:text-green-300 flex items-center">
                                    <CheckCircleIcon className="w-5 h-5 ml-2" />
                                    تمت العملية بنجاح!
                                </h3>
                            </div>
                            <div className="p-4">
                                <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">{result.message}</p>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {result.results.map((res: any, idx: number) => (
                                        <div key={idx} className={`text-xs p-2 rounded border ${res.success ? 'bg-green-50 dark:bg-green-900/30 border-green-100 dark:border-green-700 text-green-800 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/30 border-red-100 dark:border-red-700 text-red-800 dark:text-red-300'}`}>
                                            <div className="flex justify-between">
                                                <span className="font-bold">{res.pageName}</span>
                                                <span>{res.success ? (isScheduled ? 'تمت الجدولة' : 'تم النشر') : 'فشل'}</span>
                                            </div>
                                            {!res.success && <div className="mt-1 text-red-600 dark:text-red-400">{res.error}</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FacebookPostCreator;

