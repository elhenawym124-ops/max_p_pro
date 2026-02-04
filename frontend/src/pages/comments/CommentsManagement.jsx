import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CommentService from '../../services/commentService';
import { MessageSquare, CheckCircle, Clock, Search, RefreshCw, Trash2, Edit3 } from 'lucide-react';

const CommentsManagement = () => {
  const { t } = useTranslation();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({});
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

  const fetchStats = async () => {
    try {
      const response = await CommentService.getCommentStats();
      if (response.success) {
        setStats(response.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching comment statistics:', error);
    }
  };

  const fetchComments = async () => {
    setLoading(true);
    try {
      const response = await CommentService.getFacebookComments(filters);
      if (response.success) {
        setComments(response.data);
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
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

  const handleUpdateResponse = async (commentId, response) => {
    if (!response || !response.trim()) {
      alert(t('unifiedComments.enterReply'));
      return;
    }
    
    try {
      const result = await CommentService.sendManualResponseToFacebook(commentId, response);
      if (result.success) {
        fetchComments();
        fetchStats();
        alert(t('unifiedComments.replySaved'));
      }
    } catch (error) {
      alert(t('unifiedComments.replyError') + ': ' + error.message);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (window.confirm(t('unifiedComments.confirmDeleteComment'))) {
      try {
        const result = await CommentService.deleteFacebookComment(commentId);
        if (result.success) {
          fetchComments();
          fetchStats();
        }
      } catch (error) {
        console.error('Error deleting comment:', error);
      }
    }
  };

  const handleBulkDelete = async (commentIds) => {
    if (window.confirm(`${t('unifiedComments.confirmDelete')} ${commentIds.length} ${t('unifiedComments.comment')}؟`)) {
      try {
        const result = await CommentService.bulkDeleteFacebookComments(commentIds);
        if (result.success) {
          fetchComments();
          fetchStats();
        }
      } catch (error) {
        console.error('Error deleting comments:', error);
      }
    }
  };

  useEffect(() => {
    fetchStats();
    fetchComments();
  }, [filters]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">{t('commentsManagement.pageTitle')}</h1>
              <p className="text-slate-600 mt-1">{t('commentsManagement.pageSubtitle')}</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-5xl font-black text-white">{stats.currentPage || 0}</div>
                </div>
              </div>
              <div className="text-blue-100 text-sm font-medium">{t('commentsManagement.currentPage')}</div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-5xl font-black text-white">{stats.totalPages || 0}</div>
                </div>
              </div>
              <div className="text-emerald-100 text-sm font-medium">{t('commentsManagement.totalPages')}</div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-5xl font-black text-white">{stats.totalCount || 0}</div>
                </div>
              </div>
              <div className="text-amber-100 text-sm font-medium">{t('commentsManagement.totalCommentsAll')}</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 mb-8 border border-white/20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">{t('commentsManagement.search')}</label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  className="w-full pr-10 pl-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-right"
                  placeholder={t('commentsManagement.searchPlaceholder')}
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">{t('commentsManagement.status')}</label>
              <select
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-right"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="all">{t('commentsManagement.allComments')}</option>
                <option value="responded">{t('commentsManagement.responded')}</option>
                <option value="pending">{t('commentsManagement.pending')}</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">{t('commentsManagement.itemsCount')}</label>
              <select
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-right"
                value={filters.limit}
                onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 font-semibold"
                onClick={() => fetchComments()}
              >
                <RefreshCw className="w-5 h-5" />
                {t('commentsManagement.refresh')}
              </button>
            </div>
          </div>
        </div>

        {/* Comments Table */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden border border-white/20">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-4 text-slate-600 font-medium">{t('commentsManagement.loadingComments')}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">{t('commentsManagement.table_comment')}</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">{t('commentsManagement.table_sender')}</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">{t('commentsManagement.table_postId')}</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">{t('commentsManagement.table_date')}</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">{t('commentsManagement.table_status')}</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">{t('commentsManagement.table_actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {comments.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <MessageSquare className="w-16 h-16 text-slate-300 mb-4" />
                            <p className="text-slate-500 text-lg font-medium">{t('commentsManagement.noComments')}</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      comments.map((comment) => (
                        <tr key={comment.id} className="hover:bg-blue-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <Link 
                              to={`/comments/${comment.id}`} 
                              className="text-sm text-blue-600 hover:text-blue-800 font-medium max-w-xs truncate block transition-colors" 
                              title={comment.message}
                            >
                              {comment.message}
                            </Link>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-semibold text-slate-900">{comment.senderName}</div>
                            <div className="text-xs text-slate-500 mt-1">{comment.senderId}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-slate-700 font-mono max-w-xs truncate" title={comment.postId}>
                              {comment.postId}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-slate-900">
                              {new Date(comment.createdTime).toLocaleDateString('ar-EG')}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {new Date(comment.createdTime).toLocaleTimeString('ar-EG')}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {comment.respondedAt ? (
                              <span className="px-3 py-1.5 inline-flex items-center gap-1 text-xs leading-5 font-bold rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 border border-emerald-200">
                                <CheckCircle className="w-3.5 h-3.5" />
                                {t('commentsManagement.respondedLabel')}
                              </span>
                            ) : (
                              <span className="px-3 py-1.5 inline-flex items-center gap-1 text-xs leading-5 font-bold rounded-full bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border border-amber-200">
                                <Clock className="w-3.5 h-3.5" />
                                {t('commentsManagement.pendingLabel')}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => {
                                  const response = prompt(t('unifiedComments.replyPrompt'), comment.response || '');
                                  if (response !== null) {
                                    handleUpdateResponse(comment.id, response);
                                  }
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                title={comment.respondedAt ? t('commentsManagement.edit') : t('commentsManagement.reply')}
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                title={t('commentsManagement.delete')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 flex items-center justify-between border-t border-slate-200">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={pagination.currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border-2 border-slate-300 text-sm font-semibold rounded-xl text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {t('commentsManagement.previous')}
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={pagination.currentPage === pagination.totalPages}
                      className="mr-3 relative inline-flex items-center px-4 py-2 border-2 border-slate-300 text-sm font-semibold rounded-xl text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {t('commentsManagement.next')}
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-slate-700 font-medium">
                        {t('commentsManagement.showing')} <span className="font-bold text-blue-600">{(pagination.currentPage - 1) * filters.limit + 1}</span> {t('commentsManagement.to')}{' '}
                        <span className="font-bold text-blue-600">
                          {Math.min(pagination.currentPage * filters.limit, pagination.totalCount)}
                        </span> {t('commentsManagement.of')}{' '}
                        <span className="font-bold text-blue-600">{pagination.totalCount}</span> {t('commentsManagement.result')}
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-xl shadow-sm gap-1" aria-label="Pagination">
                        <button
                          onClick={() => handlePageChange(pagination.currentPage - 1)}
                          disabled={pagination.currentPage === 1}
                          className="relative inline-flex items-center px-3 py-2 rounded-lg bg-white border-2 border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          {t('commentsManagement.previous')}
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
                              className={`relative inline-flex items-center px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                                page === pagination.currentPage
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
                          {t('commentsManagement.next')}
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentsManagement;
