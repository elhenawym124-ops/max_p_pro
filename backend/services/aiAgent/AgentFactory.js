const LegacyAgent = require('./legacy/LegacyAgent');
const ModernAgent = require('./modern/ModernAgent');

class AgentFactory {
    constructor(serviceLocator) {
        this.serviceLocator = serviceLocator; // Access to aiAgentService, etc.
    }

    getAgent(settings) {
        if (settings && settings.useModernAgent) {
            console.log('🚀 [AGENT-FACTORY] Switching to MODERN Agent (Function Calling)');
            return new ModernAgent(this.serviceLocator);
        }
        console.log('🕰️ [AGENT-FACTORY] Using LEGACY Agent (Prompt Engineering)');
        return new LegacyAgent(this.serviceLocator);
    }
}

module.exports = AgentFactory;
