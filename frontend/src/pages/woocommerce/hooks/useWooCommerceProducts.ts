import { useState } from 'react';
import toast from 'react-hot-toast';
import { WooProduct, Settings } from '../types';

export const useWooCommerceProducts = (settings: Settings | null) => {
    const [wooProducts, setWooProducts] = useState<WooProduct[]>([]);
    const [selectedWooProducts, setSelectedWooProducts] = useState<Set<string>>(new Set());
    const [importingProducts, setImportingProducts] = useState(false);
    const [fetchingProducts, setFetchingProducts] = useState(false);

    // Variants State
    const [selectedVariants, setSelectedVariants] = useState<Map<string, Set<string>>>(new Map());
    const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
    const [variantFilter, setVariantFilter] = useState<'all' | 'color' | 'size' | 'composite'>('all');

    const fetchWooProducts = async () => {
        if (!settings?.hasCredentials) {
            toast.error('يرجى إعداد بيانات الاتصال أولاً');
            return;
        }

        setFetchingProducts(true);
        setWooProducts([]);
        try {
            const response = await fetch('/api/v1/woocommerce/fetch-products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                },
                body: JSON.stringify({
                    storeUrl: settings.storeUrl,
                    // Note: consumerKey/Secret are handled by backend controller if cached
                })
            });

            const data = await response.json();
            if (data.success) {
                setWooProducts(data.data.products);
                toast.success(`تم جلب ${data.data.products.length} منتج`);
            } else {
                toast.error(data.message);
            }
        } catch (error: any) {
            toast.error('خطأ في جلب المنتجات');
        } finally {
            setFetchingProducts(false);
        }
    };

    const importSelectedProducts = async () => {
        if (selectedWooProducts.size === 0) return;

        setImportingProducts(true);
        try {
            const productsToImport = wooProducts.filter(p => selectedWooProducts.has(p.wooCommerceId))
                .map(p => {
                    // Include selected variants only
                    const selectedVars = selectedVariants.get(p.wooCommerceId);
                    if (p.variations && selectedVars && selectedVars.size > 0) {
                        return {
                            ...p,
                            variations: p.variations.filter(v => selectedVars.has(v.wooCommerceVariationId))
                        };
                    }
                    return p;
                });

            const response = await fetch('/api/v1/woocommerce/import-selected', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                },
                body: JSON.stringify({ products: productsToImport })
            });

            const data = await response.json();
            if (data.success) {
                toast.success(`تم استيراد ${data.data.imported} منتج، وتحديث ${data.data.updated}`);
                setSelectedWooProducts(new Set());
                setSelectedVariants(new Map());
            } else {
                toast.error(data.message);
            }
        } catch (error: any) {
            toast.error('خطأ في استيراد المنتجات');
        } finally {
            setImportingProducts(false);
        }
    };

    // Helper functions for variants (same logic as before)
    const toggleVariantSelection = (productId: string, variationId: string) => {
        const newSelected = new Map(selectedVariants);
        const productVariants = newSelected.get(productId) || new Set();

        if (productVariants.has(variationId)) {
            productVariants.delete(variationId);
        } else {
            productVariants.add(variationId);
        }

        if (productVariants.size === 0) {
            newSelected.delete(productId);

            // Also uncheck the main product if no variants are selected
            const newSelectedProducts = new Set(selectedWooProducts);
            newSelectedProducts.delete(productId);
            setSelectedWooProducts(newSelectedProducts);
        } else {
            newSelected.set(productId, productVariants);

            // Auto check main product
            const newSelectedProducts = new Set(selectedWooProducts);
            newSelectedProducts.add(productId);
            setSelectedWooProducts(newSelectedProducts);
        }

        setSelectedVariants(newSelected);
    };

    const selectAllVariantsForProduct = (productId: string) => {
        const product = wooProducts.find(p => p.wooCommerceId === productId);
        if (!product || !product.variations) return;

        const newSelected = new Map(selectedVariants);
        const variantIds = new Set(product.variations.map(v => v.wooCommerceVariationId));
        newSelected.set(productId, variantIds);
        setSelectedVariants(newSelected);

        const newSelectedProducts = new Set(selectedWooProducts);
        newSelectedProducts.add(productId);
        setSelectedWooProducts(newSelectedProducts);
    };

    const deselectAllVariantsForProduct = (productId: string) => {
        const newSelected = new Map(selectedVariants);
        newSelected.delete(productId);
        setSelectedVariants(newSelected);
    };

    const groupVariantsByType = (variations: any[]) => {
        const types: Record<string, boolean> = { color: false, size: false, other: false };
        variations.forEach(v => {
            v.attributes.forEach((attr: any) => {
                if (attr.type === 'color') types['color'] = true;
                else if (attr.type === 'size') types['size'] = true;
                else types['other'] = true;
            });
        });
        return types;
    };

    const selectVariantsByType = (productId: string, type: 'color' | 'size') => {
        const product = wooProducts.find(p => p.wooCommerceId === productId);
        if (!product || !product.variations) return;

        const newSelected = new Map(selectedVariants);
        const productVariants = newSelected.get(productId) || new Set();

        product.variations.forEach(v => {
            const hasType = v.attributes.some((attr: any) => attr.type === type);
            if (hasType) productVariants.add(v.wooCommerceVariationId);
        });

        newSelected.set(productId, productVariants);
        setSelectedVariants(newSelected);

        const newSelectedProducts = new Set(selectedWooProducts);
        newSelectedProducts.add(productId);
        setSelectedWooProducts(newSelectedProducts);
    };

    return {
        wooProducts,
        fetchingProducts,
        importingProducts,
        selectedWooProducts,
        setSelectedWooProducts,
        selectedVariants,
        setSelectedVariants,
        expandedProduct,
        setExpandedProduct,
        variantFilter,
        setVariantFilter,
        fetchWooProducts,
        importSelectedProducts,
        toggleVariantSelection,
        selectAllVariantsForProduct,
        deselectAllVariantsForProduct,
        groupVariantsByType,
        selectVariantsByType
    };
};
