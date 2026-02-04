const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log("🚀 Starting MaxBot Database Deployment Script (Node.js)...");

function runCommand(command) {
    try {
        console.log(`Executing: ${command}`);
        execSync(command, { stdio: 'inherit' });
    } catch (error) {
        console.error(`❌ Error executing command: ${command}`);
        console.error(error.message);
        process.exit(1);
    }
}

// 1. Install Dependencies
console.log("\n📦 Installing/Updating dependencies...");
runCommand('npm install');

// 2. Generate Prisma Client for MySQL (Primary)
console.log("\n🔌 Generating Prisma Client for MySQL (Primary)...");
runCommand('npx prisma generate');

// 3. Generate Prisma Client for PostgreSQL (Vector/AI)
const postgresSchemaPath = path.join(__dirname, 'prisma', 'postgres', 'postgres.prisma');
if (fs.existsSync(postgresSchemaPath)) {
    console.log("\n🧠 Generating Prisma Client for PostgreSQL (AI Vector Store)...");
    runCommand(`npx prisma generate --schema=${postgresSchemaPath}`);
} else {
    console.log("\n⚠️ Postgres schema not found at backend/prisma/postgres.prisma, skipping explicit generation.");
}

// 4. Apply Migrations (MySQL)
console.log("\n💾 Applying MySQL Migrations...");
runCommand('npx prisma migrate deploy');

// 5. Apply Migrations (Postgres)
if (fs.existsSync(postgresSchemaPath)) {
    console.log("\n🧠 Applying PostgreSQL Migrations...");
    runCommand(`npx prisma migrate deploy --schema=${postgresSchemaPath}`);
}

console.log("\n✅ Database Deployment Setup Completed Successfully!");
