import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Avatar,
    IconButton,
    Typography,
    Box,
    CircularProgress,
    Tab,
    Tabs,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    InputAdornment,
    Switch,
    FormControlLabel
} from '@mui/material';
import {
    Block as BlockIcon,
    Security as SecurityIcon,
    Delete as DeleteIcon,
    Search as SearchIcon,
    PersonAdd as PersonAddIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { apiClient as api } from '../../services/apiClient';

interface Contact {
    id: string;
    jid: string;
    name: string | null;
    pushName: string | null;
    profilePicUrl: string | null;
    phoneNumber?: string;
}

interface PrivacySettingsDialogProps {
    open: boolean;
    onClose: () => void;
    sessionId: string;
    contacts: Contact[];
}

interface PrivacySettings {
    readReceipts: boolean;
    lastSeen: 'all' | 'contacts' | 'contact_blacklist' | 'none';
    profilePic: 'all' | 'contacts' | 'contact_blacklist' | 'none';
    status: 'all' | 'contacts' | 'contact_blacklist' | 'none';
    online: 'all' | 'match_last_seen';
    groupAdd: 'all' | 'contacts' | 'contact_blacklist';
}

const PrivacySettingsDialog: React.FC<PrivacySettingsDialogProps> = ({
    open,
    onClose,
    sessionId,
    contacts
}) => {
    const { enqueueSnackbar } = useSnackbar();
    const [tabValue, setTabValue] = useState(0);
    const [loading, setLoading] = useState(false);
    const [blocklist, setBlocklist] = useState<string[]>([]);
    const [settings, setSettings] = useState<PrivacySettings>({
        readReceipts: true,
        lastSeen: 'all',
        profilePic: 'all',
        status: 'all',
        online: 'all',
        groupAdd: 'all'
    });
    const [blockSearchQuery, setBlockSearchQuery] = useState('');

    useEffect(() => {
        if (open && sessionId) {
            if (tabValue === 0) fetchBlocklist();
            else fetchPrivacySettings();
        }
    }, [open, sessionId, tabValue]);

    const fetchBlocklist = async () => {
        setLoading(true);
        try {
            const res = await api.get('/whatsapp/privacy/blocklist', { params: { sessionId } });
            setBlocklist(res.data.blocklist || []);
        } catch (error) {
            console.error('Error fetching blocklist:', error);
            enqueueSnackbar('فشل جلب قائمة المحظورين', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const fetchPrivacySettings = async () => {
        setLoading(true);
        try {
            const res = await api.get('/whatsapp/privacy/settings', { params: { sessionId } });
            if (res.data.settings) {
                setSettings(res.data.settings);
            }
        } catch (error) {
            console.error('Error fetching privacy settings:', error);
            // Don't show error on first load as settings might not be set yet
        } finally {
            setLoading(false);
        }
    };

    const handleUnblock = async (jid: string) => {
        try {
            await api.post('/whatsapp/contacts/unblock', { sessionId, jid });
            enqueueSnackbar('تم إلغاء الحظر بنجاح', { variant: 'success' });
            fetchBlocklist();
        } catch (error) {
            enqueueSnackbar('فشل إلغاء الحظر', { variant: 'error' });
        }
    };

    const handleBlock = async (jid: string) => {
        try {
            await api.post('/whatsapp/contacts/block', { sessionId, jid });
            enqueueSnackbar('تم الحظر بنجاح', { variant: 'success' });
            setBlockSearchQuery('');
            fetchBlocklist();
        } catch (error) {
            enqueueSnackbar('فشل الحظر', { variant: 'error' });
        }
    };

    const handleUpdateSetting = async (key: keyof PrivacySettings, value: any) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings); // Optimistic update
        try {
            await api.post('/whatsapp/privacy/settings', {
                sessionId,
                setting: key,
                value
            });
            enqueueSnackbar('تم تحديث الإعدادات', { variant: 'success' });
        } catch (error) {
            enqueueSnackbar('فشل تحديث الإعدادات', { variant: 'error' });
            fetchPrivacySettings(); // Revert on error
        }
    };

    const getContactName = (jid: string) => {
        const contact = contacts.find(c => c.jid === jid || c.jid === jid.split('@')[0] + '@s.whatsapp.net');
        return contact?.name || contact?.pushName || contact?.phoneNumber || jid.split('@')[0];
    };

    // Filter contacts for blocking that are NOT already blocked
    const contactsToBlock = contacts.filter(c =>
        !blocklist.includes(c.jid) &&
        (c.name?.toLowerCase().includes(blockSearchQuery.toLowerCase()) ||
            c.phoneNumber?.includes(blockSearchQuery))
    );

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SecurityIcon color="primary" />
                    الخصوصية والأمان
                </Box>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 0 }}>
                <Tabs
                    value={tabValue}
                    onChange={(_, v) => setTabValue(v)}
                    variant="fullWidth"
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label="قائمة المحظورين" icon={<BlockIcon />} iconPosition="start" />
                    <Tab label="إعدادات الخصوصية" icon={<SecurityIcon />} iconPosition="start" />
                </Tabs>

                <Box sx={{ p: 2, height: 400, overflow: 'auto' }}>
                    {loading ? (
                        <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                            <CircularProgress />
                        </Box>
                    ) : tabValue === 0 ? (
                        // Blocklist Tab
                        <Box>
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>حظر جهة اتصال جديدة</Typography>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="بحث عن جهة اتصال لحظرها..."
                                    value={blockSearchQuery}
                                    onChange={(e) => setBlockSearchQuery(e.target.value)}
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>
                                    }}
                                />
                                {blockSearchQuery && (
                                    <List sx={{ maxHeight: 150, overflow: 'auto', bgcolor: 'background.paper', mt: 1, border: '1px solid #eee' }}>
                                        {contactsToBlock.map(contact => (
                                            <ListItem key={contact.jid} button onClick={() => handleBlock(contact.jid)}>
                                                <ListItemAvatar>
                                                    <Avatar src={contact.profilePicUrl || ''} />
                                                </ListItemAvatar>
                                                <ListItemText primary={contact.name || contact.phoneNumber} />
                                                <BlockIcon color="error" fontSize="small" />
                                            </ListItem>
                                        ))}
                                    </List>
                                )}
                            </Box>

                            <Typography variant="subtitle2" gutterBottom>
                                جهات الاتصال المحظورة ({blocklist.length})
                            </Typography>
                            <List>
                                {blocklist.map(jid => (
                                    <ListItem
                                        key={jid}
                                        secondaryAction={
                                            <Button size="small" color="error" onClick={() => handleUnblock(jid)}>
                                                إلغاء الحظر
                                            </Button>
                                        }
                                    >
                                        <ListItemText
                                            primary={getContactName(jid)}
                                            secondary={jid.split('@')[0]}
                                        />
                                    </ListItem>
                                ))}
                                {blocklist.length === 0 && (
                                    <Typography align="center" color="text.secondary" py={4}>
                                        لا توجد جهات اتصال محظورة
                                    </Typography>
                                )}
                            </List>
                        </Box>
                    ) : (
                        // Privacy Settings Tab
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>آخر ظهور (Last Seen)</InputLabel>
                                <Select
                                    value={settings.lastSeen}
                                    label="آخر ظهور (Last Seen)"
                                    onChange={(e) => handleUpdateSetting('lastSeen', e.target.value)}
                                >
                                    <MenuItem value="all">الكل</MenuItem>
                                    <MenuItem value="contacts">جهات اتصالي</MenuItem>
                                    <MenuItem value="contact_blacklist">جهات اتصالي باستثناء...</MenuItem>
                                    <MenuItem value="none">لا أحد</MenuItem>
                                </Select>
                            </FormControl>

                            <FormControl fullWidth size="small">
                                <InputLabel>الصورة الشخصية</InputLabel>
                                <Select
                                    value={settings.profilePic}
                                    label="الصورة الشخصية"
                                    onChange={(e) => handleUpdateSetting('profilePic', e.target.value)}
                                >
                                    <MenuItem value="all">الكل</MenuItem>
                                    <MenuItem value="contacts">جهات اتصالي</MenuItem>
                                    <MenuItem value="contact_blacklist">جهات اتصالي باستثناء...</MenuItem>
                                    <MenuItem value="none">لا أحد</MenuItem>
                                </Select>
                            </FormControl>

                            <FormControl fullWidth size="small">
                                <InputLabel>الأخبار (About)</InputLabel>
                                <Select
                                    value={settings.status}
                                    label="الأخبار (About)"
                                    onChange={(e) => handleUpdateSetting('status', e.target.value)}
                                >
                                    <MenuItem value="all">الكل</MenuItem>
                                    <MenuItem value="contacts">جهات اتصالي</MenuItem>
                                    <MenuItem value="contact_blacklist">جهات اتصالي باستثناء...</MenuItem>
                                    <MenuItem value="none">لا أحد</MenuItem>
                                </Select>
                            </FormControl>

                            <FormControl fullWidth size="small">
                                <InputLabel>المجموعات</InputLabel>
                                <Select
                                    value={settings.groupAdd}
                                    label="المجموعات"
                                    onChange={(e) => handleUpdateSetting('groupAdd', e.target.value)}
                                >
                                    <MenuItem value="all">الكل</MenuItem>
                                    <MenuItem value="contacts">جهات اتصالي</MenuItem>
                                    <MenuItem value="contact_blacklist">جهات اتصالي باستثناء...</MenuItem>
                                </Select>
                            </FormControl>

                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.readReceipts}
                                        onChange={(e) => handleUpdateSetting('readReceipts', e.target.checked)}
                                    />
                                }
                                label="مؤشرات قراءة الرسائل"
                            />
                        </Box>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>إغلاق</Button>
            </DialogActions>
        </Dialog>
    );
};

export default PrivacySettingsDialog;
