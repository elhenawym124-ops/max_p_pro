import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCartIcon, MinusIcon, PlusIcon, TruckIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { storefrontApi, getCompanyId } from '../../utils/storefrontApi';
import { apiClient } from '../../services/apiClient';
import StorefrontNav from '../../components/StorefrontNav';
import VolumeDiscountBadge from '../../components/VolumeDiscountBadge';
import RelatedProducts from '../../components/RelatedProducts';
import FrequentlyBoughtTogether from '../../components/FrequentlyBoughtTogether';
import ProductImageZoom from '../../components/storefront/ProductImageZoom';
import { storefrontSettingsService } from '../../services/storefrontSettingsService';
import { recentlyViewedApi } from '../../utils/storefrontApi';
import WishlistButton from '../../components/storefront/WishlistButton';
import RecentlyViewed from '../../components/storefront/RecentlyViewed';
import ProductReviews from '../../components/storefront/ProductReviews';
import CountdownTimer from '../../components/storefront/CountdownTimer';
import BackInStockNotification from '../../components/storefront/BackInStockNotification';
import SocialSharing from '../../components/storefront/SocialSharing';
import ProductBadges from '../../components/storefront/ProductBadges';
import ProductTabs from '../../components/storefront/ProductTabs';
import StickyAddToCart from '../../components/storefront/StickyAddToCart';
import SizeGuide from '../../components/storefront/SizeGuide';
import { addToComparison } from '../../components/storefront/ProductComparison';
import ProductNavigation from '../../components/storefront/ProductNavigation';
import SoldNumberDisplay from '../../components/storefront/SoldNumberDisplay';
import StockProgressBar from '../../components/storefront/StockProgressBar';
import SecurityBadges from '../../components/storefront/SecurityBadges';
import ReasonsToPurchase from '../../components/storefront/ReasonsToPurchase';
import OnlineVisitorsCount from '../../components/storefront/OnlineVisitorsCount';
import VariantSelector from '../../components/storefront/VariantSelector';
import CompositeVariantSelector from '../../components/storefront/CompositeVariantSelector';
import EstimatedDeliveryTime from '../../components/storefront/EstimatedDeliveryTime';
import PreOrderButton from '../../components/storefront/PreOrderButton';
import FOMOPopup from '../../components/storefront/FOMOPopup';
import { updateSEO, generateProductStructuredData, addStructuredData } from '../../utils/seo';
import { trackViewContent, trackAddToCart, trackInitiateCheckout, trackPurchase } from '../../utils/facebookPixel';
import analyticsService from '../../services/analyticsService';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  comparePrice?: number;
  metadata?: any;
  images: string[];
  stock: number;
  sku?: string;
  enableCheckoutForm?: boolean;
  showAddToCartButton?: boolean;
  saleStartDate?: string; // 📅 تاريخ بداية العرض
  saleEndDate?: string; // 📅 تاريخ انتهاء العرض
  sizeGuide?: string; // 📏 دليل المقاسات
  createdAt?: string;
  isFeatured?: boolean;
  specifications?: string;
  trackInventory?: boolean; // 📦 تتبع المخزون
  isPreOrder?: boolean; // 📦 الطلب المسبق
  preOrderDate?: string; // 📅 تاريخ توفر المنتج
  preOrderMessage?: string; // 💬 رسالة الطلب المسبق
  category?: {
    id: string;
    name: string;
  };
  variants?: Array<{
    id: string;
    name: string;
    type: string;
    price?: number;
    stock: number;
    images: string[];
    trackInventory?: boolean;
  }>;
}

interface FreeShippingSettings {
  freeShippingEnabled: boolean;
  freeShippingThreshold: number;
  freeShippingMessage: string;
}

const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

  // Parse variant display settings from metadata
  const variantSettings = useMemo(() => {
    if (!product?.metadata) return null;
    try {
      const meta = typeof product.metadata === 'string' ? JSON.parse(product.metadata) : product.metadata;
      return meta.variantSettings;
    } catch { return null; }
  }, [product]);

  // تحديث الصورة عند اختيار المتغير
  useEffect(() => {
    if (selectedVariant && product?.variants) {
      const variant = product.variants.find(v => v.id === selectedVariant);
      if (variant && variant.images && variant.images.length > 0) {
        // البحث عن مؤشر الصورة الأولى للمتغير في مصفوفة صور المنتج الرئيسية
        // أو تحديث الصورة المعروضة مباشرة إذا كانت الصور مخزنة بشكل منفصل
        // هنا نفترض أن صور المتغير هي عناوين URL
        // للتبسيط، سنقوم بالبحث عن الصورة في قائمة صور المنتج، إذا لم توجد، نظهرها هي

        // Parse product images
        let productImages: string[] = [];
        try {
          if (product.images && typeof product.images === 'string') {
            productImages = JSON.parse(product.images);
          } else if (Array.isArray(product.images)) {
            productImages = product.images;
          }
        } catch (e) { console.error(e); }

        const variantImage = variant.images[0];
        const imageIndex = productImages.findIndex(img => img === variantImage);

        if (imageIndex !== -1) {
          setSelectedImage(imageIndex);
        }
      }
    }
  }, [selectedVariant, product]);

  const [showCheckoutForm] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [freeShippingSettings, setFreeShippingSettings] = useState<FreeShippingSettings | null>(null);
  const [cartTotal, setCartTotal] = useState(0);
  const [storefrontSettings, setStorefrontSettings] = useState<any>(null);
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [formData, setFormData] = useState({
    guestName: '',
    guestPhone: '',
    guestEmail: '',
    city: '',
    shippingAddress: '',
    paymentMethod: 'CASH',
    notes: ''
  });

  // التحقق من وجود companyId عند التحميل
  useEffect(() => {
    const companyId = getCompanyId();
    if (!companyId) {
      toast.error('⚠️ يجب زيارة المتجر من رابط صحيح يحتوي على معرف الشركة');
      console.error('❌ [ProductDetails] No companyId found. Redirecting to shop...');
      navigate('/shop');
      return;
    }

    if (id) {
      // Track store visit
      analyticsService.trackStoreVisit(window.location.pathname);
      fetchProduct();
      fetchFreeShippingSettings();
      fetchCartTotal();
      fetchStorefrontSettings();
    }
  }, [id, navigate]);

  // Track ViewContent when both product and storefrontSettings are loaded
  useEffect(() => {
    console.log('🔍 [ProductDetails] ViewContent useEffect triggered', {
      hasProduct: !!product,
      hasStorefrontSettings: !!storefrontSettings,
      facebookPixelEnabled: storefrontSettings?.facebookPixelEnabled,
      pixelTrackViewContent: storefrontSettings?.pixelTrackViewContent,
      productId: product?.id,
      productName: product?.name
    });

    if (storefrontSettings?.facebookPixelEnabled && storefrontSettings?.pixelTrackViewContent !== false) {
      console.log('📊 [ProductDetails] Calling trackViewContent...', {
        productId: product?.id,
        productName: product?.name,
        price: product?.price,
        category: product?.category?.name,
        pixelId: storefrontSettings?.facebookPixelId
      });

      try {
        const eventId = trackViewContent({
          id: product.id,
          name: product.name,
          price: product.price,
          category: product.category?.name
        });

        if (eventId) {
          console.log('✅ [ProductDetails] ViewContent tracked successfully', {
            productId: product.id,
            eventId
          });
        } else {
          console.warn('⚠️ [ProductDetails] ViewContent tracking returned no eventId');
        }
      } catch (error) {
        console.error('❌ [ProductDetails] Error tracking ViewContent:', error);
      }
    } else {
      console.log('ℹ️ [ProductDetails] ViewContent skipped', {
        pixelEnabled: storefrontSettings?.facebookPixelEnabled,
        trackViewContent: storefrontSettings?.pixelTrackViewContent
      });
    }
  }, [product, storefrontSettings]);

  const fetchStorefrontSettings = async () => {
    try {
      const companyId = getCompanyId();
      if (companyId) {
        const data = await storefrontSettingsService.getPublicSettings(companyId);
        if (data.success && data.data) {
          setStorefrontSettings(data.data);
        } else {
          // Failed to load storefront settings, using disabled defaults
          setStorefrontSettings(null);
        }
      }
    } catch (error) {
      console.error('❌ [ProductDetails] Error fetching storefront settings:', error);
      // Set to null to ensure features are hidden on error
      setStorefrontSettings(null);
    }
  };

  const fetchFreeShippingSettings = async () => {
    try {
      const companyId = getCompanyId();
      const response = await apiClient.get(`/public/promotion-settings/${companyId}`);

      if (response.data.success) {
        setFreeShippingSettings(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching free shipping settings:', error);
    }
  };

  const fetchCartTotal = async () => {
    try {
      const data = await storefrontApi.getCart();
      if (data.success && data.data) {
        // Parse items - might be JSON string from database
        let items = data.data.items;
        if (typeof items === 'string') {
          try {
            items = JSON.parse(items);
          } catch {
            items = [];
          }
        }
        if (!Array.isArray(items)) {
          items = [];
        }
        const total = items.reduce((sum: number, item: any) =>
          sum + (item.price * item.quantity), 0
        );
        setCartTotal(total);
      }
    } catch (error) {
      console.error('Error fetching cart total:', error);
    }
  };

  const fetchShippingCost = async (governorate: string) => {
    if (!governorate || !governorate.trim()) {
      setShippingCost(0);
      return;
    }

    try {
      setShippingLoading(true);
      const companyId = getCompanyId();
      const response = await apiClient.get('/public/cart/shipping/calculate', {
        params: {
          city: governorate.trim(),
          companyId: companyId
        }
      });

      if (response.data.success && response.data.data?.methods && response.data.data.methods.length > 0) {
        // Use first method's cost
        setShippingCost(response.data.data.methods[0].cost || 0);
      } else {
        setShippingCost(0);
      }
    } catch (error) {
      console.error('Error fetching shipping cost:', error);
      setShippingCost(0);
    } finally {
      setShippingLoading(false);
    }
  };

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const data = await storefrontApi.getProduct(id!);

      if (data.success) {
        setProduct(data.data);

        // Parse images from JSON string
        let productImages: string[] = [];
        try {
          if (data.data.images && typeof data.data.images === 'string') {
            productImages = JSON.parse(data.data.images);
          } else if (Array.isArray(data.data.images)) {
            productImages = data.data.images;
          }
        } catch (e) {
          console.error('Error parsing product images:', e);
        }

        if (productImages.length > 0) {
          setSelectedImage(0);
        }

        // Record product view for recently viewed
        // Check if recentlyViewedEnabled exists and is true
        const isRecentlyViewedEnabled = storefrontSettings?.recentlyViewedEnabled === true;
        if (isRecentlyViewedEnabled && id) {
          try {
            await recentlyViewedApi.recordView(id);
            // Product view recorded - no need to log
          } catch (error) {
            // Silently handle errors - recently viewed is optional
          }
        }

        // Track product view for analytics
        if (id) {
          analyticsService.trackProductView(id, 'product-page');
        }

        // Note: ViewContent will be tracked in useEffect when both product and storefrontSettings are loaded

        // Update SEO
        if (storefrontSettings?.seoEnabled) {
          const productImages = Array.isArray(data.data.images)
            ? data.data.images
            : typeof data.data.images === 'string'
              ? JSON.parse(data.data.images || '[]')
              : [];

          if (storefrontSettings.seoMetaDescription) {
            updateSEO({
              title: `${data.data.name} - متجرنا`,
              description: data.data.description || data.data.name,
              image: productImages[0],
              url: window.location.href,
              type: 'product'
            });
          }

          if (storefrontSettings.seoStructuredData) {
            const structuredData = generateProductStructuredData(data.data);
            addStructuredData(structuredData);
          }
        }
      } else {
        toast.error('المنتج غير موجود');
        navigate('/shop');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('حدث خطأ في جلب المنتج');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async () => {
    if (!product) return;

    try {
      const data = await storefrontApi.addToCart({
        productId: product.id,
        quantity,
        ...(selectedVariant && { variantId: selectedVariant })
      });

      if (data.success) {
        // Backend returns cart object with cartId
        if (data.data?.cartId) {
          localStorage.setItem('cart_session_id', data.data.cartId);
        }

        // Track Facebook Pixel AddToCart event
        if (storefrontSettings?.facebookPixelEnabled && storefrontSettings?.pixelTrackAddToCart !== false) {
          try {
            trackAddToCart({
              id: product.id,
              name: product.name,
              price: product.price,
              quantity: quantity
            });
            console.log('📊 [Facebook Pixel] AddToCart tracked for product:', product.id);
          } catch (error) {
            console.error('❌ [Facebook Pixel] Error tracking AddToCart:', error);
          }
        }

        // Track analytics add to cart
        analyticsService.trackAddToCart(product.id, product.price * quantity);

        toast.success('تمت إضافة المنتج للسلة');
        window.dispatchEvent(new Event('cartUpdated'));
      } else {
        toast.error(data.message || 'حدث خطأ');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('حدث خطأ في إضافة المنتج');
    }
  };

  const handleFormInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Fetch shipping cost when governorate changes
    if (name === 'city' && value) {
      fetchShippingCost(value);
    }
  };

  const handleDirectCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔵 [DIRECT-CHECKOUT] Form submitted!', { product: !!product, formData, quantity, selectedVariant });
    console.log('🔵 [DIRECT-CHECKOUT] Form data details:', {
      guestName: formData.guestName,
      guestNameLength: formData.guestName?.length,
      guestNameTrimmed: formData.guestName?.trim(),
      guestNameTrimmedLength: formData.guestName?.trim()?.length,
      guestPhone: formData.guestPhone,
      city: formData.city,
      shippingAddress: formData.shippingAddress
    });

    if (!product) {
      console.error('❌ [DIRECT-CHECKOUT] No product!');
      return;
    }

    // Validation
    const guestName = formData.guestName?.trim() || '';
    const guestPhone = formData.guestPhone?.trim() || '';
    const city = formData.city?.trim() || '';
    const shippingAddress = formData.shippingAddress?.trim() || '';

    if (!guestName) {
      console.error('❌ [DIRECT-CHECKOUT] Guest name validation failed:', {
        guestName: formData.guestName,
        trimmed: guestName,
        isEmpty: !guestName
      });
      toast.error('الاسم الكامل مطلوب');
      return;
    }
    if (!guestPhone) {
      console.error('❌ [DIRECT-CHECKOUT] Guest phone validation failed');
      toast.error('رقم الهاتف مطلوب');
      return;
    }
    if (!city) {
      console.error('❌ [DIRECT-CHECKOUT] City validation failed');
      toast.error('المدينة مطلوبة');
      return;
    }
    if (!shippingAddress) {
      console.error('❌ [DIRECT-CHECKOUT] Shipping address validation failed');
      toast.error('العنوان التفصيلي مطلوب');
      return;
    }

    try {
      setSubmitting(true);

      // Track Facebook Pixel InitiateCheckout event
      if (storefrontSettings?.facebookPixelEnabled && storefrontSettings?.pixelTrackInitiateCheckout !== false) {
        try {
          trackInitiateCheckout({
            items: [{
              id: product.id,
              quantity: quantity,
              price: product.price
            }],
            total: product.price * quantity
          });
          console.log('📊 [Facebook Pixel] InitiateCheckout tracked');
        } catch (error) {
          console.error('❌ [Facebook Pixel] Error tracking InitiateCheckout:', error);
        }
      }

      // Generate event ID for deduplication (will be used by both Pixel and CAPI)
      let purchaseEventId: string | undefined;
      if (storefrontSettings?.facebookPixelEnabled && storefrontSettings?.pixelTrackPurchase !== false) {
        // Generate event ID before creating order to pass to backend
        purchaseEventId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      // Create order directly with single product
      const orderData = {
        items: [{
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity,
          variantId: selectedVariant || null
        }],
        guestName: guestName,
        guestPhone: guestPhone,
        guestEmail: formData.guestEmail?.trim() || guestPhone, // Use phone as fallback
        shippingAddress: {
          governorate: city,
          city: city,
          street: shippingAddress,
          building: '',
          floor: '',
          apartment: ''
        },
        paymentMethod: formData.paymentMethod,
        notes: formData.notes || '',
        pixelEventId: purchaseEventId // Pass event ID for CAPI deduplication
      };

      const data = await storefrontApi.createOrder(orderData);

      if (data.success) {
        // Track Facebook Pixel Purchase event (with same event ID for deduplication)
        if (storefrontSettings?.facebookPixelEnabled && storefrontSettings?.pixelTrackPurchase !== false && purchaseEventId) {
          try {
            trackPurchase({
              orderNumber: data.data.orderNumber,
              items: [{
                id: product.id,
                quantity: quantity,
                price: product.price
              }],
              total: product.price * quantity
            }, purchaseEventId); // Pass event ID to Pixel
            console.log('📊 [Facebook Pixel] Purchase tracked for order:', data.data.orderNumber, 'Event ID:', purchaseEventId);
          } catch (error) {
            console.error('❌ [Facebook Pixel] Error tracking Purchase:', error);
          }
        }

        // Track analytics purchase
        try {
          await analyticsService.trackPurchase(data.data.id, product.price * quantity, [product.id]);
          console.log('✅ [Analytics] Purchase tracked for order:', data.data.orderNumber);
        } catch (error) {
          console.error('❌ [Analytics] Error tracking Purchase:', error);
        }

        // Clear cart from database
        try {
          await storefrontApi.clearCart();
        } catch (error) {
          console.error('Error clearing cart:', error);
          // لا نوقف العملية إذا فشل حذف السلة
        }

        // Clear cart session from localStorage
        localStorage.removeItem('cart_session_id');

        // Notify cart update
        window.dispatchEvent(new Event('cartUpdated'));

        toast.success('تم إنشاء الطلب بنجاح! 🎉');
        const companyId = getCompanyId();
        // Navigate to order confirmation with order number and phone for tracking
        navigate(`/shop/order-confirmation/${data.data.orderNumber}?phone=${encodeURIComponent(formData.guestPhone)}&companyId=${companyId}`);
      } else {
        toast.error(data.message || 'حدث خطأ في إنشاء الطلب');
      }
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast.error(error.message || 'حدث خطأ في إنشاء الطلب');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="h-96 bg-gray-200 rounded-lg"></div>
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const currentPrice = selectedVariant
    ? product.variants?.find(v => v.id === selectedVariant)?.price || product.price
    : product.price;

  const currentStock = selectedVariant
    ? product.variants?.find(v => v.id === selectedVariant)?.stock || 0
    : product.stock;

  // التحقق من تتبع المخزون للمتغير أو المنتج
  const selectedVariantData = selectedVariant
    ? product.variants?.find(v => v.id === selectedVariant)
    : null;

  // حساب التوفر بناءً على المتغيرات أو المنتج
  const hasVariants = product.variants && product.variants.length > 0;

  // إذا كان هناك متغيرات ولم يتم اختيار أي منها، نتحقق من توفر أي متغير
  const anyVariantAvailable = hasVariants
    ? product.variants!.some(v =>
      v.trackInventory === false || // لا يتتبع المخزون = متوفر دائماً
      v.stock > 0 // أو لديه مخزون
    )
    : false;

  const currentTrackInventory = selectedVariantData
    ? selectedVariantData.trackInventory !== false
    : hasVariants
      ? true // إذا كان هناك متغيرات، نحتاج اختيار واحد
      : product.trackInventory !== false;

  // هل المنتج متاح للشراء؟
  // إذا لم يتم اختيار متغير وهناك متغيرات، نتحقق من توفر أي متغير
  const isAvailableForPurchase = selectedVariant
    ? (!currentTrackInventory || currentStock > 0 || product.isPreOrder)
    : hasVariants
      ? anyVariantAvailable || product.isPreOrder
      : (!currentTrackInventory || currentStock > 0 || product.isPreOrder);

  // هل يجب اختيار متغير قبل الشراء؟
  const needsVariantSelection = hasVariants && !selectedVariant;

  return (
    <>
      <StorefrontNav />
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm">
          <ol className="flex items-center space-x-2 space-x-reverse">
            <li>
              <button onClick={() => navigate('/shop')} className="text-blue-600 hover:underline">
                المنتجات
              </button>
            </li>
            <li className="text-gray-500">/</li>
            {product.category && (
              <>
                <li className="text-gray-700">{product.category.name}</li>
                <li className="text-gray-500">/</li>
              </>
            )}
            <li className="text-gray-900 font-medium">{product.name}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Images */}
          <div>
            {/* Parse images for display */}
            {(() => {
              let productImages: string[] = [];
              try {
                if (product.images && typeof product.images === 'string') {
                  productImages = JSON.parse(product.images);
                } else if (Array.isArray(product.images)) {
                  productImages = product.images;
                }
              } catch (e) {
                console.error('Error parsing product images:', e);
              }

              return (
                <>
                  {/* Main Image with Zoom */}
                  {storefrontSettings?.imageZoomEnabled ? (
                    <ProductImageZoom
                      images={productImages}
                      alt={product.name}
                      enabled={storefrontSettings.imageZoomEnabled}
                      zoomType={storefrontSettings.imageZoomType as 'hover' | 'click' | 'both'}
                      className="h-96 bg-gray-100 rounded-lg overflow-hidden"
                    />
                  ) : (
                    <div className="relative h-96 bg-gray-100 rounded-lg overflow-hidden">
                      {productImages.length > 0 && productImages[selectedImage] ? (
                        <img
                          src={productImages[selectedImage]}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400"><span class="text-6xl">📦</span></div>';
                          }}
                        />
                      ) : (
                        <div className="w-full h-96 flex items-center justify-center text-gray-400">
                          <span className="text-6xl">📦</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Thumbnails - Only show if zoom is disabled or for manual selection */}
                  {productImages.length > 1 && !storefrontSettings?.imageZoomEnabled && (
                    <div className="grid grid-cols-4 gap-2 mt-4">
                      {productImages.map((image, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImage(index)}
                          className={`bg-gray-100 rounded-lg overflow-hidden border-2 transition-colors ${selectedImage === index ? 'border-blue-600' : 'border-transparent'
                            }`}
                        >
                          <img
                            src={image}
                            alt={`${product.name} ${index + 1}`}
                            className="w-full h-20 object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Product Info */}
          <div>
            {/* العنوان والفئة */}
            {(!storefrontSettings?.productPageLayoutEnabled || storefrontSettings?.productPageShowTitle !== false) && (
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
                  {product.category && (!storefrontSettings?.productPageLayoutEnabled || storefrontSettings?.productPageShowCategory !== false) && (
                    <p className="text-gray-600">{product.category.name}</p>
                  )}
                </div>
                {/* Social Sharing */}
                {storefrontSettings?.socialSharingEnabled && (!storefrontSettings?.productPageLayoutEnabled || storefrontSettings?.productPageShowSocialSharing !== false) && (
                  <SocialSharing
                    enabled={storefrontSettings.socialSharingEnabled}
                    product={product}
                    settings={{
                      shareFacebook: storefrontSettings.shareFacebook,
                      shareTwitter: storefrontSettings.shareTwitter,
                      shareWhatsApp: storefrontSettings.shareWhatsApp,
                      shareTelegram: storefrontSettings.shareTelegram
                    }}
                  />
                )}
              </div>
            )}

            {/* Product Badges */}
            {storefrontSettings?.badgesEnabled && (!storefrontSettings?.productPageLayoutEnabled || storefrontSettings?.productPageShowBadges !== false) && (
              <div className="mb-4">
                <ProductBadges
                  product={product}
                  settings={storefrontSettings}
                />
              </div>
            )}

            {/* السعر */}
            {(!storefrontSettings?.productPageLayoutEnabled || storefrontSettings?.productPageShowPrice !== false) && (
              <div className="mb-4">
                <div className="flex flex-col gap-2">
                  {product.comparePrice && product.comparePrice > currentPrice ? (
                    <>
                      {/* السعر القديم */}
                      <div className="flex items-center gap-3">
                        <span className="text-2xl text-gray-400 line-through">
                          {product.comparePrice} جنيه
                        </span>
                        <span className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm font-bold">
                          خصم {Math.round(((product.comparePrice - currentPrice) / product.comparePrice) * 100)}%
                        </span>
                      </div>
                      {/* السعر الحالي */}
                      <div className="flex items-center gap-2">
                        <span className="text-3xl font-bold text-red-600">
                          {currentPrice} جنيه
                        </span>
                        <span className="text-sm text-gray-600">السعر الحالي</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-bold text-gray-900">
                        {currentPrice} جنيه
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Countdown Timer */}
            {(!storefrontSettings?.productPageLayoutEnabled || storefrontSettings?.productPageShowCountdown !== false) && (() => {
              const countdownEnabled = storefrontSettings?.countdownEnabled;
              const showOnProduct = storefrontSettings?.countdownShowOnProduct;
              const hasComparePrice = product.comparePrice && product.comparePrice > currentPrice;
              const hasSaleEndDate = product.saleEndDate;
              const saleEndDateValid = hasSaleEndDate && new Date(product.saleEndDate) > new Date();

              return countdownEnabled && showOnProduct && hasComparePrice && saleEndDateValid ? (
                <div className="mb-4">
                  <CountdownTimer
                    endDate={product.saleEndDate}
                    enabled={storefrontSettings.countdownEnabled}
                  />
                </div>
              ) : null;
            })()}

            {/* Stock Status & Progress Bar */}
            {(!storefrontSettings?.productPageLayoutEnabled || storefrontSettings?.productPageShowStockStatus !== false) && (
              <div className="mb-4 space-y-2">
                {/* إذا كان هناك متغيرات ولم يتم اختيار أي منها */}
                {needsVariantSelection ? (
                  anyVariantAvailable ? (
                    <p className="text-blue-600 font-medium">
                      ℹ️ اختر اللون والمقاس لمعرفة التوفر
                    </p>
                  ) : product.isPreOrder ? (
                    <p className="text-blue-600 font-medium">
                      📦 متاح للطلب المسبق - اختر اللون والمقاس
                    </p>
                  ) : (
                    <p className="text-red-600 font-medium">
                      ✗ غير متوفر حالياً
                    </p>
                  )
                ) : currentStock > 0 ? (
                  <p className="text-green-600 font-medium">
                    ✓ متوفر في المخزون {currentTrackInventory && `(${currentStock} قطعة)`}
                  </p>
                ) : !currentTrackInventory ? (
                  <p className="text-green-600 font-medium">
                    ✓ متوفر
                  </p>
                ) : product.isPreOrder ? (
                  <p className="text-blue-600 font-medium">
                    📦 متاح للطلب المسبق
                    {product.preOrderDate && (
                      <span className="text-sm text-gray-500 mr-2">
                        - متوقع التوفر: {new Date(product.preOrderDate).toLocaleDateString('ar-EG')}
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-red-600 font-medium">
                    ✗ غير متوفر حالياً
                  </p>
                )}

                {storefrontSettings?.stockProgressEnabled && (!storefrontSettings?.productPageLayoutEnabled || storefrontSettings?.productPageShowStockProgress !== false) && (
                  <StockProgressBar
                    enabled={storefrontSettings.stockProgressEnabled}
                    type={storefrontSettings.stockProgressType as 'percentage' | 'count' | 'text'}
                    stock={currentStock}
                    maxStock={product.stock}
                    lowColor={storefrontSettings.stockProgressLowColor}
                    mediumColor={storefrontSettings.stockProgressMediumColor}
                    highColor={storefrontSettings.stockProgressHighColor}
                    threshold={storefrontSettings.stockProgressThreshold}
                  />
                )}
              </div>
            )}

            {/* Back in Stock Notification */}
            {storefrontSettings?.backInStockEnabled && currentStock === 0 && (!storefrontSettings?.productPageLayoutEnabled || storefrontSettings?.productPageShowBackInStock !== false) && (
              <div className="mb-4">
                <BackInStockNotification
                  productId={product.id}
                  enabled={storefrontSettings.backInStockEnabled}
                  notifyEmail={storefrontSettings.backInStockNotifyEmail}
                  notifySMS={storefrontSettings.backInStockNotifySMS}
                  stock={currentStock}
                />
              </div>
            )}

            {/* Security Badges */}
            {storefrontSettings?.securityBadgesEnabled && (!storefrontSettings?.productPageLayoutEnabled || storefrontSettings?.productPageShowSecurityBadges !== false) && (
              <div className="mb-4">
                <SecurityBadges
                  enabled={storefrontSettings.securityBadgesEnabled}
                  badges={{
                    securePayment: storefrontSettings.badgeSecurePayment,
                    freeShipping: storefrontSettings.badgeFreeShipping,
                    qualityGuarantee: storefrontSettings.badgeQualityGuarantee,
                    cashOnDelivery: storefrontSettings.badgeCashOnDelivery,
                    buyerProtection: storefrontSettings.badgeBuyerProtection,
                    highRating: storefrontSettings.badgeHighRating,
                    custom1: storefrontSettings.badgeCustom1,
                    custom1Text: storefrontSettings.badgeCustom1Text,
                    custom2: storefrontSettings.badgeCustom2,
                    custom2Text: storefrontSettings.badgeCustom2Text,
                  }}
                  layout={storefrontSettings.badgeLayout as 'horizontal' | 'vertical'}
                />
              </div>
            )}

            {/* Social Proof: Sold Number & Online Visitors */}
            {(!storefrontSettings?.productPageLayoutEnabled || storefrontSettings?.productPageShowSoldNumber !== false || storefrontSettings?.productPageShowOnlineVisitors !== false) && (storefrontSettings?.soldNumberEnabled || storefrontSettings?.onlineVisitorsEnabled) && (
              <div className="mb-4 space-y-2">
                {storefrontSettings?.soldNumberEnabled && (!storefrontSettings?.productPageLayoutEnabled || storefrontSettings?.productPageShowSoldNumber !== false) && (
                  <SoldNumberDisplay
                    enabled={storefrontSettings.soldNumberEnabled}
                    type={storefrontSettings.soldNumberType as 'real' | 'fake'}
                    min={storefrontSettings.soldNumberMin}
                    max={storefrontSettings.soldNumberMax}
                    text={storefrontSettings.soldNumberText}
                    productId={product.id}
                  />
                )}

                {storefrontSettings?.onlineVisitorsEnabled && (!storefrontSettings?.productPageLayoutEnabled || storefrontSettings?.productPageShowOnlineVisitors !== false) && (
                  <OnlineVisitorsCount
                    enabled={storefrontSettings.onlineVisitorsEnabled}
                    type={storefrontSettings.onlineVisitorsType as 'real' | 'fake'}
                    min={storefrontSettings.onlineVisitorsMin}
                    max={storefrontSettings.onlineVisitorsMax}
                    updateInterval={storefrontSettings.onlineVisitorsUpdateInterval}
                    text={storefrontSettings.onlineVisitorsText}
                    productId={product.id}
                  />
                )}
              </div>
            )}

            {/* Estimated Delivery Time */}
            {storefrontSettings?.estimatedDeliveryEnabled && (!storefrontSettings?.productPageLayoutEnabled || storefrontSettings?.productPageShowEstimatedDelivery !== false) && (
              <div className="mb-4">
                <EstimatedDeliveryTime
                  enabled={storefrontSettings.estimatedDeliveryEnabled}
                  showOnProduct={storefrontSettings.estimatedDeliveryShowOnProduct !== false}
                  defaultText={storefrontSettings.estimatedDeliveryDefaultText}
                  productId={product.id}
                />
              </div>
            )}

            {/* Free Shipping Banner */}
            {(!storefrontSettings?.productPageLayoutEnabled || storefrontSettings?.productPageShowFreeShipping !== false) && freeShippingSettings && freeShippingSettings.freeShippingEnabled && (() => {
              const productTotal = currentPrice * quantity;
              const totalWithCart = cartTotal + productTotal;
              const threshold = freeShippingSettings.freeShippingThreshold;
              const remaining = threshold - totalWithCart;
              const progress = Math.min((totalWithCart / threshold) * 100, 100);

              if (remaining > 0) {
                return (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <TruckIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-blue-900 font-medium mb-2">
                          🚚 أضف منتجات بقيمة <span className="font-bold">{remaining.toFixed(2)} جنيه</span> أخرى للحصول على شحن مجاني!
                        </p>
                        <div className="w-full bg-blue-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-blue-700 mt-1">{progress.toFixed(0)}% من الحد الأدنى</p>
                      </div>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-3">
                      <TruckIcon className="w-5 h-5 text-green-600" />
                      <p className="text-sm text-green-900 font-bold">
                        🎉 تهانينا! ستحصل على شحن مجاني مع هذا الطلب!
                      </p>
                    </div>
                  </div>
                );
              }
            })()}

            {/* Pre-order Button */}
            {product.isPreOrder && (!storefrontSettings?.productPageLayoutEnabled || storefrontSettings?.productPageShowPreOrder !== false) && (
              <div className="mb-4">
                <PreOrderButton
                  product={{
                    id: product.id,
                    name: product.name,
                    price: currentPrice,
                    isPreOrder: product.isPreOrder,
                    preOrderDate: (product as any).preOrderDate,
                    preOrderMessage: (product as any).preOrderMessage,
                    enableCheckoutForm: product.enableCheckoutForm,
                  }}
                  quantity={quantity}
                  selectedVariant={selectedVariant}
                />
              </div>
            )}

            {/* Variants */}
            {(!storefrontSettings?.productPageLayoutEnabled || storefrontSettings?.productPageShowVariants !== false) && product.variants && product.variants.length > 0 && (() => {
              // Separate variants by type
              const colorVariants = product.variants.filter(v => v.type === 'color');
              const sizeVariants = product.variants.filter(v => v.type === 'size');
              const otherVariants = product.variants.filter(v => v.type !== 'color' && v.type !== 'size');

              // التحقق من وجود أسماء مركبة في أي من المتغيرات
              const hasHyphenSeparator = product.variants.some(v => v.name.includes(' - '));
              const hasPipeSeparator = product.variants.some(v => v.name.includes('|'));

              const allVariantsHaveCompositeNames = hasHyphenSeparator || hasPipeSeparator;

              const allVariantsAreComposite = product.variants.length > 0 &&
                product.variants.every(v => v.name.includes(' - ') || v.name.includes('|'));

              // إذا كانت جميع المتغيرات لها أسماء مركبة (مثل "أسود - XL" أو "اللون: أحمر | المقاس: 40")
              // أو إذا كانت كل المتغيرات في otherVariants ولها أسماء مركبة
              const hasCompositeVariants = (allVariantsAreComposite && allVariantsHaveCompositeNames) ||
                (otherVariants.length > 0 &&
                  colorVariants.length === 0 &&
                  sizeVariants.length === 0 &&
                  otherVariants.some(v => v.name.includes(' - ') || v.name.includes('|')));

              if (hasCompositeVariants) {
                // استخدام جميع المتغيرات إذا كانت كلها مركبة، وإلا استخدام otherVariants
                const variantsToUse = allVariantsAreComposite ? product.variants : otherVariants;

                return (
                  <div className="mb-6">
                    <CompositeVariantSelector
                      variants={variantsToUse}
                      onSelect={setSelectedVariant}
                      selectedVariantId={selectedVariant}
                      productPrice={product.price}
                      variantSettings={variantSettings}
                    />
                  </div>
                );
              }

              return (
                <div className="mb-6 space-y-4">
                  {/* Color Variants */}
                  {colorVariants.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">اللون:</h3>
                      <VariantSelector
                        variants={colorVariants}
                        selectedVariant={selectedVariant}
                        onSelect={setSelectedVariant}
                        style={storefrontSettings?.variantColorStyle as any || 'buttons'}
                        overrideStyle={variantSettings?.styles?.color}
                        attributeImages={variantSettings?.attributeImages?.color}
                        showName={storefrontSettings?.variantColorShowName !== false}
                        showStock={true}
                        size={storefrontSettings?.variantColorSize as any || 'medium'}
                        variantType="color"
                        productPrice={product.price}
                      />
                    </div>
                  )}

                  {/* Size Variants */}
                  {sizeVariants.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">المقاس:</h3>
                      <VariantSelector
                        variants={sizeVariants}
                        selectedVariant={selectedVariant}
                        onSelect={setSelectedVariant}
                        style={storefrontSettings?.variantSizeStyle as any || 'buttons'}
                        overrideStyle={variantSettings?.styles?.size}
                        showName={true}
                        showStock={storefrontSettings?.variantSizeShowStock !== false}
                        size="medium"
                        variantType="size"
                        productPrice={product.price}
                      />
                      {storefrontSettings?.variantSizeShowGuide && storefrontSettings?.sizeGuideEnabled && (
                        <div className="mt-2">
                          <SizeGuide
                            enabled={storefrontSettings.sizeGuideEnabled}
                            sizeGuideContent={product.sizeGuide}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Other Variants */}
                  {otherVariants.length > 0 && !hasCompositeVariants && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">الخيارات المتاحة:</h3>
                      <VariantSelector
                        variants={otherVariants}
                        selectedVariant={selectedVariant}
                        onSelect={setSelectedVariant}
                        style="buttons"
                        overrideStyle={variantSettings?.styles?.color} // Fallback for other variants if they are color-like
                        attributeImages={variantSettings?.attributeImages?.color}
                        showName={true}
                        showStock={true}
                        size="medium"
                        variantType="color"
                        productPrice={product.price}
                      />
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Size Guide - قبل الكمية */}
            {(!storefrontSettings?.productPageLayoutEnabled || storefrontSettings?.productPageShowSizeGuide !== false) && storefrontSettings?.sizeGuideEnabled && storefrontSettings?.sizeGuideShowOnProduct && (
              <div className="mb-6">
                <SizeGuide
                  enabled={storefrontSettings.sizeGuideEnabled}
                  showOnProduct={storefrontSettings.sizeGuideShowOnProduct}
                  sizeGuide={product.sizeGuide}
                  productName={product.name}
                />
              </div>
            )}

            {/* Quantity */}
            {(!storefrontSettings?.productPageLayoutEnabled || storefrontSettings?.productPageShowQuantity !== false) && (
              <div className="mb-4">
                <h3 className="font-semibold text-gray-900 mb-3">الكمية:</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <MinusIcon className="h-5 w-5" />
                  </button>
                  <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
                    disabled={quantity >= currentStock}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    <PlusIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Volume Discounts */}
            {(!storefrontSettings?.productPageLayoutEnabled || storefrontSettings?.productPageShowVolumeDiscounts !== false) && product && (
              <div className="mb-4">
                <VolumeDiscountBadge productId={product.id} quantity={quantity} />
              </div>
            )}

            {/* Reasons to Purchase */}
            {(!storefrontSettings?.productPageLayoutEnabled || storefrontSettings?.productPageShowReasonsToPurchase !== false) && storefrontSettings?.reasonsToPurchaseEnabled && (() => {
              try {
                let reasonsList: string[] = [];

                // Handle different cases
                if (storefrontSettings.reasonsToPurchaseList) {
                  const rawValue = storefrontSettings.reasonsToPurchaseList;

                  // If it's already an array (shouldn't happen but handle it)
                  if (Array.isArray(rawValue)) {
                    reasonsList = rawValue;
                  }
                  // If it's a string, try to parse it as JSON
                  else if (typeof rawValue === 'string') {
                    // Trim whitespace
                    const trimmed = rawValue.trim();

                    // If empty, use default reasons
                    if (!trimmed || trimmed === '' || trimmed === 'null') {
                      reasonsList = [
                        '✅ جودة عالية',
                        '✅ توصيل سريع',
                        '✅ ضمان 30 يوم',
                        '✅ دعم فني 24/7'
                      ];
                    } else {
                      // Try to parse as JSON
                      try {
                        const parsed = JSON.parse(trimmed);
                        if (Array.isArray(parsed)) {
                          reasonsList = parsed.filter(r => r && typeof r === 'string' && r.trim() !== '');
                        } else if (typeof parsed === 'string') {
                          reasonsList = [parsed];
                        }
                      } catch (parseError) {
                        // If JSON parsing fails, treat it as a single reason or comma-separated
                        const parts = trimmed.split(',').map(p => p.trim()).filter(p => p);
                        if (parts.length > 0) {
                          reasonsList = parts;
                        }
                      }
                    }
                  }
                } else {
                  // No list provided, use defaults (silently)
                  reasonsList = [
                    '✅ جودة عالية',
                    '✅ توصيل سريع',
                    '✅ ضمان 30 يوم',
                    '✅ دعم فني 24/7'
                  ];
                }

                // Log only in development and if not using defaults
                if (storefrontSettings.reasonsToPurchaseList && storefrontSettings.reasonsToPurchaseList.trim() !== '') {
                  console.log('✅ [ProductDetails] Final reasons list:', reasonsList);
                }

                if (Array.isArray(reasonsList) && reasonsList.length > 0) {
                  return (
                    <div className="mb-6">
                      <ReasonsToPurchase
                        enabled={storefrontSettings.reasonsToPurchaseEnabled}
                        reasons={reasonsList}
                        maxItems={storefrontSettings.reasonsToPurchaseMaxItems || 4}
                        style={storefrontSettings.reasonsToPurchaseStyle as 'list' | 'icons' || 'list'}
                      />
                    </div>
                  );
                } else {
                  console.warn('⚠️ [ProductDetails] Reasons list is still empty after processing');
                }
              } catch (error) {
                console.error('❌ [ProductDetails] Error parsing reasonsToPurchaseList:', error);
                console.error('Raw value:', storefrontSettings.reasonsToPurchaseList);

                // Fallback to default reasons
                return (
                  <div className="mb-6">
                    <ReasonsToPurchase
                      enabled={storefrontSettings.reasonsToPurchaseEnabled}
                      reasons={[
                        '✅ جودة عالية',
                        '✅ توصيل سريع',
                        '✅ ضمان 30 يوم',
                        '✅ دعم فني 24/7'
                      ]}
                      maxItems={storefrontSettings.reasonsToPurchaseMaxItems || 4}
                      style={storefrontSettings.reasonsToPurchaseStyle as 'list' | 'icons' || 'list'}
                    />
                  </div>
                );
              }
              return null;
            })()}

            {/* Actions - Show "Add to Cart" button if enabled and checkout form is disabled */}
            {(!storefrontSettings?.productPageLayoutEnabled || storefrontSettings?.productPageShowActions !== false) && product.showAddToCartButton !== false && product.enableCheckoutForm === false && (
              <div className="flex gap-3 mb-6">
                <button
                  onClick={addToCart}
                  disabled={!isAvailableForPurchase || needsVariantSelection}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <ShoppingCartIcon className="h-5 w-5" />
                  <span>{needsVariantSelection ? 'اختر اللون والمقاس أولاً' : 'أضف للسلة'}</span>
                </button>
                {storefrontSettings?.comparisonEnabled && (
                  <button
                    onClick={() => {
                      addToComparison({
                        id: product.id,
                        name: product.name,
                        price: currentPrice,
                        comparePrice: product.comparePrice,
                        images: product.images,
                        stock: currentStock,
                        description: product.description,
                        category: product.category
                      });
                    }}
                    className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    title="أضف للمقارنة"
                  >
                    <ArrowsRightLeftIcon className="h-5 w-5" />
                  </button>
                )}
                {storefrontSettings?.wishlistEnabled && product && (
                  <WishlistButton
                    productId={product.id}
                    variantId={selectedVariant || undefined}
                    enabled={storefrontSettings.wishlistEnabled}
                    className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                    size="lg"
                    productName={product.name}
                    productPrice={product.price}
                  />
                )}
              </div>
            )}

            {/* Product Tabs */}
            {(!storefrontSettings?.productPageLayoutEnabled || storefrontSettings?.productPageShowTabs !== false) && storefrontSettings?.tabsEnabled && (
              <ProductTabs
                enabled={storefrontSettings.tabsEnabled}
                product={{
                  description: product.description,
                  specifications: product.specifications,
                  shippingInfo: 'سيتم التوصيل خلال 3-5 أيام عمل'
                }}
                reviews={
                  storefrontSettings.tabReviews && storefrontSettings.reviewsEnabled ? (
                    <ProductReviews
                      productId={product.id}
                      enabled={storefrontSettings.reviewsEnabled}
                      requirePurchase={storefrontSettings.reviewsRequirePurchase}
                      showRating={storefrontSettings.reviewsShowRating}
                      minRatingToDisplay={storefrontSettings.minRatingToDisplay}
                    />
                  ) : undefined
                }
                settings={{
                  tabDescription: storefrontSettings.tabDescription,
                  tabSpecifications: storefrontSettings.tabSpecifications,
                  tabReviews: storefrontSettings.tabReviews,
                  tabShipping: storefrontSettings.tabShipping
                }}
              />
            )}

            {/* Fallback Description if tabs disabled */}
            {(!storefrontSettings?.productPageLayoutEnabled || storefrontSettings?.productPageShowDescription !== false) && !storefrontSettings?.tabsEnabled && product.description && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="font-semibold text-gray-900 mb-3">الوصف:</h3>
                <div
                  className="text-gray-700 leading-relaxed prose prose-sm max-w-none product-description"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>
            )}

            {/* SKU */}
            {(!storefrontSettings?.productPageLayoutEnabled || storefrontSettings?.productPageShowSKU !== false) && product.sku && (
              <div className="mt-4 text-sm text-gray-500">
                رمز المنتج: {product.sku}
              </div>
            )}

            {/* Inline Checkout Form */}
            {(!storefrontSettings?.productPageLayoutEnabled || storefrontSettings?.productPageShowCheckoutForm !== false) && showCheckoutForm && product.enableCheckoutForm && (
              <div id="checkout-form" className="mt-8 border-t-2 border-gray-200 pt-8">
                <h3 className="text-xl font-bold text-gray-900 mb-2 text-right">يرجى إدخال معلوماتك لإكمال الطلب</h3>
                <p className="text-sm text-gray-600 mb-6 text-right">عدد القطع: {quantity}</p>

                <form onSubmit={handleDirectCheckout} className="space-y-4">
                  {/* Form Fields - Simplified Design */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                      اسمك بالكامل
                    </label>
                    <input
                      type="text"
                      name="guestName"
                      value={formData.guestName}
                      onChange={handleFormInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                      placeholder=""
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                      رقم الهاتف
                    </label>
                    <input
                      type="tel"
                      name="guestPhone"
                      value={formData.guestPhone}
                      onChange={handleFormInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                      placeholder=""
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                      المحافظة
                    </label>
                    <select
                      name="city"
                      value={formData.city}
                      onChange={handleFormInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-right bg-white"
                    >
                      <option value="">اختر المحافظة</option>
                      <option value="القاهرة">القاهرة</option>
                      <option value="الجيزة">الجيزة</option>
                      <option value="الإسكندرية">الإسكندرية</option>
                      <option value="الدقهلية">الدقهلية</option>
                      <option value="الشرقية">الشرقية</option>
                      <option value="المنوفية">المنوفية</option>
                      <option value="القليوبية">القليوبية</option>
                      <option value="البحيرة">البحيرة</option>
                      <option value="الغربية">الغربية</option>
                      <option value="بورسعيد">بورسعيد</option>
                      <option value="دمياط">دمياط</option>
                      <option value="الإسماعيلية">الإسماعيلية</option>
                      <option value="السويس">السويس</option>
                      <option value="كفر الشيخ">كفر الشيخ</option>
                      <option value="الفيوم">الفيوم</option>
                      <option value="بني سويف">بني سويف</option>
                      <option value="المنيا">المنيا</option>
                      <option value="أسيوط">أسيوط</option>
                      <option value="سوهاج">سوهاج</option>
                      <option value="قنا">قنا</option>
                      <option value="أسوان">أسوان</option>
                      <option value="الأقصر">الأقصر</option>
                      <option value="البحر الأحمر">البحر الأحمر</option>
                      <option value="الوادي الجديد">الوادي الجديد</option>
                      <option value="مطروح">مطروح</option>
                      <option value="شمال سيناء">شمال سيناء</option>
                      <option value="جنوب سيناء">جنوب سيناء</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                      العنوان بالتفصيل
                    </label>
                    <textarea
                      name="shippingAddress"
                      value={formData.shippingAddress}
                      onChange={handleFormInputChange}
                      required
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-right resize-none"
                      placeholder=""
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                      رقم هاتف بديل
                    </label>
                    <input
                      type="tel"
                      name="guestEmail"
                      value={formData.guestEmail}
                      onChange={handleFormInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                      placeholder=""
                    />
                  </div>

                  {/* Order Summary */}
                  <div className="border-t border-gray-200 pt-4 mt-6">
                    <div className="flex justify-between text-gray-700 mb-2 text-right">
                      <span className="font-medium">تكلفة الشحن</span>
                      <span className="font-semibold">
                        {shippingLoading ? (
                          <span className="text-gray-400">جاري الحساب...</span>
                        ) : formData.city ? (
                          `${shippingCost} ج.م`
                        ) : (
                          <span className="text-gray-400">اختر المحافظة</span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-gray-900 text-right">
                      <span>الإجمالي</span>
                      <span>{(product.price * quantity) + shippingCost} ج.م</span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting || !isAvailableForPurchase || needsVariantSelection}
                    onClick={(e) => {
                      console.log('🔵 [BUTTON-CLICK] Button clicked!', {
                        submitting,
                        isAvailableForPurchase,
                        needsVariantSelection,
                        hasVariants,
                        selectedVariant,
                        disabled: submitting || !isAvailableForPurchase || needsVariantSelection,
                        formData: formData,
                        guestName: formData.guestName,
                        guestNameTrimmed: formData.guestName?.trim()
                      });
                      // Don't prevent default - let form submit normally
                    }}
                    className="w-full px-6 py-4 bg-black text-white rounded-md font-medium hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-lg"
                  >
                    {submitting ? 'جاري إنشاء الطلب...' : needsVariantSelection ? 'اختر اللون والمقاس أولاً' : 'اضغط هنا للشراء'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Frequently Bought Together */}
        {product && getCompanyId() && (
          <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
            <FrequentlyBoughtTogether
              productId={product.id}
              companyId={getCompanyId()!}
              currentProduct={{
                id: product.id,
                name: product.name,
                description: product.description,
                price: product.price,
                salePrice: product.comparePrice || undefined,
                images: product.images,
                stock: product.stock
              }}
              onAddToCart={async (productIds) => {
                // إضافة كل المنتجات المحددة للسلة
                try {
                  for (const id of productIds) {
                    if (id === product.id) {
                      await addToCart();
                    } else {
                      // إضافة المنتجات الأخرى للسلة
                      await storefrontApi.addToCart({
                        productId: id,
                        variantId: null,
                        quantity: 1
                      });
                    }
                  }
                  toast.success('تم إضافة المنتجات للسلة');
                } catch (error) {
                  console.error('Error adding products to cart:', error);
                  toast.error('حدث خطأ أثناء إضافة المنتجات للسلة');
                }
              }}
            />
          </div>
        )}

        {/* Product Navigation */}
        {storefrontSettings?.navigationEnabled && (
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <ProductNavigation
              enabled={storefrontSettings.navigationEnabled}
              navigationType={storefrontSettings.navigationType as 'sameCategory' | 'allProducts'}
              showButtons={storefrontSettings.showNavigationButtons}
              keyboardShortcuts={storefrontSettings.keyboardShortcuts}
              currentProductId={product.id}
              currentCategoryId={product.category?.id}
            />
          </div>
        )}

        {/* Related Products */}
        {product && getCompanyId() && (
          <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
            <RelatedProducts
              productId={product.id}
              companyId={getCompanyId()!}
              limit={6}
            />
          </div>
        )}

        {/* Recently Viewed */}
        {storefrontSettings?.recentlyViewedEnabled && (
          <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
            <RecentlyViewed
              enabled={storefrontSettings.recentlyViewedEnabled}
              count={storefrontSettings.recentlyViewedCount}
            />
          </div>
        )}

        {/* Product Reviews (if not in tabs) - handled in tabs or outside */}
        {product && storefrontSettings?.reviewsEnabled && !storefrontSettings?.tabsEnabled && (
          <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
            <ProductReviews
              productId={product.id}
              enabled={storefrontSettings.reviewsEnabled}
              requirePurchase={storefrontSettings.reviewsRequirePurchase}
              showRating={storefrontSettings.reviewsShowRating}
              minRatingToDisplay={storefrontSettings.minRatingToDisplay}
            />
          </div>
        )}

        {/* FOMO Popup */}
        {product && storefrontSettings?.fomoEnabled && (
          <FOMOPopup
            enabled={storefrontSettings.fomoEnabled}
            type={storefrontSettings.fomoType as 'soldCount' | 'visitors' | 'stock' | 'countdown'}
            trigger={storefrontSettings.fomoTrigger as 'time' | 'scroll' | 'exit'}
            delay={storefrontSettings.fomoDelay || 30}
            showOncePerSession={storefrontSettings.fomoShowOncePerSession !== false}
            message={storefrontSettings.fomoMessage || undefined}
            product={{
              id: product.id,
              name: product.name,
              stock: currentStock,
              saleEndDate: product.saleEndDate,
            }}
            soldCount={0} // TODO: حساب من الطلبات
            visitorsCount={0} // TODO: من OnlineVisitorsCount
          />
        )}

        {/* Sticky Add to Cart */}
        {product && storefrontSettings?.stickyAddToCartEnabled && (
          <StickyAddToCart
            enabled={storefrontSettings.stickyAddToCartEnabled}
            showOnMobile={storefrontSettings.stickyShowOnMobile}
            showOnDesktop={storefrontSettings.stickyShowOnDesktop}
            scrollThreshold={storefrontSettings.stickyScrollThreshold || 300}
            showBuyNow={storefrontSettings.stickyShowBuyNow !== false}
            showAddToCartButton={storefrontSettings.stickyShowAddToCartButton !== false}
            showQuantity={storefrontSettings.stickyShowQuantity !== false}
            showProductImage={storefrontSettings.stickyShowProductImage !== false}
            showProductName={storefrontSettings.stickyShowProductName !== false}
            trackAnalytics={storefrontSettings.stickyTrackAnalytics !== false}
            autoScrollToCheckout={storefrontSettings.stickyAutoScrollToCheckout === true}
            product={{
              id: product.id,
              name: product.name,
              price: currentPrice,
              stock: currentStock,
              images: product.images,
              enableCheckoutForm: product.enableCheckoutForm
            }}
            selectedVariant={selectedVariant}
            onQuantityChange={setQuantity}
            storefrontSettings={storefrontSettings}
          />
        )}
      </div>
    </>
  );
};

export default ProductDetails;

