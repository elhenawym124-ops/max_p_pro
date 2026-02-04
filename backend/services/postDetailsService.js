const axios = require('axios');

class PostDetailsService {
  constructor() {
    this.graphApiBaseUrl = 'https://graph.facebook.com/v22.0'; // ✅ Updated to v22.0
  }

  /**
   * Fetch Facebook post details using postId, pageId and pageAccessToken
   * @param {string} postId - The Facebook post ID (from referral, e.g. "122193474746472212")
   * @param {string} pageAccessToken - The page access token
   * @param {string} pageId - Optional: The page ID (needed for proper API access)
   * @returns {Promise<Object|null>} Post details or null if error
   */
  async getFacebookPostDetails(postId, pageAccessToken, pageId = null) {
    try {
      // 🔧 FIX: Use proper Graph API endpoint for post details
      // Post ID from referral is usually just the post ID, but Graph API may need {page-id}_{post-id} format
      // Try both formats if pageId is provided
      const fields = 'message,permalink_url,full_picture,attachments,created_time';
      
      let url;
      // 🔧 Always try {page-id}_{post-id} format first if pageId is available
      // This is the correct format for posts on a page according to Facebook Graph API
      if (pageId && !postId.includes('_')) {
        const fullPostId = `${pageId}_${postId}`;
        url = `${this.graphApiBaseUrl}/${fullPostId}?fields=${fields}&access_token=${pageAccessToken}`;
        console.log(`🔍 [POST-DETAILS] Using page-post format: ${fullPostId}`);
      } else if (postId.includes('_')) {
        // PostId already includes page ID
        url = `${this.graphApiBaseUrl}/${postId}?fields=${fields}&access_token=${pageAccessToken}`;
        console.log(`🔍 [POST-DETAILS] Using full post ID: ${postId}`);
      } else {
        // Fallback: try direct postId (may not work for all posts)
        url = `${this.graphApiBaseUrl}/${postId}?fields=${fields}&access_token=${pageAccessToken}`;
        console.log(`⚠️ [POST-DETAILS] No pageId provided, trying direct post ID: ${postId}`);
      }

      console.log(`🔍 [POST-DETAILS] Fetching post details from Facebook Graph API`);
      
      const response = await axios.get(url, {
        timeout: 5000 // ⚡ OPTIMIZATION: Reduced from 10s to 5s for faster failure recovery
      });
      
      const postData = response.data;
      console.log(`✅ [POST-DETAILS] Received post data from Facebook:`, {
        postId: postData.id,
        hasMessage: !!postData.message,
        hasAttachments: !!postData.attachments,
        permalinkUrl: postData.permalink_url
      });

      let imageUrls = [];
      let hasImages = false;

      // Extract images from attachments or use full_picture
      if (postData.attachments && postData.attachments.data && postData.attachments.data.length > 0) {
        postData.attachments.data.forEach(attachment => {
          if (attachment.type === 'photo' && attachment.media && attachment.media.image) {
            imageUrls.push(attachment.media.image.src);
            hasImages = true;
          } else if (attachment.type === 'album' && attachment.subattachments && attachment.subattachments.data) {
            attachment.subattachments.data.forEach(subAttachment => {
              if (subAttachment.type === 'photo' && subAttachment.media && subAttachment.media.image) {
                imageUrls.push(subAttachment.media.image.src);
                hasImages = true;
              }
            });
          }
        });
      } else if (postData.full_picture) {
        // If no attachments but has full_picture, use it
        imageUrls.push(postData.full_picture);
        hasImages = true;
      }

      const result = {
        postId: postData.id || postId,
        message: postData.message || null,
        permalinkUrl: postData.permalink_url || null,
        fullPicture: postData.full_picture || null,
        hasImages: hasImages,
        imageUrls: imageUrls
      };
      
      console.log(`✅ [POST-DETAILS] Processed post details:`, {
        postId: result.postId,
        hasMessage: !!result.message,
        hasImages: result.hasImages,
        imageCount: result.imageUrls.length
      });
      
      return result;
    } catch (error) {
      console.error(`❌ [POST-DETAILS] Error fetching Facebook post details for postId ${postId}:`, error.message);
      if (error.response) {
        const errorData = error.response.data;
        console.error(`❌ [POST-DETAILS] Error response:`, JSON.stringify(errorData, null, 2));
        
        // If error is about deprecated API or invalid post ID, try alternative format
        if ((errorData?.error?.code === 12 || errorData?.error?.message?.includes('deprecated')) && pageId) {
          // Try with {page-id}_{post-id} format if we haven't already
          if (!postId.includes('_')) {
            console.log(`⚠️ [POST-DETAILS] First attempt failed, trying with page-post format: ${pageId}_${postId}`);
            try {
              const fullPostId = `${pageId}_${postId}`;
              const altUrl = `${this.graphApiBaseUrl}/${fullPostId}?fields=${fields}&access_token=${pageAccessToken}`;
              const altResponse = await axios.get(altUrl, { timeout: 5000 }); // ⚡ OPTIMIZATION: Reduced timeout
              const altPostData = altResponse.data;
              
              // Process the response same way
              let imageUrls = [];
              let hasImages = false;
              if (altPostData.attachments && altPostData.attachments.data && altPostData.attachments.data.length > 0) {
                altPostData.attachments.data.forEach(attachment => {
                  if (attachment.type === 'photo' && attachment.media && attachment.media.image) {
                    imageUrls.push(attachment.media.image.src);
                    hasImages = true;
                  } else if (attachment.type === 'album' && attachment.subattachments && attachment.subattachments.data) {
                    attachment.subattachments.data.forEach(subAttachment => {
                      if (subAttachment.type === 'photo' && subAttachment.media && subAttachment.media.image) {
                        imageUrls.push(subAttachment.media.image.src);
                        hasImages = true;
                      }
                    });
                  }
                });
              } else if (altPostData.full_picture) {
                imageUrls.push(altPostData.full_picture);
                hasImages = true;
              }
              
              console.log(`✅ [POST-DETAILS] Successfully fetched with page-post format`);
              return {
                postId: altPostData.id || fullPostId,
                message: altPostData.message || null,
                permalinkUrl: altPostData.permalink_url || null,
                fullPicture: altPostData.full_picture || null,
                hasImages: hasImages,
                imageUrls: imageUrls
              };
            } catch (altError) {
              console.error(`❌ [POST-DETAILS] Alternative format also failed:`, altError.message);
              if (altError.response) {
                console.error(`❌ [POST-DETAILS] Alternative error response:`, JSON.stringify(altError.response.data, null, 2));
              }
            }
          }
        }
      }
      // Return null if all attempts failed
      return null;
    }
  }
}

module.exports = new PostDetailsService();

