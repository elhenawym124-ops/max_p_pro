import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Card, CardMedia, CardContent, Button, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/apiClient';

interface Product {
  id: string;
  name: string;
  slug?: string;
  description: string;
  price: number;
  salePrice?: number;
  comparePrice?: number;
  images: string[];
  stock: number;
  category?: {
    id: string;
    name: string;
  };
}

interface RelatedProductsProps {
  productId: string;
  companyId: string;
  limit?: number;
}

const RelatedProducts: React.FC<RelatedProductsProps> = ({ productId, companyId, limit = 6 }) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRelatedProducts();
  }, [productId, companyId]);

  const parseImages = (images: string | string[] | undefined): string[] => {
    if (!images) return [];
    if (Array.isArray(images)) return images;
    if (typeof images === 'string') {
      try {
        const parsed = JSON.parse(images);
        return Array.isArray(parsed) ? parsed : [images];
      } catch {
        return [images];
      }
    }
    return [];
  };

  const fetchRelatedProducts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(
        `/public/products/${productId}/related`,
        {
          params: { companyId, limit }
        }
      );

      if (response.data.success) {
        // Parse images and prices for each product
        const productsWithParsedData = response.data.data.map((product: any) => ({
          ...product,
          images: parseImages(product.images),
          price: Number(product.price) || 0,
          salePrice: product.salePrice ? Number(product.salePrice) : undefined,
          comparePrice: product.comparePrice ? Number(product.comparePrice) : undefined
        }));
        setProducts(productsWithParsedData);
        console.log('✅ [RELATED-PRODUCTS] Loaded:', productsWithParsedData.length);
      }
    } catch (error) {
      console.error('❌ [RELATED-PRODUCTS] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = (idOrSlug: string) => {
    navigate(`/shop/products/${idOrSlug}?companyId=${companyId}`);
    window.scrollTo(0, 0);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0
    }).format(price);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 6 }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        🔍 منتجات مشابهة
      </Typography>

      <Grid container spacing={3}>
        {products.map((product) => {
          const productImages = parseImages(product.images);
          const productImage = productImages.length > 0 ? productImages[0] : '/placeholder.png';
          const displayPrice = product.salePrice || product.comparePrice || product.price;
          const discountPrice = product.salePrice || product.comparePrice;
          const hasDiscount = typeof discountPrice === 'number' && discountPrice < product.price;
          const originalPrice = product.price || 0;

          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
                onClick={() => handleProductClick(product.slug || product.id)}
              >
                <CardMedia
                  component="img"
                  height="200"
                  image={productImage}
                  alt={product.name}
                  sx={{ objectFit: 'cover' }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder.png';
                  }}
                />
                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 'bold',
                      mb: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}
                  >
                    {product.name}
                  </Typography>

                  {product.category && (
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
                      {product.category.name}
                    </Typography>
                  )}

                  <Box sx={{ mt: 'auto' }}>
                    {hasDiscount && originalPrice > 0 && (
                      <Typography
                        variant="body2"
                        sx={{
                          textDecoration: 'line-through',
                          color: 'text.secondary',
                          fontSize: '0.875rem',
                          mb: 0.5
                        }}
                      >
                        {formatPrice(originalPrice)}
                      </Typography>
                    )}
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 'bold',
                        color: hasDiscount ? 'error.main' : 'primary.main'
                      }}
                    >
                      {formatPrice(Number(displayPrice) || 0)}
                    </Typography>
                  </Box>

                  <Button
                    variant="outlined"
                    fullWidth
                    sx={{ mt: 2 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProductClick(product.slug || product.id);
                    }}
                  >
                    عرض التفاصيل
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default RelatedProducts;
