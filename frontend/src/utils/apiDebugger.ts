// مساعد لتتبع وتشخيص مشاكل API
export const debugApiCall = async (url: string, options: RequestInit, context: string) => {
  console.log(`🔍 [${context}] API Call Debug:`);
  console.log(`📍 URL: ${url}`);
  console.log(`🔧 Method: ${options.method}`);
  console.log(`📦 Headers:`, options.headers);
  
  if (options.body) {
    console.log(`📄 Request Body:`, options.body);
    try {
      const parsedBody = JSON.parse(options.body as string);
      console.log(`📋 Parsed Body:`, parsedBody);
    } catch (e) {
      console.log(`⚠️ Could not parse body as JSON`);
    }
  }
  
  try {
    const response = await fetch(url, options);
    
    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    console.log(`📈 Response Headers:`, Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error Response Body:`, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log(`✅ Success Response:`, data);
    
    return { response, data };
  } catch (error) {
    console.error(`💥 API Call Failed:`, error);
    throw error;
  }
};

// مساعد لتنسيق بيانات الرسالة
export const formatMessageData = (content: string, conversationId: string) => {
  const messageContent = content.trim();
  
  // تجربة تنسيقات مختلفة للبيانات
  return {
    // التنسيق الأساسي
    content: messageContent,
    message: messageContent, // احتياط
    text: messageContent,    // احتياط
    
    // معلومات المرسل
    senderId: 'current_user',
    senderName: 'أنت',
    sender: 'current_user',
    
    // نوع الرسالة
    type: 'text',
    messageType: 'text',
    
    // معلومات المحادثة
    conversationId: conversationId,
    chatId: conversationId,
    
    // معلومات إضافية
    isFromCustomer: false,
    timestamp: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
};
