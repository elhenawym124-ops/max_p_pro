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
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    CircularProgress,
    Button
} from '@mui/material';
import {
    Visibility,
    Schedule
} from '@mui/icons-material';
import { apiClient } from '../../services/apiClient';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface TraceStep {
    id: string;
    stepType: string;
    latencyMs: number;
    input: string;
    output: string;
    metadata: string;
    order: number;
    createdAt: string;
}

interface Trace {
    id: string;
    query: string;
    timestamp: string;
    latencyMs: number;
    metadata: string;
    createdAt: string;
    steps: TraceStep[];
}

const RAGInspector: React.FC = () => {
    const [traces, setTraces] = useState<Trace[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
    const [traceDetails, setTraceDetails] = useState<Trace | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    const fetchTraces = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/rag-analytics/traces');
            if (response.data.success) {
                setTraces(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch traces:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTraceDetails = async (id: string) => {
        setLoadingDetails(true);
        try {
            const response = await apiClient.get(`/rag-analytics/traces/${id}`);
            if (response.data.success) {
                setTraceDetails(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch trace details:', error);
        } finally {
            setLoadingDetails(false);
        }
    };

    useEffect(() => {
        fetchTraces();
    }, []);

    const handleOpenTrace = (id: string) => {
        setSelectedTraceId(id);
        fetchTraceDetails(id);
    };

    const handleCloseTrace = () => {
        setSelectedTraceId(null);
        setTraceDetails(null);
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'EXPANSION': return 'info';
            case 'RETRIEVAL': return 'warning';
            case 'RERANK': return 'success';
            case 'GENERATION': return 'primary';
            default: return 'default';
        }
    };

    const formatJSON = (str: string) => {
        try {
            return JSON.stringify(JSON.parse(str), null, 2);
        } catch (e) {
            return str;
        }
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5">سجل التتبعات (Traces)</Typography>
                <Button variant="outlined" onClick={fetchTraces}>تحديث</Button>
            </Box>

            <TableContainer component={Card}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>التوقيت</TableCell>
                            <TableCell>الاستعلام (Query)</TableCell>
                            <TableCell>الخطوات</TableCell>
                            <TableCell>السرعة</TableCell>
                            <TableCell>إجراءات</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center">
                                    <CircularProgress size={24} />
                                </TableCell>
                            </TableRow>
                        ) : traces.map((trace) => (
                            <TableRow key={trace.id} hover>
                                <TableCell>
                                    {format(new Date(trace.createdAt), 'pp P', { locale: ar })}
                                </TableCell>
                                <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {trace.query}
                                </TableCell>
                                <TableCell>
                                    {trace.steps?.map(s => (
                                        <Chip
                                            key={s.stepType + Math.random()}
                                            label={s.stepType[0]}
                                            size="small"
                                            color={getTypeColor(s.stepType) as any}
                                            sx={{ mr: 0.5, fontSize: '0.6rem', height: 20, width: 20, '& .MuiChip-label': { px: 0 } }}
                                        />
                                    ))}
                                </TableCell>
                                <TableCell>
                                    {trace.steps?.reduce((acc, curr) => acc + (curr.latencyMs || 0), 0)} ms
                                </TableCell>
                                <TableCell>
                                    <IconButton onClick={() => handleOpenTrace(trace.id)}>
                                        <Visibility />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog
                open={!!selectedTraceId}
                onClose={handleCloseTrace}
                maxWidth="md"
                fullWidth
                dir="ltr" // Show technical details LTR
            >
                <DialogTitle>
                    Trace Details
                    <Typography variant="caption" display="block" color="text.secondary">{selectedTraceId}</Typography>
                </DialogTitle>
                <DialogContent dividers>
                    {loadingDetails || !traceDetails ? (
                        <Box display="flex" justifyContent="center" p={3}><CircularProgress /></Box>
                    ) : (
                        <Box>
                            <Box mb={3} p={2} bgcolor="grey.50" borderRadius={1}>
                                <Typography variant="subtitle2" gutterBottom>Original Query:</Typography>
                                <Typography variant="h6">{traceDetails.query}</Typography>
                            </Box>

                            <Typography variant="h6" gutterBottom>Execution Steps</Typography>
                            {traceDetails.steps?.map((step, index) => (
                                <Card key={step.id || index} variant="outlined" sx={{ mb: 2 }}>
                                    <CardContent sx={{ pb: '16px !important' }}>
                                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Chip label={step.stepType} color={getTypeColor(step.stepType) as any} size="small" />
                                                <Typography variant="caption" display="flex" alignItems="center">
                                                    <Schedule fontSize="inherit" sx={{ mr: 0.5 }} />
                                                    {step.latencyMs}ms
                                                </Typography>
                                            </Box>
                                            {/* <Typography variant="caption" color="text.secondary">Step {index + 1}</Typography> */}
                                        </Box>

                                        {/* Input/Output Expanders could go here, for now just basic info */}
                                        {step.stepType === 'EXPANSION' && (
                                            <Box mt={1}>
                                                <Typography variant="subtitle2" fontSize="0.75rem">Expanded Queries:</Typography>
                                                <pre style={{ margin: 0, fontSize: '0.75rem', background: '#f5f5f5', padding: 4 }}>
                                                    {formatJSON(step.output)}
                                                </pre>
                                            </Box>
                                        )}

                                        {step.stepType === 'RETRIEVAL' && (
                                            <Box mt={1}>
                                                <Typography variant="subtitle2" fontSize="0.75rem">Retrieved Docs:</Typography>
                                                <Typography variant="caption">
                                                    Input: {formatJSON(step.input)}
                                                </Typography>
                                                {/* <pre style={{ margin: 0, fontSize: '0.75rem', maxHeight: 100, overflow: 'auto' }}>
                            {formatJSON(step.output)}
                          </pre> */}
                                            </Box>
                                        )}

                                        <Box mt={2}>
                                            <details>
                                                <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: 'gray' }}>View Full Input/Output</summary>
                                                <Box mt={1} display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                                                    <Box>
                                                        <Typography variant="caption" fontWeight="bold">Input</Typography>
                                                        <pre style={{ fontSize: '0.7rem', maxHeight: 200, overflow: 'auto', background: '#f8f9fa', padding: 8, borderRadius: 4 }}>
                                                            {formatJSON(step.input)}
                                                        </pre>
                                                    </Box>
                                                    <Box>
                                                        <Typography variant="caption" fontWeight="bold">Output</Typography>
                                                        <pre style={{ fontSize: '0.7rem', maxHeight: 200, overflow: 'auto', background: '#f8f9fa', padding: 8, borderRadius: 4 }}>
                                                            {formatJSON(step.output)}
                                                        </pre>
                                                    </Box>
                                                </Box>
                                            </details>
                                        </Box>

                                    </CardContent>
                                </Card>
                            ))}
                        </Box>
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default RAGInspector;
