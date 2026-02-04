const aiDevTaskService = require('../services/aiDevTaskService');

/**
 * Analyze Error Log Endpoint
 */
exports.analyzeError = async (req, res) => {
    try {
        const { errorLog, context } = req.body;

        if (!errorLog) {
            return res.status(400).json({ success: false, message: 'Error log is required' });
        }

        const taskData = await aiDevTaskService.analyzeErrorAndSuggestTask(errorLog, context);

        res.status(200).json({
            success: true,
            data: taskData
        });
    } catch (error) {
        console.error('Error in analyzeError:', error);
        res.status(500).json({ success: false, message: 'Failed to analyze error', error: error.message });
    }
};

/**
 * Generate Task from Description Endpoint
 */
exports.generateTaskFromBrief = async (req, res) => {
    try {
        const { description } = req.body;

        if (!description) {
            return res.status(400).json({ success: false, message: 'Description is required' });
        }

        const taskData = await aiDevTaskService.generateTaskFromDescription(description);

        res.status(200).json({
            success: true,
            data: taskData
        });
    } catch (error) {
        console.error('Error in generateTaskFromBrief:', error);
        res.status(500).json({ success: false, message: 'Failed to generate task', error: error.message });
    }
};

/**
 * Chat with System Expert Endpoint
 */
exports.chatWithSystemExpert = async (req, res) => {
    try {
        const { message, history } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }

        const response = await aiDevTaskService.chatWithSystemExpert(message, history, req.user);

        res.status(200).json({
            success: true,
            data: response
        });
    } catch (error) {
        console.error('System Expert Chat Error:', error);
        res.status(500).json({ success: false, message: 'Chat failed' });
    }
};

exports.getChatHistory = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const history = await aiDevTaskService.getHistory(req.user.id);
        res.status(200).json({ success: true, data: history });
    } catch (error) {
        console.error('Failed to fetch chat history:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch history' });
    }
};
