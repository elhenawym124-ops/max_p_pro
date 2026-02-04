# Script to split ecommerce.prisma into 3 logical files

$content = Get-Content ".\prisma\schema\ecommerce.prisma" -Raw

# Split by model definitions
$models = [regex]::Matches($content, '(?ms)((?:///[^\n]*\n)*model\s+\w+\s*\{(?:[^{}]|\{[^{}]*\})*\})')

# Group models by category
$products = @()
$orders = @()
$inventory = @()

foreach ($match in $models) {
    $modelText = $match.Value
    $modelName = if ($modelText -match 'model\s+(\w+)') { $matches[1] } else { "" }
    
    # Categorize based on model name
    if ($modelName -match '^(Product|Category|ProductReview|ProductVariant|ProductVisit|BlockedCustomers|Customer|CustomerList|CustomerNote|Wishlist|Coupon|CouponUsage)') {
        $products += $modelText
    }
    elseif ($modelName -match '^(Order|Payment|Invoice|GuestOrder|GuestCart|DeliveryOption|OrderStatusConfig|OrderInvoiceSettings|OrderStatusHistory|PaymentReceipt|ShippingZone|Branche)') {
        $orders += $modelText
    }
    elseif ($modelName -match '^(Inventory|Warehouse|Stock|Supplier|Purchase|TaskCategory|WoocommerceSettings|WoocommerceSyncLog|BackInStockNotification)') {
        $inventory += $modelText
    }
    else {
        # Default to products if not clearly categorized
        $products += $modelText
    }
}

# Write files
$products -join "`n`n" | Set-Content ".\prisma\schema\products.prisma"
$orders -join "`n`n" | Set-Content ".\prisma\schema\orders.prisma"
$inventory -join "`n`n" | Set-Content ".\prisma\schema\inventory.prisma"

Write-Host "✅ Files created successfully!"
Write-Host "`nProducts: $($products.Count) models"
Write-Host "Orders: $($orders.Count) models"
Write-Host "Inventory: $($inventory.Count) models"
Write-Host "Total: $($products.Count + $orders.Count + $inventory.Count) models"
