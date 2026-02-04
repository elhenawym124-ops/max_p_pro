const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

// The duplicate block starts around 6419 with HRAuditLog
// and ends before MarketplaceApp at 7050.
// We'll remove specific models that we know are duplicates.

const duplicatesToRemove = [
    'HRAuditLog',
    'HRSettings',
    'AdvanceRequest',
    // 'ClearanceChecklist', // Check if exists? error log says yes
    'LateWarning',
    'Asset',
    'AssetCategory',
    'AssetAssignment',
    'AssetMaintenance',
    'AssetCustodyHistory',
    'AssetRequest',
    'AssetAudit',
    'AssetAttachment',
    'Appointment',
    'AiTrace',
    'AiTraceStep',
    'StoreVisit',
    'ProductVisit',
    'ConversionEvent',
    'DailyAnalytics',
    'ProductAnalytics'
];

duplicatesToRemove.forEach(name => {
    // Match model Name { ... } including nested braces
    // This is hard with regex, so we'll do a simple search and find the end brace
    const searchStr = `model ${name} {`;
    let index = content.indexOf(searchStr);
    while (index !== -1) {
        // Find the matching closing brace
        let openBraces = 0;
        let foundBrace = false;
        let endIdx = -1;
        for (let i = index; i < content.length; i++) {
            if (content[i] === '{') openBraces++;
            if (content[i] === '}') {
                openBraces--;
                if (openBraces === 0) {
                    endIdx = i + 1;
                    foundBrace = true;
                    break;
                }
            }
        }
        if (foundBrace) {
            // We only remove the SECOND or subsequent occurrences if the model name is exactly the same, 
            // OR if the first occurrence is in the huge duplicate block.
            // In this specific schema, we know the "good" ones are at the beginning and the "bad" ones are at the end.
            const firstIndex = content.indexOf(searchStr);
            if (index > firstIndex) {
                console.log(`Removing duplicate model: ${name} at index ${index}`);
                content = content.substring(0, index) + content.substring(endIdx);
            } else {
                // Move to the next one
                index = content.indexOf(searchStr, endIdx);
            }
        } else {
            break;
        }
    }
});

fs.writeFileSync(schemaPath, content);
console.log('Duplicate model purge complete.');
