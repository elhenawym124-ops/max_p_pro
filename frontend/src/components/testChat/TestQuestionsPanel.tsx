import React, { useState, useEffect } from 'react';
import {
  QuestionMarkCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  SparklesIcon,
  XMarkIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { buildApiUrl } from '../../utils/urlHelper';

interface TestQuestion {
  question: string;
  intent: string;
  difficulty: 'easy' | 'medium' | 'hard';
  expectedBehavior?: string;
  description?: string;
  productId?: string;
  categoryId?: string;
  requiresImageProcessing?: boolean;
  requiresRAG?: boolean;
  requiresOrderDetection?: boolean;
  requiresSentimentAnalysis?: boolean;
  requiresContextManagement?: boolean;
  isEdgeCase?: boolean;
  expectedSentiment?: string;
}

interface TestQuestionsPanelProps {
  companyId?: string;
  onSelectQuestions?: (questions: TestQuestion[]) => void;
  onClose?: () => void;
}

const TestQuestionsPanel: React.FC<TestQuestionsPanelProps> = ({
  companyId,
  onSelectQuestions,
  onClose
}) => {
  const [testQuestions, setTestQuestions] = useState<Record<string, TestQuestion[]>>({});
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTestQuestions();
  }, [companyId]);

  const loadTestQuestions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(buildApiUrl('test-chat/test-questions?includeProducts=true'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch test questions');
      }

      const result = await response.json();
      setTestQuestions(result.data.questions || {});
      setSummary(result.data.summary || null);
    } catch (err: any) {
      console.error('Error loading test questions:', err);
      setError(err.message || 'Failed to load test questions');
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestionSelection = (questionKey: string) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(questionKey)) {
      newSelected.delete(questionKey);
    } else {
      newSelected.add(questionKey);
    }
    setSelectedQuestions(newSelected);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getIntentLabel = (intent: string) => {
    const labels: Record<string, string> = {
      greeting: 'تحية',
      product_inquiry: 'استفسار عن المنتجات',
      price_inquiry: 'استفسار عن الأسعار',
      shipping_inquiry: 'استفسار عن الشحن',
      order_inquiry: 'استفسار عن الطلبات',
      general_inquiry: 'استفسار عام',
      image_processing: 'معالجة الصور',
      rag_retrieval: 'استرجاع RAG',
      order_detection: 'اكتشاف الطلبات',
      sentiment_analysis: 'تحليل المشاعر',
      context_management: 'إدارة السياق',
      edge_cases: 'حالات حدية'
    };
    return labels[intent] || intent;
  };

  const getFilteredQuestions = () => {
    let questions: TestQuestion[] = [];

    Object.entries(testQuestions).forEach(([intent, intentQuestions]) => {
      if (selectedIntent && selectedIntent !== intent) {
        return;
      }
      questions = questions.concat(intentQuestions);
    });

    if (selectedDifficulty) {
      questions = questions.filter(q => q.difficulty === selectedDifficulty);
    }

    return questions;
  };

  const handleSelectAll = () => {
    const filtered = getFilteredQuestions();
    const allKeys = filtered.map((q, index) => `${q.intent}-${index}`);
    setSelectedQuestions(new Set(allKeys));
  };

  const handleDeselectAll = () => {
    setSelectedQuestions(new Set());
  };

  const handleSendSelected = () => {
    const filtered = getFilteredQuestions();
    const selected = filtered.filter((q, index) => 
      selectedQuestions.has(`${q.intent}-${index}`)
    );
    
    if (onSelectQuestions) {
      onSelectQuestions(selected);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">جاري تحميل أسئلة الاختبار...</span>
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
            onClick={loadTestQuestions}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  const filteredQuestions = getFilteredQuestions();
  const intents = Object.keys(testQuestions);

  return (
    <div className="bg-white rounded-lg shadow-lg h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-900">أسئلة الاختبار</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Summary */}
      {summary && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-semibold text-gray-700">إجمالي الأسئلة</div>
              <div className="text-2xl font-bold text-blue-600">{summary.totalQuestions}</div>
            </div>
            <div>
              <div className="font-semibold text-gray-700">سهلة</div>
              <div className="text-xl font-bold text-green-600">{summary.byDifficulty.easy}</div>
            </div>
            <div>
              <div className="font-semibold text-gray-700">متوسطة</div>
              <div className="text-xl font-bold text-yellow-600">{summary.byDifficulty.medium}</div>
            </div>
            <div>
              <div className="font-semibold text-gray-700">صعبة</div>
              <div className="text-xl font-bold text-red-600">{summary.byDifficulty.hard}</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex flex-wrap gap-2 items-center">
          <FunnelIcon className="w-5 h-5 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">الفلاتر:</span>
          
          <select
            value={selectedIntent || ''}
            onChange={(e) => setSelectedIntent(e.target.value || null)}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="">جميع الأنواع</option>
            {intents.map(intent => (
              <option key={intent} value={intent}>
                {getIntentLabel(intent)}
              </option>
            ))}
          </select>

          <select
            value={selectedDifficulty || ''}
            onChange={(e) => setSelectedDifficulty(e.target.value || null)}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="">جميع المستويات</option>
            <option value="easy">سهلة</option>
            <option value="medium">متوسطة</option>
            <option value="hard">صعبة</option>
          </select>

          <div className="flex gap-2 ml-auto">
            <button
              onClick={handleSelectAll}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              تحديد الكل
            </button>
            <button
              onClick={handleDeselectAll}
              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              إلغاء التحديد
            </button>
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredQuestions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <QuestionMarkCircleIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>لا توجد أسئلة مطابقة للفلاتر</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredQuestions.map((question, index) => {
              const questionKey = `${question.intent}-${index}`;
              const isSelected = selectedQuestions.has(questionKey);

              return (
                <div
                  key={questionKey}
                  onClick={() => toggleQuestionSelection(questionKey)}
                  className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {isSelected ? (
                        <CheckCircleIcon className="w-5 h-5 text-blue-600" />
                      ) : (
                        <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900">
                          {question.question}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded ${getDifficultyColor(question.difficulty)}`}>
                          {question.difficulty === 'easy' ? 'سهل' : question.difficulty === 'medium' ? 'متوسط' : 'صعب'}
                        </span>
                        <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">
                          {getIntentLabel(question.intent)}
                        </span>
                      </div>
                      {question.description && (
                        <p className="text-sm text-gray-600 mt-1">{question.description}</p>
                      )}
                      {question.expectedBehavior && (
                        <p className="text-xs text-gray-500 mt-1">
                          <span className="font-semibold">السلوك المتوقع:</span> {question.expectedBehavior}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {selectedQuestions.size > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              تم تحديد {selectedQuestions.size} سؤال
            </span>
            <button
              onClick={handleSendSelected}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              إرسال الأسئلة المحددة
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestQuestionsPanel;

