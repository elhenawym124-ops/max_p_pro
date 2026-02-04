import React, { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
  TextField,
  Stack,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as ContentCopyIcon,
  OpenInNew as OpenInNewIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuthSimple';

const CompanyLinks = () => {
  const { user } = useAuth();

  const [companyLinks, setCompanyLinks] = useState([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [linksError, setLinksError] = useState(null);

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [linkForm, setLinkForm] = useState({
    name: '',
    url: '',
    username: '',
    password: '',
  });

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [shownPassword, setShownPassword] = useState('');

  const canManageLinks =
    user?.role === 'OWNER' || user?.role === 'COMPANY_ADMIN' || user?.role === 'SUPER_ADMIN';

  const normalizeUrl = (rawUrl) => {
    const value = String(rawUrl || '').trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    return `https://${value}`;
  };

  const validateExternalUrl = (normalizedUrl) => {
    try {
      const parsed = new URL(normalizedUrl);
      const protocolOk = parsed.protocol === 'http:' || parsed.protocol === 'https:';
      if (!protocolOk) return false;

      const hostname = parsed.hostname || '';
      return hostname.includes('.') || hostname === 'localhost';
    } catch {
      return false;
    }
  };

  const fetchCompanyLinks = async () => {
    try {
      setLinksLoading(true);
      const response = await api.get('company/links');

      if (response.data.success) {
        setCompanyLinks(response.data.data || []);
        setLinksError(null);
      } else {
        setLinksError(response.data.message || 'فشل في جلب روابط الشركة');
      }
    } catch (err) {
      setLinksError('فشل في جلب الروابط: ' + err.message);
    } finally {
      setLinksLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyLinks();
  }, [user?.companyId]);

  const resetLinkForm = () => {
    setEditingLink(null);
    setLinkForm({ name: '', url: '', username: '', password: '' });
  };

  const openLink = (link) => {
    const url = normalizeUrl(link?.url);
    if (!url) return;
    if (!validateExternalUrl(url)) {
      toast.error('الرابط غير صحيح. مثال: https://swan.com');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const copyText = async (text, successMessage) => {
    try {
      await navigator.clipboard.writeText(text || '');
      toast.success(successMessage);
    } catch (e) {
      toast.error('فشل النسخ');
    }
  };

  const handleSaveLink = async () => {
    try {
      if (!canManageLinks) return;

      const normalizedUrl = normalizeUrl(linkForm.url);
      if (!normalizedUrl || !validateExternalUrl(normalizedUrl)) {
        toast.error('الرجاء إدخال رابط كامل وصحيح. مثال: https://swan.com');
        return;
      }

      const payload = {
        name: linkForm.name,
        url: normalizedUrl,
        username: linkForm.username,
        ...(linkForm.password !== '' ? { password: linkForm.password } : {}),
      };

      if (editingLink?.id) {
        await api.put(`company/links/${editingLink.id}`, payload);
        toast.success('تم تحديث الرابط');
      } else {
        await api.post('company/links', payload);
        toast.success('تم إضافة الرابط');
      }

      setLinkDialogOpen(false);
      resetLinkForm();
      fetchCompanyLinks();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'فشل حفظ الرابط');
    }
  };

  const handleDeleteLink = async (link) => {
    try {
      if (!canManageLinks) return;
      const confirmed = window.confirm('هل تريد حذف هذا الرابط؟');
      if (!confirmed) return;
      await api.delete(`company/links/${link.id}`);
      toast.success('تم حذف الرابط');
      fetchCompanyLinks();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'فشل حذف الرابط');
    }
  };

  const handleShowPassword = async (link) => {
    try {
      if (!canManageLinks) return;
      const response = await api.get(`company/links/${link.id}/password`);
      const password = response?.data?.data?.password || '';
      setShownPassword(password);
      setPasswordDialogOpen(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'فشل في جلب كلمة المرور');
    }
  };

  const handleCopyPassword = async (link) => {
    try {
      if (!canManageLinks) return;
      const response = await api.get(`company/links/${link.id}/password`);
      const password = response?.data?.data?.password || '';
      await copyText(password, 'تم نسخ كلمة المرور');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'فشل في نسخ كلمة المرور');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" gap={2} mb={2}>
            <Typography variant="h6">روابط الشركة</Typography>
            {canManageLinks && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  resetLinkForm();
                  setLinkDialogOpen(true);
                }}
              >
                إضافة رابط
              </Button>
            )}
          </Box>

          {linksLoading ? (
            <Box display="flex" justifyContent="center" py={3}>
              <CircularProgress size={24} />
            </Box>
          ) : linksError ? (
            <Alert severity="error">{linksError}</Alert>
          ) : companyLinks.length === 0 ? (
            <Alert severity="info">لا توجد روابط محفوظة</Alert>
          ) : (
            <List dense>
              {companyLinks.map((link, index) => (
                <React.Fragment key={link.id || index}>
                  <ListItem
                    secondaryAction={
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="فتح">
                          <IconButton onClick={() => openLink(link)}>
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {link.username && (
                          <Tooltip title="نسخ Username">
                            <IconButton onClick={() => copyText(link.username, 'تم نسخ Username')}>
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        {canManageLinks && link.hasPassword && (
                          <>
                            <Tooltip title="إظهار كلمة المرور">
                              <IconButton onClick={() => handleShowPassword(link)}>
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="نسخ كلمة المرور">
                              <IconButton onClick={() => handleCopyPassword(link)}>
                                <ContentCopyIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}

                        {canManageLinks && (
                          <>
                            <Tooltip title="تعديل">
                              <IconButton
                                onClick={() => {
                                  setEditingLink(link);
                                  setLinkForm({
                                    name: link.name || '',
                                    url: link.url || '',
                                    username: link.username || '',
                                    password: '',
                                  });
                                  setLinkDialogOpen(true);
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="حذف">
                              <IconButton color="error" onClick={() => handleDeleteLink(link)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Stack>
                    }
                  >
                    <ListItemText primary={link.name} secondary={link.url} />
                  </ListItem>
                  {index < companyLinks.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={linkDialogOpen}
        onClose={() => {
          setLinkDialogOpen(false);
          resetLinkForm();
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{editingLink ? 'تعديل رابط' : 'إضافة رابط'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="اسم اللينك"
              value={linkForm.name}
              onChange={(e) => setLinkForm((p) => ({ ...p, name: e.target.value }))}
              fullWidth
            />
            <TextField
              label="URL"
              value={linkForm.url}
              onChange={(e) => setLinkForm((p) => ({ ...p, url: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Username"
              value={linkForm.username}
              onChange={(e) => setLinkForm((p) => ({ ...p, username: e.target.value }))}
              fullWidth
            />
            <TextField
              label={editingLink ? 'Password (اتركه فارغًا للاحتفاظ بالحالي)' : 'Password'}
              type="password"
              value={linkForm.password}
              onChange={(e) => setLinkForm((p) => ({ ...p, password: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setLinkDialogOpen(false);
              resetLinkForm();
            }}
          >
            إلغاء
          </Button>
          <Button variant="contained" onClick={handleSaveLink}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={passwordDialogOpen}
        onClose={() => {
          setPasswordDialogOpen(false);
          setShownPassword('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>كلمة المرور</DialogTitle>
        <DialogContent>
          <TextField
            label="Password"
            value={shownPassword}
            fullWidth
            InputProps={{ readOnly: true }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => copyText(shownPassword, 'تم نسخ كلمة المرور')}
            startIcon={<ContentCopyIcon />}
          >
            نسخ
          </Button>
          <Button
            onClick={() => {
              setPasswordDialogOpen(false);
              setShownPassword('');
            }}
          >
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CompanyLinks;
