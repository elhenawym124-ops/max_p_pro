import React, { useState, useEffect } from 'react';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { reviewsApi } from '../../utils/storefrontApi';

interface Review {
  id: string;
  customerName: string;
  rating: number;
  title?: string;
  comment?: string;
  helpfulCount: number;
  createdAt: string;
}

interface ReviewSummary {
  averageRating: string;
  totalReviews: number;
  ratingDistribution: Array<{
    rating: number;
    count: number;
  }>;
}

interface ProductReviewsProps {
  productId: string;
  enabled: boolean;
  requirePurchase: boolean;
  showRating: boolean;
  minRatingToDisplay: number;
}

const ProductReviews: React.FC<ProductReviewsProps> = ({
  productId,
  enabled,
  requirePurchase,
  showRating,
  minRatingToDisplay
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    rating: 5,
    title: '',
    comment: ''
  });

  useEffect(() => {
    console.log('🔍 [ProductReviews] useEffect triggered:', { enabled, productId });
    if (enabled && productId) {
      console.log('✅ [ProductReviews] Fetching reviews...');
      fetchReviews();
    } else {
      console.warn('⚠️ [ProductReviews] Not fetching reviews:', { enabled, productId });
    }
  }, [enabled, productId]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      console.log('🔍 [ProductReviews] Fetching reviews for product:', productId);
      const data = await reviewsApi.getProductReviews(productId);
      console.log('🔍 [ProductReviews] API Response:', data);
      if (data.success) {
        const reviewsList = data.data.reviews || [];
        const summaryData = data.data.summary || null;
        // Use same logic as in render
        let validMinRatingForLog = Math.min(Math.max(minRatingToDisplay, 1), 5);
        if (minRatingToDisplay > 5) {
          validMinRatingForLog = 1;
        } else if (minRatingToDisplay < 1) {
          validMinRatingForLog = 1;
        }
        
        console.log('✅ [ProductReviews] Reviews fetched:', {
          count: reviewsList.length,
          reviews: reviewsList,
          summary: summaryData,
          minRatingToDisplay: minRatingToDisplay,
          validMinRating: validMinRatingForLog,
          filteredReviews: reviewsList.filter((review: Review) => review.rating >= validMinRatingForLog)
        });
        setReviews(reviewsList);
        setSummary(summaryData);
      } else {
        console.warn('⚠️ [ProductReviews] API returned success: false:', data);
      }
    } catch (error) {
      console.error('❌ [ProductReviews] Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerName || !formData.rating) {
      toast.error('الاسم والتقييم مطلوبان');
      return;
    }

    try {
      setSubmitting(true);
      const data = await reviewsApi.createReview(productId, formData);
      if (data.success) {
        toast.success(data.message || 'تم إضافة التقييم بنجاح');
        setShowForm(false);
        setFormData({
          customerName: '',
          customerEmail: '',
          customerPhone: '',
          rating: 5,
          title: '',
          comment: ''
        });
        fetchReviews();
      } else {
        toast.error(data.error || 'حدث خطأ');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('حدث خطأ في إضافة التقييم');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkHelpful = async (reviewId: string) => {
    try {
      await reviewsApi.markReviewHelpful(reviewId);
      fetchReviews();
    } catch (error) {
      console.error('Error marking review as helpful:', error);
    }
  };

  if (!enabled) {
    console.log('⚠️ [ProductReviews] Component disabled, returning null');
    return null;
  }
  
  // Fix: Ensure minRatingToDisplay is between 1-5
  // If minRatingToDisplay is invalid (like 10), use 1 instead of 5 to show all reviews
  let validMinRating = Math.min(Math.max(minRatingToDisplay, 1), 5);
  if (minRatingToDisplay > 5) {
    console.warn('⚠️ [ProductReviews] minRatingToDisplay is invalid (>5):', minRatingToDisplay, 'using: 1 to show all reviews');
    validMinRating = 1; // Use 1 to show all reviews if minRatingToDisplay is invalid
  } else if (minRatingToDisplay < 1) {
    console.warn('⚠️ [ProductReviews] minRatingToDisplay is invalid (<1):', minRatingToDisplay, 'using: 1');
    validMinRating = 1;
  }
  
  console.log('✅ [ProductReviews] Rendering component:', { productId, enabled, showRating, minRatingToDisplay, validMinRating });

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4',
      lg: 'h-5 w-5'
    };
    
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          star <= rating ? (
            <StarIcon key={star} className={`${sizeClasses[size]} text-yellow-400`} />
          ) : (
            <StarOutlineIcon key={star} className={`${sizeClasses[size]} text-gray-300`} />
          )
        ))}
      </div>
    );
  };

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">التقييمات والمراجعات</h2>

      {/* Summary */}
      {summary && showRating && (
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">{summary.averageRating}</div>
              <div className="flex items-center justify-center mt-2">
                {renderStars(Math.round(parseFloat(summary.averageRating)), 'lg')}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {summary.totalReviews} تقييم
              </div>
            </div>
            <div className="flex-1">
              <div className="space-y-2">
                {summary.ratingDistribution.map((dist) => (
                  <div key={dist.rating} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-12">{dist.rating} ⭐</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-400 h-2 rounded-full"
                        style={{
                          width: `${summary.totalReviews > 0 ? (dist.count / summary.totalReviews) * 100 : 0}%`
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-left">{dist.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Review Button */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="mb-6 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
      >
        {showForm ? 'إلغاء' : 'أضف تقييم'}
      </button>

      {/* Review Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">أضف تقييمك</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الاسم *</label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">رقم الهاتف</label>
                <input
                  type="tel"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">التقييم *</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setFormData({ ...formData, rating })}
                    className="focus:outline-none"
                  >
                    {rating <= formData.rating ? (
                      <StarIcon className="h-8 w-8 text-yellow-400" />
                    ) : (
                      <StarOutlineIcon className="h-8 w-8 text-gray-300" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">عنوان التقييم</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">التعليق</label>
              <textarea
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? 'جاري الإرسال...' : 'إرسال التقييم'}
            </button>
          </div>
        </form>
      )}

      {/* Reviews List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          لا توجد تقييمات بعد
        </div>
      ) : (
        <div className="space-y-6">
          {(() => {
            // Use same logic as in component level
            let validMinRating = Math.min(Math.max(minRatingToDisplay, 1), 5);
            if (minRatingToDisplay > 5) {
              validMinRating = 1; // Use 1 to show all reviews if minRatingToDisplay is invalid
            } else if (minRatingToDisplay < 1) {
              validMinRating = 1;
            }
            
            const filteredReviews = reviews.filter((review: Review) => review.rating >= validMinRating);
            console.log('🔍 [ProductReviews] Rendering reviews list:', {
              totalReviews: reviews.length,
              minRatingToDisplay,
              validMinRating,
              filteredCount: filteredReviews.length,
              reviews: reviews.map((r: Review) => ({ id: r.id, rating: r.rating, willShow: r.rating >= validMinRating }))
            });
            
            // If no reviews after filtering, show message
            if (filteredReviews.length === 0 && reviews.length > 0) {
              return (
                <div className="text-center py-8 text-gray-500">
                  لا توجد تقييمات بحد أدنى {validMinRating} نجوم
                  <p className="text-sm mt-2">(يوجد {reviews.length} تقييم{reviews.length > 1 ? 'ات' : ''} لكن تقييمها أقل من {validMinRating})</p>
                </div>
              );
            }
            
            return (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  التقييمات ({filteredReviews.length})
                </h3>
                {filteredReviews.map((review: Review) => (
              <div key={review.id} className="border-b border-gray-200 pb-6">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="font-semibold text-gray-900">{review.customerName}</div>
                      <div className="flex items-center">
                        {renderStars(review.rating)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(review.createdAt).toLocaleDateString('ar-EG')}
                      </div>
                    </div>
                    {review.title && (
                      <h4 className="font-medium text-gray-900 mb-2">{review.title}</h4>
                    )}
                  </div>
                </div>
                {review.comment && (
                  <p className="text-gray-700 mb-3">{review.comment}</p>
                )}
                <button
                  onClick={() => handleMarkHelpful(review.id)}
                  className="text-sm text-gray-600 hover:text-indigo-600"
                >
                  مفيد ({review.helpfulCount})
                </button>
              </div>
            ))}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default ProductReviews;

