import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../../utils/urlHelper';
import {
  XMarkIcon,
  PlusIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ShoppingCartIcon
} from '@heroicons/react/24/outline';

interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  stock: number;
  description?: string;
}

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  conversationId: string;
  onOrderCreated: (orderData: any) => void;
}

const OrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  onClose,
  customerId,
  customerName,
  conversationId,
  onOrderCreated
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<OrderItem[]>([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // تحميل المنتجات
  const loadProducts = async () => {
    if (!isOpen) return;
    
    setLoading(true);
    try {
      const response = await fetch(buildApiUrl('products'));
      const data = await response.json();
      if (data.success) {
        setProducts(data.data || []);
      }
    } catch (error) {
      console.error('❌ Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  // إضافة منتج للطلب
  const addProductToOrder = (product: Product) => {
    const existingItem = selectedProducts.find(item => item.productId === product.id);
    
    if (existingItem) {
      setSelectedProducts(prev => prev.map(item => 
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
          : item
      ));
    } else {
      const newItem: OrderItem = {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        price: product.price,
        total: product.price
      };
      setSelectedProducts(prev => [...prev, newItem]);
    }
  };

  // إزالة منتج من الطلب
  const removeProductFromOrder = (productId: string) => {
    setSelectedProducts(prev => prev.filter(item => item.productId !== productId));
  };

  // تحديث كمية المنتج
  const updateProductQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeProductFromOrder(productId);
      return;
    }
    
    setSelectedProducts(prev => prev.map(item => 
      item.productId === productId
        ? { ...item, quantity, total: quantity * item.price }
        : item
    ));
  };

  // حساب إجمالي الطلب
  const calculateOrderTotal = () => {
    return selectedProducts.reduce((total, item) => total + item.total, 0);
  };

  // إنشاء الطلب
  const createOrder = async () => {
    if (selectedProducts.length === 0 || creatingOrder) return;

    setCreatingOrder(true);

    try {
      const orderData = {
        customerId,
        conversationId,
        products: selectedProducts,
        shippingAddress: shippingAddress.trim() || undefined,
        notes: orderNotes.trim() || undefined
      };

      const response = await fetch(buildApiUrl('orders'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();

      if (data.success) {
        setOrderSuccess(true);
        
        // استدعاء callback للمكون الأب
        onOrderCreated({
          orderNumber: data.data.orderNumber || `ORD-${Date.now()}`,
          total: calculateOrderTotal(),
          ...data.data
        });

        // إغلاق النافذة بعد 2 ثانية
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
    setOrderSuccess(false);
    onClose();
  };

  // تحميل المنتجات عند فتح النافذة
  useEffect(() => {
    if (isOpen) {
      loadProducts();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-60 overflow-y-auto">
                    {products.map((product) => (
                      <div key={product.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        {product.image && (
                          <img 
                            src={product.image} 
                            alt={product.name} 
                            className="w-full h-32 object-cover rounded mb-2" 
                          />
                        )}
                        <h4 className="font-medium text-gray-900">{product.name}</h4>
                        {product.description && (
                          <p className="text-sm text-gray-600 mb-2">{product.description}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-600">{product.price} ج.م</span>
                          <button
                            onClick={() => addProductToOrder(product)}
                            disabled={product.stock <= 0}
                            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-3 py-1 rounded text-sm flex items-center"
                          >
                            <PlusIcon className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          المتوفر: {product.stock}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* المنتجات المختارة */}
              {selectedProducts.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">المنتجات المختارة</h3>
                  <div className="space-y-2">
                    {selectedProducts.map((item) => (
                      <div key={item.productId} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                        <div>
                          <span className="font-medium">{item.productName}</span>
                          <span className="text-sm text-gray-600 ml-2">({item.price} ج.م)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateProductQuantity(item.productId, item.quantity - 1)}
                            className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center"
                          >
                            -
                          </button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateProductQuantity(item.productId, item.quantity + 1)}
                            className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center"
                          >
                            +
                          </button>
                          <span className="font-bold text-blue-600 ml-4">{item.total} ج.م</span>
                          <button
                            onClick={() => removeProductFromOrder(item.productId)}
                            className="text-red-500 hover:text-red-700 ml-2"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-4 bg-blue-50 rounded">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>الإجمالي:</span>
                      <span className="text-blue-600">{calculateOrderTotal()} ج.م</span>
                    </div>
                  </div>
                </div>
              )}

              {/* تفاصيل إضافية */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    عنوان الشحن
                  </label>
                  <textarea
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={2}
                    placeholder="أدخل عنوان الشحن..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ملاحظات
                  </label>
                  <textarea
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="أي ملاحظات إضافية..."
                  />
                </div>
              </div>
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
              disabled={selectedProducts.length === 0 || creatingOrder}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg font-medium flex items-center space-x-2"
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

export default OrderModal;
