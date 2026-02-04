const axios = require('axios');

/**
 * 🔧 Helper: إنشاء WooCommerce API Client
 */
async function createWooClient(settings, enableLogging = true) {
    const { storeUrl, consumerKey, consumerSecret } = settings;
    const cleanUrl = storeUrl.replace(/\/+$/, '');

    const log = (message, data = null) => {
        if (enableLogging) {
            console.log(`[WOO-API] ${message}`, data || '');
        }
    };

    const client = axios.create({
        baseURL: `${cleanUrl}/wp-json/wc/v3`,
        auth: { username: consumerKey, password: consumerSecret },
        timeout: 30000,
    });

    // Add interceptor to log requests and responses
    client.interceptors.request.use(config => {
        log(`${config.method.toUpperCase()} ${config.url}`, { params: config.params });
        return config;
    });

    client.interceptors.response.use(
        response => {
            log(`${response.config.method.toUpperCase()} ${response.config.url} - Success`, {
                status: response.status,
                dataLength: JSON.stringify(response.data).length
            });
            return response;
        },
        error => {
            const { response, request } = error;
            const url = response?.config?.url || request?.url || 'Unknown URL';
            const status = response?.status || 'N/A';
            const message = response?.data?.message || error.message || 'Unknown error';

            log(`❌ Request Error - ${url} - Status: ${status}`, { message, data: response?.data });

            return Promise.reject(error);
        }
    );

    return client;
}

module.exports = {
    createWooClient
};
