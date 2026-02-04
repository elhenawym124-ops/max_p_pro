import React, { useState, useEffect } from 'react';
import { Box, Button, Card, CardContent, Typography, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, Chip, IconButton, Alert, Tabs, Tab, List, ListItem, ListItemText } from '@mui/material';
import { Add as AddIcon, Group as GroupIcon, Campaign as CampaignIcon, PersonAdd as PersonAddIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import axios from 'axios';

const TelegramGroups = () => {
    const [groups, setGroups] = useState([]);
    const [userbots, setUserbots] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [openMembersDialog, setOpenMembersDialog] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [members, setMembers] = useState([]);
    const [tabValue, setTabValue] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        userbotConfigId: '',
        title: '',
        about: '',
        isPublic: false,
        type: 'CHANNEL',
        users: []
    });

    useEffect(() => {
        fetchUserbots();
        fetchGroups();
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

    const fetchGroups = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/v1/telegram-advanced/groups');
            setGroups(response.data.data || []);
        } catch (error) {
            console.error('Error fetching groups:', error);
            setError('فشل تحميل المجموعات والقنوات');
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

    const handleOpenDialog = (type) => {
        setFormData({
            userbotConfigId: userbots[0]?.id || '',
            title: '',
            about: '',
            isPublic: false,
            type,
            users: []
        });
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
    };

    const handleCreate = async () => {
        if (!formData.userbotConfigId || !formData.title) {
            setError('يرجى ملء جميع الحقول المطلوبة');
            return;
        }

        setLoading(true);
        try {
            if (formData.type === 'CHANNEL') {
                await axios.post('/api/v1/telegram-advanced/groups/channel', {
                    userbotConfigId: formData.userbotConfigId,
                    title: formData.title,
                    about: formData.about,
                    isPublic: formData.isPublic
                });
            } else {
                await axios.post('/api/v1/telegram-advanced/groups/group', {
                    userbotConfigId: formData.userbotConfigId,
                    title: formData.title,
                    users: formData.users
                });
            }
            fetchGroups();
            handleCloseDialog();
        } catch (error) {
            console.error('Error creating group/channel:', error);
            setError('فشل إنشاء المجموعة/القناة');
        } finally {
            setLoading(false);
        }
    };

    const handleViewMembers = async (group) => {
        setSelectedGroup(group);
        setLoading(true);
        try {
            const response = await axios.get(
                `/api/v1/telegram-advanced/groups/${group.userbotConfigId}/${group.telegramId}/members?saveToDb=true`
            );
            setMembers(response.data.members || []);
            setOpenMembersDialog(true);
        } catch (error) {
            console.error('Error fetching members:', error);
            setError('فشل تحميل الأعضاء');
        } finally {
            setLoading(false);
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'CHANNEL': return <CampaignIcon />;
            case 'GROUP': return <GroupIcon />;
            case 'SUPERGROUP': return <GroupIcon />;
            default: return <GroupIcon />;
        }
    };

    const getTypeLabel = (type) => {
        switch (type) {
            case 'CHANNEL': return 'قناة';
            case 'GROUP': return 'مجموعة';
            case 'SUPERGROUP': return 'مجموعة كبيرة';
            default: return type;
        }
    };

    const filteredGroups = groups.filter(g => {
        if (tabValue === 0) return g.type === 'CHANNEL';
        if (tabValue === 1) return g.type === 'GROUP' || g.type === 'SUPERGROUP';
        return true;
    });

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">👥 المجموعات والقنوات</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="contained"
                        startIcon={<CampaignIcon />}
                        onClick={() => handleOpenDialog('CHANNEL')}
                        disabled={userbots.length === 0}
                    >
                        قناة جديدة
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<GroupIcon />}
                        onClick={() => handleOpenDialog('GROUP')}
                        disabled={userbots.length === 0}
                    >
                        مجموعة جديدة
                    </Button>
                </Box>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
                <Tab label="القنوات" />
                <Tab label="المجموعات" />
                <Tab label="الكل" />
            </Tabs>

            <Box sx={{ display: 'grid', gap: 2 }}>
                {filteredGroups.map((group) => (
                    <Card key={group.id}>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <Box sx={{ flex: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        {getTypeIcon(group.type)}
                                        <Typography variant="h6">{group.title}</Typography>
                                        <Chip label={getTypeLabel(group.type)} size="small" />
                                        {group.managedByUs && (
                                            <Chip label="مُدار بواسطتنا" color="primary" size="small" />
                                        )}
                                        {group.isPublic && (
                                            <Chip label="عام" color="info" size="small" />
                                        )}
                                    </Box>
                                    {group.username && (
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            @{group.username}
                                        </Typography>
                                    )}
                                    {group.description && (
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            {group.description}
                                        </Typography>
                                    )}
                                    <Typography variant="body2" color="text.secondary">
                                        👥 {group.memberCount || 0} عضو
                                    </Typography>
                                </Box>
                                <Box>
                                    <Button
                                        size="small"
                                        startIcon={<VisibilityIcon />}
                                        onClick={() => handleViewMembers(group)}
                                    >
                                        الأعضاء
                                    </Button>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                ))}

                {filteredGroups.length === 0 && !loading && (
                    <Card>
                        <CardContent>
                            <Typography variant="body1" color="text.secondary" textAlign="center">
                                لا توجد {tabValue === 0 ? 'قنوات' : tabValue === 1 ? 'مجموعات' : 'مجموعات أو قنوات'} حالياً.
                            </Typography>
                        </CardContent>
                    </Card>
                )}
            </Box>

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>
                    {formData.type === 'CHANNEL' ? '📢 إنشاء قناة جديدة' : '👥 إنشاء مجموعة جديدة'}
                </DialogTitle>
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
                            label={formData.type === 'CHANNEL' ? 'اسم القناة' : 'اسم المجموعة'}
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            fullWidth
                            required
                        />

                        {formData.type === 'CHANNEL' && (
                            <>
                                <TextField
                                    label="الوصف"
                                    value={formData.about}
                                    onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                                    fullWidth
                                    multiline
                                    rows={3}
                                />
                                <FormControl fullWidth>
                                    <InputLabel>نوع القناة</InputLabel>
                                    <Select
                                        value={formData.isPublic}
                                        onChange={(e) => setFormData({ ...formData, isPublic: e.target.value })}
                                        label="نوع القناة"
                                    >
                                        <MenuItem value={false}>خاصة</MenuItem>
                                        <MenuItem value={true}>عامة</MenuItem>
                                    </Select>
                                </FormControl>
                            </>
                        )}

                        {formData.type === 'GROUP' && (
                            <FormControl fullWidth>
                                <InputLabel>الأعضاء الأوليين</InputLabel>
                                <Select
                                    multiple
                                    value={formData.users}
                                    onChange={(e) => setFormData({ ...formData, users: e.target.value })}
                                    label="الأعضاء الأوليين"
                                    renderValue={(selected) => `${selected.length} عضو`}
                                >
                                    {contacts.map((contact) => (
                                        <MenuItem key={contact.id} value={contact.telegramId}>
                                            {contact.firstName} {contact.lastName} {contact.username ? `(@${contact.username})` : ''}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}

                        <Alert severity="info">
                            💡 {formData.type === 'CHANNEL' 
                                ? 'القنوات مناسبة للبث إلى جمهور كبير'
                                : 'المجموعات مناسبة للمحادثات الجماعية'}
                        </Alert>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>إلغاء</Button>
                    <Button
                        onClick={handleCreate}
                        variant="contained"
                        startIcon={formData.type === 'CHANNEL' ? <CampaignIcon /> : <GroupIcon />}
                        disabled={loading}
                    >
                        {loading ? 'جاري الإنشاء...' : 'إنشاء'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openMembersDialog} onClose={() => setOpenMembersDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    أعضاء {selectedGroup?.title}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            إجمالي الأعضاء: {members.length}
                        </Typography>
                        <List>
                            {members.slice(0, 100).map((member) => (
                                <ListItem key={member.id}>
                                    <ListItemText
                                        primary={`${member.firstName} ${member.lastName}`}
                                        secondary={
                                            <>
                                                {member.username && `@${member.username}`}
                                                {member.isBot && ' • 🤖 بوت'}
                                                {member.isPremium && ' • ⭐ Premium'}
                                            </>
                                        }
                                    />
                                </ListItem>
                            ))}
                        </List>
                        {members.length > 100 && (
                            <Typography variant="body2" color="text.secondary" textAlign="center">
                                ... و {members.length - 100} عضو آخر
                            </Typography>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenMembersDialog(false)}>إغلاق</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TelegramGroups;
