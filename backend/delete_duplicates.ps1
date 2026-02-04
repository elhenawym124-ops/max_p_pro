$path = "e:\max_p_new\max_p_new\backend\prisma\schema.prisma"
$content = Get-Content $path -Raw

$modelsToDelete = @(
    "faqs", "policies", "rag_performance", "rag_rate_limits", "return_settings", 
    "faqs", "policies", "rag_performance", "rag_rate_limits", "return_settings",
    "search_analytics", "user_companies", "user_invitations", "return_reasons",
    "return_requests", "return_contact_attempts", "return_activity_logs",
    "image_studio_settings", "image_studio_usage", "image_studio_history",
    "dev_team_members", "dev_projects", "dev_releases", "dev_tasks",
    "dev_task_comments", "dev_task_attachments", "dev_time_logs",
    "dev_task_activities", "dev_task_watchers", "dev_task_checklists",
    "dev_task_checklist_items", "dev_notifications"
)

foreach ($model in $modelsToDelete) {
    # Regex to capture model block: model name { ... }
    # We use non-greedy match for content inside braces.
    # Note: Nested braces are not supported by standard regex easily,
    # but Prisma models rarely have nested braces except for attribute args.
    # We assume usage of typical formatting.
    $pattern = "model\s+$model\s+\{[\s\S]*?\n\}"
    $content = $content -replace $pattern, ""
}

$content | Set-Content $path -Encoding UTF8
Write-Host "Duplicates deleted."
