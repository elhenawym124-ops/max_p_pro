$path = "e:\max_p_new\max_p_new\backend\prisma\schema.prisma"
$content = Get-Content $path -Raw

# These models are duplicated. The FIRST occurrence is BROKEN. The SECOND occurrence (at the end) is GOOD.
# We want to remove the FIRST occurrence.
$duplicatesToDeleteFirst = @(
    "model TelegramConfig",
    "model SupportMessage",
    "model SupportAttachment",
    "model AiFailureLog",
    "model ReturnReason",
    "model ReturnRequest",
    "model ReturnContactAttempt",
    "model ReturnActivityLog",
    "model DevTeamMember",
    "model SupportTicket",
    "model DevProject",
    "model DevRelease",
    "model DevTask",
    "model DevTaskComment",
    "model DevTaskAttachment",
    "model DevTaskActivity",
    "model DevTaskWatcher",
    "model DevTaskChecklist",
    "model DevTaskChecklistItem",
    "model DevNotification",
    "model ImageStudioSettings",
    "model ImageStudioUsage",
    "model ImageStudioHistory",
    "model AIModelLimit",
    "model ReturnSettings",
    "model SearchAnalytics",
    "model RAGPerformance",
    "model RAGRateLimit",
    "model FAQ",
    "model Policy"
)

foreach ($item in $duplicatesToDeleteFirst) {
    $escapedItem = [Regex]::Escape($item)
    # Match the block
    $pattern = "$escapedItem\s*\{[\s\S]*?\n\}"
    $matches = [Regex]::Matches($content, $pattern)
    
    if ($matches.Count -gt 1) {
        # Remove the FIRST match (Index 0)
        $firstMatch = $matches[0]
        $content = $content.Remove($firstMatch.Index, $firstMatch.Length)
        Write-Host "Removed first occurrence of $item"
    }
    else {
        Write-Host "No duplicate found for $item (Count: $($matches.Count))"
    }
}

$content | Set-Content $path -Encoding UTF8
Write-Host "Broken duplicates removed."
