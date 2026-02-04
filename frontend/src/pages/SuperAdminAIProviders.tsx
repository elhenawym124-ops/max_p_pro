import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid,
    Button,
    Chip,
    Alert,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Stack,
    FormControlLabel,
    Switch,
    Divider,
    Checkbox,
    Toolbar,
    InputAdornment
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Refresh as RefreshIcon,
    SmartToy as BotIcon,
    VpnKey as KeyIcon,
    Settings as SettingsIcon,
    Bolt as BoltIcon,
    Psychology as BrainIcon,
    Face as FaceIcon,
    Search as SearchIcon,
    FilterList as FilterListIcon,
    PlayArrow as PlayArrowIcon,
    Stop as StopIcon
} from '@mui/icons-material';
import { useTheme } from '../hooks/useTheme';

import { buildApiUrl } from '../utils/urlHelper';

const PROVIDERS = [
    { value: 'GOOGLE', label: 'Google Gemini', icon: <BoltIcon color="warning" /> },
    { value: 'DEEPSEEK', label: 'DeepSeek (V3/R1)', icon: <BrainIcon color="primary" /> },
    { value: 'OPENAI', label: 'OpenAI (GPT)', icon: <BotIcon color="success" /> },
    { value: 'ANTHROPIC', label: 'Anthropic (Claude)', icon: <BotIcon color="error" /> },
    { value: 'HUGGINGFACE', label: 'Hugging Face (Hub)', icon: <FaceIcon color="warning" /> },
    { value: 'OLLAMA', label: 'Ollama (Local)', icon: <BotIcon color="info" /> },
    { value: 'GROQ', label: 'Groq (LPU)', icon: <BoltIcon color="secondary" /> }
];

const SuperAdminAIProviders = () => {
    const { actualTheme } = useTheme();
    const isDark = actualTheme === 'dark';
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Ollama Specific
    const [ollamaModels, setOllamaModels] = useState<string[]>([]);
    const [loadingModels, setLoadingModels] = useState(false);

    // Data States
    const [globalConfig, setGlobalConfig] = useState({ defaultProvider: 'GOOGLE', enableFailover: true });
    const [keys, setKeys] = useState([]);
    const [filteredKeys, setFilteredKeys] = useState([]);
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

    // Filter States
    const [filters, setFilters] = useState({
        search: '',
        provider: '',
        status: ''
    });

    // Dialog States
    const [openDialog, setOpenDialog] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        provider: 'GOOGLE',
        apiKey: '',
        baseUrl: '',
        defaultModel: ''
    });

    const applyFilters = (keysToFilter: any[], currentFilters: any) => {
        let filtered = [...keysToFilter];

        // Search filter
        if (currentFilters.search) {
            const searchLower = currentFilters.search.toLowerCase();
            filtered = filtered.filter((key: any) =>
                key.name.toLowerCase().includes(searchLower) ||
                key.provider.toLowerCase().includes(searchLower) ||
                key.apiKey.substring(0, 8).toLowerCase().includes(searchLower)
            );
        }

        // Provider filter
        if (currentFilters.provider) {
            filtered = filtered.filter((key: any) => key.provider === currentFilters.provider);
        }

        // Status filter
        if (currentFilters.status !== '') {
            const isActive = currentFilters.status === 'active';
            filtered = filtered.filter((key: any) => key.isActive === isActive);
        }

        setFilteredKeys(filtered);
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (keys.length > 0) {
            applyFilters(keys, filters);
        }
    }, [filters, keys]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const headers = { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` };

            const [configRes, keysRes] = await Promise.all([
                fetch(buildApiUrl('super-admin/ai/config'), { headers }),
                fetch(buildApiUrl('super-admin/ai/keys'), { headers })
            ]);

            const configData = await configRes.json();
            const keysData = await keysRes.json();

            if (configData.success) setGlobalConfig(configData.data);
            if (keysData.success) {
                setKeys(keysData.data);
            }

        } catch (err) {
            console.error('Failed to fetch AI data:', err);
            // Mock data for UI development if backend fails (remove later)
            // setError('Failed to load data.');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (field: string) => (event: any) => {
        setFilters({ ...filters, [field]: event.target.value });
    };

    const handleSaveConfig = async (newProvider) => {
        try {
            const response = await fetch(buildApiUrl('super-admin/ai/config'), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    defaultProvider: newProvider !== undefined ? newProvider : globalConfig.defaultProvider,
                    enableFailover: newProvider === undefined && globalConfig.enableFailover !== undefined ? !globalConfig.enableFailover : globalConfig.enableFailover
                })
            });
            const data = await response.json();
            if (data.success) {
                setGlobalConfig(data.data);
                setSuccess(newProvider ? `System now using ${newProvider} exclusively.` : `Failover setting updated.`);
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError('Failed to update configuration.');
        }
    };

    const handleAddKey = async () => {
        try {
            const response = await fetch(buildApiUrl('super-admin/ai/keys'), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...formData,
                    modelName: formData.defaultModel // Map to backend expected field
                })
            });
            const data = await response.json();
            if (data.success) {
                setSuccess('Key added successfully');
                setOpenDialog(false);
                fetchData(); // Reload
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError('Failed to add key.');
        }
    };

    const fetchOllamaModels = async () => {
        if (!formData.baseUrl) {
            setError('Please enter Base URL first (e.g. http://localhost:11434)');
            return;
        }
        try {
            setLoadingModels(true);
            setError(null);

            // Call our new backend proxy
            const response = await fetch(buildApiUrl(`super-admin/ai/ollama/models?baseUrl=${encodeURIComponent(formData.baseUrl)}`), {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
            });
            const data = await response.json();

            if (data.success) {
                setOllamaModels(data.models);
                setSuccess(`Found ${data.models.length} models!`);
            } else {
                setError(data.message);
                setOllamaModels([]);
            }
        } catch (err: any) {
            console.error(err);
            setError(`Failed to fetch models: ${err.message || 'Unknown error'}`);
        } finally {
            setLoadingModels(false);
        }
    };

    const handleDeleteKey = async (id) => {
        if (!window.confirm('Are you sure you want to delete this key?')) return;
        try {
            const response = await fetch(buildApiUrl(`super-admin/ai/keys/${id}`), {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
            });
            if (response.ok) {
                setSuccess('Key deleted.');
                setSelectedKeys([]);
                fetchData();
            }
        } catch (err) { setError('Failed delete.'); }
    };

    const handleToggleKeyStatus = async (id: string, currentStatus: boolean) => {
        try {
            const response = await fetch(buildApiUrl(`super-admin/ai/keys/${id}/active-status`), {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ isActive: !currentStatus })
            });
            if (response.ok) {
                setSuccess(`Key ${!currentStatus ? 'activated' : 'deactivated'}.`);
                fetchData();
            }
        } catch (err) {
            setError('Failed to update key status.');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedKeys.length === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedKeys.length} key(s)?`)) return;

        try {
            const response = await fetch(buildApiUrl('super-admin/ai/keys/bulk-delete'), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ids: selectedKeys })
            });
            const data = await response.json();
            if (data.success) {
                setSuccess(`${data.count} key(s) deleted successfully.`);
                setSelectedKeys([]);
                fetchData();
            } else {
                setError(data.message || 'Failed to delete keys.');
            }
        } catch (err) {
            setError('Failed to delete keys.');
        }
    };

    const handleBulkUpdateStatus = async (isActive: boolean) => {
        if (selectedKeys.length === 0) return;

        try {
            const response = await fetch(buildApiUrl('super-admin/ai/keys/bulk-update-status'), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ids: selectedKeys, isActive })
            });
            const data = await response.json();
            if (data.success) {
                setSuccess(`${data.count} key(s) ${isActive ? 'activated' : 'deactivated'} successfully.`);
                setSelectedKeys([]);
                fetchData();
            } else {
                setError(data.message || 'Failed to update keys status.');
            }
        } catch (err) {
            setError('Failed to update keys status.');
        }
    };

    const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            setSelectedKeys(filteredKeys.map((key: any) => key.id));
        } else {
            setSelectedKeys([]);
        }
    };

    const handleSelectKey = (id: string) => {
        setSelectedKeys(prev =>
            prev.includes(id)
                ? prev.filter(keyId => keyId !== id)
                : [...prev, id]
        );
    };

    const handleUpdateActiveModel = async (keyId: string, modelName: string) => {
        try {
            const response = await fetch(buildApiUrl(`super-admin/ai/keys/${keyId}/active-model`), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ modelName })
            });

            if (response.ok) {
                setSuccess(`Active model updated to ${modelName}`);
                fetchData(); // Refresh UI to reflect changes
            } else {
                setError('Failed to update active model');
            }
        } catch (err) {
            setError('Error updating model');
            console.error(err);
        }
    };

    const activeProviderInfo = PROVIDERS.find(p => p.value === globalConfig.defaultProvider);

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
                <Typography variant="h4" fontWeight="bold">🤖 AI Provider Management</Typography>
                <Button startIcon={<RefreshIcon />} onClick={fetchData}>Refresh</Button>
            </Box>

            {/* Global Switcher */}
            <Card sx={{
                mb: 4,
                borderLeft: '6px solid',
                borderColor: 'primary.main',
                bgcolor: isDark ? 'rgba(0, 150, 255, 0.05)' : '#f8fdff'
            }}>
                <CardContent>
                    <Grid container alignItems="center" spacing={2}>
                        <Grid item xs={12} md={8}>
                            <Typography variant="h6" gutterBottom>System Active Provider</Typography>
                            <Typography variant="body2" color="text.secondary">
                                The selected provider will handle ALL AI requests across the entire system.
                                Ensure you have active keys for the selected provider.
                            </Typography>
                        </Grid>
                        <Grid item xs={12} md={4} textAlign="right">
                            <Stack spacing={2} alignItems="flex-end">
                                <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                                    {activeProviderInfo?.icon}
                                    <TextField
                                        select
                                        label="Active Provider"
                                        value={globalConfig.defaultProvider}
                                        onChange={(e) => handleSaveConfig(e.target.value)}
                                        sx={{ minWidth: 200 }}
                                        size="small"
                                    >
                                        {PROVIDERS.map((p) => (
                                            <MenuItem key={p.value} value={p.value}>
                                                <Box sx={{ display: 'flex', gap: 1 }}>{p.icon} {p.label}</Box>
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Stack>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={globalConfig.enableFailover !== false}
                                            onChange={() => handleSaveConfig(undefined)}
                                            color="primary"
                                        />
                                    }
                                    label={
                                        <Box>
                                            <Typography variant="body2" fontWeight="bold">Smart Failover (Central)</Typography>
                                            <Typography variant="caption" color="text.secondary">Automatically switch to backup providers on failure</Typography>
                                        </Box>
                                    }
                                    sx={{ ml: 0 }}
                                />
                            </Stack>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Errors/Success */}
            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

            {/* Keys List */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
                <Typography variant="h5">API Keys</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>
                    Add New Key
                </Button>
            </Box>

            {/* Filters */}
            <Card sx={{ mb: 2 }}>
                <CardContent>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Search by name, provider, or key..."
                                value={filters.search}
                                onChange={handleFilterChange('search')}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <TextField
                                fullWidth
                                select
                                size="small"
                                label="Provider"
                                value={filters.provider}
                                onChange={handleFilterChange('provider')}
                            >
                                <MenuItem value="">All Providers</MenuItem>
                                {PROVIDERS.map((p) => (
                                    <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <TextField
                                fullWidth
                                select
                                size="small"
                                label="Status"
                                value={filters.status}
                                onChange={handleFilterChange('status')}
                            >
                                <MenuItem value="">All Status</MenuItem>
                                <MenuItem value="active">Active</MenuItem>
                                <MenuItem value="inactive">Inactive</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <Button
                                fullWidth
                                variant="outlined"
                                startIcon={<FilterListIcon />}
                                onClick={() => {
                                    setFilters({ search: '', provider: '', status: '' });
                                }}
                            >
                                Clear
                            </Button>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Bulk Actions Toolbar */}
            {selectedKeys.length > 0 && (
                <Paper sx={{ mb: 2, p: 1, bgcolor: isDark ? 'rgba(25, 118, 210, 0.1)' : 'rgba(25, 118, 210, 0.05)' }}>
                    <Toolbar sx={{ minHeight: '48px !important', px: '16px !important' }}>
                        <Typography sx={{ flex: '1 1 100%' }}>
                            {selectedKeys.length} key(s) selected
                        </Typography>
                        <Stack direction="row" spacing={1}>
                            <Button
                                size="small"
                                variant="outlined"
                                color="success"
                                startIcon={<PlayArrowIcon />}
                                onClick={() => handleBulkUpdateStatus(true)}
                            >
                                Activate
                            </Button>
                            <Button
                                size="small"
                                variant="outlined"
                                color="warning"
                                startIcon={<StopIcon />}
                                onClick={() => handleBulkUpdateStatus(false)}
                            >
                                Deactivate
                            </Button>
                            <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<DeleteIcon />}
                                onClick={handleBulkDelete}
                            >
                                Delete
                            </Button>
                        </Stack>
                    </Toolbar>
                </Paper>
            )}

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    indeterminate={selectedKeys.length > 0 && selectedKeys.length < filteredKeys.length}
                                    checked={filteredKeys.length > 0 && selectedKeys.length === filteredKeys.length}
                                    onChange={handleSelectAll}
                                />
                            </TableCell>
                            <TableCell>Name</TableCell>
                            <TableCell>Provider</TableCell>
                            <TableCell>Active Model</TableCell>
                            <TableCell>Key (Masked)</TableCell>
                            <TableCell>Base URL</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredKeys.length === 0 ? (
                            <TableRow><TableCell colSpan={8} align="center">No keys found.</TableCell></TableRow>
                        ) : filteredKeys.map((key: any) => {
                            // Logic to find active model (Priority 1)
                            // Default to empty string if not found, to match standard Select behavior
                            let activeModel = key.ai_model_configs?.find((m: any) => m.priority === 1 && m.isEnabled)?.modelName || '';

                            // If provider has models list (like we synced for Groq), use it. 
                            const availableModels = key.ai_model_configs?.map((m: any) => m.modelName) || [];

                            // Verify activeModel is actually in the list. if not (e.g. "Default" was saved but not in synced list), reset to empty to avoid warning
                            if (availableModels.length > 0 && activeModel && !availableModels.includes(activeModel)) {
                                activeModel = '';
                            }

                            return (
                                <TableRow key={key.id} selected={selectedKeys.includes(key.id)}>
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            checked={selectedKeys.includes(key.id)}
                                            onChange={() => handleSelectKey(key.id)}
                                        />
                                    </TableCell>
                                    <TableCell>{key.name}</TableCell>
                                    <TableCell>
                                        <Chip
                                            icon={PROVIDERS.find(p => p.value === key.provider)?.icon}
                                            label={key.provider}
                                            size="small"
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {/* Model Selector */}
                                        {availableModels.length > 0 ? (
                                            <TextField
                                                select
                                                size="small"
                                                variant="standard"
                                                value={activeModel}
                                                onChange={(e) => handleUpdateActiveModel(key.id, e.target.value)}
                                                sx={{ minWidth: 150 }}
                                                InputProps={{ disableUnderline: true }}
                                            >
                                                <MenuItem value="">
                                                    <Typography variant="caption" color="text.secondary">Select Model</Typography>
                                                </MenuItem>
                                                {availableModels.map((m: string) => (
                                                    <MenuItem key={m} value={m}>{m}</MenuItem>
                                                ))}
                                            </TextField>
                                        ) : (
                                            <Typography variant="body2">{activeModel}</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>{key.apiKey.substring(0, 8)}...</TableCell>
                                    <TableCell>{key.baseUrl || <Typography color="text.secondary" variant="caption">Default</Typography>}</TableCell>
                                    <TableCell>
                                        {key.isActive ? <Chip label="Active" color="success" size="small" /> : <Chip label="Inactive" size="small" />}
                                    </TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={0.5}>
                                            <IconButton
                                                onClick={() => handleToggleKeyStatus(key.id, key.isActive)}
                                                color={key.isActive ? "warning" : "success"}
                                                size="small"
                                                title={key.isActive ? "Deactivate" : "Activate"}
                                            >
                                                {key.isActive ? <StopIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
                                            </IconButton>
                                            <IconButton onClick={() => handleDeleteKey(key.id)} color="error" size="small"><DeleteIcon fontSize="small" /></IconButton>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Add Key Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add AI Provider Key</DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <TextField
                            label="Key Name (e.g. My DeepSeek Key)"
                            fullWidth
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                        <TextField
                            select
                            label="Provider"
                            fullWidth
                            value={formData.provider}
                            onChange={(e) => {
                                const newProvider = e.target.value;
                                setFormData({
                                    ...formData,
                                    provider: newProvider,
                                    // Pre-fill known working URL for Ollama if empty
                                    baseUrl: newProvider === 'OLLAMA' && !formData.baseUrl ? 'https://ollama.maxp.online' : formData.baseUrl
                                });
                            }}
                        >
                            {PROVIDERS.map((p) => (
                                <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            label="API Key"
                            fullWidth
                            value={formData.apiKey}
                            onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                            type="password"
                        />
                        {(formData.provider === 'DEEPSEEK' || formData.provider === 'OLLAMA') && (
                            <TextField
                                label="Base URL (Optional)"
                                placeholder="https://api.deepseek.com"
                                fullWidth
                                value={formData.baseUrl}
                                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                                helperText={formData.provider === 'OLLAMA' ? "e.g. http://localhost:11434" : "Keep empty for standard cloud API"}
                            />
                        )}

                        {formData.provider === 'OLLAMA' && (
                            <Box>
                                <Stack direction="row" spacing={1} mb={2} alignItems="center">
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={fetchOllamaModels}
                                        disabled={loadingModels || !formData.baseUrl}
                                    >
                                        {loadingModels ? <CircularProgress size={20} /> : 'Fetch Models'}
                                    </Button>
                                    <Typography variant="caption" color="text.secondary">
                                        Click to load available models from your server
                                    </Typography>
                                </Stack>

                                {ollamaModels.length > 0 ? (
                                    <TextField
                                        select
                                        label="Select Model"
                                        fullWidth
                                        value={formData.defaultModel}
                                        onChange={(e) => setFormData({ ...formData, defaultModel: e.target.value })}
                                        helperText="Select the model to use"
                                    >
                                        {ollamaModels.map((model) => (
                                            <MenuItem key={model} value={model}>{model}</MenuItem>
                                        ))}
                                    </TextField>
                                ) : (
                                    <TextField
                                        label="Default Model (Manual Entry)"
                                        placeholder="e.g. llama3"
                                        fullWidth
                                        value={formData.defaultModel}
                                        onChange={(e) => setFormData({ ...formData, defaultModel: e.target.value })}
                                        helperText="Fetch models to select from list, or type manually"
                                    />
                                )}
                            </Box>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAddKey}>Add Key</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default SuperAdminAIProviders;
