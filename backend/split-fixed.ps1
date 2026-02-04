$content = Get-Content ".\prisma\schema\common.prisma" -Raw

# Split by model definitions
$models = [regex]::Matches($content, '(?ms)((?:///[^\n]*\n)*model\s+\w+\s*\{(?:[^{}]|\{[^{}]*\})*\})')

# Group models by category
$messaging = @()
$tasks = @()
$settings = @()
$media = @()
$returns = @()
$marketplace = @()
$misc = @()

foreach ($match in $models) {
    $modelText = $match.Value
    $modelName = if ($modelText -match 'model\s+(\w+)') { $matches[1] } else { "" }
    
    # Categorize
    if ($modelName -match 'WhatsApp|Telegram|Conversation|Message|SentMessage') {
        $messaging += $modelText
    }
    elseif ($modelName -match '^(Dev)?Task|Project|TimeEntry|DevTeam|DevTime|DevRelease|DevNotification|DevSystem') {
        $tasks += $modelText
    }
    elseif ($modelName -match 'Settings|Template|Prompt|Footer|Homepage|Storefront|StorePromotion|SystemPrompt|GlobalAi|FewShot|Subscription|PlanConfiguration|StorePage') {
        $settings += $modelText
    }
    elseif ($modelName -match 'Image|TextGallery|MediaFile') {
        $media += $modelText
    }
    elseif ($modelName -match 'Return|CallAttempt') {
        $returns += $modelText
    }
    elseif ($modelName -match 'Marketplace|CompanyApp|AppUsage|AppReview|AppPricing|AppBundle|CompanyWallet|^Transaction$') {
        $marketplace += $modelText
    }
    else {
        $misc += $modelText
    }
}

# Write files
$messaging -join "`n`n" | Set-Content ".\prisma\schema\messaging.prisma"
$tasks -join "`n`n" | Set-Content ".\prisma\schema\tasks.prisma"
$settings -join "`n`n" | Set-Content ".\prisma\schema\settings.prisma"
$media -join "`n`n" | Set-Content ".\prisma\schema\media.prisma"
$returns -join "`n`n" | Set-Content ".\prisma\schema\returns.prisma"
$marketplace -join "`n`n" | Set-Content ".\prisma\schema\marketplace.prisma"
$misc -join "`n`n" | Set-Content ".\prisma\schema\misc.prisma"

Write-Host "✅ Files created successfully!"
