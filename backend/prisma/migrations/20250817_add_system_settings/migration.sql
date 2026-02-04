-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL,
    "systemName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "resourceUsage" JSONB,
    "lastStatusChange" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemSettings_systemName_key" ON "SystemSettings"("systemName");

-- Insert default system settings
INSERT INTO "SystemSettings" ("id", "systemName", "displayName", "description", "category", "isEnabled", "config") VALUES
('sys_auto_pattern', 'autoPatternDetection', 'Auto Pattern Detection', 'اكتشاف تلقائي للأنماط كل ساعتين', 'ai_learning', true, '{"interval": 7200000, "aiCalls": "high"}'),
('sys_continuous_learning', 'continuousLearning', 'Continuous Learning', 'تعلم مستمر كل 30 دقيقة', 'ai_learning', true, '{"interval": 1800000, "aiCalls": "medium"}'),
('sys_quality_monitor', 'qualityMonitor', 'Quality Monitor', 'تقييم جودة كل رد بـ AI', 'ai_learning', true, '{"evaluateEveryResponse": true, "aiCalls": "very_high"}'),
('sys_response_optimizer', 'responseOptimizer', 'Response Optimizer', 'تحسين الردود بـ AI', 'ai_learning', true, '{"optimizeEveryResponse": true, "aiCalls": "high"}'),
('sys_pattern_application', 'patternApplication', 'Pattern Application', 'تطبيق الأنماط على الردود', 'ai_learning', true, '{"applyToEveryResponse": true, "aiCalls": "medium"}'),
('sys_prompt_enhancement', 'promptEnhancement', 'Prompt Enhancement', 'تحسين الـ prompts', 'ai_learning', true, '{"enhancePrompts": true, "aiCalls": "medium"}'),
('sys_simple_monitor', 'simpleMonitor', 'Simple Monitor', 'مراقبة النظام كل 5 دقائق', 'monitoring', true, '{"interval": 300000, "aiCalls": "none"}'),
('sys_simple_alerts', 'simpleAlerts', 'Simple Alerts', 'تنبيهات النظام كل 5 دقائق', 'monitoring', true, '{"interval": 300000, "aiCalls": "none"}'),
('sys_report_generator', 'reportGenerator', 'Report Generator', 'تقارير دورية يومية', 'monitoring', true, '{"dailyReports": true, "aiCalls": "none"}'),
('sys_security_monitoring', 'securityMonitoring', 'Security Monitoring', 'مراقبة الأمان المستمرة', 'security', true, '{"continuous": true, "aiCalls": "none"}');
