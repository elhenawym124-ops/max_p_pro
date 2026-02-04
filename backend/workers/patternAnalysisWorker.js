const cron = require('node-cron');
const patternAnalysisService = require('../services/aiAgent/patternAnalysisService');

// Schedule to run every day at 3 AM
const startPatternAnalysisCron = () => {
    console.log('🕒 [PatternSystem] Initializing Pattern Analysis Cron...');

    // Run at 03:00 AM every day
    // Format: Minute Hour Day Month Weekday
    cron.schedule('0 3 * * *', async () => {
        console.log('🕒 [PatternSystem] Running scheduled daily analysis...');
        await patternAnalysisService.runGlobalDailyAnalysis();
    });

    console.log('✅ [PatternSystem] Cron scheduled for 03:00 AM daily.');
};

module.exports = { startPatternAnalysisCron };
