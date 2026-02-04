$path = "e:\max_p_new\max_p_new\backend\prisma\schema.prisma"
$content = Get-Content $path -Raw

$mappings = @{
    'learning_settings'            = 'LearningSettings';
    'order_status_configs'         = 'OrderStatusConfig';
    'page_response_settings'       = 'PageResponseSettings';
    'post_response_settings'       = 'PostResponseSettings';
    'post_tracking'                = 'PostTracking';
    'product_reviews'              = 'ProductReview';
    'recently_viewed'              = 'RecentlyViewed';
    'response_effectiveness'       = 'ResponseEffectiveness';
    'sent_message_stats'           = 'SentMessageStat';
    'shipping_zones'               = 'ShippingZone';
    'store_pages'                  = 'StorePage';
    'store_promotion_settings'     = 'StorePromotionSettings';
    'storefront_settings'          = 'StorefrontSettings';
    'task_dependencies'            = 'TaskDependency';
    'whatsapp_quick_replies'       = 'WhatsAppQuickReply';
    'whatsapp_sessions'            = 'WhatsAppSession';
    'whatsapp_settings'            = 'WhatsAppSettings';
    'wishlists'                    = 'Wishlist';
    'woocommerce_settings'         = 'WooCommerceSettings';
    'woocommerce_sync_logs'        = 'WooCommerceSyncLog';
    'activity_logs'                = 'ActivityLog';
    'image_gallery'                = 'ImageGallery';
    'ai_analytics'                 = 'AiAnalytics';
    'ai_failure_logs'              = 'AiFailureLog';
    'ai_keys'                      = 'AiKey';
    'ai_model_configs'             = 'AiModelConfig';
    'ai_model_limits'              = 'AiModelLimit';
    'ai_notifications'             = 'AiNotification';
    'ai_settings'                  = 'AiSetting';
    'back_in_stock_notifications'  = 'BackInStockNotification';
    'branches'                     = 'Branch';
    'broadcast_campaigns'          = 'BroadcastCampaign';
    'broadcast_settings'           = 'BroadcastSetting';
    'checkout_form_settings'       = 'CheckoutFormSettings';
    'conversation_memory'          = 'ConversationMemory';
    'coupon_usages'                = 'CouponUsage';
    'coupons'                      = 'Coupon';
    'customer_lists'               = 'CustomerList';
    'delivery_options'             = 'DeliveryOption';
    'excluded_models'              = 'ExcludedModel';
    'facebook_ad_accounts'         = 'FacebookAdAccount';
    'facebook_ad_insights'         = 'FacebookAdInsight';
    'facebook_ad_test_variants'    = 'FacebookAdTestVariant';
    'facebook_ad_tests'            = 'FacebookAdTest';
    'facebook_ads'                 = 'FacebookAd';
    'facebook_adsets'              = 'FacebookAdSet';
    'facebook_campaigns'           = 'FacebookCampaign';
    'facebook_catalog_products'    = 'FacebookCatalogProduct';
    'facebook_comments'            = 'FacebookComment';
    'facebook_custom_audiences'    = 'FacebookCustomAudience';
    'facebook_dynamic_ads'         = 'FacebookDynamicAd';
    'facebook_lookalike_audiences' = 'FacebookLookalikeAudience';
    'facebook_pages'               = 'FacebookPage';
    'facebook_pixel_configs'       = 'FacebookPixelConfig';
    'facebook_product_catalogs'    = 'FacebookProductCatalog';
    'facebook_product_feeds'       = 'FacebookProductFeed';
    'few_shot_examples'            = 'FewShotExample';
    'few_shot_settings'            = 'FewShotSettings';
    'footer_settings'              = 'FooterSettings';
    'global_ai_configs'            = 'GlobalAiConfig';
    'guest_carts'                  = 'GuestCart';
    'guest_orders'                 = 'GuestOrder';
    'homepage_templates'           = 'HomepageTemplate';
    'integrations'                 = 'Integration';
    'inventory'                    = 'Inventory';
    'invoice_items'                = 'InvoiceItem';
    'knowledge_base'               = 'KnowledgeBase';
    'learning_data'                = 'LearningData';
    'media_files'                  = 'MediaFile';
    'order_items'                  = 'OrderItem';
    'payment_receipts'             = 'PaymentReceipt';
    'plan_configurations'          = 'PlanConfiguration';
    'product_variants'             = 'ProductVariant';
    'prompt_library'               = 'PromptLibrary';
    'skipped_facebook_pages'       = 'SkippedFacebookPage';
    'telegram_configs'             = 'TelegramConfig';
    'wallet_numbers'               = 'WalletNumber';
    'whatsapp_event_logs'          = 'WhatsappEventLog';
    'whatsapp_statuses'            = 'WhatsappStatus';
    'notification'                 = 'Notification'; # Handle generic names
}


foreach ($key in $mappings.Keys) {
    $val = $mappings[$key]
    
    # Rename Definition
    if ($content -match "model\s+$key\s+\{") {
        $content = $content -replace "model\s+$key\s+\{", "model $val {`n  @@map(`"$key`")"
    }

    # Rename Usage
    $content = $content -replace "(\s)$key\[\]", "`$1$val[]"
    $content = $content -replace "(\s)$key\?", "`$1$val?"
    $content = $content -replace "(\s)$key(\s+@relation)", "`$1$val`$2"
}

$content | Set-Content $path -Encoding UTF8
Write-Host "Remaining models renamed."
