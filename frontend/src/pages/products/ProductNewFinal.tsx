import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../hooks/useCurrency';
import { getCurrencyByCode } from '../../utils/currency';
import { authService } from '../../services/authService';
import { apiClient } from '../../services/apiClient';
import { productApi, uploadFiles, deleteFile } from '../../utils/apiHelpers';
import RichTextEditor from '../../components/RichTextEditor';
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  CubeIcon,
  PhotoIcon,
  SwatchIcon,
  TruckIcon,
  Cog6ToothIcon,
  PlusIcon,
  XMarkIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import ThemeToggle from '../../components/ui/theme-toggle';

interface ProductFormData {
  name: string;
  description: string;
  slug?: string;
  price: number;
  comparePrice?: number | undefined;
  cost?: number | undefined;
  sku: string;
  category: string;
  stock: number;
  trackInventory: boolean;
  lowStockThreshold: number;
  isActive: boolean;
  enableCheckoutForm: boolean;
  showAddToCartButton: boolean;
  saleStartDate: string;
  saleEndDate: string;
  sizeGuide: string; // 📏 دليل المقاسات
  tags: string[];
  weight?: number | undefined;
  dimensions?: { length?: number; width?: number; height?: number; } | undefined;
  // New features
  isFeatured?: boolean;
  featuredPriority?: number;
  shippingClass?: string;
  excludeFromFreeShipping?: boolean;
  affiliateCommission?: number;
  commissionType: string;
}

interface Category {
  id: string;
  name: string;
}

// Product Attribute for generating variations
interface ProductAttribute {
  id: string;
  name: string;                      // مثل: اللون، الحجم
  slug: string;                      // مثل: color, size
  values: string[];                  // مثل: ["أحمر", "أزرق", "أخضر"]
  visible: boolean;                  // عرض في صفحة المنتج
  forVariations: boolean;            // استخدام في المتغيرات
}

interface ProductVariant {
  id?: string;
  name: string;
  type: string;
  sku: string;
  price?: number;
  comparePrice?: number;
  cost?: number;
  images: string[];
  stock: number;
  trackInventory: boolean;
  isActive: boolean;
  sortOrder: number;
  metadata?: any;
  // New fields
  image?: string;                    // صورة المتغير الرئيسية
  description?: string;              // وصف المتغير
  weight?: number;                   // الوزن
  dimensions?: {                     // الأبعاد
    length?: number;
    width?: number;
    height?: number;
  };
  shippingClass?: string;            // فئة الشحن
  allowBackorders?: boolean;         // السماح بالطلبات المسبقة
  lowStockThreshold?: number;        // حد المخزون المنخفض
  // Attribute values for this variant
  attributeValues?: { [key: string]: string }; // مثل: { color: "أحمر", size: "كبير" }
}

const ProductNewFinal: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const { currency } = useCurrency();
  const { t } = useTranslation();

  const currencyInfo = getCurrencyByCode(currency || 'EGP');
  const displayCurrency = currencyInfo?.symbol || 'ج.م';

  const [loading, setLoading] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Arabic to Franco mapping
  const arabicToFranco: { [key: string]: string } = {
    'ا': 'a', 'أ': 'a', 'إ': 'e', 'آ': 'a', 'ء': 'a',
    'ب': 'b', 'ت': 't', 'ث': 'th',
    'ج': 'g', 'ح': '7', 'خ': 'kh',
    'د': 'd', 'ذ': 'dh',
    'ر': 'r', 'ز': 'z',
    'س': 's', 'ش': 'sh',
    'ص': 's', 'ض': 'd',
    'ط': 't', 'ظ': 'z',
    'ع': '3', 'غ': 'gh',
    'ف': 'f', 'ق': 'q',
    'ك': 'k', 'ل': 'l',
    'م': 'm', 'ن': 'n',
    'ه': 'h', 'ة': 'a', 'و': 'o', 'ؤ': 'o',
    'ي': 'y', 'ى': 'a', 'ئ': 'e'
  };

  const transliterateArabicToFranco = (text: string): string => {
    return text.split('').map(char => arabicToFranco[char] || char).join('');
  };
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('basic');

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    slug: '',
    price: 0,
    comparePrice: undefined,
    cost: undefined,
    sku: '',
    category: '',
    stock: 0,
    trackInventory: true,
    lowStockThreshold: 5,
    isActive: true,
    enableCheckoutForm: true,
    showAddToCartButton: true,
    saleStartDate: '',
    saleEndDate: '',
    sizeGuide: '', // 📏 دليل المقاسات
    tags: [],
    weight: undefined,
    dimensions: undefined,
    // New features
    isFeatured: false,
    featuredPriority: 0,
    shippingClass: 'standard',
    excludeFromFreeShipping: false,
    affiliateCommission: 0,
    commissionType: 'PERCENTAGE',
  });

  const [newTag, setNewTag] = useState('');
  const [showDimensions, setShowDimensions] = useState(false);
  const [showVariants, setShowVariants] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [deletedVariantIds, setDeletedVariantIds] = useState<string[]>([]); // تتبع المتغيرات المحذوفة
  const [images, setImages] = useState<File[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Recommended Products
  const [relatedProducts, setRelatedProducts] = useState<string[]>([]);
  const [upsellProducts, setUpsellProducts] = useState<string[]>([]);
  const [crossSellProducts, setCrossSellProducts] = useState<string[]>([]);
  const [relatedInput, setRelatedInput] = useState('');
  const [upsellInput, setUpsellInput] = useState('');
  const [crossSellInput, setCrossSellInput] = useState('');

  // Product Attributes System
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [newAttributeName, setNewAttributeName] = useState('');
  const [newAttributeValuesList, setNewAttributeValuesList] = useState<string[]>(['']);
  const [selectedVariants, setSelectedVariants] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkValue, setBulkValue] = useState<string>('');
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [attributeMode, setAttributeMode] = useState<'templates' | 'custom'>('templates');

  // Custom Variant Display Settings
  const [variantSettings, setVariantSettings] = useState<{
    styles: { [key: string]: 'buttons' | 'circles' | 'dropdown' | 'thumbnails' | 'radio' };
    attributeImages: { [key: string]: { [value: string]: string } };
  }>({ styles: {}, attributeImages: {} });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiClient.get('/products/categories');
        const data = response.data;
        if (data.success && data.data) {
          setCategories(data.data);
        } else if (Array.isArray(data)) {
          setCategories(data);
        }
      } catch (err) {
        console.error('Error loading categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // دالة تحميل بيانات المنتج (يمكن استدعاؤها من أي مكان)
  const fetchProduct = useCallback(async () => {
    if (!isEditMode || !id) return;
    setLoadingProduct(true);
    try {
      const response = await apiClient.get(`/products/${id}`);
      const data = response.data;

      if (data.success && data.data) {
        const product = data.data;

        // تحديث بيانات النموذج
        // Ensure description is a string
        const descriptionValue = product.description ? String(product.description) : '';

        setFormData({
          name: product.name || '',
          description: descriptionValue,
          slug: product.slug || '',
          price: parseFloat(product.price) || 0,
          comparePrice: product.comparePrice ? parseFloat(product.comparePrice) : undefined,
          cost: product.cost ? parseFloat(product.cost) : undefined,
          sku: product.sku || '',
          category: product.categoryId || '',
          stock: product.stock || 0,
          trackInventory: product.trackInventory !== false,
          lowStockThreshold: product.lowStockThreshold || 5,
          isActive: product.isActive !== false,
          enableCheckoutForm: product.enableCheckoutForm !== false,
          showAddToCartButton: product.showAddToCartButton !== false,
          saleStartDate: product.saleStartDate ? product.saleStartDate.split('T')[0] : '',
          saleEndDate: product.saleEndDate ? product.saleEndDate.split('T')[0] : '',
          sizeGuide: product.sizeGuide || '', // 📏 دليل المقاسات
          tags: product.tags ? (typeof product.tags === 'string' ? JSON.parse(product.tags) : product.tags) : [],
          weight: product.weight ? parseFloat(product.weight) : undefined,
          dimensions: product.dimensions ? (typeof product.dimensions === 'string' ? JSON.parse(product.dimensions) : product.dimensions) : undefined,
          isFeatured: product.isFeatured || false,
          featuredPriority: product.featuredPriority || 0,
          shippingClass: product.shippingClass || 'standard',
          excludeFromFreeShipping: product.excludeFromFreeShipping || false,
          affiliateCommission: product.affiliateCommission ? parseFloat(product.affiliateCommission) : 0,
          commissionType: product.commissionType || 'PERCENTAGE',
        });

        // تحميل الصور
        if (product.images) {
          const imgs = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
          setUploadedImages(imgs || []);
        }

        // تحميل الـ attributes من metadata أولاً (إذا كانت موجودة)
        let savedAttributes: ProductAttribute[] = [];
        if (product.metadata) {
          try {
            const metadata = typeof product.metadata === 'string'
              ? JSON.parse(product.metadata)
              : product.metadata;

            if (metadata.attributes && Array.isArray(metadata.attributes) && metadata.attributes.length > 0) {
              savedAttributes = metadata.attributes;
              setAttributes(savedAttributes);
            }
          } catch (e) {
            console.error('Error parsing product metadata for attributes:', e);
          }
        }

        // تحميل المتغيرات
        if (product.variants && product.variants.length > 0) {
          const loadedVariants = product.variants.map((v: any) => {
            // معالجة metadata
            let parsedMetadata = null;
            let attributeValues = {};
            let description = '';
            let dimensions = {};
            let weight = undefined;
            let shippingClass = 'standard';
            let allowBackorders = false;
            let lowStockThreshold = 5;
            let image = null;

            if (v.metadata) {
              try {
                parsedMetadata = typeof v.metadata === 'string' ? JSON.parse(v.metadata) : v.metadata;
                attributeValues = parsedMetadata.attributeValues || {};
                description = parsedMetadata.description || '';
                dimensions = parsedMetadata.dimensions || {};
                weight = parsedMetadata.weight;
                shippingClass = parsedMetadata.shippingClass || 'standard';
                allowBackorders = parsedMetadata.allowBackorders || false;
                lowStockThreshold = parsedMetadata.lowStockThreshold || 5;
                image = parsedMetadata.image || null;
              } catch (e) {
                // ignore parse errors
              }
            }

            return {
              id: v.id,
              name: v.name || '',
              type: v.type || 'color',
              sku: v.sku || '',
              price: v.price ? parseFloat(v.price) : undefined,
              comparePrice: v.comparePrice ? parseFloat(v.comparePrice) : undefined,
              cost: v.cost ? parseFloat(v.cost) : undefined,
              images: v.images ? (typeof v.images === 'string' ? JSON.parse(v.images) : v.images) : [],
              stock: v.stock || 0,
              trackInventory: v.trackInventory !== false,
              isActive: v.isActive !== false,
              sortOrder: v.sortOrder || 0,
              metadata: v.metadata,
              image: image || v.image,
              description: description || v.description || '',
              weight: weight || (v.weight ? parseFloat(v.weight) : undefined),
              dimensions: Object.keys(dimensions).length > 0 ? dimensions : (v.dimensions ? (typeof v.dimensions === 'string' ? JSON.parse(v.dimensions) : v.dimensions) : {}),
              shippingClass: shippingClass || v.shippingClass || 'standard',
              allowBackorders: allowBackorders || v.allowBackorders || false,
              lowStockThreshold: lowStockThreshold || v.lowStockThreshold || 5,
              attributeValues: Object.keys(attributeValues).length > 0 ? attributeValues : (v.attributeValues ? (typeof v.attributeValues === 'string' ? JSON.parse(v.attributeValues) : v.attributeValues) : {}),
            };
          });
          setVariants(loadedVariants);
          setDeletedVariantIds([]); // مسح قائمة المحذوفات عند تحميل المنتج
          setShowVariants(true);

          // استخراج الـ attributes من المتغيرات فقط إذا لم تكن موجودة في metadata
          if (loadedVariants.length > 0 && savedAttributes.length === 0) {
            const extractedAttributes: { [key: string]: Set<string> } = {};

            loadedVariants.forEach((variant: any) => {
              // محاولة استخراج من attributeValues أولاً (إذا كان موجوداً في metadata)
              let attributeValues = null;
              if (variant.metadata) {
                try {
                  const metadata = typeof variant.metadata === 'string' ? JSON.parse(variant.metadata) : variant.metadata;
                  attributeValues = metadata.attributeValues || null;
                } catch (e) {
                  // ignore
                }
              }

              if (attributeValues && typeof attributeValues === 'object') {
                Object.keys(attributeValues).forEach(attrKey => {
                  if (!extractedAttributes[attrKey]) {
                    extractedAttributes[attrKey] = new Set();
                  }
                  extractedAttributes[attrKey].add(attributeValues[attrKey]);
                });
              } else if (variant.name) {
                // محاولة استخراج من الاسم (مثل: "أحمر - كبير" أو "أحمر/كبير")
                const separators = [' - ', ' / ', ' | ', '-', '/', '|'];
                let parts: string[] = [];

                for (const sep of separators) {
                  if (variant.name.includes(sep)) {
                    parts = variant.name.split(sep).map((p: string) => p.trim()).filter((p: string) => p);
                    break;
                  }
                }

                if (parts.length === 0) {
                  parts = [variant.name.trim()];
                }

                if (parts.length > 0) {
                  // إذا كان هناك جزء واحد فقط، نستخدم type كاسم الصفة
                  if (parts.length === 1) {
                    const attrName = variant.type === 'color' ? 'اللون' :
                      variant.type === 'size' ? 'الحجم' :
                        variant.type || 'النوع';
                    if (!extractedAttributes[attrName]) {
                      extractedAttributes[attrName] = new Set();
                    }
                    if (parts[0]) {
                      extractedAttributes[attrName].add(parts[0]);
                    }
                  } else {
                    // إذا كان هناك أجزاء متعددة، نستخدم أسماء افتراضية
                    const defaultNames = ['اللون', 'الحجم', 'النمط', 'المادة'];
                    parts.forEach((part: string, idx: number) => {
                      const attrKey = defaultNames[idx] || `صفة ${idx + 1}`;
                      if (!extractedAttributes[attrKey]) {
                        extractedAttributes[attrKey] = new Set();
                      }
                      extractedAttributes[attrKey].add(part);
                    });
                  }
                }
              }
            });

            // تحويل إلى ProductAttribute format
            const newAttributes: ProductAttribute[] = Object.keys(extractedAttributes).map((attrKey, idx) => ({
              id: `extracted-${attrKey}-${idx}-${Date.now()}`,
              name: attrKey,
              slug: attrKey.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
              values: extractedAttributes[attrKey] ? Array.from(extractedAttributes[attrKey]) : [],
              visible: true,
              forVariations: true,
            }));

            if (newAttributes.length > 0) {
              setAttributes(prev => {
                // تجنب التكرار
                const existingSlugs = new Set(prev.map(a => a.slug));
                const uniqueNew = newAttributes.filter(a => !existingSlugs.has(a.slug));
                if (uniqueNew.length > 0) {
                  return [...prev, ...uniqueNew];
                }
                return prev;
              });
            }
          }
        }

        // إظهار الأبعاد إذا كانت موجودة
        if (product.dimensions) {
          setShowDimensions(true);
        }

        // تحميل إعدادات العرض المخصصة من Metadata
        if (product.metadata) {
          try {
            const metadata = typeof product.metadata === 'string'
              ? JSON.parse(product.metadata)
              : product.metadata;

            if (metadata.variantSettings) {
              setVariantSettings(metadata.variantSettings);
            }
          } catch (e) {
            console.error('Error parsing product metadata:', e);
          }
        }
      } else {
        setError('فشل في تحميل بيانات المنتج');
      }
    } catch (err: any) {
      console.error('Error loading product:', err);
      if (err.response?.status === 403) {
        setError('غير مصرح لك بالوصول إلى هذا المنتج. سيتم إعادة توجيهك...');
        setTimeout(() => navigate('/products'), 2000);
      } else if (err.response?.status === 404) {
        setError('المنتج غير موجود. سيتم إعادة توجيهك...');
        setTimeout(() => navigate('/products'), 2000);
      } else {
        setError('فشل في تحميل بيانات المنتج');
      }
    } finally {
      setLoadingProduct(false);
    }
  }, [id, isEditMode]);

  // تحميل بيانات المنتج عند التعديل
  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  // استخراج الـ attributes من المتغيرات بعد تحميلها
  useEffect(() => {
    if (isEditMode && variants.length > 0) {
      // التحقق من وجود attributes للمتغيرات
      const hasVariationAttributes = attributes.some(a => a.forVariations);

      if (!hasVariationAttributes) {
        const extractedAttributes: { [key: string]: Set<string> } = {};

        variants.forEach((variant: ProductVariant) => {
          // محاولة استخراج من attributeValues في metadata
          let attributeValues = null;
          if (variant.metadata) {
            try {
              const metadata = typeof variant.metadata === 'string' ? JSON.parse(variant.metadata) : variant.metadata;
              attributeValues = metadata.attributeValues || null;
            } catch (e) {
              // ignore
            }
          }

          if (variant.attributeValues && typeof variant.attributeValues === 'object') {
            Object.keys(variant.attributeValues).forEach(attrKey => {
              if (!extractedAttributes[attrKey]) {
                extractedAttributes[attrKey] = new Set();
              }
              if (variant.attributeValues && variant.attributeValues[attrKey]) {
                extractedAttributes[attrKey].add(variant.attributeValues[attrKey]);
              }
            });
          } else if (attributeValues && typeof attributeValues === 'object') {
            Object.keys(attributeValues).forEach(attrKey => {
              if (!extractedAttributes[attrKey]) {
                extractedAttributes[attrKey] = new Set();
              }
              extractedAttributes[attrKey].add(attributeValues[attrKey]);
            });
          } else if (variant.name) {
            // محاولة استخراج من الاسم
            const separators = [' - ', ' / ', ' | ', '-', '/', '|'];
            let parts: string[] = [];

            for (const sep of separators) {
              if (variant.name.includes(sep)) {
                parts = variant.name.split(sep).map(p => p.trim()).filter(p => p);
                break;
              }
            }

            if (parts.length === 0) {
              parts = [variant.name.trim()];
            }

            if (parts.length > 0) {
              if (parts.length === 1) {
                const attrName = variant.type === 'color' ? 'اللون' :
                  variant.type === 'size' ? 'الحجم' :
                    variant.type || 'النوع';
                if (!extractedAttributes[attrName]) {
                  extractedAttributes[attrName] = new Set();
                }
                extractedAttributes[attrName].add(parts[0]);
              } else {
                const defaultNames = ['اللون', 'الحجم', 'النمط', 'المادة'];
                parts.forEach((part: string, idx: number) => {
                  const attrKey = defaultNames[idx] || `صفة ${idx + 1}`;
                  if (!extractedAttributes[attrKey]) {
                    extractedAttributes[attrKey] = new Set();
                  }
                  extractedAttributes[attrKey].add(part);
                });
              }
            }
          }
        });

        // تحويل إلى ProductAttribute format
        const newAttributes: ProductAttribute[] = Object.keys(extractedAttributes).map((attrKey, idx) => ({
          id: `extracted-${attrKey}-${idx}-${Date.now()}`,
          name: attrKey,
          slug: attrKey.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          values: Array.from(extractedAttributes[attrKey]),
          visible: true,
          forVariations: true,
        }));

        if (newAttributes.length > 0) {
          setAttributes(prev => {
            const existingSlugs = new Set(prev.map(a => a.slug));
            const uniqueNew = newAttributes.filter(a => !existingSlugs.has(a.slug));
            return uniqueNew.length > 0 ? [...prev, ...uniqueNew] : prev;
          });
        }
      }
    }
  }, [variants, isEditMode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: value === '' ? undefined : parseFloat(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleDimensionChange = (dimension: 'length' | 'width' | 'height', value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    setFormData(prev => ({
      ...prev,
      dimensions: { ...prev.dimensions, [dimension]: numValue },
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }));
  };

  const addVariant = () => {
    const baseVariant: ProductVariant = {
      name: '',
      type: 'color',
      sku: '',
      images: [],
      stock: 0,
      trackInventory: formData.trackInventory,
      isActive: true,
      sortOrder: variants.length,
      // New fields with defaults
      image: undefined,
      description: '',
      weight: undefined,
      dimensions: {},
      shippingClass: 'standard',
      allowBackorders: false,
      lowStockThreshold: 5,
      attributeValues: {}
    };
    setVariants(prev => [...prev, baseVariant]);
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    setVariants(prev => prev.map((variant, i) => i === index ? { ...variant, [field]: value } : variant));
  };

  const removeVariant = (index: number) => {
    const variantToRemove = variants[index];
    // إذا كان المتغير له id (موجود في قاعدة البيانات)، نضيفه لقائمة المحذوفات
    if (variantToRemove?.id) {
      setDeletedVariantIds(prev => [...prev, variantToRemove.id!]);
    }
    setVariants(prev => prev.filter((_, i) => i !== index));
    setSelectedVariants(prev => prev.filter(i => i !== index).map(i => i > index ? i - 1 : i));
  };

  // ===== Attributes Management =====
  const addAttribute = () => {
    if (!newAttributeName.trim()) return;

    const values = newAttributeValuesList.map(v => v.trim()).filter(v => v);
    if (values.length === 0) return;

    const newAttr: ProductAttribute = {
      id: `attr_${Date.now()}`,
      name: newAttributeName.trim(),
      slug: newAttributeName.trim().toLowerCase().replace(/\s+/g, '_'),
      values: values,
      visible: true,
      forVariations: true
    };

    setAttributes(prev => [...prev, newAttr]);
    setNewAttributeName('');
    setNewAttributeValuesList(['']);
  };

  // Add new value field
  const addValueField = () => {
    setNewAttributeValuesList(prev => [...prev, '']);
  };

  // Update value at index
  const updateValueField = (index: number, value: string) => {
    setNewAttributeValuesList(prev => prev.map((v, i) => i === index ? value : v));
  };

  // Remove value field
  const removeValueField = (index: number) => {
    if (newAttributeValuesList.length > 1) {
      setNewAttributeValuesList(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Handle Enter key to add new field
  const handleValueKeyPress = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const currentValue = newAttributeValuesList[index];
      if (currentValue && currentValue.trim()) {
        addValueField();
        // Focus on new field after render
        setTimeout(() => {
          const inputs = document.querySelectorAll('.attribute-value-input');
          const lastInput = inputs[inputs.length - 1] as HTMLInputElement;
          if (lastInput) lastInput.focus();
        }, 50);
      }
    }
  };

  const removeAttribute = (id: string) => {
    setAttributes(prev => prev.filter(attr => attr.id !== id));
  };

  const updateAttributeValues = (id: string, newValues: string) => {
    const values = newValues.split('|').map(v => v.trim()).filter(v => v);
    setAttributes(prev => prev.map(attr =>
      attr.id === id ? { ...attr, values } : attr
    ));
  };

  // Generate all possible variations from attributes
  const generateVariations = () => {
    const variationAttributes = attributes.filter(attr => attr.forVariations && attr.values.length > 0);
    if (variationAttributes.length === 0) return;

    // Generate all combinations
    const combinations: { [key: string]: string }[][] = variationAttributes.map(attr =>
      attr.values.map(value => ({ [attr.slug]: value }))
    );

    const allCombinations = combinations.reduce((acc, curr) => {
      if (acc.length === 0) return curr.map(item => [item]);
      return acc.flatMap(combo => curr.map(item => [...combo, item]));
    }, [] as { [key: string]: string }[][]);

    // Create variants from combinations
    const newVariants: ProductVariant[] = allCombinations.map((combo, idx) => {
      const attributeValues = combo.reduce((acc, curr) => ({ ...acc, ...curr }), {});
      const name = Object.values(attributeValues).join(' - ');

      // توليد SKU فريد باستخدام timestamp
      const timestamp = Date.now();
      const uniqueSku = formData.sku && formData.sku !== '-'
        ? `${formData.sku}-${idx + 1}-${timestamp}`
        : `VAR-${timestamp}-${idx + 1}`;

      return {
        name,
        type: 'combination',
        sku: uniqueSku,
        images: [],
        stock: 0,
        trackInventory: formData.trackInventory,
        isActive: true,
        sortOrder: idx,
        description: '',
        dimensions: {},
        shippingClass: 'standard',
        allowBackorders: false,
        lowStockThreshold: 5,
        attributeValues
      };
    });

    setVariants(newVariants);
    setShowVariants(true);
  };

  // ===== Bulk Actions =====
  const toggleVariantSelection = (index: number) => {
    setSelectedVariants(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const selectAllVariants = () => {
    if (selectedVariants.length === variants.length) {
      setSelectedVariants([]);
    } else {
      setSelectedVariants(variants.map((_, i) => i));
    }
  };

  // Check if bulk action needs input value
  const bulkActionsNeedingInput = [
    'set_price', 'increase_price', 'decrease_price', 'increase_price_percent', 'decrease_price_percent',
    'set_compare_price', 'set_cost', 'set_stock', 'set_low_stock',
    'set_weight', 'set_length', 'set_width', 'set_height', 'set_shipping_class'
  ];

  const handleBulkActionChange = (action: string) => {
    setBulkAction(action);
    setShowBulkInput(bulkActionsNeedingInput.includes(action));
    setBulkValue('');
  };

  const applyBulkAction = () => {
    if (!bulkAction || variants.length === 0) return;

    const numValue = parseFloat(bulkValue) || 0;

    switch (bulkAction) {
      // === Status ===
      case 'activate':
        setVariants(prev => prev.map(v => ({ ...v, isActive: true })));
        break;
      case 'deactivate':
        setVariants(prev => prev.map(v => ({ ...v, isActive: false })));
        break;
      case 'delete':
        if (confirm(`هل أنت متأكد من حذف كل المتغيرات (${variants.length})؟`)) {
          setVariants([]);
        }
        break;

      // === Pricing ===
      case 'set_price':
        setVariants(prev => prev.map(v => ({ ...v, price: numValue })));
        break;
      case 'increase_price':
        setVariants(prev => prev.map(v => ({ ...v, price: (v.price || 0) + numValue })));
        break;
      case 'decrease_price':
        setVariants(prev => prev.map(v => ({ ...v, price: Math.max(0, (v.price || 0) - numValue) })));
        break;
      case 'increase_price_percent':
        setVariants(prev => prev.map(v => ({ ...v, price: (v.price || 0) * (1 + numValue / 100) })));
        break;
      case 'decrease_price_percent':
        setVariants(prev => prev.map(v => ({ ...v, price: Math.max(0, (v.price || 0) * (1 - numValue / 100)) })));
        break;
      case 'set_compare_price':
        setVariants(prev => prev.map(v => ({ ...v, comparePrice: numValue })));
        break;
      case 'set_cost':
        setVariants(prev => prev.map(v => ({ ...v, cost: numValue })));
        break;

      // === Inventory ===
      case 'track_inventory':
        setVariants(prev => prev.map(v => ({ ...v, trackInventory: true })));
        break;
      case 'untrack_inventory':
        setVariants(prev => prev.map(v => ({ ...v, trackInventory: false })));
        break;
      case 'set_stock':
        setVariants(prev => prev.map(v => ({ ...v, stock: Math.floor(numValue), trackInventory: true })));
        break;
      case 'set_low_stock':
        setVariants(prev => prev.map(v => ({ ...v, lowStockThreshold: Math.floor(numValue) })));
        break;
      case 'in_stock':
        setVariants(prev => prev.map(v => ({ ...v, stock: v.stock || 10, trackInventory: true })));
        break;
      case 'out_of_stock':
        setVariants(prev => prev.map(v => ({ ...v, stock: 0, trackInventory: true })));
        break;
      case 'allow_backorders':
        setVariants(prev => prev.map(v => ({ ...v, allowBackorders: true })));
        break;
      case 'disallow_backorders':
        setVariants(prev => prev.map(v => ({ ...v, allowBackorders: false })));
        break;

      // === Shipping ===
      case 'set_weight':
        setVariants(prev => prev.map(v => ({ ...v, weight: numValue })));
        break;
      case 'set_length':
        setVariants(prev => prev.map(v => ({ ...v, dimensions: { ...v.dimensions, length: numValue } })));
        break;
      case 'set_width':
        setVariants(prev => prev.map(v => ({ ...v, dimensions: { ...v.dimensions, width: numValue } })));
        break;
      case 'set_height':
        setVariants(prev => prev.map(v => ({ ...v, dimensions: { ...v.dimensions, height: numValue } })));
        break;
      case 'set_shipping_class':
        setVariants(prev => prev.map(v => ({ ...v, shippingClass: bulkValue })));
        break;
    }

    setBulkAction('');
    setBulkValue('');
    setShowBulkInput(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setImages(selectedFiles);
      uploadImages(selectedFiles);
    }
  };

  const uploadImages = async (filesToUpload: File[]) => {
    if (filesToUpload.length === 0) return;
    setUploading(true);
    try {
      const data = await uploadFiles(filesToUpload);
      if (data.success) {
        const imageUrls = data.data.map((file: any) => file.fullUrl);
        setUploadedImages(prev => [...prev, ...imageUrls]);
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const removeUploadedImage = async (imageUrl: string, index: number) => {
    try {
      const filename = imageUrl.split('/').pop();
      if (filename) await deleteFile(filename);
      setUploadedImages(prev => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error('Error removing image:', error);
    }
  };

  // Upload variant image
  const uploadVariantImage = async (variantIndex: number, file: File) => {
    try {
      const data = await uploadFiles([file]);
      if (data.success && data.data.length > 0) {
        const imageUrl = data.data[0].fullUrl;
        updateVariant(variantIndex, 'image', imageUrl);
      }
    } catch (error) {
      console.error('Variant image upload error:', error);
    }
  };

  const handleVariantImageChange = (variantIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadVariantImage(variantIndex, e.target.files[0]);
    }
  };

  // دالة التحقق من صحة البيانات
  // دالة مساعدة لتنظيف بيانات المتغير قبل الإرسال
  const cleanVariantData = (variant: ProductVariant): any => {
    // تحويل images إلى JSON string إذا كان array
    let imagesStr = null;
    if (variant.images && Array.isArray(variant.images) && variant.images.length > 0) {
      imagesStr = JSON.stringify(variant.images);
    } else if (typeof variant.images === 'string') {
      imagesStr = variant.images;
    }

    const variantData: any = {
      name: variant.name,
      type: variant.type || 'color',
      sku: variant.sku || null,
      price: variant.price !== undefined ? variant.price : null,
      comparePrice: variant.comparePrice !== undefined ? variant.comparePrice : null,
      cost: variant.cost !== undefined ? variant.cost : null,
      images: imagesStr,
      stock: variant.stock !== undefined ? variant.stock : 0,
      trackInventory: variant.trackInventory !== undefined ? variant.trackInventory : true,
      isActive: variant.isActive !== undefined ? variant.isActive : true,
      sortOrder: variant.sortOrder !== undefined ? variant.sortOrder : 0,
    };

    // Always include metadata, even if empty, to ensure backend updates/clears it
    variantData.metadata = JSON.stringify({
      attributeValues: variant.attributeValues || null,
      description: variant.description || null,
      dimensions: variant.dimensions || null,
      weight: variant.weight || null,
      shippingClass: variant.shippingClass || null,
      allowBackorders: variant.allowBackorders || null,
      lowStockThreshold: variant.lowStockThreshold || null,
      image: variant.image || null,
    });

    return variantData;
  };

  const validateForm = (): string | null => {
    // التحقق من الحقول المطلوبة
    if (!formData.name || formData.name.trim() === '') {
      setActiveTab('basic');
      return t('products.validation.productNameRequired');
    }

    if (!formData.price || formData.price <= 0) {
      setActiveTab('pricing');
      return t('products.validation.priceRequired');
    }

    if (!formData.category || formData.category.trim() === '') {
      setActiveTab('basic');
      return t('products.validation.categoryRequired');
    }

    // التحقق من السعر القديم
    if (formData.comparePrice && formData.comparePrice <= formData.price) {
      setActiveTab('pricing');
      return t('products.validation.comparePriceError');
    }

    // التحقق من المخزون
    if (formData.trackInventory && formData.stock < 0) {
      setActiveTab('inventory');
      return t('products.validation.stockError');
    }

    // التحقق من تواريخ العرض
    if (formData.saleStartDate && formData.saleEndDate) {
      const startDate = new Date(formData.saleStartDate);
      const endDate = new Date(formData.saleEndDate);
      if (endDate <= startDate) {
        setActiveTab('pricing');
        return t('products.validation.dateRangeError');
      }
    }

    // التحقق من المتغيرات
    if (variants.length > 0) {
      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i];
        if (!variant || !variant.name || variant.name.trim() === '') {
          setActiveTab('variants');
          return t('products.validation.variantNameRequired', { number: i + 1 });
        }
        if (variant.price !== undefined && variant.price < 0) {
          setActiveTab('variants');
          return t('products.validation.variantPriceError', { name: variant.name });
        }
        if (variant.trackInventory && variant.stock < 0) {
          setActiveTab('variants');
          return t('products.validation.variantStockError', { name: variant.name });
        }
      }
    }

    return null; // لا يوجد أخطاء
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // التحقق من صحة البيانات أولاً
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      // تحويل الصور base64 إلى URLs قبل الحفظ
      let processedDescription = formData.description;

      // البحث عن جميع الصور base64 في الوصف
      const base64ImageRegex = /<img[^>]+src=["'](data:image\/[^"']+)["'][^>]*>/gi;
      const base64Matches = [...processedDescription.matchAll(base64ImageRegex)];

      if (base64Matches.length > 0) {
        for (const match of base64Matches) {
          const base64Data = match[1];
          try {
            // تحويل base64 إلى File
            const base64Response = await fetch(base64Data);
            const blob = await base64Response.blob();
            const file = new File([blob], `image-${Date.now()}.png`, { type: blob.type });

            // رفع الصورة
            const uploadResult = await uploadFiles([file]);
            if (uploadResult.success && uploadResult.data?.[0]) {
              const imageUrl = uploadResult.data[0].fullUrl || uploadResult.data[0].url;

              // استبدال base64 بـ URL
              processedDescription = processedDescription.replace(base64Data, imageUrl);
            }
          } catch (error: any) {
            console.error('❌ [ProductNewFinal] Error converting base64 image:', error);
            // نترك الصورة base64 كما هي إذا فشل التحويل
          }
        }
      }

      // إرسال الحقول الموجودة فقط في Prisma Schema
      const productData = {
        name: formData.name,
        description: processedDescription,
        slug: formData.slug || null,
        price: formData.price,
        comparePrice: formData.comparePrice || null,
        cost: formData.cost || null,
        sku: formData.sku || null,
        category: formData.category, // سيتم تحويله لـ categoryId في الـ Backend
        stock: formData.trackInventory ? formData.stock : 0,
        trackInventory: formData.trackInventory,
        isActive: formData.isActive,
        isFeatured: formData.isFeatured || false,
        enableCheckoutForm: formData.enableCheckoutForm,
        showAddToCartButton: formData.showAddToCartButton,
        saleStartDate: formData.saleStartDate ? new Date(formData.saleStartDate).toISOString() : null,
        saleEndDate: formData.saleEndDate ? new Date(formData.saleEndDate).toISOString() : null,
        sizeGuide: formData.sizeGuide?.trim() || null, // 📏 دليل المقاسات
        tags: formData.tags,
        weight: formData.weight || null,
        dimensions: formData.dimensions || null,
        images: uploadedImages,
        affiliateCommission: formData.affiliateCommission || 0,
        commissionType: formData.commissionType,
        metadata: JSON.stringify({
          variantSettings,
          attributes: attributes // حفظ الـ attributes في metadata
        }),
      };

      let result;

      if (isEditMode && id) {
        // تحديث المنتج - استخدام PATCH بدلاً من PUT
        const response = await apiClient.patch(`/products/${id}`, productData);
        result = response.data;

        if (result.success) {
          // حذف المتغيرات المحذوفة أولاً
          for (const variantId of deletedVariantIds) {
            try {
              await apiClient.delete(`/products/${id}/variants/${variantId}`);
            } catch (deleteError: any) {
              console.error(`❌ [VARIANT] Error deleting variant ${variantId}:`, deleteError);
            }
          }
          // مسح قائمة المحذوفات
          setDeletedVariantIds([]);

          // تحديث المتغيرات
          for (const variant of variants) {
            const cleanedVariant = cleanVariantData(variant);
            try {
              if (variant.id) {
                // تحديث متغير موجود - استخدام PUT للمتغيرات
                await apiClient.put(`/products/${id}/variants/${variant.id}`, cleanedVariant);
              } else {
                // إنشاء متغير جديد
                await productApi.createVariant(id, cleanedVariant);
              }
            } catch (variantError: any) {
              console.error(`❌ [VARIANT] Error processing variant:`, variantError);
            }
          }
          // إعادة تحميل بيانات المنتج بدلاً من إعادة التوجيه
          setSuccessMessage(t('products.messages.productUpdated'));
          setTimeout(() => setSuccessMessage(null), 3000);
          // إعادة تحميل بيانات المنتج لتحديث المتغيرات
          await fetchProduct();
        } else {
          setError(result.message || t('products.messages.productError'));
        }
      } else {
        // إنشاء منتج جديد
        const response = await productApi.create(productData);
        result = await response.json();

        if (result.success) {
          const productId = result.data?.id;
          if (variants.length > 0 && productId) {
            for (const variant of variants) {
              try {
                // تنظيف البيانات المرسلة - إرسال الحقول المتوقعة فقط من الـ backend
                const variantData = cleanVariantData(variant);
                await productApi.createVariant(productId, variantData);
              } catch (variantError: any) {
                console.error(`Error creating variant:`, variantError);
              }
            }
          }
          setSuccess(true);
          setTimeout(() => navigate('/products'), 2000);
        } else {
          setError(result.message || t('products.messages.productCreationError'));
        }
      }
    } catch (err: any) {
      console.error('Error saving product:', err);
      setError(err.response?.data?.message || (isEditMode ? t('products.messages.productError') : t('products.messages.productCreationError')));
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'basic', label: t('products.tabs.basic'), icon: <DocumentTextIcon className="w-5 h-5" /> },
    { id: 'pricing', label: t('products.tabs.pricing'), icon: <CurrencyDollarIcon className="w-5 h-5" /> },
    { id: 'inventory', label: t('products.tabs.inventory'), icon: <CubeIcon className="w-5 h-5" /> },
    { id: 'media', label: t('products.tabs.media'), icon: <PhotoIcon className="w-5 h-5" />, badge: uploadedImages.length > 0 ? String(uploadedImages.length) : undefined },
    { id: 'attributes', label: t('products.tabs.attributes'), icon: <SwatchIcon className="w-5 h-5" />, badge: attributes.length > 0 ? String(attributes.length) : undefined },
    { id: 'variants', label: t('products.tabs.variants'), icon: <CubeIcon className="w-5 h-5" />, badge: variants.length > 0 ? String(variants.length) : undefined },
    { id: 'display', label: t('products.tabs.display'), icon: <EyeIcon className="w-5 h-5" /> },
    { id: 'shipping', label: t('products.tabs.shipping'), icon: <TruckIcon className="w-5 h-5" /> },
    { id: 'commission', label: t('products.tabs.commission') || 'العمولة', icon: <CurrencyDollarIcon className="w-5 h-5" /> },
    { id: 'advanced', label: t('products.tabs.advanced'), icon: <Cog6ToothIcon className="w-5 h-5" /> },
  ];

  // شاشة التحميل عند جلب بيانات المنتج
  if (loadingProduct) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-white">{t('products.messages.editingProduct')}</h3>
        </div>
      </div>
    );
  }

  // عرض شاشة النجاح فقط عند إنشاء منتج جديد، وليس عند التعديل
  if (success && !isEditMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30">
            <PlusIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            {t('products.messages.productCreated')}
          </h3>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => navigate('/products')} className="ml-4 p-2 text-gray-400 hover:text-gray-600">
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isEditMode ? t('products.editProduct') : t('products.addNew')}
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {isEditMode ? t('products.messages.editingProduct') : t('products.messages.creatingProduct')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex gap-6">
            <div className="w-64 flex-shrink-0">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-2 sticky top-4">
                <nav className="space-y-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                    >
                      <span className="flex-shrink-0">{tab.icon}</span>
                      <span className="text-right flex-1">{tab.label}</span>
                      {tab.badge && (
                        <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            <div className="flex-1 space-y-6">
              {successMessage && (
                <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-lg p-4 shadow-sm">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="mr-3 flex-1">
                      <h3 className="text-sm font-bold text-green-800 dark:text-green-200">نجح!</h3>
                      <p className="mt-1 text-sm text-green-700 dark:text-green-300">{successMessage}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSuccessMessage(null)}
                      className="mr-auto text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-200"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-4 shadow-sm">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="mr-3">
                      <h3 className="text-sm font-bold text-red-800 dark:text-red-200">يرجى تصحيح الخطأ التالي:</h3>
                      <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setError(null)}
                      className="mr-auto text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'basic' && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('products.tabs.basic')}</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('products.productName')}</label>
                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('products.slug') || 'Product Link (Slug)'}</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        name="slug"
                        value={formData.slug || ''}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="product-name-example"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (formData.name) {
                            // 1. Transliterate Arabic to Franco
                            const transliterated = transliterateArabicToFranco(formData.name);

                            // 2. Generate slug from transliterated text
                            let generatedSlug = transliterated.trim().toLowerCase()
                              .replace(/[^\w\s-]/g, '') // Remove non-word chars (except space and dash)
                              .replace(/\s+/g, '-')     // Replace spaces with dashes
                              .replace(/-+/g, '-');     // Collapse multiple dashes

                            if (!generatedSlug) {
                              generatedSlug = `product-${Math.floor(Date.now() / 1000)}`;
                            }
                            setFormData(prev => ({ ...prev, slug: generatedSlug }));
                          }
                        }}
                        className="px-3 py-2 mt-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        {t('products.generate') || 'Generate'}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Unique URL identifier for the product.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('products.description')}</label>
                    <RichTextEditor
                      key={id || 'new'} // Force re-render when product ID changes
                      value={formData.description || ''}
                      onChange={(value) => {
                        const event = {
                          target: {
                            name: 'description',
                            value: value
                          }
                        } as React.ChangeEvent<HTMLTextAreaElement>;
                        handleInputChange(event);
                      }}
                      placeholder=""
                      minHeight="250px"
                    />
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      يمكنك استخدام أدوات التنسيق لتنسيق الوصف مثل WooCommerce
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('products.sku')}</label>
                      <input type="text" name="sku" value={formData.sku} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('products.category')}</label>
                      <select name="category" value={formData.category} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required>
                        <option value="">{t('products.selectCategory')}</option>
                        {categories.map(cat => <option key={cat.id} value={cat.id} className="dark:bg-gray-700 dark:text-white">{cat.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleInputChange} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded" />
                    <label className="mr-2 block text-sm text-gray-900 dark:text-gray-300">{t('products.isActive')}</label>
                  </div>
                </div>
              )}

              {activeTab === 'pricing' && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('products.tabs.pricing')}</h3>
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('products.pricing.salePrice', { currency: displayCurrency })}</label>
                      <input type="number" name="price" value={formData.price} onChange={handleInputChange} min="0" step="0.01" className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="0.00" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('products.pricing.comparePrice', { currency: displayCurrency })}</label>
                      <input type="number" name="comparePrice" value={formData.comparePrice || ''} onChange={handleInputChange} min="0" step="0.01" className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="0.00" />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('products.pricing.comparePriceHint')}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('products.pricing.costPrice', { currency: displayCurrency })}</label>
                      <input type="number" name="cost" value={formData.cost || ''} onChange={handleInputChange} min="0" step="0.01" className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="0.00" />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('products.pricing.costPriceHint')}</p>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6 grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('products.pricing.saleStartDate')}</label>
                      <input type="datetime-local" name="saleStartDate" value={formData.saleStartDate} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('products.pricing.saleStartDateHint')}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('products.pricing.saleEndDate')}</label>
                      <input type="datetime-local" name="saleEndDate" value={formData.saleEndDate} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('products.pricing.saleEndDateHint')}</p>
                    </div>
                  </div>
                  {formData.saleStartDate && formData.saleEndDate &&
                    new Date(formData.saleStartDate) >= new Date(formData.saleEndDate) && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                        {t('products.pricing.endDateBeforeStart')}
                      </p>
                    )}
                </div>
              )}

              {activeTab === 'inventory' && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('products.tabs.inventory')}</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('products.inventory.trackInventory')}</label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('products.inventory.trackInventoryHint')}</p>
                    </div>
                    <input type="checkbox" name="trackInventory" checked={formData.trackInventory} onChange={handleInputChange} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded" />
                  </div>
                  {formData.trackInventory && (
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('products.inventory.quantity')}</label>
                        <input type="number" name="stock" value={formData.stock} onChange={handleInputChange} min="0" className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="0" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('products.inventory.lowStockThreshold')}</label>
                        <input type="number" name="lowStockThreshold" value={formData.lowStockThreshold} onChange={handleInputChange} min="0" className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="5" />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('products.inventory.lowStockThresholdHint')}</p>
                      </div>
                    </div>
                  )}
                  {!formData.trackInventory && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="mr-3">
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            لن يتم تتبع المخزون لهذا المنتج. سيظهر كمتوفر دائماً للعملاء.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'media' && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('products.media.title')}</h3>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                    <input type="file" multiple onChange={handleImageChange} className="hidden" id="images" accept="image/png, image/jpeg, image/gif" />
                    <label htmlFor="images" className="cursor-pointer text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 block">
                      <PhotoIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-300" />
                      <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-white">{t('products.media.selectImages')}</span>
                      <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">{t('products.media.imageFormats')}</span>
                    </label>
                  </div>
                  {uploading && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md p-4">
                      <p className="text-sm text-blue-700 dark:text-blue-300">{t('products.media.uploading')}</p>
                    </div>
                  )}
                  {uploadedImages.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('products.media.uploadedImages')} ({uploadedImages.length})</p>
                      <div className="grid grid-cols-4 gap-4">
                        {uploadedImages.map((url, idx) => (
                          <div key={idx} className="relative group">
                            <img src={url} alt="" className="h-24 w-full object-cover rounded-lg border border-gray-200 dark:border-gray-600" />
                            <button type="button" onClick={() => removeUploadedImage(url, idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Attributes Tab */}
              {activeTab === 'attributes' && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('products.attributes.title')}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('products.attributes.description')}</p>
                    </div>
                  </div>

                  {/* Mode Selector */}
                  <div className="flex gap-4 mb-6">
                    <button
                      type="button"
                      onClick={() => setAttributeMode('templates')}
                      className={`flex-1 p-4 rounded-lg border-2 transition-all ${attributeMode === 'templates'
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-400'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                    >
                      <div className="text-2xl mb-2">📦</div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{t('products.attributes.templates')}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('products.attributes.templatesDesc')}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttributeMode('custom')}
                      className={`flex-1 p-4 rounded-lg border-2 transition-all ${attributeMode === 'custom'
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-400'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                    >
                      <div className="text-2xl mb-2">✏️</div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{t('products.attributes.custom')}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('products.attributes.customDesc')}</p>
                    </button>
                  </div>

                  {/* Templates Mode */}
                  {attributeMode === 'templates' && (
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-700 dark:text-gray-300">{t('products.attributes.selectFromTemplates')}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { icon: '🎨', name: t('products.attributes.templateColor'), slug: 'color', values: ['أسود', 'أبيض', 'أحمر', 'أزرق', 'أخضر'] },
                          { icon: '📏', name: t('products.attributes.templateSize'), slug: 'size', values: ['S', 'M', 'L', 'XL', 'XXL'] },
                          { icon: '👟', name: t('products.attributes.templateShoeSize'), slug: 'shoe_size', values: ['38', '39', '40', '41', '42', '43', '44'] },
                          { icon: '🧵', name: t('products.attributes.templateMaterial'), slug: 'material', values: ['قطن', 'بوليستر', 'جلد', 'كتان'] },
                          { icon: '💍', name: t('products.attributes.templateMetalColor'), slug: 'metal_color', values: ['ذهبي', 'فضي', 'روز جولد', 'أسود'] },
                          { icon: '💾', name: t('products.attributes.templateCapacity'), slug: 'capacity', values: ['64GB', '128GB', '256GB', '512GB'] },
                          { icon: '⚖️', name: t('products.attributes.templateWeight'), slug: 'weight', values: ['250g', '500g', '1kg', '2kg'] },
                          { icon: '📦', name: t('products.attributes.templatePack'), slug: 'pack', values: ['قطعة', '3 قطع', '6 قطع', '12 قطعة'] },
                        ].map((template) => {
                          const isAdded = attributes.some(a => a.slug === template.slug);
                          return (
                            <button
                              key={template.slug}
                              type="button"
                              onClick={() => {
                                if (!isAdded) {
                                  const newAttr: ProductAttribute = {
                                    id: `attr_${template.slug}_${Date.now()}`,
                                    name: template.name,
                                    slug: template.slug,
                                    values: template.values,
                                    visible: true,
                                    forVariations: true
                                  };
                                  setAttributes(prev => [...prev, newAttr]);
                                }
                              }}
                              disabled={isAdded}
                              className={`p-3 rounded-lg border-2 transition-all text-center ${isAdded
                                ? 'border-green-300 bg-green-50 dark:bg-green-900/30 dark:border-green-700 cursor-default'
                                : 'border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                                }`}
                            >
                              <span className="text-2xl">{template.icon}</span>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">{template.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{template.values.slice(0, 3).join('، ')}...</p>
                              {isAdded && <span className="text-xs text-green-600 dark:text-green-400 mt-1 block">✓ مضاف</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Custom Mode */}
                  {attributeMode === 'custom' && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('products.attributes.attributeName')}</label>
                          <input
                            type="text"
                            value={newAttributeName}
                            onChange={e => setNewAttributeName(e.target.value)}
                            placeholder="مثل: اللون، الحجم، النكهة"
                            className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('products.attributes.values')} <span className="text-gray-400 dark:text-gray-500 font-normal">{t('products.attributes.valuesHint')}</span>
                          </label>
                          <div className="space-y-2">
                            {newAttributeValuesList.map((value, index) => (
                              <div key={index} className="flex gap-2">
                                <input
                                  type="text"
                                  value={value}
                                  onChange={e => updateValueField(index, e.target.value)}
                                  onKeyPress={e => handleValueKeyPress(e, index)}
                                  placeholder={index === 0 ? "القيمة الأولى" : "قيمة أخرى..."}
                                  className="attribute-value-input flex-1 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                />
                                {newAttributeValuesList.length > 1 && (
                                  <button type="button" onClick={() => removeValueField(index)} className="px-2 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">
                                    <XMarkIcon className="h-5 w-5" />
                                  </button>
                                )}
                              </div>
                            ))}
                            <button type="button" onClick={addValueField} className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1">
                              <PlusIcon className="h-4 w-4" /> {t('products.attributes.addValue')}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={addAttribute}
                          disabled={!newAttributeName.trim() || !newAttributeValuesList.some(v => v.trim())}
                          className="px-4 py-2 bg-indigo-600 dark:bg-indigo-600 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-700 text-sm disabled:opacity-50 disabled:dark:opacity-50"
                        >
                          <PlusIcon className="h-4 w-4 inline ml-1" /> {t('products.attributes.addAttribute')}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Added Attributes List */}
                  {attributes.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">{t('products.attributes.addedAttributes')} ({attributes.length}):</h4>
                      <div className="space-y-2">
                        {attributes.map(attr => (
                          <div key={attr.id} className="flex items-center justify-between bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                            <div className="flex-1">
                              <span className="font-medium text-gray-800 dark:text-gray-200">{attr.name}</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {attr.values.map((val, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded text-xs">{val}</span>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                <input
                                  type="checkbox"
                                  checked={attr.forVariations}
                                  onChange={e => setAttributes(prev => prev.map(a => a.id === attr.id ? { ...a, forVariations: e.target.checked } : a))}
                                  className="h-4 w-4 text-indigo-600 dark:text-indigo-500 rounded"
                                />
                                {t('products.attributes.forVariations')}
                              </label>
                              <button type="button" onClick={() => removeAttribute(attr.id)} className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1">
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Generate Variations Button */}
                  {attributes.filter(a => a.forVariations).length > 0 && (
                    <div className="mt-6 flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                      <div>
                        <p className="text-green-800 dark:text-green-300 font-medium">
                          🔄 {t('products.attributes.generateVariants')} {attributes.filter(a => a.forVariations).reduce((acc, attr) => acc * attr.values.length, 1)}
                        </p>
                        <p className="text-green-600 dark:text-green-400 text-sm">
                          من {attributes.filter(a => a.forVariations).map(a => a.name).join(' × ')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { generateVariations(); setActiveTab('variants'); }}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        {t('products.attributes.generateVariants')} ←
                      </button>
                    </div>
                  )}

                  {attributes.length === 0 && (
                    <div className="mt-6 text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <SwatchIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
                      <p>لم تضف أي صفات بعد</p>
                      <p className="text-sm">اختر من القوالب الجاهزة أو أنشئ صفات مخصصة</p>
                    </div>
                  )}
                </div>
              )}

              {/* Variants Tab */}
              {activeTab === 'variants' && (
                <div className="space-y-6">
                  {/* Variants Section */}
                  <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('products.variants.title')} ({variants.length})</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowVariants(!showVariants)}
                        className="px-3 py-1 text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-900/50"
                      >
                        {showVariants ? 'إخفاء' : 'إظهار'}
                      </button>
                    </div>

                    {/* Bulk Actions */}
                    {showVariants && variants.length > 0 && (
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">إجراء جماعي على كل المتغيرات:</span>
                          <select
                            value={bulkAction}
                            onChange={e => handleBulkActionChange(e.target.value)}
                            className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md text-sm min-w-[200px]"
                          >
                            <option value="">-- اختر إجراء --</option>
                            <optgroup label="📌 الحالة">
                              <option value="activate">✅ تفعيل الكل</option>
                              <option value="deactivate">⏸️ إيقاف الكل</option>
                              <option value="delete">🗑️ حذف الكل</option>
                            </optgroup>
                            <optgroup label="💰 التسعير">
                              <option value="set_price">💵 تعيين السعر</option>
                              <option value="increase_price">📈 زيادة السعر (مبلغ)</option>
                              <option value="decrease_price">📉 تخفيض السعر (مبلغ)</option>
                              <option value="increase_price_percent">📈 زيادة السعر (%)</option>
                              <option value="decrease_price_percent">📉 تخفيض السعر (%)</option>
                              <option value="set_compare_price">🏷️ تعيين السعر الأساسي</option>
                              <option value="set_cost">💳 تعيين سعر الشراء</option>
                            </optgroup>
                            <optgroup label="📦 المخزون">
                              <option value="track_inventory">📊 تفعيل تتبع المخزون</option>
                              <option value="untrack_inventory">📭 إيقاف تتبع المخزون</option>
                              <option value="set_stock">🔢 تعيين الكمية</option>
                              <option value="set_low_stock">⚠️ تعيين حد التنبيه</option>
                              <option value="in_stock">✅ متوفر</option>
                              <option value="out_of_stock">❌ نفد المخزون</option>
                              <option value="allow_backorders">🔄 السماح بالطلبات المسبقة</option>
                              <option value="disallow_backorders">🚫 منع الطلبات المسبقة</option>
                            </optgroup>
                            <optgroup label="🚚 الشحن">
                              <option value="set_weight">⚖️ تعيين الوزن (كجم)</option>
                              <option value="set_length">📏 تعيين الطول (سم)</option>
                              <option value="set_width">📐 تعيين العرض (سم)</option>
                              <option value="set_height">📐 تعيين الارتفاع (سم)</option>
                              <option value="set_shipping_class">📦 تعيين فئة الشحن</option>
                            </optgroup>
                          </select>

                          {/* Input for value-based actions */}
                          {showBulkInput && bulkAction !== 'set_shipping_class' && (
                            <input
                              type="number"
                              value={bulkValue}
                              onChange={e => setBulkValue(e.target.value)}
                              placeholder={
                                bulkAction.includes('percent') ? 'النسبة %' :
                                  bulkAction.includes('price') || bulkAction.includes('cost') ? 'المبلغ' :
                                    bulkAction.includes('stock') ? 'الكمية' :
                                      bulkAction.includes('weight') ? 'الوزن (كجم)' :
                                        'القيمة'
                              }
                              className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md text-sm w-28"
                              min="0"
                              step={bulkAction.includes('weight') ? '0.01' : '1'}
                            />
                          )}

                          {/* Shipping class select */}
                          {showBulkInput && bulkAction === 'set_shipping_class' && (
                            <select
                              value={bulkValue}
                              onChange={e => setBulkValue(e.target.value)}
                              className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md text-sm"
                            >
                              <option value="">اختر فئة الشحن</option>
                              <option value="standard">عادي</option>
                              <option value="heavy">ثقيل</option>
                              <option value="fragile">قابل للكسر</option>
                              <option value="express">سريع</option>
                            </select>
                          )}

                          <button
                            type="button"
                            onClick={applyBulkAction}
                            disabled={!bulkAction || (showBulkInput && !bulkValue)}
                            className="px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white rounded-md text-sm hover:bg-indigo-700 dark:hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            تطبيق على {variants.length} متغير
                          </button>
                        </div>
                      </div>
                    )}

                    {showVariants && (
                      <div className="space-y-6">
                        {variants.map((variant, idx) => (
                          <div key={idx} className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                            {/* Variant Header */}
                            <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="bg-indigo-600 dark:bg-indigo-700 text-white text-xs px-2 py-1 rounded">{idx + 1}</span>
                                <h4 className="font-medium text-gray-800 dark:text-gray-200">
                                  {variant.name || 'متغير جديد'}
                                  {variant.type && <span className="text-gray-500 dark:text-gray-400 text-sm mr-2">({variant.type === 'color' ? 'لون' : variant.type === 'size' ? 'حجم' : variant.type})</span>}
                                </h4>
                              </div>
                              <button type="button" onClick={() => removeVariant(idx)} className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1">
                                <XMarkIcon className="h-5 w-5" />
                              </button>
                            </div>

                            {/* Variant Content */}
                            <div className="p-4 space-y-6">
                              {/* Section 1: Basic Info */}
                              <div className="border-b border-gray-200 dark:border-gray-600 pb-4">
                                <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                                  <DocumentTextIcon className="h-4 w-4 ml-1" />
                                  المعلومات الأساسية
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم المتغير *</label>
                                    <input
                                      type="text"
                                      value={variant.name}
                                      onChange={e => updateVariant(idx, 'name', e.target.value)}
                                      placeholder="مثل: أبيض، كبير"
                                      className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نوع المتغير</label>
                                    <select
                                      value={variant.type}
                                      onChange={e => updateVariant(idx, 'type', e.target.value)}
                                      className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    >
                                      <option value="color">لون</option>
                                      <option value="size">حجم</option>
                                      <option value="material">مادة</option>
                                      <option value="style">نمط</option>
                                      <option value="other">أخرى</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SKU</label>
                                    <input
                                      type="text"
                                      value={variant.sku}
                                      onChange={e => updateVariant(idx, 'sku', e.target.value)}
                                      placeholder="PROD-VAR-001"
                                      className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    />
                                  </div>
                                </div>
                                {/* Description */}
                                <div className="mt-3">
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">وصف المتغير</label>
                                  <textarea
                                    value={variant.description || ''}
                                    onChange={e => updateVariant(idx, 'description', e.target.value)}
                                    rows={2}
                                    placeholder="وصف مختصر لهذا المتغير (اختياري)"
                                    className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                  />
                                </div>
                              </div>

                              {/* Section 2: Image */}
                              <div className="border-b border-gray-200 dark:border-gray-600 pb-4">
                                <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                                  <PhotoIcon className="h-4 w-4 ml-1" />
                                  صورة المتغير
                                </h5>
                                <div className="flex items-center gap-4">
                                  {variant.image ? (
                                    <div className="relative group">
                                      <img src={variant.image} alt="" className="h-24 w-24 object-cover rounded-lg border border-gray-300 dark:border-gray-600" />
                                      <button
                                        type="button"
                                        onClick={() => updateVariant(idx, 'image', undefined)}
                                        className="absolute -top-2 -right-2 bg-red-500 dark:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 dark:hover:bg-red-700"
                                      >×</button>
                                    </div>
                                  ) : (
                                    <label className="h-24 w-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-700 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                                      <PhotoIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">رفع صورة</span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => handleVariantImageChange(idx, e)}
                                        className="hidden"
                                      />
                                    </label>
                                  )}
                                  <div className="flex-1 space-y-2">
                                    <div className="flex gap-2">
                                      <input
                                        type="text"
                                        value={variant.image || ''}
                                        onChange={e => updateVariant(idx, 'image', e.target.value)}
                                        placeholder="أو أدخل رابط الصورة"
                                        className="flex-1 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                      />
                                      <label className="px-3 py-2 bg-indigo-600 dark:bg-indigo-700 text-white rounded-md text-sm cursor-pointer hover:bg-indigo-700 dark:hover:bg-indigo-800 flex items-center gap-1">
                                        <PhotoIcon className="h-4 w-4" />
                                        رفع
                                        <input
                                          type="file"
                                          accept="image/*"
                                          onChange={e => handleVariantImageChange(idx, e)}
                                          className="hidden"
                                        />
                                      </label>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">صورة مختلفة لهذا المتغير (اختياري)</p>
                                  </div>
                                </div>
                              </div>

                              {/* Section 3: Pricing */}
                              <div className="border-b border-gray-200 dark:border-gray-600 pb-4">
                                <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                                  <CurrencyDollarIcon className="h-4 w-4 ml-1" />
                                  التسعير
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">السعر في الخصم ({displayCurrency})</label>
                                    <input
                                      type="number"
                                      value={variant.price || ''}
                                      onChange={e => updateVariant(idx, 'price', e.target.value ? parseFloat(e.target.value) : undefined)}
                                      min="0"
                                      step="0.01"
                                      placeholder="السعر بعد الخصم"
                                      className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">السعر الأساسي ({displayCurrency})</label>
                                    <input
                                      type="number"
                                      value={variant.comparePrice || ''}
                                      onChange={e => updateVariant(idx, 'comparePrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                                      min="0"
                                      step="0.01"
                                      placeholder="السعر قبل الخصم"
                                      className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">سعر الشراء ({displayCurrency})</label>
                                    <input
                                      type="number"
                                      value={variant.cost || ''}
                                      onChange={e => updateVariant(idx, 'cost', e.target.value ? parseFloat(e.target.value) : undefined)}
                                      min="0"
                                      step="0.01"
                                      placeholder="تكلفة الشراء"
                                      className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Section 4: Inventory */}
                              <div className="border-b border-gray-200 dark:border-gray-600 pb-4">
                                <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                                  <CubeIcon className="h-4 w-4 ml-1" />
                                  المخزون
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                  <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">تتبع المخزون</label>
                                    </div>
                                    <input
                                      type="checkbox"
                                      checked={variant.trackInventory}
                                      onChange={e => updateVariant(idx, 'trackInventory', e.target.checked)}
                                      className="h-4 w-4 text-indigo-600 dark:text-indigo-500 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
                                    />
                                  </div>
                                  {variant.trackInventory && (
                                    <>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الكمية</label>
                                        <input
                                          type="number"
                                          value={variant.stock}
                                          onChange={e => updateVariant(idx, 'stock', parseInt(e.target.value) || 0)}
                                          min="0"
                                          className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">حد التنبيه</label>
                                        <input
                                          type="number"
                                          value={variant.lowStockThreshold || ''}
                                          onChange={e => updateVariant(idx, 'lowStockThreshold', parseInt(e.target.value) || undefined)}
                                          min="0"
                                          placeholder="5"
                                          className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                        />
                                      </div>
                                      <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">طلبات مسبقة</label>
                                          <p className="text-xs text-gray-500 dark:text-gray-400">السماح بالشراء عند نفاد المخزون</p>
                                        </div>
                                        <input
                                          type="checkbox"
                                          checked={variant.allowBackorders || false}
                                          onChange={e => updateVariant(idx, 'allowBackorders', e.target.checked)}
                                          className="h-4 w-4 text-indigo-600 dark:text-indigo-500 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
                                        />
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Section 5: Shipping */}
                              <div className="border-b border-gray-200 dark:border-gray-600 pb-4">
                                <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                                  <TruckIcon className="h-4 w-4 ml-1" />
                                  الشحن
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوزن (كجم)</label>
                                    <input
                                      type="number"
                                      value={variant.weight || ''}
                                      onChange={e => updateVariant(idx, 'weight', e.target.value ? parseFloat(e.target.value) : undefined)}
                                      min="0"
                                      step="0.01"
                                      placeholder="0.5"
                                      className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الطول (سم)</label>
                                    <input
                                      type="number"
                                      value={variant.dimensions?.length || ''}
                                      onChange={e => updateVariant(idx, 'dimensions', { ...variant.dimensions, length: e.target.value ? parseFloat(e.target.value) : undefined })}
                                      min="0"
                                      placeholder="20"
                                      className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العرض (سم)</label>
                                    <input
                                      type="number"
                                      value={variant.dimensions?.width || ''}
                                      onChange={e => updateVariant(idx, 'dimensions', { ...variant.dimensions, width: e.target.value ? parseFloat(e.target.value) : undefined })}
                                      min="0"
                                      placeholder="15"
                                      className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الارتفاع (سم)</label>
                                    <input
                                      type="number"
                                      value={variant.dimensions?.height || ''}
                                      onChange={e => updateVariant(idx, 'dimensions', { ...variant.dimensions, height: e.target.value ? parseFloat(e.target.value) : undefined })}
                                      min="0"
                                      placeholder="10"
                                      className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    />
                                  </div>
                                </div>
                                <div className="mt-3">
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">فئة الشحن</label>
                                  <select
                                    value={variant.shippingClass || 'standard'}
                                    onChange={e => updateVariant(idx, 'shippingClass', e.target.value)}
                                    className="block w-full md:w-1/3 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                  >
                                    <option value="standard">عادي (Standard)</option>
                                    <option value="heavy">ثقيل (Heavy)</option>
                                    <option value="fragile">قابل للكسر (Fragile)</option>
                                    <option value="express">سريع (Express)</option>
                                  </select>
                                </div>
                              </div>

                              {/* Section 6: Status */}
                              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">حالة المتغير</label>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">تفعيل أو إيقاف هذا المتغير</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm ${variant.isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                    {variant.isActive ? 'نشط' : 'غير نشط'}
                                  </span>
                                  <input
                                    type="checkbox"
                                    checked={variant.isActive}
                                    onChange={e => updateVariant(idx, 'isActive', e.target.checked)}
                                    className="h-4 w-4 text-indigo-600 dark:text-indigo-500 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Add Variant Button */}
                        <button
                          type="button"
                          onClick={addVariant}
                          className="w-full flex justify-center items-center px-4 py-3 border-2 border-dashed border-indigo-300 dark:border-indigo-600 rounded-lg text-indigo-600 dark:text-indigo-400 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                        >
                          <PlusIcon className="h-5 w-5 ml-2" />
                          {t('products.variants.addVariant')}
                        </button>

                        {/* Info Box */}
                        {variants.length === 0 && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 text-center">
                            <CubeIcon className="h-12 w-12 text-blue-400 dark:text-blue-500 mx-auto mb-2" />
                            <p className="text-blue-700 dark:text-blue-300 font-medium">{t('products.variants.noVariants')}</p>
                            <p className="text-blue-600 dark:text-blue-400 text-sm">{t('products.variants.noVariantsDesc')}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Display Customization Tab */}
              {activeTab === 'display' && (
                <div className="space-y-6">
                  <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                        <EyeIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('products.display.title')}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t('products.display.description')}
                        </p>
                      </div>
                    </div>

                    {attributes.filter(a => a.forVariations).length === 0 ? (
                      <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-600">
                        <SwatchIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-200">{t('products.display.noVariationAttributes')}</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('products.display.noVariationAttributesDesc')}</p>
                        <button
                          type="button"
                          onClick={() => setActiveTab('attributes')}
                          className="mt-6 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-800"
                        >
                          {t('products.display.goToAttributes')}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {attributes.filter(a => a.forVariations).map((attr) => (
                          <div key={attr.id} className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
                              <h4 className="font-medium text-gray-900 dark:text-gray-200 flex items-center gap-2">
                                <span className="bg-white dark:bg-gray-600 px-2 py-1 rounded border border-gray-200 dark:border-gray-500 text-xs text-gray-500 dark:text-gray-400 uppercase">
                                  {attr.name}
                                </span>
                              </h4>
                              <select
                                value={variantSettings.styles[attr.name] || ''}
                                onChange={(e) => {
                                  const val = e.target.value as any;
                                  setVariantSettings(prev => ({
                                    ...prev,
                                    styles: { ...prev.styles, [attr.name]: val }
                                  }));
                                }}
                                className="block w-48 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              >
                                <option value="">{t('products.display.default')}</option>
                                <option value="buttons">{t('products.display.buttons')}</option>
                                <option value="circles">{t('products.display.circles')}</option>
                                <option value="dropdown">{t('products.display.dropdown')}</option>
                                <option value="thumbnails">{t('products.display.thumbnails')}</option>
                                <option value="radio">{t('products.display.radio')}</option>
                                <option value="circles">دوائر ألوان (Circles)</option>
                                <option value="dropdown">قائمة منسدلة (Dropdown)</option>
                                <option value="thumbnails">صور مصغرة (Thumbnails)</option>
                                <option value="radio">خيارات (Radio)</option>
                              </select>
                            </div>

                            <div className="p-4 bg-white dark:bg-gray-800">
                              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                {t('products.display.customizeImageLabel')}
                              </p>

                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {attr.values.map((value) => {
                                  const currentImage = variantSettings.attributeImages[attr.name]?.[value];

                                  return (
                                    <div key={value} className="relative group border border-gray-200 dark:border-gray-600 rounded-lg p-2 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors">
                                      <p className="text-xs font-medium text-center mb-2 text-gray-700 dark:text-gray-300 truncate" title={value}>{value}</p>

                                      <div className="aspect-square bg-gray-50 dark:bg-gray-700 rounded-md overflow-hidden relative">
                                        {currentImage ? (
                                          <>
                                            <img src={currentImage} alt={value} className="w-full h-full object-cover" />
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const newImages = { ...(variantSettings.attributeImages[attr.name] || {}) };
                                                delete newImages[value];
                                                setVariantSettings(prev => ({
                                                  ...prev,
                                                  attributeImages: { ...prev.attributeImages, [attr.name]: newImages }
                                                }));
                                              }}
                                              className="absolute top-1 right-1 bg-red-500 dark:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs hover:bg-red-600 dark:hover:bg-red-700"
                                            >
                                              ×
                                            </button>
                                          </>
                                        ) : (
                                          <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                            <PhotoIcon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                                            <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">رفع صورة</span>
                                            <input
                                              type="file"
                                              className="hidden"
                                              accept="image/*"
                                              onChange={async (e) => {
                                                if (e.target.files?.[0]) {
                                                  const file = e.target.files[0];
                                                  try {
                                                    const data = await uploadFiles([file]);
                                                    if (data.success && data.data[0]) {
                                                      const url = data.data[0].fullUrl;
                                                      setVariantSettings(prev => ({
                                                        ...prev,
                                                        attributeImages: {
                                                          ...prev.attributeImages,
                                                          [attr.name]: {
                                                            ...(prev.attributeImages[attr.name] || {}),
                                                            [value]: url
                                                          }
                                                        }
                                                      }));
                                                    }
                                                  } catch (err) {
                                                    console.error('Error uploading attribute image', err);
                                                  }
                                                }
                                              }}
                                            />
                                          </label>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'commission' && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                      <CurrencyDollarIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">إعدادات عمولة المسوقين</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        قم بتخصيص العمولة التي يحصل عليها المسوق عند بيع هذا المنتج.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">نوع العمولة</label>
                      <select
                        name="commissionType"
                        value={formData.commissionType}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="PERCENTAGE">نسبة مئوية (%)</option>
                        <option value="FIXED">مبلغ ثابت (Fixed)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {formData.commissionType === 'PERCENTAGE' ? 'نسبة العمولة (%)' : 'قيمة العمولة'}
                      </label>
                      <input
                        type="number"
                        name="affiliateCommission"
                        value={formData.affiliateCommission}
                        onChange={handleInputChange}
                        min="0"
                        step="0.1"
                        className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="0.0"
                      />
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <Cog6ToothIcon className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="text-sm text-blue-800 dark:text-blue-300">
                        <p className="font-semibold mb-1">توضيح حول الربح:</p>
                        <p>سعر التاجر (التكلفة): <span className="font-mono text-indigo-500">{formData.cost || 0}</span> {displayCurrency}</p>
                        <p>سعر البيع: <span className="font-mono text-green-500">{formData.price || 0}</span> {displayCurrency}</p>
                        <p>العمولة: <span className="font-mono text-amber-500">
                          {formData.commissionType === 'PERCENTAGE'
                            ? `${((formData.price || 0) * (formData.affiliateCommission || 0) / 100).toFixed(2)} (${formData.affiliateCommission}%)`
                            : `${formData.affiliateCommission || 0} مبلغ ثابت`}
                        </span> {displayCurrency}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'shipping' && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('products.shipping.title')}</h3>
                  <div>
                    <label htmlFor="weight" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('products.shipping.weight')}</label>
                    <input
                      type="number"
                      id="weight"
                      name="weight"
                      value={formData.weight || ''}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="mt-1 block w-full md:w-1/3 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('products.shipping.dimensions')}</label>
                      <button
                        type="button"
                        onClick={() => setShowDimensions(!showDimensions)}
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                      >
                        {showDimensions ? t('products.shipping.hideDimensions') : t('products.shipping.showDimensions')}
                      </button>
                    </div>
                    {showDimensions && (
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('products.shipping.length')}</label>
                          <input
                            type="number"
                            value={formData.dimensions?.length || ''}
                            onChange={e => handleDimensionChange('length', e.target.value)}
                            min="0"
                            step="0.1"
                            className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="0.0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('products.shipping.width')}</label>
                          <input
                            type="number"
                            value={formData.dimensions?.width || ''}
                            onChange={e => handleDimensionChange('width', e.target.value)}
                            min="0"
                            step="0.1"
                            className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="0.0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('products.shipping.height')}</label>
                          <input
                            type="number"
                            value={formData.dimensions?.height || ''}
                            onChange={e => handleDimensionChange('height', e.target.value)}
                            min="0"
                            step="0.1"
                            className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="0.0"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'advanced' && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('products.advanced.title')}</h3>

                  {/* Featured Product */}
                  <div className="space-y-4 border-b border-gray-200 dark:border-gray-700 pb-6">
                    <h4 className="text-md font-medium text-gray-900 dark:text-gray-200">{t('products.advanced.featured')}</h4>
                    <div className="flex items-center">
                      <input
                        id="isFeatured"
                        name="isFeatured"
                        type="checkbox"
                        checked={formData.isFeatured}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-indigo-600 dark:text-indigo-500 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                      <label htmlFor="isFeatured" className="mr-2 block text-sm text-gray-900 dark:text-gray-300">
                        {t('products.advanced.featuredDesc')}
                      </label>
                    </div>
                    <p className="mr-6 text-xs text-gray-500 dark:text-gray-400">{t('products.advanced.featuredHint')}</p>

                    {formData.isFeatured && (
                      <div>
                        <label htmlFor="featuredPriority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('products.advanced.featuredPriority')}
                        </label>
                        <input
                          type="number"
                          id="featuredPriority"
                          name="featuredPriority"
                          value={formData.featuredPriority}
                          onChange={handleInputChange}
                          min="0"
                          max="100"
                          className="mt-1 block w-full md:w-1/3 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="0"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('products.advanced.featuredPriorityHint')}</p>
                      </div>
                    )}
                  </div>

                  {/* Shipping Settings */}
                  <div className="space-y-4 border-b border-gray-200 dark:border-gray-700 pb-6">
                    <h4 className="text-md font-medium text-gray-900 dark:text-gray-200">{t('products.advanced.shippingSettings')}</h4>

                    <div>
                      <label htmlFor="shippingClass" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('products.advanced.shippingClass')}
                      </label>
                      <select
                        id="shippingClass"
                        name="shippingClass"
                        value={formData.shippingClass}
                        onChange={handleInputChange}
                        className="mt-1 block w-full md:w-1/2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="standard">عادي (Standard)</option>
                        <option value="heavy">ثقيل (Heavy)</option>
                        <option value="fragile">قابل للكسر (Fragile)</option>
                        <option value="express">سريع (Express)</option>
                      </select>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">تحدد تكلفة الشحن بناءً على نوع المنتج</p>
                    </div>

                    <div className="flex items-center">
                      <input
                        id="excludeFromFreeShipping"
                        name="excludeFromFreeShipping"
                        type="checkbox"
                        checked={formData.excludeFromFreeShipping}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-indigo-600 dark:text-indigo-500 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                      <label htmlFor="excludeFromFreeShipping" className="mr-2 block text-sm text-gray-900 dark:text-gray-300">
                        استثناء من الشحن المجاني
                      </label>
                    </div>
                    <p className="mr-6 text-xs text-gray-500 dark:text-gray-400">لن ينطبق عليه عروض الشحن المجاني حتى لو وصل الطلب للحد الأدنى</p>
                  </div>

                  {/* Checkout Settings */}
                  <div className="space-y-4 border-b border-gray-200 dark:border-gray-700 pb-6">
                    <h4 className="text-md font-medium text-gray-900 dark:text-gray-200">إعدادات الشراء</h4>
                    <div className="flex items-center">
                      <input
                        id="enableCheckoutForm"
                        name="enableCheckoutForm"
                        type="checkbox"
                        checked={formData.enableCheckoutForm}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-indigo-600 dark:text-indigo-500 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                      <label htmlFor="enableCheckoutForm" className="mr-2 block text-sm text-gray-900 dark:text-gray-300">
                        تفعيل فورم الشيك أوت لهذا المنتج
                      </label>
                    </div>
                    <p className="mr-6 text-xs text-gray-500 dark:text-gray-400">يسمح للعملاء بإتمام الطلب مباشرة من صفحة المنتج</p>

                    <div className="flex items-center">
                      <input
                        id="showAddToCartButton"
                        name="showAddToCartButton"
                        type="checkbox"
                        checked={formData.showAddToCartButton}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-indigo-600 dark:text-indigo-500 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                      <label htmlFor="showAddToCartButton" className="mr-2 block text-sm text-gray-900 dark:text-gray-300">
                        إظهار زر إضافة للسلة في صفحة المنتج
                      </label>
                    </div>
                    <p className="mr-6 text-xs text-gray-500 dark:text-gray-400">عند إلغاء التفعيل، لن يظهر زر "أضف للسلة"</p>
                  </div>

                  {/* Size Guide */}
                  <div className="space-y-4 border-b border-gray-200 dark:border-gray-700 pb-6">
                    <h4 className="text-md font-medium text-gray-900 dark:text-gray-200">📏 دليل المقاسات</h4>
                    <div>
                      <label htmlFor="sizeGuide" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        دليل المقاسات
                      </label>
                      <textarea
                        id="sizeGuide"
                        name="sizeGuide"
                        value={formData.sizeGuide}
                        onChange={handleInputChange}
                        rows={8}
                        className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                        placeholder="أدخل دليل المقاسات هنا... يمكنك استخدام Markdown أو HTML

مثال:
# دليل المقاسات

| المقاس | الطول (سم) | العرض (سم) |
|--------|------------|------------|
| S      | 65         | 48         |
| M      | 68         | 50         |
| L      | 71         | 52         |
| XL     | 74         | 54         |"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        يمكنك إضافة جدول مقاسات للمنتج. سيظهر للعملاء في صفحة المنتج.
                      </p>
                    </div>
                  </div>

                  {/* Recommended Products */}
                  <div className="space-y-4 border-b border-gray-200 dark:border-gray-700 pb-6">
                    <h4 className="text-md font-medium text-gray-900 dark:text-gray-200">المنتجات المقترحة</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      حدد منتجات معينة لعرضها كتوصيات. سيتم دمجها مع التوصيات التلقائية من النظام.
                    </p>

                    {/* Related Products */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        المنتجات المشابهة (Related Products)
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">منتجات من نفس الفئة أو مشابهة للمنتج الحالي</p>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={relatedInput}
                            onChange={(e) => setRelatedInput(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (relatedInput.trim() && !relatedProducts.includes(relatedInput.trim())) {
                                  setRelatedProducts([...relatedProducts, relatedInput.trim()]);
                                  setRelatedInput('');
                                }
                              }
                            }}
                            placeholder="أدخل ID المنتج واضغط Enter"
                            className="flex-1 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (relatedInput.trim() && !relatedProducts.includes(relatedInput.trim())) {
                                setRelatedProducts([...relatedProducts, relatedInput.trim()]);
                                setRelatedInput('');
                              }
                            }}
                            className="px-3 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 text-sm"
                          >
                            <PlusIcon className="h-4 w-4" />
                          </button>
                        </div>
                        {relatedProducts.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {relatedProducts.map((id, index) => (
                              <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                                Product #{id}
                                <button
                                  type="button"
                                  onClick={() => setRelatedProducts(relatedProducts.filter((_, i) => i !== index))}
                                  className="mr-1 ml-1"
                                >
                                  <XMarkIcon className="h-4 w-4" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Upsell Products */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        منتجات الترقية (Upsell Products)
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">منتجات أفضل وأغلى لتشجيع العميل على الترقية</p>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={upsellInput}
                            onChange={(e) => setUpsellInput(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (upsellInput.trim() && !upsellProducts.includes(upsellInput.trim())) {
                                  setUpsellProducts([...upsellProducts, upsellInput.trim()]);
                                  setUpsellInput('');
                                }
                              }
                            }}
                            placeholder="أدخل ID المنتج واضغط Enter"
                            className="flex-1 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (upsellInput.trim() && !upsellProducts.includes(upsellInput.trim())) {
                                setUpsellProducts([...upsellProducts, upsellInput.trim()]);
                                setUpsellInput('');
                              }
                            }}
                            className="px-3 py-2 bg-green-600 dark:bg-green-700 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-800 text-sm"
                          >
                            <PlusIcon className="h-4 w-4" />
                          </button>
                        </div>
                        {upsellProducts.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {upsellProducts.map((id, index) => (
                              <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">
                                Product #{id}
                                <button
                                  type="button"
                                  onClick={() => setUpsellProducts(upsellProducts.filter((_, i) => i !== index))}
                                  className="mr-1 ml-1"
                                >
                                  <XMarkIcon className="h-4 w-4" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Cross-sell Products */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        منتجات مكملة (Cross-sell Products)
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">منتجات تُشترى عادة مع هذا المنتج</p>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={crossSellInput}
                            onChange={(e) => setCrossSellInput(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (crossSellInput.trim() && !crossSellProducts.includes(crossSellInput.trim())) {
                                  setCrossSellProducts([...crossSellProducts, crossSellInput.trim()]);
                                  setCrossSellInput('');
                                }
                              }
                            }}
                            placeholder="أدخل ID المنتج واضغط Enter"
                            className="flex-1 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (crossSellInput.trim() && !crossSellProducts.includes(crossSellInput.trim())) {
                                setCrossSellProducts([...crossSellProducts, crossSellInput.trim()]);
                                setCrossSellInput('');
                              }
                            }}
                            className="px-3 py-2 bg-purple-600 dark:bg-purple-700 text-white rounded-md hover:bg-purple-700 dark:hover:bg-purple-800 text-sm"
                          >
                            <PlusIcon className="h-4 w-4" />
                          </button>
                        </div>
                        {crossSellProducts.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {crossSellProducts.map((id, index) => (
                              <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300">
                                Product #{id}
                                <button
                                  type="button"
                                  onClick={() => setCrossSellProducts(crossSellProducts.filter((_, i) => i !== index))}
                                  className="mr-1 ml-1"
                                >
                                  <XMarkIcon className="h-4 w-4" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md p-3">
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        ℹ️ <strong>ملاحظة:</strong> النظام يقترح منتجات تلقائياً بناءً على الفئة والطلبات السابقة.
                        المنتجات المحددة هنا ستُضاف للتوصيات التلقائية.
                      </p>
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">العلامات (Tags)</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {formData.tags && Array.isArray(formData.tags) && formData.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center pl-3 pr-2 py-1 rounded-full text-sm font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="mr-1 flex-shrink-0 ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center text-indigo-400 dark:text-indigo-500 hover:bg-indigo-200 dark:hover:bg-indigo-700 hover:text-indigo-500 dark:hover:text-indigo-400 focus:outline-none focus:bg-indigo-500 dark:focus:bg-indigo-600 focus:text-white"
                          >
                            <XMarkIcon className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTag}
                        onChange={e => setNewTag(e.target.value)}
                        onKeyPress={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                        className="flex-1 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="أضف علامة جديدة واضغط Enter"
                      />
                      <button
                        type="button"
                        onClick={addTag}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 focus:ring-indigo-500"
                      >
                        <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                        إضافة
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">اضغط Enter لإضافة العلامة</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 space-x-reverse pt-5 border-t border-gray-200 dark:border-gray-700">
                <button type="button" onClick={() => navigate('/products')} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">إلغاء</button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white rounded-md text-sm font-medium hover:bg-indigo-700 dark:hover:bg-indigo-800 disabled:opacity-50 dark:disabled:opacity-50">
                  {loading ? 'جاري الحفظ...' : (isEditMode ? 'تحديث المنتج' : 'حفظ المنتج')}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductNewFinal;

