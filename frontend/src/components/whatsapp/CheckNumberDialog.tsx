
import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Typography,
    Box,
    CircularProgress,
    Alert
} from '@mui/material';
import { Check as CheckIcon, Close as CloseIcon, Message as MessageIcon } from '@mui/icons-material';
import { apiClient as api } from '../../services/apiClient';

interface CheckNumberDialogProps {
    open: boolean;
    onClose: () => void;
    sessionId: string;
    onChatStart?: (jid: string) => void;
}

const CheckNumberDialog: React.FC<CheckNumberDialogProps> = ({
    open,
    onClose,
    sessionId,
    onChatStart
}) => {
    const [number, setNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ exists: boolean; jid?: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleCheck = async () => {
        if (!number) return;
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const response = await api.post('/whatsapp/check-number', {
                sessionId,
                number
            });
            if (response.data.success) {
                setResult({ exists: response.data.exists, jid: response.data.jid });
            } else {
                setError('فشل التحقق من الرقم');
            }
        } catch (err) {
            setError('حدث خطأ أثناء التحقق');
        } finally {
            setLoading(false);
        }
    };

    const handleStartChat = () => {
        if (result?.jid && onChatStart) {
            onChatStart(result.jid);
            onClose();
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>التحقق من رقم واتساب</DialogTitle>
            <DialogContent dividers>
                <Box display="flex" flexDirection="column" gap={2}>
                    <TextField
                        label="رقم الهاتف (مع رمز الدولة)"
                        placeholder="مثال: 201xxxxxxxxx"
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        fullWidth
                        autoFocus
                    />

                    {loading && <CircularProgress size={24} sx={{ alignSelf: 'center' }} />}

                    {error && <Alert severity="error">{error}</Alert>}

                    {result && (
                        <Alert
                            severity={result.exists ? "success" : "warning"}
                            icon={result.exists ? <CheckIcon /> : <CloseIcon />}
                        >
                            {result.exists ? (
                                <Box>
                                    <Typography variant="body2" fontWeight="bold">الرقم موجود على واتساب</Typography>
                                    <Typography variant="caption">{result.jid}</Typography>
                                </Box>
                            ) : (
                                "الرقم غير مسجل على واتساب"
                            )}
                        </Alert>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>إغلاق</Button>
                {result?.exists && (
                    <Button
                        onClick={handleStartChat}
                        variant="contained"
                        color="primary"
                        startIcon={<MessageIcon />}
                    >
                        بدء محادثة
                    </Button>
                )}
                <Button
                    onClick={handleCheck}
                    variant="contained"
                    disabled={!number || loading}
                >
                    تحقق
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CheckNumberDialog;
