const shippingService = require('../../shippingService');

/**
 * Shipping Resolver
 * Responsible for fetching and resolving shipping context data.
 * Pure logic, no formatting.
 */
class ShippingResolver {
    /**
     * Resolve shipping information based on customer message and history.
     * @returns {Promise<Object>} Structured shipping data
     */
    async resolve(customerMessage, companyId, conversationMemory) {
        if (!companyId) return null;

        try {
            // 1. Is asking about shipping?
            const isAsking = shippingService.isAskingAboutShipping(customerMessage);

            // 2. Extract Governorate (from current message or memory)
            let extractedGov = await shippingService.extractGovernorateFromMessage(customerMessage, companyId, conversationMemory);

            // If not found in current message, try memory fallback if user is asking about shipping
            // (Only check memory if they ARE asking, otherwise we might pull stale context)
            if (isAsking && !extractedGov.found) {
                const memoryWithContext = conversationMemory ? conversationMemory.slice(-3) : []; // Look at recent context
                extractedGov = await shippingService.extractGovernorateFromMessage('', companyId, memoryWithContext);
            }

            // 3. Prepare Response Structure
            const result = {
                isAsking: isAsking,
                foundGovernorate: extractedGov.found ? extractedGov.governorate : null,
                shippingInfo: null,
                availableGovernorates: []
            };

            // 4. Fetch Shipping Info if governorate found
            if (extractedGov.found) {
                const info = await shippingService.findShippingInfo(extractedGov.governorate, companyId);
                if (info && info.found) {
                    result.shippingInfo = {
                        governorate: info.governorate,
                        price: info.price,
                        deliveryTime: info.deliveryTime
                    };
                }
            } else if (isAsking) {
                // If asking but no governorate, fetch available options for suggestion
                const available = await shippingService.getAvailableGovernorates(companyId);
                result.availableGovernorates = available.slice(0, 10).map(g => ({
                    name: g.name,
                    price: g.price
                }));
            }

            return result;
        } catch (error) {
            console.error('❌ [SHIPPING-RESOLVER] Error:', error);
            return null;
        }
    }
}

module.exports = new ShippingResolver();
