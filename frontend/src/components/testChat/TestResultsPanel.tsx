import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { buildApiUrl } from '../../utils/urlHelper';

interface TestResult {
  questionNumber: number;
  question: string;
  questionData?: any;
  success: boolean;
  userMessage: {
    id: string;
    content: string;
    timestamp: Date;
  };
  aiMessage?: {
    id: string;
    content: string;
    timestamp: Date;
  };
  aiResponse?: {
    content: string;
    intent?: string;
    sentiment?: string;
    confidence?: number;
    processingTime?: number;
    model?: string;
    keyId?: string;
    silent?: boolean;
    error?: string;
  };
  processingTime: number;
  error?: string;
  timestamp: Date;
}

interface TestResults {
  conversationId: string;
  totalQuestions: number;
  sent: number;
  succeeded: number;
  failed: number;
  silent: number;
  messages: TestResult[];
  startTime: Date;
  endTime: Date;
  duration: number;
  errors: Array<{
    questionIndex: number;
    question: string;
    error: string;
  }>;
}

interface TestResultsPanelProps {
  conversationId: string;
  onClose?: () => void;
  onRefresh?: () => void;
}

const TestResultsPanel: React.FC<TestResultsPanelProps> = ({
  conversationId,
  onClose,
  onRefresh
}) => {
  const [results, setResults] = useState<TestResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<TestResult | null>(null);

  useEffect(() => {
    loadResults();
  }, [conversationId]);

  const loadResults = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(buildApiUrl(`test-chat/test-results/${conversationId}`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch test results');
      }

      const result = await response.json();
      if (result.data) {
        setResults(result.data);
      } else {
        setResults(null);
      }
    } catch (err: any) {
      console.error('Error loading test results:', err);
      setError(err.message || 'Failed to load test results');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">جاري تحميل النتائج...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-red-600 text-center py-4">
          <p>❌ {error}</p>
          <button
            onClick={loadResults}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-center py-8 text-gray-500">
          <ChartBarIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>لا توجد نتائج اختبار لهذه المحادثة</p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              تشغيل اختبار جديد
            </button>
          )}
        </div>
      </div>
    );
  }

  const successRate = results.totalQuestions > 0 
    ? ((results.succeeded / results.totalQuestions) * 100).toFixed(1)
    : '0';

  return (
    <div className="bg-white rounded-lg shadow-lg h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChartBarIcon className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-900">نتائج الاختبار</h3>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={loadResults}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              title="تحديث"
            >
              <ArrowPathIcon className="w-5 h-5" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{results.totalQuestions}</div>
            <div className="text-sm text-gray-600">إجمالي الأسئلة</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{results.succeeded}</div>
            <div className="text-sm text-gray-600">نجح</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{results.failed}</div>
            <div className="text-sm text-gray-600">فشل</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{results.silent}</div>
            <div className="text-sm text-gray-600">صامت</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{successRate}%</div>
            <div className="text-sm text-gray-600">نسبة النجاح</div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="text-gray-600">الوقت الإجمالي:</span>
              <span className="font-semibold ml-2">{formatDuration(results.duration)}</span>
            </div>
            <div>
              <span className="text-gray-600">متوسط الوقت للسؤال:</span>
              <span className="font-semibold ml-2">
                {formatDuration(results.duration / results.totalQuestions)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto p-4">
        {results.messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>لا توجد رسائل في النتائج</p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.messages.map((message, index) => (
              <div
                key={index}
                onClick={() => setSelectedMessage(message)}
                className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedMessage === message ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {message.success ? (
                      message.aiResponse?.silent ? (
                        <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
                      ) : (
                        <CheckCircleIcon className="w-5 h-5 text-green-600" />
                      )
                    ) : (
                      <XCircleIcon className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900">
                        {message.question}
                      </span>
                      <span className="text-xs text-gray-500">
                        #{message.questionNumber}
                      </span>
                    </div>
                    {message.aiResponse && (
                      <div className="mt-2 space-y-1">
                        {message.aiResponse.intent && (
                          <span className="inline-block px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded mr-2">
                            {message.aiResponse.intent}
                          </span>
                        )}
                        {message.aiResponse.sentiment && (
                          <span className="inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded mr-2">
                            {message.aiResponse.sentiment}
                          </span>
                        )}
                        {message.aiResponse.model && (
                          <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-800 rounded mr-2">
                            {message.aiResponse.model}
                          </span>
                        )}
                        {message.aiResponse.processingTime && (
                          <span className="inline-block px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                            {formatDuration(message.aiResponse.processingTime)}
                          </span>
                        )}
                      </div>
                    )}
                    {message.error && (
                      <p className="text-xs text-red-600 mt-1">❌ {message.error}</p>
                    )}
                    {message.aiResponse?.content && (
                      <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                        {message.aiResponse.content}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message Details Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">تفاصيل الرسالة #{selectedMessage.questionNumber}</h3>
              <button
                onClick={() => setSelectedMessage(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700">السؤال</label>
                <p className="text-gray-900 mt-1">{selectedMessage.question}</p>
              </div>

              {selectedMessage.aiResponse && (
                <>
                  {selectedMessage.aiResponse.content && (
                    <div>
                      <label className="text-sm font-semibold text-gray-700">رد AI</label>
                      <p className="text-gray-900 mt-1">{selectedMessage.aiResponse.content}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {selectedMessage.aiResponse.intent && (
                      <div>
                        <label className="text-sm font-semibold text-gray-700">النية</label>
                        <p className="text-gray-900 mt-1">{selectedMessage.aiResponse.intent}</p>
                      </div>
                    )}
                    {selectedMessage.aiResponse.sentiment && (
                      <div>
                        <label className="text-sm font-semibold text-gray-700">المشاعر</label>
                        <p className="text-gray-900 mt-1">{selectedMessage.aiResponse.sentiment}</p>
                      </div>
                    )}
                    {selectedMessage.aiResponse.confidence && (
                      <div>
                        <label className="text-sm font-semibold text-gray-700">الثقة</label>
                        <p className="text-gray-900 mt-1">
                          {(selectedMessage.aiResponse.confidence * 100).toFixed(1)}%
                        </p>
                      </div>
                    )}
                    {selectedMessage.aiResponse.model && (
                      <div>
                        <label className="text-sm font-semibold text-gray-700">النموذج</label>
                        <p className="text-gray-900 mt-1">{selectedMessage.aiResponse.model}</p>
                      </div>
                    )}
                    {selectedMessage.processingTime && (
                      <div>
                        <label className="text-sm font-semibold text-gray-700">وقت المعالجة</label>
                        <p className="text-gray-900 mt-1">{formatDuration(selectedMessage.processingTime)}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {selectedMessage.error && (
                <div>
                  <label className="text-sm font-semibold text-red-700">خطأ</label>
                  <p className="text-red-600 mt-1">{selectedMessage.error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestResultsPanel;

