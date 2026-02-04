const aiAgentService = require('./aiAgentService');

/**
 * Service to handle AI-assisted Developer Tasks
 */
class AiDevTaskService {

    /**
     * Analyze error log and suggest a fix and task details
     * @param {string} errorLog - The error stack trace or log message
     * @param {string} context - Optional context about where the error occurred
     */
    async analyzeErrorAndSuggestTask(errorLog, context = '') {
        const prompt = `
        You are an expert Senior Backend & Frontend Developer.
        Analyze the following error log/stack trace and generate a structured Developer Task to fix it.
        
        Context: ${context}
        
        Error Log:
        """
        ${errorLog}
        """
        
        Return ONLY a raw JSON object (no markdown formatting) with the following structure:
        {
            "title": "Concise task title",
            "description": "Detailed technical description of the issue and the fix. Use Markdown for code blocks.",
            "type": "BUG",
            "priority": "HIGH" (or MEDIUM/LOW/URGENT based on severity),
            "estimatedHours": 2,
            "suggestedFix": "Code snippet or step-by-step fix",
            "tags": ["error", "backend", "auth"]
        }
        `;

        try {
            // Using a high capability model for code analysis
            const response = await aiAgentService.generateAIResponse(
                prompt,
                [],
                false,
                null,
                null, // No specific company ID for system tasks, or use 'SUPER_ADMIN'
                'system_dev_task',
                {}
            );

            return this._parseJson(response.response);
        } catch (error) {
            console.error('AI Dev Task Analysis Failed:', error);
            throw new Error('Failed to analyze error log');
        }
    }

    /**
     * Generate a full task from a brief description
     * @param {string} description - Brief description of the feature or task
     */
    async generateTaskFromDescription(description) {
        const prompt = `
        You are an expert Software Architect.
        Expand the following task description into a detailed Developer Task.
        
        Task Brief: "${description}"
        
        Return ONLY a raw JSON object (no markdown formatting) with the following structure:
        {
            "title": "Professional task title",
            "description": "Comprehensive technical specification. Include subtasks/checklist if complex.",
            "type": "FEATURE" (or ENHANCEMENT/REFACTOR),
            "priority": "MEDIUM",
            "estimatedHours": 4,
            "suggestedImplementation": "Brief implementation guide",
            "tags": ["feature", "frontend"]
        }
        `;

        try {
            const response = await aiAgentService.generateAIResponse(
                prompt,
                [],
                false,
                null,
                null,
                'system_dev_task',
                {}
            );

            return this._parseJson(response.response);
        } catch (error) {
            console.error('AI Task Generation Failed:', error);
            throw new Error('Failed to generate task');
        }
    }

    /**
     * Chat with the System Expert AI
     * @param {string} message - User message
     * @param {Array} history - Conversation history
     */
    /**
     * Chat with the System Expert AI
     * @param {string} message - User message
     * @param {Array} history - Conversation history
     * @param {Object} user - Authenticated user object (required for actions)
     */
    async chatWithSystemExpert(message, history = [], user = null) {
        try {
            const { getSharedPrismaClient } = require('./sharedDatabase');
            const prisma = getSharedPrismaClient();
            let session = null;

            // 1. Get or Create Session (if user exists)
            if (user) {
                session = await this.getUserSession(user.id);
                // Save User Message
                await this.saveMessage(session.id, 'user', message);
            }

            const systemPrompt = `
            You are the "System Expert AI" for this application.
            Your role is to assist the Super Admin with technical questions, code explanations, and system management.
            You have deep knowledge of clean code, security best practices, and the MERN stack.
            
            ## CAPABILITIES & COMMANDS:
            You can execute specific actions when requested.
            
            1. **CREATE_TASK**: usage: "Create a task to [do something]"
               To perform this, your response MUST be a VALID JSON object (and nothing else) in this format:
               {
                 "action": "create_task",
                 "data": {
                   "title": "Task Title",
                   "description": "Task Description",
                   "type": "FEATURE" (or BUG/ENHANCEMENT),
                   "priority": "MEDIUM" (or HIGH/LOW/URGENT),
                   "businessValue": "Why is this needed?",
                   "acceptanceCriteria": "Done when...",
                   "checklist": ["Item 1", "Item 2"]
                 }
               }

            ## GUIDELINES:
            - If the user asks for code advice or explanation, answer normally in markdown text.
            - If the user explicitly asks to CREATE a task, bug, or feature ticket, output the JSON command.
            - Answer concisely and professionally.
            `;

            // Use DB history if available, else fallback to passed history
            let dbHistory = [];
            if (user) {
                dbHistory = await this.getHistory(user.id, 10); // Last 10 messages
            }

            const historyToUse = dbHistory.length > 0 ? dbHistory : history;

            const fullPrompt = `
            ${systemPrompt}
            
            Conversation History:
            ${historyToUse.map(h => `${h.role}: ${h.content}`).join('\n')}
            
            User: ${message}
            AI:
            `;

            const response = await aiAgentService.generateAIResponse(
                fullPrompt,
                [],
                false,
                null,
                null,
                'system_chat', // unique scope
                { temperature: 0.3 }
            );

            let content = response.content || response.response || response.text || '';

            // Check for JSON Command
            if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
                try {
                    const command = JSON.parse(content);
                    if (command.action === 'create_task' && user) {
                        content = await this._handleAIAction(command, user);
                    }
                } catch (e) {
                    console.warn('AI returned JSON-like text but failed to parse/execute:', e);
                }
            }

            // Save AI Response
            if (session) {
                await this.saveMessage(session.id, 'assistant', content);
            }

            return content;
        } catch (error) {
            console.error('AI Chat Failed:', error);
            throw new Error('Failed to get AI response: ' + error.message);
        }
    }

    // --- Persistence Helpers ---

    async getUserSession(userId) {
        const { getSharedPrismaClient } = require('./sharedDatabase');
        const prisma = getSharedPrismaClient();

        // Ensure user has a DevTeamMember profile first
        let member = await prisma.devTeamMember.findFirst({ where: { userId } });
        if (!member) {
            member = await prisma.devTeamMember.create({
                data: { userId, role: 'admin', department: 'Management', name: 'Admin', email: 'admin@example.com' }
            });
        }

        let session = await prisma.aiChatSession.findFirst({
            where: { userId: member.id, isActive: true },
            orderBy: { updatedAt: 'desc' }
        });

        if (!session) {
            session = await prisma.aiChatSession.create({
                data: { userId: member.id, title: 'Session ' + new Date().toLocaleDateString() }
            });
        }
        return session;
    }

    async saveMessage(sessionId, role, content) {
        const { getSharedPrismaClient } = require('./sharedDatabase');
        const prisma = getSharedPrismaClient();
        return await prisma.aiChatMessage.create({
            data: { sessionId, role, content }
        });
    }

    async getHistory(userId, limit = 50) {
        const session = await this.getUserSession(userId);
        if (!session) return [];

        const { getSharedPrismaClient } = require('./sharedDatabase');
        const prisma = getSharedPrismaClient();

        const messages = await prisma.aiChatMessage.findMany({
            where: { sessionId: session.id },
            orderBy: { createdAt: 'desc' }, // Get newest first
            take: limit
        });

        // Reverse to return chronological order for context
        return messages.reverse().map(m => ({ role: m.role, content: m.content }));
    }

    async _handleAIAction(command, user) {
        if (command.action === 'create_task') {
            try {
                const { getSharedPrismaClient } = require('./sharedDatabase'); // Lazy load
                const prisma = getSharedPrismaClient();

                // 1. Find or Create DevTeamMember for the reporter
                let reporter = await prisma.devTeamMember.findFirst({
                    where: { userId: user.id }
                });

                if (!reporter) {
                    reporter = await prisma.devTeamMember.create({
                        data: {
                            userId: user.id,
                            role: 'admin',
                            department: 'Management',
                            name: user.firstName ? `${user.firstName} ${user.lastName}` : 'Admin',
                            email: user.email
                        }
                    });
                }

                // Prepare checklist if exists
                let checklistData = undefined;
                if (command.data.checklist && Array.isArray(command.data.checklist) && command.data.checklist.length > 0) {
                    checklistData = {
                        create: {
                            id: require('crypto').randomUUID(),
                            title: 'Initial Checklist',
                            updatedAt: new Date(),
                            dev_task_checklist_items: {
                                create: command.data.checklist.map((item, index) => ({
                                    id: require('crypto').randomUUID(),
                                    content: item,
                                    position: index,
                                    updatedAt: new Date()
                                }))
                            }
                        }
                    };
                }

                // 2. Create the Task
                const newTask = await prisma.devTask.create({
                    data: {
                        id: require('crypto').randomUUID(),
                        title: command.data.title,
                        description: command.data.description || '',
                        businessValue: command.data.businessValue || null,
                        acceptanceCriteria: command.data.acceptanceCriteria || null,
                        type: command.data.type || 'FEATURE',
                        priority: command.data.priority || 'MEDIUM',
                        status: 'BACKLOG',
                        reporterId: reporter.id,
                        updatedAt: new Date(),
                        dev_task_checklists: checklistData
                    }
                });

                return `✅ **Action Executed Successfully**\n\nI have created the task: **"${newTask.title}"** (ID: \`${newTask.id}\`).\nYou can view it in the Kanban board or Dev Tasks list.`;

            } catch (error) {
                console.error('Failed to execute AI action:', error);
                return `❌ **Action Failed**\n\nI tried to create the task but encountered an error: ${error.message}`;
            }
        }
        return "Unknown action requested.";
    }

    _parseJson(text) {
        try {
            // Remove any markdown code blocks if present
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanText);
        } catch (e) {
            console.error('Failed to parse AI JSON response:', e);
            // Return text as description if JSON parse fails
            return {
                title: "AI Generated Task",
                description: text,
                type: "TASK",
                priority: "MEDIUM"
            };
        }
    }
}

module.exports = new AiDevTaskService();
