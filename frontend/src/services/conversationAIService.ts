/**
 * خدمة التحكم في الذكاء الاصطناعي للمحادثات
 * Conversation AI Control Service
 */

import { buildApiUrl } from '../utils/urlHelper';

const API_BASE_URL = buildApiUrl('');

export interface AIToggleResponse {
  success: boolean;
  message: string;
  data?: {
    conversationId: string;
    aiEnabled: boolean;
    customerName: string;
  };
  error?: string;
}

export interface AIStatusResponse {
  success: boolean;
  data?: {
    conversationId: string;
    aiEnabled: boolean;
    customerName: string;
  };
  message?: string;
  error?: string;
}

export interface BulkAIToggleResponse {
  success: boolean;
  message: string;
  data?: {
    updatedCount: number;
    aiEnabled: boolean;
  };
  error?: string;
}

/**
 * تشغيل/إيقاف الذكاء الاصطناعي لمحادثة معينة
 * Toggle AI for a specific conversation
 */
export const toggleConversationAI = async (
  conversationId: string, 
  aiEnabled: boolean
): Promise<AIToggleResponse> => {
  try {
    console.log(`🤖 [AI-SERVICE] Toggling AI for conversation ${conversationId} to ${aiEnabled}`);

    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/ai-toggle`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ aiEnabled }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'فشل في تحديث إعدادات الذكاء الاصطناعي');
    }

    console.log(`✅ [AI-SERVICE] AI ${aiEnabled ? 'enabled' : 'disabled'} for conversation ${conversationId}`);
    return data;

  } catch (error) {
    console.error('❌ [AI-SERVICE] Error toggling AI:', error);
    return {
      success: false,
      message: 'خطأ في تحديث إعدادات الذكاء الاصطناعي',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * الحصول على حالة الذكاء الاصطناعي لمحادثة معينة
 * Get AI status for a specific conversation
 */
export const getConversationAIStatus = async (
  conversationId: string
): Promise<AIStatusResponse> => {
  try {
    console.log(`🔍 [AI-SERVICE] Getting AI status for conversation ${conversationId}`);

    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/ai-status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'فشل في الحصول على حالة الذكاء الاصطناعي');
    }

    return data;

  } catch (error) {
    console.error('❌ [AI-SERVICE] Error getting AI status:', error);
    return {
      success: false,
      message: 'خطأ في الحصول على حالة الذكاء الاصطناعي',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * تشغيل/إيقاف الذكاء الاصطناعي لعدة محادثات
 * Bulk toggle AI for multiple conversations
 */
export const bulkToggleConversationAI = async (
  conversationIds: string[], 
  aiEnabled: boolean
): Promise<BulkAIToggleResponse> => {
  try {
    console.log(`🤖 [AI-SERVICE] Bulk toggling AI for ${conversationIds.length} conversations to ${aiEnabled}`);

    const response = await fetch(`${API_BASE_URL}/conversations/bulk-ai-toggle`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ conversationIds, aiEnabled }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'فشل في التحديث المجمع للذكاء الاصطناعي');
    }

    console.log(`✅ [AI-SERVICE] Bulk AI toggle completed for ${data.data?.updatedCount || 0} conversations`);
    return data;

  } catch (error) {
    console.error('❌ [AI-SERVICE] Error in bulk AI toggle:', error);
    return {
      success: false,
      message: 'خطأ في التحديث المجمع للذكاء الاصطناعي',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Hook لاستخدام خدمة التحكم في الذكاء الاصطناعي
 * Hook for using AI control service
 */
export const useConversationAI = () => {
  return {
    toggleAI: toggleConversationAI,
    getAIStatus: getConversationAIStatus,
    bulkToggleAI: bulkToggleConversationAI,
  };
};
