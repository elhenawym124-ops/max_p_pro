import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Grid,
    TextField,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    MenuItem,
    Autocomplete,
    Divider,
    CircularProgress
} from '@mui/material';
import {
    Delete as DeleteIcon,
    Add as AddIcon,
    ArrowBack as BackIcon,
    Save as SaveIcon,
    Print as PrintIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { useTheme } from '../../hooks/useTheme';
import toast from 'react-hot-toast';
import '../../styles/dashboard-enhanced.css';

interface Supplier {
    id: string;
    name: string;
}

interface Product {
    id: string;
    name: string;
    sku: string;
    price: number;
    cost: number;
}

interface OrderItem {
    id?: string;
    productId: string | null;
    productName: string;
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    discountRate: number;
    totalPrice: number;
    notes?: string;
}

const PurchaseOrderForm: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = Boolean(id);
    const { actualTheme } = useTheme();
    const isDark = actualTheme === 'dark';
    const glassClass = isDark ? 'glass-effect-dark' : 'glass-effect';

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [productSearchLoading, setProductSearchLoading] = useState(false);

    const [formData, setFormData] = useState({
        supplierId: '',
        orderDate: new Date().toISOString().split('T')[0],
        expectedDelivery: '',
        paymentTerms: '',
        notes: '',
        shippingCost: 0,
        discountAmount: 0
    });

    const [items, setItems] = useState<OrderItem[]>([
        {
            productId: null,
            productName: '',
            description: '',
            quantity: 1,
            unitPrice: 0,
            taxRate: 0,
            discountRate: 0,
            totalPrice: 0
        }
    ]);

    useEffect(() => {
        fetchInitialData();
        if (isEdit) {
            fetchOrder();
        }
    }, [id]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [suppliersRes, productsRes] = await Promise.all([
                apiClient.get('/procurement/suppliers', { params: { limit: 100 } }),
                apiClient.get('/products', { params: { limit: 100 } }) // Initial product list
            ]);
            setSuppliers(suppliersRes.data.suppliers || []);
            setProducts(productsRes.data.data || []);
        } catch (error) {
            console.error('Error fetching initial data:', error);
            toast.error('فشل في تحميل البيانات الأولية');
        } finally {
            setLoading(false);
        }
    };

    const fetchOrder = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get(`/procurement/purchase-orders/${id}`);
            const order = response.data;

            setFormData({
                supplierId: order.supplierId,
                orderDate: new Date(order.orderDate).toISOString().split('T')[0],
                expectedDelivery: order.expectedDelivery ? new Date(order.expectedDelivery).toISOString().split('T')[0] : '',
                paymentTerms: order.paymentTerms || '',
                notes: order.notes || '',
                shippingCost: Number(order.shippingCost),
                discountAmount: Number(order.discountAmount)
            });

            setItems(order.items.map((item: any) => ({
                id: item.id,
                productId: item.productId,
                productName: item.productName,
                description: item.description || '',
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
                taxRate: Number(item.taxRate),
                discountRate: Number(item.discountRate),
                totalPrice: Number(item.totalPrice)
            })));
        } catch (error) {
            console.error('Error fetching order:', error);
            toast.error('فشل في تحميل بيانات أمر الشراء');
        } finally {
            setLoading(false);
        }
    };

    const handleProductSearch = async (query: string) => {
        // We allow searching even with empty string to restore initial state if needed
        // but server-side search is triggered for 1+ characters
        try {
            setProductSearchLoading(true);
            const response = await apiClient.get('/products', {
                params: {
                    search: query || undefined,
                    limit: query ? 20 : 100
                }
            });
            setProducts(response.data.data || []);
        } catch (error) {
            console.error('Error searching products:', error);
        } finally {
            setProductSearchLoading(false);
        }
    };

    const updateItemDetails = (index: number, updates: Partial<OrderItem>) => {
        setItems(prevItems => {
            const newItems = [...prevItems];
            const item = { ...newItems[index], ...updates };

            // Recalculate item total based on current or new values
            const quantity = parseFloat('quantity' in updates ? (updates.quantity as any) : item.quantity) || 0;
            const unitPrice = parseFloat('unitPrice' in updates ? (updates.unitPrice as any) : item.unitPrice) || 0;
            const taxRate = parseFloat('taxRate' in updates ? (updates.taxRate as any) : item.taxRate) || 0;
            const discountRate = parseFloat('discountRate' in updates ? (updates.discountRate as any) : item.discountRate) || 0;

            const subtotal = quantity * unitPrice;
            const discount = subtotal * (discountRate / 100);
            const tax = (subtotal - discount) * (taxRate / 100);

            item.totalPrice = subtotal - discount + tax;
            newItems[index] = item;
            return newItems;
        });
    };

    // Keep updateItem for single field calls to avoid massive refactor downstream
    const updateItem = (index: number, field: keyof OrderItem, value: any) => {
        updateItemDetails(index, { [field]: value });
    };

    const addItem = () => {
        setItems([...items, {
            productId: null,
            productName: '',
            description: '',
            quantity: 1,
            unitPrice: 0,
            taxRate: 0,
            discountRate: 0,
            totalPrice: 0
        }]);
    };

    const removeItem = (index: number) => {
        if (items.length === 1) {
            setItems([{
                productId: null,
                productName: '',
                description: '',
                quantity: 1,
                unitPrice: 0,
                taxRate: 0,
                discountRate: 0,
                totalPrice: 0
            }]);
        } else {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const calculateTotals = () => {
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const totalTax = items.reduce((sum, item) => {
            const itemSubtotal = item.quantity * item.unitPrice;
            const itemDiscount = itemSubtotal * (item.discountRate / 100);
            return sum + ((itemSubtotal - itemDiscount) * (item.taxRate / 100));
        }, 0);
        const itemDiscounts = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (item.discountRate / 100)), 0);

        const grandTotal = subtotal - itemDiscounts + totalTax + Number(formData.shippingCost) - Number(formData.discountAmount);

        return {
            subtotal,
            totalTax,
            itemDiscounts,
            grandTotal
        };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.supplierId) {
            toast.error('يرجى اختيار المورد');
            return;
        }

        const invalidItems = items.filter(item => !item.productName || item.quantity <= 0);
        if (invalidItems.length > 0) {
            toast.error('يرجى التأكد من اختيار المنتج وإدخال كمية صحيحة لكل البنود');
            return;
        }

        try {
            setSaving(true);
            const payload = {
                ...formData,
                items
            };

            if (isEdit) {
                await apiClient.put(`/procurement/purchase-orders/${id}`, payload);
                toast.success('تم تحديث أمر الشراء بنجاح');
            } else {
                await apiClient.post('/procurement/purchase-orders', payload);
                toast.success('تم إنشاء أمر الشراء بنجاح');
            }
            navigate('/procurement/purchase-orders');
        } catch (error: any) {
            console.error('Error saving order:', error);
            toast.error(error.response?.data?.message || 'حدث خطأ أثناء حفظ أمر الشراء');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                <CircularProgress />
            </Box>
        );
    }

    const handlePrint = () => {
        window.print();
    };

    const totals = calculateTotals();

    return (
        <Box sx={{ p: 3 }} className="no-print">
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2, justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <IconButton onClick={() => navigate('/procurement/purchase-orders')} className="micro-bounce">
                        <BackIcon />
                    </IconButton>
                    <Typography variant="h4" className="gradient-text" sx={{ fontWeight: 'bold' }}>
                        {isEdit ? 'تعديل أمر شراء' : 'إنشاء أمر شراء جديد'}
                    </Typography>
                </Box>
                {isEdit && (
                    <Button
                        variant="outlined"
                        startIcon={<PrintIcon />}
                        onClick={handlePrint}
                        className="micro-bounce"
                    >
                        طباعة
                    </Button>
                )}
            </Box>

            <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                    {/* Header Info */}
                    <Grid item xs={12}>
                        <Card className={`${glassClass} card-hover-lift`} sx={{ borderRadius: 4 }}>
                            <CardContent>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={4}>
                                        <TextField
                                            select
                                            fullWidth
                                            label="المورد *"
                                            value={formData.supplierId}
                                            onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                                            required
                                            variant="standard"
                                        >
                                            {suppliers.map((s) => (
                                                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                                            ))}
                                        </TextField>
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <TextField
                                            fullWidth
                                            label="تاريخ الأمر"
                                            type="date"
                                            InputLabelProps={{ shrink: true }}
                                            value={formData.orderDate}
                                            onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                                            variant="standard"
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <TextField
                                            fullWidth
                                            label="التسليم المتوقع"
                                            type="date"
                                            InputLabelProps={{ shrink: true }}
                                            value={formData.expectedDelivery}
                                            onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })}
                                            variant="standard"
                                        />
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Line Items */}
                    <Grid item xs={12}>
                        <Card className={`${glassClass} card-hover-lift`} sx={{ borderRadius: 4 }}>
                            <CardContent>
                                <Typography variant="h6" sx={{ mb: 2 }} className="gradient-text">الأصناف</Typography>
                                <TableContainer component={Paper} elevation={0} sx={{ background: 'transparent' }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ minWidth: 250, fontWeight: 'bold' }}>الصنف</TableCell>
                                                <TableCell align="right" sx={{ width: 100, fontWeight: 'bold' }}>الكمية</TableCell>
                                                <TableCell align="right" sx={{ width: 120, fontWeight: 'bold' }}>سعر الوحدة</TableCell>
                                                <TableCell align="right" sx={{ width: 100, fontWeight: 'bold' }}>الضريبة %</TableCell>
                                                <TableCell align="right" sx={{ width: 100, fontWeight: 'bold' }}>الخصم %</TableCell>
                                                <TableCell align="right" sx={{ width: 120, fontWeight: 'bold' }}>الإجمالي</TableCell>
                                                <TableCell align="center" sx={{ width: 50 }}></TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {items.map((item, index) => (
                                                <TableRow key={index} className="micro-rotate-active">
                                                    <TableCell>
                                                        <Autocomplete
                                                            freeSolo
                                                            openOnFocus
                                                            options={products}
                                                            getOptionLabel={(option) => typeof option === 'string' ? option : `${option.name} (${option.sku || 'N/A'})`}
                                                            onInputChange={(_, value, reason) => {
                                                                // Only trigger backend search on actual typing
                                                                // reason 'reset' or 'clear' shouldn't trigger expensive search
                                                                if (reason === 'input') {
                                                                    handleProductSearch(value);
                                                                }
                                                            }}
                                                            loading={productSearchLoading}
                                                            onChange={(_, value) => {
                                                                if (typeof value === 'object' && value !== null) {
                                                                    updateItemDetails(index, {
                                                                        productId: value.id,
                                                                        productName: value.name,
                                                                        unitPrice: value.cost || 0
                                                                    });
                                                                } else if (typeof value === 'string') {
                                                                    updateItemDetails(index, { productName: value });
                                                                } else if (value === null) {
                                                                    updateItemDetails(index, { productId: null, productName: '' });
                                                                }
                                                            }}
                                                            renderInput={(params) => (
                                                                <TextField
                                                                    {...params}
                                                                    size="small"
                                                                    placeholder="اختر صنفاً أو ابحث باسمه"
                                                                    variant="standard"
                                                                    InputProps={{
                                                                        ...params.InputProps,
                                                                        endAdornment: (
                                                                            <React.Fragment>
                                                                                {productSearchLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                                                                {params.InputProps.endAdornment}
                                                                            </React.Fragment>
                                                                        ),
                                                                    }}
                                                                />
                                                            )}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextField
                                                            type="number"
                                                            size="small"
                                                            variant="standard"
                                                            value={item.quantity}
                                                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextField
                                                            type="number"
                                                            size="small"
                                                            variant="standard"
                                                            value={item.unitPrice}
                                                            onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextField
                                                            type="number"
                                                            size="small"
                                                            variant="standard"
                                                            value={item.taxRate}
                                                            onChange={(e) => updateItem(index, 'taxRate', e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextField
                                                            type="number"
                                                            size="small"
                                                            variant="standard"
                                                            value={item.discountRate}
                                                            onChange={(e) => updateItem(index, 'discountRate', e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                                        {item.totalPrice.toFixed(2)}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <IconButton size="small" color="error" onClick={() => removeItem(index)} className="micro-bounce">
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                <Button
                                    startIcon={<AddIcon />}
                                    onClick={addItem}
                                    sx={{ mt: 2 }}
                                    className="micro-bounce"
                                >
                                    إضافة صنف جديد
                                </Button>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Footer Info & Totals */}
                    <Grid item xs={12} md={8}>
                        <Card className={`${glassClass}`} sx={{ borderRadius: 4, height: '100%' }}>
                            <CardContent>
                                <Grid container spacing={2}>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="شروط الدفع"
                                            multiline
                                            rows={2}
                                            variant="outlined"
                                            value={formData.paymentTerms}
                                            onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                                            sx={{ mt: 1 }}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="ملاحظات إضافية"
                                            multiline
                                            rows={3}
                                            variant="outlined"
                                            value={formData.notes}
                                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        />
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <Card className={`${glassClass} pulse-glow`} sx={{ borderRadius: 4 }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom className="gradient-text">ملخص المبالغ</Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography color="textSecondary">المجموع قبل الخصم:</Typography>
                                        <Typography fontWeight="bold">{totals.subtotal.toFixed(2)} EGP</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography color="textSecondary">إجمالي خصم البنود:</Typography>
                                        <Typography color="error.main">-{totals.itemDiscounts.toFixed(2)} EGP</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography color="textSecondary">إجمالي الضرائب:</Typography>
                                        <Typography color="success.main">+{totals.totalTax.toFixed(2)} EGP</Typography>
                                    </Box>
                                    <Divider sx={{ my: 1 }} />
                                    <Grid container spacing={1} alignItems="center">
                                        <Grid item xs={6}>
                                            <Typography color="textSecondary">مصاريف الشحن:</Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <TextField
                                                type="number"
                                                size="small"
                                                value={formData.shippingCost}
                                                onChange={(e) => setFormData({ ...formData, shippingCost: Number(e.target.value) })}
                                                fullWidth
                                                variant="standard"
                                            />
                                        </Grid>
                                    </Grid>
                                    <Grid container spacing={1} alignItems="center">
                                        <Grid item xs={6}>
                                            <Typography color="textSecondary">خصم إضافي عام:</Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <TextField
                                                type="number"
                                                size="small"
                                                value={formData.discountAmount}
                                                onChange={(e) => setFormData({ ...formData, discountAmount: Number(e.target.value) })}
                                                fullWidth
                                                variant="standard"
                                            />
                                        </Grid>
                                    </Grid>
                                    <Divider sx={{ my: 1 }} />
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>الإجمالي النهائي:</Typography>
                                        <Typography variant="h5" color="primary" sx={{ fontWeight: '900' }}>
                                            {totals.grandTotal.toFixed(2)} EGP
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12}>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                            <Button
                                variant="outlined"
                                onClick={() => navigate('/procurement/purchase-orders')}
                                className="micro-bounce"
                                sx={{ borderRadius: 2 }}
                            >
                                إلغاء
                            </Button>
                            <Button
                                type="submit"
                                variant="contained"
                                disabled={saving}
                                startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                                className="micro-bounce"
                                sx={{
                                    borderRadius: 2,
                                    px: 4,
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    boxShadow: '0 4px 15px rgba(118, 75, 162, 0.4)'
                                }}
                            >
                                {isEdit ? 'تحديث البيانات' : 'تأكيد وحفظ الأمر'}
                            </Button>
                        </Box>
                    </Grid>
                </Grid>
            </form>
        </Box>
    );
};

export default PurchaseOrderForm;
