import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    CircularProgress,
    Typography,
    Grid,
    Switch,
    FormControlLabel,
    MenuItem,
    Select,
    InputLabel,
    FormControl
} from '@mui/material';
import { Storefront as StoreIcon, AccessTime as TimeIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { apiClient as api } from '../../services/apiClient';

interface BusinessProfileDialogProps {
    open: boolean;
    onClose: () => void;
    sessionId: string;
}

interface BusinessProfile {
    address: string;
    description: string;
    email: string;
    website: string[];
    category: string;
}

interface BusinessHours {
    day_of_week: string;
    open_time?: string;
    close_time?: string;
    is_open: boolean;
}

const DAYS = [
    { value: 'SUN', label: 'الأحد' },
    { value: 'MON', label: 'الاثنين' },
    { value: 'TUE', label: 'الثلاثاء' },
    { value: 'WED', label: 'الأربعاء' },
    { value: 'THU', label: 'الخميس' },
    { value: 'FRI', label: 'الجمعة' },
    { value: 'SAT', label: 'السبت' },
];

const BusinessProfileDialog: React.FC<BusinessProfileDialogProps> = ({
    open,
    onClose,
    sessionId
}) => {
    const { enqueueSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState<BusinessProfile>({
        address: '',
        description: '',
        email: '',
        website: [''],
        category: ''
    });
    const [hours, setHours] = useState<BusinessHours[]>([]);

    useEffect(() => {
        if (open && sessionId) {
            fetchBusinessProfile();
            // fetchBusinessHours(); // Uncomment if backend supports it fully
        }
    }, [open, sessionId]);

    const fetchBusinessProfile = async () => {
        setLoading(true);
        try {
            const res = await api.get('/whatsapp/business/profile', { params: { sessionId } });
            if (res.data.profile) {
                setProfile({
                    ...res.data.profile,
                    website: res.data.profile.website || ['']
                });
            }
        } catch (error) {
            console.error('Error fetching business profile:', error);
            // enqueueSnackbar('فشل جلب ملف الأعمال', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async () => {
        setLoading(true);
        try {
            await api.post('/whatsapp/business/profile', {
                sessionId,
                ...profile
            });
            enqueueSnackbar('تم تحديث ملف الأعمال بنجاح', { variant: 'success' });
            onClose();
        } catch (error) {
            console.error('Error updating business profile:', error);
            enqueueSnackbar('فشل تحديث ملف الأعمال', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <StoreIcon color="primary" />
                    ملف النشاط التجاري
                </Box>
            </DialogTitle>
            <DialogContent dividers>
                {loading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="وصف النشاط التجاري"
                                multiline
                                rows={3}
                                value={profile.description}
                                onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="العنوان"
                                value={profile.address}
                                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="البريد الإلكتروني"
                                value={profile.email}
                                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="الموقع الإلكتروني"
                                value={profile.website[0]}
                                onChange={(e) => setProfile({ ...profile, website: [e.target.value] })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="الفئة (Category ID)"
                                value={profile.category}
                                onChange={(e) => setProfile({ ...profile, category: e.target.value })}
                                helperText="أدخل معرف الفئة (مثال: 123456)"
                            />
                        </Grid>
                    </Grid>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>إلغاء</Button>
                <Button
                    onClick={handleUpdateProfile}
                    variant="contained"
                    disabled={loading}
                >
                    حفظ التغييرات
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default BusinessProfileDialog;
