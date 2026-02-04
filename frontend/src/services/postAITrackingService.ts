import { companyAwareApi } from './companyAwareApi';

export interface PostAITrackingData {
  postId: string;
  visitCount?: number;
  firstVisitAt?: string;
  lastVisitAt?: string;
  pageId?: string | null;
  featuredProduct?: {
    id: string;
    name: string;
    price: number;
  } | null;
  featuredProductId?: string | null;
}

export interface PostDetails {
  postId: string;
  message: string | null;
  permalinkUrl: string | null;
  fullPicture: string | null;
  hasImages: boolean;
  imageUrls: string[];
  pageId: string;
  pageName: string;
}

export interface PostsAITrackingResponse {
  success: boolean;
  data: {
    posts: PostAITrackingData[];
  };
}

class PostAITrackingService {
  /**
   * Get posts with AI identification tracking
   */
  async getPostsAITracking(): Promise<PostsAITrackingResponse> {
    try {
      const response = await companyAwareApi.get<PostsAITrackingResponse>(
        '/conversations/posts/ai-identification'
      );
      return response.data;
    } catch (error: any) {
      console.error('Error fetching posts AI tracking:', error);
      throw new Error(
        error.response?.data?.message || 'فشل في جلب بيانات تتبع البوستات'
      );
    }
  }

  /**
   * Get post details from Facebook (pageId is optional)
   */
  async getPostDetails(
    postId: string,
    pageId?: string
  ): Promise<{ success: boolean; data: PostDetails }> {
    try {
      const params = pageId ? { pageId } : {};
      const response = await companyAwareApi.get<{ success: boolean; data: PostDetails }>(
        `/conversations/posts/${postId}/details`,
        { params }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error fetching post details:', error);
      throw new Error(
        error.response?.data?.message || 'فشل في جلب تفاصيل البوست'
      );
    }
  }

  /**
   * Update featured product for a post
   */
  async updateFeaturedProduct(
    postId: string,
    featuredProductId: string | null
  ): Promise<{ success: boolean; data: any }> {
    try {
      const response = await companyAwareApi.put<{ success: boolean; data: any }>(
        `/conversations/posts/${postId}/featured-product`,
        { featuredProductId }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error updating featured product:', error);
      throw new Error(
        error.response?.data?.message || 'فشل في تحديث المنتج المميز'
      );
    }
  }
}

// Create singleton instance
export const postAITrackingService = new PostAITrackingService();

export default PostAITrackingService;

