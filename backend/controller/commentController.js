const { getSharedPrismaClient } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

// In-memory storage for post response settings (fallback when database is not available)
const postResponseSettingsMemory = new Map();
const pageResponseSettingsMemory = new Map();

// Get all Facebook comments with filtering and pagination
const getFacebookComments = async (req, res) => {
  try {
    // الحصول على companyId من المستخدم المصادق عليه
    const user = req.user;

    if (!user || !user.companyId) {
      return res.status(401).json({
        success: false,
        error: 'مستخدم غير صالح'
      });
    }

    const companyId = user.companyId;

    // Get query parameters for filtering and pagination
    const {
      page = 1,
      limit = 20,
      search = '',
      startDate,
      endDate,
      status = 'all'
    } = req.query;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    let whereClause = {
      companyId: companyId
    };

    // Add search filter
    if (search) {
      whereClause.OR = [
        { message: { contains: search } },
        { senderName: { contains: search } },
        { postId: { contains: search } }
      ];
    }

    // Add date filters
    if (startDate || endDate) {
      whereClause.createdTime = {};
      if (startDate) {
        whereClause.createdTime.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdTime.lte = new Date(endDate);
      }
    }

    // Add status filter
    if (status === 'responded') {
      whereClause.NOT = { respondedAt: null };
    } else if (status === 'pending') {
      whereClause.respondedAt = null;
    }

    // Get comments
    const comments = await getSharedPrismaClient().facebookComment.findMany({
      where: whereClause,
      skip: skip,
      take: take,
      orderBy: {
        createdTime: 'desc'
      },
      include: {
        company: {
          select: {
            name: true
          }
        }
      }
    });

    // Get total count for pagination
    const totalCount = await getSharedPrismaClient().facebookComment.count({
      where: whereClause
    });

    res.json({
      success: true,
      data: comments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / take),
        totalCount: totalCount,
        hasNext: skip + take < totalCount,
        hasPrevious: page > 1
      }
    });
  } catch (error) {
    console.error(' Error fetching Facebook comments:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get a specific Facebook comment by ID
const getFacebookCommentById = async (req, res) => {
  try {
    // الحصول على companyId من المستخدم المصادق عليه
    const user = req.user;

    if (!user || !user.companyId) {
      return res.status(401).json({
        success: false,
        error: 'مستخدم غير صالح'
      });
    }

    const companyId = user.companyId;
    const { id } = req.params;

    // Find comment with company isolation
    const comment = await getSharedPrismaClient().facebookComment.findFirst({
      where: {
        id: id,
        companyId: companyId
      },
      include: {
        company: {
          select: {
            name: true
          }
        }
      }
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    res.json({
      success: true,
      data: comment
    });
  } catch (error) {
    console.error(' Error fetching Facebook comment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update a Facebook comment (mainly for response)
const updateFacebookComment = async (req, res) => {
  try {
    // الحصول على companyId من المستخدم المصادق عليه
    const user = req.user;

    if (!user || !user.companyId) {
      return res.status(401).json({
        success: false,
        error: 'مستخدم غير صالح'
      });
    }

    const companyId = user.companyId;
    const { id } = req.params;
    const { response } = req.body;

    // Find comment with company isolation
    const existingComment = await getSharedPrismaClient().facebookComment.findFirst({
      where: {
        id: id,
        companyId: companyId
      },
      include: {
        company: true
      }
    });

    if (!existingComment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    // Update comment response
    const updatedComment = await getSharedPrismaClient().facebookComment.update({
      where: { id: id },
      data: {
        response: response,
        respondedAt: response ? new Date() : null
      }
    });

    // NEW: Send the response to Facebook Messenger
    if (response && response.trim() !== '') {
      try {
        // Import required functions
        const { sendFacebookCommentReply, getPageToken } = require('../utils/allFunctions');
        const { sendProductionFacebookMessage } = require('../utils/production-facebook-fix');

        // Get page access token
        let pageData = null;
        if (existingComment.pageId) {
          pageData = await getPageToken(existingComment.pageId);
        }

        // Send the response to Facebook comment
        let commentReplySuccess = true;
        if (pageData && pageData.pageAccessToken) {
          commentReplySuccess = await sendFacebookCommentReply(
            existingComment.commentId,
            response,
            pageData.pageAccessToken
          );

          if (!commentReplySuccess) {
            console.warn(`[MANUAL-REPLY] Failed to send manual response to Facebook for comment ${existingComment.commentId}`);
          } else {
            console.log(`[MANUAL-REPLY] Successfully sent manual response to Facebook for comment ${existingComment.commentId}`);
          }
        } else {
          console.warn(`[MANUAL-REPLY] No page access token found for comment ${existingComment.commentId}`);
          commentReplySuccess = false;
        }

        // NEW: Also send the response to Facebook Messenger
        let messengerSuccess = false;
        if (existingComment.senderId) {
          const messengerResult = await sendCommentReplyToMessenger(existingComment, response, pageData);
          messengerSuccess = messengerResult.messengerSuccess;
        }

        // Return response with detailed success information
        return res.json({
          success: true,
          message: 'Comment updated successfully',
          data: updatedComment,
          facebookCommentReplySuccess: commentReplySuccess,
          facebookMessengerSuccess: messengerSuccess
        });
      } catch (replyError) {
        console.error(`[MANUAL-REPLY] Error sending manual response:`, replyError);
        return res.json({
          success: true,
          message: 'Comment updated successfully, but error occurred while sending to Facebook',
          data: updatedComment,
          facebookSendSuccess: false,
          facebookError: replyError.message
        });
      }
    }

    res.json({
      success: true,
      message: 'Comment updated successfully',
      data: updatedComment,
      facebookSendSuccess: true
    });
  } catch (error) {
    console.error(' Error updating Facebook comment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// NEW: Dedicated endpoint for sending manual responses to Facebook
const sendManualResponseToFacebook = async (req, res) => {
  try {
    // الحصول على companyId من المستخدم المصادق عليه
    const user = req.user;

    if (!user || !user.companyId) {
      return res.status(401).json({
        success: false,
        error: 'مستخدم غير صالح'
      });
    }

    const companyId = user.companyId;
    const { id } = req.params;
    const { response } = req.body;

    // Validate response
    if (!response || !response.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Response text is required'
      });
    }

    // Find comment with company isolation
    const existingComment = await getSharedPrismaClient().facebookComment.findFirst({
      where: {
        id: id,
        companyId: companyId
      }
    });

    if (!existingComment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    // Import the Facebook comment reply function
    const { sendFacebookCommentReply, getPageToken } = require('../utils/allFunctions');
    const { sendProductionFacebookMessage } = require('../utils/production-facebook-fix');

    // Get page access token
    let pageData = null;
    if (existingComment.pageId) {
      pageData = await getPageToken(existingComment.pageId);
    }

    if (!pageData || !pageData.pageAccessToken) {
      return res.status(400).json({
        success: false,
        error: 'No Facebook page access token found'
      });
    }

    // Send the response to Facebook comment
    const commentReplySuccess = await sendFacebookCommentReply(
      existingComment.commentId,
      response,
      pageData.pageAccessToken
    );

    if (!commentReplySuccess) {
      return res.status(500).json({
        success: false,
        error: 'Failed to send response to Facebook comment'
      });
    }

    // NEW: Also send the response to Facebook Messenger
    let messengerSuccess = false;
    if (existingComment.senderId) {
      const messengerResult = await sendCommentReplyToMessenger(existingComment, response, pageData);
      messengerSuccess = messengerResult.messengerSuccess;
    }

    // Update comment response in database
    const updatedComment = await getSharedPrismaClient().facebookComment.update({
      where: { id: id },
      data: {
        response: response,
        respondedAt: new Date()
      }
    });

    console.log(`[MANUAL-REPLY] Successfully sent manual response to Facebook for comment ${existingComment.commentId}`);

    res.json({
      success: true,
      message: 'Response sent to Facebook successfully',
      data: updatedComment,
      facebookCommentReplySuccess: commentReplySuccess,
      facebookMessengerSuccess: messengerSuccess
    });
  } catch (error) {
    console.error(' Error sending manual response to Facebook:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Delete a Facebook comment
const deleteFacebookComment = async (req, res) => {
  try {
    // الحصول على companyId من المستخدم المصادق عليه
    const user = req.user;

    if (!user || !user.companyId) {
      return res.status(401).json({
        success: false,
        error: 'مستخدم غير صالح'
      });
    }

    const companyId = user.companyId;
    const { id } = req.params;

    // Find comment with company isolation
    const existingComment = await getSharedPrismaClient().facebookComment.findFirst({
      where: {
        id: id,
        companyId: companyId
      }
    });

    if (!existingComment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    // Try to delete comment from Facebook first
    let facebookDeleteSuccess = true;
    let facebookDeleteError = null;

    try {
      // Import the Facebook comment delete function
      const { deleteFacebookComment, getPageToken } = require('../utils/allFunctions');

      // Get page access token
      let pageData = null;
      if (existingComment.pageId) {
        pageData = await getPageToken(existingComment.pageId);
      }

      if (pageData && pageData.pageAccessToken) {
        // Delete the comment from Facebook
        facebookDeleteSuccess = await deleteFacebookComment(
          existingComment.commentId,
          pageData.pageAccessToken
        );

        if (!facebookDeleteSuccess) {
          facebookDeleteError = 'Failed to delete comment from Facebook';
          console.warn(`[COMMENT-DELETE] Failed to delete comment from Facebook: ${existingComment.commentId}`);
        } else {
          console.log(`[COMMENT-DELETE] Successfully deleted comment from Facebook: ${existingComment.commentId}`);
        }
      } else {
        facebookDeleteSuccess = false;
        facebookDeleteError = 'No Facebook page access token found';
        console.warn(`[COMMENT-DELETE] No page access token found for comment: ${existingComment.commentId}`);
      }
    } catch (facebookError) {
      facebookDeleteSuccess = false;
      facebookDeleteError = facebookError.message;
      console.error(`[COMMENT-DELETE] Error deleting comment from Facebook:`, facebookError);
    }

    // Delete comment from database
    await getSharedPrismaClient().facebookComment.delete({
      where: { id: id }
    });

    // Prepare response message
    let message = 'Comment deleted successfully';
    if (!facebookDeleteSuccess) {
      message += ` (but failed to delete from Facebook: ${facebookDeleteError})`;
    }

    res.json({
      success: true,
      message: message,
      facebookDeleteSuccess: facebookDeleteSuccess
    });
  } catch (error) {
    console.error(' Error deleting Facebook comment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Bulk delete Facebook comments
const bulkDeleteFacebookComments = async (req, res) => {
  try {
    // الحصول على companyId من المستخدم المصادق عليه
    const user = req.user;

    if (!user || !user.companyId) {
      return res.status(401).json({
        success: false,
        error: 'مستخدم غير صالح'
      });
    }

    const companyId = user.companyId;
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No comment IDs provided'
      });
    }

    // Get all comments to be deleted with company isolation
    const commentsToDelete = await getSharedPrismaClient().facebookComment.findMany({
      where: {
        id: { in: ids },
        companyId: companyId
      }
    });

    // Try to delete comments from Facebook
    const { deleteFacebookComment, getPageToken } = require('../utils/allFunctions');
    let facebookDeleteResults = [];

    for (const comment of commentsToDelete) {
      try {
        // Get page access token
        let pageData = null;
        if (comment.pageId) {
          pageData = await getPageToken(comment.pageId);
        }

        if (pageData && pageData.pageAccessToken) {
          // Delete the comment from Facebook
          const success = await deleteFacebookComment(
            comment.commentId,
            pageData.pageAccessToken
          );

          facebookDeleteResults.push({
            commentId: comment.id,
            facebookId: comment.commentId,
            success: success,
            error: success ? null : 'Failed to delete from Facebook'
          });

          if (success) {
            console.log(`[BULK-COMMENT-DELETE] Successfully deleted comment from Facebook: ${comment.commentId}`);
          } else {
            console.warn(`[BULK-COMMENT-DELETE] Failed to delete comment from Facebook: ${comment.commentId}`);
          }
        } else {
          facebookDeleteResults.push({
            commentId: comment.id,
            facebookId: comment.commentId,
            success: false,
            error: 'No Facebook page access token found'
          });
          console.warn(`[BULK-COMMENT-DELETE] No page access token found for comment: ${comment.commentId}`);
        }
      } catch (facebookError) {
        facebookDeleteResults.push({
          commentId: comment.id,
          facebookId: comment.commentId,
          success: false,
          error: facebookError.message
        });
        console.error(`[BULK-COMMENT-DELETE] Error deleting comment from Facebook: ${comment.commentId}`, facebookError);
      }
    }

    // Delete comments from database with company isolation
    const result = await getSharedPrismaClient().facebookComment.deleteMany({
      where: {
        id: { in: ids },
        companyId: companyId
      }
    });

    // Prepare response message
    const successfulFacebookDeletes = facebookDeleteResults.filter(r => r.success).length;
    const failedFacebookDeletes = facebookDeleteResults.filter(r => !r.success).length;

    let message = `${result.count} comments deleted successfully from database`;
    if (facebookDeleteResults.length > 0) {
      if (successfulFacebookDeletes > 0) {
        message += `, ${successfulFacebookDeletes} comments deleted from Facebook`;
      }
      if (failedFacebookDeletes > 0) {
        message += `, ${failedFacebookDeletes} comments failed to delete from Facebook`;
      }
    }

    res.json({
      success: true,
      message: message,
      facebookDeleteResults: facebookDeleteResults,
      deletedCount: result.count
    });
  } catch (error) {
    console.error(' Error bulk deleting Facebook comments:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get comment statistics
const getCommentStats = async (req, res) => {
  try {
    // الحصول على companyId من المستخدم المصادق عليه
    const user = req.user;

    if (!user || !user.companyId) {
      return res.status(401).json({
        success: false,
        error: 'مستخدم غير صالح'
      });
    }

    const companyId = user.companyId;

    // Get total comments
    const totalComments = await getSharedPrismaClient().facebookComment.count({
      where: { companyId: companyId }
    });

    // Get responded comments
    const respondedComments = await getSharedPrismaClient().facebookComment.count({
      where: {
        companyId: companyId,
        NOT: { respondedAt: null }
      }
    });

    // Get pending comments
    const pendingComments = await getSharedPrismaClient().facebookComment.count({
      where: {
        companyId: companyId,
        respondedAt: null
      }
    });

    // Get recent comments (last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const recentComments = await getSharedPrismaClient().facebookComment.count({
      where: {
        companyId: companyId,
        createdTime: {
          gte: oneWeekAgo
        }
      }
    });

    res.json({
      success: true,
      data: {
        total: totalComments,
        responded: respondedComments,
        pending: pendingComments,
        recent: recentComments,
        responseRate: totalComments > 0 ? Math.round((respondedComments / totalComments) * 100) : 0
      }
    });
  } catch (error) {
    console.error(' Error fetching comment statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// NEW: Get all Facebook posts (comments grouped by postId)
const getFacebookPosts = async (req, res) => {
  try {
    // الحصول على companyId من المستخدم المصادق عليه
    const user = req.user;

    if (!user || !user.companyId) {
      return res.status(401).json({
        success: false,
        error: 'مستخدم غير صالح'
      });
    }

    const companyId = user.companyId;

    // Get query parameters for filtering and pagination
    const {
      page = 1,
      limit = 20,
      search = '',
      startDate,
      endDate,
      status = 'all'
    } = req.query;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // First get distinct post IDs with comments
    const posts = await getSharedPrismaClient().facebookComment.groupBy({
      by: ['postId', 'pageId'],
      where: {
        companyId: companyId,
        postId: search ? { contains: search } : undefined,
        createdTime: {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(endDate) : undefined
        }
      },
      orderBy: {
        _max: {
          createdTime: 'desc'
        }
      },
      take: take,
      skip: skip
    });

    // Get total count for pagination
    const totalPosts = await getSharedPrismaClient().facebookComment.groupBy({
      by: ['postId'],
      where: {
        companyId: companyId,
        postId: search ? { contains: search } : undefined,
        createdTime: {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(endDate) : undefined
        }
      }
    });

    // Get detailed information for each post
    const postDetails = [];
    for (const post of posts) {
      const comments = await getSharedPrismaClient().facebookComment.findMany({
        where: {
          postId: post.postId,
          companyId: companyId
        },
        include: {
          company: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          createdTime: 'desc'
        }
      });

      // Calculate post statistics
      const totalComments = comments.length;
      const respondedComments = comments.filter(comment => comment.respondedAt !== null).length;
      const responseRate = totalComments > 0 ? Math.round((respondedComments / totalComments) * 100) : 0;

      // Get latest comment for preview
      const latestComment = comments.length > 0 ? comments[0] : null;

      postDetails.push({
        postId: post.postId,
        pageId: post.pageId,
        totalComments,
        respondedComments,
        pendingComments: totalComments - respondedComments,
        responseRate,
        latestComment: latestComment ? {
          id: latestComment.id,
          message: latestComment.message,
          senderName: latestComment.senderName,
          createdTime: latestComment.createdTime
        } : null,
        firstCommentTime: comments.length > 0 ? comments[comments.length - 1].createdTime : null,
        lastCommentTime: comments.length > 0 ? comments[0].createdTime : null
      });
    }

    res.json({
      success: true,
      data: postDetails,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalPosts.length / take),
        totalCount: totalPosts.length,
        hasNext: skip + take < totalPosts.length,
        hasPrevious: page > 1
      }
    });
  } catch (error) {
    console.error(' Error fetching Facebook posts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// NEW: Get comments for a specific post
const getCommentsByPostId = async (req, res) => {
  try {
    // الحصول على companyId من المستخدم المصادق عليه
    const user = req.user;

    if (!user || !user.companyId) {
      return res.status(401).json({
        success: false,
        error: 'مستخدم غير صالح'
      });
    }

    const companyId = user.companyId;
    const { postId } = req.params;

    // Get query parameters for filtering
    const { status = 'all' } = req.query;

    // Build where clause
    let whereClause = {
      postId: postId,
      companyId: companyId
    };

    // Add status filter
    if (status === 'responded') {
      whereClause.NOT = { respondedAt: null };
    } else if (status === 'pending') {
      whereClause.respondedAt = null;
    }

    // Get comments for this post
    const comments = await getSharedPrismaClient().facebookComment.findMany({
      where: whereClause,
      orderBy: {
        createdTime: 'desc'
      },
      include: {
        company: {
          select: {
            name: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: comments
    });
  } catch (error) {
    console.error(' Error fetching comments by post ID:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// NEW: Set response method for a post
const setPostResponseMethod = async (req, res) => {
  try {
    // الحصول على companyId من المستخدم المصادق عليه
    const user = req.user;

    if (!user || !user.companyId) {
      return res.status(401).json({
        success: false,
        error: 'مستخدم غير صالح'
      });
    }

    const companyId = user.companyId;
    const { postId } = req.params;
    const { responseMethod, commentMessages, fixedMessengerMessage, aiPrompt } = req.body; // responseMethod: 'ai', 'fixed', 'manual'

    // Validate response method
    if (!['ai', 'fixed', 'manual'].includes(responseMethod)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid response method. Must be ai, fixed, or manual'
      });
    }

    // If fixed method, ensure commentMessages is provided
    if (responseMethod === 'fixed') {
      if (!commentMessages || (Array.isArray(commentMessages) && commentMessages.length === 0) || (typeof commentMessages === 'string' && commentMessages.trim() === '')) {
        return res.status(400).json({
          success: false,
          error: 'At least one comment message is required when response method is fixed'
        });
      }
    }

    // Try to use database first, fallback to memory if not available
    let postSettings;
    const settingsKey = `${postId}-${companyId}`;

    try {
      if (getSharedPrismaClient().postResponseSettings) {
        // Create or update post response settings in database
        postSettings = await getSharedPrismaClient().postResponseSettings.upsert({
          where: {
            postId_companyId: {
              postId: postId,
              companyId: companyId
            }
          },
          update: {
            responseMethod: responseMethod,
            commentMessages: responseMethod === 'fixed' ? (Array.isArray(commentMessages) ? JSON.stringify(commentMessages) : commentMessages) : null,
            fixedMessengerMessage: responseMethod === 'fixed' ? fixedMessengerMessage : null,
            aiPrompt: responseMethod === 'ai' ? aiPrompt : null,
            updatedAt: new Date()
          },
          create: {
            postId: postId,
            companyId: companyId,
            responseMethod: responseMethod,
            commentMessages: responseMethod === 'fixed' ? (Array.isArray(commentMessages) ? JSON.stringify(commentMessages) : commentMessages) : null,
            fixedMessengerMessage: responseMethod === 'fixed' ? fixedMessengerMessage : null,
            aiPrompt: responseMethod === 'ai' ? aiPrompt : null,
            updatedAt: new Date()
          }
        });
      } else {
        throw new Error('Post response settings model not available');
      }
    } catch (dbError) {
      // Fallback to in-memory storage
      console.warn(' Using in-memory storage for post response settings:', dbError.message);

      postSettings = {
        id: settingsKey,
        postId: postId,
        companyId: companyId,
        responseMethod: responseMethod,
        commentMessages: responseMethod === 'fixed' ? (Array.isArray(commentMessages) ? JSON.stringify(commentMessages) : commentMessages) : null,
        fixedMessengerMessage: responseMethod === 'fixed' ? fixedMessengerMessage : null,
        aiPrompt: responseMethod === 'ai' ? aiPrompt : null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store in memory
      postResponseSettingsMemory.set(settingsKey, postSettings);
    }

    res.json({
      success: true,
      message: 'Post response method set successfully',
      data: postSettings
    });
  } catch (error) {
    console.error('❌ Error setting post response method:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// NEW: Get response method for a post
const getPostResponseMethod = async (req, res) => {
  try {
    // 🔐 الحصول على companyId من المستخدم المصادق عليه
    const user = req.user;

    if (!user || !user.companyId) {
      return res.status(401).json({
        success: false,
        error: 'مستخدم غير صالح'
      });
    }

    const companyId = user.companyId;
    const { postId } = req.params;

    // Try to use database first, fallback to memory if not available
    let postSettings = null;
    const settingsKey = `${postId}-${companyId}`;

    try {
      if (getSharedPrismaClient().postResponseSettings) {
        // Get post response settings from database
        postSettings = await getSharedPrismaClient().postResponseSettings.findUnique({
          where: {
            postId_companyId: {
              postId: postId,
              companyId: companyId
            }
          }
        });
      } else {
        throw new Error('Post response settings model not available');
      }
    } catch (dbError) {
      // Fallback to in-memory storage
      console.warn('⚠️ Using in-memory storage for post response settings:', dbError.message);

      // Get from memory
      postSettings = postResponseSettingsMemory.get(settingsKey) || null;
    }

    res.json({
      success: true,
      data: postSettings
    });
  } catch (error) {
    console.error('❌ Error getting post response method:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// NEW: Apply response method to all pending comments of a post
const applyPostResponseMethod = async (req, res) => {
  try {
    // 🔐 الحصول على companyId من المستخدم المصادق عليه
    const user = req.user;

    if (!user || !user.companyId) {
      return res.status(401).json({
        success: false,
        error: 'مستخدم غير صالح'
      });
    }

    const companyId = user.companyId;
    const { postId } = req.params;

    // Try to use database first, fallback to memory if not available
    let postSettings = null;
    const settingsKey = `${postId}-${companyId}`;

    try {
      if (getSharedPrismaClient().postResponseSettings) {
        // Get post response settings from database
        postSettings = await getSharedPrismaClient().postResponseSettings.findUnique({
          where: {
            postId_companyId: {
              postId: postId,
              companyId: companyId
            }
          }
        });
      } else {
        throw new Error('Post response settings model not available');
      }
    } catch (dbError) {
      // Fallback to in-memory storage
      console.warn('⚠️ Using in-memory storage for post response settings:', dbError.message);

      // Get from memory
      postSettings = postResponseSettingsMemory.get(settingsKey) || null;
    }

    if (!postSettings) {
      return res.status(404).json({
        success: false,
        error: 'Post response settings not found'
      });
    }

    // Get all pending comments for this post
    const pendingComments = await getSharedPrismaClient().facebookComment.findMany({
      where: {
        postId: postId,
        companyId: companyId,
        respondedAt: null
      }
    });

    if (pendingComments.length === 0) {
      return res.json({
        success: true,
        message: 'No pending comments found for this post',
        data: { processedComments: 0 }
      });
    }

    let processedComments = 0;

    // Process each comment based on the response method
    for (const comment of pendingComments) {
      if (postSettings.responseMethod === 'ai') {
        // Process with AI
        await processCommentWithAI(comment, companyId);
        processedComments++;
      } else if (postSettings.responseMethod === 'fixed') {
        // Send fixed message
        if (postSettings.fixedMessage) {
          await sendFixedResponse(comment, postSettings.fixedMessage);
          processedComments++;
        }
      }
      // For 'manual' method, we don't do anything automatically
    }

    res.json({
      success: true,
      message: `Processed ${processedComments} comments`,
      data: { processedComments }
    });
  } catch (error) {
    console.error('❌ Error applying post response method:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Helper function to process comment with AI
async function processCommentWithAI(comment, companyId) {
  try {
    // Import AI agent service
    const aiAgentService = require('../services/aiAgentService');

    // Get AI settings for the company
    const aiSettings = await aiAgentService.getSettings(companyId);

    // Only process if AI is enabled
    if (aiSettings && aiSettings.isEnabled) {
      // Prepare message data for AI Agent
      const aiMessageData = {
        conversationId: null,
        senderId: comment.senderId,
        content: comment.message,
        attachments: [],
        timestamp: new Date(),
        companyId: companyId,
        customerData: {
          name: comment.senderName || 'Facebook User',
          companyId: companyId
        }
      };

      // Process comment with AI Agent
      const aiResponse = await aiAgentService.processCustomerMessage(aiMessageData);

      // Check if we got a valid AI response
      if (aiResponse && aiResponse.content && !aiResponse.silent) {
        const responseText = aiResponse.content;

        // Update comment with AI response
        await getSharedPrismaClient().facebookComment.update({
          where: { id: comment.id },
          data: {
            response: responseText,
            respondedAt: new Date()
          }
        });

        // Send the response to Facebook
        const { sendFacebookCommentReply, getPageToken } = require('../utils/allFunctions');
        let pageData = null;
        if (comment.pageId) {
          pageData = await getPageToken(comment.pageId);
        }

        if (pageData && pageData.pageAccessToken) {
          await sendFacebookCommentReply(comment.commentId, responseText, pageData.pageAccessToken);
        }

        // NEW: Also send the response to Facebook Messenger
        if (comment.senderId && pageData && pageData.pageAccessToken) {
          await sendCommentReplyToMessenger(comment, responseText, pageData);
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error processing comment ${comment.id} with AI:`, error);
  }
}

// Helper function to send fixed response
async function sendFixedResponse(comment, fixedMessage) {
  try {
    // Update comment with fixed response
    await getSharedPrismaClient().facebookComment.update({
      where: { id: comment.id },
      data: {
        response: fixedMessage,
        respondedAt: new Date()
      }
    });

    // Send the response to Facebook comment
    const { sendFacebookCommentReply, getPageToken } = require('../utils/allFunctions');
    const { sendProductionFacebookMessage } = require('../utils/production-facebook-fix');
    let pageData = null;
    if (comment.pageId) {
      pageData = await getPageToken(comment.pageId);
    }

    let commentReplySuccess = true;
    if (pageData && pageData.pageAccessToken) {
      commentReplySuccess = await sendFacebookCommentReply(comment.commentId, fixedMessage, pageData.pageAccessToken);
    }

    // NEW: Also send the response to Facebook Messenger
    if (comment.senderId) {
      try {
        const companyId = comment.companyId;

        // Find customer by Facebook ID
        let customer = await getSharedPrismaClient().customer.findFirst({
          where: {
            facebookId: comment.senderId,
            companyId: companyId
          }
        });

        // If customer doesn't exist, create one
        if (!customer) {
          customer = await getSharedPrismaClient().customer.create({
            data: {
              facebookId: comment.senderId,
              firstName: comment.senderName || 'Facebook User',
              lastName: '',
              email: null,
              phone: null,
              companyId: companyId,
              metadata: JSON.stringify({
                source: 'facebook_comment',
                commentId: comment.commentId,
                postId: comment.postId
              })
            }
          });
        }

        // Find or create conversation
        let conversation = await getSharedPrismaClient().conversation.findFirst({
          where: {
            customerId: customer.id,
            status: { in: ['ACTIVE', 'RESOLVED'] }
          },
          orderBy: { updatedAt: 'desc' }
        });

        // If no conversation exists, create one
        if (!conversation) {
          // Get page data for metadata
          let pageName = null;
          if (pageData) {
            pageName = pageData.pageName;
          } else if (comment.pageId) {
            // Try to get page name from database
            const page = await getSharedPrismaClient().facebookPage.findUnique({
              where: { pageId: comment.pageId }
            });
            if (page) {
              pageName = page.pageName;
            }
          }

          const conversationMetadata = {
            platform: 'facebook',
            source: 'comment_reply',
            pageId: comment.pageId,
            pageName: pageName
          };

          conversation = await getSharedPrismaClient().conversation.create({
            data: {
              customerId: customer.id,
              companyId: companyId,
              channel: 'FACEBOOK',
              status: 'ACTIVE',
              lastMessageAt: new Date(),
              metadata: JSON.stringify(conversationMetadata)
            }
          });
        } else if (conversation.status === 'RESOLVED') {
          // Reactivate resolved conversation
          conversation = await getSharedPrismaClient().conversation.update({
            where: { id: conversation.id },
            data: {
              status: 'ACTIVE',
              lastMessageAt: new Date(),
              updatedAt: new Date()
            }
          });
        }

        // Save the response as a message from the admin (not from customer)
        const message = await getSharedPrismaClient().message.create({
          data: {
            conversationId: conversation.id,
            content: fixedMessage,
            type: 'TEXT',
            isFromCustomer: false,
            metadata: JSON.stringify({
              platform: 'facebook',
              source: 'comment_reply',
              isFixedResponse: true,
              senderId: 'system'
            })
          }
        });

        // Send the message to Facebook Messenger
        let messengerSuccess = true;
        if (customer.facebookId && pageData && pageData.pageAccessToken) {
          const messengerResponse = await sendProductionFacebookMessage(
            customer.facebookId,
            fixedMessage,
            'TEXT',
            comment.pageId,
            pageData.pageAccessToken
          );

          if (messengerResponse.success) {
            console.log(`✅ [FIXED-COMMENT-MESSENGER] Successfully sent fixed response to Messenger for user ${customer.facebookId}`);

            // Update message with Facebook message ID
            await getSharedPrismaClient().message.update({
              where: { id: message.id },
              data: {
                metadata: JSON.stringify({
                  ...JSON.parse(message.metadata),
                  facebookMessageId: messengerResponse.messageId,
                  facebookSentAt: new Date().toISOString()
                })
              }
            });
          } else {
            console.warn(`⚠️ [FIXED-COMMENT-MESSENGER] Failed to send fixed response to Messenger for user ${customer.facebookId}:`, messengerResponse.message);
            messengerSuccess = false;
          }
        } else {
          console.warn(`⚠️ [FIXED-COMMENT-MESSENGER] Cannot send to Messenger - missing data for user ${customer.facebookId}`);
          messengerSuccess = false;
        }
      } catch (messengerError) {
        console.error(`❌ [FIXED-COMMENT-MESSENGER] Error sending fixed response to Messenger:`, messengerError);
      }
    }
  } catch (error) {
    console.error(`❌ Error sending fixed response for comment ${comment.id}:`, error);
  }
}

// NEW: Function to send comment reply to Facebook Messenger
async function sendCommentReplyToMessenger(comment, responseText, pageData) {
  try {
    const companyId = comment.companyId;

    // Find customer by Facebook ID
    let customer = await getSharedPrismaClient().customer.findFirst({
      where: {
        facebookId: comment.senderId,
        companyId: companyId
      }
    });

    // If customer doesn't exist, create one
    if (!customer) {
      customer = await getSharedPrismaClient().customer.create({
        data: {
          facebookId: comment.senderId,
          firstName: comment.senderName || 'Facebook User',
          lastName: '',
          email: null,
          phone: null,
          companyId: companyId,
          metadata: JSON.stringify({
            source: 'facebook_comment',
            commentId: comment.commentId,
            postId: comment.postId
          })
        }
      });
    }

    // Find or create conversation
    let conversation = await getSharedPrismaClient().conversation.findFirst({
      where: {
        customerId: customer.id,
        status: { in: ['ACTIVE', 'RESOLVED'] }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // If no conversation exists, create one
    if (!conversation) {
      // Get page data for metadata
      let pageName = null;
      if (pageData) {
        pageName = pageData.pageName;
      } else if (comment.pageId) {
        // Try to get page name from database
        const page = await getSharedPrismaClient().facebookPage.findUnique({
          where: { pageId: comment.pageId }
        });
        if (page) {
          pageName = page.pageName;
        }
      }

      const conversationMetadata = {
        platform: 'facebook',
        source: 'comment_reply',
        pageId: comment.pageId,
        pageName: pageName
      };

      conversation = await getSharedPrismaClient().conversation.create({
        data: {
          customerId: customer.id,
          companyId: companyId,
          channel: 'FACEBOOK',
          status: 'ACTIVE',
          lastMessageAt: new Date(),
          metadata: JSON.stringify(conversationMetadata)
        }
      });
    } else if (conversation.status === 'RESOLVED') {
      // Reactivate resolved conversation
      conversation = await getSharedPrismaClient().conversation.update({
        where: { id: conversation.id },
        data: {
          status: 'ACTIVE',
          lastMessageAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    // Save the response as a message from the admin (not from customer)
    const message = await getSharedPrismaClient().message.create({
      data: {
        conversationId: conversation.id,
        content: responseText,
        type: 'TEXT',
        isFromCustomer: false,
        metadata: JSON.stringify({
          platform: 'facebook',
          source: 'comment_reply',
          isCommentReply: true,
          senderId: 'admin',
          commentId: comment.commentId,
          postId: comment.postId
        })
      }
    });

    // Send the message to Facebook Messenger
    let messengerSuccess = false;
    if (customer.facebookId && pageData && pageData.pageAccessToken) {
      const { sendProductionFacebookMessage } = require('../utils/production-facebook-fix');
      const messengerResponse = await sendProductionFacebookMessage(
        customer.facebookId,
        responseText,
        'TEXT',
        comment.pageId,
        pageData.pageAccessToken
      );

      if (messengerResponse.success) {
        console.log(`✅ [COMMENT-REPLY-MESSENGER] Successfully sent comment reply to Messenger for user ${customer.facebookId}`);

        // Update message with Facebook message ID
        await getSharedPrismaClient().message.update({
          where: { id: message.id },
          data: {
            metadata: JSON.stringify({
              ...JSON.parse(message.metadata),
              facebookMessageId: messengerResponse.messageId,
              facebookSentAt: new Date().toISOString()
            })
          }
        });

        messengerSuccess = true;
      } else {
        console.warn(`⚠️ [COMMENT-REPLY-MESSENGER] Failed to send comment reply to Messenger for user ${customer.facebookId}:`, messengerResponse.message);
      }
    } else {
      console.warn(`⚠️ [COMMENT-REPLY-MESSENGER] Cannot send to Messenger - missing data for user ${customer.facebookId}`);
    }

    return { success: true, messengerSuccess };
  } catch (error) {
    console.error(`❌ [COMMENT-REPLY-MESSENGER] Error sending comment reply to Messenger:`, error);
    return { success: false, error: error.message };
  }
}

// NEW: Set response method for a page
const setPageResponseMethod = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.companyId) {
      return res.status(401).json({ success: false, error: 'مستخدم غير صالح' });
    }

    const companyId = user.companyId;
    const { pageId } = req.params;
    const { responseMethod, commentMessages, fixedMessengerMessage, aiPrompt } = req.body;

    if (!['ai', 'fixed', 'manual'].includes(responseMethod)) {
      return res.status(400).json({ success: false, error: 'Invalid response method' });
    }

    if (responseMethod === 'fixed') {
      if (!commentMessages || (Array.isArray(commentMessages) && commentMessages.length === 0) || (typeof commentMessages === 'string' && commentMessages.trim() === '')) {
        return res.status(400).json({ success: false, error: 'At least one comment message is required' });
      }
    }

    let pageSettings;
    const settingsKey = `${pageId}-${companyId}`;

    try {
      if (getSharedPrismaClient().pageResponseSettings) {
        pageSettings = await getSharedPrismaClient().pageResponseSettings.upsert({
          where: { pageId_companyId: { pageId, companyId } },
          update: {
            responseMethod,
            commentMessages: responseMethod === 'fixed' ? (Array.isArray(commentMessages) ? JSON.stringify(commentMessages) : commentMessages) : null,
            fixedMessengerMessage: responseMethod === 'fixed' ? fixedMessengerMessage : null,
            aiPrompt: responseMethod === 'ai' ? aiPrompt : null,
            updatedAt: new Date()
          },
          create: {
            pageId,
            companyId,
            responseMethod,
            commentMessages: responseMethod === 'fixed' ? (Array.isArray(commentMessages) ? JSON.stringify(commentMessages) : commentMessages) : null,
            fixedMessengerMessage: responseMethod === 'fixed' ? fixedMessengerMessage : null,
            aiPrompt: responseMethod === 'ai' ? aiPrompt : null
          }
        });
      } else {
        throw new Error('Page response settings model not available');
      }
    } catch (dbError) {
      console.warn('⚠️ Using in-memory storage for page response settings:', dbError.message);
      pageSettings = {
        id: settingsKey,
        pageId,
        companyId,
        responseMethod,
        commentMessages: responseMethod === 'fixed' ? (Array.isArray(commentMessages) ? JSON.stringify(commentMessages) : commentMessages) : null,
        fixedMessengerMessage: responseMethod === 'fixed' ? fixedMessengerMessage : null,
        aiPrompt: responseMethod === 'ai' ? aiPrompt : null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      pageResponseSettingsMemory.set(settingsKey, pageSettings);
    }

    res.json({ success: true, message: 'Page response method set successfully', data: pageSettings });
  } catch (error) {
    console.error('❌ Error setting page response method:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// NEW: Get response method for a page
const getPageResponseMethod = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.companyId) {
      return res.status(401).json({ success: false, error: 'مستخدم غير صالح' });
    }

    const companyId = user.companyId;
    const { pageId } = req.params;
    let pageSettings = null;
    const settingsKey = `${pageId}-${companyId}`;

    try {
      if (getSharedPrismaClient().pageResponseSettings) {
        pageSettings = await getSharedPrismaClient().pageResponseSettings.findUnique({
          where: { pageId_companyId: { pageId, companyId } }
        });
      } else {
        throw new Error('Page response settings model not available');
      }
    } catch (dbError) {
      console.warn('⚠️ Using in-memory storage for page response settings:', dbError.message);
      pageSettings = pageResponseSettingsMemory.get(settingsKey) || null;
    }

    res.json({ success: true, data: pageSettings });
  } catch (error) {
    console.error('❌ Error getting page response method:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// NEW: Get all Facebook pages with their posts grouped
const getFacebookPages = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.companyId) {
      return res.status(401).json({ success: false, error: 'مستخدم غير صالح' });
    }

    const companyId = user.companyId;

    // Get all connected/active pages for this company
    const connectedPages = await getSharedPrismaClient().facebookPage.findMany({
      where: {
        companyId: companyId,
        status: { in: ['connected', 'active'] }
      }
    });

    const pageDetails = [];
    for (const pageInfo of connectedPages) {
      // Get posts for this page
      const posts = await getSharedPrismaClient().facebookComment.groupBy({
        by: ['postId'],
        where: { companyId, pageId: pageInfo.pageId }
      });

      // Get total comments
      const totalComments = await getSharedPrismaClient().facebookComment.count({
        where: { companyId, pageId: pageInfo.pageId }
      });

      // Get responded comments
      const respondedComments = await getSharedPrismaClient().facebookComment.count({
        where: { companyId, pageId: pageInfo.pageId, NOT: { respondedAt: null } }
      });

      pageDetails.push({
        pageId: pageInfo.pageId,
        pageName: pageInfo.pageName || 'Unknown Page',
        totalPosts: posts.length,
        totalComments,
        respondedComments,
        pendingComments: totalComments - respondedComments,
        responseRate: totalComments > 0 ? Math.round((respondedComments / totalComments) * 100) : 0
      });
    }

    res.json({ success: true, data: pageDetails });
  } catch (error) {
    console.error('❌ Error fetching Facebook pages:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// NEW: Get posts for a specific page
const getPostsByPageId = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.companyId) {
      return res.status(401).json({ success: false, error: 'مستخدم غير صالح' });
    }

    const companyId = user.companyId;
    const { pageId } = req.params;

    const posts = await getSharedPrismaClient().facebookComment.groupBy({
      by: ['postId'],
      where: { companyId, pageId },
      orderBy: { _max: { createdTime: 'desc' } }
    });

    const postDetails = [];
    for (const post of posts) {
      const comments = await getSharedPrismaClient().facebookComment.findMany({
        where: { postId: post.postId, companyId },
        orderBy: { createdTime: 'desc' }
      });

      const totalComments = comments.length;
      const respondedComments = comments.filter(c => c.respondedAt !== null).length;

      postDetails.push({
        postId: post.postId,
        pageId,
        totalComments,
        respondedComments,
        pendingComments: totalComments - respondedComments,
        responseRate: totalComments > 0 ? Math.round((respondedComments / totalComments) * 100) : 0,
        latestComment: comments[0] || null,
        firstCommentTime: comments.length > 0 ? comments[comments.length - 1].createdTime : null,
        lastCommentTime: comments.length > 0 ? comments[0].createdTime : null
      });
    }

    res.json({ success: true, data: postDetails });
  } catch (error) {
    console.error('❌ Error fetching posts by page ID:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getFacebookComments,
  getFacebookCommentById,
  updateFacebookComment,
  sendManualResponseToFacebook,
  deleteFacebookComment,
  bulkDeleteFacebookComments,
  getCommentStats,
  // NEW exports
  getFacebookPosts,
  getCommentsByPostId,
  setPostResponseMethod,
  getPostResponseMethod,
  applyPostResponseMethod,
  // Page-level exports
  setPageResponseMethod,
  getPageResponseMethod,
  getFacebookPages,
  getPostsByPageId
};
