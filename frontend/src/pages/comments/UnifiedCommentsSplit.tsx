import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CommentService from '../../services/commentService';
import {
    MessageSquare,
    CheckCircle,
    Clock,
    Search,
    RefreshCw,
    Settings,
    X,
    Save,
    TrendingUp,
    Filter,
    Grid3x3,
    List,
    ChevronRight,
    Layout
} from 'lucide-react';

const UnifiedCommentsSplit = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    // State
    const [pages, setPages] = useState([]);
    const [posts, setPosts] = useState([]);
    const [selectedPage, setSelectedPage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingPages, setLoadingPages] = useState(true);

    // Filters
    const [filters, setFilters] = useState({
        search: '',
        status: 'all'
    });

    // Fetch Pages on Mount
    useEffect(() => {
        fetchPages();
    }, []);

    // Fetch Posts when Page Selected
    useEffect(() => {
        if (selectedPage) {
            fetchPosts(selectedPage);
        } else {
            setPosts([]);
        }
    }, [selectedPage]);

    const fetchPages = async () => {
        setLoadingPages(true);
        try {
            const response = await CommentService.getFacebookPages();
            if (response.success && response.data) {
                setPages(response.data);
                // Auto-select first page if available
                if (response.data.length > 0 && !selectedPage) {
                    setSelectedPage(response.data[0].pageId);
                }
            }
        } catch (error) {
            console.error('Error fetching pages:', error);
        } finally {
            setLoadingPages(false);
        }
    };

    const fetchPosts = async (pageId) => {
        setLoading(true);
        try {
            const response = await CommentService.getPostsByPageId(pageId);
            if (response.success) {
                setPosts(response.data);
            }
        } catch (error) {
            console.error('Error fetching posts:', error);
        } finally {
            setLoading(false);
        }
    };

    const getResponseMethodLabel = (method) => {
        switch (method) {
            case 'ai': return t('unifiedComments.aiResponse');
            case 'fixed': return t('unifiedComments.fixedResponse');
            case 'manual': return t('unifiedComments.manualResponse');
            default: return t('unifiedComments.notSpecified');
        }
    };

    const getResponseMethodColor = (method) => {
        switch (method) {
            case 'ai': return 'bg-blue-100 text-blue-800';
            case 'fixed': return 'bg-green-100 text-green-800';
            case 'manual': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // Filter posts locally for now (since API might not support all filters on this endpoint yet, or to be snappy)
    const filteredPosts = posts.filter(post => {
        const matchesSearch = filters.search === '' || post.postId.includes(filters.search) || (post.message && post.message.includes(filters.search));
        const matchesStatus = filters.status === 'all' ||
            (filters.status === 'responded' && post.pendingComments === 0) ||
            (filters.status === 'pending' && post.pendingComments > 0);
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="h-[calc(100vh-64px)] overflow-hidden bg-gray-50 dark:bg-gray-900 flex flex-col">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg text-white shadow-lg">
                            <Layout className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">إدارة المنشورات الموحدة</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">عرض مقسم للصفحات والمنشورات</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Global Filters could go here */}
                    </div>
                </div>
            </div>

            {/* Main Split View */}
            <div className="flex-1 flex overflow-hidden">

                {/* Left Column: Pages List */}
                <div className="w-1/4 min-w-[300px] border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto flex flex-col">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex-shrink-0">
                        <h2 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                            <List className="w-5 h-5" />
                            الصفحات ({pages.length})
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        {loadingPages ? (
                            <div className="text-center py-10">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                            </div>
                        ) : (
                            pages.map(page => (
                                <div
                                    key={page.pageId}
                                    onClick={() => setSelectedPage(page.pageId)}
                                    className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border border-transparent ${selectedPage === page.pageId
                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-sm'
                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold text-gray-900 dark:text-white truncate" title={page.pageName}>{page.pageName}</span>
                                        {selectedPage === page.pageId && <ChevronRight className="w-5 h-5 text-blue-500" />}
                                    </div>
                                    <div className="flex gap-2 text-xs text-gray-500 dark:text-gray-400">
                                        <span className="flex items-center gap-1"><Grid3x3 className="w-3 h-3" /> {page.totalPosts}</span>
                                        <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {page.totalComments}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Column: Posts List */}
                <div className="flex-1 bg-gray-50 dark:bg-gray-900 flex flex-col min-w-0">
                    {/* Posts Toolbar */}
                    <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-4 flex-shrink-0 shadow-sm z-10">
                        <div className="flex-1 relative min-w-[200px]">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="بحث في المنشورات..."
                                className="w-full pr-9 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 dark:text-white transition-all"
                                value={filters.search}
                                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            />
                        </div>

                        <select
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                            value={filters.status}
                            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                        >
                            <option value="all">كل الحالات</option>
                            <option value="pending">⏳ قيد الانتظار</option>
                            <option value="responded">✅ تم الرد</option>
                        </select>

                        <button
                            onClick={() => selectedPage && fetchPosts(selectedPage)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="تحديث"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {/* Posts Grid/List */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
                                <p>جاري تحميل المنشورات...</p>
                            </div>
                        ) : filteredPosts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                                    <MessageSquare className="w-12 h-12 text-gray-400" />
                                </div>
                                {selectedPage ? <p className="text-lg font-medium">لا توجد منشورات مطابقة</p> : <p className="text-lg font-medium">الرجاء اختيار صفحة لعرض المنشورات</p>}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {filteredPosts.map((post, index) => (
                                    <div
                                        key={post.postId}
                                        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col md:flex-row transition-all duration-200 hover:border-blue-400 group animate-fade-in"
                                        style={{ animationDelay: `${index * 0.05}s` }}
                                    >
                                        {/* Post Image (Left side in list view) */}
                                        <div className="md:w-32 md:h-32 relative bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                                            {post.pictureUrl ? (
                                                <img src={post.pictureUrl} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <MessageSquare className="w-6 h-6 text-gray-400" />
                                                </div>
                                            )}
                                            <div className="absolute top-1 right-1 md:left-1 md:right-auto">
                                                <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded shadow-sm ${getResponseMethodColor(post.responseMethod)}`}>
                                                    {getResponseMethodLabel(post.responseMethod)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Content (Middle) */}
                                        <div className="p-3 flex-1 flex flex-col min-w-0 justify-between">
                                            <div>
                                                <div className="flex items-start justify-between mb-1">
                                                    <span className="text-[10px] text-gray-500 font-mono" title={post.postId}>#{post.postId.substring(post.postId.length - 8)}</span>
                                                    <span className="text-[10px] text-gray-500">{new Date(post.firstCommentTime).toLocaleDateString('ar-EG')}</span>
                                                </div>

                                                <p className="text-xs font-medium text-gray-800 dark:text-gray-200 line-clamp-2 mb-2" title={post.message}>
                                                    {post.message || 'لا يوجد نص'}
                                                </p>
                                            </div>

                                            {/* Stats Bar - Compact */}
                                            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                                <div className="flex items-center gap-1">
                                                    <MessageSquare className="w-3 h-3 text-blue-500" />
                                                    <span className="font-bold text-gray-700 dark:text-gray-300">{post.totalComments}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                    <span>منتظر: <span className="font-bold text-gray-700 dark:text-gray-300">{post.pendingComments}</span></span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                                    <span>الرد: <span className="font-bold text-gray-700 dark:text-gray-300">{post.responseRate}%</span></span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions (Right side or Bottom) */}
                                        <div className="p-2 bg-gray-50 dark:bg-gray-900/50 border-t md:border-t-0 md:border-r border-gray-100 dark:border-gray-700 flex md:flex-col justify-center gap-2 md:w-32 flex-shrink-0">
                                            <button
                                                onClick={() => navigate(`/posts/${post.postId}/comments`)}
                                                className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 px-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-1"
                                            >
                                                <MessageSquare className="w-3 h-3" />
                                                التعليقات
                                            </button>
                                            <button
                                                onClick={() => navigate(`/posts/${post.postId}/settings`)}
                                                className="flex-1 md:flex-none py-1.5 px-3 text-gray-600 hover:text-blue-600 hover:bg-white rounded-lg transition-colors border border-gray-200 hover:border-blue-200 flex items-center justify-center gap-1 text-xs"
                                            >
                                                <Settings className="w-3 h-3" />
                                                الإعدادات
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UnifiedCommentsSplit;
