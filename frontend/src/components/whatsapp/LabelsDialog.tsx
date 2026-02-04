import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    TextField, List, ListItem, ListItemText, ListItemSecondaryAction,
    IconButton, Box, Typography, Chip, CircularProgress
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon, Label as LabelIcon } from '@mui/icons-material';
import { apiClient as api } from '../../services/apiClient';
import { useSnackbar } from 'notistack';

interface Label {
    id: string;
    name: string;
    color: string;
}

interface LabelsDialogProps {
    open: boolean;
    onClose: () => void;
    sessionId: string;
    contactJid?: string; // If provided, we are assigning labels to this contact
    initialLabels?: string[]; // IDs of labels currently assigned to the contact
    onLabelsUpdated?: () => void;
}

const COLORS = [
    '#FF5722', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
    '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50',
    '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800'
];

const LabelsDialog: React.FC<LabelsDialogProps> = ({
    open, onClose, sessionId, contactJid, initialLabels = [], onLabelsUpdated
}) => {
    const { enqueueSnackbar } = useSnackbar();
    const [labels, setLabels] = useState<Label[]>([]);
    const [loading, setLoading] = useState(false);
    const [newLabelName, setNewLabelName] = useState('');
    const [selectedColor, setSelectedColor] = useState(COLORS[0]);
    const [assignedLabels, setAssignedLabels] = useState<string[]>(initialLabels);

    useEffect(() => {
        if (open && sessionId) {
            loadLabels();
            setAssignedLabels(initialLabels);
        }
    }, [open, sessionId, initialLabels]);

    const loadLabels = async () => {
        setLoading(true);
        try {
            const res = await api.get('/whatsapp/labels', { params: { sessionId } });
            setLabels(res.data.labels || []);
        } catch (error) {
            console.error('Error loading labels:', error);
            enqueueSnackbar('فشل تحميل التصنيفات', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleCreateLabel = async () => {
        if (!newLabelName.trim()) return;
        try {
            await api.post('/whatsapp/labels', {
                sessionId,
                name: newLabelName,
                color: selectedColor
            });
            enqueueSnackbar('تم إنشاء التصنيف', { variant: 'success' });
            setNewLabelName('');
            loadLabels();
        } catch (error) {
            enqueueSnackbar('فشل إنشاء التصنيف', { variant: 'error' });
        }
    };

    const handleDeleteLabel = async (labelId: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا التصنيف؟')) return;
        try {
            await api.delete(`/whatsapp/labels/${labelId}`, { data: { sessionId } });
            enqueueSnackbar('تم حذف التصنيف', { variant: 'success' });
            loadLabels();
        } catch (error) {
            enqueueSnackbar('فشل حذف التصنيف', { variant: 'error' });
        }
    };

    const toggleLabelAssignment = async (labelId: string) => {
        if (!contactJid) return;

        const isAssigned = assignedLabels.includes(labelId);
        const newAssigned = isAssigned
            ? assignedLabels.filter(id => id !== labelId)
            : [...assignedLabels, labelId];

        setAssignedLabels(newAssigned);

        try {
            if (isAssigned) {
                // Remove label
                await api.delete(`/whatsapp/labels/${labelId}/chat/${contactJid}`, { data: { sessionId } });
            } else {
                // Add label
                await api.post(`/whatsapp/labels/${labelId}/chat/${contactJid}`, { sessionId });
            }
            if (onLabelsUpdated) onLabelsUpdated();
        } catch (error) {
            enqueueSnackbar('فشل تحديث التصنيف للمحادثة', { variant: 'error' });
            // Revert state on error
            setAssignedLabels(isAssigned ? [...assignedLabels, labelId] : assignedLabels.filter(id => id !== labelId));
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {contactJid ? 'إدارة تصنيفات المحادثة' : 'إدارة التصنيفات'}
            </DialogTitle>
            <DialogContent dividers>
                {/* Create New Label */}
                <Box sx={{ mb: 3, display: 'flex', gap: 1, alignItems: 'center' }}>
                    <TextField
                        size="small"
                        label="اسم التصنيف الجديد"
                        value={newLabelName}
                        onChange={(e) => setNewLabelName(e.target.value)}
                        fullWidth
                    />
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {COLORS.slice(0, 5).map(color => (
                            <Box
                                key={color}
                                onClick={() => setSelectedColor(color)}
                                sx={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: '50%',
                                    bgcolor: color,
                                    cursor: 'pointer',
                                    border: selectedColor === color ? '2px solid black' : 'none'
                                }}
                            />
                        ))}
                    </Box>
                    <Button variant="contained" onClick={handleCreateLabel} disabled={!newLabelName.trim()}>
                        إضافة
                    </Button>
                </Box>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <List>
                        {labels.length === 0 ? (
                            <Typography align="center" color="text.secondary">لا توجد تصنيفات</Typography>
                        ) : (
                            labels.map((label) => (
                                <ListItem key={label.id} button={!!contactJid} onClick={() => contactJid && toggleLabelAssignment(label.id)}>
                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <LabelIcon sx={{ color: label.color }} />
                                                {label.name}
                                            </Box>
                                        }
                                    />
                                    <ListItemSecondaryAction>
                                        {contactJid && assignedLabels.includes(label.id) && (
                                            <CheckIcon color="primary" sx={{ mr: 1 }} />
                                        )}
                                        <IconButton edge="end" onClick={() => handleDeleteLabel(label.id)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            ))
                        )}
                    </List>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>إغلاق</Button>
            </DialogActions>
        </Dialog>
    );
};

// Helper icon for check
import { Check as CheckIcon } from '@mui/icons-material';

export default LabelsDialog;
