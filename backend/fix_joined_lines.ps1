$filePath = "f:\max_p_new\max_p_new\backend\prisma\schema.prisma"
$content = [System.IO.File]::ReadAllText($filePath)

# 1. Aggressive separation of joined lines
# This regex looks for patterns like "something)  field Name" and inserts a newline
$content = $content -replace '(\)  |\]  )([a-zA-Z_]+ [A-Z])', "`$1`r`n  `$2"

# 2. Specific fixes for common joined models
$content = $content -replace '  products Product', "`r`n  products Product"
$content = $content -replace '  orders Order', "`r`n  orders Order"
$content = $content -replace '  tasks Task', "`r`n  tasks Task"
$content = $content -replace '  user User', "`r`n  user User"
$content = $content -replace '  company Company', "`r`n  company Company"

# 3. Rename remaining model types in relations
$content = $content -replace '\s+guest_orders(\[\]|\?|)\s+@relation', '  guestOrder GuestOrder$1 @relation'
$content = $content -replace '\s+order_items(\[\]|\?|)\s+@relation', '  orderItems OrderItem$1 @relation'
$content = $content -replace '\s+task_comments(\[\]|\?|)\s+@relation', '  taskComments TaskComment$1 @relation'

# 4. Global replace for some common model types that might be missed
$content = $content -replace 'tasks\[\]', 'Task[]'
$content = $content -replace 'tasks\s+@relation', 'Task @relation'
$content = $content -replace 'guest_orders\[\]', 'GuestOrder[]'
$content = $content -replace 'order_items\[\]', 'OrderItem[]'
$content = $content -replace 'task_comments\[\]', 'TaskComment[]'

# 5. Model name fixes
$content = $content -replace 'model guest_orders \{', "model GuestOrder {`r`n  @@map(`"guest_orders`")"
$content = $content -replace 'model order_items \{', "model OrderItem {`r`n  @@map(`"order_items`")"

# 6. Final cleanup
$content = $content -replace '(?m)^ +', '  '
$content = $content -replace "\r\n\r\n\r\n", "`r`n`r`n"

[System.IO.File]::WriteAllText($filePath, $content)
Write-Host "Aggressive fix completed!"
