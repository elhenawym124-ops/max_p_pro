import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CommentService from '../../services/commentService';
import { MessageSquare, CheckCircle, Clock, Search, RefreshCw, Settings, X, Save, TrendingUp, Users, BarChart3, Zap, Filter, Grid3x3, List } from 'lucide-react';

const PostsManagement = () => {
  const { t } = useTranslation();
  const [posts, setPosts] = useState([]);
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingPages, setLoadingPages] = useState(true);
  const [showPageSettings, setShowPageSettings] = useState(false);
  const [pageSettings, setPageSettings] = useState({
    responseMethod: 'manual',
    commentMessages: [''],
    fixedMessengerMessage: '',
    aiPrompt: ''
  });
  const [savingPageSettings, setSavingPageSettings] = useState(false);
  const [pageSettingsMessage, setPageSettingsMessage] = useState('');
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    search: '',
    status: 'all'
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0
  });
  const navigate = useNavigate();

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

  const fetchPosts = async () => {
    if (!selectedPage) return;

    setLoading(true);
    try {
      const response = await CommentService.getPostsByPageId(selectedPage);
      if (response.success) {
        console.log(response.data)
        setPosts(response.data);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  useEffect(() => {
    fetchPages();
  }, []);

  useEffect(() => {
    if (selectedPage) {
      fetchPosts();
      fetchPageSettings();
    }
  }, [selectedPage]);

  const fetchPageSettings = async () => {
    if (!selectedPage) return;
    try {
      const response = await CommentService.getPageResponseMethod(selectedPage);
      if (response.success && response.data) {
        setPageSettings({
          responseMethod: response.data.responseMethod || 'manual',
          commentMessages: response.data.commentMessages ? JSON.parse(response.data.commentMessages) : [''],
          fixedMessengerMessage: response.data.fixedMessengerMessage || '',
          aiPrompt: response.data.aiPrompt || ''
        });
      }
    } catch (error) {
      console.error('Error fetching page settings:', error);
    }
  };

  const savePageSettings = async () => {
    if (pageSettings.responseMethod === 'fixed' && (!pageSettings.commentMessages || pageSettings.commentMessages.length === 0 || !pageSettings.commentMessages[0].trim())) {
      setPageSettingsMessage(t('postsManagement.note'));
      return;
    }

    setSavingPageSettings(true);
    setPageSettingsMessage('');
    try {
      const response = await CommentService.setPageResponseMethod(selectedPage, pageSettings);
      if (response.success) {
        setPageSettingsMessage(t('pageComments.savedSuccessfully') + ' ✅');
        setTimeout(() => {
          setShowPageSettings(false);
          setPageSettingsMessage('');
        }, 2000);
      }
    } catch (error) {
      setPageSettingsMessage(t('pageComments.saveError') + ': ' + error.message);
    } finally {
      setSavingPageSettings(false);
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

  // Calculate stats
  const totalPosts = posts.length;
  const totalComments = posts.reduce((sum, post) => sum + (post.totalComments || 0), 0);
  const respondedComments = posts.reduce((sum, post) => sum + (post.respondedComments || 0), 0);
  const avgResponseRate = posts.length > 0 ? Math.round(posts.reduce((sum, post) => sum + (post.responseRate || 0), 0) / posts.length) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-8">
      <div className="w-full">
        {/* Header with Stats */}
        <div className="mb-8 animate-fade-in">
          {/* Title Section */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl blur-lg opacity-50 animate-pulse"></div>
                <div className="relative p-4 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-2xl">
                  <MessageSquare className="w-8 h-8 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">{t('postsManagement.pageTitle')}</h1>
                <p className="text-slate-600 dark:text-gray-300 mt-2 text-lg font-medium">{t('postsManagement.pageSubtitle')}</p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          {selectedPage && posts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
              {/* Total Posts */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-blue-400/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-semibold mb-1">إجمالي المنشورات</p>
                    <h3 className="text-4xl font-black text-white">{totalPosts}</h3>
                  </div>
                  <div className="p-4 bg-white/20 rounded-xl backdrop-blur-sm">
                    <Grid3x3 className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>

              {/* Total Comments */}
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-indigo-400/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-indigo-100 text-sm font-semibold mb-1">إجمالي التعليقات</p>
                    <h3 className="text-4xl font-black text-white">{totalComments}</h3>
                  </div>
                  <div className="p-4 bg-white/20 rounded-xl backdrop-blur-sm">
                    <MessageSquare className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>

              {/* Responded Comments */}
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-green-400/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-semibold mb-1">تم الرد عليها</p>
                    <h3 className="text-4xl font-black text-white">{respondedComments}</h3>
                  </div>
                  <div className="p-4 bg-white/20 rounded-xl backdrop-blur-sm">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>

              {/* Average Response Rate */}
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-purple-400/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-semibold mb-1">معدل الاستجابة</p>
                    <h3 className="text-4xl font-black text-white">{avgResponseRate}%</h3>
                  </div>
                  <div className="p-4 bg-white/20 rounded-xl backdrop-blur-sm">
                    <TrendingUp className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Page Selector */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl shadow-2xl p-6 mb-8 border border-white/30 dark:border-gray-700/30">
          <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            {t('postsManagement.selectPage')}
          </label>
          {loadingPages ? (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pages.map((page) => (
                <div
                  key={page.pageId}
                  className={`p-5 rounded-2xl border-2 transition-all duration-300 ${selectedPage === page.pageId
                    ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 shadow-xl scale-105'
                    : 'border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-blue-300 hover:shadow-lg hover:scale-102'
                    }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 text-right">
                      <div className="font-bold text-slate-800">{page.pageName}</div>
                      <div className="text-sm text-slate-600 mt-2 flex gap-3">
                        <span>📝 {page.totalPosts} منشور</span>
                        <span>💬 {page.totalComments} تعليق</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPage(page.pageId);
                        setShowPageSettings(true);
                      }}
                      className="group p-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-xl hover:scale-110 flex-shrink-0"
                      title={t('postsManagement.pageSettings')}
                    >
                      <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                  </div>
                  <button
                    onClick={() => setSelectedPage(page.pageId)}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105"
                  >
                    {t('postsManagement.viewPosts')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filters */}
        {selectedPage && (
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl shadow-2xl p-6 mb-8 border border-white/30 dark:border-gray-700/30">
            <div className="flex items-center gap-2 mb-5">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg">
                <Filter className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">فلاتر البحث</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Search className="w-4 h-4 text-blue-600" />
                  {t('postsManagement.search')}
                </label>
                <div className="relative">
                  <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    className="w-full pr-12 pl-4 py-3.5 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-gray-700 dark:to-gray-600 border-2 border-slate-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all text-right font-medium shadow-sm"
                    placeholder={t('postsManagement.searchPlaceholder')}
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  {t('postsManagement.status')}
                </label>
                <select
                  className="w-full px-4 py-3.5 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-gray-700 dark:to-gray-600 border-2 border-slate-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 dark:text-white transition-all text-right font-semibold shadow-sm"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="all">📊 {t('postsManagement.allPosts')}</option>
                  <option value="responded">✅ {t('postsManagement.responded')}</option>
                  <option value="pending">⏳ {t('postsManagement.pending')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <List className="w-4 h-4 text-blue-600" />
                  {t('postsManagement.itemsCount')}
                </label>
                <select
                  className="w-full px-4 py-3.5 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-gray-700 dark:to-gray-600 border-2 border-slate-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 dark:text-white transition-all text-right font-semibold shadow-sm"
                  value={filters.limit}
                  onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                >
                  <option value="10">10 منشورات</option>
                  <option value="20">20 منشور</option>
                  <option value="50">50 منشور</option>
                  <option value="100">100 منشور</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  className="group w-full max-w-xs bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2 font-bold"
                  onClick={() => fetchPosts()}
                  disabled={loading}
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                  {t('postsManagement.refresh')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Posts Grid - Facebook Style */}
        {selectedPage && (
          <div>
            {loading ? (
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl shadow-2xl p-16 text-center border border-white/30 dark:border-gray-700/30">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-30 animate-pulse"></div>
                  <div className="relative inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                </div>
                <p className="mt-6 text-slate-600 dark:text-gray-300 font-bold text-lg">{t('postsManagement.loadingPosts')}</p>
                <p className="mt-2 text-slate-500 dark:text-gray-400 text-sm">الرجاء الانتظار...</p>
              </div>
            ) : (
              <>
                {posts.length === 0 ? (
                  <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl shadow-2xl p-16 text-center border border-white/30 dark:border-gray-700/30">
                    <div className="relative inline-block mb-6">
                      <div className="absolute inset-0 bg-blue-200 rounded-full blur-2xl opacity-20"></div>
                      <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-8 rounded-3xl border-2 border-dashed border-blue-200 dark:border-blue-700">
                        <MessageSquare className="w-24 h-24 text-blue-400" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t('postsManagement.noPosts')}</h3>
                    <p className="text-slate-500 dark:text-gray-400 text-lg">لم يتم العثور على أي منشورات</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {posts.map((post, index) => (
                      <div key={post.postId} className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-slate-200 dark:border-gray-700 overflow-hidden hover:scale-105 hover:border-blue-400 animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                        {/* Post Image */}
                        {post.pictureUrl && (
                          <div className="relative h-48 bg-slate-100 overflow-hidden">
                            <img
                              src={post.pictureUrl}
                              alt="Post"
                              className="w-full h-full object-cover"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          </div>
                        )}

                        {/* Post Header */}
                        <div className="p-4 border-b border-slate-100">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                              <MessageSquare className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-slate-900 truncate" title={post.postId}>
                                {t('postsManagement.postLabel')} #{post.postId.substring(post.postId.length - 8)}
                              </div>
                              <div className="text-xs text-slate-500">
                                {(post.firstCommentTime || post.lastCommentTime) ? new Date(post.firstCommentTime || post.lastCommentTime).toLocaleDateString('ar-EG', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : 'No date'}
                              </div>
                            </div>
                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${getResponseMethodColor(post.responseMethod)}`}>
                              {post.responseMethod === 'ai' ? '🤖' : post.responseMethod === 'fixed' ? '📝' : '✋'}
                            </span>
                          </div>

                          {/* Post Description */}
                          {post.message && (
                            <div className="mt-3 text-xs text-slate-600 line-clamp-3" title={post.message}>
                              {post.message}
                            </div>
                          )}
                        </div>

                        {/* Latest Comment Preview */}
                        {
                          post.latestComment && (
                            <div className="p-4 bg-slate-50 border-b border-slate-100">
                              <div className="flex items-start gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                  {(post.latestComment.senderName || '?').charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-semibold text-slate-700">{post.latestComment.senderName || t('postsManagement.unknownCustomer')}</div>
                                  <div className="text-xs text-slate-600 mt-1 line-clamp-2" title={post.latestComment.message}>
                                    {post.latestComment.message || t('postsManagement.image')}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        }

                        {/* Stats */}
                        < div className="p-4 space-y-3" >
                          {/* Comments Count */}
                          < div className="flex items-center justify-between" >
                            <span className="text-xs text-slate-600 font-medium">{t('postsManagement.comments')}</span>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                                {post.totalComments}
                              </span>
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                {post.respondedComments}
                              </span>
                              <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {post.pendingComments}
                              </span>
                            </div>
                          </div>

                          {/* Response Rate */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-slate-600 font-medium">{t('postsManagement.responseRate')}</span>
                              <span className="text-xs font-bold text-slate-700">{post.responseRate}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all"
                                style={{ width: `${post.responseRate}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Response Method */}
                          <div className="pt-2 border-t border-slate-100">
                            <span className={`px-3 py-1.5 inline-flex items-center gap-1 text-xs font-bold rounded-full w-full justify-center ${getResponseMethodColor(post.responseMethod)}`}>
                              {getResponseMethodLabel(post.responseMethod)}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-gray-700 dark:to-gray-600 flex gap-3">
                          <button
                            onClick={() => navigate(`/posts/${post.postId}/comments`)}
                            className="group flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-bold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 flex items-center justify-center gap-2"
                          >
                            <MessageSquare className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            {t('postsManagement.viewComments')}
                          </button>
                          <button
                            onClick={() => navigate(`/posts/${post.postId}/settings`)}
                            className="group flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 flex items-center justify-center gap-2"
                          >
                            <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                            {t('postsManagement.settings')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
                }

                {/* Pagination */}
                {
                  pagination.totalPages > 1 && (
                    <div className="mt-6 bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/20">
                      <div className="flex-1 flex justify-between sm:hidden">
                        <button
                          onClick={() => handlePageChange(pagination.currentPage - 1)}
                          disabled={pagination.currentPage === 1}
                          className="relative inline-flex items-center px-4 py-2 border-2 border-slate-300 text-sm font-semibold rounded-xl text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          {t('postsManagement.previous')}
                        </button>
                        <button
                          onClick={() => handlePageChange(pagination.currentPage + 1)}
                          disabled={pagination.currentPage === pagination.totalPages}
                          className="mr-3 relative inline-flex items-center px-4 py-2 border-2 border-slate-300 text-sm font-semibold rounded-xl text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          {t('postsManagement.next')}
                        </button>
                      </div>
                      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-slate-700 font-medium">
                            {t('postsManagement.showing')} <span className="font-bold text-blue-600">{(pagination.currentPage - 1) * filters.limit + 1}</span> {t('postsManagement.to')}{' '}
                            <span className="font-bold text-blue-600">
                              {Math.min(pagination.currentPage * filters.limit, pagination.totalCount)}
                            </span> {t('postsManagement.of')}{' '}
                            <span className="font-bold text-blue-600">{pagination.totalCount}</span> {t('postsManagement.result')}
                          </p>
                        </div>
                        <div>
                          <nav className="relative z-0 inline-flex rounded-xl shadow-sm gap-1" aria-label="Pagination">
                            <button
                              onClick={() => handlePageChange(pagination.currentPage - 1)}
                              disabled={pagination.currentPage === 1}
                              className="relative inline-flex items-center px-3 py-2 rounded-lg bg-white border-2 border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                              {t('postsManagement.previous')}
                            </button>
                            {[...Array(Math.min(pagination.totalPages, 7))].map((_, i) => {
                              let page;
                              if (pagination.totalPages <= 7) {
                                page = i + 1;
                              } else if (pagination.currentPage <= 4) {
                                page = i + 1;
                              } else if (pagination.currentPage >= pagination.totalPages - 3) {
                                page = pagination.totalPages - 6 + i;
                              } else {
                                page = pagination.currentPage - 3 + i;
                              }

                              return (
                                <button
                                  key={page}
                                  onClick={() => handlePageChange(page)}
                                  className={`relative inline-flex items-center px-4 py-2 text-sm font-bold rounded-lg transition-all ${page === pagination.currentPage
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105'
                                    : 'bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                  {page}
                                </button>
                              );
                            })}
                            <button
                              onClick={() => handlePageChange(pagination.currentPage + 1)}
                              disabled={pagination.currentPage === pagination.totalPages}
                              className="relative inline-flex items-center px-3 py-2 rounded-lg bg-white border-2 border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                              {t('postsManagement.next')}
                            </button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  )
                }
              </>
            )}
          </div >
        )}

        {/* Page Settings Modal */}
        {
          showPageSettings && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Settings className="w-6 h-6" />
                    <div>
                      <h2 className="text-2xl font-bold">{t('postsManagement.pageSettings')}</h2>
                      <p className="text-sm text-white/80 mt-1">
                        {pages.find(p => p.pageId === selectedPage)?.pageName || t('postsManagement.selectPage')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPageSettings(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 space-y-6">
                  <div className="bg-blue-50 border-r-4 border-blue-500 p-4 rounded-lg">
                    <p className="text-sm text-blue-800 font-medium">
                      ℹ️ <strong>{t('postsManagement.note')}:</strong> {t('postsManagement.noteFallback')}
                    </p>
                    <p className="text-xs text-blue-700 mt-2">
                      • {t('postsManagement.noteFallback')}
                    </p>
                  </div>

                  {/* Response Method Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">{t('postsManagement.responseMethodLabel')}</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <button
                        onClick={() => setPageSettings(prev => ({ ...prev, responseMethod: 'ai' }))}
                        className={`p-4 rounded-xl border-2 transition-all ${pageSettings.responseMethod === 'ai'
                          ? 'border-blue-500 bg-blue-50 shadow-lg'
                          : 'border-slate-200 hover:border-blue-300'
                          }`}
                      >
                        <div className="text-center">
                          <div className="text-2xl mb-2">🤖</div>
                          <div className="font-bold text-slate-800">{t('postsManagement.ai')}</div>
                        </div>
                      </button>
                      <button
                        onClick={() => setPageSettings(prev => ({ ...prev, responseMethod: 'fixed' }))}
                        className={`p-4 rounded-xl border-2 transition-all ${pageSettings.responseMethod === 'fixed'
                          ? 'border-green-500 bg-green-50 shadow-lg'
                          : 'border-slate-200 hover:border-green-300'
                          }`}
                      >
                        <div className="text-center">
                          <div className="text-2xl mb-2">📝</div>
                          <div className="font-bold text-slate-800">{t('postsManagement.fixed')}</div>
                        </div>
                      </button>
                      <button
                        onClick={() => setPageSettings(prev => ({ ...prev, responseMethod: 'manual' }))}
                        className={`p-4 rounded-xl border-2 transition-all ${pageSettings.responseMethod === 'manual'
                          ? 'border-yellow-500 bg-yellow-50 shadow-lg'
                          : 'border-slate-200 hover:border-yellow-300'
                          }`}
                      >
                        <div className="text-center">
                          <div className="text-2xl mb-2">✋</div>
                          <div className="font-bold text-slate-800">{t('postsManagement.manual')}</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* AI Settings */}
                  {pageSettings.responseMethod === 'ai' && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">{t('postsManagement.aiPromptOptional')}</label>
                      <textarea
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                        rows="4"
                        value={pageSettings.aiPrompt}
                        onChange={(e) => setPageSettings(prev => ({ ...prev, aiPrompt: e.target.value }))}
                        placeholder={t('postsManagement.enterAIPrompt')}
                      />
                    </div>
                  )}

                  {/* Fixed Response Settings */}
                  {pageSettings.responseMethod === 'fixed' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">{t('postsManagement.fixedCommentVariations')}</label>
                        {pageSettings.commentMessages.map((msg, index) => (
                          <div key={index} className="mb-2 flex gap-2">
                            <textarea
                              className="flex-1 px-3 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                              rows="2"
                              value={msg}
                              onChange={(e) => {
                                const newMessages = [...pageSettings.commentMessages];
                                newMessages[index] = e.target.value;
                                setPageSettings(prev => ({ ...prev, commentMessages: newMessages }));
                              }}
                              placeholder={`${t('unifiedComments.reply')} ${index + 1}...`}
                            />
                            {pageSettings.commentMessages.length > 1 && (
                              <button
                                onClick={() => {
                                  const newMessages = pageSettings.commentMessages.filter((_, i) => i !== index);
                                  setPageSettings(prev => ({ ...prev, commentMessages: newMessages }));
                                }}
                                className="px-3 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition"
                              >
                                {t('postsManagement.cancel')}
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            setPageSettings(prev => ({ ...prev, commentMessages: [...prev.commentMessages, ''] }));
                          }}
                          className="mt-2 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition text-sm"
                        >
                          {t('postsManagement.addReply')}
                        </button>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">{t('postsManagement.fixedMessengerMessage')}</label>
                        <textarea
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                          rows="3"
                          value={pageSettings.fixedMessengerMessage}
                          onChange={(e) => setPageSettings(prev => ({ ...prev, fixedMessengerMessage: e.target.value }))}
                          placeholder={t('postsManagement.enterMessengerMessage')}
                        />
                      </div>
                    </div>
                  )}

                  {/* Message */}
                  {pageSettingsMessage && (
                    <div className={`p-4 rounded-xl text-center font-medium ${pageSettingsMessage.includes('خطأ') || pageSettingsMessage.includes('Error')
                      ? 'bg-red-100 text-red-700'
                      : 'bg-green-100 text-green-700'
                      }`}>
                      {pageSettingsMessage}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t border-slate-200">
                    <button
                      onClick={savePageSettings}
                      disabled={savingPageSettings}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                    >
                      <Save className="w-5 h-5" />
                      {savingPageSettings ? t('postsManagement.saving') : t('postsManagement.saveSettings')}
                    </button>
                    <button
                      onClick={() => setShowPageSettings(false)}
                      className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-all"
                    >
                      {t('postsManagement.cancel')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        }
      </div >
    </div >
  );
};

// Add custom CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fade-in {
    animation: fade-in 0.5s ease-out;
  }
`;
if (!document.head.querySelector('style[data-posts-management]')) {
  style.setAttribute('data-posts-management', 'true');
  document.head.appendChild(style);
}

export default PostsManagement;
