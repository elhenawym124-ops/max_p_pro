import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    TextField,
    Grid,
    Button,
    Pagination,
    Stack,
    Collapse,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    Search as SearchIcon,
    KeyboardArrowDown as KeyboardArrowDownIcon,
    KeyboardArrowUp as KeyboardArrowUpIcon,
    ContentCopy as ContentCopyIcon
} from '@mui/icons-material';
import { apiClient } from '../services/apiClient';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

// Define Log Interface
interface AiLog {
    id: string;
    companyId: string;
    modelUsed: string;
    keyId?: string;
    keyName?: string;
    userMessage: string;
    aiResponse: string;
    tokensUsed: number;
    responseTime: number;
    createdAt: string;
    company?: {
        name: string;
        email: string;
    };
}

const Row = (props: { row: AiLog }) => {
    const { row } = props;
    const [open, setOpen] = useState(false);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Could add toast here
    };

    return (
        <>
            <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
                <TableCell>
                    <IconButton
                        aria-label="expand row"
                        size="small"
                        onClick={() => setOpen(!open)}
                    >
                        {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                </TableCell>
                <TableCell component="th" scope="row">
                    {format(new Date(row.createdAt), 'dd/MM/yyyy HH:mm', { locale: ar })}
                </TableCell>
                <TableCell>{row.company?.name || row.companyId}</TableCell>
                <TableCell>
                    <Chip
                        label={row.keyName || 'N/A'}
                        color={row.keyName?.includes('Central') ? 'primary' : 'default'}
                        size="small"
                        variant="outlined"
                    />
                </TableCell>
                <TableCell>{row.modelUsed}</TableCell>
                <TableCell>{row.tokensUsed}</TableCell>
                <TableCell>{row.responseTime}ms</TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 1 }}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="h6" gutterBottom component="div" sx={{ fontSize: '1rem' }}>
                                        رسالة المستخدم
                                        <Tooltip title="نسخ">
                                            <IconButton size="small" onClick={() => copyToClipboard(row.userMessage)}>
                                                <ContentCopyIcon fontSize="inherit" />
                                            </IconButton>
                                        </Tooltip>
                                    </Typography>
                                    <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f5f5f5', maxHeight: '200px', overflow: 'auto' }}>
                                        <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                                            {row.userMessage}
                                        </Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="h6" gutterBottom component="div" sx={{ fontSize: '1rem' }}>
                                        رد الذكاء الاصطناعي
                                        <Tooltip title="نسخ">
                                            <IconButton size="small" onClick={() => copyToClipboard(row.aiResponse)}>
                                                <ContentCopyIcon fontSize="inherit" />
                                            </IconButton>
                                        </Tooltip>
                                    </Typography>
                                    <Paper variant="outlined" sx={{ p: 2, bgcolor: '#e3f2fd', maxHeight: '200px', overflow: 'auto' }}>
                                        <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                                            {row.aiResponse}
                                        </Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="caption" display="block" color="text.secondary">
                                        Key ID: {row.keyId} | Comp Email: {row.company?.email}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    );
};

const SuperAdminAiLogs = () => {
    const [logs, setLogs] = useState<AiLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        search: '',
        keyName: '',
        companyId: '',
        startDate: '',
        endDate: ''
    });

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/super-admin/ai-logs', {
                params: {
                    page,
                    limit: 20,
                    ...filters
                }
            });

            if (response.data.success) {
                setLogs(response.data.data);
                setTotalPages(response.data.pagination.pages);
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page]); // Reload when page changes

    const handleSearch = () => {
        setPage(1); // Reset to page 1
        fetchLogs();
    };

    const handleFilterChange = (prop: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setFilters({ ...filters, [prop]: event.target.value });
    };

    return (
        <Box>
            <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
                سجل استخدام الذكاء الاصطناعي
            </Typography>

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={3}>
                            <TextField
                                fullWidth
                                label="بحث (رسالة، رد، مفتاح)"
                                variant="outlined"
                                size="small"
                                value={filters.search}
                                onChange={handleFilterChange('search')}
                            />
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <TextField
                                fullWidth
                                label="اسم الشركة / ID"
                                variant="outlined"
                                size="small"
                                value={filters.companyId}
                                onChange={handleFilterChange('companyId')}
                            />
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <TextField
                                fullWidth
                                label="اسم المفتاح"
                                variant="outlined"
                                size="small"
                                value={filters.keyName}
                                onChange={handleFilterChange('keyName')}
                            />
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <TextField
                                fullWidth
                                type="date"
                                label="من تاريخ"
                                InputLabelProps={{ shrink: true }}
                                size="small"
                                value={filters.startDate}
                                onChange={handleFilterChange('startDate')}
                            />
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <TextField
                                fullWidth
                                type="date"
                                label="إلى تاريخ"
                                InputLabelProps={{ shrink: true }}
                                size="small"
                                value={filters.endDate}
                                onChange={handleFilterChange('endDate')}
                            />
                        </Grid>
                        <Grid item xs={12} md={1}>
                            <Button
                                fullWidth
                                variant="contained"
                                startIcon={<SearchIcon />}
                                onClick={handleSearch}
                                sx={{ height: 40 }}
                            >
                                بحث
                            </Button>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            <TableContainer component={Paper}>
                <Table aria-label="collapsible table">
                    <TableHead>
                        <TableRow>
                            <TableCell />
                            <TableCell>التوقيت</TableCell>
                            <TableCell>الشركة</TableCell>
                            <TableCell>المفتاح</TableCell>
                            <TableCell>الموديل</TableCell>
                            <TableCell>Tokens</TableCell>
                            <TableCell>وقت الرد</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center">جاري التحميل...</TableCell>
                            </TableRow>
                        ) : logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center">لا توجد سجلات</TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log) => (
                                <Row key={log.id} row={log} />
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_, value) => setPage(value)}
                    color="primary"
                />
            </Box>
        </Box>
    );
};

export default SuperAdminAiLogs;
