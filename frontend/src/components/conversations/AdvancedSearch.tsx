import React, { useState, useEffect, useRef } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarDaysIcon,
  UserIcon,
  TagIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface SearchFilters {
  query: string;
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  participants: string[];
  platforms: string[];
  messageTypes: string[];
  hasAttachments: boolean;
  isUnread: boolean;
  tags: string[];
}

interface SearchResult {
  id: string;
  conversationId: string;
  messageId: string;
  content: string;
  sender: string;
  timestamp: Date;
  platform: string;
  context: {
    before: string;
    after: string;
  };
  highlights: string[];
}

interface AdvancedSearchProps {
  onSearch: (filters: SearchFilters) => void;
  onResultSelect: (result: SearchResult) => void;
  isVisible: boolean;
  onClose: () => void;
}

const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  onSearch,
  onResultSelect,
  isVisible,
  onClose
}) => {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    dateRange: { start: null, end: null },
    participants: [],
    platforms: [],
    messageTypes: ['text'],
    hasAttachments: false,
    isUnread: false,
    tags: []
  });

  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // تركيز على حقل البحث عند فتح النافذة
  useEffect(() => {
    if (isVisible && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isVisible]);

  // تحميل عمليات البحث الأخيرة
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // حفظ عمليات البحث الأخيرة
  const saveRecentSearch = (query: string) => {
    if (query.trim()) {
      const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
    }
  };

  // تنفيذ البحث
  const handleSearch = async () => {
    if (!filters.query.trim()) return;

    setLoading(true);
    saveRecentSearch(filters.query);

    try {
      // محاكاة API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // نتائج تجريبية
      const mockResults: SearchResult[] = [
        {
          id: '1',
          conversationId: 'conv_1',
          messageId: 'msg_1',
          content: `هذه رسالة تحتوي على "${filters.query}" في المحتوى`,
          sender: 'أحمد محمد',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          platform: 'facebook',
          context: {
            before: 'الرسالة السابقة...',
            after: 'الرسالة التالية...'
          },
          highlights: [filters.query]
        },
        {
          id: '2',
          conversationId: 'conv_2',
          messageId: 'msg_2',
          content: `رسالة أخرى مع كلمة "${filters.query}" هنا`,
          sender: 'فاطمة أحمد',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
          platform: 'whatsapp',
          context: {
            before: 'سياق سابق...',
            after: 'سياق لاحق...'
          },
          highlights: [filters.query]
        }
      ];

      setResults(mockResults);
      onSearch(filters);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  // تنظيف الفلاتر
  const clearFilters = () => {
    setFilters({
      query: '',
      dateRange: { start: null, end: null },
      participants: [],
      platforms: [],
      messageTypes: ['text'],
      hasAttachments: false,
      isUnread: false,
      tags: []
    });
    setResults([]);
  };

  // تمييز النص المطابق
  const highlightText = (text: string, highlights: string[]) => {
    let highlightedText = text;
    highlights.forEach(highlight => {
      const regex = new RegExp(`(${highlight})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
    });
    return { __html: highlightedText };
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3 space-x-reverse">
            <MagnifyingGlassIcon className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-gray-900">البحث المتقدم</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex space-x-3 space-x-reverse">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="ابحث في المحادثات والرسائل..."
                value={filters.query}
                onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-10 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-lg border transition-colors duration-200 flex items-center space-x-2 space-x-reverse ${
                showFilters 
                  ? 'bg-indigo-600 text-white border-indigo-600' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <FunnelIcon className="w-5 h-5" />
              <span>فلاتر</span>
            </button>
            <button
              onClick={handleSearch}
              disabled={loading || !filters.query.trim()}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? 'جاري البحث...' : 'بحث'}
            </button>
          </div>

          {/* Recent Searches */}
          {recentSearches.length > 0 && !filters.query && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">عمليات البحث الأخيرة:</p>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => setFilters(prev => ({ ...prev, query: search }))}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors duration-200"
                  >
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="p-6 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <CalendarDaysIcon className="w-4 h-4 inline ml-1" />
                  نطاق التاريخ
                </label>
                <div className="space-y-2">
                  <input
                    type="date"
                    value={filters.dateRange.start?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, start: e.target.value ? new Date(e.target.value) : null }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="date"
                    value={filters.dateRange.end?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, end: e.target.value ? new Date(e.target.value) : null }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Platforms */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <TagIcon className="w-4 h-4 inline ml-1" />
                  المنصات
                </label>
                <div className="space-y-2">
                  {['facebook', 'whatsapp', 'telegram', 'instagram'].map(platform => (
                    <label key={platform} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.platforms.includes(platform)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters(prev => ({
                              ...prev,
                              platforms: [...prev.platforms, platform]
                            }));
                          } else {
                            setFilters(prev => ({
                              ...prev,
                              platforms: prev.platforms.filter(p => p !== platform)
                            }));
                          }
                        }}
                        className="ml-2 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700 capitalize">{platform}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Message Types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <AdjustmentsHorizontalIcon className="w-4 h-4 inline ml-1" />
                  نوع الرسالة
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'text', label: 'نص' },
                    { value: 'image', label: 'صورة' },
                    { value: 'file', label: 'ملف' },
                    { value: 'voice', label: 'صوت' }
                  ].map(type => (
                    <label key={type.value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.messageTypes.includes(type.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters(prev => ({
                              ...prev,
                              messageTypes: [...prev.messageTypes, type.value]
                            }));
                          } else {
                            setFilters(prev => ({
                              ...prev,
                              messageTypes: prev.messageTypes.filter(t => t !== type.value)
                            }));
                          }
                        }}
                        className="ml-2 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Additional Options */}
            <div className="mt-4 flex flex-wrap gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.hasAttachments}
                  onChange={(e) => setFilters(prev => ({ ...prev, hasAttachments: e.target.checked }))}
                  className="ml-2 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">يحتوي على مرفقات</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.isUnread}
                  onChange={(e) => setFilters(prev => ({ ...prev, isUnread: e.target.checked }))}
                  className="ml-2 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">غير مقروء فقط</span>
              </label>
            </div>

            {/* Clear Filters */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200"
              >
                مسح الفلاتر
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-y-auto max-h-96">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="mr-3 text-gray-600">جاري البحث...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {results.map((result) => (
                <div
                  key={result.id}
                  onClick={() => onResultSelect(result)}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 space-x-reverse mb-2">
                        <UserIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{result.sender}</span>
                        <span className="text-xs text-gray-500 capitalize">{result.platform}</span>
                      </div>
                      <p 
                        className="text-sm text-gray-700 mb-2"
                        dangerouslySetInnerHTML={highlightText(result.content, result.highlights)}
                      />
                      <div className="flex items-center space-x-2 space-x-reverse text-xs text-gray-500">
                        <ClockIcon className="w-3 h-3" />
                        <span>{result.timestamp.toLocaleString('ar-SA')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filters.query && !loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <MagnifyingGlassIcon className="w-12 h-12 mb-4" />
              <p className="text-lg font-medium">لا توجد نتائج</p>
              <p className="text-sm">جرب تغيير كلمات البحث أو الفلاتر</p>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="p-4 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              تم العثور على {results.length} نتيجة
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedSearch;
