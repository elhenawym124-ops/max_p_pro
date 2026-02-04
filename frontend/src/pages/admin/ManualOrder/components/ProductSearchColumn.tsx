import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MagnifyingGlassIcon, PlusIcon, ArchiveBoxIcon, XMarkIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { authService } from '../../../../services/authService';
import { config } from '../../../../config';
import { toast } from 'react-hot-toast';

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

interface Product {
    id: string;
    name: string;
    price: number;
    image: string;
    stock: number;
    sku: string;
    variants: ProductVariant[];
}

interface ProductSearchColumnProps {
    onAddToCart: (product: Product, variant?: ProductVariant) => void;
}

// Helper function to parse variant metadata and extract attributeValues
const parseVariantAttributes = (variant: ProductVariant): Record<string, string> => {
    // First try attributeValues directly
    if (variant.attributeValues && Object.keys(variant.attributeValues).length > 0) {
        return variant.attributeValues;
    }

    // Then try metadata - استخراج من WooCommerce attributes
    if (variant.metadata) {
        try {
            const metadata = typeof variant.metadata === 'string' ? JSON.parse(variant.metadata) : variant.metadata;

            // ✅ استخراج من attributes المستوردة من WooCommerce
            if (metadata.attributes && Array.isArray(metadata.attributes)) {
                const attrs: Record<string, string> = {};
                metadata.attributes.forEach((attr: any) => {
                    if (attr.type === 'color') {
                        attrs['اللون'] = attr.option;
                    } else if (attr.type === 'size') {
                        attrs['المقاس'] = attr.option;
                    } else if (attr.type === 'material') {
                        attrs['المادة'] = attr.option;
                    } else if (attr.type === 'style') {
                        attrs['النمط'] = attr.option;
                    } else if (attr.option) {
                        // استخدام اسم الـ attribute كما هو
                        const attrName = attr.name || 'خاصية';
                        attrs[attrName] = attr.option;
                    }
                });

                if (Object.keys(attrs).length > 0) {
                    return attrs;
                }
            }

            // محاولة استخراج من attributeValues
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

    // Fallback: Try to extract from variant name
    if (variant.name) {
        // محاولة استخراج من اسم المتغير بصيغة "اللون: أحمر | المقاس: 38"
        const pipePattern = /([^:]+):\s*([^|]+)/g;
        const attrs: Record<string, string> = {};
        let match;

        while ((match = pipePattern.exec(variant.name)) !== null) {
            const key = match[1].trim();
            const value = match[2].trim();
            attrs[key] = value;
        }

        if (Object.keys(attrs).length > 0) {
            return attrs;
        }

        // محاولة استخراج من صيغة "بيفليل - 54"
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

    // Sort attributes to ensure consistent order
    return Object.entries(attributeMap)
        .filter(([_, values]) => values.size > 0)
        .map(([name, values]) => ({
            name,
            values: Array.from(values).sort()
        }));
};

const ProductSearchColumn: React.FC<ProductSearchColumnProps> = ({ onAddToCart }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);

    // Variant Selection State
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Multi-level selection state
    const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});

    // Debounce search could be better, but let's keep it simple for now
    const fetchProducts = useCallback(async (query: string = '') => {
        try {
            setLoading(true);
            const token = authService.getAccessToken();
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            };

            const params = new URLSearchParams({
                page: '1',
                limit: '50', // Increase limit for better search experience
                manualOrder: 'true', // ✅ Request all products for manual order
                // search: query // If backend supports it
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
                    ? mappedProducts.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || p.sku.toLowerCase().includes(query.toLowerCase()))
                    : mappedProducts;

                setProducts(filtered);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            toast.error('فشل في جلب المنتجات');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);


    const handleProductClick = (product: Product) => {
        if (product.variants && product.variants.length > 0) {
            setSelectedProduct(product);
            setSelectedAttributes({});
            setIsModalOpen(true);
        } else {
            onAddToCart(product);
        }
    };

    const handleVariantSelect = (variant: ProductVariant) => {
        if (selectedProduct) {
            onAddToCart(selectedProduct, variant);
            setIsModalOpen(false);
            setSelectedProduct(null);
            setSelectedAttributes({});
        }
    };

    const handleAttributeSelect = (attrName: string, value: string) => {
        setSelectedAttributes(prev => ({
            ...prev,
            [attrName]: value
        }));
    };

    // Extract attributes from selected product
    const productAttributes = useMemo(() => {
        if (!selectedProduct) return [];
        return extractAttributes(selectedProduct.variants);
    }, [selectedProduct]);

    // Filter variants based on selected attributes
    const filteredVariants = useMemo(() => {
        if (!selectedProduct) return [];

        return selectedProduct.variants.filter(variant => {
            const variantAttrs = parseVariantAttributes(variant);
            return Object.entries(selectedAttributes).every(([key, value]) => {
                return variantAttrs[key] === value;
            });
        });
    }, [selectedProduct, selectedAttributes]);

    // Get available values for each attribute based on current selection
    const getAvailableValues = (attrName: string): string[] => {
        if (!selectedProduct) return [];

        // Filter variants based on all OTHER selected attributes (not this one)
        const otherSelections = { ...selectedAttributes };
        delete otherSelections[attrName];

        const availableVariants = selectedProduct.variants.filter(variant => {
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
        <div className="flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden relative" style={{ height: '100%', maxHeight: '100%' }}>
            {/* Search Header */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">المنتجات</h2>
                <div className="relative">
                    <input
                        id="manual-order-product-search"
                        type="text"
                        placeholder="بحث باسم المنتج أو SKU..."
                        className="w-full pl-4 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') fetchProducts(searchQuery);
                        }}
                    />
                    <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 absolute right-3 top-2.5" />
                </div>
            </div>

            {/* Product List */}
            <div className="flex-1 overflow-y-auto min-h-0 p-2 manual-order-scroll manual-order-column">
                {loading ? (
                    <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 p-3">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden animate-pulse">
                                <div className="aspect-square bg-gray-200 dark:bg-gray-700" />
                                <div className="p-3 space-y-2">
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                                    <div className="flex justify-between items-center mt-2">
                                        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16" />
                                        <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : products.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 dark:text-gray-500">
                        <ArchiveBoxIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>لا توجد منتجات</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 p-3">
                        {products.map((product) => (
                            <div
                                key={product.id}
                                className="flex flex-col bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all group cursor-pointer overflow-hidden relative"
                                onClick={() => handleProductClick(product)}
                            >
                                {/* Image - Now larger and on top */}
                                <div className="aspect-square bg-gray-100 dark:bg-gray-700 relative">
                                    {product.image ? (
                                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                                            <ArchiveBoxIcon className="w-12 h-12" />
                                        </div>
                                    )}

                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 dark:group-hover:bg-black/10 transition-colors" />

                                    {/* Stock Badge */}
                                    {product.stock <= 5 && (
                                        <div className="absolute top-2 left-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur text-red-600 dark:text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm border border-red-100 dark:border-red-900">
                                            متبقي {product.stock}
                                        </div>
                                    )}

                                    {/* Variant Badge */}
                                    {product.variants.length > 0 && (
                                        <div className="absolute bottom-2 right-2 bg-blue-600 dark:bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm">
                                            خيارات متعددة
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="p-3">
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 h-10 leading-snug mb-1" title={product.name}>
                                        {product.name}
                                    </h3>

                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-base font-bold text-blue-600 dark:text-blue-400">{product.price} ج.م</span>

                                        <button
                                            className="p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleProductClick(product);
                                            }}
                                        >
                                            <PlusIcon className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 truncate">
                                        SKU: {product.sku || 'N/A'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Variant Selection Modal */}
            {isModalOpen && selectedProduct && (
                <div className="absolute inset-0 z-50 bg-black/50 dark:bg-gray-900/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 truncate pr-4">{selectedProduct.name}</h3>
                            <button
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setSelectedAttributes({});
                                }}
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
                                                                onClick={() => handleAttributeSelect(attr.name, value)}
                                                                disabled={!isAvailable}
                                                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all
                                                                    ${isActive
                                                                        ? 'bg-blue-600 dark:bg-blue-500 text-white border-2 border-blue-600 dark:border-blue-500'
                                                                        : isAvailable
                                                                            ? 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-2 border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                                                            : 'bg-gray-100 dark:bg-gray-900 text-gray-400 dark:text-gray-500 border-2 border-gray-100 dark:border-gray-800 cursor-not-allowed line-through'
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
                                        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
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
                                                onClick={() => handleVariantSelect(matchedVariant)}
                                                disabled={matchedVariant.stock <= 0}
                                                className={`w-full py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2
                                                    ${matchedVariant.stock > 0
                                                        ? 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                                                        : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
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
                                        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-center text-sm text-gray-500 dark:text-gray-400">
                                            <ChevronRightIcon className="w-4 h-4 inline ml-1" />
                                            اختر {productAttributes.filter(a => !selectedAttributes[a.name]).map(a => a.name).join(' و ')}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* Fallback: Simple variant list if no attributes found */
                                <div className="space-y-2">
                                    {selectedProduct.variants.map((variant) => (
                                        <button
                                            key={variant.id}
                                            onClick={() => handleVariantSelect(variant)}
                                            disabled={variant.stock <= 0}
                                            className={`w-full flex items-center justify-between p-3 rounded-lg border text-right transition-all
                                                ${variant.stock > 0
                                                    ? 'border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer bg-white dark:bg-gray-700'
                                                    : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 opacity-60 cursor-not-allowed'
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
            )}
        </div>
    );
};

export default ProductSearchColumn;
