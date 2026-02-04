/**
 * 🔧 WooCommerce Status Service
 * Shared logic for mapping WooCommerce statuses to local system statuses.
 */

const defaultStatusMapping = {
    'pending': 'PENDING',
    'processing': 'PROCESSING',
    'on-hold': 'PENDING',
    'completed': 'DELIVERED',
    'cancelled': 'CANCELLED',
    'refunded': 'CANCELLED',
    'failed': 'CANCELLED',
    'trash': 'CANCELLED'
};

const localToWooDefaultMap = {
    'PENDING': 'pending',
    'CONFIRMED': 'processing',
    'PROCESSING': 'processing',
    'SHIPPED': 'processing',
    'DELIVERED': 'completed',
    'CANCELLED': 'cancelled',
    'REFUNDED': 'refunded'
};

/**
 * Maps a WooCommerce status to a local system status.
 * @param {string} wooStatus - The status from WooCommerce.
 * @param {object|string} statusMapping - Custom status mapping settings.
 * @returns {string} - The corresponding local status.
 */
const mapWooStatusToLocal = (wooStatus, statusMapping = null) => {
    if (!wooStatus) return 'PENDING';

    // Handle unexpected statuses that look like dates FIRST (before any mapping)
    if (/^\d{1,2}-\d{1,2}-\d{2,4}$/.test(String(wooStatus))) {
        console.log('🔍 [MAP-STATUS] Detected as DATE format, returning DELIVERED for:', wooStatus);
        return 'DELIVERED';
    }

    // Normalize to lowercase for consistent mapping
    const normalizedStatus = String(wooStatus).toLowerCase().trim();
    console.log('🔍 [MAP-STATUS] Input:', wooStatus, '→ Normalized:', normalizedStatus);

    // Attempt to use custom mapping first
    if (statusMapping) {
        let mapping = statusMapping;
        if (typeof statusMapping === 'string') {
            try {
                mapping = JSON.parse(statusMapping);
            } catch (e) {
                console.error('Error parsing statusMapping:', e);
            }
        }

        if (mapping && mapping[normalizedStatus]) {
            const result = mapping[normalizedStatus];
            console.log('🔍 [MAP-STATUS] Found in CUSTOM mapping:', normalizedStatus, '→', result);
            console.log('🔍 [MAP-STATUS] Full custom mapping:', JSON.stringify(mapping));
            return result;
        }
    }

    // Fallback to default map
    if (defaultStatusMapping[normalizedStatus]) {
        const result = defaultStatusMapping[normalizedStatus];
        console.log('🔍 [MAP-STATUS] Found in defaultMapping:', result);
        return result;
    }

    // Handle "wc-" prefix if present
    const cleanWooStatus = normalizedStatus.startsWith('wc-') ? normalizedStatus.substring(3) : normalizedStatus;
    if (defaultStatusMapping[cleanWooStatus]) {
        const result = defaultStatusMapping[cleanWooStatus];
        console.log('🔍 [MAP-STATUS] Found after removing wc- prefix:', result);
        return result;
    }

    // Guessing logic for unknown statuses
    if (cleanWooStatus.includes('complet') || cleanWooStatus.includes('deliver') || cleanWooStatus.includes('success')) {
        console.log('🔍 [MAP-STATUS] Guessed as DELIVERED from keywords');
        return 'DELIVERED';
    }
    if (cleanWooStatus.includes('process') || cleanWooStatus.includes('confirm') || cleanWooStatus.includes('prepar')) {
        return 'PROCESSING';
    }
    if (cleanWooStatus.includes('cancel') || cleanWooStatus.includes('refund') || cleanWooStatus.includes('reject')) {
        return 'CANCELLED';
    }
    if (cleanWooStatus.includes('hold') || cleanWooStatus.includes('wait') || cleanWooStatus.includes('pend')) {
        return 'PENDING';
    }
    if (cleanWooStatus.includes('ship') || cleanWooStatus.includes('dispatch') || cleanWooStatus.includes('rout')) {
        return 'SHIPPED';
    }

    // Fallback to PENDING for completely unknown statuses
    return 'PENDING';
};

/**
 * Maps a local status to a WooCommerce status.
 * @param {string} localStatus - The status from the local system.
 * @param {object|string} statusMapping - Custom status mapping settings.
 * @returns {string} - The corresponding WooCommerce status.
 */
const mapLocalStatusToWoo = (localStatus, statusMapping = null) => {
    if (!localStatus) return 'pending';

    // Attempt to use custom mapping first (reverse search)
    if (statusMapping) {
        let mapping = statusMapping;
        if (typeof statusMapping === 'string') {
            try {
                mapping = JSON.parse(statusMapping);
            } catch (e) {
                // ignore
            }
        }

        if (mapping) {
            const wooStatus = Object.keys(mapping).find(key => mapping[key] === localStatus);
            if (wooStatus) return wooStatus;
        }
    }

    return localToWooDefaultMap[localStatus] || 'pending';
};

module.exports = {
    mapWooStatusToLocal,
    mapLocalStatusToWoo,
    defaultStatusMapping
};
