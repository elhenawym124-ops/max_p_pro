import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CommentService from '../../services/commentService';
import { MessageSquare, CheckCircle, Clock, Edit3, Trash2 } from 'lucide-react';

const PostComments = () => {
  const { t } = useTranslation();
  const { postId } = useParams();
  const navigate = useNavigate();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComments, setSelectedComments] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all'
  });

  const fetchComments = async () => {
    try {
      const response = await CommentService.getCommentsByPostId(postId, filters);
      if (response.success) {
        setComments(response.data);
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

  const handleUpdateResponse = async (commentId, response) => {
    if (!response || !response.trim()) {
      alert(t('unifiedComments.enterReply'));
      return;
    }
    
    try {
      const result = await CommentService.sendManualResponseToFacebook(commentId, response);
      if (result.success) {
        fetchComments();
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
          alert(t('unifiedComments.deletedSuccessfully'));
        }
      } catch (error) {
        console.error('Error deleting comment:', error);
        alert(t('unifiedComments.deleteError') + ': ' + error.message);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedComments.length === 0) {
      alert(t('unifiedComments.selectComments'));
      return;
    }
    
    if (window.confirm(`${t('unifiedComments.confirmDelete')} ${selectedComments.length} ${t('unifiedComments.comment')}؟`)) {
      try {
        const result = await CommentService.bulkDeleteFacebookComments(selectedComments);
        if (result.success) {
          setSelectedComments([]);
          fetchComments();
          alert(t('unifiedComments.deletedSuccessfully'));
        }
      } catch (error) {
        console.error('Error bulk deleting comments:', error);
        alert(t('unifiedComments.deleteError') + ': ' + error.message);
      }
    }
  };

  const toggleCommentSelection = (commentId) => {
    setSelectedComments(prev => 
      prev.includes(commentId) 
        ? prev.filter(id => id !== commentId)
        : [...prev, commentId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedComments.length === comments.length) {
      setSelectedComments([]);
    } else {
      setSelectedComments(comments.map(c => c.id));
    }
  };

  useEffect(() => {
    fetchComments();
  }, [postId, filters]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/posts')}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('postComments.backToPosts')}
        </button>
        <h1 className="text-2xl font-bold text-gray-800">{t('postComments.pageTitle')}</h1>
        <p className="text-gray-600">{t('postComments.postIdLabel')}: {postId}</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">{t('postComments.status')}</label>
            <select
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-right"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="all">{t('postComments.allComments')}</option>
              <option value="responded">{t('postComments.responded')}</option>
              <option value="pending">{t('postComments.pending')}</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              onClick={() => fetchComments()}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {t('postComments.refresh')}
            </button>
          </div>
          
          <div className="flex items-end">
            <button
              className="bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition"
              onClick={() => navigate(`/posts/${postId}/settings`)}
            >
              {t('postComments.autoResponseSettings')}
            </button>
          </div>
          
          {selectedComments.length > 0 && (
            <div className="flex items-end">
              <button
                className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition flex items-center gap-2"
                onClick={handleBulkDelete}
              >
                <Trash2 className="w-4 h-4" />
                {t('postComments.deleteSelected')} ({selectedComments.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Comments List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">{t('postComments.loadingComments')}</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">{t('postComments.noComments')}</h3>
            <p className="text-gray-500">{t('postComments.noCommentsDesc')}</p>
          </div>
        ) : (
          <>
            {/* Select All */}
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedComments.length === comments.length && comments.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">
                  {t('postComments.selectAll')} ({comments.length})
                </span>
              </label>
            </div>
            
            <div className="divide-y divide-gray-200">
              {comments.map((comment) => (
                <div key={comment.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedComments.includes(comment.id)}
                        onChange={() => toggleCommentSelection(comment.id)}
                        className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div className="bg-gray-200 border-2 border-dashed rounded-xl w-10 h-10" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-gray-900">{comment.senderName}</h4>
                          <span className="text-xs text-gray-500">{comment.senderId}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(comment.createdTime).toLocaleString('ar-EG')}
                        </p>
                      </div>
                    </div>
                    <div>
                    {comment.respondedAt ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3" />
                        {t('postComments.respondedLabel')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                        <Clock className="w-3 h-3" />
                        {t('postComments.pendingLabel')}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="mt-4 ml-13">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-800">{comment.message}</p>
                  </div>
                  
                  {comment.response && (
                    <div className="mt-3 bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <p className="text-gray-800">{comment.response}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {t('postComments.repliedAt')}: {new Date(comment.respondedAt).toLocaleString('ar-EG')}
                      </p>
                    </div>
                  )}
                  
                  {!comment.respondedAt && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          const response = prompt(t('postComments.replyPrompt'));
                          if (response !== null) {
                            handleUpdateResponse(comment.id, response);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                      >
                        <Edit3 className="w-4 h-4" />
                        {t('postComments.reply')}
                      </button>
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                        {t('postComments.delete')}
                      </button>
                    </div>
                  )}
                </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PostComments;