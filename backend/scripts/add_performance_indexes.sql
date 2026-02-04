-- ====================================
-- Performance Optimization Indexes
-- ====================================
-- Run this SQL to significantly improve query performance

-- 1. Index for conversations query (most important)
CREATE INDEX IF NOT EXISTS idx_conversations_company_lastmessage 
ON Conversation(companyId, lastMessageAt DESC);

-- 2. Index for messages query
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON Message(conversationId, createdAt ASC);

-- 3. Index for unread messages count
CREATE INDEX IF NOT EXISTS idx_messages_unread 
ON Message(conversationId, isRead, isFromCustomer);

-- 4. Index for customer search
CREATE INDEX IF NOT EXISTS idx_customer_firstname 
ON Customer(firstName);

CREATE INDEX IF NOT EXISTS idx_customer_lastname 
ON Customer(lastName);

CREATE INDEX IF NOT EXISTS idx_customer_facebookid 
ON Customer(facebookId);

-- 5. Index for Facebook pages lookup
CREATE INDEX IF NOT EXISTS idx_facebookpage_pageid 
ON FacebookPage(pageId);

-- ====================================
-- Verify indexes
-- ====================================
-- Run this to check if indexes were created:
-- SHOW INDEX FROM Conversation;
-- SHOW INDEX FROM Message;
-- SHOW INDEX FROM Customer;
-- SHOW INDEX FROM FacebookPage;
