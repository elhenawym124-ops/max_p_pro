const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const backupPath = path.join(__dirname, '..', 'prisma', 'schema.prisma.mysql.backup');

console.log('📝 Converting Prisma schema from MySQL to SQLite...');

// Read the schema file
let schema = fs.readFileSync(schemaPath, 'utf8');

// Backup the original schema
fs.writeFileSync(backupPath, schema, 'utf8');
console.log('✅ Backup created at:', backupPath);

// Remove MySQL-specific type annotations
schema = schema.replace(/@db\.Text/g, '');
schema = schema.replace(/@db\.LongText/g, '');
schema = schema.replace(/@db\.MediumText/g, '');
schema = schema.replace(/@db\.VarChar\(\d+\)/g, '');
schema = schema.replace(/@db\.Char\(\d+\)/g, '');
schema = schema.replace(/@db\.TinyInt/g, '');
schema = schema.replace(/@db\.SmallInt/g, '');
schema = schema.replace(/@db\.MediumInt/g, '');
schema = schema.replace(/@db\.Int/g, '');
schema = schema.replace(/@db\.BigInt/g, '');
schema = schema.replace(/@db\.UnsignedInt/g, '');
schema = schema.replace(/@db\.Date/g, '');
schema = schema.replace(/@db\.Time/g, '');
schema = schema.replace(/@db\.Timestamp\(\d+\)/g, '');
schema = schema.replace(/@db\.Decimal\(\d+,\s*\d+\)/g, '');
schema = schema.replace(/@db\.Double/g, '');
schema = schema.replace(/@db\.Float/g, '');
schema = schema.replace(/@db\.Json/g, '');
schema = schema.replace(/@db\.Blob/g, '');

// Clean up any double spaces that might have been created
schema = schema.replace(/  +/g, ' ');
// Clean up spaces before newlines
schema = schema.replace(/ +\n/g, '\n');

// Write the cleaned schema
fs.writeFileSync(schemaPath, schema, 'utf8');

console.log('✅ Schema converted successfully!');
console.log('📝 MySQL-specific annotations removed');
console.log('💾 Original schema backed up to: schema.prisma.mysql.backup');
console.log('\n🚀 You can now run: npx prisma migrate dev --name init_sqlite');
