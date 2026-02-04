const express = require('express');
const router = express.Router();
const axios = require('axios');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

// Import authentication middleware
const { requireAuth } = require('../middleware/auth');

// Import environment configuration
const envConfig = require('../config/environment');

// Facebook OAuth Configuration
const FACEBOOK_APP_ID = "762328696481583";
const FACEBOOK_APP_SECRET = "9ef40d290082e1d2455ac38646f2b379";

// Dynamic Facebook Redirect URI based on environment
const getFacebookRedirectUri = () => {
  if (envConfig.environment === 'development') {
    return 'http://localhost:3000/api/v1/facebook-oauth/callback';
  } else {
    return 'https://maxp-ai.pro/api/v1/facebook-oauth/callback';
  }
};

const FACEBOOK_REDIRECT_URI = getFacebookRedirectUri();

// Facebook OAuth Scopes
// 🆕 Added ads_management and ads_read for Pixel access
const FACEBOOK_SCOPES = 'public_profile,email,pages_show_list,pages_manage_posts,pages_read_engagement,pages_manage_metadata,pages_messaging,instagram_basic,instagram_manage_comments,pages_read_user_content,pages_manage_engagement,business_management,ads_management,ads_read';

// 🎯 NEW: Function to subscribe page to app webhooks
const subscribePageToApp = async (pageId, pageAccessToken) => {
  try {
    console.log(`🔔 Subscribing page ${pageId} to app webhooks...`);

    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`,
      {},
      {
        params: {
          access_token: pageAccessToken,
          subscribed_fields: 'messages,messaging_postbacks,messaging_optins,messaging_referrals,message_deliveries,message_reads,message_echoes,feed'
        }
      }
    );

    console.log(`✅ Successfully subscribed page ${pageId} to webhooks:`, response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error(`❌ Failed to subscribe page ${pageId}:`, error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};

// 🎯 NEW: Function to check if page is subscribed
const checkPageSubscription = async (pageId, pageAccessToken) => {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`,
      {
        params: { access_token: pageAccessToken }
      }
    );

    console.log(`📋 Page ${pageId} subscriptions:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to check page ${pageId} subscriptions:`, error.response?.data || error.message);
    return null;
  }
};


/**
 * Step 1: Generate Facebook OAuth URL
 * GET /api/v1/facebook-oauth/authorize
 * ✅ REQUIRES AUTHENTICATION
 */
router.get('/authorize', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required',
        message: 'معرف الشركة مطلوب'
      });
    }

    // Verify user has access to this company
    if (req.user.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to company',
        message: 'غير مصرح لك بالوصول لهذه الشركة'
      });
    }

    const state = JSON.stringify({
      companyId,
      userId: req.user.id,
      timestamp: Date.now(),
      random: Math.random().toString(36).substring(7)
    });

    const encodedState = Buffer.from(state).toString('base64');

    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${FACEBOOK_APP_ID}&` +
      `redirect_uri=${encodeURIComponent(FACEBOOK_REDIRECT_URI)}&` +
      `scope=${FACEBOOK_SCOPES}&` +
      `response_type=code&` +
      `state=${encodedState}`;

    res.json({
      success: true,
      authUrl: authUrl,
      message: 'Facebook authorization URL generated successfully'
    });

  } catch (error) {
    console.error('❌ Error generating auth URL:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to generate Facebook authorization URL'
    });
  }
});

/**
 * Step 2: Handle Facebook OAuth Callback
 * GET /api/v1/facebook-oauth/callback
 * ⚠️ NO AUTHENTICATION - Facebook redirects here directly
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    console.log('📥 Received Facebook OAuth callback');

    const redirectBaseUrl = envConfig.environment === 'development'
      ? 'http://localhost:3000'
      : 'https://maxp-ai.pro';

    if (error) {
      console.error(`❌ Facebook OAuth error: ${error}`);
      return res.redirect(`${redirectBaseUrl}/settings/facebook?error=facebook_oauth_${error}`);
    }

    if (!code || !state) {
      console.error('❌ Missing code or state in callback');
      return res.redirect(`${redirectBaseUrl}/settings/facebook?error=missing_code_or_state`);
    }

    let stateData;
    try {
      const decodedState = Buffer.from(state, 'base64').toString('utf8');
      stateData = JSON.parse(decodedState);
    } catch (stateError) {
      console.error('❌ Invalid state parameter:', stateError);
      return res.redirect(`${redirectBaseUrl}/settings/facebook?error=invalid_state`);
    }

    const { companyId, userId, timestamp, type } = stateData;

    if (!companyId) {
      console.error('❌ No companyId in state');
      const redirectTarget = type === 'pixel' 
        ? `${redirectBaseUrl}/advertising/facebook-pixel`
        : `${redirectBaseUrl}/settings/facebook`;
      return res.redirect(`${redirectTarget}?error=no_company_id`);
    }

    const stateAge = Date.now() - timestamp;
    const maxStateAge = 10 * 60 * 1000; // 10 minutes
    if (stateAge > maxStateAge) {
      console.error('❌ State expired');
      const redirectTarget = type === 'pixel' 
        ? `${redirectBaseUrl}/advertising/facebook-pixel`
        : `${redirectBaseUrl}/settings/facebook`;
      return res.redirect(`${redirectTarget}?error=state_expired`);
    }

    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      console.error(`❌ Company not found: ${companyId}`);
      const redirectTarget = type === 'pixel' 
        ? `${redirectBaseUrl}/advertising/facebook-pixel`
        : `${redirectBaseUrl}/settings/facebook`;
      return res.redirect(`${redirectTarget}?error=company_not_found`);
    }

    // ✅ تبادل الكود مع Facebook Access Token
    const tokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: FACEBOOK_APP_ID,
        client_secret: FACEBOOK_APP_SECRET,
        redirect_uri: FACEBOOK_REDIRECT_URI,
        code: code
      }
    });

    const { access_token: userAccessToken, expires_in } = tokenResponse.data;
    console.log('✅ Got user access token');
    
    // 🔍 تسجيل معلومات Token (خاصة للـ Pixels)
    if (type === 'pixel') {
      console.log(`📊 [PIXELS] Token info: expires_in=${expires_in}, length=${userAccessToken?.length}`);
      // لا نحاول التحقق من Token هنا لأنه قد يحتاج وقت لتفعيله في Facebook
      console.log('⏳ [PIXELS] Token will be validated when first used');
    }

    // 💾 حفظ User Access Token في Company
    // إذا كان type === 'pixel'، احفظ في facebookPixelAccessToken
    // وإلا احفظ في facebookUserAccessToken (للصفحات)
    const updateData = type === 'pixel' 
      ? { facebookPixelAccessToken: userAccessToken }
      : { facebookUserAccessToken: userAccessToken };
    
    await getSharedPrismaClient().company.update({
      where: { id: companyId },
      data: updateData
    });
    
    if (type === 'pixel') {
      console.log('✅ [PIXELS] Saved pixel access token to company');
      
      // ✅ التحقق من أن Token تم حفظه بشكل صحيح
      const savedCompany = await getSharedPrismaClient().company.findUnique({
        where: { id: companyId },
        select: { facebookPixelAccessToken: true }
      });
      
      if (savedCompany?.facebookPixelAccessToken) {
        console.log('✅ [PIXELS] Token confirmed saved in database');
        console.log(`📊 [PIXELS] Token length: ${savedCompany.facebookPixelAccessToken.length}`);
        console.log(`📊 [PIXELS] Token starts with: ${savedCompany.facebookPixelAccessToken.substring(0, 10)}...`);
      } else {
        console.error('❌ [PIXELS] Token NOT found in database after save!');
      }
      
      // ✅ توجيه مباشرة لصفحة Pixels بعد نجاح الربط
      // لا نحتاج delay هنا لأن Token سيتم استخدامه لاحقاً من Frontend
      return res.redirect(`${redirectBaseUrl}/advertising/facebook-pixel?success=pixel_connected`);
    } else {
      console.log('✅ Saved user access token to company');
    }

    // ✅ الحصول على كل الصفحات المرتبطة بالحساب مع دعم paging (للصفحات فقط)
    let allPages = [];
    let currentLimit = 20; // ابدأ بـ limit أصغر
    let nextUrl = `https://graph.facebook.com/v18.0/me/accounts?access_token=${userAccessToken}&fields=id,name,access_token&limit=${currentLimit}`;
    let pageCount = 0;
    let retryCount = 0;
    const maxRetries = 2;
    
    while (nextUrl && retryCount <= maxRetries) {
      try {
        const pagesResponse = await axios.get(nextUrl, {
          timeout: 30000, // 30 seconds timeout
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (pagesResponse.data && Array.isArray(pagesResponse.data.data)) {
          allPages = allPages.concat(pagesResponse.data.data);
          pageCount += pagesResponse.data.data.length;
          console.log(`📄 Fetched ${pageCount} pages so far...`);
          retryCount = 0; // reset retry count on success
        }
        
        // تحقق من وجود paging.next
        nextUrl = pagesResponse.data.paging && pagesResponse.data.paging.next ? pagesResponse.data.paging.next : null;
        
      } catch (pagingError) {
        console.error('❌ Error fetching pages batch:', pagingError.response?.data || pagingError.message);
        
        // إذا Facebook طلب تقليل البيانات
        if (pagingError.response?.data?.error?.code === 1 && currentLimit > 10) {
          currentLimit = Math.max(10, Math.floor(currentLimit / 2));
          console.log(`⚠️ Reducing limit to ${currentLimit} and retrying...`);
          nextUrl = `https://graph.facebook.com/v18.0/me/accounts?access_token=${userAccessToken}&fields=id,name,access_token&limit=${currentLimit}`;
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000)); // wait 1 second
          continue;
        }
        
        // لو فيه صفحات اتجمعت، استخدمهم
        if (allPages.length > 0) {
          console.log(`⚠️ Using ${allPages.length} pages fetched before error`);
          break;
        }
        
        throw pagingError;
      }
    }
    console.log(`✅ Found ${allPages.length} pages (with paging)`);

    if (!allPages || !Array.isArray(allPages) || allPages.length === 0) {
      const redirectUrl = `${redirectBaseUrl}/settings/facebook?success=true&pages=0&message=no_pages_found`;
      return res.redirect(redirectUrl);
    }

    console.log(`⚡ Fast processing ${allPages.length} pages...`);

    // 🚀 جلب كل الصفحات الموجودة مرة واحدة (بدلاً من استعلام لكل صفحة)
    const pageIds = allPages.map(p => p.id);
    const existingPagesInDB = await getSharedPrismaClient().facebookPage.findMany({
      where: {
        pageId: { in: pageIds }
      },
      select: {
        pageId: true,
        companyId: true,
        pageAccessToken: true
      }
    });

    // إنشاء Map للوصول السريع
    const existingPagesMap = new Map(
      existingPagesInDB.map(p => [p.pageId, p])
    );

    console.log(`📊 Found ${existingPagesInDB.length} existing pages in database`);

    // ✅ حفظ الصفحات وربطها مع التحقق من عدم نقل الصفحات بين الشركات
    const savedPages = [];
    const subscriptionResults = [];
    const skippedPages = []; // 🆕 صفحات تم تخطيها لأنها مربوطة بشركات أخرى

    for (const page of allPages) {
      try {
        // 🔍 التحقق من وجود الصفحة في قاعدة البيانات (من الـ Map)
        const existingPageInDB = existingPagesMap.get(page.id);

        // 🚫 إذا كانت الصفحة مربوطة بشركة أخرى، لا تربطها
        if (existingPageInDB && existingPageInDB.companyId && existingPageInDB.companyId !== companyId) {
          console.log(`⚠️ Skipping page "${page.name}" (${page.id}) - already connected to another company (${existingPageInDB.companyId})`);
          
          skippedPages.push({
            pageId: page.id,
            pageName: page.name,
            reason: 'already_connected_to_another_company',
            connectedCompanyId: existingPageInDB.companyId,
            attemptedCompanyId: companyId
          });
          continue; // تخطي هذه الصفحة
        }

        let savedPage;
        
        // ✅ إذا كانت الصفحة مربوطة بنفس الشركة، حدّث فقط إذا تغير التوكن
        if (existingPageInDB && existingPageInDB.companyId === companyId) {
          // تحديث فقط إذا تغير التوكن (توفير database writes)
          if (existingPageInDB.pageAccessToken !== page.access_token) {
            savedPage = await getSharedPrismaClient().facebookPage.update({
              where: { pageId: page.id },
              data: {
                pageAccessToken: page.access_token,
                pageName: page.name,
                status: 'connected',
                connectedAt: new Date(),
                disconnectedAt: null
              }
            });
            console.log(`✅ Updated page: ${page.name} (token changed)`);
          } else {
            // التوكن لم يتغير - لا داعي للتحديث
            savedPage = { pageId: page.id, pageName: page.name };
            console.log(`⏭️ Skipped update: ${page.name} (token unchanged)`);
          }
        } 
        // ➕ إذا كانت الصفحة غير مربوطة أو مربوطة بدون companyId، اربطها
        else {
          savedPage = await getSharedPrismaClient().facebookPage.upsert({
            where: { pageId: page.id },
            update: {
              pageAccessToken: page.access_token,
              pageName: page.name,
              status: 'connected',
              connectedAt: new Date(),
              disconnectedAt: null,
              companyId: companyId
            },
            create: {
              pageId: page.id,
              pageName: page.name,
              pageAccessToken: page.access_token,
              status: 'connected',
              connectedAt: new Date(),
              company: {
                connect: { id: companyId }
              }
            }
          });
          console.log(`✅ Created page: ${page.name}`);
        }

        savedPages.push(savedPage);

        // 🎯 Subscribe page to webhooks (without blocking)
        subscribePageToApp(page.id, page.access_token)
          .then(result => {
            if (result.success) {
              console.log(`✅ ${page.name} subscribed to webhooks`);
            } else {
              console.error(`⚠️ ${page.name} subscription failed:`, result.error);
            }
          })
          .catch(err => console.error(`❌ Subscription error for ${page.name}:`, err.message));
        
        subscriptionResults.push({
          pageId: page.id,
          pageName: page.name,
          subscribed: true // Will be processed in background
        });

      } catch (pageError) {
        console.error(`❌ Error saving page ${page.name}:`, pageError.message);
        subscriptionResults.push({
          pageId: page.id,
          pageName: page.name,
          subscribed: false,
          error: pageError.message
        });
      }
    }

    // Log subscription summary
    const successfulSubscriptions = subscriptionResults.filter(r => r.subscribed).length;
    console.log(`📊 Subscription Summary: ${successfulSubscriptions}/${subscriptionResults.length} pages subscribed`);
    subscriptionResults.forEach(result => {
      if (result.subscribed) {
        console.log(`  ✅ ${result.pageName}: Subscribed`);
      } else {
        console.log(`  ❌ ${result.pageName}: Failed - ${result.error || 'Unknown error'}`);
      }
    });

    // 📊 Log skipped pages summary & save to database in batch
    if (skippedPages.length > 0) {
      console.log(`⚠️ Skipped Pages Summary: ${skippedPages.length} pages were not connected`);
      skippedPages.forEach(skipped => {
        console.log(`  ⚠️ ${skipped.pageName} (${skipped.pageId}): ${skipped.reason}`);
      });
      
      // 💾 حفظ جميع الصفحات المتخطاة دفعة واحدة (batch insert)
      try {
        await getSharedPrismaClient().skippedFacebookPage.createMany({
          data: skippedPages.map(sp => ({
            pageId: sp.pageId,
            pageName: sp.pageName,
            reason: sp.reason,
            attemptedCompanyId: sp.attemptedCompanyId,
            connectedToCompanyId: sp.connectedCompanyId,
            isResolved: false,
            updatedAt: new Date()
          })),
          skipDuplicates: true
        });
        console.log(`✅ Saved ${skippedPages.length} skipped pages to database`);
      } catch (skipError) {
        console.error(`❌ Error saving skipped pages:`, skipError.message);
      }
    }

    // تحويل معلومات الصفحات المتخطاة إلى Base64 لإرسالها في URL
    let skippedPagesEncoded = '';
    if (skippedPages.length > 0) {
      const skippedPagesData = skippedPages.map(sp => ({
        pageId: sp.pageId,
        pageName: sp.pageName,
        reason: sp.reason
      }));
      skippedPagesEncoded = Buffer.from(JSON.stringify(skippedPagesData)).toString('base64');
    }

    const redirectUrl = `${redirectBaseUrl}/settings/facebook?success=true&pages=${savedPages.length}&skipped=${skippedPages.length}&skippedData=${encodeURIComponent(skippedPagesEncoded)}&companyId=${companyId}`;
    console.log(`✅ Redirecting to: ${redirectUrl}`);
    res.redirect(redirectUrl);

  } catch (error) {
    // تحسين طباعة الخطأ
    if (error.response) {
      console.error('❌ Error in OAuth callback:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    } else if (error.request) {
      console.error('❌ Error in OAuth callback: No response received from Facebook.', error.message);
    } else {
      console.error('❌ Error in OAuth callback:', error.message);
    }

    let errorMessage = 'unknown_error';
    if (error.response) {
      // لو فيه رسالة خطأ واضحة من فيسبوك
      errorMessage = error.response.data?.error?.message || `Facebook API error: ${error.response.status} ${error.response.statusText}`;
    } else if (error.request) {
      errorMessage = 'network_error';
    } else {
      errorMessage = error.message;
    }

    const redirectBaseUrl = envConfig.environment === 'development'
      ? 'http://localhost:3000'
      : 'https://maxp-ai.pro';

    // إضافة تفاصيل أكثر للمستخدم لو فيه status code
    let userError = errorMessage;
    if (error.response && error.response.status) {
      userError = `Facebook API error (${error.response.status}): ${errorMessage}`;
    }

    const redirectUrl = `${redirectBaseUrl}/settings/facebook?error=${encodeURIComponent(userError)}`;
    res.redirect(redirectUrl);
  }
});




/**
 * 🎯 NEW: Test webhook subscription for a specific page
 * POST /api/v1/facebook-oauth/test-subscription
 * ✅ REQUIRES AUTHENTICATION
 */
router.post('/test-subscription', requireAuth, async (req, res) => {
  try {
    const { pageId } = req.body;
    const { companyId } = req.query;

    if (!companyId || !pageId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID and Page ID are required'
      });
    }

    // Verify user has access to this company
    if (req.user.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to company'
      });
    }

    // Get page from database
    const page = await getSharedPrismaClient().facebookPage.findFirst({
      where: {
        pageId: pageId,
        companyId: companyId
      }
    });

    if (!page) {
      return res.status(404).json({
        success: false,
        error: 'Page not found'
      });
    }

    // Check current subscription
    const currentSubscription = await checkPageSubscription(page.pageId, page.pageAccessToken);

    // Try to subscribe
    const subscriptionResult = await subscribePageToApp(page.pageId, page.pageAccessToken);

    // Check subscription again
    const newSubscription = await checkPageSubscription(page.pageId, page.pageAccessToken);

    res.json({
      success: subscriptionResult.success,
      pageId: page.pageId,
      pageName: page.pageName,
      currentSubscription,
      subscriptionResult: subscriptionResult.data || subscriptionResult.error,
      newSubscription,
      message: subscriptionResult.success
        ? 'Page subscribed to webhooks successfully'
        : 'Failed to subscribe page to webhooks'
    });

  } catch (error) {
    console.error('❌ Error testing subscription:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to test webhook subscription'
    });
  }
});


/**
 * Step 3: Get OAuth Status
 * GET /api/v1/facebook-oauth/status
 * ✅ REQUIRES AUTHENTICATION
 */
router.get('/status', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required',
        message: 'معرف الشركة مطلوب'
      });
    }

    // Verify user has access to this company
    if (req.user.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to company'
      });
    }

    const connectedPages = await getSharedPrismaClient().facebookPage.findMany({
      where: {
        companyId: companyId,
        status: 'connected'
      },
      select: {
        id: true,
        pageId: true,
        pageName: true,
        status: true,
        connectedAt: true,
        updatedAt: true,
      },
      orderBy: {
        connectedAt: 'desc'
      }
    });

    res.json({
      success: true,
      connected: connectedPages.length > 0,
      pagesCount: connectedPages.length,
      pages: connectedPages,
      message: connectedPages.length > 0
        ? 'Facebook pages connected successfully'
        : 'No Facebook pages connected'
    });

  } catch (error) {
    console.error('❌ Error getting status:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to get Facebook OAuth status'
    });
  }
});


/**
 * Step 4: Disconnect Facebook Pages
 * DELETE /api/v1/facebook-oauth/disconnect
 * ✅ REQUIRES AUTHENTICATION
 */
router.delete('/disconnect', requireAuth, async (req, res) => {
  try {
    const { pageIds } = req.body;
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    if (!pageIds || !Array.isArray(pageIds)) {
      return res.status(400).json({
        success: false,
        error: 'Page IDs array is required'
      });
    }

    // Verify user has access to this company
    if (req.user.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to company'
      });
    }

    const result = await getSharedPrismaClient().facebookPage.updateMany({
      where: {
        id: { in: pageIds },
        companyId: companyId
      },
      data: {
        status: 'disconnected',
        disconnectedAt: new Date()
      }
    });

    res.json({
      success: true,
      disconnectedCount: result.count,
      message: `تم قطع الاتصال مع ${result.count} صفحة بنجاح`
    });

  } catch (error) {
    console.error('❌ Error disconnecting pages:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to disconnect Facebook pages'
    });
  }
});

/**
 * Step 5: Get Skipped Pages
 * GET /api/v1/facebook-oauth/skipped-pages
 * ✅ REQUIRES AUTHENTICATION
 */
router.get('/skipped-pages', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    // Verify user has access to this company
    if (req.user.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to company'
      });
    }

    // جلب الصفحات المتخطاة الغير محلولة
    const skippedPages = await getSharedPrismaClient().skippedFacebookPage.findMany({
      where: {
        attemptedCompanyId: companyId,
        isResolved: false
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      skippedPages: skippedPages,
      count: skippedPages.length
    });

  } catch (error) {
    console.error('❌ Error getting skipped pages:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Step 6: Mark Skipped Pages as Resolved
 * POST /api/v1/facebook-oauth/resolve-skipped
 * ✅ REQUIRES AUTHENTICATION
 */
router.post('/resolve-skipped', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.query;
    const { pageIds } = req.body; // Array of skipped page IDs to resolve

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    // Verify user has access to this company
    if (req.user.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to company'
      });
    }

    let resolvedCount = 0;

    if (pageIds && Array.isArray(pageIds) && pageIds.length > 0) {
      // Mark specific pages as resolved
      const result = await getSharedPrismaClient().skippedFacebookPage.updateMany({
        where: {
          id: { in: pageIds },
          attemptedCompanyId: companyId
        },
        data: {
          isResolved: true,
          resolvedAt: new Date()
        }
      });
      resolvedCount = result.count;
    } else {
      // Mark all skipped pages for this company as resolved
      const result = await getSharedPrismaClient().skippedFacebookPage.updateMany({
        where: {
          attemptedCompanyId: companyId,
          isResolved: false
        },
        data: {
          isResolved: true,
          resolvedAt: new Date()
        }
      });
      resolvedCount = result.count;
    }

    res.json({
      success: true,
      resolvedCount: resolvedCount,
      message: `تم وضع علامة على ${resolvedCount} صفحة كمحلولة`
    });

  } catch (error) {
    console.error('❌ Error resolving skipped pages:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Step 7: Debug - check pages for a company
 * GET /api/v1/facebook-oauth/debug
 */
router.get('/debug', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const allPages = await getSharedPrismaClient().facebookPage.findMany({
      where: {
        company: {
          id: companyId
        }
      },
      include: {
        company: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const connectedPages = await getSharedPrismaClient().facebookPage.findMany({
      where: {
        company: {
          id: companyId
        },
        status: 'connected'
      },
      include: {
        company: true
      }
    });

    res.json({
      success: true,
      companyId,
      totalPages: allPages.length,
      connectedPages: connectedPages.length,
      disconnectedPages: allPages.filter(p => p.status === 'disconnected').length,
      allPages: allPages.map(page => ({
        id: page.id,
        pageId: page.pageId,
        pageName: page.pageName,
        status: page.status,
        companyId: page.company ? page.company.id : null,
        connectedAt: page.connectedAt,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt
      })),
      connectedPages: connectedPages.map(page => ({
        id: page.id,
        pageId: page.pageId,
        pageName: page.pageName,
        status: page.status,
        connectedAt: page.connectedAt
      }))
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Step 1: Generate Facebook OAuth URL for Pixels (منفصل عن Pages)
 * GET /api/v1/facebook-oauth/pixel-authorize
 * ✅ REQUIRES AUTHENTICATION
 */
router.get('/pixel-authorize', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required',
        message: 'معرف الشركة مطلوب'
      });
    }

    // Verify user has access to this company
    if (req.user.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to company',
        message: 'غير مصرح لك بالوصول لهذه الشركة'
      });
    }

    const state = JSON.stringify({
      companyId,
      userId: req.user.id,
      timestamp: Date.now(),
      random: Math.random().toString(36).substring(7),
      type: 'pixel' // 🔑 تمييز أن هذا للـ Pixels وليس Pages
    });

    const encodedState = Buffer.from(state).toString('base64');

    // استخدام نفس redirect URI مثل Pages (لتجنب إضافته في Facebook App Settings)
    // النوع سيتم تحديده من خلال state.type في callback
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${FACEBOOK_APP_ID}&` +
      `redirect_uri=${encodeURIComponent(FACEBOOK_REDIRECT_URI)}&` +
      `scope=${FACEBOOK_SCOPES}&` +
      `response_type=code&` +
      `state=${encodedState}`;

    res.json({
      success: true,
      authUrl: authUrl,
      message: 'Facebook authorization URL generated successfully for Pixels'
    });

  } catch (error) {
    console.error('❌ Error generating pixel auth URL:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل إنشاء رابط الترخيص'
    });
  }
});

/**
 * Step 2: Handle Facebook OAuth Callback for Pixels (منفصل عن Pages)
 * GET /api/v1/facebook-oauth/pixel-callback
 * ⚠️ NO AUTHENTICATION - Facebook redirects here directly
 */
router.get('/pixel-callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    console.log('📥 [PIXELS] Received Facebook OAuth callback for Pixels');

    const redirectBaseUrl = envConfig.environment === 'development'
      ? 'https://maxp-ai.pro'
      : 'https://maxp-ai.pro';

    if (error) {
      console.error(`❌ [PIXELS] Facebook OAuth error: ${error}`);
      return res.redirect(`${redirectBaseUrl}/advertising/facebook-pixel?error=facebook_oauth_${error}`);
    }

    if (!code || !state) {
      console.error('❌ [PIXELS] Missing code or state in callback');
      return res.redirect(`${redirectBaseUrl}/advertising/facebook-pixel?error=missing_code_or_state`);
    }

    let stateData;
    try {
      const decodedState = Buffer.from(state, 'base64').toString('utf8');
      stateData = JSON.parse(decodedState);
    } catch (stateError) {
      console.error('❌ [PIXELS] Invalid state parameter:', stateError);
      return res.redirect(`${redirectBaseUrl}/advertising/facebook-pixel?error=invalid_state`);
    }

    const { companyId, userId, timestamp, type } = stateData;

    // التحقق من أن هذا callback للـ Pixels وليس Pages
    if (type !== 'pixel') {
      console.error('❌ [PIXELS] Invalid callback type:', type);
      return res.redirect(`${redirectBaseUrl}/advertising/facebook-pixel?error=invalid_callback_type`);
    }

    if (!companyId) {
      console.error('❌ [PIXELS] No companyId in state');
      return res.redirect(`${redirectBaseUrl}/advertising/facebook-pixel?error=no_company_id`);
    }

    const stateAge = Date.now() - timestamp;
    const maxStateAge = 10 * 60 * 1000; // 10 minutes
    if (stateAge > maxStateAge) {
      console.error('❌ [PIXELS] State expired');
      return res.redirect(`${redirectBaseUrl}/advertising/facebook-pixel?error=state_expired`);
    }

    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      console.error(`❌ [PIXELS] Company not found: ${companyId}`);
      return res.redirect(`${redirectBaseUrl}/advertising/facebook-pixel?error=company_not_found`);
    }

    // ✅ تبادل الكود مع Facebook Access Token
    const pixelRedirectUri = envConfig.environment === 'development'
      ? 'https://maxp-ai.pro/api/v1/facebook-oauth/pixel-callback'
      : 'https://maxp-ai.pro/api/v1/facebook-oauth/pixel-callback';

    const tokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: FACEBOOK_APP_ID,
        client_secret: FACEBOOK_APP_SECRET,
        redirect_uri: pixelRedirectUri,
        code: code
      }
    });

    const { access_token: pixelAccessToken } = tokenResponse.data;
    console.log('✅ [PIXELS] Got user access token for Pixels');

    // 💾 حفظ Pixel Access Token في Company (منفصل عن facebookUserAccessToken)
    await getSharedPrismaClient().company.update({
      where: { id: companyId },
      data: { facebookPixelAccessToken: pixelAccessToken }
    });
    console.log('✅ [PIXELS] Saved pixel access token to company');

    // ✅ توجيه المستخدم إلى صفحة Pixels بعد نجاح الربط
    res.redirect(`${redirectBaseUrl}/advertising/facebook-pixel?success=pixel_connected`);

  } catch (error) {
    console.error('❌ [PIXELS] Error in pixel callback:', error);
    const redirectBaseUrl = envConfig.environment === 'development'
      ? 'https://maxp-ai.pro'
      : 'https://maxp-ai.pro';
    res.redirect(`${redirectBaseUrl}/advertising/facebook-pixel?error=callback_failed`);
  }
});

/**
 * 🆕 Helper function to handle token errors for Pixels
 */
const handlePixelTokenError = async (error, companyId) => {
  // Check if error is OAuthException with code 190 (token decryption error)
  if (error.response?.data?.error?.code === 190 || 
      error.response?.data?.error?.code === '190') {
    console.log('⚠️ [PIXELS] Token expired or invalid (code 190), clearing pixel token...');
    
    // حذف Pixel Token فقط (لا نمس facebookUserAccessToken)
    try {
      await getSharedPrismaClient().company.update({
        where: { id: companyId },
        data: { facebookPixelAccessToken: null }
      });
      console.log('✅ [PIXELS] Cleared invalid pixel token');
      return true; // Token was cleared
    } catch (dbError) {
      console.error('❌ [PIXELS] Error clearing pixel token:', dbError);
    }
  }
  return false; // Token was not cleared
};

/**
 * 🆕 Get Facebook Pixels for authenticated user
 * GET /api/v1/facebook-oauth/pixels
 * ✅ REQUIRES AUTHENTICATION
 */
router.get('/pixels', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required',
        message: 'معرف الشركة مطلوب'
      });
    }

    // Verify user has access to this company
    if (req.user.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to company',
        message: 'غير مصرح لك بالوصول لهذه الشركة'
      });
    }

    console.log('🎯 [PIXELS] Fetching pixels for company:', companyId);

    // Get company with Facebook Pixel Access Token (منفصل عن Pages Token)
    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: { facebookPixelAccessToken: true }
    });

    if (!company || !company.facebookPixelAccessToken) {
      return res.json({
        success: false,
        message: 'يرجى ربط حسابك مع Facebook أولاً للوصول إلى Pixels',
        needsAuth: true
      });
    }

    const pixelAccessToken = company.facebookPixelAccessToken;

    // 🔍 التحقق من permissions الـ Token قبل الاستخدام
    console.log('🔍 [PIXELS] Checking token permissions...');
    try {
      // محاولة استخدام Token الأساسي أولاً
      const userInfoResponse = await axios.get(
        'https://graph.facebook.com/v18.0/me',
        {
          params: {
            access_token: pixelAccessToken,
            fields: 'id,name,email'
          }
        }
      );
      console.log(`✅ [PIXELS] Token is valid for user: ${userInfoResponse.data.name || userInfoResponse.data.id}`);
      
      // التحقق من الصلاحيات
      const permissionsResponse = await axios.get(
        'https://graph.facebook.com/v18.0/me/permissions',
        {
          params: {
            access_token: pixelAccessToken
          }
        }
      );
      
      const grantedPermissions = permissionsResponse.data.data
        .filter(p => p.status === 'granted')
        .map(p => p.permission);
      
      console.log(`📊 [PIXELS] Granted permissions (${grantedPermissions.length}):`, grantedPermissions.join(', '));
      
      // التحقق من الصلاحيات المطلوبة للـ Pixels
      const requiredPermissions = {
        'business_management': 'للوصول إلى Businesses',
        'ads_read': 'لقراءة بيانات Pixels',
        'ads_management': 'لإدارة Pixels'
      };
      
      const missingPermissions = [];
      for (const [perm, description] of Object.entries(requiredPermissions)) {
        if (!grantedPermissions.includes(perm)) {
          missingPermissions.push(perm);
          console.warn(`⚠️ [PIXELS] Missing permission: ${perm} (${description})`);
        } else {
          console.log(`✅ [PIXELS] Permission granted: ${perm}`);
        }
      }
      
      if (missingPermissions.length > 0) {
        console.error(`❌ [PIXELS] Missing ${missingPermissions.length} required permission(s): ${missingPermissions.join(', ')}`);
        console.error(`❌ [PIXELS] Token may not work for fetching pixels. Please re-authorize with all required permissions.`);
        console.error(`📝 [PIXELS] Required scopes: ${Object.keys(requiredPermissions).join(', ')}`);
        
        // إذا كانت الصلاحيات المطلوبة مفقودة، احذف Token واطلب إعادة الربط
        console.warn('⚠️ [PIXELS] Clearing token due to missing permissions. User needs to re-authorize.');
        await getSharedPrismaClient().company.update({
          where: { id: companyId },
          data: { facebookPixelAccessToken: null }
        });
        
        return res.json({
          success: false,
          message: 'الصلاحيات المطلوبة غير متوفرة. يرجى إعادة الربط مع Facebook والتأكد من الموافقة على جميع الصلاحيات المطلوبة (ads_read و ads_management).',
          needsAuth: true,
          missingPermissions: missingPermissions
        });
      } else {
        console.log('✅ [PIXELS] All required permissions are granted');
      }
      
    } catch (permError) {
      const errorCode = permError.response?.data?.error?.code;
      const errorMessage = permError.response?.data?.error?.message || permError.message;
      
      console.error(`❌ [PIXELS] Error checking token permissions: ${errorMessage} (code: ${errorCode})`);
      
      // إذا كان code 190، Token غير صالح
      if (errorCode === 190 || errorCode === '190') {
        console.error('❌ [PIXELS] Token is invalid (code 190) - will clear and request re-auth');
        // سنحذف Token لاحقاً في retry logic
      }
    }

    // 1. Get user's businesses
    console.log('📊 [PIXELS] Fetching businesses...');
    let businessesResponse;
    
    // Retry logic: Token قد يحتاج وقت لتفعيله في Facebook (خاصة code 190)
    let retryCount = 0;
    const maxRetries = 3; // زيادة عدد المحاولات
    let lastError = null;
    let code190Retries = 0;
    const maxCode190Retries = 2; // محاولات خاصة لـ code 190
    
    while (retryCount <= maxRetries) {
      try {
        businessesResponse = await axios.get(
          'https://graph.facebook.com/v18.0/me/businesses',
          {
            params: {
              access_token: pixelAccessToken,
              fields: 'id,name'
            }
          }
        );
        // نجح! خروج من الحلقة
        console.log('✅ [PIXELS] Successfully fetched businesses');
        break;
      } catch (error) {
        lastError = error;
        const errorCode = error.response?.data?.error?.code;
        const errorMessage = error.response?.data?.error?.message || error.message;
        
        // إذا كان Token منتهي (code 190)، نحاول مرة أو مرتين قبل الحذف
        if (errorCode === 190 || errorCode === '190') {
          console.error(`❌ [PIXELS] Token error (code 190) - Attempt ${code190Retries + 1}/${maxCode190Retries + 1}`);
          console.error(`📊 [PIXELS] Error message: ${errorMessage}`);
          
          code190Retries++;
          
          // إذا تجاوزنا عدد المحاولات المسموح لـ code 190، احذف Token
          if (code190Retries > maxCode190Retries) {
            console.error('❌ [PIXELS] Token persistently invalid (code 190), clearing...');
            const tokenCleared = await handlePixelTokenError(error, companyId);
            if (tokenCleared) {
              return res.json({
                success: false,
                message: 'انتهت صلاحية الربط مع Facebook. يرجى إعادة الربط',
                needsAuth: true
              });
            }
            throw error;
          }
          
          // محاولة أخرى مع delay أطول لـ code 190
          retryCount++;
          const delay = code190Retries * 2000; // 2s, 4s
          console.log(`⏳ [PIXELS] Waiting ${delay}ms before retry (code 190 may need activation time)...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue; // حاول مرة أخرى
        }
        
        // إذا كان خطأ آخر ويمكن إعادة المحاولة
        if (retryCount < maxRetries) {
          retryCount++;
          const delay = retryCount * 1000; // 1s, 2s, 3s
          console.log(`⚠️ [PIXELS] Retry ${retryCount}/${maxRetries} after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // فشلت جميع المحاولات
          console.error('❌ [PIXELS] Error fetching businesses after retries:', error.response?.data || error.message);
          throw error;
        }
      }
    }

    const businesses = businessesResponse.data.data || [];
    console.log(`✅ [PIXELS] Found ${businesses.length} businesses`);

    // 🔍 إذا لم يتم العثور على Businesses، قد يكون المستخدم مسجل بحساب آخر
    if (businesses.length === 0) {
      console.warn('⚠️ [PIXELS] No businesses found - user may be logged in with wrong account');
      console.warn('⚠️ [PIXELS] Clearing token to allow re-authentication with correct account');
      
      // حذف Token القديم للسماح بإعادة الربط بحساب آخر
      await getSharedPrismaClient().company.update({
        where: { id: companyId },
        data: { facebookPixelAccessToken: null }
      });
      
      return res.json({
        success: false,
        message: 'لم يتم العثور على Businesses. قد تكون مسجل بحساب آخر. يرجى إعادة الربط بالحساب الصحيح.',
        needsAuth: true,
        noBusinesses: true
      });
    }

    // 2. Get pixels for each business
    const allPixels = [];
    let tokenExpired = false;
    let permissionDenied = false;

    for (const business of businesses) {
      try {
        console.log(`🔍 [PIXELS] Fetching pixels for business: ${business.name}`);
        
        const pixelsResponse = await axios.get(
          `https://graph.facebook.com/v18.0/${business.id}/adspixels`,
          {
            params: {
              access_token: pixelAccessToken,
              fields: 'id,name,code'
            }
          }
        );

        const pixels = pixelsResponse.data.data || [];
        console.log(`  ✅ Found ${pixels.length} pixels`);

        pixels.forEach(pixel => {
          allPixels.push({
            pixelId: pixel.id,
            pixelName: pixel.name,
            businessId: business.id,
            businessName: business.name
          });
        });
      } catch (error) {
        const errorCode = error.response?.data?.error?.code;
        const errorSubcode = error.response?.data?.error?.error_subcode;
        const errorMessage = error.response?.data?.error?.message || error.message;
        
        console.error(`❌ [PIXELS] Error fetching pixels for business ${business.id}:`, errorMessage);
        
        // إذا كان الخطأ متعلق بصلاحيات (code 100, subcode 33 = missing permissions)
        if (errorCode === 100 && errorSubcode === 33) {
          console.warn(`⚠️ [PIXELS] Permission denied for business ${business.id} - missing ads_read or ads_management permission`);
          permissionDenied = true;
          // لا نكسر الحلقة، نحاول باقي Businesses
          continue;
        }
        
        // معالجة Token المنتهي
        const tokenCleared = await handlePixelTokenError(error, companyId);
        if (tokenCleared) {
          tokenExpired = true;
          break; // خروج من الحلقة إذا Token منتهي
        }
        // Continue with other businesses if it's not a token error
      }
    }
    
    // إذا تم رفض الوصول لجميع Businesses بسبب الصلاحيات
    if (permissionDenied && allPixels.length === 0) {
      console.error('❌ [PIXELS] All businesses returned permission denied - missing ads_read/ads_management');
      console.warn('⚠️ [PIXELS] Clearing token due to missing permissions. User needs to re-authorize.');
      
      // حذف Token وطلب إعادة الربط
      await getSharedPrismaClient().company.update({
        where: { id: companyId },
        data: { facebookPixelAccessToken: null }
      });
      
      return res.json({
        success: false,
        message: 'الصلاحيات المطلوبة غير متوفرة. يرجى إعادة الربط مع Facebook والتأكد من الموافقة على جميع الصلاحيات المطلوبة (ads_read و ads_management).',
        needsAuth: true,
        missingPermissions: ['ads_read', 'ads_management']
      });
    }

    // إذا Token منتهي، أعد response يحتاج re-auth
    if (tokenExpired) {
      return res.json({
        success: false,
        message: 'انتهت صلاحية الربط مع Facebook. يرجى إعادة الربط',
        needsAuth: true
      });
    }

    console.log(`✅ [PIXELS] Total pixels found: ${allPixels.length}`);

    res.json({
      success: true,
      pixels: allPixels,
      count: allPixels.length,
      message: allPixels.length > 0 
        ? `تم العثور على ${allPixels.length} Pixel`
        : 'لم يتم العثور على Pixels'
    });

  } catch (error) {
    console.error('❌ [PIXELS] Error fetching pixels:', error.response?.data || error.message);
    
    // محاولة معالجة Token المنتهي
    const { companyId } = req.query;
    if (companyId) {
      const tokenCleared = await handlePixelTokenError(error, companyId);
      if (tokenCleared) {
        return res.json({
          success: false,
          message: 'انتهت صلاحية الربط مع Facebook. يرجى إعادة الربط',
          needsAuth: true
        });
      }
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل جلب Pixels من Facebook'
    });
  }
});

/**
 * 🆕 Generate Access Token for specific Pixel
 * POST /api/v1/facebook-oauth/generate-pixel-token
 * ✅ REQUIRES AUTHENTICATION
 */
router.post('/generate-pixel-token', requireAuth, async (req, res) => {
  try {
    const { companyId } = req.query;
    const { pixelId, businessId } = req.body;

    if (!companyId || !pixelId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID and Pixel ID are required',
        message: 'معرف الشركة و Pixel ID مطلوبان'
      });
    }

    // Verify user has access to this company
    if (req.user.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to company',
        message: 'غير مصرح لك بالوصول لهذه الشركة'
      });
    }

    console.log('🔑 [TOKEN] Generating access token for pixel:', pixelId);

    // Get Facebook page access token
    const pages = await getSharedPrismaClient().facebookPage.findMany({
      where: {
        companyId: companyId,
        status: 'connected'
      },
      select: {
        pageAccessToken: true
      },
      take: 1
    });

    if (!pages || pages.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على صفحات Facebook مربوطة'
      });
    }

    const userAccessToken = pages[0].pageAccessToken;

    // Try to get a long-lived token for the pixel
    // Note: This requires business_management permission
    try {
      // Method 1: Try to get System User Token (best for long-term)
      if (businessId) {
        const systemUsersResponse = await axios.get(
          `https://graph.facebook.com/v18.0/${businessId}/system_users`,
          {
            params: {
              access_token: userAccessToken
            }
          }
        );

        console.log('✅ [TOKEN] System users found:', systemUsersResponse.data);
      }

      // For now, return the user access token
      // In production, you should create a System User Token
      res.json({
        success: true,
        accessToken: userAccessToken,
        tokenType: 'user_token',
        message: 'تم توليد Access Token بنجاح',
        note: 'هذا User Access Token - يُنصح بإنشاء System User Token للإنتاج'
      });

    } catch (tokenError) {
      console.error('⚠️ [TOKEN] Could not generate system token:', tokenError.response?.data || tokenError.message);
      
      // Fallback: return user token
      res.json({
        success: true,
        accessToken: userAccessToken,
        tokenType: 'user_token',
        message: 'تم توليد Access Token بنجاح',
        warning: 'تم استخدام User Token - قد تحتاج لتجديده لاحقاً'
      });
    }

  } catch (error) {
    console.error('❌ [TOKEN] Error generating token:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل توليد Access Token'
    });
  }
});

module.exports = router;
