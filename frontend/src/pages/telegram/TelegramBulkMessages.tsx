import React, { useState, useEffect } from 'react';
import { Box, Button, Card, CardContent, Typography, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, Chip, LinearProgress, Alert, List, ListItem, ListItemText } from '@mui/material';
import { Add as AddIcon, Send as SendIcon, Cancel as CancelIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import axios from 'axios';

const TelegramBulkMessages = () => {
    const [bulkMessages, setBulkMessages] = useState([]);
    const [userbots, setUserbots] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
    const [selectedBulkMessage, setSelectedBulkMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        userbotConfigId: '',
        name: '',
        message: '',
        recipients: [],
        delayBetweenMessages: 2000
    });

    useEffect(() => {
        fetchUserbots();
        fetchBulkMessages();
        fetchContacts();
    }, []);

    const fetchUserbots = async () => {
        try {
            const response = await axios.get('/api/v1/telegram/userbots');
            setUserbots(response.data.data || []);
        } catch (error) {
            console.error('Error fetching userbots:', error);
        }
    };

    const fetchBulkMessages = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/v1/telegram-advanced/bulk-messages');
            setBulkMessages(response.data.data || []);
        } catch (error) {
            console.error('Error fetching bulk messages:', error);
            setError('فشل تحميل الرسائل الجماعية');
        } finally {
            setLoading(false);
        }
    };

    const fetchContacts = async () => {
        try {
            const response = await axios.get('/api/v1/telegram-advanced/contacts');
            setContacts(response.data.data || []);
        } catch (error) {
            console.error('Error fetching contacts:', error);
        }
    };

    const handleOpenDialog = () => {
        setFormData({
            userbotConfigId: userbots[0]?.id || '',
            name: '',
            message: '',
            recipients: [],
            delayBetweenMessages: 2000
        });
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
    };

    const handleSend = async () => {
        if (!formData.userbotConfigId || !formData.message || formData.recipients.length === 0) {
            setError('يرجى ملء جميع الحقول المطلوبة');
            return;
        }

        setLoading(true);
        try {
            await axios.post('/api/v1/telegram-advanced/bulk-messages', formData);
            fetchBulkMessages();
            handleCloseDialog();
        } catch (error) {
            console.error('Error sending bulk message:', error);
            setError('فشل إرسال الرسالة الجماعية');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = async (bulkMessage) => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/v1/telegram-advanced/bulk-messages/${bulkMessage.id}`);
            setSelectedBulkMessage(response.data.data);
            setOpenDetailsDialog(true);
        } catch (error) {
            console.error('Error fetching details:', error);
            setError('فشل تحميل التفاصيل');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (bulkMessageId) => {
        if (!window.confirm('هل أنت متأكد من إلغاء هذه الحملة؟')) return;

        setLoading(true);
        try {
            await axios.post(`/api/v1/telegram-advanced/bulk-messages/${bulkMessageId}/cancel`);
            fetchBulkMessages();
        } catch (error) {
            console.error('Error cancelling bulk message:', error);
            setError('فشل إلغاء الحملة');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'COMPLETED': return 'success';
            case 'IN_PROGRESS': return 'info';
            case 'FAILED': return 'error';
            case 'CANCELLED': return 'default';
            default: return 'warning';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'PENDING': return 'قيد الانتظار';
            case 'IN_PROGRESS': return 'جاري الإرسال';
            case 'COMPLETED': return 'مكتمل';
            case 'FAILED': return 'فشل';
            case 'CANCELLED': return 'ملغي';
            default: return status;
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">📨 الرسائل الجماعية</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleOpenDialog}
                    disabled={userbots.length === 0}
                >
                    حملة جديدة
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <Box sx={{ display: 'grid', gap: 2 }}>
                {bulkMessages.map((bulk) => (
                    <Card key={bulk.id}>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                                <Box sx={{ flex: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <Typography variant="h6">{bulk.name}</Typography>
                                        <Chip
                                            label={getStatusLabel(bulk.status)}
                                            color={getStatusColor(bulk.status)}
                                            size="small"
                                        />
                                    </Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        {bulk.message.substring(0, 100)}{bulk.message.length > 100 ? '...' : ''}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        📊 {bulk.sentCount} / {bulk.totalRecipients} تم الإرسال
                                        {bulk.failedCount > 0 && ` • ❌ ${bulk.failedCount} فشل`}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button
                                        size="small"
                                        startIcon={<VisibilityIcon />}
                                        onClick={() => handleViewDetails(bulk)}
                                    >
                                        التفاصيل
                                    </Button>
                                    {bulk.status === 'IN_PROGRESS' && (
                                        <Button
                                            size="small"
                                            color="error"
                                            startIcon={<CancelIcon />}
                                            onClick={() => handleCancel(bulk.id)}
                                        >
                                            إلغاء
                                        </Button>
                                    )}
                                </Box>
                            </Box>
                            {bulk.status === 'IN_PROGRESS' && (
                                <LinearProgress
                                    variant="determinate"
                                    value={(bulk.sentCount / bulk.totalRecipients) * 100}
                                />
                            )}
                        </CardContent>
                    </Card>
                ))}

                {bulkMessages.length === 0 && !loading && (
                    <Card>
                        <CardContent>
                            <Typography variant="body1" color="text.secondary" textAlign="center">
                                لا توجد حملات رسائل جماعية. انقر على "حملة جديدة" للبدء.
                            </Typography>
                        </CardContent>
                    </Card>
                )}
            </Box>

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>📨 حملة رسائل جماعية جديدة</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <FormControl fullWidth>
                            <InputLabel>اختر Userbot</InputLabel>
                            <Select
                                value={formData.userbotConfigId}
                                onChange={(e) => setFormData({ ...formData, userbotConfigId: e.target.value })}
                                label="اختر Userbot"
                            >
                                {userbots.map((bot) => (
                                    <MenuItem key={bot.id} value={bot.id}>
                                        {bot.label} ({bot.clientPhone || 'غير متصل'})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            label="اسم الحملة"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            fullWidth
                            required
                        />

                        <TextField
                            label="الرسالة"
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            fullWidth
                            required
                            multiline
                            rows={6}
                            helperText={`${formData.message.length} حرف`}
                        />

                        <FormControl fullWidth>
                            <InputLabel>المستلمون</InputLabel>
                            <Select
                                multiple
                                value={formData.recipients}
                                onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                                label="المستلمون"
                                renderValue={(selected) => `${selected.length} مستلم`}
                            >
                                {contacts.map((contact) => (
                                    <MenuItem key={contact.id} value={contact.telegramId}>
                                        {contact.firstName} {contact.lastName} {contact.username ? `(@${contact.username})` : ''}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            label="التأخير بين الرسائل (ميلي ثانية)"
                            type="number"
                            value={formData.delayBetweenMessages}
                            onChange={(e) => setFormData({ ...formData, delayBetweenMessages: parseInt(e.target.value) })}
                            fullWidth
                            helperText="الحد الأدنى: 2000 (ثانيتين) لتجنب الحظر"
                        />

                        <Alert severity="warning">
                            ⚠️ تأكد من عدم إرسال رسائل سبام. قد يؤدي الإرسال المفرط إلى حظر حسابك.
                        </Alert>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>إلغاء</Button>
                    <Button
                        onClick={handleSend}
                        variant="contained"
                        startIcon={<SendIcon />}
                        disabled={loading || formData.recipients.length === 0}
                    >
                        {loading ? 'جاري الإرسال...' : `إرسال (${formData.recipients.length})`}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openDetailsDialog} onClose={() => setOpenDetailsDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>تفاصيل الحملة</DialogTitle>
                <DialogContent>
                    {selectedBulkMessage && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="h6" gutterBottom>
                                {selectedBulkMessage.bulkMessage?.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                {selectedBulkMessage.bulkMessage?.message}
                            </Typography>
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2">الإحصائيات:</Typography>
                                <Typography variant="body2">
                                    ✅ تم الإرسال: {selectedBulkMessage.bulkMessage?.sentCount}
                                </Typography>
                                <Typography variant="body2">
                                    ❌ فشل: {selectedBulkMessage.bulkMessage?.failedCount}
                                </Typography>
                                <Typography variant="body2">
                                    📊 الإجمالي: {selectedBulkMessage.bulkMessage?.totalRecipients}
                                </Typography>
                            </Box>
                            <Typography variant="subtitle2" gutterBottom>
                                سجل الإرسال:
                            </Typography>
                            <List dense>
                                {selectedBulkMessage.logs?.slice(0, 20).map((log) => (
                                    <ListItem key={log.id}>
                                        <ListItemText
                                            primary={log.recipient}
                                            secondary={
                                                log.status === 'SENT'
                                                    ? `✅ تم الإرسال في ${new Date(log.sentAt).toLocaleString('ar-EG')}`
                                                    : `❌ فشل: ${log.error}`
                                            }
                                        />
                                    </ListItem>
                                ))}
                            </List>
                            {selectedBulkMessage.logs?.length > 20 && (
                                <Typography variant="body2" color="text.secondary" textAlign="center">
                                    ... و {selectedBulkMessage.logs.length - 20} آخرين
                                </Typography>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDetailsDialog(false)}>إغلاق</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TelegramBulkMessages;
