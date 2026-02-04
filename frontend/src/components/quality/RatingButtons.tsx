import React, { useState } from 'react';
import { HandThumbUpIcon, HandThumbDownIcon } from '@heroicons/react/24/outline';
import { HandThumbUpIcon as HandThumbUpSolidIcon, HandThumbDownIcon as HandThumbDownSolidIcon } from '@heroicons/react/24/solid';
import { getApiUrl } from '../../config/environment'; // Import environment config

interface RatingButtonsProps {
  messageId: string;
  conversationId: string;
  customerId: string;
  onRatingSubmit?: (rating: 'positive' | 'negative', comment?: string) => void;
  className?: string;
}

const RatingButtons: React.FC<RatingButtonsProps> = ({
  messageId,
  conversationId,
  customerId,
  onRatingSubmit,
  className = ''
}) => {
  const [selectedRating, setSelectedRating] = useState<'positive' | 'negative' | null>(null);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleRatingClick = async (rating: 'positive' | 'negative') => {
    if (isSubmitted) return;

    setSelectedRating(rating);
    
    // للتقييم الإيجابي، نرسل مباشرة
    if (rating === 'positive') {
      await submitRating(rating);
    } else {
      // للتقييم السلبي، نظهر صندوق التعليق
      setShowCommentBox(true);
    }
  };

  const submitRating = async (rating: 'positive' | 'negative', userComment?: string) => {
    if (isSubmitting || isSubmitted) return;

    setIsSubmitting(true);

    try {
      const apiUrl = getApiUrl(); // Use environment-configured API URL
      const response = await fetch(`${apiUrl}/monitor/quality/rating`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId,
          conversationId,
          customerId,
          rating,
          comment: userComment || comment || ''
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsSubmitted(true);
        setShowCommentBox(false);
        
        // استدعاء callback إذا كان موجود
        if (onRatingSubmit) {
          onRatingSubmit(rating, userComment || comment);
        }

        console.log('✅ Rating submitted successfully:', data.data.ratingId);
      } else {
        throw new Error(data.message || 'Failed to submit rating');
      }
    } catch (error) {
      console.error('❌ Error submitting rating:', error);
      
      // إعادة تعيين الحالة في حالة الخطأ
      setSelectedRating(null);
      setShowCommentBox(false);
      setIsSubmitted(false);
      
      // يمكن إضافة toast notification هنا
      alert('حدث خطأ في إرسال التقييم. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentSubmit = async () => {
    if (selectedRating) {
      await submitRating(selectedRating, comment);
    }
  };

  const handleCommentCancel = () => {
    setShowCommentBox(false);
    setSelectedRating(null);
    setComment('');
  };

  if (isSubmitted) {
    return (
      <div className={`flex items-center space-x-2 space-x-reverse text-sm text-green-600 ${className}`}>
        <span className="text-green-500">✓</span>
        <span>شكراً لتقييمك!</span>
        {selectedRating === 'positive' ? (
          <HandThumbUpSolidIcon className="w-4 h-4 text-green-500" />
        ) : (
          <HandThumbDownSolidIcon className="w-4 h-4 text-red-500" />
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* أزرار التقييم */}
      <div className="flex items-center space-x-2 space-x-reverse">
        <span className="text-xs text-gray-500">هل كان هذا الرد مفيداً؟</span>
        
        <button
          onClick={() => handleRatingClick('positive')}
          disabled={isSubmitting || isSubmitted}
          className={`p-1.5 rounded-full transition-all duration-200 ${
            selectedRating === 'positive'
              ? 'bg-green-100 text-green-600'
              : 'text-gray-400 hover:text-green-500 hover:bg-green-50'
          } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          title="مفيد"
        >
          {selectedRating === 'positive' ? (
            <HandThumbUpSolidIcon className="w-4 h-4" />
          ) : (
            <HandThumbUpIcon className="w-4 h-4" />
          )}
        </button>

        <button
          onClick={() => handleRatingClick('negative')}
          disabled={isSubmitting || isSubmitted}
          className={`p-1.5 rounded-full transition-all duration-200 ${
            selectedRating === 'negative'
              ? 'bg-red-100 text-red-600'
              : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
          } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          title="غير مفيد"
        >
          {selectedRating === 'negative' ? (
            <HandThumbDownSolidIcon className="w-4 h-4" />
          ) : (
            <HandThumbDownIcon className="w-4 h-4" />
          )}
        </button>

        {isSubmitting && (
          <div className="flex items-center space-x-1 space-x-reverse text-xs text-gray-500">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
            <span>جاري الإرسال...</span>
          </div>
        )}
      </div>

      {/* صندوق التعليق للتقييم السلبي */}
      {showCommentBox && (
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 animate-fade-in">
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700">
              ما الذي يمكن تحسينه؟ (اختياري)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="اكتب تعليقك هنا..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={2}
              maxLength={200}
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">
                {comment.length}/200
              </span>
              <div className="flex space-x-2 space-x-reverse">
                <button
                  onClick={handleCommentCancel}
                  className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleCommentSubmit}
                  disabled={isSubmitting}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'جاري الإرسال...' : 'إرسال'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RatingButtons;
