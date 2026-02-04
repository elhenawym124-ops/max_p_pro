/**
 * Base Tool Interface
 * All tools must extend this class and implement the execute method
 */
class BaseTool {
    constructor() {
        if (this.constructor === BaseTool) {
            throw new Error('BaseTool is abstract and cannot be instantiated directly');
        }
    }

    /**
     * Tool name (unique identifier)
     */
    get name() {
        throw new Error('Must implement name getter');
    }

    /**
     * Tool description for AI to understand when to use it
     */
    get description() {
        throw new Error('Must implement description getter');
    }

    /**
     * JSON Schema for tool parameters
     */
    get parameters() {
        throw new Error('Must implement parameters getter');
    }

    /**
     * Execute the tool with given arguments
     * @param {Object} args - Tool arguments
     * @param {Object} context - Execution context (companyId, userId, etc.)
     * @returns {Promise<Object>} Tool result
     */
    async execute(args, context) {
        throw new Error('Must implement execute method');
    }
}

module.exports = BaseTool;
