
import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Avatar,
    Checkbox,
    Typography,
    Box,
    CircularProgress,
    InputAdornment
} from '@mui/material';
import { Search as SearchIcon, Group as GroupIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { apiClient as api } from '../../services/apiClient';

interface Contact {
    id: string;
    jid: string;
    name: string | null;
    pushName: string | null;
    profilePicUrl: string | null;
    phoneNumber?: string;
    isGroup: boolean;
}

interface CreateGroupDialogProps {
    open: boolean;
    onClose: () => void;
    sessionId: string;
    contacts: Contact[];
    onGroupCreated: (group: any) => void;
}

const CreateGroupDialog: React.FC<CreateGroupDialogProps> = ({
    open,
    onClose,
    sessionId,
    contacts,
    onGroupCreated
}) => {
    const { enqueueSnackbar } = useSnackbar();
    const [subject, setSubject] = useState('');
    const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [creating, setCreating] = useState(false);

    // Filter contacts to show only individuals (not groups) and match search query
    const filteredContacts = contacts.filter(contact =>
        !contact.isGroup &&
        (contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            contact.pushName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            contact.phoneNumber?.includes(searchQuery))
    );

    const handleToggleParticipant = (jid: string) => {
        setSelectedParticipants(prev => {
            if (prev.includes(jid)) {
                return prev.filter(id => id !== jid);
            } else {
                return [...prev, jid];
            }
        });
    };

    const handleCreate = async () => {
        if (!subject.trim()) {
            enqueueSnackbar('يرجى إدخال اسم المجموعة', { variant: 'warning' });
            return;
        }

        if (selectedParticipants.length === 0) {
            enqueueSnackbar('يرجى اختيار مشارك واحد على الأقل', { variant: 'warning' });
            return;
        }

        setCreating(true);
        try {
            const response = await api.post('/whatsapp/groups/create', {
                sessionId,
                subject,
                participants: selectedParticipants
            });

            if (response.data.success) {
                enqueueSnackbar('تم إنشاء المجموعة بنجاح', { variant: 'success' });
                onGroupCreated(response.data.group);
                handleClose();
            }
        } catch (error: any) {
            console.error('Error creating group:', error);
            enqueueSnackbar(error.response?.data?.error || 'حدث خطأ أثناء إنشاء المجموعة', { variant: 'error' });
        } finally {
            setCreating(false);
        }
    };

    const handleClose = () => {
        setSubject('');
        setSelectedParticipants([]);
        setSearchQuery('');
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>إنشاء مجموعة جديدة</DialogTitle>
            <DialogContent dividers>
                <Box sx={{ mb: 3, mt: 1 }}>
                    <TextField
                        fullWidth
                        label="اسم المجموعة"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="أدخل اسم المجموعة..."
                        variant="outlined"
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <GroupIcon color="action" />
                                </InputAdornment>
                            ),
                        }}
                    />
                </Box>

                <Typography variant="subtitle2" gutterBottom>
                    اختر المشاركين ({selectedParticipants.length})
                </Typography>

                <TextField
                    fullWidth
                    size="small"
                    placeholder="بحث عن جهات اتصال..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ mb: 2 }}
                />

                <List sx={{ height: 300, overflow: 'auto', bgcolor: 'background.paper', border: '1px solid #eee', borderRadius: 1 }}>
                    {filteredContacts.map((contact) => (
                        <ListItem
                            key={contact.jid}
                            button
                            onClick={() => handleToggleParticipant(contact.jid)}
                        >
                            <ListItemAvatar>
                                <Avatar src={contact.profilePicUrl || ''}>
                                    {contact.name?.[0] || contact.pushName?.[0] || '?'}
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                                primary={contact.name || contact.pushName || contact.phoneNumber}
                                secondary={contact.phoneNumber}
                            />
                            <Checkbox
                                edge="end"
                                checked={selectedParticipants.includes(contact.jid)}
                                tabIndex={-1}
                                disableRipple
                            />
                        </ListItem>
                    ))}
                    {filteredContacts.length === 0 && (
                        <ListItem>
                            <ListItemText primary="لا توجد جهات اتصال" sx={{ textAlign: 'center', color: 'text.secondary' }} />
                        </ListItem>
                    )}
                </List>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={creating}>إلغاء</Button>
                <Button
                    onClick={handleCreate}
                    variant="contained"
                    disabled={creating || !subject.trim() || selectedParticipants.length === 0}
                >
                    {creating ? <CircularProgress size={24} /> : 'إنشاء'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CreateGroupDialog;
