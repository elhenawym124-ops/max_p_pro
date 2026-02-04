import React, { useState, useEffect } from 'react';
import { Box, Button, Card, CardContent, Typography, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, Switch, FormControlLabel, Chip, IconButton, Alert } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, PlayArrow as PlayIcon, Stop as StopIcon } from '@mui/icons-material';
import axios from 'axios';

const TelegramAutoReply = () => {
    const [rules, setRules] = useState([]);
    const [userbots, setUserbots] = useState([]);
    const [selectedUserbot, setSelectedUserbot] = useState('');
    const [openDialog, setOpenDialog] = useState(false);
    const [editingRule, setEditingRule] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        triggerType: 'KEYWORD',
        triggerValue: '',
        response: '',
        workingHoursOnly: false,
        startTime: '09:00',
        endTime: '17:00',
        daysOfWeek: [],
        priority: 0
    });

    useEffect(() => {
        fetchUserbots();
    }, []);

    useEffect(() => {
        if (selectedUserbot) {
            fetchRules();
        }
    }, [selectedUserbot]);

    const fetchUserbots = async () => {
        try {
            const response = await axios.get('/api/v1/telegram/userbots');
            setUserbots(response.data.data || []);
            if (response.data.data?.length > 0) {
                setSelectedUserbot(response.data.data[0].id);
            }
        } catch (error) {
            console.error('Error fetching userbots:', error);
            setError('فشل تحميل قائمة الـ Userbots');
        }
    };

    const fetchRules = async () => {
        if (!selectedUserbot) return;
        setLoading(true);
        try {
            const response = await axios.get(`/api/v1/telegram-advanced/auto-reply/${selectedUserbot}`);
            setRules(response.data.data || []);
        } catch (error) {
            console.error('Error fetching rules:', error);
            setError('فشل تحميل قواعد الرد التلقائي');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (rule = null) => {
        if (rule) {
            setEditingRule(rule);
            setFormData({
                name: rule.name,
                triggerType: rule.triggerType,
                triggerValue: rule.triggerValue,
                response: rule.response,
                workingHoursOnly: rule.workingHoursOnly,
                startTime: rule.startTime || '09:00',
                endTime: rule.endTime || '17:00',
                daysOfWeek: rule.daysOfWeek || [],
                priority: rule.priority || 0
            });
        } else {
            setEditingRule(null);
            setFormData({
                name: '',
                triggerType: 'KEYWORD',
                triggerValue: '',
                response: '',
                workingHoursOnly: false,
                startTime: '09:00',
                endTime: '17:00',
                daysOfWeek: [],
                priority: 0
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingRule(null);
    };

    const handleSave = async () => {
        if (!selectedUserbot) {
            setError('يرجى اختيار Userbot أولاً');
            return;
        }

        setLoading(true);
        try {
            if (editingRule) {
                await axios.put(`/api/v1/telegram-advanced/auto-reply/${editingRule.id}`, formData);
            } else {
                await axios.post(`/api/v1/telegram-advanced/auto-reply/${selectedUserbot}`, formData);
            }
            fetchRules();
            handleCloseDialog();
        } catch (error) {
            console.error('Error saving rule:', error);
            setError('فشل حفظ القاعدة');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (ruleId) => {
        if (!window.confirm('هل أنت متأكد من حذف هذه القاعدة؟')) return;

        setLoading(true);
        try {
            await axios.delete(`/api/v1/telegram-advanced/auto-reply/${ruleId}`);
            fetchRules();
        } catch (error) {
            console.error('Error deleting rule:', error);
            setError('فشل حذف القاعدة');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (rule) => {
        setLoading(true);
        try {
            await axios.put(`/api/v1/telegram-advanced/auto-reply/${rule.id}`, {
                isActive: !rule.isActive
            });
            fetchRules();
        } catch (error) {
            console.error('Error toggling rule:', error);
            setError('فشل تغيير حالة القاعدة');
        } finally {
            setLoading(false);
        }
    };

    const daysOfWeek = [
        { value: 0, label: 'الأحد' },
        { value: 1, label: 'الإثنين' },
        { value: 2, label: 'الثلاثاء' },
        { value: 3, label: 'الأربعاء' },
        { value: 4, label: 'الخميس' },
        { value: 5, label: 'الجمعة' },
        { value: 6, label: 'السبت' }
    ];

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">🤖 الرد التلقائي</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <FormControl sx={{ minWidth: 200 }}>
                        <InputLabel>اختر Userbot</InputLabel>
                        <Select
                            value={selectedUserbot}
                            onChange={(e) => setSelectedUserbot(e.target.value)}
                            label="اختر Userbot"
                        >
                            {userbots.map((bot) => (
                                <MenuItem key={bot.id} value={bot.id}>
                                    {bot.label} ({bot.clientPhone || 'غير متصل'})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog()}
                        disabled={!selectedUserbot}
                    >
                        إضافة قاعدة
                    </Button>
                </Box>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <Box sx={{ display: 'grid', gap: 2 }}>
                {rules.map((rule) => (
                    <Card key={rule.id}>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <Box sx={{ flex: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <Typography variant="h6">{rule.name}</Typography>
                                        <Chip
                                            label={rule.isActive ? 'نشط' : 'متوقف'}
                                            color={rule.isActive ? 'success' : 'default'}
                                            size="small"
                                        />
                                        <Chip label={`أولوية: ${rule.priority}`} size="small" />
                                    </Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        <strong>المحفز:</strong> {rule.triggerType === 'KEYWORD' ? 'كلمة مفتاحية' : rule.triggerType === 'REGEX' ? 'تعبير نمطي' : 'الكل'} - {rule.triggerValue}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        <strong>الرد:</strong> {rule.response}
                                    </Typography>
                                    {rule.workingHoursOnly && (
                                        <Typography variant="body2" color="text.secondary">
                                            ⏰ أوقات العمل فقط: {rule.startTime} - {rule.endTime}
                                        </Typography>
                                    )}
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <IconButton
                                        color={rule.isActive ? 'error' : 'success'}
                                        onClick={() => handleToggleActive(rule)}
                                        disabled={loading}
                                    >
                                        {rule.isActive ? <StopIcon /> : <PlayIcon />}
                                    </IconButton>
                                    <IconButton
                                        color="primary"
                                        onClick={() => handleOpenDialog(rule)}
                                        disabled={loading}
                                    >
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton
                                        color="error"
                                        onClick={() => handleDelete(rule.id)}
                                        disabled={loading}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                ))}

                {rules.length === 0 && !loading && (
                    <Card>
                        <CardContent>
                            <Typography variant="body1" color="text.secondary" textAlign="center">
                                لا توجد قواعد رد تلقائي. انقر على "إضافة قاعدة" للبدء.
                            </Typography>
                        </CardContent>
                    </Card>
                )}
            </Box>

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>{editingRule ? 'تعديل قاعدة' : 'إضافة قاعدة جديدة'}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            label="اسم القاعدة"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            fullWidth
                            required
                        />

                        <FormControl fullWidth>
                            <InputLabel>نوع المحفز</InputLabel>
                            <Select
                                value={formData.triggerType}
                                onChange={(e) => setFormData({ ...formData, triggerType: e.target.value })}
                                label="نوع المحفز"
                            >
                                <MenuItem value="KEYWORD">كلمة مفتاحية</MenuItem>
                                <MenuItem value="REGEX">تعبير نمطي (Regex)</MenuItem>
                                <MenuItem value="ALL">جميع الرسائل</MenuItem>
                            </Select>
                        </FormControl>

                        {formData.triggerType !== 'ALL' && (
                            <TextField
                                label="قيمة المحفز"
                                value={formData.triggerValue}
                                onChange={(e) => setFormData({ ...formData, triggerValue: e.target.value })}
                                fullWidth
                                required
                                helperText={formData.triggerType === 'KEYWORD' ? 'مثال: مرحبا، السعر، المنتج' : 'مثال: ^(مرحبا|أهلا).*'}
                            />
                        )}

                        <TextField
                            label="الرد التلقائي"
                            value={formData.response}
                            onChange={(e) => setFormData({ ...formData, response: e.target.value })}
                            fullWidth
                            required
                            multiline
                            rows={4}
                        />

                        <TextField
                            label="الأولوية"
                            type="number"
                            value={formData.priority}
                            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                            fullWidth
                            helperText="الأولوية الأعلى تُنفذ أولاً"
                        />

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={formData.workingHoursOnly}
                                    onChange={(e) => setFormData({ ...formData, workingHoursOnly: e.target.checked })}
                                />
                            }
                            label="أوقات العمل فقط"
                        />

                        {formData.workingHoursOnly && (
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <TextField
                                    label="من"
                                    type="time"
                                    value={formData.startTime}
                                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                    fullWidth
                                />
                                <TextField
                                    label="إلى"
                                    type="time"
                                    value={formData.endTime}
                                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                    fullWidth
                                />
                            </Box>
                        )}

                        <FormControl fullWidth>
                            <InputLabel>أيام العمل</InputLabel>
                            <Select
                                multiple
                                value={formData.daysOfWeek}
                                onChange={(e) => setFormData({ ...formData, daysOfWeek: e.target.value })}
                                label="أيام العمل"
                                renderValue={(selected) => (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {selected.map((value) => (
                                            <Chip key={value} label={daysOfWeek.find(d => d.value === value)?.label} size="small" />
                                        ))}
                                    </Box>
                                )}
                            >
                                {daysOfWeek.map((day) => (
                                    <MenuItem key={day.value} value={day.value}>
                                        {day.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>إلغاء</Button>
                    <Button onClick={handleSave} variant="contained" disabled={loading}>
                        {loading ? 'جاري الحفظ...' : 'حفظ'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TelegramAutoReply;
