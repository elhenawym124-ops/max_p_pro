---
name: security_auditor
description: Instructions for running and analyzing security checks using the project's existing scripts.
---

# Security Auditor Skill

This project has a comprehensive suite of security scripts in `backend/scripts/`. Use them to ensure code safety.

## 1. Available Checks
- **Isolation Check**: `npm run security:isolation` (Checks for proper process isolation).
- **Deep Analysis**: `npm run security:deep-summary` (Provides a deep analysis report).
- **Comprehensive**: `npm run security:comprehensive` (Runs all checks).
- **Fix Critical**: `npm run security:fix-critical` (Attempts to auto-fix critical issues).

## 2. Workflow
When asked to audit code or check for security issues:
1.  Run the comprehensive check first:
    ```bash
    cd backend
    npm run security:comprehensive
    ```
2.  Read the output. If there are failures, check the specific report generated (usually in `backend/logs` or printed to stdout).
3.  If issues are found, try running the fix script for critical items:
    ```bash
    npm run security:fix-critical
    ```
4.  Manually review any remaining high-severity issues.

## 3. Semgrep
The project uses Semgrep. Custom rules may be defined in `.semgrep/`. ensure `pip install semgrep` has been run if using `npm run security:quick`.
