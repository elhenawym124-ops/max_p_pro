import { companyAwareApi } from './companyAwareApi';

export interface BotConfig {
    id: string;
    label: string;
    botName?: string;
    username?: string;
    connected: boolean;
    active: boolean;
    running: boolean;
}

export const telegramService = {
    connectBot: async (companyId: string, botToken: string, label?: string) => {
        const response = await companyAwareApi.post('/telegram/settings/connect', {
            botToken,
            label
        });
        return response.data;
    },

    disconnectBot: async (companyId: string, configId: string) => {
        const response = await companyAwareApi.post('/telegram/settings/disconnect', {
            id: configId
        });
        return response.data;
    },

    getStatus: async (companyId: string): Promise<{ bots: BotConfig[] }> => {
        const response = await companyAwareApi.get(`/telegram/settings/status/${companyId}`);
        return response.data;
    }
};
