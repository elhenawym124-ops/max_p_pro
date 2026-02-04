const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
const content = fs.readFileSync(schemaPath, 'utf8');

const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('model DevTeamMember')) {
        console.log(`Found at line ${i + 1}: ${lines[i]}`);
        // Print next 20 lines
        for (let j = 1; j <= 20; j++) {
            console.log(`${i + 1 + j}: ${lines[i + j]}`);
        }
        break;
    }
}
