import React, { useState, useEffect } from 'react';
import { Box, Button, Card, CardContent, Typography, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, Chip, IconButton, Alert, Switch, FormControlLabel } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Cancel as CancelIcon, Schedule as ScheduleIcon } from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import axios from 'axios';
import { ar } from 'date-fns/locale';

const TelegramScheduler = () => {
    const [scheduledMessages, setScheduledMessages] = useState([]);
    const [userbots, setUserbots] = useState([]);
    const [dialogs, setDialogs] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        userbotConfigId: '',
        chatId: '',
        message: '',
        scheduledTime: new Date(Date.now() + 3600000),
        recurring: false,
        recurringPattern: 'DAILY'
    });

    useEffect(() => {
        fetchUserbots();
        fetchScheduledMessages();
    }, []);

    const fetchUserbots = async () => {
        try {
            const response = await axios.get('/api/v1/telegram/userbots');
            setUserbots(response.data.data || []);
        } catch (error) {
            console.error('Error fetching userbots:', error);
        }
    };

    const fetchScheduledMessages = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/v1/telegram-advanced/scheduled-messages');
            setScheduledMessages(response.data.data || []);
        } catch (error) {
            console.error('Error fetching scheduled messages:', error);
            setError('فشل تحميل الرسائل المجدولة');
        } finally {
            setLoading(false);
        }
    };

    const fetchDialogs = async (userbotConfigId) => {
        if (!userbotConfigId) return;
        try {
            const response = await axios.get(`/api/v1/telegram/userbot/${userbotConfigId}/dialogs`);
            setDialogs(response.data.data || []);
        } catch (error) {
            console.error('Error fetching dialogs:', error);
        }
    };

    const handleOpenDialog = () => {
        setFormData({
            userbotConfigId: userbots[0]?.id || '',
            chatId: '',
            message: '',
            scheduledTime: new Date(Date.now() + 3600000),
            recurring: false,
            recurringPattern: 'DAILY'
        });
        if (userbots[0]?.id) {
            fetchDialogs(userbots[0].id);
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
    };

    const handleUserbotChange = (userbotConfigId) => {
        setFormData({ ...formData, userbotConfigId, chatId: '' });
        fetchDialogs(userbotConfigId);
    };

    const handleSchedule = async () => {
        if (!formData.userbotConfigId || !formData.chatId || !formData.message) {
            setError('يرجى ملء جميع الحقول المطلوبة');
            return;
        }

        setLoading(true);
        try {
            await axios.post('/api/v1/telegram-advanced/scheduled-messages', formData);
            fetchScheduledMessages();
            handleCloseDialog();
        } catch (error) {
            console.error('Error scheduling message:', error);
            setError('فشل جدولة الرسالة');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (messageId) => {
        if (!window.confirm('هل أنت متأكد من إلغاء هذه الرسالة المجدولة؟')) return;

        setLoading(true);
        try {
            await axios.post(`/api/v1/telegram-advanced/scheduled-messages/${messageId}/cancel`);
            fetchScheduledMessages();
        } catch (error) {
            console.error('Error cancelling message:', error);
            setError('فشل إلغاء الرسالة');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'SENT': return 'success';
            case 'PENDING': return 'warning';
            case 'FAILED': return 'error';
            case 'CANCELLED': return 'default';
            default: return 'info';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'PENDING': return 'قيد الانتظار';
            case 'SENT': return 'تم الإرسال';
            case 'FAILED': return 'فشل';
            case 'CANCELLED': return 'ملغي';
            default: return status;
        }
    };

    const getRecurringLabel = (pattern) => {
        switch (pattern) {
            case 'DAILY': return 'يومي';
            case 'WEEKLY': return 'أسبوعي';
            case 'MONTHLY': return 'شهري';
            default: return pattern;
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">⏰ جدولة الرسائل</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleOpenDialog}
                    disabled={userbots.length === 0}
                >
                    جدولة رسالة
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <Box sx={{ display: 'grid', gap: 2 }}>
                {scheduledMessages.map((msg) => (
                    <Card key={msg.id}>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <Box sx={{ flex: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <ScheduleIcon color="action" />
                                        <Typography variant="h6">
                                            {new Date(msg.scheduledTime).toLocaleString('ar-EG')}
                                        </Typography>
                                        <Chip
                                            label={getStatusLabel(msg.status)}
                                            color={getStatusColor(msg.status)}
                                            size="small"
                                        />
                                        {msg.recurring && (
                                            <Chip
                                                label={`🔄 ${getRecurringLabel(msg.recurringPattern)}`}
                                                size="small"
                                                color="info"
                                            />
                                        )}
                                    </Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        <strong>المحادثة:</strong> {msg.chatId}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {msg.message.substring(0, 150)}{msg.message.length > 150 ? '...' : ''}
                                    </Typography>
                                    {msg.status === 'FAILED' && msg.error && (
                                        <Alert severity="error" sx={{ mt: 1 }}>
                                            {msg.error}
                                        </Alert>
                                    )}
                                </Box>
                                <Box>
                                    {msg.status === 'PENDING' && (
                                        <IconButton
                                            color="error"
                                            onClick={() => handleCancel(msg.id)}
                                            disabled={loading}
                                        >
                                            <CancelIcon />
                                        </IconButton>
                                    )}
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                ))}

                {scheduledMessages.length === 0 && !loading && (
                    <Card>
                        <CardContent>
                            <Typography variant="body1" color="text.secondary" textAlign="center">
                                لا توجد رسائل مجدولة. انقر على "جدولة رسالة" للبدء.
                            </Typography>
                        </CardContent>
                    </Card>
                )}
            </Box>

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>⏰ جدولة رسالة جديدة</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <FormControl fullWidth>
                            <InputLabel>اختر Userbot</InputLabel>
                            <Select
                                value={formData.userbotConfigId}
                                onChange={(e) => handleUserbotChange(e.target.value)}
                                label="اختر Userbot"
                            >
                                {userbots.map((bot) => (
                                    <MenuItem key={bot.id} value={bot.id}>
                                        {bot.label} ({bot.clientPhone || 'غير متصل'})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth disabled={!formData.userbotConfigId}>
                            <InputLabel>اختر المحادثة</InputLabel>
                            <Select
                                value={formData.chatId}
                                onChange={(e) => setFormData({ ...formData, chatId: e.target.value })}
                                label="اختر المحادثة"
                            >
                                {dialogs.map((dialog) => (
                                    <MenuItem key={dialog.id} value={dialog.id}>
                                        {dialog.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            label="الرسالة"
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            fullWidth
                            required
                            multiline
                            rows={6}
                        />

                        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ar}>
                            <DateTimePicker
                                label="وقت الإرسال"
                                value={formData.scheduledTime}
                                onChange={(newValue) => setFormData({ ...formData, scheduledTime: newValue })}
                                minDateTime={new Date()}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        required: true
                                    }
                                }}
                            />
                        </LocalizationProvider>

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={formData.recurring}
                                    onChange={(e) => setFormData({ ...formData, recurring: e.target.checked })}
                                />
                            }
                            label="رسالة متكررة"
                        />

                        {formData.recurring && (
                            <FormControl fullWidth>
                                <InputLabel>نمط التكرار</InputLabel>
                                <Select
                                    value={formData.recurringPattern}
                                    onChange={(e) => setFormData({ ...formData, recurringPattern: e.target.value })}
                                    label="نمط التكرار"
                                >
                                    <MenuItem value="DAILY">يومي</MenuItem>
                                    <MenuItem value="WEEKLY">أسبوعي</MenuItem>
                                    <MenuItem value="MONTHLY">شهري</MenuItem>
                                </Select>
                            </FormControl>
                        )}

                        <Alert severity="info">
                            💡 سيتم إرسال الرسالة تلقائياً في الوقت المحدد
                        </Alert>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>إلغاء</Button>
                    <Button
                        onClick={handleSchedule}
                        variant="contained"
                        startIcon={<ScheduleIcon />}
                        disabled={loading}
                    >
                        {loading ? 'جاري الجدولة...' : 'جدولة'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TelegramScheduler;
