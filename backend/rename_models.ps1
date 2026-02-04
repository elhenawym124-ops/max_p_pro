$path = "e:\max_p_new\max_p_new\backend\prisma\schema.prisma"
$content = Get-Content $path -Raw

$mappings = @{
    # Models
    'notifications'             = 'Notification';
    'order_notes'               = 'OrderNote';
    'projects'                  = 'Project';
    'task_activities'           = 'TaskActivity';
    'task_attachments'          = 'TaskAttachment';
    'task_checklist_items'      = 'TaskChecklistItem';
    'task_checklists'           = 'TaskChecklist';
    'task_comments'             = 'TaskComment';
    'task_notifications'        = 'TaskNotification';
    'task_templates'            = 'TaskTemplate';
    'task_watchers'             = 'TaskWatcher';
    'text_gallery'              = 'TextGallery';
    'time_entries'              = 'TimeEntry';
    'whatsapp_messages'         = 'WhatsAppMessage';
    'activities'                = 'Activity';
    'ai_interactions'           = 'AiInteraction';
    'blocked_customers_on_page' = 'BlockedCustomerOnPage';
    'conversation_outcomes'     = 'ConversationOutcome';
    'customer_notes'            = 'CustomerNote';
    'whatsapp_contacts'         = 'WhatsAppContact';
    'broadcast_recipients'      = 'BroadcastRecipient';
    'messages'                  = 'Message';
    'subscriptions'             = 'Subscription';
    'system_prompts'            = 'SystemPrompt';
    'system_settings'           = 'SystemSetting';
    'task_categories'           = 'TaskCategory'; 
    'dev_projects'              = 'DevProject';
    'dev_tasks'                 = 'DevTask';
    'dev_releases'              = 'DevRelease';
    'dev_task_checklists'       = 'DevTaskChecklist';
    'dev_task_checklist_items'  = 'DevTaskChecklistItem';
    'dev_task_comments'         = 'DevTaskComment';
    'dev_task_attachments'      = 'DevTaskAttachment';
    'dev_task_activities'       = 'DevTaskActivity';
    'dev_task_watchers'         = 'DevTaskWatcher';
    'dev_notifications'         = 'DevNotification';
    'dev_team_members'          = 'DevTeamMember';
    'return_reasons'            = 'ReturnReason';
    'return_requests'           = 'ReturnRequest';
    'return_contact_attempts'   = 'ReturnContactAttempt';
    'return_activity_logs'      = 'ReturnActivityLog';
    'stock_movements'           = 'StockMovement';
    'stock_alerts'              = 'StockAlert'
}

$enumMappings = @{
    'dev_projects_status'               = 'DevProjectStatus';
    'dev_tasks_status'                  = 'DevTaskStatus';
    'dev_tasks_priority'                = 'DevTaskPriority';
    'dev_tasks_type'                    = 'DevTaskType';
    'dev_releases_status'               = 'DevReleaseStatus';
    'projects_status'                   = 'ProjectStatus';
    'projects_priority'                 = 'ProjectPriority';
    'return_requests_status'            = 'ReturnStatus';
    'stock_alerts_type'                 = 'StockAlertType';
    'stock_alerts_priority'             = 'StockAlertPriority';
    'stock_movements_type'              = 'StockMovementType';
    'stock_movements_reason'            = 'StockMovementReason';
    'task_templates_defaultStatus'      = 'TaskTemplateStatus';
    'task_templates_defaultPriority'    = 'TaskTemplatePriority';
    'messages_type'                     = 'MessageType';
    'conversations_channel'             = 'CommunicationChannel';
    'conversations_status'              = 'ConversationStatus';
    'invoices_type'                     = 'InvoiceType';
    'invoices_status'                   = 'InvoiceStatus';
    'store_pages_pageType'              = 'StorePageType';
    'whatsapp_messages_messageType'     = 'WhatsAppMessageType';
    'whatsapp_statuses_type'            = 'WhatsAppStatusType';
    'whatsapp_sessions_status'          = 'WhatsAppSessionStatus';
    'user_companies_role'               = 'UsercompanyRole';
    'subscriptions_planType'            = 'SubscriptionPlanType';
    'subscriptions_status'              = 'SubscriptionStatus';
    'ai_keys_keyType'                   = 'AiKeyType';
    'ai_keys_provider'                  = 'AiKeyProvider';
    'global_ai_configs_defaultProvider' = 'GlobalAiProvider'
}

# 1. Rename Models
foreach ($key in $mappings.Keys) {
    $val = $mappings[$key]
    
    # Rename Definition: model key { -> model val { @@map("key")
    if ($content -match "model\s+$key\s+\{") {
        # Check if @@map already exists inside?
        # We replace "model key {" with "model val {\n  @@map("$key")"
        # But we need to be careful about not duplicating map if future runs.
        # Simple replace:
        $content = $content -replace "model\s+$key\s+\{", "model $val {`n  @@map(`"$key`")"
    }

    # Rename Usage (Types):
    # key[] -> val[]
    $content = $content -replace "(\s)$key\[\]", "`$1$val[]"
    # key? -> val?
    $content = $content -replace "(\s)$key\?", "`$1$val?"
    # key (Relation type): space key space (or end of line) ?
    # regex: (\s)$key(\s+@relation) -> $1$val$2
    $content = $content -replace "(\s)$key(\s+@relation)", "`$1$val`$2"
    # Relation field definition: field key -> field val ? No, field name stays key (usually).
    # But type must change. 
    # Example: messages Message[]
    # If currently: messages messages[]
    # It becomes: messages Message[]
}

# 2. Rename Enums
foreach ($key in $enumMappings.Keys) {
    $val = $enumMappings[$key]
    # Rename Definition: enum key { -> enum val {
    $content = $content -replace "enum\s+$key\s+\{", "enum $val {"
    # Rename Usage: field key -> field val
    $content = $content -replace "\b$key\b", $val
}

$content | Set-Content $path -Encoding UTF8
Write-Host "Models and Enums renamed."
