import React, { useEffect, useState } from 'react';
import { XMarkIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { socketService } from '../../services/socketService';

interface CampaignProgressModalProps {
  campaignId: string;
  campaignName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ProgressData {
  campaignId: string;
  status: 'started' | 'sending' | 'completed' | 'failed';
  total: number;
  sent: number;
  failed: number;
  progress: number;
  currentRecipient?: string;
}

const CampaignProgressModal: React.FC<CampaignProgressModalProps> = ({
  campaignId,
  campaignName,
  isOpen,
  onClose,
}) => {
  const [progressData, setProgressData] = useState<ProgressData>({
    campaignId,
    status: 'started',
    total: 0,
    sent: 0,
    failed: 0,
    progress: 0,
  });

  useEffect(() => {
    if (!isOpen) return;

    console.log('🔌 [CAMPAIGN-MODAL] Listening for campaign progress, campaignId:', campaignId);

    // Listen for progress updates
    const handleProgress = (data: ProgressData) => {
      console.log('📡 [CAMPAIGN-MODAL] Received progress event:', data);
      
      if (data.campaignId === campaignId) {
        console.log('✅ [CAMPAIGN-MODAL] Campaign ID matches, updating progress');
        setProgressData(data);
        
        // Auto-close after completion (with delay)
        if (false && data.status === 'completed') {
          setTimeout(() => {
            onClose();
          }, 3000);
        }
      } else {
        console.log('⚠️ [CAMPAIGN-MODAL] Campaign ID mismatch:', data.campaignId, 'vs', campaignId);
      }
    };

    socketService.onCampaignProgress(handleProgress);

    return () => {
      socketService.off('campaign:progress', handleProgress);
    };
  }, [isOpen, campaignId, onClose]);

  if (!isOpen) return null;

  const isCompleted = progressData.status === 'completed';
  const isFailed = progressData.status === 'failed';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {isCompleted ? '✅ اكتمل الإرسال' : '📤 جاري إرسال الحملة'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Campaign Name */}
          <div className="mb-4">
            <p className="text-sm text-gray-600">اسم الحملة</p>
            <p className="font-medium text-gray-900">{campaignName}</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>التقدم</span>
              <span className="font-semibold">{progressData.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  isCompleted
                    ? 'bg-green-500'
                    : isFailed
                    ? 'bg-red-500'
                    : 'bg-blue-500'
                }`}
                style={{ width: `${progressData.progress}%` }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{progressData.total}</div>
              <div className="text-xs text-gray-600">إجمالي</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{progressData.sent}</div>
              <div className="text-xs text-gray-600">نجح</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{progressData.failed}</div>
              <div className="text-xs text-gray-600">فشل</div>
            </div>
          </div>

          {/* Current Recipient */}
          {progressData.currentRecipient && !isCompleted && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">جاري الإرسال إلى</p>
              <p className="text-sm font-medium text-blue-900">{progressData.currentRecipient}</p>
            </div>
          )}

          {/* Status Message */}
          {isCompleted && (
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
              <p className="text-sm text-green-900">
                تم إرسال الحملة بنجاح! تم إرسال {progressData.sent} رسالة من أصل {progressData.total}
              </p>
            </div>
          )}

          {isFailed && (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
              <XCircleIcon className="w-5 h-5 text-red-600" />
              <p className="text-sm text-red-900">فشل إرسال الحملة</p>
            </div>
          )}

          {/* Loading Animation */}
          {!isCompleted && !isFailed && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
              <span>جاري الإرسال...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignProgressModal;
