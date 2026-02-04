
import React, { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    CardActions,
    Grid,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControlLabel,
    Switch,
    Chip,
    IconButton
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Palette as PaletteIcon,
    Check as CheckIcon
} from '@mui/icons-material';

// Define Theme Interface
export interface ThemeConfig {
    id: string;
    name: string;
    description: string;
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    fontFamily: string;
    borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
    layoutType: 'default' | 'minimal' | 'modern'; // New field for layout selection
    isActive: boolean; // Available to stores
}

const SuperAdminThemes: React.FC = () => {
    // Mock Data
    const [themes, setThemes] = useState<ThemeConfig[]>([
        {
            id: '1',
            name: 'الافتراضي (Default)',
            description: 'الثيم الافتراضي للمنصة، بسيط وعملي.',
            primaryColor: '#3b82f6',
            secondaryColor: '#1e40af',
            backgroundColor: '#ffffff',
            textColor: '#1f2937',
            fontFamily: 'Inter',
            borderRadius: 'md',
            layoutType: 'default',
            isActive: true,
        },
        {
            id: '2',
            name: 'ليلي أنيق (Dark Elegant)',
            description: 'ثيم داكن يناسب المتاجر التقنية والحديثة.',
            primaryColor: '#8b5cf6',
            secondaryColor: '#6d28d9',
            backgroundColor: '#111827',
            textColor: '#f9fafb',
            fontFamily: 'Roboto',
            borderRadius: 'lg',
            layoutType: 'modern',
            isActive: true,
        },
        {
            id: '3',
            name: 'طبيعة (Nature)',
            description: 'ألوان مستوحاة من الطبيعة، أخضر وهادئ.',
            primaryColor: '#10b981',
            secondaryColor: '#059669',
            backgroundColor: '#f0fdf4',
            textColor: '#064e3b',
            fontFamily: 'Cairo',
            borderRadius: 'sm',
            layoutType: 'minimal',
            isActive: true,
        }
    ]);

    const [openDialog, setOpenDialog] = useState(false);
    const [currentTheme, setCurrentTheme] = useState<ThemeConfig | null>(null);
    const [editMode, setEditMode] = useState(false);

    // Form State
    const [formData, setFormData] = useState<ThemeConfig>({
        id: '',
        name: '',
        description: '',
        primaryColor: '#000000',
        secondaryColor: '#000000',
        backgroundColor: '#ffffff',
        textColor: '#000000',
        fontFamily: 'Cairo',
        borderRadius: 'md',
        layoutType: 'default',
        isActive: false,
    });

    const handleOpenDialog = (theme?: ThemeConfig) => {
        if (theme) {
            setEditMode(true);
            setCurrentTheme(theme);
            setFormData(theme);
        } else {
            setEditMode(false);
            setCurrentTheme(null);
            setFormData({
                id: Date.now().toString(),
                name: '',
                description: '',
                primaryColor: '#3b82f6',
                secondaryColor: '#1e40af',
                backgroundColor: '#ffffff',
                textColor: '#1f2937',
                fontFamily: 'Cairo',
                borderRadius: 'md',
                layoutType: 'default',
                isActive: true,
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, checked, type } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value,
        });
    };

    const handleSave = () => {
        if (editMode && currentTheme) {
            setThemes(themes.map(t => t.id === currentTheme.id ? formData : t));
        } else {
            setThemes([...themes, formData]);
        }
        handleCloseDialog();
    };

    const handleDelete = (id: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذا الثيم؟')) {
            setThemes(themes.filter(t => t.id !== id));
        }
    };

    const handleToggleActive = (id: string) => {
        setThemes(themes.map(t =>
            t.id === id ? { ...t, isActive: !t.isActive } : t
        ));
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h4" component="h1">
                    إدارة الثيمات
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    إضافة ثيم جديد
                </Button>
            </Box>

            <Grid container spacing={3}>
                {themes.map((theme) => (
                    <Grid item xs={12} sm={6} md={4} key={theme.id}>
                        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                            {!theme.isActive && (
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        top: 10,
                                        left: 10,
                                        bgcolor: 'rgba(0,0,0,0.6)',
                                        color: 'white',
                                        px: 1,
                                        borderRadius: 1,
                                        fontSize: '0.75rem'
                                    }}
                                >
                                    غير مفعل
                                </Box>
                            )}
                            <Box sx={{ p: 2, bgcolor: theme.backgroundColor, borderBottom: '1px solid #eee', height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Box sx={{ textAlign: 'center' }}>
                                    <Typography style={{ color: theme.textColor, fontFamily: theme.fontFamily }} variant="h6">
                                        {theme.name}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1, mt: 1, justifyContent: 'center' }}>
                                        <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: theme.primaryColor, border: '1px solid rgba(0,0,0,0.1)' }} title="Primary Color" />
                                        <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: theme.secondaryColor, border: '1px solid rgba(0,0,0,0.1)' }} title="Secondary Color" />
                                    </Box>
                                </Box>
                            </Box>
                            <CardContent sx={{ flexGrow: 1 }}>
                                <Typography gutterBottom variant="h6" component="div">
                                    {theme.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {theme.description}
                                </Typography>
                                <Box sx={{ mt: 2 }}>
                                    <Chip label={theme.fontFamily} size="small" icon={<PaletteIcon />} sx={{ mr: 1 }} />
                                    <Chip label={`Layout: ${theme.layoutType}`} size="small" color="secondary" variant="outlined" sx={{ mr: 1 }} />
                                    <Chip label={`Radius: ${theme.borderRadius}`} size="small" />
                                </Box>
                            </CardContent>
                            <CardActions>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={theme.isActive}
                                            onChange={() => handleToggleActive(theme.id)}
                                            color="primary"
                                        />
                                    }
                                    label={theme.isActive ? "مفعل للمتاجر" : "غير مفعل"}
                                    sx={{ mr: 'auto' }}
                                />
                                <IconButton color="primary" onClick={() => handleOpenDialog(theme)}>
                                    <EditIcon />
                                </IconButton>
                                <IconButton color="error" onClick={() => handleDelete(theme.id)}>
                                    <DeleteIcon />
                                </IconButton>
                            </CardActions>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Add/Edit Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>{editMode ? 'تعديل الثيم' : 'إضافة ثيم جديد'}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            label="اسم الثيم"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            fullWidth
                        />
                        <TextField
                            label="الوصف"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            fullWidth
                            multiline
                            rows={2}
                        />
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <TextField
                                    label="نوع التصميم (Layout Type)"
                                    name="layoutType"
                                    value={formData.layoutType}
                                    onChange={handleChange}
                                    select
                                    SelectProps={{ native: true }}
                                    fullWidth
                                    helperText="يحدد هيكل الصفحة وتوزيع العناصر"
                                >
                                    <option value="default">الافتراضي (Standard)</option>
                                    <option value="minimal">بسيط (Minimalist)</option>
                                    <option value="modern">عصري (Modern)</option>
                                </TextField>
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    label="اللون الأساسي"
                                    name="primaryColor"
                                    type="color"
                                    value={formData.primaryColor}
                                    onChange={handleChange}
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    label="اللون الثانوي"
                                    name="secondaryColor"
                                    type="color"
                                    value={formData.secondaryColor}
                                    onChange={handleChange}
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    label="لون الخلفية"
                                    name="backgroundColor"
                                    type="color"
                                    value={formData.backgroundColor}
                                    onChange={handleChange}
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    label="لون النص"
                                    name="textColor"
                                    type="color"
                                    value={formData.textColor}
                                    onChange={handleChange}
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                        </Grid>
                        <TextField
                            label="نوع الخط (Font Family)"
                            name="fontFamily"
                            value={formData.fontFamily}
                            onChange={handleChange}
                            fullWidth
                            helperText="e.g., Cairo, Inter, Roboto, Tajawal"
                        />
                        <TextField
                            label="حواف العناصر (Border Radius)"
                            name="borderRadius"
                            value={formData.borderRadius}
                            onChange={handleChange}
                            select
                            SelectProps={{ native: true }}
                            fullWidth
                        >
                            <option value="none">بدون حواف (None)</option>
                            <option value="sm">صغيرة (Small)</option>
                            <option value="md">متوسطة (Medium)</option>
                            <option value="lg">كبيرة (Large)</option>
                            <option value="full">دائرية (Full)</option>
                        </TextField>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={formData.isActive}
                                    onChange={handleChange}
                                    name="isActive"
                                />
                            }
                            label="تفعيل وإتاحة الثيم للمتاجر فوراً"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>إلغاء</Button>
                    <Button onClick={handleSave} variant="contained" color="primary">
                        حفظ
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default SuperAdminThemes;
