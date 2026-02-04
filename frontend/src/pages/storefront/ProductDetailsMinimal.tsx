
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { storefrontApi } from '../../utils/storefrontApi';
import StorefrontNav from '../../components/StorefrontNav';
import { toast } from 'react-hot-toast';

// Simplified Product Details for "Minimal" Theme
const ProductDetailsMinimal: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const data = await storefrontApi.getProduct(id!);
                if (data.success) {
                    setProduct(data.data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [id]);

    if (loading) return <div className="p-10 text-center">Loading...</div>;
    if (!product) return <div className="p-10 text-center">Product not found</div>;

    const images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images || [];

    return (
        <div className="min-h-screen bg-white font-sans text-gray-800">
            <StorefrontNav />

            <div className="w-full px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    {/* Image Section - Clean, no thumbnails for minimal */}
                    <div className="bg-gray-50 p-8 rounded-3xl">
                        <img
                            src={images[0]}
                            alt={product.name}
                            className="w-full h-auto object-contain mix-blend-multiply"
                        />
                    </div>

                    {/* Info Section - Minimalist Typography */}
                    <div>
                        <span className="text-sm tracking-widest uppercase text-gray-500 mb-2 block">
                            {product.category?.name || 'Product'}
                        </span>
                        <h1 className="text-4xl font-light text-gray-900 mb-6">{product.name}</h1>

                        <div className="text-3xl font-medium text-gray-900 mb-8">
                            {product.price} USD
                        </div>

                        <p className="text-gray-600 leading-relaxed mb-8">
                            {product.description}
                        </p>

                        <div className="flex gap-4">
                            <button
                                onClick={() => {
                                    toast.success('Added to cart');
                                    // Add to cart logic would go here
                                }}
                                className="flex-1 bg-black text-white py-4 px-8 rounded-full hover:bg-gray-800 transition-colors"
                            >
                                Add to Cart
                            </button>
                            <button className="p-4 border border-gray-200 rounded-full hover:bg-gray-50">
                                ♥
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetailsMinimal;

