const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
const content = fs.readFileSync(schemaPath, 'utf8');
const lines = content.split('\n');

console.log('Searching for "model Shift" in ' + schemaPath);

let found = false;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('model Shift') || lines[i].includes('model  Shift')) {
        console.log(`Found at line ${i + 1}: ${lines[i]}`);
        // Print next 20 lines
        for (let j = 1; j <= 40; j++) {
            if (i + j < lines.length) console.log(`${i + 1 + j}: ${lines[i + j]}`);
        }
        found = true;
        break;
    }
}

if (!found) {
    console.log('❌ "model Shift" NOT FOUND in schema.prisma');
    // Try searching for ShiftAssignment
    console.log('Searching for "model ShiftAssignment"...');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('model ShiftAssignment')) {
            console.log(`Found ShiftAssignment at line ${i + 1}: ${lines[i]}`);
            for (let j = 1; j <= 20; j++) {
                if (i + j < lines.length) console.log(`${i + 1 + j}: ${lines[i + j]}`);
            }
        }
    }
}
