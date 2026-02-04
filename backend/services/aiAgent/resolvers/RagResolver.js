/**
 * RAG Resolver
 * Responsible for formatting RAG data (Products, FAQs, Policies) for the prompt.
 * Now returns structured objects, not strings.
 */
class RagResolver {
    /**
     * Resolve RAG data into a structured format.
     * @returns {Object} Structured RAG context
     */
    resolve(ragData) {
        if (!ragData || ragData.length === 0) return { hasData: false, items: [] };

        const items = ragData.map((item, index) => {
            if (item.type === 'product') {
                // ✅ FIX: Prioritize item.content over compressed.summary to include full details (sizes, colors)
                // item.content contains full hydrated data with sizes/colors, while compressed.summary is shorter
                const content = item.content || (item.compressed ? item.compressed.summary : '');
                
                return {
                    type: 'product',
                    index: index + 1,
                    content: content,
                    metadata: item.metadata ? {
                        id: item.metadata.id,
                        name: item.metadata.name,
                        price: item.metadata.price,
                        category: item.metadata.category,
                        hasValidImages: item.metadata.hasValidImages,
                        images: item.metadata.images, // Keep images for response generation
                        variants: item.metadata.variants // ✅ FIX: Include variants in metadata
                    } : null
                };
            } else if (item.type === 'faq') {
                return {
                    type: 'faq',
                    index: index + 1,
                    content: item.content
                };
            } else if (item.type === 'policy') {
                return {
                    type: 'policy',
                    index: index + 1,
                    content: item.content
                };
            }
            return null;
        }).filter(Boolean);

        return {
            hasData: items.length > 0,
            hasProducts: items.some(i => i.type === 'product'),
            items: items
        };
    }
}

module.exports = new RagResolver();
