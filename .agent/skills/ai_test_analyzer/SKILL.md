---
name: ai_test_analyzer
description: Instructions for running and debugging AI integration tests.
---

# AI Test Analyzer Skill

Use this skill when working on the AI features to ensure regressions are caught and fixed.

## 1. Key Scripts
- **Analyze & Fix**: `npm run test:analyze-fix` (Main script: `backend/scripts/analyzeAndFixAITest.js`).
    - Runs the test and tries to automatically suggest or apply fixes.
- **Run & Analyze**: `npm run test:run-and-analyze`
- **Quick Analyze**: `npm run test:quick-analyze`

## 2. Workflow
1.  Make changes to AI logic (e.g., `WhatsAppAIIntegration.js`).
2.  Run the analyzer:
    ```bash
    cd backend
    npm run test:analyze-fix
    ```
3.  Review the output. The script is designed to be self-healing or at least highly diagnostic.
4.  If the test fails, look at the generated report (often a markdown or JSON file referenced in the output).
