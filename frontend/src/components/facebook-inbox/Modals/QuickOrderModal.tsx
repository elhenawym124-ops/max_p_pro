import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    XMarkIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    MinusIcon,
    TrashIcon,
    ShoppingCartIcon,
    UserIcon,
    MapPinIcon,
    TruckIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    ArchiveBoxIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { apiClient } from '../../../services/apiClient';
import { authService } from '../../../services/authService';
import { config } from '../../../config';
import { InboxConversation } from '../../../types/inbox.types';

// المحافظات المصرية
const EGYPT_GOVERNORATES = [
    'القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'البحر الأحمر',
    'البحيرة', 'الفيوم', 'الغربية', 'الإسماعيلية', 'المنوفية',
    'المنيا', 'القليوبية', 'الوادي الجديد', 'السويس', 'أسوان',
    'أسيوط', 'بني سويف', 'بورسعيد', 'دمياط', 'الشرقية',
    'جنوب سيناء', 'كفر الشيخ', 'مطروح', 'الأقصر', 'قنا',
    'شمال سيناء', 'سوهاج'
];

interface ProductVariant {
    id: string;
    sku: string;
    price: number | string;
    stock: number;
    name: string;
    type?: string;
    color?: string;
    size?: string;
    image?: string;
    metadata?: string;
    attributeValues?: Record<string, string>;
}

// Helper function to parse variant metadata and extract attributeValues
const parseVariantAttributes = (variant: ProductVariant): Record<string, string> => {
    // First try attributeValues directly
    if (variant.attributeValues && Object.keys(variant.attributeValues).length > 0) {
        return variant.attributeValues;
    }
    
    // Then try metadata
    if (variant.metadata) {
        try {
            const metadata = typeof variant.metadata === 'string' ? JSON.parse(variant.metadata) : variant.metadata;
            if (metadata.attributeValues && Object.keys(metadata.attributeValues).length > 0) {
                return metadata.attributeValues;
            }
        } catch {
            // ignore parse errors
        }
    }

    // Try color and size fields directly
    if (variant.color || variant.size) {
        const attrs: Record<string, string> = {};
        if (variant.color) attrs['اللون'] = variant.color;
        if (variant.size) attrs['المقاس'] = variant.size;
        return attrs;
    }
    
    // Fallback: Try to extract from variant name (e.g., "بيفليل - 54" or "تنا - 98")
    if (variant.name) {
        const parts = variant.name.split(/\s*[-–]\s*/);
        if (parts.length >= 2) {
            return {
                'اللون': parts[0].trim(),
                'المقاس': parts[1].trim()
            };
        } else if (parts.length === 1 && variant.type) {
            const typeName = variant.type === 'color' ? 'اللون' : variant.type === 'size' ? 'المقاس' : variant.type;
            return { [typeName]: parts[0].trim() };
        }
    }
    
    return {};
};

// Helper function to extract unique attributes from variants
const extractAttributes = (variants: ProductVariant[]): { name: string; values: string[] }[] => {
    const attributeMap: Record<string, Set<string>> = {};
    
    variants.forEach(variant => {
        const attrs = parseVariantAttributes(variant);
        Object.entries(attrs).forEach(([key, value]) => {
            if (!attributeMap[key]) attributeMap[key] = new Set();
            if (value) attributeMap[key].add(value);
        });
    });
    
    return Object.entries(attributeMap)
        .filter(([_, values]) => values.size > 0)
        .map(([name, values]) => ({
            name,
            values: Array.from(values).sort()
        }));
};

interface Product {
    id: string;
    name: string;
    price: number;
    image: string;
    stock: number;
    sku: string;
    variants: ProductVariant[];
}

interface CartItem {
    productId: string;
    variantId?: string;
    name: string;
    variantName?: string;
    price: number;
    quantity: number;
    image: string;
    stock: number;
    sku?: string;
}

interface ShippingInfo {
    zoneId: string | null;
    price: number;
    deliveryTime: string;
    governorate: string | null;
}

interface QuickOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    conversation: InboxConversation;
    customerName?: string;
    customerPhone?: string;
    onOrderCreated?: (orderId: string) => void;
}

// Variant Selection Modal Component - Same as ManualOrder
interface VariantSelectionModalProps {
    product: Product;
    selectedAttributes: Record<string, string>;
    onAttributeSelect: (attrName: string, value: string) => void;
    onVariantSelect: (variant: ProductVariant) => void;
    onClose: () => void;
}

const VariantSelectionModal: React.FC<VariantSelectionModalProps> = ({
    product,
    selectedAttributes,
    onAttributeSelect,
    onVariantSelect,
    onClose
}) => {
    // Extract attributes from product
    const productAttributes = useMemo(() => {
        return extractAttributes(product.variants);
    }, [product]);

    // Filter variants based on selected attributes
    const filteredVariants = useMemo(() => {
        return product.variants.filter(variant => {
            const variantAttrs = parseVariantAttributes(variant);
            return Object.entries(selectedAttributes).every(([key, value]) => {
                return variantAttrs[key] === value;
            });
        });
    }, [product, selectedAttributes]);

    // Get available values for each attribute based on current selection
    const getAvailableValues = (attrName: string): string[] => {
        const otherSelections = { ...selectedAttributes };
        delete otherSelections[attrName];
        
        const availableVariants = product.variants.filter(variant => {
            const variantAttrs = parseVariantAttributes(variant);
            return Object.entries(otherSelections).every(([key, value]) => {
                return variantAttrs[key] === value;
            });
        });
        
        const values = new Set<string>();
        availableVariants.forEach(variant => {
            const variantAttrs = parseVariantAttributes(variant);
            if (variantAttrs[attrName]) {
                values.add(variantAttrs[attrName]);
            }
        });
        
        return Array.from(values);
    };

    // Check if all attributes are selected
    const allAttributesSelected = productAttributes.length > 0 && 
        productAttributes.every(attr => selectedAttributes[attr.name]);

    // Get the matching variant when all attributes are selected
    const matchedVariant = useMemo(() => {
        if (!allAttributesSelected || filteredVariants.length !== 1) return null;
        return filteredVariants[0];
    }, [allAttributesSelected, filteredVariants]);

    return (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 truncate pr-4">{product.name}</h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    {/* Multi-level attribute selection */}
                    {productAttributes.length > 0 ? (
                        <div className="space-y-4">
                            {productAttributes.map((attr) => {
                                const availableValues = getAvailableValues(attr.name);
                                const isSelected = selectedAttributes[attr.name];
                                
                                return (
                                    <div key={attr.name} className="space-y-2">
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                                            {attr.name}
                                            {isSelected && (
                                                <span className="text-blue-600 dark:text-blue-400 mr-2">: {isSelected}</span>
                                            )}
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {attr.values.map((value) => {
                                                const isAvailable = availableValues.includes(value);
                                                const isActive = selectedAttributes[attr.name] === value;
                                                
                                                return (
                                                    <button
                                                        key={value}
                                                        onClick={() => onAttributeSelect(attr.name, value)}
                                                        disabled={!isAvailable}
                                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all
                                                            ${isActive
                                                                ? 'bg-blue-600 dark:bg-blue-500 text-white border-2 border-blue-600 dark:border-blue-500'
                                                                : isAvailable
                                                                    ? 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-2 border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-2 border-gray-100 dark:border-gray-700 cursor-not-allowed line-through'
                                                            }
                                                        `}
                                                    >
                                                        {value}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Selected variant info & add button */}
                            {matchedVariant && (
                                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <div className="flex justify-between items-center mb-3">
                                        <div>
                                            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{matchedVariant.price} ج.م</div>
                                            <div className={`text-sm ${matchedVariant.stock > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                                                {matchedVariant.stock > 0 ? `${matchedVariant.stock} متاح` : 'نفذت الكمية'}
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            SKU: {matchedVariant.sku}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onVariantSelect(matchedVariant)}
                                        disabled={matchedVariant.stock <= 0}
                                        className={`w-full py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2
                                            ${matchedVariant.stock > 0
                                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            }
                                        `}
                                    >
                                        <PlusIcon className="w-5 h-5" />
                                        إضافة للسلة
                                    </button>
                                </div>
                            )}

                            {/* Prompt to select remaining attributes */}
                            {!allAttributesSelected && (
                                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-center text-sm text-gray-500 dark:text-gray-400">
                                    ← اختر {productAttributes.filter(a => !selectedAttributes[a.name]).map(a => a.name).join(' و ')}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Fallback: Simple variant list if no attributes found */
                        <div className="space-y-2">
                            {product.variants.map((variant) => (
                                <button
                                    key={variant.id}
                                    onClick={() => onVariantSelect(variant)}
                                    disabled={variant.stock <= 0}
                                    className={`w-full flex items-center justify-between p-3 rounded-lg border text-right transition-all
                                        ${variant.stock > 0
                                            ? 'border-gray-200 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer bg-white dark:bg-gray-700'
                                            : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-60 cursor-not-allowed'
                                        }
                                    `}
                                >
                                    <div className="flex flex-col items-start">
                                        <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                                            {variant.name || 'غير محدد'}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            SKU: {variant.sku}
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-blue-600 dark:text-blue-400 text-sm">{variant.price} ج.م</div>
                                        <div className={`text-xs mt-0.5 ${variant.stock > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                                            {variant.stock > 0 ? `${variant.stock} متاح` : 'نفذت الكمية'}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const QuickOrderModal: React.FC<QuickOrderModalProps> = ({
    isOpen,
    onClose,
    conversation,
    customerName: initialCustomerName,
    customerPhone: initialCustomerPhone,
    onOrderCreated
}) => {
    // Product Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);

    // Cart State
    const [cartItems, setCartItems] = useState<CartItem[]>([]);

    // Customer Form State
    const [phone, setPhone] = useState(initialCustomerPhone || '');
    const [customerName, setCustomerName] = useState(initialCustomerName || '');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [notes, setNotes] = useState('');

    // Shipping State
    const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);
    const [loadingShipping, setLoadingShipping] = useState(false);

    // Order State
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'products' | 'checkout'>('products');

    // Variant Selection State
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [showVariantModal, setShowVariantModal] = useState(false);
    const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});

    // Initialize customer data from conversation
    useEffect(() => {
        if (isOpen && conversation) {
            setCustomerName(initialCustomerName || conversation.customerName || '');
            setPhone(initialCustomerPhone || '');
        }
    }, [isOpen, conversation, initialCustomerName, initialCustomerPhone]);

    // Fetch products
    const fetchProducts = useCallback(async (query: string = '') => {
        try {
            setLoadingProducts(true);
            const token = authService.getAccessToken();
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            };

            const params = new URLSearchParams({
                page: '1',
                limit: '30'
            });

            const response = await fetch(`${config.apiUrl}/products?${params.toString()}`, { headers });
            const data = await response.json();

            if (data.success && data.data) {
                const mappedProducts: Product[] = data.data.map((p: any) => {
                    let imageUrl = '';
                    try {
                        if (p.images) {
                            const parsed = JSON.parse(p.images);
                            if (Array.isArray(parsed) && parsed.length > 0) imageUrl = parsed[0];
                        }
                    } catch (e) { /* ignore */ }

                    return {
                        id: p.id,
                        name: p.name,
                        price: p.price,
                        stock: p.stock,
                        sku: p.sku,
                        image: imageUrl,
                        variants: p.variants || []
                    };
                });

                const filtered = query
                    ? mappedProducts.filter(p =>
                        p.name.toLowerCase().includes(query.toLowerCase()) ||
                        p.sku?.toLowerCase().includes(query.toLowerCase())
                    )
                    : mappedProducts;

                setProducts(filtered);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            toast.error('فشل في جلب المنتجات');
        } finally {
            setLoadingProducts(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchProducts();
        }
    }, [isOpen, fetchProducts]);

    // Search with debounce
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchQuery) {
                fetchProducts(searchQuery);
            }
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, fetchProducts]);

    // Fetch shipping cost when city changes
    useEffect(() => {
        const fetchShippingCost = async () => {
            if (!city || city.length < 2) {
                setShippingInfo(null);
                return;
            }

            try {
                setLoadingShipping(true);
                const response = await apiClient.get(`/shipping-zones/find-price?governorate=${encodeURIComponent(city)}`);

                if (response.data.success) {
                    setShippingInfo(response.data.data);
                }
            } catch (error) {
                console.error('Shipping fetch error:', error);
                setShippingInfo(null);
            } finally {
                setLoadingShipping(false);
            }
        };

        const timeoutId = setTimeout(fetchShippingCost, 500);
        return () => clearTimeout(timeoutId);
    }, [city]);

    // Add to cart
    const handleAddToCart = (product: Product, variant?: ProductVariant) => {
        const itemId = variant ? `${product.id}-${variant.id}` : product.id;

        const existing = cartItems.find(item => {
            if (variant) {
                return item.productId === product.id && item.variantId === variant.id;
            }
            return item.productId === product.id && !item.variantId;
        });

        if (existing) {
            setCartItems(prev => prev.map(item => {
                const currentItemId = item.variantId ? `${item.productId}-${item.variantId}` : item.productId;
                return currentItemId === itemId
                    ? { ...item, quantity: item.quantity + 1 }
                    : item;
            }));
            toast.success('تم زيادة الكمية');
        } else {
            const price = variant ? parseFloat(String(variant.price)) : product.price;
            const image = (variant && variant.image) ? variant.image : product.image;
            const stock = variant ? variant.stock : product.stock;
            const sku = variant ? variant.sku : product.sku;

            let variantName = '';
            if (variant) {
                const parts = [];
                if (variant.color) parts.push(variant.color);
                if (variant.size) parts.push(variant.size);
                if (parts.length === 0 && variant.name) parts.push(variant.name);
                variantName = parts.join(' / ');
            }

            setCartItems(prev => [...prev, {
                productId: product.id,
                variantId: variant?.id,
                name: product.name,
                variantName,
                price,
                quantity: 1,
                image,
                stock,
                sku
            }]);
            toast.success('تمت الإضافة للسلة');
        }

        setShowVariantModal(false);
        setSelectedProduct(null);
    };

    // Handle product click
    const handleProductClick = (product: Product) => {
        if (product.variants && product.variants.length > 0) {
            setSelectedProduct(product);
            setSelectedAttributes({});
            setShowVariantModal(true);
        } else {
            handleAddToCart(product);
        }
    };

    // Update cart item quantity
    const updateQuantity = (productId: string, variantId: string | undefined, delta: number) => {
        setCartItems(prev => prev.map(item => {
            const isMatch = variantId
                ? (item.productId === productId && item.variantId === variantId)
                : (item.productId === productId && !item.variantId);

            if (isMatch) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    // Remove from cart
    const removeFromCart = (productId: string, variantId?: string) => {
        setCartItems(prev => prev.filter(item => {
            const isMatch = variantId
                ? (item.productId === productId && item.variantId === variantId)
                : (item.productId === productId && !item.variantId);
            return !isMatch;
        }));
        toast.success('تم حذف المنتج');
    };

    // Calculate totals
    const subtotal = useMemo(() =>
        cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        [cartItems]
    );

    const shippingCost = shippingInfo?.price || 0;
    const grandTotal = subtotal + shippingCost;

    // Create order
    const handleCreateOrder = async () => {
        if (cartItems.length === 0) {
            toast.error('السلة فارغة');
            return;
        }
        if (!phone || !customerName) {
            toast.error('بيانات العميل ناقصة');
            return;
        }

        try {
            setLoading(true);

            const payload = {
                products: cartItems.map(item => ({
                    productId: item.productId,
                    productName: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    variantId: item.variantId,
                    sku: item.sku
                })),
                customerId: conversation.customerId, // 🆕 ربط الطلب بالعميل الموجود
                customerPhone: phone,
                customerName: customerName.trim(),
                customerAddress: address,
                city: city,
                notes: notes,
                status: 'PENDING',
                paymentMethod: 'cod',
                extractionMethod: 'facebook_inbox',
                conversationId: conversation.id,
                platform: 'facebook',
                source: 'facebook_inbox',
                shippingCost: shippingCost,
                shippingZoneId: shippingInfo?.zoneId,
                subtotal: subtotal,
                totalAmount: grandTotal
            };

            const response = await apiClient.post('/orders-enhanced', payload);

            if (response.data.success) {
                toast.success('تم إنشاء الطلب بنجاح!');
                const orderId = response.data.order?.id || response.data.data?.id;

                if (onOrderCreated && orderId) {
                    onOrderCreated(orderId);
                }

                // Reset and close
                setCartItems([]);
                setStep('products');
                onClose();
            } else {
                toast.error('فشل إنشاء الطلب: ' + (response.data.error || 'خطأ غير معروف'));
            }
        } catch (error: any) {
            console.error('Create order error:', error);
            toast.error(error.response?.data?.message || 'حدث خطأ أثناء إنشاء الطلب');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ShoppingCartIcon className="w-6 h-6" />
                        <div>
                            <h2 className="font-bold text-lg">طلب سريع</h2>
                            <p className="text-sm text-blue-100">
                                {conversation.customerName} - {conversation.pageName || 'Facebook'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Steps Indicator */}
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setStep('products')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${step === 'products'
                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                    >
                        <span className="flex items-center justify-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 'products' ? 'bg-blue-600 dark:bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-600'
                                }`}>1</span>
                            المنتجات
                            {cartItems.length > 0 && (
                                <span className="bg-blue-600 dark:bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                                    {cartItems.length}
                                </span>
                            )}
                        </span>
                    </button>
                    <button
                        onClick={() => cartItems.length > 0 && setStep('checkout')}
                        disabled={cartItems.length === 0}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${step === 'checkout'
                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                            : cartItems.length === 0
                                ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                    >
                        <span className="flex items-center justify-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 'checkout' ? 'bg-blue-600 dark:bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-600'
                                }`}>2</span>
                            الدفع والتوصيل
                        </span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex">
                    {step === 'products' ? (
                        <>
                            {/* Products Grid */}
                            <div className="flex-1 flex flex-col overflow-hidden">
                                {/* Search */}
                                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="بحث عن منتج..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-4 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                                        />
                                        <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 absolute right-3 top-2.5" />
                                    </div>
                                </div>

                                {/* Products List */}
                                <div className="flex-1 overflow-y-auto p-4">
                                    {loadingProducts ? (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {[...Array(6)].map((_, i) => (
                                                <div key={i} className="bg-gray-100 rounded-lg h-40 animate-pulse" />
                                            ))}
                                        </div>
                                    ) : products.length === 0 ? (
                                        <div className="text-center py-10 text-gray-400 dark:text-gray-500">
                                            <ArchiveBoxIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                            <p>لا توجد منتجات</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {products.map((product) => (
                                                <div
                                                    key={product.id}
                                                    onClick={() => handleProductClick(product)}
                                                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer overflow-hidden group"
                                                >
                                                    <div className="aspect-square bg-gray-100 dark:bg-gray-700 relative">
                                                        {product.image ? (
                                                            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                                                                <ArchiveBoxIcon className="w-10 h-10" />
                                                            </div>
                                                        )}
                                                        {product.variants.length > 0 && (
                                                            <div className="absolute bottom-2 right-2 bg-blue-600 dark:bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded">
                                                                خيارات
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="p-2">
                                                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-1">{product.name}</h3>
                                                        <div className="flex items-center justify-between mt-1">
                                                            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{product.price} ج.م</span>
                                                            <button className="p-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full group-hover:bg-blue-600 dark:group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                                                <PlusIcon className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Cart Sidebar */}
                            <div className="w-72 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-900">
                                <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                        <ShoppingCartIcon className="w-5 h-5" />
                                        السلة ({cartItems.length})
                                    </h3>
                                </div>

                                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                    {cartItems.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                                            <ShoppingCartIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                            <p className="text-sm">السلة فارغة</p>
                                        </div>
                                    ) : (
                                        cartItems.map((item) => (
                                            <div key={`${item.productId}-${item.variantId || ''}`} className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-100 dark:border-gray-700">
                                                <div className="flex gap-2">
                                                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden flex-shrink-0">
                                                        {item.image ? (
                                                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                                                                <ArchiveBoxIcon className="w-6 h-6" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-xs font-medium text-gray-900 dark:text-gray-100 line-clamp-1">{item.name}</h4>
                                                        {item.variantName && (
                                                            <p className="text-[10px] text-gray-500 dark:text-gray-400">{item.variantName}</p>
                                                        )}
                                                        <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5">{item.price} ج.م</p>
                                                    </div>
                                                    <button
                                                        onClick={() => removeFromCart(item.productId, item.variantId)}
                                                        className="p-1 text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="flex items-center justify-between mt-2">
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => updateQuantity(item.productId, item.variantId, -1)}
                                                            className="p-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                                                        >
                                                            <MinusIcon className="w-3 h-3" />
                                                        </button>
                                                        <span className="w-8 text-center text-sm font-medium text-gray-900 dark:text-gray-100">{item.quantity}</span>
                                                        <button
                                                            onClick={() => updateQuantity(item.productId, item.variantId, 1)}
                                                            className="p-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                                                        >
                                                            <PlusIcon className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                                        {(item.price * item.quantity).toLocaleString()} ج.م
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Cart Total */}
                                {cartItems.length > 0 && (
                                    <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-gray-600 dark:text-gray-400">المجموع</span>
                                            <span className="font-bold text-gray-900 dark:text-gray-100">{subtotal.toLocaleString()} ج.م</span>
                                        </div>
                                        <button
                                            onClick={() => setStep('checkout')}
                                            className="w-full py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                                        >
                                            متابعة الطلب
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        /* Checkout Step */
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="max-w-2xl mx-auto space-y-6">
                                {/* Customer Info */}
                                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-4">
                                        <UserIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                        بيانات العميل
                                    </h3>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">اسم العميل <span className="text-red-500 dark:text-red-400">*</span></label>
                                            <input
                                                type="text"
                                                value={customerName}
                                                onChange={(e) => setCustomerName(e.target.value)}
                                                className="w-full border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                                                placeholder="اسم العميل"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">رقم الهاتف <span className="text-red-500 dark:text-red-400">*</span></label>
                                            <input
                                                type="text"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                className="w-full border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                                                placeholder="01xxxxxxxxx"
                                                dir="ltr"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Shipping Info */}
                                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-4">
                                        <MapPinIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                        عنوان التوصيل
                                    </h3>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">المحافظة</label>
                                            <select
                                                value={city}
                                                onChange={(e) => setCity(e.target.value)}
                                                className="w-full border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                                            >
                                                <option value="">اختر المحافظة...</option>
                                                {EGYPT_GOVERNORATES.map(gov => (
                                                    <option key={gov} value={gov}>{gov}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">العنوان بالتفصيل</label>
                                            <textarea
                                                value={address}
                                                onChange={(e) => setAddress(e.target.value)}
                                                className="w-full border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 h-20 resize-none dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                                                placeholder="اسم الشارع، رقم العمارة، علامة مميزة..."
                                            />
                                        </div>

                                        {/* Shipping Cost */}
                                        {loadingShipping ? (
                                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                                <div className="w-4 h-4 border-2 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
                                                جاري حساب تكلفة الشحن...
                                            </div>
                                        ) : shippingInfo?.zoneId ? (
                                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                                                        <TruckIcon className="w-4 h-4" />
                                                        تكلفة الشحن
                                                    </span>
                                                    <span className="font-bold text-green-700 dark:text-green-400">{shippingInfo.price.toLocaleString()} ج.م</span>
                                                </div>
                                                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                                                    مدة التوصيل: {shippingInfo.deliveryTime}
                                                </div>
                                            </div>
                                        ) : city ? (
                                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                                                <div className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-400">
                                                    <ExclamationTriangleIcon className="w-4 h-4" />
                                                    لا توجد منطقة شحن لهذه المحافظة
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>

                                {/* Notes */}
                                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">ملاحظات (اختياري)</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="w-full border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 h-16 resize-none text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                                        placeholder="أي ملاحظات إضافية..."
                                    />
                                </div>

                                {/* Order Summary */}
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">ملخص الطلب</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">المنتجات ({cartItems.reduce((acc, item) => acc + item.quantity, 0)} قطعة)</span>
                                            <span className="font-medium text-gray-900 dark:text-gray-100">{subtotal.toLocaleString()} ج.م</span>
                                        </div>
                                        {shippingCost > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">الشحن</span>
                                                <span className="font-medium text-gray-900 dark:text-gray-100">+{shippingCost.toLocaleString()} ج.م</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-lg font-bold pt-2 border-t border-blue-200 dark:border-blue-800">
                                            <span className="text-gray-900 dark:text-gray-100">الإجمالي</span>
                                            <span className="text-blue-600 dark:text-blue-400">{grandTotal.toLocaleString()} ج.م</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
                    <button
                        onClick={step === 'checkout' ? () => setStep('products') : onClose}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        {step === 'checkout' ? 'رجوع' : 'إلغاء'}
                    </button>

                    {step === 'checkout' && (
                        <button
                            onClick={handleCreateOrder}
                            disabled={loading || cartItems.length === 0 || !phone || !customerName}
                            className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${loading || cartItems.length === 0 || !phone || !customerName
                                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                : 'bg-green-600 dark:bg-green-500 text-white hover:bg-green-700 dark:hover:bg-green-600'
                                }`}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <CheckCircleIcon className="w-5 h-5" />
                            )}
                            إنشاء الطلب ({grandTotal.toLocaleString()} ج.م)
                        </button>
                    )}
                </div>

                {/* Variant Selection Modal - Same as ManualOrder */}
                {showVariantModal && selectedProduct && (
                    <VariantSelectionModal
                        product={selectedProduct}
                        selectedAttributes={selectedAttributes}
                        onAttributeSelect={(attrName, value) => {
                            setSelectedAttributes(prev => ({ ...prev, [attrName]: value }));
                        }}
                        onVariantSelect={(variant) => {
                            handleAddToCart(selectedProduct, variant);
                            setSelectedAttributes({});
                        }}
                        onClose={() => {
                            setShowVariantModal(false);
                            setSelectedProduct(null);
                            setSelectedAttributes({});
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default QuickOrderModal;
