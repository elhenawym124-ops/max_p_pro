/**
 * Replace template variables in quick reply content
 * @param content - Template content with variables like {{name}}, {{order_id}}
 * @param variables - Object with variable values
 * @returns Processed content with variables replaced
 */
export const replaceVariables = (
    content: string,
    variables: Record<string, string>
): string => {
    let result = content;

    Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, value);
    });

    return result;
};

/**
 * Extract variable names from template content
 * @param content - Template content
 * @returns Array of variable names
 */
export const extractVariables = (content: string): string[] => {
    const regex = /{{(\w+)}}/g;
    const variables: string[] = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
        if (!variables.includes(match[1])) {
            variables.push(match[1]);
        }
    }

    return variables;
};

/**
 * Get customer/conversation context variables
 */
export const getContextVariables = (conversation: any, user: any): Record<string, string> => {
    return {
        name: conversation?.customerName || 'العميل',
        first_name: conversation?.customerName?.split(' ')?.[0] || 'العميل',
        last_name: conversation?.customerName?.split(' ').slice(1).join(' ') || '',
        order_id: '12345', // من API الطلبات
        price: '150', // من سياق المحادثة/المنتج
        agent_name: user?.firstName + ' ' + user?.lastName || 'فريق الدعم',
        company_name: 'شركتنا',
        phone: '0501234567',
        email: 'info@company.com',
        website: 'www.company.com',
    };
};
