-- إضافة جداول نظام تعلم أنماط النجاح
-- Migration for Success Pattern Learning System

-- جدول أنماط النجاح
CREATE TABLE IF NOT EXISTS success_patterns (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    companyId VARCHAR(191) NOT NULL,
    patternType VARCHAR(191) NOT NULL,
    pattern LONGTEXT NOT NULL,
    description TEXT NOT NULL,
    successRate DOUBLE NOT NULL,
    sampleSize INT NOT NULL,
    confidenceLevel DOUBLE NOT NULL,
    isActive BOOLEAN NOT NULL DEFAULT true,
    isApproved BOOLEAN NOT NULL DEFAULT false,
    approvedBy VARCHAR(191),
    approvedAt DATETIME(3),
    metadata LONGTEXT,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE
);

-- جدول نتائج المحادثات
CREATE TABLE IF NOT EXISTS conversation_outcomes (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    conversationId VARCHAR(191) NOT NULL,
    customerId VARCHAR(191) NOT NULL,
    companyId VARCHAR(191) NOT NULL,
    outcome VARCHAR(191) NOT NULL,
    outcomeValue DOUBLE,
    responseQuality DOUBLE,
    customerSatisfaction DOUBLE,
    conversionTime INT,
    messageCount INT,
    aiResponseCount INT,
    humanHandoff BOOLEAN NOT NULL DEFAULT false,
    metadata LONGTEXT,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE
);

-- جدول فعالية الردود
CREATE TABLE IF NOT EXISTS response_effectiveness (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    companyId VARCHAR(191) NOT NULL,
    messageId VARCHAR(191),
    conversationId VARCHAR(191) NOT NULL,
    responseText LONGTEXT NOT NULL,
    responseType VARCHAR(191) NOT NULL,
    customerReaction VARCHAR(191),
    effectivenessScore DOUBLE NOT NULL,
    leadToPurchase BOOLEAN NOT NULL DEFAULT false,
    responseTime INT,
    wordCount INT,
    sentimentScore DOUBLE,
    keywords LONGTEXT,
    metadata LONGTEXT,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE
);

-- إنشاء الفهارس للأداء (MariaDB syntax)
CREATE INDEX success_patterns_companyId_idx ON success_patterns(companyId);
CREATE INDEX success_patterns_patternType_idx ON success_patterns(patternType);
CREATE INDEX success_patterns_isActive_idx ON success_patterns(isActive);
CREATE INDEX success_patterns_isApproved_idx ON success_patterns(isApproved);
CREATE INDEX success_patterns_successRate_idx ON success_patterns(successRate);

CREATE INDEX conversation_outcomes_conversationId_idx ON conversation_outcomes(conversationId);
CREATE INDEX conversation_outcomes_companyId_idx ON conversation_outcomes(companyId);
CREATE INDEX conversation_outcomes_outcome_idx ON conversation_outcomes(outcome);
CREATE INDEX conversation_outcomes_createdAt_idx ON conversation_outcomes(createdAt);

CREATE INDEX response_effectiveness_companyId_idx ON response_effectiveness(companyId);
CREATE INDEX response_effectiveness_conversationId_idx ON response_effectiveness(conversationId);
CREATE INDEX response_effectiveness_responseType_idx ON response_effectiveness(responseType);
CREATE INDEX response_effectiveness_effectivenessScore_idx ON response_effectiveness(effectivenessScore);
CREATE INDEX response_effectiveness_leadToPurchase_idx ON response_effectiveness(leadToPurchase);
CREATE INDEX response_effectiveness_createdAt_idx ON response_effectiveness(createdAt);
