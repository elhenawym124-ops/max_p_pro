/**
 * 📤 WooCommerce Export Service
 * Centralized logic for exporting local orders to WooCommerce.
 */

const { mapLocalStatusToWoo } = require('./wooCommerceStatusService');

/**
 * Export a single order to WooCommerce.
 * Returns results indicating if it was created or updated.
 */
async function exportSingleOrder(wooClient, order) {
    try {
        // 1. Check if the order should be updated or created
        if (order.wooCommerceId) {
            return await updateOrderInWoo(wooClient, order);
        }

        // 2. Map and Create New Order
        return await createOrderInWoo(wooClient, order);
    } catch (error) {
        throw error;
    }
}

/**
 * Update an existing order in WooCommerce
 */
async function updateOrderInWoo(wooClient, order) {
    // Check if order exists in WooCommerce first
    let orderExists = false;
    try {
        const response = await wooClient.get(`/orders/${order.wooCommerceId}`);
        if (response.data && response.data.id) {
            orderExists = true;
        }
    } catch (error) {
        if (error.response?.status === 404 || error.response?.status === 400) {
            orderExists = false;
        } else {
            throw error;
        }
    }

    if (orderExists) {
        const updateData = {
            status: mapLocalStatusToWoo(order.status),
            customer_note: order.notes || ''
        };

        const response = await wooClient.put(`/orders/${order.wooCommerceId}`, updateData);
        return { status: 'updated', wooOrder: response.data };
    }

    // If not exists, fallback to create
    return await createOrderInWoo(wooClient, order);
}

/**
 * Create a new order in WooCommerce
 */
async function createOrderInWoo(wooClient, order) {
    const wooOrderData = mapLocalToWooOrderData(order);
    const response = await wooClient.post('/orders', wooOrderData);
    return { status: 'created', wooOrder: response.data };
}

/**
 * Map local Prisma Order model to WooCommerce Order format
 */
function mapLocalToWooOrderData(order) {
    const billingFirstName = order.customer?.firstName || order.customerName?.split(' ')[0] || '';
    const billingLastName = order.customer?.lastName || order.customerName?.split(' ').slice(1).join(' ') || '';

    // Handle shipping data
    let shippingData = {};
    if (order.shippingAddress) {
        try {
            const shippingRaw = typeof order.shippingAddress === 'string'
                ? JSON.parse(order.shippingAddress)
                : order.shippingAddress;

            shippingData = {
                first_name: shippingRaw.first_name || shippingRaw.firstName || billingFirstName || '',
                last_name: shippingRaw.last_name || shippingRaw.lastName || billingLastName || '',
                address_1: shippingRaw.address_1 || shippingRaw.address || shippingRaw.address1 || order.customerAddress || '',
                address_2: shippingRaw.address_2 || shippingRaw.address2 || '',
                city: shippingRaw.city || order.city || '',
                state: shippingRaw.state || shippingRaw.province || '',
                postcode: shippingRaw.postcode || shippingRaw.postalCode || shippingRaw.zip || '',
                country: shippingRaw.country || shippingRaw.countryCode || 'EG'
            };
        } catch (e) {
            shippingData = { address_1: order.customerAddress || '', city: order.city || '', country: 'EG' };
        }
    }

    const email = order.customerEmail || order.customer?.email;
    const validEmail = (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) ? email.trim() : undefined;
    const governorate = order.governorate || shippingData.state || order.city || '';

    return {
        status: mapLocalStatusToWoo(order.status),
        billing: {
            first_name: billingFirstName,
            last_name: billingLastName,
            phone: order.customerPhone || order.customer?.phone || '',
            email: validEmail,
            address_1: order.customerAddress || '',
            city: order.city || '',
            state: governorate,
            country: 'EG'
        },
        shipping: {
            ...shippingData,
            first_name: shippingData.first_name || billingFirstName,
            last_name: shippingData.last_name || billingLastName,
            state: governorate,
        },
        line_items: (order.orderItems || []).map(item => {
            let formattedName = item.productName || item.product?.name || 'منتج';
            const details = [];
            if (item.productColor) details.push(item.productColor);
            if (item.productSize) details.push(item.productSize);
            if (item.productDetails) details.push(item.productDetails);

            if (details.length > 0) {
                formattedName = `${formattedName} - ${details.join(' - ')}`;
            }

            return {
                name: formattedName,
                product_id: item.product?.wooCommerceId ? parseInt(item.product.wooCommerceId) : undefined,
                quantity: parseInt(item.quantity) || 1,
                price: parseFloat(item.price) || 0,
                total: String(item.total || (parseFloat(item.price) * parseInt(item.quantity))),
                sku: item.productSku || item.product?.sku
            };
        }),
        customer_note: order.notes || ''
    };
}

module.exports = {
    exportSingleOrder,
    mapLocalToWooOrderData
};
