import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ProductSearchColumn from './components/ProductSearchColumn';
import CartColumn from './components/CartColumn';
import CheckoutColumn from './components/CheckoutColumn';
import { toast } from 'react-hot-toast';
import { CartItem } from './types';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

const ManualOrderPage = () => {
    const { t } = useTranslation();
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [showShortcuts, setShowShortcuts] = useState(false);

    // إخفاء scroll من الـ main عند فتح الصفحة
    useEffect(() => {
        const mainElement = document.querySelector('main');
        if (mainElement) {
            mainElement.style.overflow = 'hidden';
            mainElement.style.padding = '0';
        }
        return () => {
            if (mainElement) {
                mainElement.style.overflow = '';
                mainElement.style.padding = '';
            }
        };
    }, []);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in input/textarea
            const target = e.target as HTMLElement;
            const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

            // F1 - Show shortcuts help
            if (e.key === 'F1') {
                e.preventDefault();
                setShowShortcuts(prev => !prev);
            }

            // F2 - Focus product search (works even when typing)
            if (e.key === 'F2') {
                e.preventDefault();
                // استخدام ID محدد لبحث المنتجات
                const productSearchInput = document.getElementById('manual-order-product-search') as HTMLInputElement;
                if (productSearchInput) productSearchInput.focus();
            }

            // Escape - Clear focus / Close modals
            if (e.key === 'Escape') {
                (document.activeElement as HTMLElement)?.blur();
                setShowShortcuts(false);
            }

            // Only process these shortcuts when NOT typing
            if (!isTyping) {
                // Ctrl+Delete - Clear cart
                if (e.ctrlKey && e.key === 'Delete') {
                    e.preventDefault();
                    if (cartItems.length > 0) {
                        setCartItems([]);
                        toast.success(t('manualOrder.cartCleared'));
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cartItems]);

    const handleAddToCart = (product: any, variant?: any) => {
        // Create unique ID based on product AND variant
        const itemId = variant ? `${product.id}-${variant.id}` : product.id;

        const existing = cartItems.find(item => {
            if (variant) {
                return item.productId === product.id && item.variantId === variant.id;
            }
            return item.productId === product.id && !item.variantId;
        });

        if (existing) {
            toast.success(t('manualOrder.quantityIncreased'));
            setCartItems(prev => prev.map(item => {
                const currentItemId = item.variantId ? `${item.productId}-${item.variantId}` : item.productId;
                return currentItemId === itemId
                    ? { ...item, quantity: item.quantity + 1 }
                    : item;
            }));
        } else {
            toast.success(t('manualOrder.addedToCart'));

            // Determine price and image
            const price = variant ? parseFloat(variant.price) : product.price;
            const image = (variant && variant.image) ? variant.image : product.image;
            const stock = variant ? variant.stock : product.stock;
            const sku = variant ? variant.sku : product.sku;

            // Construct variant name
            let variantName = '';
            if (variant) {
                const parts = [];
                if (variant.color) parts.push(variant.color);
                if (variant.size) parts.push(variant.size);
                variantName = parts.join(' / ');
            }

            // Get base markup for affiliate (from AffiliateProduct)
            const baseMarkup = product.baseMarkup || 0;

            setCartItems(prev => [...prev, {
                productId: product.id,
                variantId: variant?.id,
                name: product.name,
                variantName: variantName,
                price: price + baseMarkup, // Include base markup in price
                originalPrice: price,
                markup: baseMarkup, // Pre-fill with base commission
                quantity: 1,
                image: image,
                stock: stock,
                color: variant?.color,
                size: variant?.size,
                sku: sku
            }]);
        }
    };

    const handleUpdateItem = (productId: string, updates: Partial<CartItem>, variantId?: string) => {
        setCartItems(prev => prev.map(item => {
            const isMatch = variantId
                ? (item.productId === productId && item.variantId === variantId)
                : (item.productId === productId && !item.variantId);

            return isMatch ? { ...item, ...updates } : item;
        }));
    };

    const handleRemoveItem = (productId: string, variantId?: string) => {
        setCartItems(prev => prev.filter(item => {
            const isMatch = variantId
                ? (item.productId === productId && item.variantId === variantId)
                : (item.productId === productId && !item.variantId);
            return !isMatch;
        }));
        toast.success(t('manualOrder.productRemoved'));
    };

    return (
        <div className="bg-gray-50/50 dark:bg-gray-900 flex flex-col p-4" style={{ height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
            {/* Keyboard Shortcuts Help Button */}
            <button
                onClick={() => setShowShortcuts(prev => !prev)}
                className="absolute top-2 left-2 z-10 p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title={`${t('manualOrder.keyboardShortcuts')} (F1)`}
            >
                <InformationCircleIcon className="w-5 h-5" />
            </button>

            {/* Shortcuts Modal */}
            {showShortcuts && (
                <div className="fixed inset-0 z-50 bg-black/50 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowShortcuts(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                            <h3 className="font-bold text-gray-900 dark:text-gray-100">{t('manualOrder.keyboardShortcuts')}</h3>
                        </div>
                        <div className="p-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-300">{t('manualOrder.showShortcuts')}</span>
                                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono text-gray-900 dark:text-gray-100">F1</kbd>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-300">{t('manualOrder.searchProduct')}</span>
                                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono text-gray-900 dark:text-gray-100">F2</kbd>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-300">{t('manualOrder.clearCart')}</span>
                                <div className="flex gap-1">
                                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono text-gray-900 dark:text-gray-100">Ctrl</kbd>
                                    <span className="text-gray-600 dark:text-gray-300">+</span>
                                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono text-gray-900 dark:text-gray-100">Delete</kbd>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-300">{t('manualOrder.closeCancel')}</span>
                                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono text-gray-900 dark:text-gray-100">Esc</kbd>
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                            <button
                                onClick={() => setShowShortcuts(false)}
                                className="w-full py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-700 dark:hover:bg-blue-600"
                            >
                                {t('manualOrder.ok')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
                {/* Product Search - 5 Cols */}
                <div className="col-span-12 lg:col-span-5 overflow-hidden">
                    <ProductSearchColumn onAddToCart={handleAddToCart} />
                </div>

                {/* Cart Items - 3 Cols (Smaller) */}
                <div className="col-span-12 lg:col-span-3 overflow-hidden">
                    <CartColumn
                        items={cartItems}
                        onUpdateItem={handleUpdateItem}
                        onRemoveItem={handleRemoveItem}
                    />
                </div>

                {/* Checkout & Customer - 4 Cols (Wider) */}
                <div className="col-span-12 lg:col-span-4 overflow-hidden">
                    <CheckoutColumn
                        cartItems={cartItems}
                        onClearCart={() => setCartItems([])}
                    />
                </div>
            </div>
        </div>
    );
};

export default ManualOrderPage;
