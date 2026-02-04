import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';
import { ContentCopy as ContentCopyIcon, OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { buildApiUrl } from '../utils/urlHelper';

type PublicLink = {
  id: string;
  name: string;
  url: string;
  username?: string;
  openMode?: 'new_tab' | 'in_app';
  hasPassword?: boolean;
};

type PublicResponse = {
  success: boolean;
  data?: {
    company: { id: string; name: string };
    links: PublicLink[];
  };
  message?: string;
};

const PublicCompanyLinks = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>('');
  const [links, setLinks] = useState<PublicLink[]>([]);

  const copyText = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text || '');
      toast.success(successMessage);
    } catch (e) {
      toast.error('فشل النسخ');
    }
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const t = String(token || '').trim();
        if (!t) {
          setError('لينك غير صالح');
          return;
        }

        const res = await fetch(buildApiUrl(`public/company-links/${encodeURIComponent(t)}`));
        const data = (await res.json()) as PublicResponse;

        if (!res.ok || !data?.success) {
          setError(data?.message || 'لينك غير صالح');
          return;
        }

        setCompanyName(data.data?.company?.name || '');
        setLinks(data.data?.links || []);
      } catch (e: any) {
        setError(e?.message || 'فشل في جلب الروابط');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [token]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        روابط الشركة
      </Typography>

      {companyName ? (
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {companyName}
        </Typography>
      ) : null}

      {error ? (
        <Alert severity="error">{error}</Alert>
      ) : links.length === 0 ? (
        <Alert severity="info">لا توجد روابط</Alert>
      ) : (
        <Card>
          <CardContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              هذه صفحة عامة لفتح الروابط ونسخ اليوزر. كلمة المرور لا تظهر هنا حفاظًا على الأمان.
            </Alert>
            <List dense>
              {links.map((link, index) => (
                <React.Fragment key={link.id}>
                  <ListItem
                    secondaryAction={
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="فتح">
                          <IconButton
                            onClick={() => {
                              if (!link.url) return;
                              window.open(link.url, '_blank', 'noopener,noreferrer');
                            }}
                          >
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
    </Box>
  );
};

export default PublicCompanyLinks;
