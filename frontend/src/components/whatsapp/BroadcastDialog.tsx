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
    InputAdornment,
    Chip
} from '@mui/material';
import { Search as SearchIcon, Campaign as BroadcastIcon } from '@mui/icons-material';
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

interface BroadcastDialogProps {
    open: boolean;
    onClose: () => void;
    sessionId: string;
    contacts: Contact[];
}

const BroadcastDialog: React.FC<BroadcastDialogProps> = ({
    open,
    onClose,
    sessionId,
    contacts
}) => {
    const { enqueueSnackbar } = useSnackbar();
    const [listName, setListName] = useState('');
    const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Filter contacts to show only individuals (not groups) and remove duplicates
    const filteredContacts = contacts
        .filter(contact =>
            !contact.isGroup &&
            contact.jid && // Ensure jid exists
            (contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                contact.pushName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                contact.phoneNumber?.includes(searchQuery))
        )
        .filter((contact, index, self) =>
            index === self.findIndex(c => c.jid === contact.jid) // Remove duplicates by jid
        );

    const handleToggleContact = (jid: string) => {
        setSelectedContacts(prev => {
            if (prev.includes(jid)) {
                return prev.filter(id => id !== jid);
            } else {
                return [...prev, jid];
            }
        });
    };

    const handleSendBroadcast = async () => {
        if (selectedContacts.length === 0) {
            enqueueSnackbar('يرجى اختيار جهة اتصال واحدة على الأقل', { variant: 'warning' });
            return;
        }

        if (!message.trim()) {
            enqueueSnackbar('يرجى كتابة رسالة', { variant: 'warning' });
            return;
        }

        setLoading(true);
        try {
            await api.post('/whatsapp/broadcast/send', {
                sessionId,
                jids: selectedContacts,
                message: message
            });
            enqueueSnackbar(`تم إرسال الرسالة إلى ${selectedContacts.length} جهة اتصال`, { variant: 'success' });
            handleClose();
        } catch (error: any) {
            console.error('Error sending broadcast:', error);
            enqueueSnackbar(error.response?.data?.error || 'فشل إرسال الرسالة الجماعية', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setListName('');
        setSelectedContacts([]);
        setSearchQuery('');
        setMessage('');
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BroadcastIcon color="primary" />
                    رسالة جماعية (Broadcast)
                </Box>
            </DialogTitle>
            <DialogContent dividers>
                <Box sx={{ display: 'flex', gap: 2, height: 400 }}>
                    {/* Left Side: Contact Selection */}
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="subtitle2" gutterBottom>
                            اختر المستلمين ({selectedContacts.length})
                        </Typography>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="بحث..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
                            }}
                            sx={{ mb: 1 }}
                        />
                        <List sx={{ flex: 1, overflow: 'auto', border: '1px solid #eee', borderRadius: 1 }}>
                            {filteredContacts.map((contact) => (
                                <ListItem
                                    key={`${contact.id}-${contact.jid}`}
                                    button
                                    onClick={() => handleToggleContact(contact.jid)}
                                    dense
                                >
                                    <Checkbox
                                        edge="start"
                                        checked={selectedContacts.includes(contact.jid)}
                                        tabIndex={-1}
                                        disableRipple
                                        size="small"
                                    />
                                    <ListItemAvatar>
                                        <Avatar src={contact.profilePicUrl || ''} sx={{ width: 32, height: 32 }}>
                                            {contact.name?.[0] || '?'}
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={contact.name || contact.pushName || contact.phoneNumber}
                                        secondary={contact.phoneNumber}
                                        primaryTypographyProps={{ variant: 'body2' }}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Box>

                    {/* Right Side: Message Composition */}
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="subtitle2" gutterBottom>
                            محتوى الرسالة
                        </Typography>
                        <TextField
                            fullWidth
                            multiline
                            rows={12}
                            placeholder="اكتب رسالتك هنا..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            variant="outlined"
                            sx={{ flex: 1 }}
                        />
                        <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                                ملاحظة: سيتم إرسال هذه الرسالة بشكل فردي لكل جهة اتصال مختارة.
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={loading}>إلغاء</Button>
                <Button
                    onClick={handleSendBroadcast}
                    variant="contained"
                    disabled={loading || selectedContacts.length === 0 || !message.trim()}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <BroadcastIcon />}
                >
                    إرسال ({selectedContacts.length})
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default BroadcastDialog;
