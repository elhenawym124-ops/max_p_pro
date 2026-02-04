import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import {
  Add as AddIcon,
  ContentCopy as ContentCopyIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  OpenInNew as OpenInNewIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import api from '../services/api';
import { buildAppUrl } from '../utils/urlHelper';
import { useAuth } from '../hooks/useAuthSimple';

type CompanyLink = {
  id: string;
  name: string;
  url: string;
  username?: string;
  openMode?: 'new_tab' | 'in_app';
  hasPassword?: boolean;
};

const CompanyLinks = () => {
  const { user } = useAuth();
  const canManage = useMemo(
    () => user?.role === 'OWNER' || user?.role === 'COMPANY_ADMIN' || user?.role === 'SUPER_ADMIN',
    [user?.role]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [links, setLinks] = useState<CompanyLink[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyLink | null>(null);
  const [form, setForm] = useState({
    name: '',
    url: '',
    username: '',
    password: '',
    openMode: 'new_tab' as 'new_tab' | 'in_app'
  });

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [shownPassword, setShownPassword] = useState('');

  const [shareToken, setShareToken] = useState<string | null>(null);
  const shareUrl = shareToken ? buildAppUrl(`/company-links/${shareToken}`) : '';

  const fetchLinks = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('company/links');
      setLinks(res?.data?.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'فشل في جلب الروابط');
    } finally {
      setLoading(false);
    }
  };

  const fetchShareToken = async () => {
    try {
      if (!canManage) return;
      const res = await api.get('company/links/share-token');
      setShareToken(res?.data?.data?.token || null);
    } catch (e) {
      setShareToken(null);
    }
  };

  useEffect(() => {
    fetchLinks();
    fetchShareToken();
  }, [user?.companyId, canManage]);

  const resetForm = () => {
    setEditing(null);
    setForm({ name: '', url: '', username: '', password: '', openMode: 'new_tab' });
  };

  const copyText = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text || '');
      toast.success(successMessage);
    } catch (e) {
      toast.error('فشل النسخ');
    }
  };

  const openLink = (link: CompanyLink) => {
    if (!link?.url) return;
    window.open(link.url, '_blank', 'noopener,noreferrer');
  };

  const saveLink = async () => {
    try {
      if (!canManage) return;
      const payload: any = {
        name: form.name,
        url: form.url,
        username: form.username,
        openMode: form.openMode
      };

      if (form.password !== '') {
        payload.password = form.password;
      }

      if (editing?.id) {
        await api.put(`company/links/${editing.id}`, payload);
        toast.success('تم تحديث الرابط');
      } else {
        await api.post('company/links', payload);
        toast.success('تم إضافة الرابط');
      }

      setDialogOpen(false);
      resetForm();
      fetchLinks();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'فشل حفظ الرابط');
    }
  };

  const deleteLink = async (link: CompanyLink) => {
    try {
      if (!canManage) return;
      const confirmed = window.confirm('هل تريد حذف هذا الرابط؟');
      if (!confirmed) return;
      await api.delete(`company/links/${link.id}`);
      toast.success('تم حذف الرابط');
      fetchLinks();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'فشل حذف الرابط');
    }
  };

  const showPassword = async (link: CompanyLink) => {
    try {
      if (!canManage) return;
      const res = await api.get(`company/links/${link.id}/password`);
      const password = res?.data?.data?.password || '';
      setShownPassword(password);
      setPasswordDialogOpen(true);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'فشل في جلب كلمة المرور');
    }
  };

  const copyPassword = async (link: CompanyLink) => {
    try {
      if (!canManage) return;
      const res = await api.get(`company/links/${link.id}/password`);
      const password = res?.data?.data?.password || '';
      await copyText(password, 'تم نسخ كلمة المرور');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'فشل في نسخ كلمة المرور');
    }
  };

  const generateShareLink = async () => {
    try {
      if (!canManage) return;
      const res = await api.post('company/links/share-token', {});
      const token = res?.data?.data?.token || null;
      setShareToken(token);
      if (token) {
        await copyText(buildAppUrl(`/company-links/${token}`), 'تم نسخ لينك المشاركة');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'فشل في إنشاء لينك المشاركة');
    }
  };

  const revokeShareLink = async () => {
    try {
      if (!canManage) return;
      const confirmed = window.confirm('هل تريد إلغاء لينك المشاركة؟');
      if (!confirmed) return;
      await api.delete('company/links/share-token');
      setShareToken(null);
      toast.success('تم إلغاء لينك المشاركة');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'فشل في إلغاء لينك المشاركة');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" gap={2} mb={2}>
        <Typography variant="h5">روابط الشركة</Typography>
        {canManage && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
          >
            إضافة رابط
          </Button>
        )}
      </Box>

      {canManage && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              لينك خارجي ثابت
            </Typography>

            {shareToken ? (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
                <TextField value={shareUrl} fullWidth InputProps={{ readOnly: true }} />
                <Button
                  variant="outlined"
                  startIcon={<ContentCopyIcon />}
                  onClick={() => copyText(shareUrl, 'تم نسخ لينك المشاركة')}
                >
                  نسخ
                </Button>
                <Button color="error" variant="outlined" onClick={revokeShareLink}>
                  إلغاء
                </Button>
              </Stack>
            ) : (
              <Button variant="outlined" onClick={generateShareLink}>
                إنشاء لينك مشاركة
              </Button>
            )}

            <Alert severity="info" sx={{ mt: 2 }}>
              اللينك الخارجي يعرض الروابط واليوزر فقط (بدون باسورد) حفاظًا على الأمان.
            </Alert>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : links.length === 0 ? (
        <Alert severity="info">لا توجد روابط محفوظة</Alert>
      ) : (
        <Card>
          <CardContent>
            <List dense>
              {links.map((link, index) => (
                <React.Fragment key={link.id}>
                  <ListItem
                    secondaryAction={
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="فتح">
                          <IconButton onClick={() => openLink(link)}>
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {link.username ? (
                          <Tooltip title="نسخ Username">
                            <IconButton onClick={() => copyText(link.username || '', 'تم نسخ Username')}>
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : null}

                        {canManage && link.hasPassword ? (
                          <>
                            <Tooltip title="إظهار كلمة المرور">
                              <IconButton onClick={() => showPassword(link)}>
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="نسخ كلمة المرور">
                              <IconButton onClick={() => copyPassword(link)}>
                                <ContentCopyIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        ) : null}

                        {canManage ? (
                          <>
                            <Tooltip title="تعديل">
                              <IconButton
                                onClick={() => {
                                  setEditing(link);
                                  setForm({
                                    name: link.name || '',
                                    url: link.url || '',
                                    username: link.username || '',
                                    password: '',
                                    openMode: link.openMode || 'new_tab'
                                  });
                                  setDialogOpen(true);
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="حذف">
                              <IconButton color="error" onClick={() => deleteLink(link)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        ) : null}
                      </Stack>
                    }
                  >
                    <ListItemText primary={link.name} secondary={link.url} />
                  </ListItem>
                  {index < links.length - 1 ? <Divider /> : null}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          resetForm();
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{editing ? 'تعديل رابط' : 'إضافة رابط'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="اسم اللينك"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              fullWidth
            />
            <TextField
              label="URL"
              value={form.url}
              onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Username"
              value={form.username}
              onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
              fullWidth
            />
            <TextField
              label={editing ? 'Password (اتركه فارغًا للاحتفاظ بالحالي)' : 'Password'}
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>طريقة الفتح</InputLabel>
              <Select
                label="طريقة الفتح"
                value={form.openMode}
                onChange={(e) => setForm((p) => ({ ...p, openMode: e.target.value as any }))}
              >
                <MenuItem value="new_tab">Tab جديدة</MenuItem>
                <MenuItem value="in_app">داخل المشروع</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDialogOpen(false);
              resetForm();
            }}
          >
            إلغاء
          </Button>
          <Button variant="contained" onClick={saveLink}>
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
          <Button onClick={() => copyText(shownPassword, 'تم نسخ كلمة المرور')} startIcon={<ContentCopyIcon />}>
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
