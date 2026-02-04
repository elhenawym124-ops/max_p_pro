
import React, { useState, useEffect } from 'react';
import {
    Drawer,
    Box,
    Typography,
    Avatar,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    IconButton,
    Button,
    Divider,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Menu,
    MenuItem,
    CircularProgress,
    Switch,
    FormControlLabel,
    Chip
} from '@mui/material';
import {
    Edit as EditIcon,
    ExitToApp as ExitIcon,
    PersonAdd as PersonAddIcon,
    MoreVert as MoreVertIcon,
    Save as SaveIcon,
    Close as CloseIcon,
    Check as CheckIcon,
    Link as LinkIcon,
    ContentCopy as CopyIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { apiClient as api } from '../../services/apiClient';

interface Participant {
    id: string;
    admin?: 'admin' | 'superadmin' | null;
}

interface GroupMetadata {
    id: string;
    subject: string;
    desc?: string;
    owner?: string;
    participants: Participant[];
    restrict?: boolean;
    announce?: boolean;
}

interface Contact {
    id: string;
    jid: string;
    name: string | null;
    pushName: string | null;
    profilePicUrl: string | null;
    isGroup?: boolean;
    phoneNumber?: string;
}

interface GroupInfoDrawerProps {
    open: boolean;
    onClose: () => void;
    sessionId: string;
    groupJid: string;
    contacts: Contact[]; // To resolve names
}

const GroupInfoDrawer: React.FC<GroupInfoDrawerProps> = ({
    open,
    onClose,
    sessionId,
    groupJid,
    contacts
}) => {
    const { enqueueSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(false);
    const [metadata, setMetadata] = useState<GroupMetadata | null>(null);
    const [editingSubject, setEditingSubject] = useState(false);
    const [newSubject, setNewSubject] = useState('');
    const [editingDesc, setEditingDesc] = useState(false);
    const [newDesc, setNewDesc] = useState('');

    // Participant Menu
    const [participantMenuAnchor, setParticipantMenuAnchor] = useState<null | HTMLElement>(null);
    const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);

    // Add Participant Dialog
    const [addParticipantOpen, setAddParticipantOpen] = useState(false);
    const [selectedContactsToAdd, setSelectedContactsToAdd] = useState<string[]>([]);

    // Invite Code
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

    const handleUpdateSetting = async (setting: 'restrict' | 'announce', value: boolean) => {
        try {
            await api.put(`/whatsapp/groups/${groupJid}/settings`, {
                sessionId,
                setting,
                value
            });
            enqueueSnackbar('تم تحديث إعدادات المجموعة', { variant: 'success' });
            fetchGroupMetadata();
        } catch (error) {
            enqueueSnackbar('فشل تحديث إعدادات المجموعة', { variant: 'error' });
        }
    };

    const fetchInviteCode = async () => {
        try {
            const response = await api.get(`/whatsapp/groups/${groupJid}/invite-code`, {
                params: { sessionId }
            });
            if (response.data.success) {
                setInviteCode(response.data.code);
                setInviteDialogOpen(true);
            }
        } catch (error) {
            enqueueSnackbar('فشل جلب رابط الدعوة', { variant: 'error' });
        }
    };

    const revokeInviteCode = async () => {
        try {
            await api.post(`/whatsapp/groups/${groupJid}/revoke-invite`, { sessionId });
            enqueueSnackbar('تم إلغاء رابط الدعوة', { variant: 'success' });
            fetchInviteCode(); // Fetch new code
        } catch (error) {
            enqueueSnackbar('فشل إلغاء رابط الدعوة', { variant: 'error' });
        }
    };

    useEffect(() => {
        if (open && sessionId && groupJid) {
            fetchGroupMetadata();
        }
    }, [open, sessionId, groupJid]);

    const fetchGroupMetadata = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/whatsapp/groups/${groupJid}`, {
                params: { sessionId }
            });
            if (response.data.success) {
                setMetadata(response.data.metadata);
                setNewSubject(response.data.metadata.subject);
                setNewDesc(response.data.metadata.desc || '');
            }
        } catch (error: any) {
            console.error('Error fetching group metadata:', error);
            enqueueSnackbar('فشل جلب بيانات المجموعة', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const getContactName = (jid: string) => {
        const contact = contacts.find(c => c.jid === jid || c.jid === jid.split('@')[0] + '@s.whatsapp.net'); // Handle potential JID format diffs
        return contact?.name || contact?.pushName || jid.split('@')[0];
    };

    const getContactPic = (jid: string) => {
        const contact = contacts.find(c => c.jid === jid || c.jid === jid.split('@')[0] + '@s.whatsapp.net');
        return contact?.profilePicUrl;
    };

    const handleUpdateSubject = async () => {
        try {
            await api.put(`/whatsapp/groups/${groupJid}/subject`, {
                sessionId,
                subject: newSubject
            });
            enqueueSnackbar('تم تحديث اسم المجموعة', { variant: 'success' });
            setEditingSubject(false);
            fetchGroupMetadata();
        } catch (error) {
            enqueueSnackbar('فشل تحديث اسم المجموعة', { variant: 'error' });
        }
    };

    const handleUpdateDesc = async () => {
        try {
            await api.put(`/whatsapp/groups/${groupJid}/description`, {
                sessionId,
                description: newDesc
            });
            enqueueSnackbar('تم تحديث وصف المجموعة', { variant: 'success' });
            setEditingDesc(false);
            fetchGroupMetadata();
        } catch (error) {
            enqueueSnackbar('فشل تحديث وصف المجموعة', { variant: 'error' });
        }
    };

    const handleLeaveGroup = async () => {
        if (!window.confirm('هل أنت متأكد من مغادرة المجموعة؟')) return;
        try {
            await api.post(`/whatsapp/groups/${groupJid}/leave`, { sessionId });
            enqueueSnackbar('تم مغادرة المجموعة', { variant: 'success' });
            onClose();
        } catch (error) {
            enqueueSnackbar('فشل مغادرة المجموعة', { variant: 'error' });
        }
    };

    const handleParticipantAction = async (action: 'remove' | 'promote' | 'demote') => {
        if (!selectedParticipant) return;
        try {
            await api.post(`/whatsapp/groups/${groupJid}/participants`, {
                sessionId,
                participants: [selectedParticipant.id],
                action
            });
            enqueueSnackbar('تم تنفيذ الإجراء بنجاح', { variant: 'success' });
            setParticipantMenuAnchor(null);
            fetchGroupMetadata();
        } catch (error) {
            enqueueSnackbar('فشل تنفيذ الإجراء', { variant: 'error' });
        }
    };

    const handleAddParticipants = async () => {
        try {
            await api.post(`/whatsapp/groups/${groupJid}/participants`, {
                sessionId,
                participants: selectedContactsToAdd,
                action: 'add'
            });
            enqueueSnackbar('تم إضافة المشاركين', { variant: 'success' });
            setAddParticipantOpen(false);
            setSelectedContactsToAdd([]);
            fetchGroupMetadata();
        } catch (error) {
            enqueueSnackbar('فشل إضافة المشاركين', { variant: 'error' });
        }
    };

    const filteredContactsForAdd = contacts.filter(c =>
        !c.isGroup &&
        !metadata?.participants.some(p => p.id === c.jid)
    );

    if (!open) return null;

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{ sx: { width: 400 } }}
        >
            {loading && !metadata ? (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                    <CircularProgress />
                </Box>
            ) : metadata ? (
                <Box sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">معلومات المجموعة</Typography>
                        <IconButton onClick={onClose}><CloseIcon /></IconButton>
                    </Box>

                    <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
                        <Avatar sx={{ width: 100, height: 100, mb: 2, fontSize: 40 }}>
                            {metadata.subject[0]}
                        </Avatar>

                        {editingSubject ? (
                            <Box display="flex" alignItems="center" width="100%" gap={1}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    value={newSubject}
                                    onChange={(e) => setNewSubject(e.target.value)}
                                />
                                <IconButton onClick={handleUpdateSubject} color="primary"><SaveIcon /></IconButton>
                                <IconButton onClick={() => setEditingSubject(false)}><CloseIcon /></IconButton>
                            </Box>
                        ) : (
                            <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="h5">{metadata.subject}</Typography>
                                <IconButton size="small" onClick={() => setEditingSubject(true)}><EditIcon fontSize="small" /></IconButton>
                            </Box>
                        )}

                        <Typography variant="caption" color="text.secondary">
                            تم الإنشاء بواسطة {getContactName(metadata.owner || '')}
                        </Typography>
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    <Box mb={3}>
                        <Typography variant="subtitle2" color="primary" gutterBottom>الوصف</Typography>
                        {editingDesc ? (
                            <Box>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={3}
                                    value={newDesc}
                                    onChange={(e) => setNewDesc(e.target.value)}
                                    sx={{ mb: 1 }}
                                />
                                <Button size="small" variant="contained" onClick={handleUpdateDesc} sx={{ mr: 1 }}>حفظ</Button>
                                <Button size="small" onClick={() => setEditingDesc(false)}>إلغاء</Button>
                            </Box>
                        ) : (
                            <Box onClick={() => setEditingDesc(true)} sx={{ cursor: 'pointer', minHeight: 40, bgcolor: 'rgba(0,0,0,0.02)', p: 1, borderRadius: 1 }}>
                                <Typography variant="body2">{metadata.desc || 'لا يوجد وصف'}</Typography>
                            </Box>
                        )}
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    <Box mb={2}>
                        <Typography variant="subtitle2" color="primary" gutterBottom>معرف المجموعة (Group ID)</Typography>
                        <Box sx={{ bgcolor: 'rgba(0,0,0,0.02)', p: 1, borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{metadata.id}</Typography>
                            <IconButton size="small" onClick={() => { navigator.clipboard.writeText(metadata.id); enqueueSnackbar('تم نسخ المعرف', { variant: 'success' }); }}>
                                <CopyIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    <Box mt={2}>
                        <Typography variant="subtitle2" color="primary" gutterBottom>إعدادات المجموعة</Typography>
                        <Box display="flex" flexDirection="column" gap={1}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={metadata.announce || false}
                                        onChange={(e) => handleUpdateSetting('announce', e.target.checked)}
                                    />
                                }
                                label="إرسال الرسائل (المشرفون فقط)"
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={metadata.restrict || false}
                                        onChange={(e) => handleUpdateSetting('restrict', e.target.checked)}
                                    />
                                }
                                label="تعديل معلومات المجموعة (المشرفون فقط)"
                            />
                        </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="subtitle2" color="primary">
                            المشاركون ({metadata.participants.length})
                        </Typography>
                        <Box>
                            <IconButton size="small" onClick={fetchInviteCode} title="دعوة عبر الرابط">
                                <LinkIcon />
                            </IconButton>
                            <IconButton size="small" onClick={() => setAddParticipantOpen(true)} color="primary" title="إضافة مشارك">
                                <PersonAddIcon />
                            </IconButton>
                        </Box>
                    </Box>

                    <List dense>
                        {metadata.participants.map((participant) => (
                            <ListItem
                                key={participant.id}
                                secondaryAction={
                                    <IconButton
                                        edge="end"
                                        size="small"
                                        onClick={(e) => {
                                            setParticipantMenuAnchor(e.currentTarget);
                                            setSelectedParticipant(participant);
                                        }}
                                    >
                                        <MoreVertIcon fontSize="small" />
                                    </IconButton>
                                }
                            >
                                <ListItemAvatar>
                                    <Avatar src={getContactPic(participant.id) || ''} />
                                </ListItemAvatar>
                                <ListItemText
                                    primary={
                                        <Box display="flex" alignItems="center" gap={1}>
                                            {getContactName(participant.id)}
                                            {participant.admin && (
                                                <Chip
                                                    label={participant.admin === 'superadmin' ? 'منشئ' : 'مشرف'}
                                                    size="small"
                                                    color={participant.admin === 'superadmin' ? 'secondary' : 'primary'}
                                                    variant="outlined"
                                                    sx={{ height: 20, fontSize: '0.6rem' }}
                                                />
                                            )}
                                        </Box>
                                    }
                                    secondary={participant.id.split('@')[0]}
                                />
                            </ListItem>
                        ))}
                    </List>

                    <Box mt={3}>
                        <Button
                            fullWidth
                            variant="outlined"
                            color="error"
                            startIcon={<ExitIcon />}
                            onClick={handleLeaveGroup}
                        >
                            مغادرة المجموعة
                        </Button>
                    </Box>
                </Box>
            ) : null}

            {/* Participant Menu */}
            <Menu
                anchorEl={participantMenuAnchor}
                open={Boolean(participantMenuAnchor)}
                onClose={() => setParticipantMenuAnchor(null)}
            >
                <MenuItem onClick={() => handleParticipantAction('remove')} sx={{ color: 'error.main' }}>حذف من المجموعة</MenuItem>
                {selectedParticipant?.admin ? (
                    <MenuItem onClick={() => handleParticipantAction('demote')}>إزالة الإشراف</MenuItem>
                ) : (
                    <MenuItem onClick={() => handleParticipantAction('promote')}>تعيين كمشرف</MenuItem>
                )}
            </Menu>

            {/* Add Participant Dialog */}
            <Dialog open={addParticipantOpen} onClose={() => setAddParticipantOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>إضافة مشاركين</DialogTitle>
                <DialogContent dividers>
                    <List>
                        {filteredContactsForAdd.map(contact => (
                            <ListItem
                                key={contact.jid}
                                button
                                onClick={() => {
                                    if (selectedContactsToAdd.includes(contact.jid)) {
                                        setSelectedContactsToAdd(prev => prev.filter(id => id !== contact.jid));
                                    } else {
                                        setSelectedContactsToAdd(prev => [...prev, contact.jid]);
                                    }
                                }}
                            >
                                <ListItemAvatar>
                                    <Avatar src={contact.profilePicUrl || ''} />
                                </ListItemAvatar>
                                <ListItemText primary={contact.name || contact.pushName || contact.phoneNumber} />
                                {selectedContactsToAdd.includes(contact.jid) && <CheckIcon color="primary" />}
                            </ListItem>
                        ))}
                        {filteredContactsForAdd.length === 0 && (
                            <Typography align="center" color="text.secondary" py={2}>لا توجد جهات اتصال للإضافة</Typography>
                        )}
                    </List>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddParticipantOpen(false)}>إلغاء</Button>
                    <Button
                        onClick={handleAddParticipants}
                        variant="contained"
                        disabled={selectedContactsToAdd.length === 0}
                    >
                        إضافة ({selectedContactsToAdd.length})
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Invite Code Dialog */}
            <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>رابط الدعوة للمجموعة</DialogTitle>
                <DialogContent dividers>
                    <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                        <Typography variant="body1">أرسل هذا الرابط للانضمام إلى المجموعة:</Typography>
                        <Box
                            sx={{
                                p: 2,
                                bgcolor: 'rgba(0,0,0,0.05)',
                                borderRadius: 1,
                                width: '100%',
                                wordBreak: 'break-all',
                                textAlign: 'center'
                            }}
                        >
                            <Typography variant="body2" fontFamily="monospace">
                                https://chat.whatsapp.com/{inviteCode}
                            </Typography>
                        </Box>
                        <Button
                            variant="outlined"
                            onClick={() => {
                                navigator.clipboard.writeText(`https://chat.whatsapp.com/${inviteCode}`);
                                enqueueSnackbar('تم نسخ الرابط', { variant: 'success' });
                            }}
                        >
                            نسخ الرابط
                        </Button>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setInviteDialogOpen(false)}>إغلاق</Button>
                    <Button onClick={revokeInviteCode} color="error">
                        إلغاء الرابط الحالي
                    </Button>
                </DialogActions>
            </Dialog>
        </Drawer>
    );
};

export default GroupInfoDrawer;
