$path = "e:\max_p_new\max_p_new\backend\prisma\schema.prisma"
$content = Get-Content $path
$newContent = @()

$replacements = @{
    'companies' = 'Company';
    'customers' = 'Customer';
    'users' = 'User';
    'orders' = 'Order';
    'products' = 'Product';
    'invoices' = 'Invoice';
    'payments' = 'Payment';
    'tasks' = 'Task';
    'warehouses' = 'Warehouse';
    'conversations' = 'Conversation';
    'categories' = 'Category'
}

foreach ($line in $content) {
    $newLine = $line
    foreach ($key in $replacements.Keys) {
        $val = $replacements[$key]
        
        # Pattern 1: Type[]
        # regex: \s+key\[\] -> val[]
        # We use [Regex]::Replace to control boundaries better if needed, but -replace is fine
        # Matches: space + key + []
        $newLine = $newLine -replace "(\s)$key\[\]", "`$1$val[]"

        # Pattern 2: Type?
        $newLine = $newLine -replace "(\s)$key\?", "`$1$val?"

        # Pattern 3: Type @relation
        # Matches: space + key + space + @relation
        $newLine = $newLine -replace "(\s)$key(\s+@relation)", "`$1$val`$2"

        # Pattern 4: Type (Standalone, e.g. "company Company" but we scan for "companies companies")
        # Be careful not to replace Fields or Enums or Map strings.
        # Strict Pattern: space + key + EOL
        $newLine = $newLine -replace "(\s)$key(\s*)$", "`$1$val`$2"
    }
    $newContent += $newLine
}

$newContent | Set-Content $path -Encoding UTF8
Write-Host "Schema repaired."
