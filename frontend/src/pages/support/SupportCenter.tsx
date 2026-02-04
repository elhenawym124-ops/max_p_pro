import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  HelpCircle,
  MessageSquare,
  Plus,
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Ticket,
  ArrowRight
} from 'lucide-react';
import supportService, { FAQ as FAQType, Ticket as TicketType } from '../../services/supportService';

const SupportCenter: React.FC = () => {
  const [faqs, setFaqs] = useState<{ [key: string]: FAQType[] }>({});
  const [recentTickets, setRecentTickets] = useState<TicketType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch FAQs
      const faqData = await supportService.getFAQs();
      setFaqs(faqData.faqs || {});

      // Fetch recent tickets
      const params = new URLSearchParams({ limit: '5' });
      const ticketsData = await supportService.getUserTickets(params);
      setRecentTickets(ticketsData.tickets || []);
    } catch (error) {
      console.error('Error fetching support data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFAQSearch = async () => {
    if (!searchTerm.trim()) {
      fetchData();
      return;
    }

    try {
      const params = new URLSearchParams({ search: searchTerm });
      const data = await supportService.getFAQs(params);
      setFaqs(data.faqs || {});
    } catch (error) {
      console.error('Error searching FAQs:', error);
    }
  };

  const rateFAQ = async (faqId: string, helpful: boolean) => {
    try {
      await supportService.rateFAQ(faqId, helpful);
      // Refresh FAQs to show updated ratings
      fetchData();
    } catch (error) {
      console.error('Error rating FAQ:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Clock className="w-4 h-4 text-orange-500 dark:text-orange-400" />;
      case 'in_progress':
        return <AlertCircle className="w-4 h-4 text-blue-500 dark:text-blue-400" />;
      case 'closed':
        return <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open':
        return 'مفتوح';
      case 'in_progress':
        return 'قيد المعالجة';
      case 'closed':
        return 'مغلق';
      default:
        return status;
    }
  };

  const getCategoryText = (category: string) => {
    const categories: { [key: string]: string } = {
      'technical': 'تقني',
      'billing': 'فواتير',
      'inquiry': 'استفسار',
      'suggestion': 'اقتراح',
      'complaint': 'شكوى'
    };
    return categories[category] || category;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            مركز الدعم الفني
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            نحن هنا لمساعدتك في حل جميع استفساراتك ومشاكلك
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Link
            to="/support/tickets/new"
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900/50 p-6 hover:shadow-lg dark:hover:shadow-gray-900/70 transition-shadow group border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  إنشاء تذكرة جديدة
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  أرسل لنا استفسارك أو مشكلتك
                </p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-full group-hover:bg-blue-200 dark:group-hover:bg-blue-900/30 transition-colors">
                <Plus className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </Link>

          <Link
            to="/support/tickets"
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900/50 p-6 hover:shadow-lg dark:hover:shadow-gray-900/70 transition-shadow group border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  تذاكري
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  تابع حالة تذاكر الدعم الخاصة بك
                </p>
              </div>
              <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-full group-hover:bg-green-200 dark:group-hover:bg-green-900/30 transition-colors">
                <Ticket className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </Link>

          <Link
            to="/support/faq"
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900/50 p-6 hover:shadow-lg dark:hover:shadow-gray-900/70 transition-shadow group border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  الأسئلة الشائعة
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  ابحث عن إجابات سريعة
                </p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-900/20 p-3 rounded-full group-hover:bg-purple-200 dark:group-hover:bg-purple-900/30 transition-colors">
                <BookOpen className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </Link>
        </div>

        {/* Search FAQs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900/50 p-6 mb-8 border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <Search className="w-6 h-6 ml-2 text-gray-700 dark:text-gray-300" />
            البحث في الأسئلة الشائعة
          </h2>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="ابحث عن سؤالك..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleFAQSearch()}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
            />
            <button
              onClick={handleFAQSearch}
              className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium"
            >
              بحث
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Popular FAQs */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
              <HelpCircle className="w-6 h-6 ml-2 text-gray-700 dark:text-gray-300" />
              الأسئلة الشائعة
            </h2>

            {Object.keys(faqs).length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900/50 p-8 text-center border border-gray-200 dark:border-gray-700">
                <BookOpen className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">لا توجد أسئلة شائعة متاحة حالياً</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(faqs).map(([category, categoryFaqs]) => (
                  <div key={category} className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {getCategoryText(category)}
                      </h3>
                    </div>
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {categoryFaqs.slice(0, 3).map((faq) => (
                        <div key={faq._id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-2">
                            {faq.question}
                          </h4>
                          <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                            {faq.answer}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 space-x-reverse">
                              <span className="text-sm text-gray-500 dark:text-gray-400">هل كان هذا مفيداً؟</span>
                              <button
                                onClick={() => rateFAQ(faq._id, true)}
                                className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 text-sm transition-colors font-medium"
                              >
                                نعم ({faq.helpful || 0})
                              </button>
                              <button
                                onClick={() => rateFAQ(faq._id, false)}
                                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm transition-colors font-medium"
                              >
                                لا ({faq.notHelpful || 0})
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {categoryFaqs.length > 3 && (
                      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 rounded-b-lg border-t border-gray-200 dark:border-gray-700">
                        <Link
                          to={`/support/faq?category=${category}`}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center transition-colors font-medium"
                        >
                          عرض المزيد من {getCategoryText(category)}
                          <ArrowRight className="w-4 h-4 mr-2" />
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Tickets */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
              <MessageSquare className="w-6 h-6 ml-2 text-gray-700 dark:text-gray-300" />
              تذاكرك الأخيرة
            </h2>

            {recentTickets.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900/50 p-8 text-center border border-gray-200 dark:border-gray-700">
                <Ticket className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">لا توجد تذاكر دعم</p>
                <Link
                  to="/support/tickets/new"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium"
                >
                  <Plus className="w-4 h-4 ml-2" />
                  إنشاء تذكرة جديدة
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentTickets.map((ticket) => (
                  <Link
                    key={ticket._id}
                    to={`/support/tickets/${ticket.ticketId}`}
                    className="block bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900/50 p-4 hover:shadow-lg dark:hover:shadow-gray-900/70 transition-all border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {ticket.subject}
                      </h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap mr-2 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {ticket.ticketId}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        {getStatusIcon(ticket.status)}
                        <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                          {getStatusText(ticket.status)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {getCategoryText(ticket.category)}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {new Date(ticket.createdAt).toLocaleDateString('ar-EG')}
                    </div>
                  </Link>
                ))}

                <Link
                  to="/support/tickets"
                  className="block text-center py-3 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors font-medium"
                >
                  عرض جميع التذاكر
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportCenter;

