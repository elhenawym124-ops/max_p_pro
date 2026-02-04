const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

// Final relation fix for conversion_events
// We match "conversion_events conversion_events[]" or "conversion_events conversion_events?"
content = content.replace(/(\s+)conversion_events\s+conversion_events(\[\]|\?|)(\s+|$)/g, '$1conversion_events ConversionEvent$2$3');

fs.writeFileSync(schemaPath, content);
console.log('Absolute final surgical fix complete.');
