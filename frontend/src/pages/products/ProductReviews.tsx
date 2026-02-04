import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { toast } from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  TrashIcon,
  StarIcon
} from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';

interface Review {
  id: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  rating: number;
  title?: string;
  comment?: string;
  isApproved: boolean;
  helpfulCount: number;
  createdAt: string;
  product: {
    id: string;
    name: string;
    images?: string | string[];
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const ProductReviews: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [filters, setFilters] = useState({
    isApproved: 'all' as 'all' | 'true' | 'false',
    rating: '' as string,
    productId: '' as string
  });
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchReviews();
  }, [pagination.page, filters]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit
      };

      if (filters.isApproved !== 'all') {
        params.isApproved = filters.isApproved;
      }

      if (filters.rating) {
        params.rating = filters.rating;
      }

      if (filters.productId) {
        params.productId = filters.productId;
      }

      const response = await apiClient.get('/reviews', { params });

      if (response.data.success) {
        setReviews(response.data.data.reviews || []);
        setPagination(response.data.data.pagination || pagination);
      }
    } catch (error: any) {
      console.error('Error fetching reviews:', error);
      toast.error('حدث خطأ في جلب التقييمات');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (reviewId: string) => {
    try {
      const response = await apiClient.put(`/reviews/${reviewId}/approve`, {});
      if (response.data.success) {
        toast.success('تم الموافقة على التقييم بنجاح');
        fetchReviews();
      }
    } catch (error: any) {
      console.error('Error approving review:', error);
      toast.error('حدث خطأ في الموافقة على التقييم');
    }
  };

  const handleReject = async (reviewId: string) => {
    try {
      const response = await apiClient.put(`/reviews/${reviewId}/reject`, {});
      if (response.data.success) {
        toast.success('تم رفض التقييم بنجاح');
        fetchReviews();
      }
    } catch (error: any) {
      console.error('Error rejecting review:', error);
      toast.error('حدث خطأ في رفض التقييم');
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التقييم؟')) {
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
      toast.error('حدث خطأ في حذف التقييم');
    }
  };

  const parseImages = (images: string | string[] | undefined): string[] => {
    if (!images) return [];
    if (Array.isArray(images)) return images;
    if (typeof images === 'string') {
      try {
        const parsed = JSON.parse(images);
        return Array.isArray(parsed) ? parsed : [images];
      } catch {
        return [images];
      }
    }
    return [];
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          star <= rating ? (
            <StarIcon key={star} className="h-4 w-4 text-yellow-400" />
          ) : (
            <StarOutlineIcon key={star} className="h-4 w-4 text-gray-300" />
          )
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const filteredReviews = reviews.filter(review => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      review.customerName.toLowerCase().includes(searchLower) ||
      review.product.name.toLowerCase().includes(searchLower) ||
      (review.comment && review.comment.toLowerCase().includes(searchLower)) ||
      (review.title && review.title.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">إدارة التقييمات والمراجعات</h1>
        <p className="text-gray-600">إدارة ومراجعة تقييمات المنتجات</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="ابحث عن تقييم..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filters.isApproved}
              onChange={(e) => setFilters({ ...filters, isApproved: e.target.value as 'all' | 'true' | 'false' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-600 mb-1">إجمالي التقييمات</div>
          <div className="text-2xl font-bold text-gray-900">{pagination.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-600 mb-1">موافق عليها</div>
          <div className="text-2xl font-bold text-green-600">
            {reviews.filter(r => r.isApproved).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-600 mb-1">في انتظار الموافقة</div>
          <div className="text-2xl font-bold text-yellow-600">
            {reviews.filter(r => !r.isApproved).length}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="bg-white rounded-lg shadow-sm">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            لا توجد تقييمات
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredReviews.map((review) => {
              const productImages = parseImages(review.product.images);
              const productImage = productImages.length > 0 ? productImages[0] : '/placeholder.png';

              return (
                <div key={review.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Product Image */}
                    <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={productImage}
                        alt={review.product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder.png';
                        }}
                      />
                    </div>

                    {/* Review Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold text-gray-900">{review.customerName}</h3>
                            {renderStars(review.rating)}
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${review.isApproved
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                              }`}>
                              {review.isApproved ? 'موافق عليها' : 'في انتظار الموافقة'}
                            </span>
                          </div>
                          <Link
                            to={`/products/${review.product.id}`}
                            className="text-sm text-indigo-600 hover:text-indigo-800 mb-2 block"
                          >
                            {review.product.name}
                          </Link>
                          {review.title && (
                            <h4 className="font-medium text-gray-900 mb-1">{review.title}</h4>
                          )}
                          {review.comment && (
                            <p className="text-gray-700 text-sm mb-2">{review.comment}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{formatDate(review.createdAt)}</span>
                            {review.customerEmail && <span>{review.customerEmail}</span>}
                            {review.customerPhone && <span>{review.customerPhone}</span>}
                            <span>مفيد ({review.helpfulCount})</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-3">
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
                </div>
              );
            })}
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
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                السابق
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page === pagination.pages}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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

export default ProductReviews;

