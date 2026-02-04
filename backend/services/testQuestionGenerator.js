const fs = require('fs');
const path = require('path');

class TestQuestionGenerator {
    constructor() {
        this.questionsPath = path.join(__dirname, 'ai-test-questions.json');
    }

    async generateTestQuestions(companyId) {
        try {
            const data = await fs.promises.readFile(this.questionsPath, 'utf8');
            const questionsData = JSON.parse(data);

            // In a real scenario, we might customize questions based on companyId
            // For now, we return the static questions but add company context if needed

            // Ensure the structure matches what analyzeAndFixAITest.js expects
            // It expects methods like questions.greeting, questions.product_inquiry etc.
            // The JSON has "categories" object which contains these keys.
            // But the usage in analyzeAndFixAITest.js is: testQuestionsData.questions.greeting

            const questionsWithCategories = {};

            // Map categories to the expected structure
            if (questionsData.categories) {
                // We need to flatten the structure slightly or just map it
                // analyzing analyzeAndFixAITest.js:
                // testQuestionsData.questions.greeting.slice(0, 3)
                // So testQuestionsData.questions must be an object where keys are categories 
                // and values are arrays of questions.

                for (const [key, category] of Object.entries(questionsData.categories)) {
                    questionsWithCategories[key] = category.questions;
                }

                // Add general_inquiry mapping which seems to be mapped to support_inquiry or complex_cases in JSON?
                // The usage asks for: general_inquiry
                // The JSON has: support_inquiry, complex_cases
                // Let's map general_inquiry to complex_cases + support_inquiry to be safe or just support_inquiry
                if (!questionsWithCategories.general_inquiry) {
                    questionsWithCategories.general_inquiry = [
                        ...(questionsData.categories.complex_cases?.questions || []),
                        ...(questionsData.categories.support_inquiry?.questions || [])
                    ];
                }
            }

            return {
                questions: questionsWithCategories,
                metadata: questionsData.metadata
            };

        } catch (error) {
            console.error('Error generating test questions:', error);
            throw error;
        }
    }
}

module.exports = new TestQuestionGenerator();
