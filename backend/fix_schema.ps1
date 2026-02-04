$filePath = "f:\max_p_new\max_p_new\backend\prisma\schema.prisma"
$content = Get-Content $filePath -Raw

# 1. Replace singular relations with any amount of whitespace
# Pattern: field model? @relation
$content = $content -replace '\s+companies\s+companies([\?\s]*)@relation', "  company Company`$1@relation"
$content = $content -replace '\s+users\s+users([\?\s]*)@relation', "  user User`$1@relation"
$content = $content -replace '\s+customers\s+customers([\?\s]*)@relation', "  customer Customer`$1@relation"
$content = $content -replace '\s+products\s+products([\?\s]*)@relation', "  product Product`$1@relation"
$content = $content -replace '\s+orders\s+orders([\?\s]*)@relation', "  order Order`$1@relation"
$content = $content -replace '\s+tasks\s+tasks([\?\s]*)@relation', "  task Task`$1@relation"

# 2. Replace array relations
$content = $content -replace '\s+companies\s+companies\[\]', '  companies Company[]'
$content = $content -replace '\s+users\s+users\[\]', '  users User[]'
$content = $content -replace '\s+customers\s+customers\[\]', '  customers Customer[]'
$content = $content -replace '\s+products\s+products\[\]', '  products Product[]'
$content = $content -replace '\s+orders\s+orders\[\]', '  orders Order[]'
$content = $content -replace '\s+tasks\s+tasks\[\]', '  tasks Task[]'

# 3. Rename other models to PascalCase
$content = $content -replace 'model activities \{', "model Activity {`r`n  @@map(`"activities`")"
$content = $content -replace 'model activity_logs \{', "model ActivityLog {`r`n  @@map(`"activity_logs`")"
$content = $content -replace 'model task_activities \{', "model TaskActivity {`r`n  @@map(`"task_activities`")"
$content = $content -replace 'model task_attachments \{', "model TaskAttachment {`r`n  @@map(`"task_attachments`")"
$content = $content -replace 'model task_comments \{', "model TaskComment {`r`n  @@map(`"task_comments`")"

# 4. Fix relations to newly renamed models
$content = $content -replace '\s+activities\s+activities\[\]', '  activities Activity[]'
$content = $content -replace '\s+activity_logs\s+activity_logs\[\]', '  activity_logs ActivityLog[]'
$content = $content -replace '\s+task_activities\s+task_activities\[\]', '  task_activities TaskActivity[]'
$content = $content -replace '\s+task_attachments\s+task_attachments\[\]', '  task_attachments TaskAttachment[]'
$content = $content -replace '\s+task_comments\s+task_comments\[\]', '  task_comments TaskComment[]'

# 5. Save and fix encoding
Set-Content $filePath $content -Encoding utf8
[IO.File]::WriteAllText($filePath, [IO.File]::ReadAllText($filePath))
Write-Host "Schema fix completed!"
