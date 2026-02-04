import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Grid,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Lightbulb as RecommendIcon,
  TrendingUp as TrendingIcon,
  ShoppingCart as CartIcon,
  Add as AddIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import { apiClient } from '../../services/apiClient';
import { useAuth } from '../../hooks/useAuthSimple';

interface RecommendationSettings {
  id?: string;
  companyId: string;
  enableRelatedProducts: boolean;
  enableFrequentlyBought: boolean;
  enableUpsell: boolean;
  enableCartRecommendations: boolean;
  relatedProductsLimit: number;
  frequentlyBoughtLimit: number;
  upsellLimit: number;
  cartRecommendationsLimit: number;
  minOrdersForFrequentlyBought: number;
  upsellPriceRange: number; // نسبة مئوية (مثلاً 20% أغلى)
}

interface FeaturedProduct {
  id: string;
  productId: string;
  priority: number;
  product?: {
    name: string;
    price: number;
    images: string[];
  };
}

const RecommendationSettings: React.FC = () => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState<RecommendationSettings>({
    companyId: user?.companyId || '',
    enableRelatedProducts: true,
    enableFrequentlyBought: true,
    enableUpsell: true,
    enableCartRecommendations: true,
    relatedProductsLimit: 6,
    frequentlyBoughtLimit: 4,
    upsellLimit: 4,
    cartRecommendationsLimit: 6,
    minOrdersForFrequentlyBought: 5,
    upsellPriceRange: 20
  });

  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([]);

  useEffect(() => {
    if (user?.companyId) {
      setSettings(prev => ({ ...prev, companyId: user.companyId }));
      fetchSettings();
      fetchFeaturedProducts();
    }
  }, [user?.companyId]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/settings/recommendation-settings');

      if (response.data.success && response.data.data) {
        setSettings(response.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      // إذا لم توجد إعدادات، استخدم القيم الافتراضية
      if (error.response?.status === 404) {
        console.log('Using default settings');
      } else {
        toast.error('فشل في جلب الإعدادات');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchFeaturedProducts = async () => {
    try {
      const response = await apiClient.get('/settings/featured-products');

      if (response.data.success) {
        setFeaturedProducts(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching featured products:', error);
    }
  };

  const handleSaveSettings = async () => {
    try {
      if (!user?.companyId) {
        toast.error('❌ يجب تسجيل الدخول أولاً');
        return;
      }

      setSaving(true);
      const settingsToSave = {
        ...settings,
        companyId: user.companyId
      };

      const response = await apiClient.post(
        '/settings/recommendation-settings',
        settingsToSave
      );

      if (response.data.success) {
        toast.success('✅ تم حفظ الإعدادات بنجاح');
        setSettings(response.data.data);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('❌ فشل في حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = (field: keyof RecommendationSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <RecommendIcon sx={{ fontSize: 40, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            إعدادات المنتجات المقترحة
          </Typography>
          <Typography variant="body2" color="text.secondary">
            تحكم في كيفية عرض المنتجات المقترحة للعملاء
          </Typography>
        </Box>
      </Box>

      <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)} sx={{ mb: 3 }}>
        <Tab icon={<SettingsIcon />} label="الإعدادات العامة" iconPosition="start" />
        <Tab icon={<TrendingIcon />} label="المنتجات المميزة" iconPosition="start" />
        <Tab icon={<CartIcon />} label="الإحصائيات" iconPosition="start" />
      </Tabs>

      {/* Tab 1: General Settings */}
      {currentTab === 0 && (
        <Grid container spacing={3}>
          {/* Related Products */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <RecommendIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    المنتجات المشابهة
                  </Typography>
                </Box>

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enableRelatedProducts}
                      onChange={(e) => handleSettingChange('enableRelatedProducts', e.target.checked)}
                    />
                  }
                  label="تفعيل المنتجات المشابهة"
                />

                <TextField
                  fullWidth
                  type="number"
                  label="عدد المنتجات المعروضة"
                  value={settings.relatedProductsLimit}
                  onChange={(e) => handleSettingChange('relatedProductsLimit', parseInt(e.target.value))}
                  disabled={!settings.enableRelatedProducts}
                  sx={{ mt: 2 }}
                  inputProps={{ min: 1, max: 12 }}
                />

                <Alert severity="info" sx={{ mt: 2 }}>
                  يتم عرض منتجات من نفس الفئة في صفحة المنتج
                </Alert>
              </CardContent>
            </Card>
          </Grid>

          {/* Frequently Bought Together */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <CartIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    يُشترى معاً عادة
                  </Typography>
                </Box>

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enableFrequentlyBought}
                      onChange={(e) => handleSettingChange('enableFrequentlyBought', e.target.checked)}
                    />
                  }
                  label="تفعيل يُشترى معاً"
                />

                <TextField
                  fullWidth
                  type="number"
                  label="عدد المنتجات المعروضة"
                  value={settings.frequentlyBoughtLimit}
                  onChange={(e) => handleSettingChange('frequentlyBoughtLimit', parseInt(e.target.value))}
                  disabled={!settings.enableFrequentlyBought}
                  sx={{ mt: 2 }}
                  inputProps={{ min: 1, max: 6 }}
                />

                <TextField
                  fullWidth
                  type="number"
                  label="الحد الأدنى من الطلبات"
                  value={settings.minOrdersForFrequentlyBought}
                  onChange={(e) => handleSettingChange('minOrdersForFrequentlyBought', parseInt(e.target.value))}
                  disabled={!settings.enableFrequentlyBought}
                  sx={{ mt: 2 }}
                  helperText="عدد الطلبات المطلوبة لاعتبار المنتجات مشتراة معاً"
                  inputProps={{ min: 1, max: 50 }}
                />

                <Alert severity="info" sx={{ mt: 2 }}>
                  يتم عرض منتجات تُشترى مع المنتج الحالي بناءً على الطلبات السابقة
                </Alert>
              </CardContent>
            </Card>
          </Grid>

          {/* Upsell */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <TrendingIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    الترقية (Upsell)
                  </Typography>
                </Box>

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enableUpsell}
                      onChange={(e) => handleSettingChange('enableUpsell', e.target.checked)}
                    />
                  }
                  label="تفعيل الترقية"
                />

                <TextField
                  fullWidth
                  type="number"
                  label="عدد المنتجات المعروضة"
                  value={settings.upsellLimit}
                  onChange={(e) => handleSettingChange('upsellLimit', parseInt(e.target.value))}
                  disabled={!settings.enableUpsell}
                  sx={{ mt: 2 }}
                  inputProps={{ min: 1, max: 6 }}
                />

                <TextField
                  fullWidth
                  type="number"
                  label="نطاق السعر (%)"
                  value={settings.upsellPriceRange}
                  onChange={(e) => handleSettingChange('upsellPriceRange', parseInt(e.target.value))}
                  disabled={!settings.enableUpsell}
                  sx={{ mt: 2 }}
                  helperText="عرض منتجات أغلى بنسبة معينة (مثلاً 20%)"
                  inputProps={{ min: 5, max: 100 }}
                />

                <Alert severity="info" sx={{ mt: 2 }}>
                  يتم عرض منتجات أفضل وأغلى من المنتج الحالي
                </Alert>
              </CardContent>
            </Card>
          </Grid>

          {/* Cart Recommendations */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <CartIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    توصيات السلة
                  </Typography>
                </Box>

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enableCartRecommendations}
                      onChange={(e) => handleSettingChange('enableCartRecommendations', e.target.checked)}
                    />
                  }
                  label="تفعيل توصيات السلة"
                />

                <TextField
                  fullWidth
                  type="number"
                  label="عدد المنتجات المعروضة"
                  value={settings.cartRecommendationsLimit}
                  onChange={(e) => handleSettingChange('cartRecommendationsLimit', parseInt(e.target.value))}
                  disabled={!settings.enableCartRecommendations}
                  sx={{ mt: 2 }}
                  inputProps={{ min: 1, max: 12 }}
                />

                <Alert severity="info" sx={{ mt: 2 }}>
                  يتم عرض منتجات مقترحة بناءً على محتوى السلة
                </Alert>
              </CardContent>
            </Card>
          </Grid>

          {/* Save Button */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<SaveIcon />}
                onClick={handleSaveSettings}
                disabled={saving}
              >
                {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      )}

      {/* Tab 2: Featured Products */}
      {currentTab === 1 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                المنتجات المميزة (قريباً)
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />}>
                إضافة منتج مميز
              </Button>
            </Box>

            <Alert severity="info" sx={{ mb: 3 }}>
              يمكنك تحديد منتجات معينة لعرضها كتوصيات يدوية بدلاً من الاعتماد على الخوارزميات فقط
            </Alert>

            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              هذه الميزة قيد التطوير...
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Statistics */}
      {currentTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
              إحصائيات المنتجات المقترحة (قريباً)
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              ستتمكن من رؤية:
              <ul>
                <li>عدد مرات عرض التوصيات</li>
                <li>معدل النقر على المنتجات المقترحة</li>
                <li>تأثير التوصيات على المبيعات</li>
                <li>أكثر المنتجات المقترحة نجاحاً</li>
              </ul>
            </Alert>

            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              هذه الميزة قيد التطوير...
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default RecommendationSettings;
