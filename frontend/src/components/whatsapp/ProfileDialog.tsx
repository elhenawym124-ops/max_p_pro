
import React, { useState, useRef } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Avatar,
    IconButton,
    Typography,
    CircularProgress
} from '@mui/material';
import { PhotoCamera as PhotoCameraIcon, Sync as SyncIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { apiClient as api } from '../../services/apiClient';

interface ProfileDialogProps {
    open: boolean;
    onClose: () => void;
    sessionId: string;
    currentName?: string;
    currentStatus?: string;
    currentPicture?: string;
}

const ProfileDialog: React.FC<ProfileDialogProps> = ({
    open,
    onClose,
    sessionId,
    currentName,
    currentStatus,
    currentPicture
}) => {
    const { enqueueSnackbar } = useSnackbar();
    const [name, setName] = useState(currentName || '');
    const [status, setStatus] = useState(currentStatus || '');
    const [pictureFile, setPictureFile] = useState<File | null>(null);
    const [picturePreview, setPicturePreview] = useState<string | null>(currentPicture || null);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (currentName) setName(currentName);
        if (currentStatus) setStatus(currentStatus);
        if (currentPicture) setPicturePreview(currentPicture);
    }, [currentName, currentStatus, currentPicture]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            setPictureFile(file);
            setPicturePreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('sessionId', sessionId);
            if (name !== currentName) formData.append('name', name);
            if (status !== currentStatus) formData.append('status', status);
            if (pictureFile) formData.append('picture', pictureFile);

            await api.post('/whatsapp/profile/update', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            enqueueSnackbar('تم تحديث الملف الشخصي بنجاح', { variant: 'success' });
            onClose();
        } catch (error) {
            console.error('Error updating profile:', error);
            enqueueSnackbar('فشل تحديث الملف الشخصي', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        setLoading(true);
        try {
            const response = await api.post('/whatsapp/profile/sync', { sessionId });
            const { profile } = response.data;

            if (profile) {
                setName(profile.name || '');
                setStatus(profile.status || '');
                setPicturePreview(profile.profilePicUrl || null);
                enqueueSnackbar('تمت مزامنة البيانات من واتساب بنجاح', { variant: 'success' });
            }
        } catch (error) {
            console.error('Error syncing profile:', error);
            enqueueSnackbar('فشل مزامنة البيانات من واتساب', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>تحديث الملف الشخصي</DialogTitle>
            <DialogContent dividers>
                <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
                    <Box position="relative">
                        <Avatar
                            src={picturePreview || ''}
                            sx={{ width: 120, height: 120, mb: 2 }}
                        />
                        <IconButton
                            color="primary"
                            aria-label="upload picture"
                            component="span"
                            sx={{ position: 'absolute', bottom: 10, right: 0, bgcolor: 'background.paper' }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <PhotoCameraIcon />
                        </IconButton>
                        <input
                            type="file"
                            hidden
                            ref={fileInputRef}
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                        اضغط على الكاميرا لتغيير الصورة
                    </Typography>
                </Box>

                <TextField
                    fullWidth
                    label="الاسم"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    margin="normal"
                    helperText="الاسم الذي يظهر للآخرين (Push Name)"
                />

                <TextField
                    fullWidth
                    label="الحالة (About)"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    margin="normal"
                    multiline
                    rows={2}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleSync} startIcon={<SyncIcon />} disabled={loading} color="info">
                    مزامنة من واتساب
                </Button>
                <Box flexGrow={1} />
                <Button onClick={onClose}>إلغاء</Button>
                <Button onClick={handleSave} variant="contained" disabled={loading}>
                    {loading ? <CircularProgress size={24} /> : 'حفظ'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ProfileDialog;
