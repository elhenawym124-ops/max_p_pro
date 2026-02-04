import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Button,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Divider
} from '@mui/material';
import { ShoppingCart as CartIcon } from '@mui/icons-material';
import { apiClient } from '../services/apiClient';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  salePrice?: number | undefined;
  images: string[];
  stock: number;
}

interface FrequentlyBoughtTogetherProps {
  productId: string;
  companyId: string;
  currentProduct: Product;
  onAddToCart: (productIds: string[]) => void;
}

const FrequentlyBoughtTogether: React.FC<FrequentlyBoughtTogetherProps> = ({
  productId,
  companyId,
  currentProduct,
  onAddToCart
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set([productId]));

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

  useEffect(() => {
    fetchFrequentlyBought();
  }, [productId, companyId]);

  const fetchFrequentlyBought = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(
        `/public/products/${productId}/frequently-bought-together`,
        {
          params: { companyId, limit: 3 }
        }
      );

      if (response.data.success) {
        // Parse images for each product
        const productsWithParsedImages = response.data.data.map((product: any) => ({
          ...product,
          images: parseImages(product.images),
          salePrice: product.salePrice || product.comparePrice || undefined
        }));
        setProducts(productsWithParsedImages);
        console.log('✅ [FREQUENTLY-BOUGHT] Loaded:', productsWithParsedImages.length);
      }
    } catch (error) {
      console.error('❌ [FREQUENTLY-BOUGHT] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleProduct = (id: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedProducts(newSelected);
  };

  const calculateTotal = () => {
    let total = 0;

    // المنتج الحالي
    if (selectedProducts.has(productId)) {
      const currentPrice = currentProduct.salePrice || currentProduct.price || 0;
      total = total + Number(currentPrice);
    }

    // المنتجات الأخرى
    products.forEach(product => {
      if (selectedProducts.has(product.id)) {
        const productPrice = product.salePrice || product.price || 0;
        total = total + Number(productPrice);
      }
    });

    return total;
  };

  const handleAddAllToCart = () => {
    const productIds = Array.from(selectedProducts);
    onAddToCart(productIds);
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

  const allProducts = [currentProduct, ...products];

  return (
    <Box sx={{ mt: 6, p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        🛒 يُشترى معاً عادة
      </Typography>

      <Grid container spacing={2}>
        {allProducts.map((product, index) => {
          const isCurrentProduct = product.id === productId;
          const displayPrice = product.salePrice || product.price;
          const isSelected = selectedProducts.has(product.id);
          const productImages = parseImages(product.images);
          const productImage = productImages.length > 0 ? productImages[0] : 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect fill="%23f0f0f0" width="100" height="100"/%3E%3Ctext fill="%23999" font-family="Arial" font-size="12" x="50" y="50" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';

          return (
            <React.Fragment key={product.id}>
              {index > 0 && (
                <Grid item xs={12} sm="auto" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="h6" color="text.secondary">
                    +
                  </Typography>
                </Grid>
              )}
              <Grid item xs={12} sm>
                <Card
                  sx={{
                    height: '100%',
                    border: isSelected ? 2 : 1,
                    borderColor: isSelected ? 'primary.main' : 'grey.300',
                    transition: 'all 0.2s'
                  }}
                >
                  <Box sx={{ p: 2 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleToggleProduct(product.id)}
                          disabled={isCurrentProduct}
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', width: '100%' }}>
                          <CardMedia
                            component="img"
                            sx={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 1 }}
                            image={productImage}
                            alt={product.name}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect fill="%23f0f0f0" width="100" height="100"/%3E%3Ctext fill="%23999" font-family="Arial" font-size="12" x="50" y="50" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                            }}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              {product.name}
                            </Typography>
                            <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                              {formatPrice(displayPrice)}
                            </Typography>
                            {isCurrentProduct && (
                              <Typography variant="caption" color="text.secondary">
                                (هذا المنتج)
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      }
                      sx={{ m: 0, width: '100%' }}
                    />
                  </Box>
                </Card>
              </Grid>
            </React.Fragment>
          );
        })}
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="body2" color="text.secondary">
            الإجمالي للمنتجات المحددة ({selectedProducts.size})
          </Typography>
          <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold', mt: 0.5 }}>
            {formatPrice(calculateTotal())}
          </Typography>
        </Box>

        <Button
          variant="contained"
          size="large"
          startIcon={<CartIcon />}
          onClick={handleAddAllToCart}
          disabled={selectedProducts.size === 0}
          sx={{ minWidth: 200 }}
        >
          أضف المحدد للسلة
        </Button>
      </Box>
    </Box>
  );
};

export default FrequentlyBoughtTogether;
