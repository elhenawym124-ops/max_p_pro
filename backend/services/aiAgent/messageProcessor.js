/**
 * Message Processor Module (Router)
 * 
 * This module now acts as a ROUTER/PROXY.
 * It decides whether to use the Legacy Agent (2023) or the Modern Agent (2026/Function Calling)
 * based on the company's configuration.
 */

const { getSharedPrismaClient, safeQuery } = require('../sharedDatabase');
const AgentFactory = require('./AgentFactory');
const { safeJsonParse } = require('../../utils/jsonUtils'); // Still needed for safeJsonParse

class MessageProcessor {
  constructor(aiAgentService) {
    this.aiAgentService = aiAgentService;
    this.agentFactory = new AgentFactory(aiAgentService);
  }

  /**
   * Process customer message and generate AI response
   */
  async processCustomerMessage(messageData) {
    console.log(`📡 [MESSAGE-PROCESSOR] Routing message...`);

    try {
      // 1. Resolve Company ID to fetch settings
      let companyId = messageData.companyId || messageData.customerData?.companyId;

      // Fallback: Try to resolve from customer ID if not present
      if (!companyId && messageData.customerData?.id) {
        // Minimal Query just to get ID
        const customer = await safeQuery(async () => {
          const prisma = getSharedPrismaClient();
          return await prisma.customer.findUnique({
            where: { id: messageData.customerData.id },
            select: { companyId: true }
          });
        }, 5);
        if (customer) companyId = customer.companyId;
      }

      // 2. Fetch Settings (needed for the switch)
      let settings = null;
      if (companyId) {
        settings = await this.aiAgentService.getSettings(companyId);
      }

      // 3. Get Correct Agent
      const agent = this.agentFactory.getAgent(settings);

      // 4. Delegate Execution
      // Both agents implement `processCustomerMessage` with the same signature
      const result = await agent.processCustomerMessage(messageData);

      // 5. Inject Agent Mode Metadata
      if (result && typeof result === 'object') {
        const isModern = settings && settings.useModernAgent;
        result.agentMode = isModern ? 'MODERN' : 'LEGACY';
      }

      return result;

    } catch (error) {
      console.error('❌ [ROUTER-ERROR] Failed to route message:', error);
      // Fallback to Legacy if routing fails? Or just return error?
      // Best to return error so we know something is wrong with the router itself.
      return {
        success: false,
        error: error.message,
        content: null,
        silent: true,
        reason: 'ROUTER_ERROR'
      };
    }
  }
}

module.exports = MessageProcessor;
