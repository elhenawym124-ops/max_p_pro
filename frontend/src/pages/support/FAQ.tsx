import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
  BookOpen,
  HelpCircle,
  MessageSquare,
  Plus
} from 'lucide-react';
import supportService, { FAQ as FAQType } from '../../services/supportService';
import ThemeToggle from '../../components/ui/theme-toggle';

interface FAQCategory {
  category: string;
  count: number;
}

const FAQ: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || '';

  const [faqs, setFaqs] = useState<{ [key: string]: FAQType[] }>({});
  const [categories, setCategories] = useState<FAQCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const categoryLabels: { [key: string]: string } = {
    'general': 'عام',
    'technical': 'تقني',
    'billing': 'فواتير',
    'woocommerce': 'WooCommerce',
    'whatsapp': 'WhatsApp',
    'facebook_ads': 'إعلانات فيسبوك'
  };

  useEffect(() => {
    fetchFAQs();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchFAQs();
    }
  }, [selectedCategory]);

  const fetchFAQs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (selectedCategory) {
        params.append('category', selectedCategory);
      }

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const data = await supportService.getFAQs(params);

      if (data.success) {
        setFaqs(data.faqs || {});
      }
    } catch (error) {
      console.error('Error fetching FAQs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await supportService.getFAQCategories();

      if (data.success) {
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSearch = () => {
    fetchFAQs();
  };

  const rateFAQ = async (faqId: string, helpful: boolean) => {
    try {
      await supportService.rateFAQ(faqId, helpful);
      // Refresh FAQs to show updated ratings
      fetchFAQs();
    } catch (error) {
      console.error('Error rating FAQ:', error);
    }
  };

  const toggleFAQ = (faqId: string) => {
    setExpandedFAQ(expandedFAQ === faqId ? null : faqId);
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setSearchTerm('');
    fetchFAQs();
  };

  if (loading && Object.keys(faqs).length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={() => navigate('/support')}
                className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                <ArrowLeft className="w-4 h-4 ml-2" />
                العودة إلى مركز الدعم
              </button>
              <ThemeToggle />
            </div>
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-center">
                <BookOpen className="w-8 h-8 ml-3 text-blue-600 dark:text-blue-400" />
                الأسئلة الشائعة
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                ابحث عن إجابات سريعة لأسئلتك الشائعة
              </p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Search */}
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="ابحث في الأسئلة الشائعة..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full pr-12 pl-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">جميع الفئات</option>
                  {categories.map(cat => (
                    <option key={cat.category} value={cat.category}>
                      {categoryLabels[cat.category] || cat.category} ({cat.count})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={handleSearch}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                بحث
              </button>

              {(selectedCategory || searchTerm) && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
                >
                  مسح الفلاتر
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Categories Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 sticky top-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  الفئات
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedCategory('')}
                    className={`w-full text-right px-3 py-2 rounded-lg transition-colors ${!selectedCategory
                      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                  >
                    جميع الفئات
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.category}
                      onClick={() => setSelectedCategory(cat.category)}
                      className={`w-full text-right px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${selectedCategory === cat.category
                        ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                    >
                      <span>{categoryLabels[cat.category] || cat.category}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">({cat.count})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* FAQs Content */}
            <div className="lg:col-span-3">
              {Object.keys(faqs).length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
                  <HelpCircle className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    لا توجد أسئلة شائعة
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    {searchTerm || selectedCategory
                      ? 'لم يتم العثور على نتائج تطابق البحث'
                      : 'لا توجد أسئلة شائعة متاحة حالياً'
                    }
                  </p>
                  <div className="space-y-4">
                    {(searchTerm || selectedCategory) && (
                      <button
                        onClick={clearFilters}
                        className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        مسح الفلاتر
                      </button>
                    )}
                    <div>
                      <button
                        onClick={() => navigate('/support/tickets/new')}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
                      >
                        <Plus className="w-4 h-4 ml-2" />
                        إنشاء تذكرة دعم
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(faqs).map(([category, categoryFaqs]) => (
                    <div key={category} className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
                      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-t-lg">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {categoryLabels[category] || category}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {categoryFaqs.length} سؤال
                        </p>
                      </div>

                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {categoryFaqs.map((faq) => (
                          <div key={faq._id} className="p-6">
                            <button
                              onClick={() => toggleFAQ(faq._id)}
                              className="w-full text-right flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 -m-2 p-2 rounded-lg transition-colors"
                            >
                              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex-1">
                                {faq.question}
                              </h3>
                              {expandedFAQ === faq._id ? (
                                <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 mr-2" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 mr-2" />
                              )}
                            </button>

                            {expandedFAQ === faq._id && (
                              <div className="mt-4 pr-2">
                                <div
                                  className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6"
                                  dangerouslySetInnerHTML={{ __html: faq.answer.replace(/\n/g, '<br>') }}
                                />

                                {/* Tags */}
                                {faq.tags && Array.isArray(faq.tags) && faq.tags.length > 0 && (
                                  <div className="mb-4">
                                    <div className="flex flex-wrap gap-2">
                                      {faq.tags.map((tag, index) => (
                                        <span
                                          key={index}
                                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 text-xs rounded-full"
                                        >
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Rating */}
                                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                                  <div className="flex items-center space-x-4 space-x-reverse">
                                    <span className="text-sm text-gray-600 dark:text-gray-300">هل كان هذا مفيداً؟</span>
                                    <button
                                      onClick={() => rateFAQ(faq._id, true)}
                                      className="flex items-center text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 text-sm transition-colors"
                                    >
                                      <ThumbsUp className="w-4 h-4 ml-1" />
                                      نعم ({faq.helpful})
                                    </button>
                                    <button
                                      onClick={() => rateFAQ(faq._id, false)}
                                      className="flex items-center text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm transition-colors"
                                    >
                                      <ThumbsDown className="w-4 h-4 ml-1" />
                                      لا ({faq.notHelpful})
                                    </button>
                                  </div>

                                  <button
                                    onClick={() => navigate('/support/tickets/new')}
                                    className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm transition-colors"
                                  >
                                    <MessageSquare className="w-4 h-4 ml-1" />
                                    تحتاج مساعدة إضافية؟
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Call to Action */}
          <div className="mt-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              لم تجد ما تبحث عنه؟
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              لا تتردد في التواصل معنا مباشرة وسنساعدك في حل مشكلتك
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/support/tickets/new')}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center justify-center"
              >
                <Plus className="w-5 h-5 ml-2" />
                إنشاء تذكرة دعم
              </button>
              <button
                onClick={() => navigate('/support')}
                className="px-8 py-3 border border-blue-600 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors inline-flex items-center justify-center"
              >
                <MessageSquare className="w-5 h-5 ml-2" />
                العودة إلى مركز الدعم
              </button>
            </div>
          </div>
        </div>
    </div>
  );
};

export default FAQ;

