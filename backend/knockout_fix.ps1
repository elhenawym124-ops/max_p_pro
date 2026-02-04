$filePath = "f:\max_p_new\max_p_new\backend\prisma\schema.prisma"
$content = [System.IO.File]::ReadAllText($filePath)

# 1. Rename model definitions if not already renamed
$content = $content -replace 'model dev_tasks {', "model DevTask {`r`n  @@map(`"dev_tasks`")"
$content = $content -replace 'model dev_task_comments {', "model DevTaskComment {`r`n  @@map(`"dev_task_comments`")"
$content = $content -replace 'model dev_task_activities {', "model DevTaskActivity {`r`n  @@map(`"dev_task_activities`")"
$content = $content -replace 'model dev_task_attachments {', "model DevTaskAttachment {`r`n  @@map(`"dev_task_attachments`")"
$content = $content -replace 'model dev_task_checklists {', "model DevTaskChecklist {`r`n  @@map(`"dev_task_checklists`")"

# 2. Comprehensive type replacement in relations
# We use regex to match types (the second column in field definitions)
# Patterns like "field dev_tasks" or "field dev_tasks[]" or "field dev_tasks?"
$content = $content -replace '(\s+)dev_tasks(\[\]|\?|)(\s+@relation|\s*\r?\n)', '$1DevTask$2$3'
$content = $content -replace '(\s+)dev_task_comments(\[\]|\?|)(\s+@relation|\s*\r?\n)', '$1DevTaskComment$2$3'
$content = $content -replace '(\s+)dev_task_activities(\[\]|\?|)(\s+@relation|\s*\r?\n)', '$1DevTaskActivity$2$3'
$content = $content -replace '(\s+)dev_task_attachments(\[\]|\?|)(\s+@relation|\s*\r?\n)', '$1DevTaskAttachment$2$3'
$content = $content -replace '(\s+)dev_task_checklists(\[\]|\?|)(\s+@relation|\s*\r?\n)', '$1DevTaskChecklist$2$3'

# 3. Fix the partial renames from previous steps (like dev_Task)
$content = $content -replace 'dev_Task(\[\]|\?|)', 'DevTask$1'
$content = $content -replace 'dev_TaskComment(\[\]|\?|)', 'DevTaskComment$1'

# 4. Final sweep for core models just in case
$content = $content -replace '(\s+)activities(\[\]|\?|)(\s+@relation|\s*\r?\n)', '$1Activity$2$3'
$content = $content -replace '(\s+)activity_logs(\[\]|\?|)(\s+@relation|\s*\r?\n)', '$1ActivityLog$2$3'
$content = $content -replace '(\s+)order_items(\[\]|\?|)(\s+@relation|\s*\r?\n)', '$1OrderItem$2$3'
$content = $content -replace '(\s+)order_notes(\[\]|\?|)(\s+@relation|\s*\r?\n)', '$1OrderNote$2$3'
$content = $content -replace '(\s+)guest_orders(\[\]|\?|)(\s+@relation|\s*\r?\n)', '$1GuestOrder$2$3'

# 5. Fix double @@map or double model keywords if any
$content = $content -replace '(model \w+ \{\s+)@@map\("\w+"\)\s+@@map\("\w+"\)', '$1@@map(...)' # Manual check if needed

[System.IO.File]::WriteAllText($filePath, $content)
Write-Host "The Knockout Fix is complete!"
