import React, { useState, useEffect } from 'react';
import { 
  CubeIcon, 
  ShoppingBagIcon, 
  CurrencyDollarIcon,
  ChartBarIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { buildApiUrl } from '../../utils/urlHelper';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  comparePrice?: number;
  stock: number;
  images?: string[];
  category?: {
    id: string;
    name: string;
  };
  isActive: boolean;
  isFeatured: boolean;
}

interface ProductInfoPanelProps {
  companyId?: string;
  onClose?: () => void;
}

const ProductInfoPanel: React.FC<ProductInfoPanelProps> = ({ companyId, onClose }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    loadProducts();
  }, [companyId]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // استخدام testChatService إذا كان متوفراً
      const response = await fetch(buildApiUrl('test-chat/marketing-company/products?limit=50'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const result = await response.json();
      setProducts(result.data || []);
      setStats(result.stats || null);
    } catch (err: any) {
      console.error('Error loading products:', err);
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">جاري تحميل المنتجات...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-red-600 text-center py-4">
          <p>❌ {error}</p>
          <button
            onClick={loadProducts}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBagIcon className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-900">معلومات المنتجات</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">إجمالي المنتجات</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <div className="text-sm text-gray-600">نشط</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.inStock}</div>
              <div className="text-sm text-gray-600">متوفر</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.outOfStock}</div>
              <div className="text-sm text-gray-600">غير متوفر</div>
            </div>
          </div>
        </div>
      )}

      {/* Products List */}
      <div className="flex-1 overflow-y-auto p-4">
        {products.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CubeIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>لا توجد منتجات</p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <div
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedProduct?.id === product.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{product.name}</h4>
                    {product.category && (
                      <p className="text-sm text-gray-500 mt-1">{product.category.name}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm font-bold text-blue-600">
                        {product.price.toFixed(2)} ج.م
                      </span>
                      {product.stock > 0 ? (
                        <span className="text-sm text-green-600">✓ متوفر</span>
                      ) : (
                        <span className="text-sm text-red-600">✗ غير متوفر</span>
                      )}
                    </div>
                  </div>
                  {product.isFeatured && (
                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                      مميز
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Product Details Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">{selectedProduct.name}</h3>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {selectedProduct.description && (
              <p className="text-gray-600 mb-4">{selectedProduct.description}</p>
            )}

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-semibold text-gray-700">السعر</label>
                <p className="text-lg font-bold text-blue-600">
                  {selectedProduct.price.toFixed(2)} ج.م
                </p>
                {selectedProduct.comparePrice && (
                  <p className="text-sm text-gray-500 line-through">
                    {selectedProduct.comparePrice.toFixed(2)} ج.م
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">المخزون</label>
                <p className={`text-lg font-bold ${selectedProduct.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedProduct.stock}
                </p>
              </div>
            </div>

            {selectedProduct.category && (
              <div className="mb-4">
                <label className="text-sm font-semibold text-gray-700">الفئة</label>
                <p className="text-gray-600">{selectedProduct.category.name}</p>
              </div>
            )}

            {selectedProduct.images && selectedProduct.images.length > 0 && (
              <div className="mt-4">
                <label className="text-sm font-semibold text-gray-700">الصور</label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {selectedProduct.images.slice(0, 6).map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`${selectedProduct.name} ${index + 1}`}
                      className="w-full h-24 object-cover rounded border"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductInfoPanel;

