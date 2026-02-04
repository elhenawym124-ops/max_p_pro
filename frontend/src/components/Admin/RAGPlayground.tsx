import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Grid,
    CircularProgress,
    Chip
} from '@mui/material';
import { Search, Image as ImageIcon } from '@mui/icons-material';
import { apiClient } from '../../services/apiClient';

const RAGPlayground: React.FC = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [executionTime, setExecutionTime] = useState<number | null>(null);

    const handleSearch = async () => {
        if (!query.trim()) return;

        setLoading(true);
        setExecutionTime(null);
        const startTime = Date.now();

        try {
            const response = await apiClient.get('/products/search', {
                params: { q: query }
            });

            if (response.data.success) {
                setResults(response.data.data);
            }
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setExecutionTime(Date.now() - startTime);
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <Box>
            <Card sx={{ mb: 4 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>تجربة البحث (Playground)</Typography>
                    <Typography variant="body2" color="text.secondary" mb={3}>
                        اختبر محرك البحث RAG وتأكد من دقة النتائج وترتيبها.
                    </Typography>

                    <Box display="flex" gap={2}>
                        <TextField
                            fullWidth
                            label="بحث عن منتج..."
                            variant="outlined"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder="مثال: حذاء رياضي نايك أسود مقاس 42"
                        />
                        <Button
                            variant="contained"
                            size="large"
                            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Search />}
                            onClick={handleSearch}
                            disabled={loading || !query.trim()}
                            sx={{ minWidth: 120 }}
                        >
                            بحث
                        </Button>
                    </Box>

                    {executionTime !== null && (
                        <Box mt={2} display="flex" alignItems="center" gap={1}>
                            <Typography variant="caption" color="text.secondary">
                                تم التنفيذ في {executionTime}ms
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                • عدد النتائج: {results.length}
                            </Typography>
                        </Box>
                    )}
                </CardContent>
            </Card>

            <Grid container spacing={3}>
                {results.map((product) => (
                    <Grid item xs={12} md={6} key={product.id}>
                        <Card variant="outlined" sx={{ display: 'flex', height: '100%' }}>
                            {product.images && JSON.parse(product.images)[0] && (
                                <Box
                                    component="img"
                                    sx={{ width: 100, objectFit: 'cover' }}
                                    src={JSON.parse(product.images)[0]}
                                    alt={product.name}
                                />
                            )}
                            {!product.images || !JSON.parse(product.images)[0] && (
                                <Box sx={{ width: 100, bgcolor: 'grey.100', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <ImageIcon color="disabled" />
                                </Box>
                            )}
                            <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, p: 2 }}>
                                <Box display="flex" justifyContent="space-between" alignItems="start">
                                    <Typography variant="subtitle1" component="div" fontWeight="bold">
                                        {product.name}
                                    </Typography>
                                    {product.score && (
                                        <Chip
                                            label={`Score: ${(product.score * 100).toFixed(0)}%`}
                                            size="small"
                                            color={product.score > 0.7 ? "success" : product.score > 0.5 ? "warning" : "default"}
                                            variant="outlined"
                                        />
                                    )}
                                </Box>

                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, maxHeight: 40, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {product.description?.substring(0, 100)}...
                                </Typography>

                                <Box mt="auto" display="flex" justifyContent="space-between">
                                    <Typography variant="subtitle2" color="primary">
                                        {product.price} EGP
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        ID: {product.id.substring(0, 8)}...
                                    </Typography>
                                </Box>
                            </Box>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

export default RAGPlayground;
