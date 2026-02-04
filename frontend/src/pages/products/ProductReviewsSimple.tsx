import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { toast } from 'react-hot-toast';
import {
  CheckCircleIcon,
  XCircleIcon,
  TrashIcon,
  StarIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';

interface Review {
  id: string;
  productId: string;
  productName?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  rating: number;
  title?: string;
  comment?: string;
  isApproved: boolean;
  helpfulCount: number;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const ProductReviewsSimple: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [filters, setFilters] = useState({
    isApproved: 'all' as 'all' | 'true' | 'false',
    rating: '',
  });
  const [search, setSearch] = useState('');
  const [selectedReviews, setSelectedReviews] = useState<string[]>([]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination(prev => ({ ...prev, page: 1 }));
      fetchReviews();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch on page/filter change
  useEffect(() => {
    fetchReviews();
  }, [pagination.page, filters]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
        search, // Add search param
      };

      if (filters.isApproved !== 'all') {
        params.isApproved = filters.isApproved;
      }

      if (filters.rating) {
        params.rating = filters.rating;
      }

      // استخدام apiClient بدلاً من axios مباشرة
      const response = await apiClient.get('/reviews', { params });

      if (response.data.success) {
        setReviews(response.data.data.reviews || []);
        setPagination(response.data.data.pagination || pagination);
      } else {
        toast.error('حدث خطأ في جلب التقييمات');
      }
    } catch (error: any) {
      console.error('Error fetching reviews:', error);
      toast.error(error.response?.data?.error || 'حدث خطأ في جلب التقييمات');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (reviewId: string) => {
    try {
      const response = await apiClient.put(`/reviews/${reviewId}/approve`);
      if (response.data.success) {
        toast.success('تم الموافقة على التقييم بنجاح');
        fetchReviews();
      }
    } catch (error: any) {
      console.error('Error approving review:', error);
      toast.error(error.response?.data?.error || 'حدث خطأ في الموافقة على التقييم');
    }
  };

  const handleReject = async (reviewId: string) => {
    try {
      const response = await apiClient.put(`/reviews/${reviewId}/reject`);
      if (response.data.success) {
        toast.success('تم رفض التقييم بنجاح');
        fetchReviews();
      }
    } catch (error: any) {
      console.error('Error rejecting review:', error);
      toast.error(error.response?.data?.error || 'حدث خطأ في رفض التقييم');
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا التقييم؟')) {
      return;
    }

    try {
      const response = await apiClient.delete(`/reviews/${reviewId}`);
      if (response.data.success) {
        toast.success('تم حذف التقييم بنجاح');
        fetchReviews();
      }
    } catch (error: any) {
      console.error('Error deleting review:', error);
      toast.error(error.response?.data?.error || 'حدث خطأ في حذف التقييم');
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) =>
          star <= rating ? (
            <StarSolidIcon key={star} className="h-4 w-4 text-yellow-400" />
          ) : (
            <StarIcon key={star} className="h-4 w-4 text-gray-300" />
          )
        )}
      </div>
    );
  };



  // Bulk Actions Handlers
  const toggleSelectAll = () => {
    if (selectedReviews.length === reviews.length) {
      setSelectedReviews([]);
    } else {
      setSelectedReviews(reviews.map((r) => r.id));
    }
  };

  const toggleReview = (id: string) => {
    if (selectedReviews.includes(id)) {
      setSelectedReviews(prev => prev.filter(item => item !== id));
    } else {
      setSelectedReviews(prev => [...prev, id]);
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject' | 'delete') => {
    if (!selectedReviews.length) return;

    if (action === 'delete' && !window.confirm(`هل أنت متأكد من حذف ${selectedReviews.length} تقييم؟`)) {
      return;
    }

    try {
      const response = await apiClient.post('/reviews/bulk-action', {
        action,
        ids: selectedReviews
      });

      if (response.data.success) {
        toast.success(response.data.message);
        setSelectedReviews([]);
        fetchReviews();
      }
    } catch (error: any) {
      console.error('Error executing bulk action:', error);
      toast.error(error.response?.data?.error || 'حدث خطأ في تنفيذ العملية');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Removed client-side filtering: filteredReviews
  // Stats now reflect current page only
  const approvedCount = reviews.filter((r) => r.isApproved).length;
  const pendingCount = reviews.filter((r) => !r.isApproved).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">إدارة التقييمات</h1>
          <p className="text-gray-600 dark:text-gray-300">إدارة ومراجعة تقييمات المنتجات</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">إجمالي التقييمات</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{pagination.total}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">موافق عليها</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{approvedCount}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">في انتظار الموافقة</div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{pendingCount}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="ابحث عن تقييم..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={filters.isApproved}
                onChange={(e) =>
                  setFilters({ ...filters, isApproved: e.target.value as 'all' | 'true' | 'false' })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                <option value="all">جميع الحالات</option>
                <option value="true">موافق عليها</option>
                <option value="false">في انتظار الموافقة</option>
              </select>
            </div>

            {/* Rating Filter */}
            <div>
              <select
                value={filters.rating}
                onChange={(e) => setFilters({ ...filters, rating: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                <option value="">جميع التقييمات</option>
                <option value="5">5 نجوم</option>
                <option value="4">4 نجوم</option>
                <option value="3">3 نجوم</option>
                <option value="2">2 نجوم</option>
                <option value="1">1 نجم</option>
              </select>
            </div>
          </div>
        </div>

      </div>

      {/* Bulk Actions & Selection Toolbar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            checked={reviews.length > 0 && selectedReviews.length === reviews.length}
            onChange={toggleSelectAll}
            disabled={reviews.length === 0}
          />
          <span className="text-gray-700 dark:text-gray-300 font-medium">
            تحديد الكل ({selectedReviews.length})
          </span>
        </div>

        {selectedReviews.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkAction('approve')}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
            >
              <CheckCircleIcon className="h-4 w-4" />
              موافقة
            </button>
            <button
              onClick={() => handleBulkAction('reject')}
              className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors text-sm font-medium"
            >
              <XCircleIcon className="h-4 w-4" />
              رفض
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
            >
              <TrashIcon className="h-4 w-4" />
              حذف
            </button>
          </div>
        )}
      </div>

      {/* Reviews List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">لا توجد تقييمات</div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {reviews.map((review) => (
              <div key={review.id} className={`p-6 transition-colors ${selectedReviews.includes(review.id)
                ? 'bg-indigo-50 dark:bg-indigo-900/20'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}>
                <div className="flex items-start gap-4">
                  <div className="pt-1">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      checked={selectedReviews.includes(review.id)}
                      onChange={() => toggleReview(review.id)}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{review.customerName}</h3>
                      {renderStars(review.rating)}
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${review.isApproved
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                          }`}
                      >
                        {review.isApproved ? 'موافق عليها' : 'في انتظار الموافقة'}
                      </span>
                    </div>

                    {review.productName && (
                      <Link
                        to={`/products/${review.productId}`}
                        className="text-sm text-indigo-600 hover:text-indigo-800 mb-2 block"
                      >
                        {review.productName}
                      </Link>
                    )}

                    {review.title && (
                      <h4 className="font-medium text-gray-900 dark:text-white mb-1">{review.title}</h4>
                    )}

                    {review.comment && (
                      <p className="text-gray-700 dark:text-gray-300 text-sm mb-2">{review.comment}</p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-2">
                      <span>{formatDate(review.createdAt)}</span>
                      {review.customerEmail && <span>{review.customerEmail}</span>}
                      {review.customerPhone && <span>{review.customerPhone}</span>}
                      <span>مفيد ({review.helpfulCount})</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    {!review.isApproved && (
                      <button
                        onClick={() => handleApprove(review.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                        موافقة
                      </button>
                    )}
                    {review.isApproved && (
                      <button
                        onClick={() => handleReject(review.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                      >
                        <XCircleIcon className="h-4 w-4" />
                        إلغاء الموافقة
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(review.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      <TrashIcon className="h-4 w-4" />
                      حذف
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              صفحة {pagination.page} من {pagination.pages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                السابق
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page === pagination.pages}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


export default ProductReviewsSimple;


