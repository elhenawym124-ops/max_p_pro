import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    MagnifyingGlassIcon,
    XMarkIcon,
    PlusIcon,
    ArchiveBoxIcon
} from '@heroicons/react/24/outline';
import { authService } from '../../../services/authService';
import { config } from '../../../config';
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

interface SimplifiedProductSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProductSelected: (product: Product, variant?: ProductVariant) => void;
}

// Helper function to parse variant metadata and extract attributeValues
const parseVariantAttributes = (variant: ProductVariant): Record<string, string> => {
    if (variant.attributeValues && Object.keys(variant.attributeValues).length > 0) {
        return variant.attributeValues;
    }

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
                        const attrName = attr.name || 'خاصية';
                        attrs[attrName] = attr.option;
                    }
                });

                if (Object.keys(attrs).length > 0) {
                    return attrs;
                }
            }

            if (metadata.attributeValues && Object.keys(metadata.attributeValues).length > 0) {
                return metadata.attributeValues;
            }
        } catch { }
    }

    if (variant.color || variant.size) {
        const attrs: Record<string, string> = {};
        if (variant.color) attrs['اللون'] = variant.color;
        if (variant.size) attrs['المقاس'] = variant.size;
        return attrs;
    }

    if (variant.name) {
        // محاولة استخراج من اسم المتغير بصيغة "اللون: أحمر | المقاس: 38"
        const pipePattern = /([^:]+):\s*([^|]+)/g;
        const attrs: Record<string, string> = {};
        let match;

        while ((match = pipePattern.exec(variant.name)) !== null) {
            if (match[1] && match[2]) {
                const key = match[1].trim();
                const value = match[2].trim();
                attrs[key] = value;
            }
        }

        if (Object.keys(attrs).length > 0) {
            return attrs;
        }

        const parts = variant.name.split(/\s*[-–]\s*/);
        if (parts.length >= 2 && parts[0] && parts[1]) {
            return {
                'اللون': parts[0].trim(),
                'المقاس': parts[1].trim()
            };
        } else if (parts.length === 1 && parts[0] && variant.type) {
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

const SimplifiedProductSelectionModal: React.FC<SimplifiedProductSelectionModalProps> = ({
    isOpen,
    onClose,
    onProductSelected
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});

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
                    } catch (e) { }

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
        if (isOpen) {
            fetchProducts();
            setSearchQuery('');
            setSelectedProduct(null);
            setSelectedAttributes({});
        }
    }, [isOpen, fetchProducts]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchQuery) fetchProducts(searchQuery);
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, fetchProducts]);

    const handleProductClick = (product: Product) => {
        if (product.variants && product.variants.length > 0) {
            setSelectedProduct(product);
            setSelectedAttributes({});
        } else {
            // ✅ Check stock for products without variants
            if (product.stock !== undefined && product.stock <= 0) {
                toast.error('هذا المنتج غير متوفر في المخزون');
                return;
            }
            onProductSelected(product);
        }
    };

    const handleVariantSelect = (variant: ProductVariant) => {
        if (selectedProduct) {
            // ✅ Check stock
            if (variant.stock !== undefined && variant.stock <= 0) {
                toast.error('هذا المنتج غير متوفر في المخزون');
                return;
            }

            onProductSelected(selectedProduct, variant);
            setSelectedProduct(null);
            setSelectedAttributes({});
        }
    };

    const productAttributes = useMemo(() => {
        if (!selectedProduct) return [];
        return extractAttributes(selectedProduct.variants);
    }, [selectedProduct]);

    const filteredVariants = useMemo(() => {
        if (!selectedProduct) return [];
        return selectedProduct.variants.filter(variant => {
            const variantAttrs = parseVariantAttributes(variant);
            return Object.entries(selectedAttributes).every(([key, value]) => variantAttrs[key] === value);
        });
    }, [selectedProduct, selectedAttributes]);

    const getAvailableValues = (attrName: string): string[] => {
        if (!selectedProduct) return [];
        const otherSelections = { ...selectedAttributes };
        delete otherSelections[attrName];

        const availableVariants = selectedProduct.variants.filter(variant => {
            const variantAttrs = parseVariantAttributes(variant);
            return Object.entries(otherSelections).every(([key, value]) => variantAttrs[key] === value);
        });

        const values = new Set<string>();
        availableVariants.forEach(variant => {
            const variantAttrs = parseVariantAttributes(variant);
            if (variantAttrs[attrName]) values.add(variantAttrs[attrName]);
        });

        return Array.from(values);
    };

    const allAttributesSelected = productAttributes.length > 0 &&
        productAttributes.every(attr => selectedAttributes[attr.name]);

    const matchedVariant = useMemo(() => {
        if (!allAttributesSelected || filteredVariants.length !== 1) return null;
        return filteredVariants[0];
    }, [allAttributesSelected, filteredVariants]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-blue-600 dark:text-blue-400">
                            <PlusIcon className="w-5 h-5" />
                        </div>
                        <h2 className="font-bold text-lg text-gray-900 dark:text-gray-100">إضافة منتج للطلب</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-400 dark:text-gray-500 transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left Side: Product List & Search */}
                    <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 border-l border-gray-100 dark:border-gray-700">
                        <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                            <div className="relative">
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="بحث باسم المنتج أو SKU..."
                                    className="w-full pl-4 pr-11 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-gray-100 outline-none transition-all"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <MagnifyingGlassIcon className="w-6 h-6 text-gray-400 absolute right-3.5 top-3" />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {loading ? (
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className="animate-pulse bg-gray-50 dark:bg-gray-900/50 rounded-xl h-48 border border-gray-100 dark:border-gray-800" />
                                    ))}
                                </div>
                            ) : products.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
                                    <ArchiveBoxIcon className="w-16 h-16 mb-4 opacity-20" />
                                    <p className="text-lg">لا توجد منتجات مطابقة</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                    {products.map((product) => (
                                        <div
                                            key={product.id}
                                            onClick={() => handleProductClick(product)}
                                            className={`group relative flex flex-col bg-white dark:bg-gray-800 border-2 rounded-xl overflow-hidden transition-all cursor-pointer h-full ${selectedProduct?.id === product.id
                                                ? 'border-blue-600 dark:border-blue-500 ring-2 ring-blue-50 dark:ring-blue-900/20'
                                                : 'border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md'
                                                }`}
                                        >
                                            <div className="aspect-square bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
                                                {product.image ? (
                                                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-200 dark:text-gray-700">
                                                        <ArchiveBoxIcon className="w-12 h-12" />
                                                    </div>
                                                )}
                                                {product.variants.length > 0 && (
                                                    <div className="absolute top-2 right-2 px-2 py-1 bg-blue-600/90 backdrop-blur-sm text-white text-[10px] font-bold rounded-lg shadow-sm">
                                                        خيارات
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-3 bg-white dark:bg-gray-800">
                                                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 mb-1">{product.name}</h3>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-blue-600 dark:text-blue-400 font-bold">{product.price} ج.م</span>
                                                    <div className="text-[10px] text-gray-400 truncate max-w-[60px]">SKU: {product.sku || 'N/A'}</div>
                                                </div>
                                                {/* Stock indicator */}
                                                {product.stock !== undefined && (
                                                    <div className="mt-1">
                                                        {product.stock <= 0 ? (
                                                            <span className="text-[10px] text-red-500 font-semibold">نفذ من المخزون</span>
                                                        ) : product.stock < 5 ? (
                                                            <span className="text-[10px] text-orange-500 font-semibold">متبقي {product.stock}</span>
                                                        ) : (
                                                            <span className="text-[10px] text-green-500 font-semibold">متوفر</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Side: Variant Selection (Dynamic) */}
                    <div className={`w-80 flex flex-col bg-gray-50/50 dark:bg-gray-900/30 transition-all ${selectedProduct ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
                        {selectedProduct ? (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                                    <h3 className="font-bold text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug">{selectedProduct.name}</h3>
                                    <p className="text-blue-600 dark:text-blue-400 font-bold mt-1 text-lg">{selectedProduct.price} ج.م</p>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                                    {productAttributes.length > 0 ? (
                                        productAttributes.map((attr) => {
                                            const availableValues = getAvailableValues(attr.name);
                                            const isSelected = selectedAttributes[attr.name];

                                            return (
                                                <div key={attr.name} className="space-y-3">
                                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                                                        {attr.name}
                                                        {isSelected && <span className="text-blue-600 dark:text-blue-400 text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 rounded-full">{isSelected}</span>}
                                                    </label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {attr.values.map((value) => {
                                                            const isAvailable = availableValues.includes(value);
                                                            const isActive = selectedAttributes[attr.name] === value;

                                                            return (
                                                                <button
                                                                    key={value}
                                                                    onClick={() => setSelectedAttributes(prev => ({ ...prev, [attr.name]: value }))}
                                                                    disabled={!isAvailable}
                                                                    className={`px-3 py-2.5 min-w-[3rem] rounded-xl text-sm font-semibold transition-all border-2
                                                                        ${isActive
                                                                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none'
                                                                            : isAvailable
                                                                                ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm'
                                                                                : 'bg-gray-100 dark:bg-gray-800 border-gray-100 dark:border-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed line-through'
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
                                        })
                                    ) : (
                                        /* Fallback for simple variant list */
                                        <div className="space-y-2">
                                            {selectedProduct.variants.map((variant) => (
                                                <button
                                                    key={variant.id}
                                                    onClick={() => handleVariantSelect(variant)}
                                                    disabled={variant.stock !== undefined && variant.stock <= 0}
                                                    className={`w-full text-right p-3 rounded-xl border-2 transition-all ${variant.stock !== undefined && variant.stock <= 0
                                                        ? 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 opacity-50 cursor-not-allowed'
                                                        : 'border-gray-100 dark:border-gray-700 hover:border-blue-500 bg-white dark:bg-gray-800'
                                                        }`}
                                                >
                                                    <div className="font-bold text-gray-900 dark:text-gray-100">{variant.name}</div>
                                                    <div className="flex justify-between items-center mt-1">
                                                        <span className="text-blue-600 dark:text-blue-400 text-sm font-semibold">
                                                            {variant.price && parseFloat(variant.price as any) > 0 ? `${variant.price} ج.م` : `${product.price} ج.م`}
                                                        </span>
                                                        {variant.stock !== undefined && (
                                                            variant.stock <= 0 ? (
                                                                <span className="text-[10px] text-red-500 font-semibold">نفذ</span>
                                                            ) : variant.stock < 5 ? (
                                                                <span className="text-[10px] text-orange-500 font-semibold">متبقي {variant.stock}</span>
                                                            ) : (
                                                                <span className="text-[10px] text-green-500 font-semibold">متوفر</span>
                                                            )
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                                    {matchedVariant ? (
                                        <button
                                            onClick={() => handleVariantSelect(matchedVariant)}
                                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-100 dark:shadow-none flex items-center justify-center gap-2"
                                        >
                                            <PlusIcon className="w-5 h-5" />
                                            تأكيد الإضافة
                                        </button>
                                    ) : (
                                        <div className="py-4 px-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl text-center border-2 border-dashed border-gray-200 dark:border-gray-700">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {!allAttributesSelected
                                                    ? `يرجى اختيار ${productAttributes.filter(a => !selectedAttributes[a.name]).map(a => a.name).join(' و ')}`
                                                    : 'المزيج المختار غير متوفر'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 grayscale opacity-50">
                                <ArchiveBoxIcon className="w-16 h-16 mb-4 text-gray-300" />
                                <h4 className="font-bold text-gray-400">اختر منتجاً</h4>
                                <p className="text-sm text-gray-400 mt-2">اختر منتجاً من القائمة الجانبية لتخصيص الخيارات</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SimplifiedProductSelectionModal;
