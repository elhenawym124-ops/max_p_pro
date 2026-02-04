import React, { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  PhotoIcon,
  LinkIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { postAITrackingService, PostAITrackingData, PostDetails } from '../../services/postAITrackingService';
import { companyAwareApi } from '../../services/companyAwareApi';

const PostAITracking: React.FC = () => {
  const [posts, setPosts] = useState<PostAITrackingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Array<{ id: string; name: string; price: number }>>([]);
  const [updatingProducts, setUpdatingProducts] = useState<Set<string>>(new Set());
  const [postDetails, setPostDetails] = useState<Map<string, PostDetails>>(new Map());
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await companyAwareApi.get('/products', {
        params: { isActive: true, limit: 1000 }
      });
      if (response.data && response.data.data) {
        setProducts(response.data.data.map((p: any) => ({
          id: p.id,
          name: p.name,
          price: p.price
        })));
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const handleFeaturedProductChange = async (postId: string, productId: string | null) => {
    setUpdatingProducts(prev => new Set(prev).add(postId));
    try {
      await postAITrackingService.updateFeaturedProduct(postId, productId);
      // Update local state
      setPosts(prevPosts => prevPosts.map(post =>
        post.postId === postId
          ? {
            ...post,
            featuredProductId: productId,
            featuredProduct: productId ? products.find(p => p.id === productId) || null : null
          }
          : post
      ));
    } catch (err: any) {
      console.error('Error updating featured product:', err);
      alert(err.message || 'فشل في تحديث المنتج المميز');
    } finally {
      setUpdatingProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    }
  };

  const fetchPostDetails = async (post: PostAITrackingData) => {
    if (postDetails.has(post.postId) || loadingDetails.has(post.postId)) {
      return; // Already loaded or loading
    }

    setLoadingDetails(prev => new Set(prev).add(post.postId));
    try {
      const response = await postAITrackingService.getPostDetails(post.postId);
      if (response.success && response.data) {
        setPostDetails(prev => {
          const newMap = new Map(prev);
          newMap.set(post.postId, response.data);
          return newMap;
        });
      }
    } catch (err: any) {
      console.error('Error fetching post details:', err);
      // Don't show error to user - just log it
    } finally {
      setLoadingDetails(prev => {
        const newSet = new Set(prev);
        newSet.delete(post.postId);
        return newSet;
      });
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await postAITrackingService.getPostsAITracking();
      if (response.success && response.data) {
        const postsData = response.data.posts;
        setPosts(postsData);

        // جلب تفاصيل البوستات مباشرة
        postsData.forEach((post: PostAITrackingData) => {
          fetchPostDetails(post);
        });
      }
    } catch (err: any) {
      setError(err.message || 'فشل في جلب البيانات');
      console.error('Error fetching posts AI tracking:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = searchQuery === '' ||
      post.postId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'غير محدد';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'غير محدد';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 p-4 md:p-8">
        <div className="w-full">
          <div className="bg-white dark:bg-gray-900/50 backdrop-blur-xl rounded-2xl shadow-xl p-12 text-center border border-white/20 dark:border-gray-800">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-4 text-slate-600 dark:text-gray-400 font-medium">جاري تحميل البيانات...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950 p-4 md:p-8">
        <div className="w-full">
          <div className="bg-white dark:bg-gray-900/50 backdrop-blur-xl rounded-2xl shadow-xl p-12 text-center border border-white/20 dark:border-gray-800">
            <XMarkIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 dark:text-red-400 text-lg font-medium mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 p-4 md:p-8 transition-colors duration-300">
      <div className="w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 dark:text-white">إدارة البوستات</h1>
              <p className="text-slate-600 dark:text-gray-400 mt-1">عرض البوستات وتحديد المنتجات المميزة</p>
            </div>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
            >
              <ArrowPathIcon className="w-5 h-5" />
              تحديث
            </button>
          </div>
        </div>

        {/* Search Filter */}
        <div className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-xl rounded-2xl shadow-xl p-6 mb-8 border border-white/20 dark:border-gray-800">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-gray-500" />
            <input
              type="text"
              className="w-full pr-10 pl-4 py-3 bg-slate-50 dark:bg-gray-800/50 border-2 border-slate-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800 transition-all text-right dark:text-white dark:placeholder-gray-500"
              placeholder="ابحث عن معرف البوست..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Posts Cards */}
        <div className="space-y-4">
          {filteredPosts.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-12 text-center">
              <PhotoIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg font-medium">لا توجد بوستات</p>
            </div>
          ) : (
            filteredPosts.map((post: PostAITrackingData) => {
              const details = postDetails.get(post.postId);
              const isLoadingDetails = loadingDetails.has(post.postId);

              return (
                <div
                  key={post.postId}
                  className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 dark:border-gray-800 overflow-hidden transition-all hover:shadow-2xl"
                >
                  {/* Post Header */}
                  <div className="p-6">
                    <div className="mb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white font-mono">
                          {post.postId}
                        </h3>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-gray-400">
                        <span>عدد الزيارات: <strong className="text-slate-800 dark:text-gray-200">{post.visitCount || 0}</strong></span>
                        <span>•</span>
                        <span>أول زيارة: {formatDate(post.firstVisitAt)}</span>
                        <span>•</span>
                        <span>آخر زيارة: {formatDate(post.lastVisitAt)}</span>
                      </div>
                    </div>

                    {/* Post Details */}
                    <div className="mb-4 p-4 bg-slate-50 dark:bg-gray-800/50 rounded-lg border border-slate-200 dark:border-gray-700">
                      {isLoadingDetails ? (
                        <div className="text-center py-4">
                          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                          <p className="mt-2 text-slate-600 dark:text-gray-400 text-sm">جاري جلب تفاصيل البوست...</p>
                        </div>
                      ) : details ? (
                        <div className="space-y-3">
                          {/* Post Message */}
                          {details.message && (
                            <div>
                              <h4 className="text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">محتوى البوست</h4>
                              <p className="text-slate-800 dark:text-gray-200 bg-white dark:bg-gray-800 p-3 rounded-lg border border-slate-200 dark:border-gray-700 whitespace-pre-wrap text-sm">
                                {details.message}
                              </p>
                            </div>
                          )}

                          {/* Post Images */}
                          {details.hasImages && details.imageUrls.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">الصور</h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {details.imageUrls.map((imageUrl, index) => (
                                  <div key={index} className="relative group">
                                    <img
                                      src={imageUrl}
                                      alt={`صورة ${index + 1}`}
                                      className="w-full h-32 object-cover rounded-lg border border-slate-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
                                    />
                                    <a
                                      href={imageUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors rounded-lg"
                                    >
                                      <PhotoIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Post Link */}
                          {details.permalinkUrl && (
                            <div>
                              <h4 className="text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">رابط البوست</h4>
                              <a
                                href={details.permalinkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm"
                              >
                                <LinkIcon className="w-4 h-4" />
                                فتح البوست على Facebook
                              </a>
                            </div>
                          )}

                          {/* Page Info */}
                          {details.pageName && (
                            <div className="text-sm text-slate-600 dark:text-gray-400">
                              صفحة: <strong className="text-slate-800 dark:text-gray-200">{details.pageName}</strong>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-slate-500 text-sm">
                          <p>لا يمكن جلب تفاصيل البوست</p>
                        </div>
                      )}
                    </div>

                    {/* Featured Product Selector */}
                    <div className="pt-4 border-t border-slate-200 dark:border-gray-700">
                      <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">
                        المنتج المميز
                      </label>
                      <select
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-800 border-2 border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800 transition-all text-right text-sm dark:text-white"
                        value={post.featuredProductId || ''}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          handleFeaturedProductChange(post.postId, e.target.value || null)
                        }
                        disabled={updatingProducts.has(post.postId)}
                      >
                        <option value="">-- اختر منتج --</option>
                        {products.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name} - {product.price} ر.س
                          </option>
                        ))}
                      </select>
                      {updatingProducts.has(post.postId) && (
                        <div className="mt-1 text-xs text-blue-600 dark:text-blue-400">جاري التحديث...</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default PostAITracking;

