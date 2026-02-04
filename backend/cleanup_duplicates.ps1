$path = "e:\max_p_new\max_p_new\backend\prisma\schema.prisma"
$content = Get-Content $path -Raw

# List of duplicate items (Models and Enums) found at the end of the file 
# that are already defined earlier (around line 1000 or elsewhere).
$duplicates = @(
    "model DevProject",
    "model DevRelease",
    "model DevTask",
    "model DevTaskComment",
    "model DevTaskAttachment",
    "model DevTimeLog",
    "model DevTaskActivity",
    "model DevTaskWatcher",
    "model DevTaskChecklist",
    "model DevTaskChecklistItem",
    "model DevNotification",
    "enum InvitationStatus",
    "enum ProjectStatus",
    "enum UserRole",
    "enum SubscriptionStatus",
    "enum InvoiceStatus",
    "enum InvoiceType",
    "enum CommunicationChannel",
    "enum ConversationStatus",
    "enum MessageType",
    "enum StockMovementType",
    "enum StockMovementReason",
    "enum GlobalAiProvider",
    "enum AiKeyProvider",
    "enum DevTaskType",
    "enum DevProjectStatus",
    "enum DevTaskStatus",
    "enum DevReleaseStatus",
    "enum ReturnStatus",
    "enum DevTaskPriority",
    "enum TaskStatus",
    "enum TaskPriority",
    "enum SubscriptionPlan"
)

# Strategy: Find LAST occurrence and delete it if there are multiple?
# Or simpler: Delete specific blocks known to be adjacent at the end.
# Based on file view, lines 4700+ contain the duplicates.
# We can regex replace based on the assumption they are at the end.
# But regex limit is 2GB string, which is fine.
# We need to be careful not to delete the FIRST valid occurrence.
# We will assume the duplicates are the ONES WITHOUT @@map usually? 
# Wait, the ones at the end (lines 4700+) usually HAVE @@map("snake_case") because I appended them?
# No, the ones at 1000 ALREADY have @@map because I renamed them in place.
# The ones at 4700+ ALSO have @@map because they are duplicates of the original snake_case ones that got renamed?
# Actually, the ones at 4700+ match the "model DevProject" pattern.
# Let's check `view_file` output again.
# L1019: model DevProject { @@map("dev_projects") ... }
# L4703: model DevProject { ... @@map("dev_projects") }
# They are identical.
# I will just remove the second occurrence of each.

foreach ($item in $duplicates) {
    # Escape for regex
    $escapedItem = [Regex]::Escape($item)
    # Pattern to match the block: item { ... }
    $pattern = "$escapedItem\s*\{[\s\S]*?\n\}"
    
    # Get all matches
    $matches = [Regex]::Matches($content, $pattern)
    
    if ($matches.Count -gt 1) {
        # We have duplicates. Remove the LAST one.
        # We can iterate backwards or just replace the last match.
        $lastMatch = $matches[$matches.Count - 1]
        
        # We need to replace string at specific index.
        # Strings are immutable in .NET, so we construct new string.
        # Or simplistic approach: split content, remove part, join.
        # Let's use Remove method of string.
        $content = $content.Remove($lastMatch.Index, $lastMatch.Length)
        Write-Host "Removed duplicate $item"
    }
    else {
        Write-Host "No duplicate found for $item (Count: $($matches.Count))"
    }
}

$content | Set-Content $path -Encoding UTF8
Write-Host "Cleanup finished."
