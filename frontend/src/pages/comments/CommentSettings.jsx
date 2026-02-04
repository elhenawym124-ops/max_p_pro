import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/apiClient';

const CommentSettings = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState({
    commentResponseTemplate: "Thank you for your comment! We'll get back to you soon.",
    aiPrompt: '',
    fixedCommentMessage: '',
    fixedMessengerMessage: '',
    messengerMessages: [''] // Array of messenger message variations
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Fetch current settings
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/settings/company');
      if (response.data.success) {
        const companySettings = response.data.data.settings || {};
        setSettings({
          commentResponseTemplate: companySettings.commentResponseTemplate || "Thank you for your comment! We'll get back to you soon.",
          aiPrompt: companySettings.aiPrompt || '',
          fixedCommentMessage: companySettings.fixedCommentMessage || '',
          fixedMessengerMessage: companySettings.fixedMessengerMessage || '',
          messengerMessages: companySettings.messengerMessages || ['']
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setMessage('Error loading settings');
    } finally {
      setLoading(false);
    }
  };

  // Save settings
  const saveSettings = async () => {
    setSaving(true);
    setMessage('');
    try {
      const response = await apiClient.put('/settings/company', {
        settings: {
          commentResponseTemplate: settings.commentResponseTemplate,
          aiPrompt: settings.aiPrompt,
          fixedCommentMessage: settings.fixedCommentMessage,
          fixedMessengerMessage: settings.fixedMessengerMessage,
          messengerMessages: settings.messengerMessages
        }
      });
      if (response.data.success) {
        setMessage('Settings saved successfully');
      } else {
        setMessage('Error saving settings: ' + response.data.error);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Error saving settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{t('commentSettings.pageTitle')}</h1>
        <p className="text-gray-600">{t('commentSettings.description')}</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">{t('commentSettings.loadingSettings')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">{t('commentSettings.autoReplyTemplateTitle')}</h2>
            <p className="text-gray-600 mb-4">
              {t('commentSettings.autoReplyTemplateDesc')}
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('commentSettings.templateLabel')}
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="4"
                value={settings.commentResponseTemplate}
                onChange={(e) => setSettings({ ...settings, commentResponseTemplate: e.target.value })}
                placeholder={t('commentSettings.templatePlaceholder')}
              />
              <p className="mt-1 text-sm text-gray-500">
                {t('commentSettings.templateHint')}
              </p>
            </div>
          </div>

          {/* AI Prompt Section */}
          <div className="mb-6 border-t pt-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">{t('commentSettings.aiPromptTitle')}</h2>
            <p className="text-gray-600 mb-4">
              {t('commentSettings.aiPromptDesc')}
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('commentSettings.aiPromptLabel')}
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="6"
                value={settings.aiPrompt}
                onChange={(e) => setSettings({ ...settings, aiPrompt: e.target.value })}
                placeholder={t('commentSettings.aiPromptPlaceholder')}
              />
              <p className="mt-1 text-sm text-gray-500">
                {t('commentSettings.aiPromptHint')}
              </p>
            </div>
          </div>

          {/* Fixed Messages Section */}
          <div className="mb-6 border-t pt-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">{t('commentSettings.fixedMessagesTitle')}</h2>
            <p className="text-gray-600 mb-4">
              {t('commentSettings.fixedMessagesDesc')}
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('commentSettings.fixedCommentLabel')}
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                value={settings.fixedCommentMessage}
                onChange={(e) => setSettings({ ...settings, fixedCommentMessage: e.target.value })}
                placeholder={t('commentSettings.fixedCommentPlaceholder')}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('commentSettings.fixedMessengerLabel')}
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                value={settings.fixedMessengerMessage}
                onChange={(e) => setSettings({ ...settings, fixedMessengerMessage: e.target.value })}
                placeholder={t('commentSettings.fixedMessengerPlaceholder')}
              />
            </div>
          </div>

          {/* Messenger Message Variations */}
          <div className="mb-6 border-t pt-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">{t('commentSettings.messengerVariationsTitle')}</h2>
            <p className="text-gray-600 mb-4">
              {t('commentSettings.messengerVariationsDesc')}
            </p>

            {settings.messengerMessages.map((msg, index) => (
              <div key={index} className="mb-3 flex gap-2">
                <textarea
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="2"
                  value={msg}
                  onChange={(e) => {
                    const newMessages = [...settings.messengerMessages];
                    newMessages[index] = e.target.value;
                    setSettings({ ...settings, messengerMessages: newMessages });
                  }}
                  placeholder={t('commentSettings.messengerMessagePlaceholder').replace('{{index}}', index + 1)}
                />
                {settings.messengerMessages.length > 1 && (
                  <button
                    onClick={() => {
                      const newMessages = settings.messengerMessages.filter((_, i) => i !== index);
                      setSettings({ ...settings, messengerMessages: newMessages });
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
                setSettings({ ...settings, messengerMessages: [...settings.messengerMessages, ''] });
              }}
              className="mt-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition"
            >
              {t('commentSettings.addNewMessage')}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              {message && (
                <p className={`text-sm ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                  {message}
                </p>
              )}
            </div>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition disabled:opacity-50"
            >
              {saving ? t('commentSettings.saving') : t('commentSettings.saveSettings')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentSettings;