import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CommentService from '../../services/commentService';
import { Bot, MessageSquare, Settings } from 'lucide-react';

const PostSettings = () => {
  const { t } = useTranslation();
  const { postId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [postSettings, setPostSettings] = useState({
    responseMethod: 'manual', // 'ai', 'fixed', 'manual'
    commentMessages: [''], // Variations for comment responses
    fixedMessengerMessage: '',
    aiPrompt: ''
  });
  const [message, setMessage] = useState('');
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  const fetchPostSettings = async () => {
    try {
      const response = await CommentService.getPostResponseMethod(postId);
      if (response.success && response.data) {
        setPostSettings({
          responseMethod: response.data.responseMethod || 'manual',
          commentMessages: response.data.commentMessages ? JSON.parse(response.data.commentMessages) : [''],
          fixedMessengerMessage: response.data.fixedMessengerMessage || '',
          aiPrompt: response.data.aiPrompt || ''
        });
        
        // Check if we're in fallback mode
        if (response.data.updatedAt && !response.data.id) {
          setIsFallbackMode(true);
        }
      }
    } catch (error) {
      console.error('Error fetching post settings:', error);
      setMessage(t('pageComments.saveError'));
    } finally {
      setLoading(false);
    }
  };

  const savePostSettings = async () => {
    if (postSettings.responseMethod === 'fixed' && (!postSettings.commentMessages || postSettings.commentMessages.length === 0 || !postSettings.commentMessages[0].trim())) {
      setMessage(t('postsManagement.note'));
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      const response = await CommentService.setPostResponseMethod(postId, postSettings);
      if (response.success) {
        setMessage(response.message || t('pageComments.savedSuccessfully'));
        
        // Check if we're in fallback mode
        if (response.message && response.message.includes('fallback')) {
          setIsFallbackMode(true);
        }
        
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error saving post settings:', error);
      setMessage(t('pageComments.saveError') + ': ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const applyResponseMethod = async () => {
    if (isFallbackMode) {
      setMessage(t('postSettings.applyResponseDisabled'));
      return;
    }
    
    if (window.confirm('هل أنت متأكد من تطبيق طريقة الرد على جميع التعليقات المعلقة في هذا المنشور؟')) {
      try {
        const response = await CommentService.applyPostResponseMethod(postId);
        if (response.success) {
          setMessage(`تم معالجة ${response.data.processedComments} تعليق`);
          setTimeout(() => setMessage(''), 3000);
        }
      } catch (error) {
        console.error('Error applying response method:', error);
        setMessage('حدث خطأ أثناء تطبيق طريقة الرد: ' + error.message);
      }
    }
  };

  useEffect(() => {
    fetchPostSettings();
  }, [postId]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">{t('postSettings.loadingPostSettings')}</p>
        </div>
      </div>
    );
  }

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
          {t('postSettings.backToPosts')}
        </button>
        <h1 className="text-2xl font-bold text-gray-800">{t('postSettings.pageTitle')}</h1>
        <p className="text-gray-600">{t('postSettings.postIdLabel')}: {postId}</p>
        {isFallbackMode && (
          <div className="mt-2 p-2 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
            {t('postSettings.fallbackWarning')}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              {t('postSettings.autoResponseMethodTitle')}
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">{t('postSettings.chooseResponseMethod')}</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      postSettings.responseMethod === 'ai' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setPostSettings(prev => ({ ...prev, responseMethod: 'ai' }))}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">{t('postSettings.ai')}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {t('postSettings.aiDesc')}
                    </p>
                  </div>
                  
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      postSettings.responseMethod === 'fixed' 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setPostSettings(prev => ({ ...prev, responseMethod: 'fixed' }))}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-5 h-5 text-green-600" />
                      <span className="font-medium">{t('postSettings.fixed')}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {t('postSettings.fixedDesc')}
                    </p>
                  </div>
                  
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      postSettings.responseMethod === 'manual' 
                        ? 'border-yellow-500 bg-yellow-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setPostSettings(prev => ({ ...prev, responseMethod: 'manual' }))}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      <span className="font-medium">{t('postSettings.manual')}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {t('postSettings.manualDesc')}
                    </p>
                  </div>
                </div>
              </div>
              
              {postSettings.responseMethod === 'ai' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('postSettings.aiPromptOptional')}</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="6"
                    value={postSettings.aiPrompt}
                    onChange={(e) => setPostSettings(prev => ({ ...prev, aiPrompt: e.target.value }))}
                    placeholder={t('postSettings.enterAIPrompt')}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('postSettings.aiPromptHint')}
                  </p>
                </div>
              )}
              
              {postSettings.responseMethod === 'fixed' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('postSettings.fixedCommentVariations')}</label>
                    {postSettings.commentMessages.map((msg, index) => (
                      <div key={index} className="mb-2 flex gap-2">
                        <textarea
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows="2"
                          value={msg}
                          onChange={(e) => {
                            const newMessages = [...postSettings.commentMessages];
                            newMessages[index] = e.target.value;
                            setPostSettings(prev => ({ ...prev, commentMessages: newMessages }));
                          }}
                          placeholder={`${t('unifiedComments.reply')} ${index + 1}...`}
                        />
                        {postSettings.commentMessages.length > 1 && (
                          <button
                            onClick={() => {
                              const newMessages = postSettings.commentMessages.filter((_, i) => i !== index);
                              setPostSettings(prev => ({ ...prev, commentMessages: newMessages }));
                            }}
                            className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
                          >
                            {t('pageComments.delete')}
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        setPostSettings(prev => ({ ...prev, commentMessages: [...prev.commentMessages, ''] }));
                      }}
                      className="mt-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition text-sm"
                    >
                      {t('postsManagement.addReply')}
                    </button>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('postSettings.fixedMessengerMessage')}</label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="3"
                      value={postSettings.fixedMessengerMessage}
                      onChange={(e) => setPostSettings(prev => ({ ...prev, fixedMessengerMessage: e.target.value }))}
                      placeholder={t('postSettings.fixedMessengerPlaceholder')}
                    />
                  </div>
                  
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap gap-3 mt-6">
              <button
                onClick={savePostSettings}
                disabled={saving}
                className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition disabled:opacity-50"
              >
                {saving ? t('postSettings.saving') : t('postSettings.saveSettings')}
              </button>
              
              {postSettings.responseMethod !== 'manual' && !isFallbackMode && (
                <button
                  onClick={applyResponseMethod}
                  className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition"
                >
                  {t('postSettings.applyResponse')}
                </button>
              )}
              
              {isFallbackMode && postSettings.responseMethod !== 'manual' && (
                <button
                  disabled
                  className="bg-gray-400 text-white py-2 px-4 rounded-md cursor-not-allowed"
                >
                  {t('postSettings.applyResponseDisabled')}
                </button>
              )}
              
              <button
                onClick={() => navigate(`/posts/${postId}/comments`)}
                className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition"
              >
                {t('postSettings.viewPostComments')}
              </button>
            </div>
            
            {message && (
              <div className={`mt-4 p-3 rounded text-center text-sm ${
                message.includes('خطأ') || message.includes('Error') 
                  ? 'bg-red-100 text-red-700' 
                  : 'bg-green-100 text-green-700'
              }`}>
                {message}
              </div>
            )}
          </div>
        </div>
        
        {/* Instructions */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">{t('postSettings.howToUse')}</h2>
            <div className="space-y-4">
              <div className="border-r-4 border-blue-500 pr-3">
                <h3 className="font-medium text-gray-800">{t('postSettings.aiTitle')}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {t('postSettings.aiHow')}
                </p>
              </div>
              
              <div className="border-r-4 border-green-500 pr-3">
                <h3 className="font-medium text-gray-800">{t('postSettings.fixedTitle')}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {t('postSettings.fixedHow')}
                </p>
              </div>
              
              <div className="border-r-4 border-yellow-500 pr-3">
                <h3 className="font-medium text-gray-800">{t('postSettings.manualTitle')}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {t('postSettings.manualHow')}
                </p>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <h3 className="font-medium text-gray-800 mb-2">{t('postSettings.tipsTitle')}</h3>
                <ul className="text-sm text-gray-600 space-y-1 list-disc pr-5">
                  <li>{t('postSettings.tipChangeAnyTime')}</li>
                  <li>{t('postSettings.tipAffectsPendingOnly')}</li>
                  <li>{t('postSettings.tipAlreadyRepliedUnaffected')}</li>
                  {isFallbackMode && (
                    <li className="text-yellow-600 font-medium">{t('postSettings.tipFallbackCached')}</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostSettings;