import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { broadcastService } from '../../services/broadcastService';

interface CreateListModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateListModal: React.FC<CreateListModalProps> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    criteriaType: 'active',
    lastActivity: '24'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('يرجى إدخال اسم القائمة');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const criteria = {
        type: formData.criteriaType,
        lastActivity: formData.lastActivity
      };

      await broadcastService.createCustomerList({
        name: formData.name,
        description: formData.description,
        criteria
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating list:', err);
      setError(err.message || 'فشل في إنشاء القائمة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            إنشاء قائمة جديدة
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              اسم القائمة <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="مثال: عملاء VIP"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              الوصف
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="وصف مختصر للقائمة..."
            />
          </div>

          {/* Criteria Type */}
          <div>
            <label htmlFor="criteriaType" className="block text-sm font-medium text-gray-700 mb-1">
              نوع المعايير
            </label>
            <select
              id="criteriaType"
              value={formData.criteriaType}
              onChange={(e) => setFormData({ ...formData, criteriaType: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="all">جميع العملاء</option>
              <option value="active">نشطين في فترة محددة</option>
              <option value="inactive">غير نشطين لفترة محددة</option>
            </select>
          </div>

          {/* Last Activity (only for active/inactive) */}
          {(formData.criteriaType === 'active' || formData.criteriaType === 'inactive') && (
            <div>
              <label htmlFor="lastActivity" className="block text-sm font-medium text-gray-700 mb-1">
                {formData.criteriaType === 'active' ? 'نشطين خلال (ساعات)' : 'غير نشطين لأكثر من (أيام)'}
              </label>
              <input
                type="number"
                id="lastActivity"
                value={formData.lastActivity}
                onChange={(e) => setFormData({ ...formData, lastActivity: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                min="1"
                placeholder={formData.criteriaType === 'active' ? '24' : '30'}
              />
              <p className="mt-1 text-xs text-gray-500">
                {formData.criteriaType === 'active' 
                  ? 'العملاء الذين تواصلوا معك في آخر X ساعة'
                  : 'العملاء الذين لم يتواصلوا معك منذ X يوم'
                }
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 space-x-reverse pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={loading}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  جاري الإنشاء...
                </span>
              ) : (
                'إنشاء القائمة'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateListModal;
