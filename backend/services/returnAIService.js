const { GoogleGenerativeAI } = require("@google/generative-ai");
const aiAgentService = require('./aiAgentService'); // هذا instance وليس class

class ReturnAIService {
    constructor() {
        this.aiAgentService = aiAgentService; // استخدام الـ instance مباشرة
    }

    async analyzeReturnRequest(returnRequest, customer, order, companyId) {
        try {
            // Get active model/key from AI Agent Service
            const activeKeyData = await this.aiAgentService.getActiveAIKey(companyId);

            if (!activeKeyData || !activeKeyData.apiKey) {
                throw new Error("No active AI model found for this company");
            }

            const genAI = new GoogleGenerativeAI(activeKeyData.apiKey);
            const model = genAI.getGenerativeModel({ model: activeKeyData.modelName || "gemini-pro" });

            const prompt = `
        You are an expert Return Management Specialist. Analyze the following return request and provide a recommendation.

        **Return Request Details:**
        - Reason: ${returnRequest.reason?.reason || 'N/A'}
        - Customer Description: ${returnRequest.customerNotes || 'N/A'}
        - Product: ${order.items?.map(i => i.productName).join(', ') || 'N/A'}
        - Order Date: ${new Date(order.createdAt).toLocaleDateString()}
        - Return Date: ${new Date(returnRequest.createdAt).toLocaleDateString()}

        **Customer Profile:**
        - Success Score: ${customer.successScore || 'N/A'}
        - Rating Tier: ${customer.customerRating || 'UNKNOWN'}
        - Total Orders: ${customer._count?.orders || 0}

        **Task:**
        1. Determine if this return seems legitimate or suspicious.
        2. Recommend whether to APPROVE, REJECT, or MANUAL_REVIEW.
        3. Explain your reasoning.
        4. Suggest a specific reply message to the customer.

        **Output Format (JSON):**
        {
          "recommendation": "APPROVE" | "REJECT" | "MANUAL_REVIEW",
          "confidence": 0.0 to 1.0,
          "riskLevel": "LOW" | "MEDIUM" | "HIGH",
          "reasoning": "string",
          "suggestedReply": "string"
        }
      `;

            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            // Extract JSON from response (remove markdown blocks if present)
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            } else {
                throw new Error("Failed to parse AI response as JSON");
            }

        } catch (error) {
            console.error("Return AI Analysis Failed:", error);
            return {
                recommendation: "MANUAL_REVIEW",
                confidence: 0,
                riskLevel: "UNKNOWN",
                reasoning: "AI Analysis failed: " + error.message,
                suggestedReply: ""
            };
        }
    }
}

module.exports = new ReturnAIService();
