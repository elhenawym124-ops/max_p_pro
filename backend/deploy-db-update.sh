#!/bin/bash

# 🚀 MaxBot Database Deployment Script
# This script ensures both MySQL and PostgreSQL clients are generated and migrations applied.

echo "🔄 Starting Database Deployment Setup..."
 
# 1. Install Dependencies
echo "📦 Installing/Updating dependencies..."
npm install

# 2. Generate Prisma Client for MySQL (Default)
echo "🔌 Generating Prisma Client for MySQL (Primary)..."
npx prisma generate

# 3. Generate Prisma Client for PostgreSQL (Vector/AI)
# Note: Ensure POSTGRES_PRISMA_SCHEMA is set or use default location if applicable
if [ -f "prisma/postgres/postgres.prisma" ]; then
    echo "🧠 Generating Prisma Client for PostgreSQL (AI Vector Store)..."
    npx prisma generate --schema=prisma/postgres/postgres.prisma
else
    echo "⚠️ Postgres schema not found at prisma/postgres/postgres.prisma, skipping explicit generation."
fi

# 4. Apply Migrations (MySQL)
echo "💾 Applying MySQL Migrations..."
# Using deploy to avoid interactive prompts in production
npx prisma migrate deploy

# 5. Apply Migrations (Postgres - if using Prisma Migrate for it)
if [ -f "prisma/postgres/postgres.prisma" ]; then
    echo "🧠 Applying PostgreSQL Migrations..."
    npx prisma migrate deploy --schema=prisma/postgres/postgres.prisma
fi

echo "✅ Database Deployment Setup Completed Successfully!"
