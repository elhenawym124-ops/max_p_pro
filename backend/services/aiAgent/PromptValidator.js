/**
 * Prompt Validator Service
 * 🛡️ Responsibilities:
 * 1. Validate XML structure (syntax check)
 * 2. Enforce required schemas for specific template keys
 */

class PromptValidator {
    constructor() {
        this.REQUIRED_TAGS = {
            'shipping_response': ['shipping_info'],
            'no_shipping_found': ['shipping_error'],
            'post_product_info': ['product_context'],
            'order_confirmation': ['order_confirmation'],
            'no_products_found': ['rag_status'],
            'system_rag_product': ['rag_product'], // Assuming we might want to validate internal templates too
            'system_rag_faq': ['faq_item'],
            'system_rag_policy': ['policy_item']
        };
        this.MAX_TEMPLATE_LENGTH = 10000; // Character limit to prevent ReDoS/DoS
    }

    /**
     * Validate both Syntax and Schema
     * @param {string} key - Template Key
     * @param {string} content - Template Content
     * @returns {Object} { isValid: boolean, error: string }
     */
    validate(key, content) {
        if (!content || typeof content !== 'string') {
            return { isValid: false, error: 'Content must be a non-empty string.' };
        }

        // 0. Security Check: Length
        if (content.length > this.MAX_TEMPLATE_LENGTH) {
            return { isValid: false, error: `Content exceeds max length of ${this.MAX_TEMPLATE_LENGTH} characters.` };
        }

        // 1. Basic Syntax Check (Tags balance)
        const syntaxCheck = this._checkXMLSyntax(content);
        if (!syntaxCheck.isValid) {
            return syntaxCheck;
        }

        // 2. Schema Check (Required Tags)
        const schemaCheck = this._checkRequiredTags(key, content);
        if (!schemaCheck.isValid) {
            return schemaCheck;
        }

        return { isValid: true };
    }

    /**
     * Validates that XML tags are balanced.
     * Note: This is a simplified regex-based check.
     */
    _checkXMLSyntax(content) {
        const stack = [];
        // Regex to match tags: <tag>, </tag>, <tag />
        // Groups: 1=closing slash, 2=tag name, 3=self-closing slash
        const tagRegex = /<\/?([a-zA-Z0-9_\-]+)[^>]*>/g;

        let match;
        while ((match = tagRegex.exec(content)) !== null) {
            const isClosing = match[0].startsWith('</');
            const isSelfClosing = match[0].endsWith('/>');
            const tagName = match[1];

            if (isSelfClosing) continue;

            if (!isClosing) {
                stack.push(tagName);
            } else {
                if (stack.length === 0) {
                    return { isValid: false, error: `Unexpected closing tag </${tagName}> found.` };
                }
                const lastOpen = stack.pop();
                if (lastOpen !== tagName) {
                    return { isValid: false, error: `Mismatched tags: Expected </${lastOpen}> but found </${tagName}>.` };
                }
            }
        }

        if (stack.length > 0) {
            return { isValid: false, error: `Unclosed tag(s): ${stack.map(t => `<${t}>`).join(', ')}` };
        }

        return { isValid: true };
    }

    /**
     * Checks if content contains required root tags for the given key.
     */
    _checkRequiredTags(key, content) {
        const required = this.REQUIRED_TAGS[key];
        if (!required) return { isValid: true }; // No specific schema for this key

        for (const tag of required) {
            // Check for opening tag existence
            // We allow attributes, so <tag ...> matches
            const regex = new RegExp(`<${tag}[>\\s]`);
            if (!regex.test(content)) {
                return {
                    isValid: false,
                    error: `Missing required tag <${tag}> for template '${key}'.`
                };
            }
        }

        return { isValid: true };
    }
}

module.exports = new PromptValidator();
