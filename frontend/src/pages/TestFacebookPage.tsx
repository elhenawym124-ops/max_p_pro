import React, { useState } from 'react';
import { buildApiUrl } from '../utils/urlHelper';

const TestFacebookPage: React.FC = () => {
  const [recipientId, setRecipientId] = useState('');
  const [message, setMessage] = useState('');
  const [pageId, setPageId] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testSendMessage = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(buildApiUrl('/test-facebook/test-send'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientId,
          message,
          pageId: pageId || null
        })
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const testWebhook = async () => {
    setLoading(true);
    setResult(null);

    try {
      const webhookData = {
        sender: { id: recipientId },
        recipient: { id: pageId || 'test-page' },
        message: { text: message }
      };

      const response = await fetch(buildApiUrl('/test-facebook/test-webhook'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData)
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 w-full">
      <h1 className="text-3xl font-bold mb-6">🧪 Facebook Test Page</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Test Facebook Message Sending</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipient ID (Facebook User ID)
            </label>
            <input
              type="text"
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter Facebook User ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Enter message to send"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Page ID (Optional)
            </label>
            <input
              type="text"
              value={pageId}
              onChange={(e) => setPageId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter Facebook Page ID (optional)"
            />
          </div>

          <div className="flex space-x-4">
            <button
              onClick={testSendMessage}
              disabled={loading || !recipientId || !message}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Testing...' : 'Test Send Message'}
            </button>

            <button
              onClick={testWebhook}
              disabled={loading || !recipientId || !message}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Testing...' : 'Test Webhook Processing'}
            </button>
          </div>
        </div>
      </div>

      {result && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          
          <div className={`p-4 rounded-md ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <h3 className={`font-semibold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
              {result.success ? '✅ Success' : '❌ Failed'}
            </h3>
            <pre className="mt-2 text-sm overflow-auto max-h-96 bg-gray-100 p-3 rounded">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
        <h3 className="font-semibold text-yellow-800 mb-2">📋 Instructions:</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• <strong>Test Send Message:</strong> Tests direct Facebook API sending</li>
          <li>• <strong>Test Webhook Processing:</strong> Tests full webhook processing with AI</li>
          <li>• Check the browser console and backend logs for detailed diagnostics</li>
          <li>• Use real Facebook User IDs for actual testing</li>
        </ul>
      </div>
    </div>
  );
};

export default TestFacebookPage;

