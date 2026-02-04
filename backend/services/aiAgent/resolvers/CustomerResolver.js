/**
 * Customer Resolver
 * Responsible for formatting customer profile and conversation history.
 */
class CustomerResolver {
    /**
     * Resolve customer context.
     * @returns {Object} Structured customer data
     */
    resolveProfile(customerData, conversationMemory) {
        const orderCount = customerData?.orderCount || 0;
        const isNewCustomer = orderCount === 0;
        const conversationLength = conversationMemory?.length || 0;

        return {
            name: customerData?.name || 'عميل جديد',
            phone: customerData?.phone || 'غير محدد',
            orderCount: orderCount,
            isNewCustomer: isNewCustomer,
            conversationLength: conversationLength,
            stage: conversationLength === 0 ? 'starting' : conversationLength < 3 ? 'early' : 'ongoing'
        };
    }

    /**
     * Resolve conversation history with smart truncation.
     * @returns {Object} Structured history data
     */
    resolveHistory(conversationMemory, limitChars = 2000) {
        if (!conversationMemory || conversationMemory.length === 0) {
            return { hasHistory: false, items: [], truncated: false };
        }

        let currentChars = 0;
        let startIndex = 0;

        // Calculate simplified token/char count backwards
        for (let i = conversationMemory.length - 1; i >= 0; i--) {
            const contentLen = (conversationMemory[i].content || '').length;
            if (currentChars + contentLen > limitChars) {
                startIndex = i + 1;
                break;
            }
            currentChars += contentLen;
        }

        const recentMemory = conversationMemory.slice(startIndex);

        const items = recentMemory.map((interaction, index) => {
            // Calculate time ago (simple Logic or passed helper)
            // Ideally timeAgo logic should be in a utility, but for now we rely on caller or raw dates
            return {
                index: index + 1,
                sender: interaction.isFromCustomer ? 'Customer' : 'AI',
                content: interaction.content,
                timestamp: interaction.createdAt || interaction.timestamp
            };
        });

        return {
            hasHistory: true,
            items: items,
            truncated: startIndex > 0
        };
    }
}

module.exports = new CustomerResolver();
