import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CommentService from '../../services/commentService';

const CommentDetails = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [comment, setComment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [responseText, setResponseText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Fetch comment details
  const fetchComment = async () => {
    try {
      const response = await CommentService.getFacebookCommentById(id);
      if (response.success) {
        setComment(response.data);
        setResponseText(response.data.response || '');
      }
    } catch (error) {
      console.error('Error fetching comment:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle response update
  const handleUpdateResponse = async () => {
    if (!responseText.trim()) {
      setSaveMessage('Please enter a response before saving.');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }
    
    setIsSaving(true);
    setSaveMessage('');
    try {
      const result = await CommentService.sendManualResponseToFacebook(id, responseText);
      if (result.success) {
        setSaveMessage('Response saved and sent to Facebook successfully!');
        fetchComment(); // Refresh the comment data
        // Clear message after 3 seconds
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      setSaveMessage('Error saving response: ' + error.message);
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle comment deletion
  const handleDeleteComment = async () => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        const result = await CommentService.deleteFacebookComment(id);
        if (result.success) {
          alert('Comment deleted successfully');
          navigate('/comments');
        }
      } catch (error) {
        alert('Error deleting comment: ' + error.message);
      }
    }
  };

  useEffect(() => {
    fetchComment();
  }, [id]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">{t('commentDetails.loadingDetails')}</p>
        </div>
      </div>
    );
  }

  if (!comment) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">{t('commentDetails.notFoundTitle')}</h2>
          <p className="text-gray-600 mb-4">{t('commentDetails.notFoundDesc')}</p>
          <button
            onClick={() => navigate('/comments')}
            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
          >
            {t('commentDetails.backToComments')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/comments')}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('commentDetails.backToComments')}
        </button>
        <h1 className="text-2xl font-bold text-gray-800">{t('commentDetails.pageTitle')}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Comment Details */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">{t('commentDetails.infoTitle')}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('commentDetails.commentId')}</label>
                <div className="text-sm text-gray-900">{comment.commentId}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('commentDetails.postId')}</label>
                <div className="text-sm text-gray-900">{comment.postId}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('commentDetails.senderName')}</label>
                <div className="text-sm text-gray-900">{comment.senderName}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('commentDetails.senderId')}</label>
                <div className="text-sm text-gray-900">{comment.senderId}</div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('commentDetails.commentDate')}</label>
              <div className="text-sm text-gray-900">
                {new Date(comment.createdTime).toLocaleString()}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('commentDetails.commentText')}</label>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-gray-900">{comment.message}</p>
              </div>
            </div>

            {comment.respondedAt && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('commentDetails.repliedAt')}</label>
                <div className="text-sm text-gray-900">
                  {new Date(comment.respondedAt).toLocaleString()}
                </div>
              </div>
            )}
            
            {comment.response && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('commentDetails.previousReply')}</label>
                <div className="bg-blue-50 p-4 rounded-md">
                  <p className="text-gray-900">{comment.response}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Response Section */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">{t('commentDetails.replySectionTitle')}</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('commentDetails.yourReply')}</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="6"
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder={t('commentDetails.replyPlaceholder')}
              />
            </div>

            {saveMessage && (
              <div className={`mb-4 p-2 rounded text-center text-sm ${
                saveMessage.includes('Error') || saveMessage.includes('خطأ') 
                  ? 'bg-red-100 text-red-700' 
                  : 'bg-green-100 text-green-700'
              }`}>
                {saveMessage}
              </div>
            )}

            <div className="flex flex-col space-y-2">
              <button
                onClick={handleUpdateResponse}
                disabled={isSaving}
                className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition disabled:opacity-50"
              >
                {isSaving ? t('commentDetails.sending') : t('commentDetails.sendReplyToFacebook')}
              </button>
              
              <button
                onClick={handleDeleteComment}
                className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition"
              >
                {t('commentDetails.deleteComment')}
              </button>
            </div>
            
            <div className="mt-4 text-xs text-gray-500">
              <p>{t('commentDetails.note')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentDetails;