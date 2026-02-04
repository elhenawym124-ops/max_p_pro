import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Grid,
  Paper,
  Tabs,
  Tab,
  Chip,
  Card,
  CardContent,
  FormControlLabel,
  Radio,
  RadioGroup,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  InputAdornment,
  IconButton,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import { apiClient } from '../services/apiClient';
import {
  Sparkles as SparklesIcon,
  CheckCircle2 as CheckCircleIcon,
  Wand2 as MagicIcon,
  Store as StoreIcon,
  ArrowLeftRight as SwapIcon,
  Megaphone as AdIcon,
  History as HistoryIcon,
  BarChart3 as BarChartIcon,
  Zap as ZapIcon,
  Crown as CrownIcon,
  Clock as ClockIcon,
  Download as DownloadIcon,
  Library as CollectionsIcon,
  PackagePlus as AddToProductIcon,
  Image as ImageIcon,
  Upload as UploadIcon,
  Facebook as FacebookIcon,
  Instagram as InstagramIcon,
  Search as SearchIcon
} from 'lucide-react';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const QUICK_ACTIONS = [
  { label: 'خلفية بيضاء للاستديو', prompt: 'Change background to a clean professional white studio background, high quality product photography' },
  { label: 'منتج على طاولة خشبية', prompt: 'Place the product on a rustic wooden table with soft morning lighting, realistic shadows' },
  { label: 'تصغير المنتج (Outpaint)', prompt: 'Zoom out and extend the background to show more context, keep the product centered' },
  { label: 'تحويل لمانيكان', prompt: 'Put this clothing on a professional invisible mannequin, fashion photography' },
  { label: 'إضاءة سينمائية', prompt: 'Enhance lighting to be cinematic, dramatic shadows, professional graded look' },
  { label: 'جو شاطئي صيفي', prompt: 'Change background to a sunny beach with blurred ocean waves, summer vibe' }
];

const PRODUCT_PRESETS = [
  { label: 'رخام فاخر', prompt: 'On a premium white marble surface, blurred luxury store background, cinematic lighting' },
  { label: 'خشب ريفي', prompt: 'On a rustic wooden table, cozy indoor lighting, soft shadows, warm atmosphere' },
  { label: 'استديو أبيض', prompt: 'In a professional bright white studio, clean minimalist background, soft global illumination' },
  { label: 'طبيعة (حديقة)', prompt: 'In a beautiful green garden, natural sunlight, blurred foliage background, fresh vibe' },
  { label: 'منصة عرض (Podium)', prompt: 'On a sleek minimalist podium, dramatic spotlight, dark elegant background' },
  { label: 'شاطئ صيفي', prompt: 'On a sandy beach with turquoise ocean background, bright summer sun, tropical vibe' }
];

const ImageStudio: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [useMagicPrompt, setUseMagicPrompt] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [modelType, setModelType] = useState<'basic' | 'pro'>('basic');
  const [generatedImage, setGeneratedImage] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [access, setAccess] = useState<any>(null);
  const [models, setModels] = useState<any>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Phase 3: New State
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [selectedImageForProduct, setSelectedImageForProduct] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [products, setProducts] = useState<any[]>([]);

  const [loadingProducts, setLoadingProducts] = useState(false);

  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [editing, setEditing] = useState(false);
  const [editedResult, setEditedResult] = useState<any>(null);

  // Phase 7: Product Studio State
  const [productStudioImage, setProductStudioImage] = useState<File | null>(null);
  const [productStudioPreview, setProductStudioPreview] = useState<string | null>(null);
  const [productStudioPrompt, setProductStudioPrompt] = useState('');
  const [isProductStudioLoading, setIsProductStudioLoading] = useState(false);
  const [productStudioResult, setProductStudioResult] = useState<any>(null);

  // Phase 8: Ads Generator State
  const [adContent, setAdContent] = useState<any>(null);
  const [isAdGenerating, setIsAdGenerating] = useState(false);
  const [adSourceImage, setAdSourceImage] = useState<string | null>(null);
  const [adPlatform, setAdPlatform] = useState<'facebook' | 'instagram'>('facebook');
  const [adProductInfo, setAdProductInfo] = useState('');

  // Phase 9: Batch & Gallery State
  const [numImages, setNumImages] = useState(1);
  const [batchResults, setBatchResults] = useState<any[]>([]);

  // Phase 10: Smart Swap State
  const [swapSceneImage, setSwapSceneImage] = useState<File | null>(null);
  const [swapScenePreview, setSwapScenePreview] = useState<string | null>(null);
  const [swapProductImage, setSwapProductImage] = useState<File | null>(null);
  const [swapProductPreview, setSwapProductPreview] = useState<string | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapResult, setSwapResult] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const productStudioInputRef = useRef<HTMLInputElement>(null);
  const swapSceneInputRef = useRef<HTMLInputElement>(null);
  const swapProductInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    checkAccess();
    loadModels();
    loadHistory();
    loadStats();
  }, []);

  const checkAccess = async () => {
    try {
      const response = await apiClient.get('/image-studio/access');
      if (response.data.success) {
        setAccess(response.data.access);
        if (!response.data.access.allowed) {
          setMessage({ type: 'error', text: response.data.access.reason });
        }
      }
    } catch (error) {
      console.error('Error checking access:', error);
    }
  };

  const loadModels = async () => {
    try {
      const response = await apiClient.get('/image-studio/models');
      if (response.data.success) {
        setModels(response.data.models);
      }
    } catch (error) {
      console.error('Error loading models:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await apiClient.get('/image-studio/history', { params: { limit: 10 } });
      if (response.data.success) {
        setHistory(response.data.data.history);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiClient.get('/image-studio/stats', { params: { days: 30 } });
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Phase 3: Product Search & AddFunctions
  const searchProducts = async (query: string = '') => {
    try {
      setLoadingProducts(true);
      const params: any = { limit: 20 };
      if (query) params.search = query;

      const response = await apiClient.get('/products', { params });
      if (response.data.success) {
        setProducts(response.data.data);
      }
    } catch (error) {
      console.error('Error searching products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleOpenProductDialog = (imageUrl: string) => {
    setSelectedImageForProduct(imageUrl);
    setProductDialogOpen(true);
    searchProducts(); // Load initial products
  };

  const handleAddToProduct = async (productId: string) => {
    if (!selectedImageForProduct) return;

    try {
      const response = await apiClient.post(`/products/${productId}/images/url`, {
        imageUrl: selectedImageForProduct
      });

      if (response.data.success) {
        setMessage({ type: 'success', text: 'تم إضافة الصورة للمنتج بنجاح' });
        setProductDialogOpen(false);
        setSelectedImageForProduct(null);
      }
    } catch (error: any) {
      console.error('Error adding to product:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'فشل إضافة الصورة للمنتج' });
    }
  };

  // Phase 4: Job Polling
  const pollJobStatus = async (jobId: string) => {
    try {
      const maxRetries = 60; // 2 minutes (2s * 60)
      let attempts = 0;

      const checkStatus = async () => {
        if (attempts >= maxRetries) {
          setGenerating(false);
          setMessage({ type: 'error', text: 'انتهت مهلة التوليد، يرجى التحقق من السجل لاحقاً.' });
          return;
        }

        attempts++;
        const response = await apiClient.get(`/image-studio/status/${jobId}`);

        if (response.data.success) {
          const { status, data } = response.data;

          if (status === 'completed') {
            setGeneratedImage(data);
            setMessage({ type: 'success', text: 'تم توليد الصورة بنجاح!' });
            setGenerating(false);
            loadHistory();
            loadStats();
          } else if (status === 'failed') {
            setGenerating(false);
            const errorMeta = data.metadata ? JSON.parse(data.metadata) : {};
            setMessage({
              type: 'error',
              text: errorMeta.errorType === 'SAFETY_BLOCK' ? 'تم رفض الصورة بسبب سياسات المحتوى' : 'فشل توليد الصورة'
            });
          } else {
            // Still processing or queued
            setTimeout(checkStatus, 2000);
          }
        }
      };

      checkStatus();
    } catch (error) {
      console.error('Error polling job status:', error);
      setGenerating(false);
      setMessage({ type: 'error', text: 'حدث خطأ أثناء متابعة حالة التوليد' });
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setMessage({ type: 'error', text: 'يرجى إدخال وصف للصورة' });
      return;
    }

    if (!access?.allowed) {
      setMessage({ type: 'error', text: access?.reason || 'غير مصرح لك باستخدام الاستديو' });
      return;
    }

    try {
      setGenerating(true);
      setMessage(null);
      setGeneratedImage(null);
      setBatchResults([]);

      const generateOne = async () => {
        const res = await apiClient.post('/image-studio/generate', {
          prompt,
          modelType,
          useMagicPrompt,
          aspectRatio
        });
        return res;
      };

      if (numImages === 1) {
        const response = await generateOne();

        if (response.data.success) {
          if (response.data.data.queued && response.data.data.historyId) {
            setMessage({ type: 'info', text: 'تم استلام طلبك، جاري المعالجة...' });
            pollJobStatus(response.data.data.historyId);
          } else {
            setGeneratedImage(response.data.data);
            setMessage({ type: 'success', text: 'تم توليد الصورة بنجاح!' });
            loadHistory();
            loadStats();
            checkAccess();
            setGenerating(false);
          }
        }
      } else {
        setMessage({ type: 'info', text: `جاري تحضير ${numImages} صور للإنشاء...` });
        const results: any[] = [];
        // Generate sequentially to avoid hitting rate limits too hard simultaneously
        for (let i = 0; i < numImages; i++) {
          try {
            const res = await generateOne();
            if (res.data.success) {
              if (res.data.data.queued) {
                // For batch, we'll just wait for them to appear in history or poll individually?
                // Simplest: just poll the last one or show a message
                results.push({ id: res.data.data.historyId, status: 'queued' });
              } else {
                results.push(res.data.data);
              }
            }
          } catch (e) {
            console.error(`Error in batch item ${i}:`, e);
          }
        }

        if (results.length > 0) {
          setMessage({ type: 'success', text: `تم بدء توليد ${results.length} صور بنجاح. ستظهر هنا المكتملة منها.` });
          // Start polling all results that are queued
          const completed: any[] = [];
          const pollAll = async () => {
            for (const r of results) {
              if (r.status === 'queued') {
                // Custom small poll
                let done = false;
                while (!done) {
                  await new Promise(resolve => setTimeout(resolve, 3000));
                  const s = await apiClient.get(`/image-studio/status/${r.id}`);
                  if (s.data.status === 'completed') {
                    completed.push(s.data.data);
                    setBatchResults([...completed]);
                    done = true;
                  } else if (s.data.status === 'failed') {
                    done = true;
                  }
                }
              } else {
                completed.push(r);
                setBatchResults([...completed]);
              }
            }
            setGenerating(false);
            loadHistory();
            loadStats();
          };
          pollAll();
        } else {
          setGenerating(false);
        }
      }
    } catch (error: any) {
      console.error('Error generating image:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'فشل توليد الصورة'
      });
      setGenerating(false);
    }
  };

  const downloadImage = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `nano-banana-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEditImageFile(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = async () => {
    if (!editImageFile || !editPrompt.trim()) {
      setMessage({ type: 'error', text: 'يرجى تحميل صورة وإدخال وصف للتعديل' });
      return;
    }

    try {
      setEditing(true);
      setMessage(null);
      setEditedResult(null);

      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(editImageFile);

      reader.onloadend = async () => {
        const base64Image = (reader.result as string).split(',')[1];

        try {
          const response = await apiClient.post('/image-studio/edit', {
            imageBase64: base64Image,
            prompt: editPrompt
          });

          if (response.data.success) {
            setEditedResult(response.data.data);
            setMessage({ type: 'success', text: 'تم تعديل الصورة بنجاح!' });
            loadHistory();
            loadStats();
            setEditing(false);
          }
        } catch (error: any) {
          console.error('Error editing image:', error);
          setMessage({
            type: 'error',
            text: error.response?.data?.error || 'فشل تعديل الصورة'
          });
          setEditing(false);
        }
      };

    } catch (error) {
      console.error('Error preparing edit:', error);
      setEditing(false);
    }
  };

  const handleProductStudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProductStudioImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductStudioPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSwapSceneUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSwapSceneImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setSwapScenePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSwapProductUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSwapProductImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setSwapProductPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSwap = async () => {
    if (!swapScenePreview || !swapProductPreview) {
      setMessage({ type: 'error', text: 'يرجى رفع صورة المشهد وصورة المنتج أولاً' });
      return;
    }

    setIsSwapping(true);
    setMessage(null);
    setSwapResult(null);

    try {
      const sceneBase64 = swapScenePreview.split(',')[1];
      const productBase64 = swapProductPreview.split(',')[1];

      const response = await apiClient.post('/image-studio/swap-product', {
        sceneImage: sceneBase64,
        productImage: productBase64
      });

      if (response.data.success) {
        setSwapResult(response.data.imageUrl);
        setMessage({ type: 'success', text: 'تم تبديل المنتج بنجاح!' });
        loadHistory();
      } else {
        throw new Error(response.data.error || 'فشل تبديل المنتج');
      }
    } catch (error: any) {
      console.error('Error swapping product:', error);
      setMessage({ type: 'error', text: error.response?.data?.error || error.message || 'حدث خطأ أثناء تبديل المنتج' });
    } finally {
      setIsSwapping(false);
    }
  };

  const handleProductStudioClick = () => {
    productStudioInputRef.current?.click();
  };

  const handleProductStudio = async () => {
    if (!productStudioImage || !productStudioPrompt.trim()) {
      setMessage({ type: 'error', text: 'يرجى تحميل صورة المنتج وإدخال وصف للخلفية المطلوبة' });
      return;
    }

    try {
      setIsProductStudioLoading(true);
      setMessage(null);
      setProductStudioResult(null);

      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(productStudioImage);

      reader.onloadend = async () => {
        const base64Image = (reader.result as string).split(',')[1];

        try {
          const response = await apiClient.post('/image-studio/edit', {
            imageBase64: base64Image,
            prompt: `Professional product photography, ${productStudioPrompt}, keep the original product details, high resolution, soft shadows, studio lighting`
          });

          if (response.data.success) {
            setProductStudioResult(response.data.data);
            setMessage({ type: 'success', text: 'تم إنشاء صورة المنتج بنجاح!' });
            loadHistory();
            loadStats();
            setIsProductStudioLoading(false);
          }
        } catch (error: any) {
          console.error('Error in product studio:', error);
          setMessage({
            type: 'error',
            text: error.response?.data?.error || 'فشل معالجة صورة المنتج'
          });
          setIsProductStudioLoading(false);
        }
      };

    } catch (error) {
      console.error('Error preparing product studio:', error);
      setIsProductStudioLoading(false);
    }
  };

  const handleSaveToGallery = async (imageUrl: string) => {
    try {
      const response = await apiClient.post('/image-studio/save-to-gallery', {
        imageUrl
      });

      if (response.data.success) {
        setMessage({ type: 'success', text: 'تم حفظ الصورة في معرض الشركة بنجاح!' });
      }
    } catch (error: any) {
      console.error('Error saving to gallery:', error);
      setMessage({ type: 'error', text: error.response?.data?.error || 'فشل حفظ الصورة في المعرض' });
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }} dir="rtl">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <SparklesIcon size={32} color="#1976d2" />
          <Typography variant="h4" component="h1" fontWeight="bold">
            استديو توليد الصور
          </Typography>
        </Box>
        <Typography color="text.secondary">
          قم بتوليد صور احترافية باستخدام الذكاء الاصطناعي (Nano Banana)
        </Typography>
      </Box>

      {/* Message Alert */}
      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {/* Access Info */}
      {access && access.allowed && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'success.50', border: 1, borderColor: 'success.main' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={2}>
              <CheckCircleIcon color="#2e7d32" />
              <Box>
                <Typography fontWeight="medium">الاستديو متاح للاستخدام</Typography>
                <Typography variant="body2" color="text.secondary">
                  متبقي اليوم: {access.remainingToday} صورة
                </Typography>
              </Box>
            </Box>
            {stats && (
              <Box textAlign="left">
                <Typography variant="body2" color="text.secondary">إجمالي الصور المُولدة</Typography>
                <Typography variant="h5" fontWeight="bold" color="primary">
                  {stats.totalImages}
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab icon={<SparklesIcon />} label="توليد صورة" iconPosition="start" />
          <Tab icon={<MagicIcon />} label="المحرر السحري" iconPosition="start" />
          <Tab icon={<StoreIcon />} label="استديو المنتجات" iconPosition="start" />
          <Tab icon={<SwapIcon />} label="مبدل المنتجات" iconPosition="start" />
          <Tab icon={<AdIcon />} label="مؤلف الإعلانات" iconPosition="start" />
          <Tab icon={<HistoryIcon />} label="السجل" iconPosition="start" />
          <Tab icon={<BarChartIcon />} label="الإحصائيات" iconPosition="start" />
        </Tabs>
      </Box>

      {/* Tab 1: Generate */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {/* Input Section */}
          <Grid item xs={12} lg={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>وصف الصورة</Typography>

              <TextField
                label="اكتب وصفاً تفصيلياً للصورة"
                placeholder="مثال: صورة احترافية لمنتج إلكتروني حديث على خلفية بيضاء..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                multiline
                rows={6}
                fullWidth
                disabled={!access?.allowed}
                sx={{ mb: 3 }}
              />

              {/* Model Selection */}
              {models && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>اختر نوع النموذج</Typography>
                  <RadioGroup value={modelType} onChange={(e) => setModelType(e.target.value as 'basic' | 'pro')}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Paper
                          sx={{
                            p: 2,
                            cursor: 'pointer',
                            border: 2,
                            borderColor: modelType === 'basic' ? 'primary.main' : 'grey.300',
                            bgcolor: modelType === 'basic' ? 'primary.50' : 'transparent'
                          }}
                          onClick={() => setModelType('basic')}
                        >
                          <FormControlLabel
                            value="basic"
                            control={<Radio />}
                            label={
                              <Box>
                                <Box display="flex" alignItems="center" gap={1}>
                                  <ZapIcon color="#1976d2" />
                                  <Typography fontWeight="medium">Basic</Typography>
                                </Box>
                                <Typography variant="caption" color="text.secondary">
                                  {models.basic?.description}
                                </Typography>
                              </Box>
                            }
                          />
                        </Paper>
                      </Grid>
                      <Grid item xs={6}>
                        <Paper
                          sx={{
                            p: 2,
                            cursor: 'pointer',
                            border: 2,
                            borderColor: modelType === 'pro' ? 'secondary.main' : 'grey.300',
                            bgcolor: modelType === 'pro' ? 'secondary.50' : 'transparent'
                          }}
                          onClick={() => setModelType('pro')}
                        >
                          <FormControlLabel
                            value="pro"
                            control={<Radio />}
                            label={
                              <Box>
                                <Box display="flex" alignItems="center" gap={1}>
                                  <CrownIcon color="#9c27b0" />
                                  <Typography fontWeight="medium">Pro</Typography>
                                </Box>
                                <Typography variant="caption" color="text.secondary">
                                  {models.pro?.description}
                                </Typography>
                              </Box>
                            }
                          />
                        </Paper>
                      </Grid>
                    </Grid>
                  </RadioGroup>
                </Box>
              )}

              {/* Phase 3: Aspect Ratio Selection */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>نسبة العرض للارتفاع (Aspect Ratio)</Typography>
                <ToggleButtonGroup
                  value={aspectRatio}
                  exclusive
                  onChange={(_, newRatio) => newRatio && setAspectRatio(newRatio)}
                  aria-label="aspect ratio"
                  fullWidth
                  sx={{ direction: 'ltr' }}
                >
                  <ToggleButton value="1:1">1:1 Square</ToggleButton>
                  <ToggleButton value="3:4">3:4 Portrait</ToggleButton>
                  <ToggleButton value="4:3">4:3 Landsc</ToggleButton>
                  <ToggleButton value="9:16">9:16 Story</ToggleButton>
                  <ToggleButton value="16:9">16:9 Cinema</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {/* Phase 9: Batch Selection */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">عدد الصور (Batch Generation)</Typography>
                <ToggleButtonGroup
                  value={numImages}
                  exclusive
                  onChange={(_, val) => val !== null && setNumImages(val)}
                  fullWidth
                  sx={{ bgcolor: 'background.paper' }}
                >
                  <ToggleButton value={1} sx={{ py: 1.5 }}>
                    صورة واحدة
                  </ToggleButton>
                  <ToggleButton value={4} sx={{ py: 1.5, gap: 1 }}>
                    4 صور (Batch) <SparklesIcon size={16} color="#9c27b0" />
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={useMagicPrompt}
                    onChange={(e) => setUseMagicPrompt(e.target.checked)}
                    color="secondary"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="body2" fontWeight="medium">
                      تحسين الوصف تلقائياً (Magic Prompt)
                    </Typography>
                    <SparklesIcon size={16} color="#9c27b0" />
                  </Box>
                }
                sx={{ mb: 2, ml: 0 }}
              />

              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleGenerate}
                disabled={generating || !access?.allowed || !prompt.trim()}
                startIcon={generating ? <CircularProgress size={20} color="inherit" /> : <SparklesIcon />}
              >
                {generating ? 'جاري التوليد...' : 'توليد الصورة'}
              </Button>
            </Paper>
          </Grid>

          {/* Output Section */}
          <Grid item xs={12} lg={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>النتيجة</Typography>

              {generatedImage ? (
                <Box>
                  <Box sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', border: 2, borderColor: 'grey.300', position: 'relative' }}>
                    <img
                      src={generatedImage.imageUrl}
                      alt="Generated"
                      style={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                  </Box>

                  <Box display="flex" justifyContent="space-between" sx={{ mb: 2 }}>
                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                      <ClockIcon fontSize="small" />
                      <Typography variant="body2">
                        {(generatedImage.duration / 1000).toFixed(2)}s
                      </Typography>
                      {generatedImage.wasTranslated && (
                        <Chip label="مُترجم" size="small" variant="outlined" color="info" />
                      )}
                      {generatedImage.wasMagicUsed && (
                        <Chip label="Magic ✨" size="small" variant="outlined" color="secondary" />
                      )}
                    </Box>
                    <Chip
                      icon={modelType === 'basic' ? <ZapIcon /> : <CrownIcon />}
                      label={generatedImage.modelName}
                      size="small"
                      color={modelType === 'basic' ? 'primary' : 'secondary'}
                    />
                  </Box>

                  <Grid container spacing={1} sx={{ mb: 1 }}>
                    <Grid item xs={6}>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<DownloadIcon />}
                        onClick={() => downloadImage(generatedImage.imageUrl)}
                      >
                        تحميل
                      </Button>
                    </Grid>
                    <Grid item xs={6}>
                      <Button
                        variant="outlined"
                        fullWidth
                        color="info"
                        startIcon={<CollectionsIcon />}
                        onClick={() => handleSaveToGallery(generatedImage.imageUrl)}
                      >
                        حفظ للمعرض
                      </Button>
                    </Grid>
                  </Grid>

                  <Button
                    variant="contained"
                    color="secondary"
                    fullWidth
                    startIcon={<AddToProductIcon />}
                    onClick={() => handleOpenProductDialog(generatedImage.imageUrl)}
                  >
                    إضافة لمنتج
                  </Button>
                </Box>
              ) : batchResults.length > 0 ? (
                <Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="subtitle1" fontWeight="bold">نتائج الدفعة ({batchResults.length})</Typography>
                    {generating && <CircularProgress size={20} />}
                  </Box>
                  <Grid container spacing={1.5}>
                    {batchResults.map((img, idx) => (
                      <Grid item xs={6} key={idx}>
                        <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', border: 1, borderColor: 'divider', boxShadow: 1 }}>
                          <img src={img.imageUrl} style={{ width: '100%', height: 'auto', display: 'block' }} />
                          <Box sx={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            bgcolor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', py: 0.5, gap: 0.5
                          }}>
                            <IconButton size="small" sx={{ color: 'white' }} onClick={() => downloadImage(img.imageUrl)} title="تحميل"><DownloadIcon fontSize="small" /></IconButton>
                            <IconButton size="small" sx={{ color: 'white' }} onClick={() => handleSaveToGallery(img.imageUrl)} title="حفظ للمعرض"><CollectionsIcon fontSize="small" /></IconButton>
                            <IconButton size="small" sx={{ color: 'white' }} onClick={() => handleOpenProductDialog(img.imageUrl)} title="إضافة لمنتج"><AddToProductIcon fontSize="small" /></IconButton>
                          </Box>
                        </Box>
                      </Grid>
                    ))}
                    {/* Loading placeholders for remaining in batch */}
                    {generating && Array.from({ length: 4 - batchResults.length }).map((_, i) => (
                      <Grid item xs={6} key={`loader-${i}`}>
                        <Box sx={{ pt: '100%', position: 'relative', bgcolor: 'grey.100', borderRadius: 2, border: '1px dashed grey', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CircularProgress size={24} sx={{ position: 'absolute', top: '50%', left: '50%', mt: -1.5, ml: -1.5 }} />
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                  {!generating && (
                    <Button
                      sx={{ mt: 3 }}
                      fullWidth
                      variant="outlined"
                      onClick={() => { setBatchResults([]); setGeneratedImage(null); }}
                    >
                      توليد دفعة جديدة
                    </Button>
                  )}
                </Box>
              ) : (
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  sx={{ py: 10, color: 'text.disabled', border: '2px dashed grey', borderRadius: 2, bgcolor: 'grey.50' }}
                >
                  <ImageIcon size={64} className="mb-4 opacity-50" />
                  <Typography>بانتظار إبداعك...</Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 2: Magic Editor */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          {/* Input Section */}
          <Grid item xs={12} lg={6}>
            <Paper sx={{ p: 4, height: '100%' }}>
              <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MagicIcon color="secondary" /> المحرر السحري (Beta)
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                قم برفع صورة واطلب من الذكاء الاصطناعي تعديلها، أو اختر من الإجراءات السريعة.
              </Typography>

              {/* Enhanced Image Upload */}
              <Box
                sx={{
                  border: editImagePreview ? 2 : '2px dashed',
                  borderColor: editImagePreview ? 'secondary.main' : 'grey.400',
                  borderRadius: 4,
                  p: 4,
                  textAlign: 'center',
                  mb: 4,
                  cursor: 'pointer',
                  bgcolor: editImagePreview ? 'background.paper' : 'grey.100',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: 'secondary.main',
                    bgcolor: 'secondary.50',
                    transform: 'translateY(-2px)',
                    boxShadow: 3
                  },
                  boxShadow: editImagePreview ? 3 : 0
                }}
                onClick={handleUploadClick}
              >
                <input
                  type="file"
                  hidden
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={handleImageUpload}
                />

                {editImagePreview ? (
                  <Box>
                    <img
                      src={editImagePreview}
                      alt="Preview"
                      style={{ maxWidth: '100%', maxHeight: 350, borderRadius: 8, display: 'block', margin: '0 auto' }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'rgba(0,0,0,0.4)',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        '&:hover': { opacity: 1 },
                        borderRadius: 4
                      }}
                    >
                      <Typography color="white" fontWeight="bold">اضغط للتغيير</Typography>
                    </Box>
                  </Box>
                ) : (
                  <Box>
                    <UploadIcon size={64} color="#9c27b0" className="mb-4 opacity-80" />
                    <Typography variant="h6" color="text.primary" gutterBottom>
                      اسحب وأفلت الصورة هنا
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      أو اضغط للاختيار من جهازك
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Quick Actions Chips */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom fontWeight="bold">إجراءات سريعة:</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {QUICK_ACTIONS.map((action, idx) => (
                    <Chip
                      key={idx}
                      label={action.label}
                      onClick={() => setEditPrompt(action.prompt)}
                      icon={<SparklesIcon fontSize="small" />}
                      variant={editPrompt === action.prompt ? 'filled' : 'outlined'}
                      clickable
                      color={editPrompt === action.prompt ? 'secondary' : 'default'}
                      sx={{
                        transition: 'all 0.2s',
                        '&:hover': {
                          transform: 'scale(1.05)',
                          borderColor: 'secondary.main'
                        }
                      }}
                    />
                  ))}
                </Box>
              </Box>

              <TextField
                label="أو اكتب وصفاً للتعديل..."
                placeholder="مثال: غير لون الحذاء إلى الأحمر، ضع المنتج على طاولة خشبية..."
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                multiline
                rows={3}
                fullWidth
                disabled={!editImagePreview}
                sx={{ mb: 3 }}
                InputProps={{
                  sx: { borderRadius: 2 }
                }}
              />

              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleEdit}
                disabled={editing || !editImagePreview || !editPrompt.trim()}
                startIcon={editing ? <CircularProgress size={20} color="inherit" /> : <MagicIcon />}
                sx={{
                  py: 1.5,
                  bgcolor: 'secondary.main',
                  '&:hover': { bgcolor: 'secondary.dark' },
                  borderRadius: 2,
                  fontSize: '1.1rem',
                  textTransform: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
              >
                {editing ? 'جاري تنفيذ السحر...' : '✨ ابدأ السحر'}
              </Button>
            </Paper>
          </Grid>

          {/* Output Section */}
          <Grid item xs={12} lg={6}>
            <Paper sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" gutterBottom>النتيجة النهائية</Typography>

              {editedResult ? (
                <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{
                    flexGrow: 1,
                    mb: 3,
                    borderRadius: 4,
                    overflow: 'hidden',
                    border: 1,
                    borderColor: 'divider',
                    boxShadow: 3,
                    bgcolor: 'grey.50',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 400,
                    maxHeight: 600
                  }}>
                    <img
                      src={editedResult.imageUrl}
                      alt="Edited"
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<DownloadIcon />}
                        onClick={() => downloadImage(editedResult.imageUrl)}
                        sx={{ py: 1.5, borderRadius: 2, textTransform: 'none' }}
                      >
                        تحميل
                      </Button>
                    </Grid>
                    <Grid item xs={6}>
                      <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        startIcon={<AddToProductIcon />}
                        onClick={() => handleOpenProductDialog(editedResult.imageUrl)}
                        sx={{ py: 1.5, borderRadius: 2, textTransform: 'none' }}
                      >
                        إضافة للمنتج
                      </Button>
                    </Grid>
                  </Grid>
                </Box>
              ) : (
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  sx={{ flexGrow: 1, minHeight: 400, color: 'text.secondary', border: '2px dashed', borderColor: 'grey.100', borderRadius: 4, bgcolor: 'grey.50' }}
                >
                  <MagicIcon size={80} color="#9c27b0" className="mb-6 opacity-20" />
                  <Typography variant="h6" color="text.secondary">مساحة الإبداع</Typography>
                  <Typography variant="body2" color="text.disabled">
                    ستظهر الصورة المعدلة هنا بجودة عالية
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 3: Product Studio */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={4}>
          {/* Input Section */}
          <Grid item xs={12} lg={6}>
            <Paper sx={{ p: 4, borderRadius: 4, height: '100%' }}>
              <Box display="flex" alignItems="center" gap={1} mb={3}>
                <StoreIcon color="#1976d2" size={28} />
                <Typography variant="h5" fontWeight="bold">استديو المنتجات</Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                ارفع صورة منتجك وسنقوم بتغيير الخلفية باحترافية بضغطة زر.
              </Typography>

              {/* Image Upload Area */}
              <Box
                sx={{
                  border: productStudioPreview ? 2 : '2px dashed',
                  borderColor: productStudioPreview ? 'primary.main' : 'grey.300',
                  borderRadius: 4,
                  p: 4,
                  textAlign: 'center',
                  mb: 4,
                  cursor: 'pointer',
                  bgcolor: productStudioPreview ? 'background.paper' : 'grey.50',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'primary.50',
                    transform: 'translateY(-2px)'
                  }
                }}
                onClick={handleProductStudioClick}
              >
                <input
                  type="file"
                  hidden
                  ref={productStudioInputRef}
                  onChange={handleProductStudioUpload}
                  accept="image/*"
                />
                {productStudioPreview ? (
                  <Box sx={{ position: 'relative' }}>
                    <img
                      src={productStudioPreview}
                      alt="Product Preview"
                      style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8 }}
                    />
                    <Box sx={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: 'rgba(0,0,0,0.4)', opacity: 0, transition: 'opacity 0.2s',
                      '&:hover': { opacity: 1 }, borderRadius: 2
                    }}>
                      <Typography color="white" fontWeight="bold">تغيير الصورة</Typography>
                    </Box>
                  </Box>
                ) : (
                  <Box>
                    <UploadIcon size={64} color="#1976d2" className="mb-4 opacity-80" />
                    <Typography variant="h6" gutterBottom>صورة المنتج</Typography>
                    <Typography variant="body2" color="text.secondary">ارفع صورة واضحة لمنتجك</Typography>
                  </Box>
                )}
              </Box>

              {/* Background Presets */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom fontWeight="bold">خلفيات مقترحة:</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {PRODUCT_PRESETS.map((preset, idx) => (
                    <Chip
                      key={idx}
                      label={preset.label}
                      onClick={() => setProductStudioPrompt(preset.prompt)}
                      icon={<SparklesIcon fontSize="small" />}
                      variant={productStudioPrompt === preset.prompt ? 'filled' : 'outlined'}
                      clickable
                      color={productStudioPrompt === preset.prompt ? 'primary' : 'default'}
                      sx={{
                        transition: 'all 0.2s',
                        '&:hover': {
                          transform: 'scale(1.05)',
                          borderColor: 'primary.main'
                        }
                      }}
                    />
                  ))}
                </Box>
              </Box>

              <TextField
                label="صف الخلفية المطلوبة لمنتجك"
                placeholder="مثال: على طاولة رخامية فخمة مع إضاءة دافئة، أو في غابة خضراء..."
                value={productStudioPrompt}
                onChange={(e) => setProductStudioPrompt(e.target.value)}
                multiline
                rows={4}
                fullWidth
                disabled={!productStudioPreview}
                sx={{ mb: 4 }}
              />

              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleProductStudio}
                disabled={isProductStudioLoading || !productStudioPreview || !productStudioPrompt.trim()}
                startIcon={isProductStudioLoading ? <CircularProgress size={20} color="inherit" /> : <SparklesIcon />}
                sx={{ py: 2, borderRadius: 3, fontSize: '1.2rem', fontWeight: 'bold' }}
              >
                {isProductStudioLoading ? 'جاري تحضير الاستديو...' : 'توليد خلفية احترافية'}
              </Button>
            </Paper>
          </Grid>

          {/* Output Section */}
          <Grid item xs={12} lg={6}>
            <Paper sx={{ p: 4, borderRadius: 4, height: '100%', minHeight: 500, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">النتيجة الاحترافية</Typography>

              {productStudioResult ? (
                <Box display="flex" flexDirection="column" height="100%">
                  <Box sx={{ flexGrow: 1, mb: 4, borderRadius: 4, overflow: 'hidden', boxShadow: 3, border: 1, borderColor: 'divider' }}>
                    <img
                      src={productStudioResult.imageUrl}
                      alt="Product Studio Result"
                      style={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Button fullWidth variant="outlined" startIcon={<DownloadIcon />} onClick={() => downloadImage(productStudioResult.imageUrl)} sx={{ py: 1.5, borderRadius: 2 }}>تحميل</Button>
                    </Grid>
                    <Grid item xs={6}>
                      <Button fullWidth variant="contained" color="secondary" startIcon={<AddToProductIcon />} onClick={() => handleOpenProductDialog(productStudioResult.imageUrl)} sx={{ py: 1.5, borderRadius: 2 }}>إضافة للمتجر</Button>
                    </Grid>
                  </Grid>
                </Box>
              ) : (
                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1} sx={{ border: '2px dashed', borderColor: 'grey.100', borderRadius: 4, bgcolor: 'grey.50' }}>
                  <StoreIcon size={100} color="#eeeeee" className="mb-4" />
                  <Typography color="text.secondary">صور منتجاتك ستظهر هنا بجودة سينمائية</Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 4: Product Swapper (Phase 10) */}
      <TabPanel value={tabValue} index={3}>
        <Grid container spacing={4}>
          {/* Input Section */}
          <Grid item xs={12} lg={6}>
            <Paper sx={{ p: 4, borderRadius: 4, height: '100%' }}>
              <Box display="flex" alignItems="center" gap={1} mb={3}>
                <SwapIcon color="#1976d2" size={28} />
                <Typography variant="h5" fontWeight="bold">مبدل المنتجات الذكي</Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                استبدل أي منتج في صورة جاهزة بمنتجك الخاص بلمسة واحدة.
              </Typography>

              <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={6}>
                  <Box
                    sx={{
                      border: swapScenePreview ? 2 : '2px dashed',
                      borderColor: swapScenePreview ? 'primary.main' : 'grey.300',
                      borderRadius: 4, p: 2, textAlign: 'center', cursor: 'pointer',
                      bgcolor: swapScenePreview ? 'background.paper' : 'grey.50',
                      height: 200, display: 'flex', flexDirection: 'column', justifyContent: 'center'
                    }}
                    onClick={() => swapSceneInputRef.current?.click()}
                  >
                    <input type="file" hidden ref={swapSceneInputRef} onChange={handleSwapSceneUpload} accept="image/*" />
                    {swapScenePreview ? (
                      <img src={swapScenePreview} alt="Scene" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8 }} />
                    ) : (
                      <Box>
                        <UploadIcon size={32} color="#1976d2" className="mb-2" />
                        <Typography variant="subtitle2">صورة المشهد</Typography>
                        <Typography variant="caption" color="text.secondary">الموديل أو الخلفية</Typography>
                      </Box>
                    )}
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box
                    sx={{
                      border: swapProductPreview ? 2 : '2px dashed',
                      borderColor: swapProductPreview ? 'secondary.main' : 'grey.300',
                      borderRadius: 4, p: 2, textAlign: 'center', cursor: 'pointer',
                      bgcolor: swapProductPreview ? 'background.paper' : 'grey.50',
                      height: 200, display: 'flex', flexDirection: 'column', justifyContent: 'center'
                    }}
                    onClick={() => swapProductInputRef.current?.click()}
                  >
                    <input type="file" hidden ref={swapProductInputRef} onChange={handleSwapProductUpload} accept="image/*" />
                    {swapProductPreview ? (
                      <img src={swapProductPreview} alt="Product" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8 }} />
                    ) : (
                      <Box>
                        <UploadIcon size={32} color="#9c27b0" className="mb-2" />
                        <Typography variant="subtitle2">صورة المنتج</Typography>
                        <Typography variant="caption" color="text.secondary">الحذاء أو الحقيبة إلخ</Typography>
                      </Box>
                    )}
                  </Box>
                </Grid>
              </Grid>

              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleSwap}
                disabled={isSwapping || !swapScenePreview || !swapProductPreview}
                startIcon={isSwapping ? <CircularProgress size={20} color="inherit" /> : <SwapIcon />}
                sx={{ py: 2, borderRadius: 3, fontSize: '1.2rem', fontWeight: 'bold' }}
              >
                {isSwapping ? 'جاري التبديل العبقري...' : 'ابدأ التبديل السحري'}
              </Button>
            </Paper>
          </Grid>

          {/* Output Section */}
          <Grid item xs={12} lg={6}>
            <Paper sx={{ p: 4, borderRadius: 4, height: '100%', minHeight: 500, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">النتيجة النهائية</Typography>

              {swapResult ? (
                <Box display="flex" flexDirection="column" height="100%">
                  <Box sx={{ flexGrow: 1, mb: 4, borderRadius: 4, overflow: 'hidden', boxShadow: 3, border: 1, borderColor: 'divider' }}>
                    <img
                      src={swapResult}
                      alt="Swap Result"
                      style={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Button fullWidth variant="outlined" startIcon={<DownloadIcon />} onClick={() => downloadImage(swapResult)} sx={{ py: 1.5, borderRadius: 2 }}>تحميل</Button>
                    </Grid>
                    <Grid item xs={6}>
                      <Button fullWidth variant="contained" color="secondary" startIcon={<AddToProductIcon />} onClick={() => handleOpenProductDialog(swapResult)} sx={{ py: 1.5, borderRadius: 2 }}>إضافة للمتجر</Button>
                    </Grid>
                  </Grid>
                </Box>
              ) : (
                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1} sx={{ border: '2px dashed', borderColor: 'grey.100', borderRadius: 4, bgcolor: 'grey.50' }}>
                  <SwapIcon size={100} color="#eeeeee" className="mb-4" />
                  <Typography color="text.secondary">سيظهر المنتج في المشهد الجديد هنا</Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 5: Ads Generator */}
      <TabPanel value={tabValue} index={4}>
        <Grid container spacing={4}>
          {/* Input Section */}
          <Grid item xs={12} lg={5}>
            <Paper sx={{ p: 4, borderRadius: 4, height: '100%' }}>
              <Box display="flex" alignItems="center" gap={1} mb={3}>
                <AdIcon color="#1976d2" size={28} />
                <Typography variant="h5" fontWeight="bold">مؤلف الإعلانات الذكي</Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                حول صورتك إلى إعلان احترافي جاهز للنشر على منصات السوشيال ميديا.
              </Typography>

              {/* Step 1: Image Source */}
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">1. اختر الصورة</Typography>
              <Box sx={{ mb: 4, display: 'flex', gap: 2, overflowX: 'auto', pb: 1 }}>
                {/* Current Studio Result if any */}
                {(generatedImage || editedResult || productStudioResult) && (
                  <Paper
                    onClick={() => setAdSourceImage((generatedImage || editedResult || productStudioResult).imageUrl)}
                    sx={{
                      minWidth: 100, width: 100, height: 100,
                      cursor: 'pointer', border: 2,
                      borderColor: adSourceImage === (generatedImage || editedResult || productStudioResult).imageUrl ? 'primary.main' : 'transparent',
                      overflow: 'hidden', position: 'relative'
                    }}
                  >
                    <img src={(generatedImage || editedResult || productStudioResult).imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {adSourceImage === (generatedImage || editedResult || productStudioResult).imageUrl && (
                      <Box sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'primary.main', borderRadius: '50%', display: 'flex' }}>
                        <CheckCircleIcon size={16} color="white" />
                      </Box>
                    )}
                  </Paper>
                )}
                {/* Upload Placeholder */}
                <Paper
                  sx={{
                    minWidth: 100, width: 100, height: 100,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: 'grey.100', cursor: 'pointer', border: '1px dashed grey'
                  }}
                  onClick={() => setMessage({ type: 'info', text: 'استخدم أي صورة تم توليدها أعلاه' })}
                >
                  <UploadIcon color="disabled" />
                </Paper>
              </Box>

              {/* Step 2: Product Info */}
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">2. معلومات المنتج</Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder="ما هو منتجك؟ وما ميزته الأساسية؟"
                variant="outlined"
                value={adProductInfo}
                onChange={(e) => setAdProductInfo(e.target.value)}
                sx={{ mb: 4 }}
              />

              {/* Step 3: Platform */}
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">3. المنصة المستهدفة</Typography>
              <ToggleButtonGroup
                value={adPlatform}
                exclusive
                onChange={(_, val) => val && setAdPlatform(val)}
                fullWidth
                sx={{ mb: 4 }}
              >
                <ToggleButton value="facebook">
                  <FacebookIcon className="mr-2" /> Facebook
                </ToggleButton>
                <ToggleButton value="instagram">
                  <InstagramIcon className="mr-2" /> Instagram
                </ToggleButton>
              </ToggleButtonGroup>

              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={async () => {
                  if (!adProductInfo.trim()) {
                    setMessage({ type: 'error', text: 'يرجى إدخال معلومات المنتج أولاً' });
                    return;
                  }
                  setIsAdGenerating(true);
                  setAdContent(null);
                  try {
                    const response = await apiClient.post('/image-studio/generate-ad', {
                      productInfo: adProductInfo,
                      platform: adPlatform
                    });

                    if (response.data.success) {
                      setAdContent(response.data.data);
                      setMessage({ type: 'success', text: 'تم توليد محتوى الإعلان بنجاح!' });
                    }
                  } catch (error: any) {
                    console.error('Error generating ad:', error);
                    setMessage({ type: 'error', text: error.response?.data?.error || 'فشل توليد محتوى الإعلان' });
                  } finally {
                    setIsAdGenerating(false);
                  }
                }}
                disabled={isAdGenerating || !adSourceImage}
                startIcon={isAdGenerating ? <CircularProgress size={20} color="inherit" /> : <AdIcon />}
                sx={{ py: 2, borderRadius: 3, fontWeight: 'bold' }}
              >
                {isAdGenerating ? 'جاري كتابة الإعلان...' : 'توليد محتوى الإعلان'}
              </Button>
            </Paper>
          </Grid>

          {/* Output Section */}
          <Grid item xs={12} lg={7}>
            <Paper sx={{ p: 4, borderRadius: 4, bgcolor: 'grey.50', minHeight: '100%' }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">معاينة الإعلان</Typography>

              {adContent ? (
                <Box sx={{ maxWidth: 400, mx: 'auto', p: 2 }}>
                  {/* Mockup Frame */}
                  <Box sx={{ bgcolor: 'white', borderRadius: 2, boxShadow: 3, overflow: 'hidden' }}>
                    {/* Header */}
                    <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 32, height: 32 }} />
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ lineHeight: 1 }}>اسم متجرك</Typography>
                        <Typography variant="caption" color="text.secondary">ممول · Sponsored</Typography>
                      </Box>
                    </Box>

                    {/* Content Body (FB style) */}
                    {adPlatform === 'facebook' && (
                      <Box sx={{ px: 1.5, pb: 1 }}>
                        <Typography variant="body2">{adContent.body}</Typography>
                      </Box>
                    )}

                    {/* Image */}
                    <Box sx={{ width: '100%', pt: '100%', position: 'relative' }}>
                      <img
                        src={adSourceImage || ''}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </Box>

                    {/* Footer / CTA Area */}
                    <Box sx={{ bgcolor: 'grey.100', p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>WWW.YOURSTORE.COM</Typography>
                        <Typography variant="subtitle2" fontWeight="bold">{adContent.headline}</Typography>
                      </Box>
                      <Button variant="contained" size="small" disableElevation sx={{ bgcolor: 'grey.300', color: 'black', '&:hover': { bgcolor: 'grey.400' } }}>
                        {adContent.cta}
                      </Button>
                    </Box>

                    {/* IG Specific caption below image */}
                    {adPlatform === 'instagram' && (
                      <Box sx={{ p: 1.5 }}>
                        <Typography variant="body2">
                          <Box component="span" fontWeight="bold" sx={{ mr: 1 }}>yourstore</Box>
                          {adContent.body}
                        </Typography>
                      </Box>
                    )}

                    <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-around', color: 'grey.600' }}>
                      <Typography variant="caption">إعجاب</Typography>
                      <Typography variant="caption">تعليق</Typography>
                      <Typography variant="caption">مشاركة</Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                    <Button fullWidth variant="outlined" startIcon={<DownloadIcon />}>نسخ النص</Button>
                    <Button fullWidth variant="contained" color="secondary">مشاركة</Button>
                  </Box>
                </Box>
              ) : (
                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height={500} sx={{ border: '2px dashed', borderColor: 'grey.200', borderRadius: 4 }}>
                  <AdIcon size={100} color="#eeeeee" style={{ marginBottom: 16 }} />
                  <Typography color="text.secondary">اختر صورة واضغط توليد لرؤية الإعلان</Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 6: History */}
      <TabPanel value={tabValue} index={5}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>سجل التوليد</Typography>

          {history.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {history.map((item) => (
                <Paper key={item.id} sx={{ p: 2, '&:hover': { bgcolor: 'grey.50' } }}>
                  <Grid container spacing={2} alignItems="center">
                    {item.imageUrl && (
                      <Grid item xs={12} sm={2}>
                        <img
                          src={item.imageUrl}
                          alt="Generated"
                          style={{ width: '100%', height: 'auto', borderRadius: 8 }}
                        />
                      </Grid>
                    )}
                    <Grid item xs={12} sm={item.imageUrl ? 8 : 10}>
                      <Typography variant="body2" gutterBottom>{item.prompt}</Typography>
                      <Box display="flex" gap={2} flexWrap="wrap">
                        <Typography variant="caption" color="text.secondary">
                          {new Date(item.createdAt).toLocaleDateString('ar-EG')}
                        </Typography>
                        <Chip
                          icon={item.modelType === 'basic' ? <ZapIcon /> : <CrownIcon />}
                          label={item.modelType}
                          size="small"
                        />
                        <Chip
                          label={item.status === 'completed' ? 'مكتمل' : item.status === 'failed' ? 'فشل' : 'قيد المعالجة'}
                          size="small"
                          color={item.status === 'completed' ? 'success' : item.status === 'failed' ? 'error' : 'warning'}
                        />
                      </Box>
                    </Grid>
                    {item.imageUrl && (
                      <Grid item xs={12} sm={2}>
                        <Button
                          variant="outlined"
                          size="small"
                          fullWidth
                          startIcon={<DownloadIcon />}
                          onClick={() => downloadImage(item.imageUrl)}
                          sx={{ mb: 1 }}
                        >
                          تحميل
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          fullWidth
                          color="secondary"
                          startIcon={<AddToProductIcon />}
                          onClick={() => handleOpenProductDialog(item.imageUrl)}
                        >
                          منتج
                        </Button>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              ))}
            </Box>
          ) : (
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              sx={{ py: 8, color: 'text.disabled' }}
            >
              <HistoryIcon size={64} style={{ marginBottom: 16 }} />
              <Typography>لا يوجد سجل بعد</Typography>
            </Box>
          )}
        </Paper>
      </TabPanel>

      {/* Tab 7: Stats */}
      <TabPanel value={tabValue} index={6}>
        {stats && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <ImageIcon size={48} color="#1976d2" style={{ marginBottom: 16 }} />
                  <Typography variant="h3" fontWeight="bold">{stats.totalImages}</Typography>
                  <Typography color="text.secondary">إجمالي الصور</Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <ZapIcon size={48} color="#1976d2" style={{ marginBottom: 16 }} />
                  <Typography variant="h3" fontWeight="bold" color="primary">{stats.totalBasic}</Typography>
                  <Typography color="text.secondary">Basic Model</Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <CrownIcon size={48} color="#9c27b0" style={{ marginBottom: 16 }} />
                  <Typography variant="h3" fontWeight="bold" color="secondary">{stats.totalPro}</Typography>
                  <Typography color="text.secondary">Pro Model</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </TabPanel>

      {/* Phase 3: Product Selection Dialog */}
      <Dialog
        open={productDialogOpen}
        onClose={() => setProductDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        dir="rtl"
      >
        <DialogTitle>إضافة الصورة لمنتج</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              fullWidth
              placeholder="ابحث عن منتج..."
              value={productSearch}
              onChange={(e) => {
                setProductSearch(e.target.value);
                if (e.target.value.length > 2 || e.target.value === '') {
                  searchProducts(e.target.value);
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="#757575" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            {loadingProducts ? (
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                {products.length > 0 ? (
                  products.map((product) => (
                    <ListItem
                      key={product.id}
                      button
                      onClick={() => handleAddToProduct(product.id)}
                      sx={{ borderRadius: 1, mb: 0.5, '&:hover': { bgcolor: 'action.hover' } }}
                    >
                      <ListItemAvatar>
                        <Avatar variant="rounded" src={product.images ? JSON.parse(product.images)[0] : undefined}>
                          <ImageIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={product.name}
                        secondary={`${product.price} ج.م - المخزون: ${product.stock}`}
                      />
                      <Chip label="إضافة" size="small" color="primary" clickable onClick={() => handleAddToProduct(product.id)} />
                    </ListItem>
                  ))
                ) : (
                  <Typography align="center" color="text.secondary" py={4}>
                    لا توجد منتجات
                  </Typography>
                )}
              </List>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProductDialogOpen(false)}>إلغاء</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ImageStudio;
