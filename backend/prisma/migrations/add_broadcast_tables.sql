-- Add broadcast campaign table
CREATE TABLE IF NOT EXISTS "BroadcastCampaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "targetAudience" TEXT NOT NULL,
    "scheduledAt" DATETIME,
    "sentAt" DATETIME,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "includeImages" BOOLEAN NOT NULL DEFAULT false,
    "trackClicks" BOOLEAN NOT NULL DEFAULT true,
    "autoResend" BOOLEAN NOT NULL DEFAULT false,
    "images" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER DEFAULT 0,
    "deliveredCount" INTEGER DEFAULT 0,
    "openedCount" INTEGER DEFAULT 0,
    "clickedCount" INTEGER DEFAULT 0,
    "failedCount" INTEGER DEFAULT 0,
    "companyId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE,
    FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Add broadcast analytics table
CREATE TABLE IF NOT EXISTS "BroadcastAnalytics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "openedCount" INTEGER NOT NULL DEFAULT 0,
    "clickedCount" INTEGER NOT NULL DEFAULT 0,
    "repliedCount" INTEGER NOT NULL DEFAULT 0,
    "unsubscribedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "revenue" REAL DEFAULT 0,
    "conversions" INTEGER DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("campaignId") REFERENCES "BroadcastCampaign"("id") ON DELETE CASCADE
);

-- Add broadcast settings table
CREATE TABLE IF NOT EXISTS "BroadcastSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL UNIQUE,
    "defaultSendTime" TEXT NOT NULL DEFAULT '10:00',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Riyadh',
    "maxRecipientsPerCampaign" INTEGER NOT NULL DEFAULT 5000,
    "maxCampaignsPerDay" INTEGER NOT NULL DEFAULT 10,
    "enableDeliveryReports" BOOLEAN NOT NULL DEFAULT true,
    "enableOpenTracking" BOOLEAN NOT NULL DEFAULT true,
    "enableClickTracking" BOOLEAN NOT NULL DEFAULT true,
    "enableUnsubscribeTracking" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnCampaignSent" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnHighUnsubscribeRate" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnLowDeliveryRate" BOOLEAN NOT NULL DEFAULT true,
    "adminEmail" TEXT,
    "requireApprovalForHighVolume" BOOLEAN NOT NULL DEFAULT false,
    "highVolumeThreshold" INTEGER NOT NULL DEFAULT 1000,
    "enableContentFiltering" BOOLEAN NOT NULL DEFAULT false,
    "blockedWords" TEXT NOT NULL DEFAULT '[]',
    "messagesPerMinute" INTEGER NOT NULL DEFAULT 60,
    "messagesPerHour" INTEGER NOT NULL DEFAULT 1000,
    "messagesPerDay" INTEGER NOT NULL DEFAULT 10000,
    "defaultFooter" TEXT,
    "unsubscribeText" TEXT DEFAULT 'للإلغاء اكتب STOP',
    "companyName" TEXT,
    "companyAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE
);

-- Add broadcast recipients table for tracking individual sends
CREATE TABLE IF NOT EXISTS "BroadcastRecipient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerName" TEXT,
    "messengerUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" DATETIME,
    "deliveredAt" DATETIME,
    "openedAt" DATETIME,
    "clickedAt" DATETIME,
    "repliedAt" DATETIME,
    "failureReason" TEXT,
    "messageId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("campaignId") REFERENCES "BroadcastCampaign"("id") ON DELETE CASCADE,
    FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS "BroadcastCampaign_companyId_idx" ON "BroadcastCampaign"("companyId");
CREATE INDEX IF NOT EXISTS "BroadcastCampaign_status_idx" ON "BroadcastCampaign"("status");
CREATE INDEX IF NOT EXISTS "BroadcastCampaign_scheduledAt_idx" ON "BroadcastCampaign"("scheduledAt");
CREATE INDEX IF NOT EXISTS "BroadcastCampaign_createdAt_idx" ON "BroadcastCampaign"("createdAt");

CREATE INDEX IF NOT EXISTS "BroadcastAnalytics_campaignId_idx" ON "BroadcastAnalytics"("campaignId");
CREATE INDEX IF NOT EXISTS "BroadcastAnalytics_createdAt_idx" ON "BroadcastAnalytics"("createdAt");

CREATE INDEX IF NOT EXISTS "BroadcastRecipient_campaignId_idx" ON "BroadcastRecipient"("campaignId");
CREATE INDEX IF NOT EXISTS "BroadcastRecipient_status_idx" ON "BroadcastRecipient"("status");
CREATE INDEX IF NOT EXISTS "BroadcastRecipient_customerPhone_idx" ON "BroadcastRecipient"("customerPhone");

-- Add messengerUserId to Conversation table if not exists
ALTER TABLE "Conversation" ADD COLUMN "messengerUserId" TEXT;
CREATE INDEX IF NOT EXISTS "Conversation_messengerUserId_idx" ON "Conversation"("messengerUserId");
CREATE INDEX IF NOT EXISTS "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt");
CREATE INDEX IF NOT EXISTS "Conversation_companyId_customerPhone_idx" ON "Conversation"("companyId", "customerPhone");
