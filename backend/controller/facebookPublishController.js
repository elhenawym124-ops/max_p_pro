const { getSharedPrismaClient } = require('../services/sharedDatabase');
const axios = require('axios');

const createPost = async (req, res) => {
    try {
        const user = req.user;
        if (!user || !user.companyId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        // Expanded payload destructuring
        const {
            pageIds,
            message,
            mediaUrls, // Array of URLs
            mediaType, // 'IMAGE' | 'VIDEO'
            linkUrl,
            postType, // 'FEED' | 'STORY' | 'REEL' (Reel treated as video for now)
            scheduledTime // Unix timestamp (seconds) or ISO string
        } = req.body;

        if (!pageIds || !Array.isArray(pageIds) || pageIds.length === 0) {
            return res.status(400).json({ success: false, error: 'Please select at least one page' });
        }

        const results = [];
        const prisma = getSharedPrismaClient();

        // Fetch all selected pages belonging to this company
        const pages = await prisma.facebookPage.findMany({
            where: {
                pageId: { in: pageIds },
                companyId: user.companyId
            }
        });

        // Common API version
        const API_VER = 'v18.0';

        for (const page of pages) {
            try {
                let response;
                const pageAccessToken = page.pageAccessToken;

                // Base payload
                let payload = { access_token: pageAccessToken };

                // Handle Scheduling
                if (scheduledTime) {
                    // Ensure it's a future timestamp (Facebook requires 10 mins to 6 months window usually, but we'll pass it)
                    // Convert to unix timestamp in seconds if it's ISO
                    const publishTime = new Date(scheduledTime).getTime() / 1000;
                    payload.published = false;
                    payload.scheduled_publish_time = Math.round(publishTime);
                }

                if (postType === 'STORY') {
                    // --- STORY PUBLISHING ---
                    // Stories don't support message/caption in the same way, and scheduling checks are stricter.
                    // Note: API for stories is /photo_stories or /video_stories

                    if (mediaType === 'VIDEO' && mediaUrls && mediaUrls.length > 0) {
                        const endpoint = `https://graph.facebook.com/${API_VER}/${page.pageId}/video_stories`;
                        payload.file_url = mediaUrls[0]; // Stories support one media
                        response = await axios.post(endpoint, payload);
                    } else if (mediaUrls && mediaUrls.length > 0) {
                        const endpoint = `https://graph.facebook.com/${API_VER}/${page.pageId}/photo_stories`;
                        payload.url = mediaUrls[0];
                        response = await axios.post(endpoint, payload);
                    } else {
                        throw new Error('Stories require a media file (Image or Video).');
                    }

                } else {
                    // --- FEED PUBLISHING ---

                    if (linkUrl) {
                        // 1. LINK POST
                        const endpoint = `https://graph.facebook.com/${API_VER}/${page.pageId}/feed`;
                        payload.link = linkUrl;
                        if (message) payload.message = message;
                        response = await axios.post(endpoint, payload);

                    } else if (mediaType === 'VIDEO' && mediaUrls && mediaUrls.length > 0) {
                        // 2. VIDEO POST
                        const endpoint = `https://graph.facebook.com/${API_VER}/${page.pageId}/videos`;
                        payload.file_url = mediaUrls[0]; // Facebook video API typically takes one video
                        if (message) payload.description = message; // Videos use 'description'
                        // Scheduling works for videos too
                        response = await axios.post(endpoint, payload);

                    } else if (mediaUrls && mediaUrls.length > 1) {
                        // 3. CAROUSEL / MULTI-IMAGE POST
                        // Step A: Upload photos as unpublished
                        const mediaIds = [];
                        for (const url of mediaUrls) {
                            const photoEndpoint = `https://graph.facebook.com/${API_VER}/${page.pageId}/photos`;
                            const photoPayload = {
                                access_token: pageAccessToken,
                                url: url,
                                published: false // Important!
                            };
                            const photoRes = await axios.post(photoEndpoint, photoPayload);
                            if (photoRes.data.id) mediaIds.push(photoRes.data.id);
                        }

                        // Step B: Publish to feed with attached_media
                        const feedEndpoint = `https://graph.facebook.com/${API_VER}/${page.pageId}/feed`;
                        payload.message = message || '';
                        payload.attached_media = mediaIds.map(id => ({ media_fbid: id }));
                        response = await axios.post(feedEndpoint, payload);

                    } else if (mediaUrls && mediaUrls.length === 1) {
                        // 4. SINGLE IMAGE POST
                        const endpoint = `https://graph.facebook.com/${API_VER}/${page.pageId}/photos`;
                        payload.url = mediaUrls[0];
                        if (message) payload.caption = message; // Photos use 'caption'
                        // Note: scheduled_publish_time works on /photos too if published=false
                        response = await axios.post(endpoint, payload);

                    } else {
                        // 5. TEXT ONLY POST
                        const endpoint = `https://graph.facebook.com/${API_VER}/${page.pageId}/feed`;
                        if (message) payload.message = message;
                        response = await axios.post(endpoint, payload);
                    }
                }

                results.push({
                    pageId: page.pageId,
                    pageName: page.pageName,
                    success: true,
                    postId: response.data.id || response.data.post_id
                });

            } catch (error) {
                console.error(`❌ [FACEBOOK-PUBLISH] Error posting to ${page.pageName}:`, error.response?.data || error.message);
                results.push({
                    pageId: page.pageId,
                    pageName: page.pageName,
                    success: false,
                    error: error.response?.data?.error?.message || error.message
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const totalCount = results.length;

        res.json({
            success: true,
            message: `Processed ${successCount}/${totalCount} pages`,
            results: results
        });

    } catch (error) {
        console.error('❌ [FACEBOOK-PUBLISH] General error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = { createPost };
