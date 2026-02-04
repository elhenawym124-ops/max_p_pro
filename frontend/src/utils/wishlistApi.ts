import { storefrontFetch, getCompanyId } from './storefrontApi';

/**
 * ❤️ API Helper لقائمة الرغبات (Wishlist)
 */

// Get or create session ID
const getSessionId = (): string => {
  let sessionId = localStorage.getItem('wishlist_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('wishlist_session_id', sessionId);
  }
  return sessionId;
};

export const wishlistApi = {
  /**
   * جلب قائمة الرغبات
   */
  getWishlist: async () => {
    const sessionId = getSessionId();
    return storefrontFetch('/wishlist', {
      headers: {
        'x-session-id': sessionId
      }
    });
  },

  /**
   * إضافة منتج لقائمة الرغبات
   */
  addToWishlist: async (productId: string, variantId?: string) => {
    const sessionId = getSessionId();
    return storefrontFetch('/wishlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': sessionId
      },
      body: JSON.stringify({ productId, variantId })
    });
  },

  /**
   * حذف منتج من قائمة الرغبات
   */
  removeFromWishlist: async (productId: string, variantId?: string) => {
    const sessionId = getSessionId();
    const params = new URLSearchParams();
    if (variantId) params.set('variantId', variantId);
    
    return storefrontFetch(`/wishlist/${productId}?${params}`, {
      method: 'DELETE',
      headers: {
        'x-session-id': sessionId
      }
    });
  },

  /**
   * جلب عدد المنتجات في قائمة الرغبات
   */
  getWishlistCount: async () => {
    const sessionId = getSessionId();
    return storefrontFetch('/wishlist/count', {
      headers: {
        'x-session-id': sessionId
      }
    });
  },

  /**
   * مسح قائمة الرغبات بالكامل
   */
  clearWishlist: async () => {
    const sessionId = getSessionId();
    return storefrontFetch('/wishlist/clear', {
      method: 'DELETE',
      headers: {
        'x-session-id': sessionId
      }
    });
  }
};

