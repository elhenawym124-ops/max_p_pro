const axios = require('axios');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

/**
 * Get Page Engagement Stats
 * جلب إحصائيات التفاعلات للصفحات (Likes, Comments, Shares, Reactions)
 */
const getPageEngagementStats = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.companyId) {
      return res.status(401).json({
        success: false,
        error: 'مستخدم غير صالح'
      });
    }

    const companyId = user.companyId;
    const { pageId } = req.params;
    const { period = '7' } = req.query; // Default to last 7 days

    // Get Facebook page
    const facebookPage = await getSharedPrismaClient().facebookPage.findFirst({
      where: {
        pageId: pageId,
        companyId: companyId,
        status: 'connected'
      }
    });

    if (!facebookPage) {
      return res.status(404).json({
        success: false,
        error: 'صفحة Facebook غير موجودة أو غير متصلة'
      });
    }

    const accessToken = facebookPage.pageAccessToken;

    // Calculate date range
    const since = new Date();
    since.setDate(since.getDate() - parseInt(period));
    const until = new Date();

    try {
      // 1. Get Recent Posts with Engagement (Main data source)
      const postsResponse = await axios.get(
        `https://graph.facebook.com/v18.0/${pageId}/posts`,
        {
          params: {
            access_token: accessToken,
            fields: 'id,message,created_time,permalink_url,full_picture,likes.summary(true),comments.summary(true),shares,reactions.summary(true)',
            limit: 20,
            since: Math.floor(since.getTime() / 1000),
            until: Math.floor(until.getTime() / 1000)
          }
        }
      );

      // 2. Get Page Info
      const pageInfoResponse = await axios.get(
        `https://graph.facebook.com/v18.0/${pageId}`,
        {
          params: {
            access_token: accessToken,
            fields: 'id,name,fan_count,followers_count,picture,cover,link,about,category'
          }
        }
      );

      // Process posts engagement
      const posts = [];
      let totalLikes = 0;
      let totalComments = 0;
      let totalShares = 0;
      let totalReactions = 0;

      if (postsResponse.data?.data) {
        postsResponse.data.data.forEach(post => {
          const likes = post.likes?.summary?.total_count || 0;
          const comments = post.comments?.summary?.total_count || 0;
          const shares = post.shares?.count || 0;
          const reactions = post.reactions?.summary?.total_count || 0;

          totalLikes += likes;
          totalComments += comments;
          totalShares += shares;
          totalReactions += reactions;

          posts.push({
            id: post.id,
            message: post.message || '',
            createdTime: post.created_time,
            permalinkUrl: post.permalink_url,
            picture: post.full_picture,
            engagement: {
              likes,
              comments,
              shares,
              reactions,
              total: likes + comments + shares
            }
          });
        });
      }

      // Calculate engagement rate based on fan count
      const fanCount = pageInfoResponse.data.fan_count || 0;
      const totalEngagement = totalLikes + totalComments + totalShares;
      const engagementRate = (fanCount > 0 && posts.length > 0)
        ? (totalEngagement / (fanCount * posts.length) * 100).toFixed(2)
        : 0;

      // Response data
      res.json({
        success: true,
        data: {
          page: {
            id: pageInfoResponse.data.id,
            name: pageInfoResponse.data.name,
            fanCount: pageInfoResponse.data.fan_count || 0,
            followersCount: pageInfoResponse.data.followers_count || 0,
            picture: pageInfoResponse.data.picture?.data?.url,
            cover: pageInfoResponse.data.cover?.source,
            link: pageInfoResponse.data.link,
            about: pageInfoResponse.data.about,
            category: pageInfoResponse.data.category
          },
          period: {
            days: parseInt(period),
            since: since.toISOString(),
            until: until.toISOString()
          },
          summary: {
            totalPosts: posts.length,
            totalLikes,
            totalComments,
            totalShares,
            totalReactions,
            totalEngagement: totalLikes + totalComments + totalShares,
            engagementRate: parseFloat(engagementRate),
            averageEngagementPerPost: posts.length > 0 
              ? Math.round((totalLikes + totalComments + totalShares) / posts.length)
              : 0
          },
          posts: posts.sort((a, b) => 
            b.engagement.total - a.engagement.total
          )
        }
      });

    } catch (fbError) {
      console.error('❌ Facebook API Error:', fbError.response?.data || fbError.message);
      
      // Return a user-friendly error
      const errorMessage = fbError.response?.data?.error?.message || fbError.message;
      const errorCode = fbError.response?.data?.error?.code;

      return res.status(400).json({
        success: false,
        error: 'خطأ في جلب البيانات من Facebook',
        details: errorMessage,
        code: errorCode,
        hint: errorCode === 190 
          ? 'انتهت صلاحية الاتصال بصفحة Facebook. يرجى إعادة الربط.'
          : 'تأكد من أن لديك صلاحية pages_read_engagement'
      });
    }

  } catch (error) {
    console.error('❌ Error in getPageEngagementStats:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في الخادم',
      message: error.message
    });
  }
};

/**
 * Get All Pages Engagement Overview
 * جلب ملخص إحصائيات التفاعلات لكل الصفحات
 */
const getAllPagesEngagementOverview = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.companyId) {
      return res.status(401).json({
        success: false,
        error: 'مستخدم غير صالح'
      });
    }

    const companyId = user.companyId;

    // Get all connected Facebook pages
    const connectedPages = await getSharedPrismaClient().facebookPage.findMany({
      where: {
        companyId: companyId,
        status: 'connected'
      }
    });

    if (connectedPages.length === 0) {
      return res.json({
        success: true,
        data: {
          pages: [],
          totalPages: 0
        }
      });
    }

    const pagesOverview = [];

    for (const page of connectedPages) {
      try {
        // Get basic page info and fan count
        const pageInfoResponse = await axios.get(
          `https://graph.facebook.com/v18.0/${page.pageId}`,
          {
            params: {
              access_token: page.pageAccessToken,
              fields: 'id,name,fan_count,followers_count,picture'
            }
          }
        );

        // Get recent posts (last 7 days)
        const since = new Date();
        since.setDate(since.getDate() - 7);

        const postsResponse = await axios.get(
          `https://graph.facebook.com/v18.0/${page.pageId}/posts`,
          {
            params: {
              access_token: page.pageAccessToken,
              fields: 'likes.summary(true),comments.summary(true),shares',
              limit: 100,
              since: Math.floor(since.getTime() / 1000)
            }
          }
        );

        // Calculate engagement
        let totalLikes = 0;
        let totalComments = 0;
        let totalShares = 0;

        if (postsResponse.data?.data) {
          postsResponse.data.data.forEach(post => {
            totalLikes += post.likes?.summary?.total_count || 0;
            totalComments += post.comments?.summary?.total_count || 0;
            totalShares += post.shares?.count || 0;
          });
        }

        pagesOverview.push({
          pageId: page.pageId,
          pageName: pageInfoResponse.data.name,
          picture: pageInfoResponse.data.picture?.data?.url,
          fanCount: pageInfoResponse.data.fan_count || 0,
          followersCount: pageInfoResponse.data.followers_count || 0,
          engagement: {
            totalPosts: postsResponse.data?.data?.length || 0,
            totalLikes,
            totalComments,
            totalShares,
            totalEngagement: totalLikes + totalComments + totalShares
          },
          connectedAt: page.connectedAt,
          status: page.status
        });

      } catch (pageError) {
        console.error(`❌ Error fetching data for page ${page.pageId}:`, pageError.message);
        
        // Add page with error status
        pagesOverview.push({
          pageId: page.pageId,
          pageName: page.pageName,
          picture: null,
          fanCount: 0,
          followersCount: 0,
          engagement: {
            totalPosts: 0,
            totalLikes: 0,
            totalComments: 0,
            totalShares: 0,
            totalEngagement: 0
          },
          connectedAt: page.connectedAt,
          status: 'error',
          error: 'خطأ في جلب البيانات'
        });
      }
    }

    res.json({
      success: true,
      data: {
        pages: pagesOverview,
        totalPages: pagesOverview.length,
        summary: {
          totalFans: pagesOverview.reduce((sum, p) => sum + p.fanCount, 0),
          totalEngagement: pagesOverview.reduce((sum, p) => sum + p.engagement.totalEngagement, 0),
          totalPosts: pagesOverview.reduce((sum, p) => sum + p.engagement.totalPosts, 0)
        }
      }
    });

  } catch (error) {
    console.error('❌ Error in getAllPagesEngagementOverview:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في الخادم',
      message: error.message
    });
  }
};

module.exports = {
  getPageEngagementStats,
  getAllPagesEngagementOverview
};

