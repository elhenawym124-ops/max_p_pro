# Script to split common.prisma into 7 logical files

$sourceFile = ".\prisma\schema\common.prisma"
$content = Get-Content $sourceFile -Raw

# Define model groups
$messagingModels = @('Conversation', 'Message', 'WhatsAppSession', 'WhatsAppContact', 'WhatsAppMessage', 'WhatsAppQuickReply', 'WhatsAppStatus', 'WhatsAppSettings', 'WhatsAppEventLog', 'TelegramConfig', 'ConversationOutcome', 'ConversationMemory', 'SentMessageStat', 'MediaFile')

$tasksModels = @('Task', 'TaskActivity', 'TaskAttachment', 'TaskChecklistItem', 'TaskChecklist', 'TaskComment', 'TaskDependency', 'TaskNotification', 'TaskTemplate', 'TaskWatcher', 'DevTask', 'DevTaskActivity', 'DevTaskAttachment', 'DevTaskChecklistItem', 'DevTaskChecklist', 'DevTaskComment', 'DevTaskWatcher', 'DevProject', 'DevRelease', 'DevNotification', 'DevTeamMember', 'DevTimeLog', 'Project', 'TimeEntry', 'DevSystemSettings')

$settingsModels = @('CheckoutFormSettings', 'FooterSettings', 'HomepageTemplate', 'StorefrontSettings', 'StorePromotionSettings', 'SystemSettings', 'SystemPrompt', 'GlobalAiConfig', 'PageResponseSettings', 'PostResponseSettings', 'PostTracking', 'StorePage', 'Subscription', 'PlanConfiguration', 'PromptTemplate', 'PromptLibrary', 'FewShotSettings', 'FewShotExample')

$mediaModels = @('ImageGallery', 'TextGallery', 'ImageStudioSettings', 'ImageStudioUsage', 'ImageStudioHistory')

$returnsModels = @('ReturnReason', 'ReturnRequest', 'ReturnSettings', 'ReturnContactAttempt', 'ReturnActivityLog', 'CallAttemptLog')

$marketplaceModels = @('MarketplaceApp', 'CompanyApp', 'AppUsageLog', 'AppReview', 'AppPricingRule', 'AppBundle', 'CompanyWallet', 'Transaction')

$miscModels = @('Notification', 'Inventory', 'ExcludedModel', 'ResponseEffectiveness', 'Faq', 'RagPerformance', 'RagRateLimit', 'KnowledgeBase', 'RecentlyViewed', 'SkippedFacebookPage', 'WalletNumber', 'WalletTransaction', 'Appointment', 'EmployeeNotificationPreference', 'StoreVisit', 'DevMemberBadge')

function Extract-Models {
    param(
        [string]$Content,
        [string[]]$ModelNames
    )
    
    $result = ""
    foreach ($modelName in $ModelNames) {
        # Extract model definition with all its content
        $pattern = "(?ms)(///.*?`n)?model\s+$modelName\s+\{.*?\n\}"
        if ($Content -match $pattern) {
            $result += $matches[0] + "`n`n"
        }
    }
    return $result
}

# Create new files
Write-Host "Creating messaging.prisma..."
$messagingContent = Extract-Models -Content $content -ModelNames $messagingModels
Set-Content ".\prisma\schema\messaging.prisma" $messagingContent

Write-Host "Creating tasks.prisma..."
$tasksContent = Extract-Models -Content $content -ModelNames $tasksModels
Set-Content ".\prisma\schema\tasks.prisma" $tasksContent

Write-Host "Creating settings.prisma..."
$settingsContent = Extract-Models -Content $content -ModelNames $settingsModels
Set-Content ".\prisma\schema\settings.prisma" $settingsContent

Write-Host "Creating media.prisma..."
$mediaContent = Extract-Models -Content $content -ModelNames $mediaModels
Set-Content ".\prisma\schema\media.prisma" $mediaContent

Write-Host "Creating returns.prisma..."
$returnsContent = Extract-Models -Content $content -ModelNames $returnsModels
Set-Content ".\prisma\schema\returns.prisma" $returnsContent

Write-Host "Creating marketplace.prisma..."
$marketplaceContent = Extract-Models -Content $content -ModelNames $marketplaceModels
Set-Content ".\prisma\schema\marketplace.prisma" $marketplaceContent

Write-Host "Creating misc.prisma..."
$miscContent = Extract-Models -Content $content -ModelNames $miscModels
Set-Content ".\prisma\schema\misc.prisma" $miscContent

Write-Host "`n✅ All files created successfully!"
Write-Host "Next: Delete common.prisma and run 'npx prisma validate'"
