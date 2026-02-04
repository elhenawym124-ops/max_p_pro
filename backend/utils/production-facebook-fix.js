/**
 * Production Facebook Messaging Fix - VPS Deployment Ready
 * 
 * This fix addresses Facebook error 2018001 by implementing:
 * 1. Strict recipient validation before sending
 * 2. 24-hour window enforcement
 * 3. Conversation history verification
 * 4. Manual message blocking for invalid recipients
 * 
 * Domain: https://www.maxp-ai.pro
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const axios = require('axios');

// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

/**
 * PRODUCTION: Enhanced Facebook recipient validation with strict enforcement
 * This will PREVENT sending messages to invalid recipients
 */
async function validateFacebookRecipientStrict(recipientId, pageId, accessToken) {
  try {
    //console.log(`🔍 [PROD-VALIDATION] Validating recipient ${recipientId} for page ${pageId}`);

    // 1. Basic validation
    if (!recipientId || typeof recipientId !== 'string' || recipientId.trim() === '') {
      return {
        valid: false,
        canSend: false,
        error: 'INVALID_RECIPIENT_ID',
        message: 'معرف المستلم غير صحيح',
        solutions: ['تحقق من معرف المستلم وأعد المحاولة']
      };
    }

    // 2. Format validation  
    if (!/^\d+$/.test(recipientId) || recipientId.length < 10) {
      return {
        valid: false,
        canSend: false,
        error: 'INVALID_ID_FORMAT',
        message: 'تنسيق معرف المستلم غير صحيح',
        solutions: ['تأكد من أن معرف المستلم يحتوي على أرقام فقط وطوله مناسب']
      };
    }

    // 3. Check conversation and 24-hour window - STRICT MODE
    const conversation = await getSharedPrismaClient().conversation.findFirst({
      where: {
        customer: {
          facebookId: recipientId
        },
        channel: 'FACEBOOK'
      },
      include: {
        customer: true,
        messages: {
          where: {
            isFromCustomer: true
          },
          orderBy: { createdAt: 'desc' },
          take: 5 // Get last 5 customer messages for analysis
        }
      }
    });

    if (!conversation) {
      return {
        valid: false,
        canSend: false,
        error: 'NO_CONVERSATION_FOUND',
        message: 'لم يتم العثور على محادثة مع هذا العميل',
        solutions: [
          'تأكد من أن العميل أرسل رسالة للصفحة من قبل',
          'تحقق من معرف العميل',
          'قد يحتاج العميل لإرسال رسالة جديدة عبر Messenger'
        ]
      };
    }

    // 4. Check if customer has sent any messages
    if (!conversation.messages || conversation.messages.length === 0) {
      return {
        valid: false,
        canSend: false,
        error: 'NO_CUSTOMER_MESSAGES',
        message: 'العميل لم يرسل أي رسائل للصفحة',
        solutions: [
          'اطلب من العميل إرسال رسالة عبر Facebook Messenger أولاً',
          'لا يمكن بدء محادثة من جانب الصفحة حسب سياسات فيسبوك'
        ]
      };
    }

    // 5. Check 24-hour window - STRICT ENFORCEMENT
    const lastCustomerMessage = conversation.messages[0];
    const messageAge = Date.now() - new Date(lastCustomerMessage.createdAt).getTime();
    const hoursAgo = Math.floor(messageAge / (1000 * 60 * 60));
    const within24Hours = messageAge < 24 * 60 * 60 * 1000;

    //console.log(`📊 [PROD-VALIDATION] Last customer message: ${hoursAgo} hours ago`);
    //console.log(`📊 [PROD-VALIDATION] Within 24 hours: ${within24Hours}`);

    if (!within24Hours) {
      return {
        valid: false,
        canSend: false,
        error: 'OUTSIDE_24_HOUR_WINDOW',
        message: `تجاوز نافذة 24 ساعة (آخر رسالة منذ ${hoursAgo} ساعة)`,
        solutions: [
          'انتظر حتى يرسل العميل رسالة جديدة',
          'لا يمكن إرسال رسائل بعد 24 ساعة من آخر رسالة للعميل',
          'هذا قانون فيسبوك وليس خطأ في النظام'
        ],
        lastMessageTime: lastCustomerMessage.createdAt,
        hoursAgo: hoursAgo
      };
    }

    // 6. Additional validation: Check message frequency
    const recentMessages = conversation.messages.filter(msg => {
      const msgAge = Date.now() - new Date(msg.createdAt).getTime();
      return msgAge < 24 * 60 * 60 * 1000;
    });

    return {
      valid: true,
      canSend: true,
      conversation: conversation,
      lastMessageTime: lastCustomerMessage.createdAt,
      hoursAgo: hoursAgo,
      recentMessagesCount: recentMessages.length,
      message: `يمكن إرسال الرسالة - آخر رسالة منذ ${hoursAgo} ساعة`,
      recommendations: [
        'الرسالة ستُرسل بنجاح - العميل نشط خلال 24 ساعة',
        `العميل أرسل ${recentMessages.length} رسالة خلال آخر 24 ساعة`
      ]
    };

  } catch (error) {
    console.error('❌ [PROD-VALIDATION] Database validation error:', error.message);
    return {
      valid: false,
      canSend: false,
      error: 'VALIDATION_ERROR',
      message: 'خطأ في التحقق من صحة البيانات',
      solutions: ['تحقق من اتصال قاعدة البيانات وأعد المحاولة']
    };
  }
}

/**
 * PRODUCTION: Enhanced Facebook message sending with strict validation
 * Will REFUSE to send if validation fails
 */
async function sendProductionFacebookMessage(recipientId, messageContent, messageType = 'TEXT', pageId, accessToken) {
  try {
    //console.log(`🏭 [PROD-SEND] Starting production Facebook message send`);
    //console.log(`📱 Recipient: ${recipientId}, Page: ${pageId}, Type: ${messageType}`);
    //console.log(`🔐 Access Token Available: ${!!accessToken}`);
    //console.log(`📄 Access Token Length: ${accessToken?.length || 0}`);

    // STEP 1: Strict validation (this will prevent 2018001 errors)
    const validation = await validateFacebookRecipientStrict(recipientId, pageId, accessToken);

    if (!validation.valid || !validation.canSend) {
      console.error(`❌ [PROD-SEND] Validation failed - BLOCKING message send`);
      console.error(`📝 [PROD-SEND] Reason: ${validation.message}`);

      if (validation.solutions) {
        //console.log('🔧 [PROD-SEND] Solutions:');
        validation.solutions.forEach(solution => {
          //console.log(`   - ${solution}`);
        });
      }

      // Return validation error instead of attempting to send
      return {
        success: false,
        blocked: true,
        error: validation.error,
        message: validation.message,
        solutions: validation.solutions,
        canRetry: false,
        validationDetails: validation
      };
    }

    //console.log(`✅ [PROD-SEND] Validation passed - proceeding with send`);

    // STEP 2: Prepare message data with correct structure
    const messageData = {
      recipient: { id: recipientId },
      message: {},
      messaging_type: "RESPONSE" // Critical for Facebook policy
    };

    // STEP 3: Set message content
    if (messageType === 'TEXT') {
      // For text messages, use text property
      messageData.message.text = messageContent;
    } else if (messageType === 'IMAGE') {
      // For image messages, use attachment
      messageData.message.attachment = {
        type: "image",
        payload: {
          url: messageContent,
          is_reusable: true
        }
      };
    } else if (messageType === 'FILE') {
      // For file messages, use attachment
      messageData.message.attachment = {
        type: "file",
        payload: {
          url: messageContent,
          is_reusable: true
        }
      };
    } else if (messageType === 'VIDEO') {
      // For video messages
      messageData.message.attachment = {
        type: "video",
        payload: {
          url: messageContent,
          is_reusable: true
        }
      };
    } else if (messageType === 'AUDIO') {
      // For audio messages
      messageData.message.attachment = {
        type: "audio",
        payload: {
          url: messageContent,
          is_reusable: true
        }
      };
    } else {
      // Default to text for unknown types
      messageData.message.text = messageContent;
    }

    //console.log(`📤 [PROD-SEND] Prepared message data:`, JSON.stringify(messageData, null, 2));

    // STEP 4: Send message to Facebook API
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/me/messages`,
      messageData,
      {
        params: { access_token: accessToken },
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000 // 10 second timeout
      }
    );

    //console.log(`✅ [PROD-SEND] Message sent successfully`);
    //console.log(`📝 [PROD-SEND] Facebook response:`, response.data);

    // Return success with Facebook message ID
    return {
      success: true,
      messageId: response.data.message_id,
      recipientId: response.data.recipient_id,
      message: 'تم إرسال الرسالة بنجاح'
    };

  } catch (error) {
    console.error(`❌ [PROD-SEND] Error sending Facebook message:`, error.message);

    // Handle different types of errors
    if (error.response) {
      console.error(`❌ [PROD-SEND] Facebook API Error Response:`, JSON.stringify(error.response.data, null, 2));
      console.error(`❌ [PROD-SEND] Status: ${error.response.status}`);
      console.error(`❌ [PROD-SEND] Request URL: ${messageContent}`);
      console.error(`❌ [PROD-SEND] Message Type: ${messageType}`);
      console.error(`❌ [PROD-SEND] Recipient ID: ${recipientId}`);
      console.error(`❌ [PROD-SEND] Page ID: ${pageId}`);

      // Handle specific Facebook errors
      const fbError = error.response.data?.error;
      if (fbError) {
        return handleProductionFacebookError(fbError, recipientId, pageId);
      }

      return {
        success: false,
        error: 'FACEBOOK_API_ERROR',
        message: `خطأ في API فيسبوك: ${error.response.status}`,
        details: error.response.data,
        canRetry: error.response.status >= 500 // Retry for server errors
      };
    } else if (error.request) {
      console.error(`❌ [PROD-SEND] No response received from Facebook`);
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: 'خطأ في الشبكة - لم يتم استلام رد من فيسبوك',
        details: error.message,
        canRetry: true
      };
    } else {
      console.error(`❌ [PROD-SEND] Error setting up request:`, error.message);
      return {
        success: false,
        error: 'REQUEST_SETUP_ERROR',
        message: 'خطأ في إعداد الطلب',
        details: error.message,
        canRetry: false
      };
    }
  }
}

/**
 * PRODUCTION: Enhanced error handling for Facebook API errors
 */
function handleProductionFacebookError(fbError, recipientId, pageId) {
  //console.log(`🔧 [PROD-ERROR] Handling Facebook error:`, fbError);

  const errorCode = fbError?.code;
  const errorSubcode = fbError?.error_subcode;
  const errorMessage = fbError?.message || 'خطأ غير معروف';

  // Common Facebook error patterns
  if (errorCode === 190) {
    // Access token error
    return {
      success: false,
      error: 'INVALID_ACCESS_TOKEN',
      message: 'رمز الوصول غير صحيح أو منتهي الصلاحية',
      details: errorMessage,
      solutions: [
        'تحقق من صحة رمز الوصول لصفحة فيسبوك',
        'تأكد من أن الرمز يحتوي على الصلاحيات المطلوبة',
        'قم بتحديث رمز الوصول من لوحة التحكم'
      ],
      canRetry: false
    };
  } else if (errorCode === 100 && errorSubcode === 2018001) {
    // 24-hour policy violation (the main error we're fixing)
    return {
      success: false,
      error: 'POLICY_VIOLATION_24H',
      message: 'انتهاك سياسة فيسبوك - خارج نافذة 24 ساعة',
      details: errorMessage,
      solutions: [
        'انتظر حتى يرسل العميل رسالة جديدة',
        'لا يمكن إرسال رسائل بعد 24 ساعة من آخر رسالة للعميل',
        'هذا قانون فيسبوك وليس خطأ في النظام'
      ],
      canRetry: false
    };
  } else if (errorCode === 100) {
    // General parameter error
    return {
      success: false,
      error: 'INVALID_PARAMETERS',
      message: 'معلمات الطلب غير صحيحة',
      details: errorMessage,
      solutions: [
        'تحقق من صحة معرف المستلم',
        'تأكد من تنسيق الرسالة',
        'راجع سياسات فيسبوك حول إرسال الرسائل'
      ],
      canRetry: false
    };
  } else if (errorCode === 4) {
    // API limit reached
    return {
      success: false,
      error: 'API_LIMIT_REACHED',
      message: 'تم تجاوز حدود API فيسبوك',
      details: errorMessage,
      solutions: [
        'انتظر بعض الوقت ثم حاول مرة أخرى',
        'قلل من عدد الرسائل المرسلة في نفس الوقت',
        'راجع حدود استخدام API في لوحة تحكم فيسبوك'
      ],
      canRetry: true
    };
  } else {
    // Unknown error
    return {
      success: false,
      error: 'FACEBOOK_ERROR',
      message: `خطأ فيسبوك: ${errorMessage}`,
      details: fbError,
      solutions: [
        'تحقق من سجل الأخطاء لمزيد من التفاصيل',
        'تأكد من اتصال الإنترنت',
        'راجع سياسات فيسبوك حول إرسال الرسائل'
      ],
      canRetry: errorCode >= 200 // Retry for server errors
    };
  }
}

module.exports = {
  validateFacebookRecipientStrict,
  sendProductionFacebookMessage,
  handleProductionFacebookError
};
