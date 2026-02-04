---
name: deployment_expert
description: Standard operating procedures for deploying this application.
---

# Deployment Expert Skill

## 1. Deployment Scripts
The project contains deployment automation. Always prefer these over manual commands.
- **Windows**: `deploy.ps1`
- **Linux/Bash**: `deploy.sh`

## 2. Pre-Deployment Checks
Before deploying:
1.  Ensure all tests pass: `npm run test`
2.  Ensure security checks pass: `npm run security:isolation-simple`
3.  Build the schema: `npm run schema:generate`

## 3. Production Setup
If setting up a new environment:
- Run `npm run setup:production`.
- Verify roles using `npm run fix:roles`.
