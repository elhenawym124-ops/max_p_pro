import { apiClient } from './apiClient';

/**
 * Comment Service
 * Handles Facebook comments and posts management
 * Uses standardized apiClient for all requests
 */

class CommentService {
  // Get all Facebook comments with filtering and pagination
  static async getFacebookComments(filters = {}) {
    try {
      const response = await apiClient.get('/comments/facebook-comments', {
        params: filters
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch comments');
    }
  }

  // NEW: Get all Facebook posts (comments grouped by postId)
  static async getFacebookPosts(filters = {}) {
    try {
      const response = await apiClient.get('/comments/facebook-posts', {
        params: filters
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch posts');
    }
  }

  // NEW: Get comments for a specific post
  static async getCommentsByPostId(postId, filters = {}) {
    try {
      const response = await apiClient.get(`/comments/facebook-posts/${postId}/comments`, {
        params: filters
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch comments');
    }
  }

  // Get a specific Facebook comment by ID
  static async getFacebookCommentById(id) {
    try {
      const response = await apiClient.get(`/comments/facebook-comments/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch comment');
    }
  }

  // Update a Facebook comment response
  static async updateFacebookComment(id, responseText) {
    try {
      const response = await apiClient.put(`/comments/facebook-comments/${id}`, {
        response: responseText
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to update comment');
    }
  }

  // NEW: Set response method for a post
  static async setPostResponseMethod(postId, settings) {
    try {
      const response = await apiClient.post(`/comments/facebook-posts/${postId}/response-method`, settings);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to set post response method');
    }
  }

  // NEW: Get response method for a post
  static async getPostResponseMethod(postId) {
    try {
      const response = await apiClient.get(`/comments/facebook-posts/${postId}/response-method`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to get post response method');
    }
  }

  // NEW: Apply response method to all pending comments of a post
  static async applyPostResponseMethod(postId) {
    try {
      const response = await apiClient.post(`/comments/facebook-posts/${postId}/apply-response-method`, {});
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to apply post response method');
    }
  }

  // NEW: Send manual response to Facebook
  static async sendManualResponseToFacebook(id, responseText) {
    try {
      const response = await apiClient.post(`/comments/facebook-comments/${id}/send-response`, {
        response: responseText
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to send response to Facebook');
    }
  }

  // Delete a Facebook comment
  static async deleteFacebookComment(id) {
    try {
      const response = await apiClient.delete(`/comments/facebook-comments/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to delete comment');
    }
  }

  // Bulk delete Facebook comments
  static async bulkDeleteFacebookComments(ids) {
    try {
      const response = await apiClient.delete('/comments/facebook-comments', {
        data: { ids }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to delete comments');
    }
  }

  // Get comment statistics
  static async getCommentStats() {
    try {
      const response = await apiClient.get('/comments/facebook-comments/stats');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch statistics');
    }
  }

  // NEW: Get all Facebook pages
  static async getFacebookPages() {
    try {
      const response = await apiClient.get('/comments/facebook-pages');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch pages');
    }
  }

  // NEW: Get posts by page ID
  static async getPostsByPageId(pageId) {
    try {
      const response = await apiClient.get(`/comments/facebook-pages/${pageId}/posts`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch posts');
    }
  }

  // NEW: Set page response method
  static async setPageResponseMethod(pageId, settings) {
    try {
      const response = await apiClient.post(`/comments/facebook-pages/${pageId}/response-method`, settings);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to set page response method');
    }
  }

  // NEW: Get page response method
  static async getPageResponseMethod(pageId) {
    try {
      const response = await apiClient.get(`/comments/facebook-pages/${pageId}/response-method`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to get page response method');
    }
  }
}

export default CommentService;