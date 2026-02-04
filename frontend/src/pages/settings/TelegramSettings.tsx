import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuthSimple';
import { telegramService } from '../../services/telegramService';
import { toast } from 'react-hot-toast';
import { apiClient } from '../../services/apiClient';
import { PaperAirplaneIcon, CpuChipIcon, CheckCircleIcon, XCircleIcon, UserIcon, KeyIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../hooks/useTheme';

const TelegramSettings = () => {
    const { user } = useAuth();
    const { derivedTheme } = useTheme();
    const [activeTab, setActiveTab] = useState<'bots' | 'userbots'>('bots');

    // Bots State
    const [bots, setBots] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newBotToken, setNewBotToken] = useState('');
    const [newBotLabel, setNewBotLabel] = useState('');

    // Userbots State
    const [userbots, setUserbots] = useState<any[]>([]);
    const [showAddUserbotForm, setShowAddUserbotForm] = useState(false);

    // Connection Wizard State
    const [connectionStep, setConnectionStep] = useState<'INIT' | 'OTP' | '2FA' | 'RECONNECT_PHONE'>('INIT');
    const [currentConfigId, setCurrentConfigId] = useState<string | null>(null);
    const [phoneCodeHash, setPhoneCodeHash] = useState<string | null>(null);

    // Form Fields
    const [newUserbotLabel, setNewUserbotLabel] = useState('');
    const [newUserbotApiId, setNewUserbotApiId] = useState('');
    const [newUserbotApiHash, setNewUserbotApiHash] = useState('');
    const [newUserbotPhone, setNewUserbotPhone] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [password, setPassword] = useState('');

    const [showApiHash, setShowApiHash] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (user?.companyId) {
            checkStatus();
            loadUserbots();
        }
    }, [user?.companyId]);

    const checkStatus = async () => {
        if (!user?.companyId) return;
        try {
            setIsChecking(true);
            const data = await telegramService.getStatus(user.companyId);
            setBots(data.bots || []);
        } catch (error) {
            console.error('Failed to fetch status:', error);
            toast.error('Failed to load bots');
        } finally {
            setIsChecking(false);
        }
    };

    const loadUserbots = async () => {
        if (!user?.companyId) return;
        try {
            const response = await apiClient.get('/telegram/userbots');
            setUserbots(response.data.data || []);
        } catch (error: any) {
            console.error('Failed to load userbots:', error);
            if (error.response?.status !== 404) {
                toast.error('Failed to load userbots');
            }
        }
    };

    const resetForm = () => {
        setNewUserbotLabel('');
        setNewUserbotApiId('');
        setNewUserbotApiHash('');
        setNewUserbotPhone('');
        setVerificationCode('');
        setPassword('');
        setConnectionStep('INIT');
        setCurrentConfigId(null);
        setShowAddUserbotForm(false);
    };

    const handleStartConnection = async () => {
        if (!user?.companyId) return;

        // Validation based on mode
        if (connectionStep === 'INIT') {
            if (!newUserbotApiId || !newUserbotApiHash || !newUserbotPhone) {
                toast.error('Please fill in all required fields');
                return;
            }
        } else if (connectionStep === 'RECONNECT_PHONE') {
            if (!newUserbotPhone) {
                toast.error('Please enter phone number');
                return;
            }
        }

        try {
            setIsLoading(true);
            let configId = currentConfigId;

            // 1. Create Userbot Config (Only if INIT)
            if (connectionStep === 'INIT') {
                const createResponse = await apiClient.post('/telegram/userbots', {
                    label: newUserbotLabel || 'Telegram Userbot',
                    apiId: newUserbotApiId,
                    apiHash: newUserbotApiHash
                });
                configId = createResponse.data.data.id;
                setCurrentConfigId(configId);
            }

            if (!configId) {
                throw new Error("Configuration ID missing");
            }

            // 2. Request Login Code
            // Note: This matches the backend route /api/userbot/login which might be outside /api/v1
            // or we might need to adjust it if it's supposed to be under /api/v1/telegram
            // Looking at the previous code it was `${apiUrl}/api/userbot/login`
            // apiClient prepends /api/v1, so we might need to use a relative path if it's different.
            // Let's assume it's /api/v1/telegram/userbot/login or similar if refactored, 
            // but the original code used /api/userbot/login.
            // If apiClient.baseURL is /api/v1, then '../../userbot/login' would work if axios supports it.
            // Better to check if the backend has /api/v1/telegram/userbot/login.
            // For now, I'll use the path as if it's under v1, or if it's absolute.
            const loginResponse = await apiClient.post('/telegram/userbot/login', {
                userbotConfigId: configId,
                phoneNumber: newUserbotPhone
            });

            if (loginResponse.data.success) {
                toast.success('Code sent to your Telegram account!');
                setPhoneCodeHash(loginResponse.data.phoneCodeHash);
                setConnectionStep('OTP');
            } else {
                toast.error('Failed to send code: ' + loginResponse.data.error);
            }

        } catch (error: any) {
            toast.error('Connection failed: ' + (error.response?.data?.error || error.message));
        } finally {
            setIsLoading(false);
        }
    };

    const handleAskReconnect = (userbot: any) => {
        setCurrentConfigId(userbot.id);
        setNewUserbotPhone(userbot.clientPhone || '');
        setNewUserbotLabel(userbot.label || '');
        setConnectionStep('RECONNECT_PHONE');
        setShowAddUserbotForm(true);
    };

    const handleVerifyCode = async () => {
        if (!verificationCode || !currentConfigId) return;

        try {
            setIsLoading(true);

            const verifyResponse = await apiClient.post('/telegram/userbot/verify', {
                userbotConfigId: currentConfigId,
                code: verificationCode,
                password: password // Sent only if set
            });

            if (verifyResponse.data.success) {
                toast.success('Userbot Connected Successfully!');
                loadUserbots();
                resetForm();
            } else {
                if (verifyResponse.data.requiresPassword) {
                    toast.error('Two-Step Verification Required');
                    setConnectionStep('2FA');
                } else {
                    toast.error('Verification failed: ' + verifyResponse.data.error);
                }
            }
        } catch (error: any) {
            // Handle 401 specifically for generic auth failure, but check if it's password required
            const errorData = error.response?.data;
            if (errorData?.requiresPassword || errorData?.error?.includes('PASSWORD_REQUIRED')) {
                toast.error('Two-Step Verification Required');
                setConnectionStep('2FA');
            } else {
                toast.error('Verification failed: ' + (errorData?.error || error.message));
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteUserbot = async (userbotId: string) => {
        if (!window.confirm('Are you sure you want to delete this userbot?')) return;
        if (!user?.companyId) return;

        try {
            setIsLoading(true);
            await apiClient.delete(`/telegram/userbots/${userbotId}`);
            toast.success('Userbot deleted');
            loadUserbots();
        } catch (error: any) {
            toast.error('Failed to delete userbot: ' + (error.response?.data?.error || error.message));
        } finally {
            setIsLoading(false);
        }
    };

    const handleConnect = async () => {
        if (!newBotToken) {
            toast.error('Please enter a Bot Token');
            return;
        }

        if (!user?.companyId) return;

        try {
            setIsLoading(true);
            await telegramService.connectBot(user.companyId, newBotToken, newBotLabel);
            toast.success('Telegram Bot Connected Successfully!');
            setNewBotToken('');
            setNewBotLabel('');
            setShowAddForm(false);
            checkStatus();
        } catch (error: any) {
            toast.error('Connection Failed: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisconnect = async (configId: string) => {
        if (!window.confirm('Are you sure you want to disconnect this bot?')) return;
        if (!user?.companyId) return;

        try {
            setIsLoading(true);
            await telegramService.disconnectBot(user.companyId, configId);
            toast.success('Bot Disconnected');
            checkStatus();
        } catch (error: any) {
            toast.error('Disconnect Failed: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsLoading(false);
        }
    };

    if (isChecking) {
        return <div className="p-8 text-center">Loading Telegram Status...</div>;
    }

    return (
        <div className={`p-6 w-full ${derivedTheme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <PaperAirplaneIcon className="w-10 h-10 text-sky-500 transform -rotate-45" />
                    <h1 className={`text-3xl font-bold ${derivedTheme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Telegram Integration</h1>
                </div>
            </div>

            {/* Tabs */}
            <div className={`flex gap-2 mb-6 ${derivedTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <button
                    onClick={() => setActiveTab('bots')}
                    className={`px-4 py-2 font-medium transition-colors ${activeTab === 'bots'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : derivedTheme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Telegram Bots
                </button>
                <button
                    onClick={() => setActiveTab('userbots')}
                    className={`px-4 py-2 font-medium transition-colors ${activeTab === 'userbots'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : derivedTheme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Telegram Userbots
                </button>
            </div>

            {/* Bots Tab */}
            {activeTab === 'bots' && (
                <>
                    {!showAddForm && (
                        <div className="mb-4 flex justify-end">
                            <button
                                onClick={() => setShowAddForm(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2"
                            >
                                <span>+ Add New Bot</span>
                            </button>
                        </div>
                    )}

                    {/* Helper Text */}
                    <div className={`${derivedTheme === 'dark' ? 'bg-blue-900 border-blue-800 text-white' : 'bg-blue-50 border-blue-100 text-blue-800'} rounded-xl p-4 mb-6`}>
                        <p className={`text-sm ${derivedTheme === 'dark' ? 'text-white' : 'text-blue-800'}`}>
                            Connect your Telegram Bots to manage support, sales, or other channels.
                            Create bots via <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="font-semibold underline">@BotFather</a>.
                        </p>
                    </div>

                    {/* List of Bots */}
                    <div className="space-y-4 mb-8">
                        {bots.length === 0 && !showAddForm && (
                            <div className={`text-center py-12 ${derivedTheme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl border-dashed border-2`}>
                                <CpuChipIcon className={`w-12 h-12 ${derivedTheme === 'dark' ? 'text-gray-600' : 'text-gray-300'} mx-auto mb-3`} />
                                <h3 className={`text-lg font-medium ${derivedTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>No Bots Connected</h3>
                                <p className={`${derivedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'} mb-4`}>Add your first bot to get started.</p>
                                <button
                                    onClick={() => setShowAddForm(true)}
                                    className="text-blue-600 font-medium hover:underline"
                                >
                                    Connect a Bot
                                </button>
                            </div>
                        )}

                        {bots.map((bot) => (
                            <div className={`${derivedTheme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-xl shadow-sm p-6 flex items-center justify-between`}>
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 ${derivedTheme === 'dark' ? 'bg-sky-900 text-sky-400' : 'bg-sky-100 text-sky-600'} rounded-full`}>
                                        <CpuChipIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className={`font-bold text-lg ${derivedTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{bot.label}</h3>
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <span>@{bot.username || 'unknown_bot'}</span>
                                            {bot.running ? (
                                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">Running</span>
                                            ) : (
                                                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs">Stopped</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDisconnect(bot.id)}
                                    disabled={isLoading}
                                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors border border-gray-200 hover:border-red-100 text-sm"
                                >
                                    Disconnect
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Add Bot Form */}
                    {showAddForm && (
                        <div className={`${derivedTheme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-lg p-6 animate-fade-in-up`}>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className={`text-xl font-bold ${derivedTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Connect New Bot</h2>
                                <button onClick={() => setShowAddForm(false)} className={derivedTheme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}>
                                    <XCircleIcon className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className={`block text-sm font-medium ${derivedTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Label (Optional)</label>
                                    <input
                                        type="text"
                                        value={newBotLabel}
                                        onChange={(e) => setNewBotLabel(e.target.value)}
                                        placeholder="e.g. Sales Bot, Support Team"
                                        className={`w-full p-3 ${derivedTheme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium ${derivedTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Bot API Token</label>
                                    <input
                                        type="text"
                                        value={newBotToken}
                                        onChange={(e) => setNewBotToken(e.target.value)}
                                        placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                                        className={`w-full p-3 ${derivedTheme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm`}
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={handleConnect}
                                        disabled={isLoading || !newBotToken}
                                        className={`flex-1 py-3 rounded-lg font-medium text-white transition-all ${isLoading || !newBotToken
                                            ? 'bg-blue-300 cursor-not-allowed'
                                            : 'bg-blue-600 hover:bg-blue-700 shadow-md'
                                            }`}
                                    >
                                        {isLoading ? 'Connecting...' : 'Connect Bot'}
                                    </button>
                                    <button
                                        onClick={() => setShowAddForm(false)}
                                        disabled={isLoading}
                                        className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Userbots Tab */}
            {activeTab === 'userbots' && (
                <>
                    {!showAddUserbotForm && (
                        <div className="mb-4 flex justify-end">
                            <button
                                onClick={() => setShowAddUserbotForm(true)}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2"
                            >
                                <UserIcon className="w-5 h-5" />
                                <span>+ Add New Userbot</span>
                            </button>
                        </div>
                    )}

                    {/* Helper Text */}
                    <div className={`${derivedTheme === 'dark' ? 'bg-green-900 border-green-800 text-white' : 'bg-green-50 border-green-100 text-green-800'} rounded-xl p-4 mb-6`}>
                        <p className={`text-sm ${derivedTheme === 'dark' ? 'text-white' : 'text-green-800'}`}>
                            Connect your personal Telegram accounts to manage chats directly from the dashboard.
                            Get API credentials from <a href="https://my.telegram.org/apps" target="_blank" rel="noopener noreferrer" className="font-semibold underline">my.telegram.org/apps</a>.
                        </p>
                    </div>

                    {/* List of Userbots */}
                    <div className="space-y-4 mb-8">
                        {userbots.length === 0 && !showAddUserbotForm && (
                            <div className={`text-center py-12 ${derivedTheme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl border-dashed border-2`}>
                                <UserIcon className={`w-12 h-12 ${derivedTheme === 'dark' ? 'text-gray-600' : 'text-gray-300'} mx-auto mb-3`} />
                                <h3 className={`text-lg font-medium ${derivedTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>No Userbots Connected</h3>
                                <p className={`${derivedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'} mb-4`}>Add your first userbot to get started.</p>
                                <button
                                    onClick={() => setShowAddUserbotForm(true)}
                                    className="text-green-600 font-medium hover:underline"
                                >
                                    Add Userbot
                                </button>
                            </div>
                        )}

                        {userbots.map((userbot) => (
                            <div className={`${derivedTheme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-xl shadow-sm p-6 flex items-center justify-between`}>
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 ${derivedTheme === 'dark' ? 'bg-green-900 text-green-400' : 'bg-green-100 text-green-600'} rounded-full`}>
                                        <UserIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className={`font-bold text-lg ${derivedTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{userbot.label}</h3>
                                        <div className={`flex items-center gap-2 text-sm ${derivedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                            <span>API ID: {userbot.apiId ? '***' + userbot.apiId.slice(-4) : 'Not set'}</span>
                                            {userbot.sessionString ? (
                                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">Connected</span>
                                            ) : (
                                                <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs">Not Connected</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteUserbot(userbot.id)}
                                    disabled={isLoading}
                                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors border border-gray-200 hover:border-red-100 text-sm"
                                >
                                    Delete
                                </button>
                                {!userbot.sessionString && (
                                    <button
                                        onClick={() => handleAskReconnect(userbot)}
                                        disabled={isLoading}
                                        className="ml-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors border border-gray-200 hover:border-blue-100 text-sm"
                                    >
                                        Connect
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Add Userbot Form (Wizard) */}
                    {showAddUserbotForm && (
                        <div className={`${derivedTheme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-lg p-6 animate-fade-in-up`}>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className={`text-xl font-bold ${derivedTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                    {connectionStep === 'INIT' && 'Add New Userbot'}
                                    {connectionStep === 'RECONNECT_PHONE' && 'Reconnect Userbot'}
                                    {connectionStep === 'OTP' && 'Verify Phone Number'}
                                    {connectionStep === '2FA' && 'Two-Step Verification'}
                                </h2>
                                <button onClick={resetForm} className={derivedTheme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}>
                                    <XCircleIcon className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Step 1: Initial Info */}
                                {connectionStep === 'INIT' && (
                                    <>
                                        <div>
                                            <label className={`block text-sm font-medium ${derivedTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Label (Optional)</label>
                                            <input
                                                type="text"
                                                value={newUserbotLabel}
                                                onChange={(e) => setNewUserbotLabel(e.target.value)}
                                                placeholder="e.g. Personal Account, Sales Account"
                                                className={`w-full p-3 ${derivedTheme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} rounded-lg focus:ring-2 focus:ring-green-500 outline-none`}
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className={`block text-sm font-medium ${derivedTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                                    API ID <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={newUserbotApiId}
                                                    onChange={(e) => setNewUserbotApiId(e.target.value)}
                                                    placeholder="12345678"
                                                    className={`w-full p-3 ${derivedTheme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} rounded-lg focus:ring-2 focus:ring-green-500 outline-none font-mono text-sm`}
                                                />
                                            </div>
                                            <div>
                                                <label className={`block text-sm font-medium ${derivedTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                                    API Hash <span className="text-red-500">*</span>
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type={showApiHash ? 'text' : 'password'}
                                                        value={newUserbotApiHash}
                                                        onChange={(e) => setNewUserbotApiHash(e.target.value)}
                                                        placeholder="API Hash"
                                                        className={`w-full p-3 ${derivedTheme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} rounded-lg focus:ring-2 focus:ring-green-500 outline-none font-mono text-sm pr-12`}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowApiHash(!showApiHash)}
                                                        className={`absolute right-3 top-1/2 -translate-y-1/2 ${derivedTheme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                                                    >
                                                        {showApiHash ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <p className={`text-xs ${derivedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'} -mt-2`}>Get API credentials from <a href="https://my.telegram.org/apps" target="_blank" rel="noopener noreferrer" className="text-green-600 underline">my.telegram.org/apps</a></p>

                                        <div>
                                            <label className={`block text-sm font-medium ${derivedTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                                Phone Number <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="tel"
                                                value={newUserbotPhone}
                                                onChange={(e) => setNewUserbotPhone(e.target.value)}
                                                placeholder="+1234567890"
                                                className={`w-full p-3 ${derivedTheme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} rounded-lg focus:ring-2 focus:ring-green-500 outline-none font-mono`}
                                            />
                                        </div>

                                        <div className="flex gap-3 pt-2">
                                            <button
                                                onClick={handleStartConnection}
                                                disabled={isLoading || !newUserbotApiId || !newUserbotApiHash || !newUserbotPhone}
                                                className={`flex-1 py-3 rounded-lg font-medium text-white transition-all ${isLoading || !newUserbotApiId || !newUserbotApiHash || !newUserbotPhone
                                                    ? 'bg-green-300 cursor-not-allowed'
                                                    : 'bg-green-600 hover:bg-green-700 shadow-md'
                                                    }`}
                                            >
                                                {isLoading ? 'Sending Code...' : 'Next & Send Code'}
                                            </button>
                                            <button
                                                onClick={resetForm}
                                                disabled={isLoading}
                                                className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </>
                                )}

                                {/* Step 2: OTP */}
                                {connectionStep === 'OTP' && (
                                    <>
                                        <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-lg mb-4">
                                            <p className={`text-sm ${derivedTheme === 'dark' ? 'text-yellow-800' : 'text-yellow-800'}`}>
                                                We've sent a verification code to your Telegram account (not SMS).
                                                Please check your Telegram messages.
                                            </p>
                                        </div>
                                        <div>
                                            <label className={`block text-sm font-medium ${derivedTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                                Verification Code <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={verificationCode}
                                                onChange={(e) => setVerificationCode(e.target.value)}
                                                placeholder="12345"
                                                className={`w-full p-3 ${derivedTheme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} rounded-lg focus:ring-2 focus:ring-green-500 outline-none font-mono text-lg tracking-widest text-center`}
                                                maxLength={5}
                                            />
                                        </div>
                                        <div className="flex gap-3 pt-2">
                                            <button
                                                onClick={handleVerifyCode}
                                                disabled={isLoading || !verificationCode}
                                                className={`flex-1 py-3 rounded-lg font-medium text-white transition-all ${isLoading || !verificationCode
                                                    ? 'bg-green-300 cursor-not-allowed'
                                                    : 'bg-green-600 hover:bg-green-700 shadow-md'
                                                    }`}
                                            >
                                                {isLoading ? 'Verifying...' : 'Verify Code'}
                                            </button>
                                            <button
                                                onClick={resetForm}
                                                disabled={isLoading}
                                                className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </>
                                )}

                                {/* Step 1.5: Reconnect (Phone Only) */}
                                {connectionStep === 'RECONNECT_PHONE' && (
                                    <>
                                        <div>
                                            <div className={`${derivedTheme === 'dark' ? 'bg-blue-900 border-blue-800' : 'bg-blue-50 border-blue-100'} p-4 rounded-lg mb-4`}>
                                                <p className={`text-sm ${derivedTheme === 'dark' ? 'text-blue-400' : 'text-blue-800'}`}>
                                                    Enter your phone number to receive a login code for <strong>{newUserbotLabel}</strong>.
                                                    <br />
                                                    <span className={`text-xs ${derivedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>API Credentials are already saved.</span>
                                                </p>
                                            </div>
                                            <label className={`block text-sm font-medium ${derivedTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                                Phone Number <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="tel"
                                                value={newUserbotPhone}
                                                onChange={(e) => setNewUserbotPhone(e.target.value)}
                                                placeholder="+1234567890"
                                                className={`w-full p-3 ${derivedTheme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} rounded-lg focus:ring-2 focus:ring-green-500 outline-none font-mono`}
                                            />
                                        </div>

                                        <div className="flex gap-3 pt-2">
                                            <button
                                                onClick={handleStartConnection}
                                                disabled={isLoading || !newUserbotPhone}
                                                className={`flex-1 py-3 rounded-lg font-medium text-white transition-all ${isLoading || !newUserbotPhone
                                                    ? 'bg-green-300 cursor-not-allowed'
                                                    : 'bg-green-600 hover:bg-green-700 shadow-md'
                                                    }`}
                                            >
                                                {isLoading ? 'Sending Code...' : 'Send Login Code'}
                                            </button>
                                            <button
                                                onClick={resetForm}
                                                disabled={isLoading}
                                                className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </>
                                )}

                                {/* Step 3: 2FA Password */}
                                {connectionStep === '2FA' && (
                                    <>
                                        <div className={`${derivedTheme === 'dark' ? 'bg-red-900 border-red-800' : 'bg-red-50 border-red-100'} p-4 rounded-lg mb-4`}>
                                            <p className={`text-sm ${derivedTheme === 'dark' ? 'text-red-400' : 'text-red-800'}`}>
                                                Two-Step Verification is enabled on this account. Please enter your cloud password.
                                            </p>
                                        </div>
                                        <div>
                                            <label className={`block text-sm font-medium ${derivedTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                                                Cloud Password <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    placeholder="Your 2FA Password"
                                                    className={`w-full p-3 ${derivedTheme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} rounded-lg focus:ring-2 focus:ring-green-500 outline-none pr-12`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${derivedTheme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                                                >
                                                    {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 pt-2">
                                            <button
                                                onClick={handleVerifyCode}
                                                disabled={isLoading || !password}
                                                className={`flex-1 py-3 rounded-lg font-medium text-white transition-all ${isLoading || !password
                                                    ? 'bg-green-300 cursor-not-allowed'
                                                    : 'bg-green-600 hover:bg-green-700 shadow-md'
                                                    }`}
                                            >
                                                {isLoading ? 'Verifying...' : 'Complete Login'}
                                            </button>
                                            <button
                                                onClick={resetForm}
                                                disabled={isLoading}
                                                className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default TelegramSettings;

