import React, { useState, useEffect } from 'react';
import VariantSelector from './VariantSelector';

interface Variant {
  id: string;
  name: string;
  type: string;
  stock: number;
  price?: number;
  trackInventory?: boolean;
}

interface CompositeVariantSelectorProps {
  variants: Variant[];
  onSelect: (variantId: string) => void;
  selectedVariantId?: string | null;
  productPrice?: number;
  variantSettings?: {
    styles?: { [key: string]: 'buttons' | 'circles' | 'dropdown' | 'thumbnails' | 'radio' };
    attributeImages?: { [key: string]: { [value: string]: string } };
  };
}

const CompositeVariantSelector: React.FC<CompositeVariantSelectorProps> = ({
  variants,
  onSelect,
  selectedVariantId,
  productPrice,
  variantSettings
}) => {
  // Helper to parse variant name parts handling different formats
  const normalizeVariantParts = (name: string) => {
    // Handle "Color: Red | Size: XL" format
    if (name.includes('|')) {
      return name.split('|').map(part =>
        part.trim().replace(/^(اللون:|المقاس:|Color:|Size:)\s*/i, '')
      );
    }
    // Handle "Red - XL" format
    return name.split(' - ').map(p => p.trim());
  };

  // استخراج الألوان والمقاسات من أسماء المتغيرات المركبة
  const extractAttributes = () => {
    const colors = new Set<string>();
    const sizes = new Set<string>();
    const sizePatterns = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '2XL', '3XL', '4XL', '5XL'];
    const arabicSizePatterns = ['صغير', 'وسط', 'كبير', 'كبير جداً'];
    const numericSizePattern = /^\d{2,3}$/; // مقاسات رقمية مثل 38, 39, 40

    variants.forEach(v => {
      const parts = normalizeVariantParts(v.name);
      parts.forEach(part => {
        const upperPart = part.toUpperCase();
        if (
          sizePatterns.includes(upperPart) ||
          arabicSizePatterns.includes(part) ||
          numericSizePattern.test(part)
        ) {
          sizes.add(part);
        } else {
          colors.add(part);
        }
      });
    });

    return {
      colors: Array.from(colors),
      sizes: Array.from(sizes).sort((a, b) => {
        // ترتيب المقاسات
        const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '2XL', '3XL', '4XL', '5XL'];
        const aIndex = sizeOrder.indexOf(a.toUpperCase());
        const bIndex = sizeOrder.indexOf(b.toUpperCase());
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        // للمقاسات الرقمية
        const aNum = parseInt(a);
        const bNum = parseInt(b);
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
        return a.localeCompare(b);
      })
    };
  };

  const { colors, sizes } = extractAttributes();

  // تحديد القيم الافتراضية من المتغير المحدد حالياً
  const getInitialSelections = () => {
    if (selectedVariantId) {
      const selectedVariant = variants.find(v => v.id === selectedVariantId);
      if (selectedVariant) {
        const parts = normalizeVariantParts(selectedVariant.name);
        let initialColor = null;
        let initialSize = null;

        parts.forEach(part => {
          if (colors.includes(part)) initialColor = part;
          if (sizes.includes(part)) initialSize = part;
        });

        return { initialColor, initialSize };
      }
    }

    // إيجاد أول توليفة متوفرة
    for (const color of colors) {
      for (const size of sizes) {
        const variant = variants.find(v => v.name.includes(color) && v.name.includes(size));
        // متوفر إذا: لا يتتبع المخزون أو لديه مخزون
        if (variant && (variant.trackInventory === false || variant.stock > 0)) {
          return { initialColor: color, initialSize: size };
        }
      }
    }

    return { initialColor: colors[0] || null, initialSize: sizes[0] || null };
  };

  const { initialColor, initialSize } = getInitialSelections();
  const [selectedColor, setSelectedColor] = useState<string | null>(initialColor);
  const [selectedSize, setSelectedSize] = useState<string | null>(initialSize);

  // استدعاء onSelect عند التحميل الأول إذا كان هناك اختيار افتراضي
  useEffect(() => {
    if (initialColor && initialSize) {
      const matchingVariant = variants.find(v =>
        v.name.includes(initialColor) && v.name.includes(initialSize)
      );
      if (matchingVariant) {
        onSelect(matchingVariant.id);
      }
    }
  }, []); // تشغيل مرة واحدة فقط عند التحميل

  // تحديث المتغير المحدد عند تغيير اللون أو المقاس
  useEffect(() => {
    if (selectedColor && selectedSize) {
      const matchingVariant = variants.find(v =>
        v.name.includes(selectedColor) && v.name.includes(selectedSize)
      );
      if (matchingVariant) {
        onSelect(matchingVariant.id);
      }
    } else if (selectedColor && sizes.length === 0) {
      const matchingVariant = variants.find(v => v.name.includes(selectedColor));
      if (matchingVariant) onSelect(matchingVariant.id);
    } else if (selectedSize && colors.length === 0) {
      const matchingVariant = variants.find(v => v.name.includes(selectedSize));
      if (matchingVariant) onSelect(matchingVariant.id);
    }
  }, [selectedColor, selectedSize, variants, onSelect, sizes.length, colors.length]);

  // التحقق من توفر التوليفة
  const isComboAvailable = (color: string, size: string) => {
    const variant = variants.find(v =>
      v.name.includes(color) && v.name.includes(size)
    );
    // متوفر إذا: لا يتتبع المخزون أو لديه مخزون
    return variant && (variant.trackInventory === false || variant.stock > 0);
  };

  // التحقق من توفر اللون (أي مقاس)
  const isColorAvailable = (color: string) => {
    if (sizes.length === 0) {
      return variants.some(v => v.name.includes(color) && (v.trackInventory === false || v.stock > 0));
    }
    return sizes.some(size => isComboAvailable(color, size));
  };

  // التحقق من توفر المقاس (مع اللون المحدد)
  const isSizeAvailable = (size: string) => {
    if (selectedColor) {
      return isComboAvailable(selectedColor, size);
    }
    return variants.some(v => v.name.includes(size) && (v.trackInventory === false || v.stock > 0));
  };

  // إنشاء متغيرات وهمية للألوان والمقاسات للاستخدام مع VariantSelector
  const createColorVariants = () => {
    return colors.map(color => {
      // البحث عن متغير يحتوي على هذا اللون
      const matchingVariant = variants.find(v => {
        const parts = normalizeVariantParts(v.name);
        return parts.includes(color);
      });

      // البحث عن صورة لهذا اللون من المتغيرات
      let colorImage: string | undefined;
      for (const v of variants) {
        const parts = normalizeVariantParts(v.name);
        if (parts.includes(color)) {
          // محاولة استخراج الصور من المتغير
          if (v.images && Array.isArray(v.images) && v.images.length > 0) {
            colorImage = v.images[0];
            break;
          } else if (typeof v.images === 'string') {
            try {
              const parsedImages = JSON.parse(v.images);
              if (Array.isArray(parsedImages) && parsedImages.length > 0) {
                colorImage = parsedImages[0];
                break;
              }
            } catch (e) {
              // ignore
            }
          }
        }
      }

      // حساب المخزون الإجمالي لهذا اللون (من جميع المقاسات)
      let totalStock = 0;
      let hasAvailableStock = false;
      variants.forEach(v => {
        const parts = normalizeVariantParts(v.name);
        if (parts.includes(color)) {
          if (v.trackInventory === false || v.stock > 0) {
            hasAvailableStock = true;
            totalStock += v.stock || 0;
          }
        }
      });

      return {
        id: `color-${color}`,
        name: color,
        type: 'color',
        stock: hasAvailableStock ? totalStock : 0,
        price: matchingVariant?.price,
        trackInventory: matchingVariant?.trackInventory !== false,
        images: colorImage ? [colorImage] : []
      };
    });
  };

  const createSizeVariants = () => {
    return sizes.map(size => {
      // البحث عن متغير يحتوي على هذا المقاس
      const matchingVariant = variants.find(v => {
        const parts = normalizeVariantParts(v.name);
        return parts.includes(size);
      });

      // حساب المخزون الإجمالي لهذا المقاس (من جميع الألوان)
      let totalStock = 0;
      let hasAvailableStock = false;
      variants.forEach(v => {
        const parts = normalizeVariantParts(v.name);
        if (parts.includes(size)) {
          if (v.trackInventory === false || v.stock > 0) {
            hasAvailableStock = true;
            totalStock += v.stock || 0;
          }
        }
      });

      return {
        id: `size-${size}`,
        name: size,
        type: 'size',
        stock: hasAvailableStock ? totalStock : 0,
        price: matchingVariant?.price,
        trackInventory: matchingVariant?.trackInventory !== false
      };
    });
  };

  // الحصول على نمط العرض من الإعدادات
  const colorStyle = variantSettings?.styles?.['اللون'] || variantSettings?.styles?.['color'] || 'thumbnails'; // تغيير الافتراضي إلى thumbnails
  const sizeStyle = variantSettings?.styles?.['الحجم'] || variantSettings?.styles?.['size'] || 'buttons';

  // إنشاء المتغيرات مع الصور
  const colorVariants = createColorVariants();
  const sizeVariants = createSizeVariants();

  // دمج صور الألوان من attributeImages مع الصور من المتغيرات
  const attributeColorImages = variantSettings?.attributeImages?.['اللون'] || variantSettings?.attributeImages?.['color'] || {};

  // إنشاء خريطة صور الألوان من المتغيرات
  const colorImagesFromVariants: { [key: string]: string } = {};
  colorVariants.forEach(cv => {
    if (cv.images && cv.images.length > 0) {
      colorImagesFromVariants[cv.name] = cv.images[0];
    }
  });

  // دمج الصور: attributeImages أولاً (لها الأولوية)، ثم صور المتغيرات
  const colorImages = { ...colorImagesFromVariants, ...attributeColorImages };

  // معالجة اختيار اللون
  const handleColorSelect = (variantId: string) => {
    const color = variantId.replace('color-', '');
    setSelectedColor(color);
    // إذا كان المقاس محدداً بالفعل، حدد المتغير مباشرة
    if (selectedSize) {
      const matchingVariant = variants.find(v =>
        v.name.includes(color) && v.name.includes(selectedSize)
      );
      if (matchingVariant) {
        onSelect(matchingVariant.id);
      }
    }
  };

  // معالجة اختيار المقاس
  const handleSizeSelect = (variantId: string) => {
    const size = variantId.replace('size-', '');
    setSelectedSize(size);
    // إذا كان اللون محدداً بالفعل، حدد المتغير مباشرة
    if (selectedColor) {
      const matchingVariant = variants.find(v =>
        v.name.includes(selectedColor) && v.name.includes(size)
      );
      if (matchingVariant) {
        onSelect(matchingVariant.id);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* اختيار اللون */}
      {colors.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">اللون:</h3>
          <VariantSelector
            variants={colorVariants}
            selectedVariant={selectedColor ? `color-${selectedColor}` : null}
            onSelect={handleColorSelect}
            style={colorStyle as any}
            variantType="color"
            productPrice={productPrice}
            showStock={false}
            attributeImages={colorImages}
          />
        </div>
      )}

      {/* اختيار المقاس */}
      {sizes.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">المقاس:</h3>
          <VariantSelector
            variants={sizeVariants}
            selectedVariant={selectedSize ? `size-${selectedSize}` : null}
            onSelect={handleSizeSelect}
            style={sizeStyle as any}
            variantType="size"
            productPrice={productPrice}
            showStock={true}
          />
        </div>
      )}

      {/* عرض التوليفة المحددة - مع فرق السعر */}
      {selectedColor && selectedSize && (
        <div className="text-sm text-gray-600 mt-2">
          الاختيار: <span className="font-medium">{selectedColor} - {selectedSize}</span>
          {(() => {
            const variant = variants.find(v =>
              v.name.includes(selectedColor) && v.name.includes(selectedSize)
            );
            if (variant) {
              const diff = (variant.price && productPrice) ? variant.price - productPrice : 0;
              const priceDiffText = diff > 0.1 ? ` (+${diff})` : diff < -0.1 ? ` (${diff})` : '';

              return (
                <span>
                  {priceDiffText && <span className="text-green-600 font-bold mx-2">{priceDiffText}</span>}
                  {variant.stock === 0 && <span className="text-red-500 mr-2">(غير متوفر)</span>}
                </span>
              );
            }
            return null;
          })()}
        </div>
      )}
    </div>
  );
};

export default CompositeVariantSelector;
