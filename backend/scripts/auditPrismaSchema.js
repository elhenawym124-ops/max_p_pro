const fs = require('fs');
const path = require('path');

const schemaDir = 'c:\\Users\\38asfasf\\Downloads\\max_p_new\\backend\\prisma\\schema';
const files = fs.readdirSync(schemaDir).filter(f => f.endsWith('.prisma'));

const findings = [];

files.forEach(file => {
    const content = fs.readFileSync(path.join(schemaDir, file), 'utf8');
    const modelBlocks = content.split(/model\s+/);

    // Skip the first part before the first model
    for (let i = 1; i < modelBlocks.length; i++) {
        const block = modelBlocks[i];
        const modelNameMatch = block.match(/^(\w+)/);
        if (modelNameMatch) {
            const modelName = modelNameMatch[1];
            const hasMap = block.includes('@@map');
            const hasEnum = block.includes(' enum '); // Just in case split caught an enum

            if (!hasMap) {
                findings.push({ file, modelName, issue: 'Missing @@map' });
            } else {
                const mapMatch = block.match(/@@map\("([^"]+)"\)/);
                if (mapMatch) {
                    const dbName = mapMatch[1];
                    const expectedDbName = modelName.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
                    if (dbName !== expectedDbName && dbName !== modelName.toLowerCase()) {
                        findings.push({
                            file,
                            modelName,
                            issue: 'Inconsistent @@map naming',
                            currentMap: dbName,
                            suggestedMap: expectedDbName
                        });
                    }
                }
            }
        }
    }
});

console.log(JSON.stringify(findings, null, 2));
