import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../../utils/urlHelper';
import {
  XMarkIcon,
  PlusIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ShoppingCartIcon,
  TruckIcon
} from '@heroicons/react/24/outline';

interface ProductVariant {
  id: string;
  name: string;
  type: string; // 'color', 'size', etc.
  price: number | null;
  stock: number;
  images: string | null;
  isActive: boolean;
}

interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  stock: number;
  description?: string;
  variants?: ProductVariant[];
}

interface ShippingZone {
  id: string;
  governorates: string[]; // Array of governorate names
  price: number;
  deliveryTime: string;
  isActive: boolean;
}

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
  variantId?: string;
  productColor?: string;
  productSize?: string;
}

interface OrderModalEnhancedProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  conversationId: string;
  onOrderCreated: (orderData: any) => void;
}

const OrderModalEnhanced: React.FC<OrderModalEnhancedProps> = ({
  isOpen,
  onClose,
  customerId,
  customerName,
  conversationId,
  onOrderCreated
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<OrderItem[]>([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingCost, setShippingCost] = useState(0);
  const [deliveryTime, setDeliveryTime] = useState('');
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, { color?: string; size?: string }>>({});

  // تحميل المنتجات مع الـ variants
  const loadProducts = async () => {
    if (!isOpen) return;
    
    setLoading(true);
    try {
      const response = await fetch(buildApiUrl('products'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        // جلب الـ variants لكل منتج
        const productsWithVariants = await Promise.all(
          (data.data || []).map(async (product: Product) => {
            try {
              const variantsResponse = await fetch(
                buildApiUrl(`products/${product.id}/variants`),
                {
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                  }
                }
              );
              const variantsData = await variantsResponse.json();
              return {
                ...product,
                variants: variantsData.success ? variantsData.data : []
              };
            } catch (error) {
              console.error(`Error loading variants for product ${product.id}:`, error);
              return { ...product, variants: [] };
            }
          })
        );
        setProducts(productsWithVariants);
      }
    } catch (error) {
      console.error('❌ Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  // تحميل مناطق الشحن
  const loadShippingZones = async () => {
    if (!isOpen) return;
    
    try {
      const response = await fetch(buildApiUrl('shipping-zones'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setShippingZones(data.data || []);
      }
    } catch (error) {
      console.error('❌ Error loading shipping zones:', error);
    }
  };

  // حساب تكلفة الشحن بناءً على المدينة
  const calculateShipping = (city: string) => {
    if (!city) {
      setShippingCost(0);
      setDeliveryTime('');
      return;
    }

    const normalizedCity = city.trim().toLowerCase();
    
    // البحث عن المنطقة المناسبة
    const zone = shippingZones.find(zone => 
      zone.isActive && zone.governorates.some(gov => 
        gov.toLowerCase().includes(normalizedCity) || 
        normalizedCity.includes(gov.toLowerCase())
      )
    );

    if (zone) {
      setShippingCost(Number(zone.price));
      setDeliveryTime(zone.deliveryTime);
    } else {
      setShippingCost(0);
      setDeliveryTime('');
    }
  };

  // معالجة تغيير المدينة
  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    calculateShipping(city);
  };

  // الحصول على الـ variants حسب النوع
  const getVariantsByType = (product: Product, type: string) => {
    return product.variants?.filter(v => v.type === type && v.isActive) || [];
  };

  // إضافة منتج للطلب
  const addProductToOrder = (product: Product) => {
    const variants = selectedVariants[product.id];
    const colorVariants = getVariantsByType(product, 'color');
    const sizeVariants = getVariantsByType(product, 'size');

    // التحقق من اختيار الـ variants إذا كانت موجودة
    if (colorVariants.length > 0 && !variants?.color) {
      alert('الرجاء اختيار اللون أولاً');
      return;
    }
    if (sizeVariants.length > 0 && !variants?.size) {
      alert('الرجاء اختيار المقاس أولاً');
      return;
    }

    // الحصول على الـ variant المختار
    let selectedVariant: ProductVariant | undefined;
    let variantPrice = product.price;

    if (variants?.color) {
      selectedVariant = colorVariants.find(v => v.id === variants.color);
      if (selectedVariant?.price) {
        variantPrice = selectedVariant.price;
      }
    }

    const existingItem = selectedProducts.find(
      item => item.productId === product.id && 
      item.variantId === selectedVariant?.id
    );
    
    if (existingItem) {
      setSelectedProducts(prev => prev.map(item => 
        item.productId === product.id && item.variantId === selectedVariant?.id
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
          : item
      ));
    } else {
      const colorVariant = colorVariants.find(v => v.id === variants?.color);
      const sizeVariant = sizeVariants.find(v => v.id === variants?.size);

      const newItem: OrderItem = {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        price: variantPrice,
        total: variantPrice,
        variantId: selectedVariant?.id,
        productColor: colorVariant?.name,
        productSize: sizeVariant?.name
      };
      setSelectedProducts(prev => [...prev, newItem]);
    }

    // إعادة تعيين الـ variants المختارة
    setSelectedVariants(prev => ({
      ...prev,
      [product.id]: {}
    }));
  };

  // إزالة منتج من الطلب
  const removeProductFromOrder = (index: number) => {
    setSelectedProducts(prev => prev.filter((_, i) => i !== index));
  };

  // تحديث كمية المنتج
  const updateProductQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeProductFromOrder(index);
      return;
    }
    
    setSelectedProducts(prev => prev.map((item, i) => 
      i === index
        ? { ...item, quantity, total: quantity * item.price }
        : item
    ));
  };

  // حساب إجمالي المنتجات
  const calculateSubtotal = () => {
    return selectedProducts.reduce((total, item) => total + item.total, 0);
  };

  // حساب الإجمالي الكلي
  const calculateTotal = () => {
    return calculateSubtotal() + shippingCost;
  };

  // إنشاء الطلب
  const createOrder = async () => {
    if (selectedProducts.length === 0 || creatingOrder) return;

    if (!selectedCity) {
      alert('الرجاء اختيار المدينة');
      return;
    }

    if (!customerPhone) {
      alert('الرجاء إدخال رقم الهاتف');
      return;
    }

    setCreatingOrder(true);

    try {
      const orderData = {
        customerId,
        conversationId,
        items: selectedProducts.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
          productName: item.productName,
          productColor: item.productColor,
          productSize: item.productSize
        })),
        subtotal: calculateSubtotal(),
        shipping: shippingCost,
        total: calculateTotal(),
        city: selectedCity,
        customerPhone,
        shippingAddress: shippingAddress.trim() || undefined,
        notes: orderNotes.trim() || undefined,
        metadata: JSON.stringify({
          deliveryTime,
          shippingZone: shippingZones.find(z => 
            z.governorates.some(g => g.toLowerCase().includes(selectedCity.toLowerCase()))
          )?.id
        })
      };

      const response = await fetch(buildApiUrl('orders'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();

      if (data.success) {
        setOrderSuccess(true);
        
        onOrderCreated({
          orderNumber: data.data.orderNumber || `ORD-${Date.now()}`,
          total: calculateTotal(),
          ...data.data
        });

        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        alert('فشل في إنشاء الطلب: ' + (data.error || 'خطأ غير معروف'));
      }
    } catch (error) {
      console.error('❌ Error creating order:', error);
      alert('حدث خطأ أثناء إنشاء الطلب');
    } finally {
      setCreatingOrder(false);
    }
  };

  // إغلاق النافذة وتنظيف البيانات
  const handleClose = () => {
    setSelectedProducts([]);
    setOrderNotes('');
    setShippingAddress('');
    setSelectedCity('');
    setCustomerPhone('');
    setShippingCost(0);
    setDeliveryTime('');
    setOrderSuccess(false);
    setSelectedVariants({});
    onClose();
  };

  // تحميل البيانات عند فتح النافذة
  useEffect(() => {
    if (isOpen) {
      loadProducts();
      loadShippingZones();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* رأس النافذة */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">إنشاء طلب جديد</h2>
            <p className="text-sm text-gray-600">للعميل: {customerName}</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* محتوى النافذة */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {orderSuccess ? (
            <div className="text-center py-8">
              <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-green-600 mb-2">تم إنشاء الطلب بنجاح!</h3>
              <p className="text-gray-600">سيتم إغلاق النافذة تلقائياً...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* قائمة المنتجات */}
              <div>
                <h3 className="text-lg font-semibold mb-4">اختر المنتجات</h3>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-500" />
                    <span className="ml-2">جاري تحميل المنتجات...</span>
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <ShoppingCartIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>لا توجد منتجات متاحة</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto p-2">
                    {products.map((product) => {
                      const colorVariants = getVariantsByType(product, 'color');
                      const sizeVariants = getVariantsByType(product, 'size');
                      const selectedVariant = selectedVariants[product.id] || {};

                      return (
                        <div key={product.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          {product.image && (
                            <img 
                              src={product.image} 
                              alt={product.name} 
                              className="w-full h-32 object-cover rounded mb-2" 
                            />
                          )}
                          <h4 className="font-medium text-gray-900 mb-2">{product.name}</h4>
                          
                          {/* اختيار اللون */}
                          {colorVariants.length > 0 && (
                            <div className="mb-2">
                              <label className="text-xs text-gray-600 block mb-1">اللون:</label>
                              <select
                                value={selectedVariant.color || ''}
                                onChange={(e) => setSelectedVariants(prev => ({
                                  ...prev,
                                  [product.id]: { ...prev[product.id], color: e.target.value }
                                }))}
                                className="w-full text-sm border rounded px-2 py-1"
                              >
                                <option value="">اختر اللون</option>
                                {colorVariants.map(variant => (
                                  <option key={variant.id} value={variant.id}>
                                    {variant.name} {variant.price ? `(${variant.price} ج.م)` : ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* اختيار المقاس */}
                          {sizeVariants.length > 0 && (
                            <div className="mb-2">
                              <label className="text-xs text-gray-600 block mb-1">المقاس:</label>
                              <select
                                value={selectedVariant.size || ''}
                                onChange={(e) => setSelectedVariants(prev => ({
                                  ...prev,
                                  [product.id]: { ...prev[product.id], size: e.target.value }
                                }))}
                                className="w-full text-sm border rounded px-2 py-1"
                              >
                                <option value="">اختر المقاس</option>
                                {sizeVariants.map(variant => (
                                  <option key={variant.id} value={variant.id}>
                                    {variant.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-2">
                            <span className="font-bold text-blue-600">{product.price} ج.م</span>
                            <button
                              onClick={() => addProductToOrder(product)}
                              disabled={product.stock <= 0}
                              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-3 py-1 rounded text-sm flex items-center"
                            >
                              <PlusIcon className="w-4 h-4 ml-1" />
                              إضافة
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            المتوفر: {product.stock}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* المنتجات المختارة */}
              {selectedProducts.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">المنتجات المختارة</h3>
                  <div className="space-y-2">
                    {selectedProducts.map((item, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                        <div className="flex-1">
                          <span className="font-medium">{item.productName}</span>
                          {item.productColor && (
                            <span className="text-xs text-gray-600 mr-2">• {item.productColor}</span>
                          )}
                          {item.productSize && (
                            <span className="text-xs text-gray-600 mr-2">• {item.productSize}</span>
                          )}
                          <div className="text-sm text-gray-600">({item.price} ج.م)</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateProductQuantity(index, item.quantity - 1)}
                            className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateProductQuantity(index, item.quantity + 1)}
                            className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center"
                          >
                            +
                          </button>
                          <span className="font-bold text-blue-600 mr-4 min-w-[80px] text-left">
                            {item.total.toFixed(2)} ج.م
                          </span>
                          <button
                            onClick={() => removeProductFromOrder(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <XMarkIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* معلومات الشحن والعميل */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رقم الهاتف <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="01xxxxxxxxx"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <TruckIcon className="w-4 h-4 inline ml-1" />
                    المدينة / المحافظة <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedCity}
                    onChange={(e) => handleCityChange(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">اختر المدينة</option>
                    {shippingZones.map(zone => 
                      zone.governorates.map((gov, idx) => (
                        <option key={`${zone.id}-${idx}`} value={gov}>
                          {gov} - {zone.price} ج.م ({zone.deliveryTime})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* عنوان الشحن */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  عنوان الشحن التفصيلي
                </label>
                <textarea
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="الشارع، رقم المبنى، معالم مميزة..."
                />
              </div>

              {/* ملاحظات */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ملاحظات
                </label>
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="أي ملاحظات إضافية..."
                />
              </div>

              {/* ملخص الطلب */}
              {selectedProducts.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-gray-700">
                    <span>إجمالي المنتجات:</span>
                    <span className="font-medium">{calculateSubtotal().toFixed(2)} ج.م</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>تكلفة الشحن:</span>
                    <span className="font-medium">
                      {shippingCost > 0 ? `${shippingCost.toFixed(2)} ج.م` : 'اختر المدينة'}
                    </span>
                  </div>
                  {deliveryTime && (
                    <div className="flex justify-between text-gray-600 text-sm">
                      <span>مدة التوصيل:</span>
                      <span>{deliveryTime}</span>
                    </div>
                  )}
                  <div className="border-t border-blue-200 pt-2 mt-2">
                    <div className="flex justify-between items-center text-lg font-bold text-blue-600">
                      <span>الإجمالي الكلي:</span>
                      <span>{calculateTotal().toFixed(2)} ج.م</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* أسفل النافذة */}
        {!orderSuccess && (
          <div className="flex items-center justify-between p-6 border-t bg-gray-50">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              إلغاء
            </button>
            <button
              onClick={createOrder}
              disabled={selectedProducts.length === 0 || !selectedCity || !customerPhone || creatingOrder}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2"
            >
              {creatingOrder && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
              <span>{creatingOrder ? 'جاري الإنشاء...' : 'إنشاء الطلب'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderModalEnhanced;
