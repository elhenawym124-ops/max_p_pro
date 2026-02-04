import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Tabs,
    Tab,
    Paper,
    CircularProgress,
    Alert,
    Grid,
    Card,
    CardContent,
    Button,
    Chip,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from '@mui/material';
import {
    Star as StarIcon,
    ShoppingBag as MarketplaceIcon,
    Inventory as BundleIcon,
    CorporateFare as EnterpriseIcon,
    Add as AddIcon,
    Edit as EditIcon,
    TrendingUp as TrendingUpIcon,
    Check as CheckIcon,
    Close as CloseIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';
import { buildApiUrl } from '../../utils/urlHelper';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const SubscriptionCenter = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Platform Plans State
    const [plans, setPlans] = useState([]);
    const [planDialog, setPlanDialog] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<any>(null);

    // Marketplace State
    const [apps, setApps] = useState([]);
    const [pricingRules, setPricingRules] = useState([]);
    const [bundles, setBundles] = useState([]);
    const [enterprisePlans, setEnterprisePlans] = useState([]);
    const [marketplaceDialog, setMarketplaceDialog] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);

    const handleDelete = async (id: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا العنصر؟')) return;
        try {
            const token = localStorage.getItem('accessToken');
            const headers = { Authorization: `Bearer ${token}` };
            const typePath = activeTab === 1 ? 'apps' : (editingItem?.feature ? 'pricing-rules' : 'bundles');

            await axios.delete(buildApiUrl(`super-admin/marketplace-management/${typePath}/${id}`), { headers });
            toast.success('تم الحذف بنجاح');
            fetchAllData();
        } catch (err) {
            console.error('Delete error:', err);
            toast.error('خطأ في الحذف');
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            const headers = { Authorization: `Bearer ${token}` };

            const [plansRes, appsRes, pricingRes, bundlesRes, enterpriseRes] = await Promise.all([
                axios.get(buildApiUrl('admin/plans/plans'), { headers }),
                axios.get(buildApiUrl('super-admin/marketplace-management/apps'), { headers }),
                axios.get(buildApiUrl('super-admin/marketplace-management/pricing-rules'), { headers }),
                axios.get(buildApiUrl('super-admin/marketplace-management/bundles'), { headers }),
                axios.get(buildApiUrl('super-admin/marketplace-management/enterprise-plans'), { headers }),
            ]);

            if (plansRes.data.success) setPlans(plansRes.data.data);
            if (appsRes.data.success) setApps(appsRes.data.data);
            if (pricingRes.data.success) setPricingRules(pricingRes.data.data);
            if (bundlesRes.data.success) setBundles(bundlesRes.data.data);
            if (enterpriseRes.data.success) setEnterprisePlans(enterpriseRes.data.data);

        } catch (err) {
            console.error('Error fetching data:', err);
            setError('فشل في جلب البيانات الموحدة للاشتراكات');
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    if (loading) return <Box display="flex" justifyContent="center" p={10}><CircularProgress /></Box>;

    return (
        <Box p={3}>
            <Box mb={4}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>مركز إدارة الاشتراكات والفوترة</Typography>
                <Typography variant="body1" color="text.secondary">إدارة الخطط الأساسية، تطبيقات المتجر، والعروض المخصصة للمؤسسات</Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <Paper sx={{ mb: 3 }}>
                <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    indicatorColor="primary"
                    textColor="primary"
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    <Tab icon={<StarIcon />} iconPosition="start" label="خطط المنصة" />
                    <Tab icon={<MarketplaceIcon />} iconPosition="start" label="تطبيقات المتجر" />
                    <Tab icon={<BundleIcon />} iconPosition="start" label="الباقات والأسعار" />
                    <Tab icon={<EnterpriseIcon />} iconPosition="start" label="تعاقدات المؤسسات" />
                </Tabs>
            </Paper>

            {activeTab === 0 && (
                <PlatformPlansTab
                    plans={plans}
                    onEdit={(p) => {
                        setSelectedPlan(p);
                        setPlanDialog(true);
                    }}
                    onRefresh={fetchAllData}
                />
            )}
            {activeTab === 1 && (
                <MarketplaceAppsTab
                    apps={apps}
                    onEdit={(app: any) => { setEditingItem(app); setMarketplaceDialog(true); }}
                    onDelete={handleDelete}
                    onRefresh={fetchAllData}
                />
            )}
            {activeTab === 2 && (
                <BundlesAndPricingTab
                    pricingRules={pricingRules}
                    bundles={bundles}
                    onEdit={(item: any) => { setEditingItem(item); setMarketplaceDialog(true); }}
                    onDelete={handleDelete}
                    onRefresh={fetchAllData}
                />
            )}
            {activeTab === 3 && (
                <EnterprisePlansTab
                    enterprisePlans={enterprisePlans}
                    onEdit={(plan: any) => { setSelectedPlan(plan); setPlanDialog(true); }} // Re-use plan dialog or specialized
                    onRefresh={fetchAllData}
                />
            )}

            {/* Marketplace Item Dialog */}
            {marketplaceDialog && (
                <MarketplaceItemDialog
                    open={marketplaceDialog}
                    onClose={() => { setMarketplaceDialog(false); setEditingItem(null); }}
                    item={editingItem}
                    type={activeTab === 1 ? 'app' : (editingItem?.feature ? 'pricing' : 'bundle')}
                    onSave={async (itemData: any) => {
                        try {
                            const token = localStorage.getItem('accessToken');
                            const headers = { Authorization: `Bearer ${token}` };
                            const typePath = activeTab === 1 ? 'apps' : (editingItem?.feature ? 'pricing-rules' : 'bundles');

                            if (editingItem?.id) {
                                await axios.put(buildApiUrl(`super-admin/marketplace-management/${typePath}/${editingItem.id}`), itemData, { headers });
                            } else {
                                await axios.post(buildApiUrl(`super-admin/marketplace-management/${typePath}`), itemData, { headers });
                            }

                            toast.success('تم الحفظ بنجاح');
                            setMarketplaceDialog(false);
                            setEditingItem(null);
                            fetchAllData();
                        } catch (err) {
                            console.error('Marketplace save error:', err);
                            toast.error('خطأ في الحفظ');
                        }
                    }}
                />
            )}

            {/* Plan Edit Dialog */}
            <EditPlanDialog
                open={planDialog}
                onClose={() => { setPlanDialog(false); setSelectedPlan(null); }}
                plan={selectedPlan}
                onSave={async (planData: any) => {
                    try {
                        const token = localStorage.getItem('accessToken');
                        const planType = planData.planType || selectedPlan?.planType;
                        await axios.put(
                            buildApiUrl(`admin/plans/plans/${planType}`),
                            planData,
                            { headers: { Authorization: `Bearer ${token}` } }
                        );
                        toast.success('تم حفظ الخطة بنجاح');
                        setPlanDialog(false);
                        fetchAllData();
                    } catch (err) {
                        console.error('Save error:', err);
                        toast.error('خطأ في حفظ الخطة');
                    }
                }}
            />
        </Box>
    );
};

// Sub-components for Tabs

const PlatformPlansTab = ({ plans, onEdit, onRefresh }) => {
    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">خطط المنصة الأساسية</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => onEdit(null)}>إضافة خطة</Button>
            </Box>
            <Grid container spacing={3}>
                {plans.map((plan) => (
                    <Grid item xs={12} md={4} key={plan.planType}>
                        <Card sx={{ height: '100%', borderTop: 5, borderColor: plan.isCustom ? 'secondary.main' : 'primary.main' }}>
                            <CardContent>
                                <Box textAlign="center" mb={2}>
                                    <Typography variant="h5" fontWeight="bold">{plan.name}</Typography>
                                    <Typography variant="h3" color="primary" sx={{ my: 2 }}>{plan.price} ج.م</Typography>
                                    <Typography variant="body2" color="text.secondary">شهرياً</Typography>
                                </Box>
                                <Box mb={2}>
                                    <Typography variant="body2">{plan.description || 'لا يوجد وصف'}</Typography>
                                </Box>
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Box>
                                        <Typography variant="caption" display="block">الشركات النشطة</Typography>
                                        <Typography variant="h6">{plan.stats?.activeCompanies || 0}</Typography>
                                    </Box>
                                    <Button variant="outlined" size="small" startIcon={<EditIcon />} onClick={() => onEdit(plan)}>تعديل</Button>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

const MarketplaceAppsTab = ({ apps, onEdit, onDelete, onRefresh }: { apps: any[], onEdit: (app: any) => void, onDelete: (id: string) => void, onRefresh: () => void }) => {
    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">تطبيقات المتجر</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => onEdit(null)}>إضافة تطبيق</Button>
            </Box>
            <Grid container spacing={3}>
                {apps.map((app) => (
                    <Grid item xs={12} sm={6} md={4} key={app.id}>
                        <Card>
                            <CardContent>
                                <Box display="flex" justifyContent="space-between" mb={2}>
                                    <Typography variant="h6" fontWeight="bold">{app.name}</Typography>
                                    <Chip label={app.isActive ? 'نشط' : 'معطل'} color={app.isActive ? 'success' : 'error'} size="small" />
                                </Box>
                                <Typography variant="body2" color="text.secondary" mb={2} sx={{ height: 40, overflow: 'hidden' }}>{app.description}</Typography>
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography variant="h6" color="primary">{app.monthlyPrice} ج / شهر</Typography>
                                    <Box>
                                        <IconButton size="small" onClick={() => onEdit(app)}><EditIcon /></IconButton>
                                        <IconButton size="small" color="error" onClick={() => onDelete(app.id)}><DeleteIcon /></IconButton>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

const BundlesAndPricingTab = ({ pricingRules, bundles, onEdit, onDelete, onRefresh }: { pricingRules: any[], bundles: any[], onEdit: (item: any) => void, onDelete: (id: string) => void, onRefresh: () => void }) => {
    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">قواعد التسعير الإضافية</Typography>
                <Button variant="outlined" startIcon={<AddIcon />} size="small" onClick={() => onEdit({ feature: '', price: 0, unit: '' })}>إضافة قاعدة</Button>
            </Box>
            <TableContainer component={Paper} sx={{ mb: 4 }}>
                <Table>
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                            <TableCell>الميزة</TableCell>
                            <TableCell>السعر</TableCell>
                            <TableCell>الوحدة</TableCell>
                            <TableCell>الحالة</TableCell>
                            <TableCell>إجراءات</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {pricingRules.map((rule) => (
                            <TableRow key={rule.id}>
                                <TableCell>{rule.feature}</TableCell>
                                <TableCell>{rule.price} ج</TableCell>
                                <TableCell>{rule.unit}</TableCell>
                                <TableCell><Chip label={rule.isActive ? 'نشط' : 'معطل'} size="small" /></TableCell>
                                <TableCell>
                                    <IconButton size="small" onClick={() => onEdit(rule)}><EditIcon /></IconButton>
                                    <IconButton size="small" color="error" onClick={() => onDelete(rule.id)}><DeleteIcon /></IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">باقات العروض (Bundles)</Typography>
                <Button variant="outlined" startIcon={<AddIcon />} size="small" onClick={() => onEdit({ name: '', price: 0, apps: [] })}>إضافة باقة</Button>
            </Box>
            <Grid container spacing={3}>
                {bundles.map((bundle) => (
                    <Grid item xs={12} md={6} key={bundle.id}>
                        <Card sx={{ bgcolor: 'secondary.light', color: 'secondary.contrastText' }}>
                            <CardContent>
                                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                    <Box>
                                        <Typography variant="h6" fontWeight="bold">{bundle.name}</Typography>
                                        <Typography variant="body2" mb={2}>{bundle.description}</Typography>
                                    </Box>
                                    <Box>
                                        <IconButton size="small" onClick={() => onEdit(bundle)} sx={{ color: 'inherit' }}><EditIcon /></IconButton>
                                        <IconButton size="small" onClick={() => onDelete(bundle.id)} sx={{ color: 'error.main' }}><DeleteIcon /></IconButton>
                                    </Box>
                                </Box>
                                <Box display="flex" justifyContent="space-between">
                                    <Typography variant="h5">{bundle.price} ج/شهر</Typography>
                                    <Chip label={`خصم ${bundle.discount}%`} color="warning" />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

const EnterprisePlansTab = ({ enterprisePlans, onEdit, onRefresh }: { enterprisePlans: any[], onEdit: (plan: any) => void, onRefresh: () => void }) => {
    return (
        <Box>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                            <TableCell>الشركة</TableCell>
                            <TableCell>الرسوم الشهرية</TableCell>
                            <TableCell>مدير الحساب</TableCell>
                            <TableCell>دعم مخصص</TableCell>
                            <TableCell>الحالة</TableCell>
                            <TableCell>إجراءات</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {enterprisePlans.map((plan) => (
                            <TableRow key={plan.id}>
                                <TableCell>
                                    <Typography variant="subtitle2">{plan.company?.name}</Typography>
                                    <Typography variant="caption">{plan.company?.email}</Typography>
                                </TableCell>
                                <TableCell>{plan.customMonthlyFee} ج</TableCell>
                                <TableCell>{plan.accountManager || 'غير محدد'}</TableCell>
                                <TableCell>{plan.dedicatedSupport ? <CheckIcon color="success" /> : <CloseIcon color="error" />}</TableCell>
                                <TableCell><Chip label="Enterprise" color="warning" size="small" /></TableCell>
                                <TableCell>
                                    <IconButton size="small" onClick={() => onEdit(plan)}><EditIcon /></IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

const MarketplaceItemDialog = ({ open, onClose, item, type, onSave }: { open: boolean, onClose: () => void, item: any, type: string, onSave: (data: any) => void }) => {
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        if (item) {
            setFormData({ ...item });
        } else {
            setFormData({
                name: '',
                description: '',
                monthlyPrice: 0,
                isActive: true,
                ...(type === 'pricing' ? { feature: '', price: 0, unit: '' } : {}),
                ...(type === 'bundle' ? { discount: 0, apps: [] } : {})
            });
        }
    }, [item, open, type]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type: inputType } = e.target;
        setFormData((prev: any) => ({
            ...prev,
            [name]: inputType === 'number' ? parseFloat(value) : value
        }));
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {item ? 'تعديل' : 'إضافة'} {type === 'app' ? 'تطبيق' : (type === 'pricing' ? 'قاعدة تسعير' : 'باقة')}
            </DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    {type === 'pricing' ? (
                        <>
                            <Grid item xs={12}>
                                <TextField fullWidth label="الميزة" name="feature" value={formData.feature || ''} onChange={handleChange} />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField fullWidth label="السعر" name="price" type="number" value={formData.price || 0} onChange={handleChange} />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField fullWidth label="الوحدة" name="unit" value={formData.unit || ''} onChange={handleChange} />
                            </Grid>
                        </>
                    ) : (
                        <>
                            <Grid item xs={12}>
                                <TextField fullWidth label="الاسم" name="name" value={formData.name || ''} onChange={handleChange} />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField fullWidth label="الوصف" name="description" multiline rows={2} value={formData.description || ''} onChange={handleChange} />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField fullWidth label="السعر" name="monthlyPrice" type="number" value={formData.monthlyPrice || formData.price || 0} onChange={handleChange} />
                            </Grid>
                            {type === 'bundle' && (
                                <Grid item xs={6}>
                                    <TextField fullWidth label="الخصم %" name="discount" type="number" value={formData.discount || 0} onChange={handleChange} />
                                </Grid>
                            )}
                        </>
                    )}
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>إلغاء</Button>
                <Button variant="contained" onClick={() => onSave(formData)}>حفظ</Button>
            </DialogActions>
        </Dialog>
    );
};

const EditPlanDialog = ({ open, onClose, plan, onSave }: { open: boolean, onClose: () => void, plan: any, onSave: (data: any) => void }) => {
    const [formData, setFormData] = useState({
        planType: '',
        name: '',
        nameEn: '',
        price: 0,
        currency: 'EGP',
        billingCycle: 'monthly',
        description: '',
        descriptionEn: '',
        features: []
    });

    useEffect(() => {
        if (plan) {
            setFormData({
                planType: plan.planType || '',
                name: plan.name || '',
                nameEn: plan.nameEn || '',
                price: plan.price || 0,
                currency: plan.currency || 'EGP',
                billingCycle: plan.billingCycle || 'monthly',
                description: plan.description || '',
                descriptionEn: plan.descriptionEn || '',
                features: Array.isArray(plan.features) ? plan.features : (typeof plan.features === 'string' ? JSON.parse(plan.features) : [])
            });
        } else {
            setFormData({
                planType: '',
                name: '',
                nameEn: '',
                price: 0,
                currency: 'EGP',
                billingCycle: 'monthly',
                description: '',
                descriptionEn: '',
                features: []
            });
        }
    }, [plan, open]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>{plan ? `تعديل خطة ${plan.name}` : 'إضافة خطة جديدة'}</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} md={6}>
                        <TextField fullWidth label="نوع الخطة (Plan Type)" name="planType" value={formData.planType} onChange={handleChange} disabled={!!plan} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField fullWidth label="الاسم (العربية)" name="name" value={formData.name} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField fullWidth label="الاسم (English)" name="nameEn" value={formData.nameEn} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField fullWidth label="السعر" name="price" type="number" value={formData.price} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField fullWidth label="وصف الخطة" name="description" multiline rows={2} value={formData.description} onChange={handleChange} />
                    </Grid>
                    {/* Add more fields as needed */}
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>إلغاء</Button>
                <Button variant="contained" onClick={() => onSave(formData)}>حفظ</Button>
            </DialogActions>
        </Dialog>
    );
};

export default SubscriptionCenter;
