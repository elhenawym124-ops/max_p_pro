const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

// 1. Rename models and add @@map
const modelsToRename = [
  { old: 'affiliate_payouts', new: 'AffiliatePayout' },
  { old: 'affiliate_products', new: 'AffiliateProduct' },
  { old: 'affiliate_referrals', new: 'AffiliateReferral' },
  { old: 'affiliate_settings', new: 'AffiliateSetting' },
  { old: 'affiliates', new: 'Affiliate' },
  { old: 'dev_projects', new: 'DevProject' },
  { old: 'dev_team_members', new: 'DevTeamMember' },
  { old: 'dev_tasks', new: 'DevTask' },
  { old: 'dev_notifications', new: 'DevNotification' },
  { old: 'dev_member_badges', new: 'DevMemberBadge' },
  { old: 'merchants', new: 'Merchant' },
  { old: 'projects', new: 'Project' },
  { old: 'tasks', new: 'Task' },
  { old: 'time_entries', new: 'TimeEntry' },
  { old: 'commissions', new: 'Commission' },
  { old: 'customers', new: 'Customer' },
  { old: 'orders', new: 'Order' },
  { old: 'products', new: 'Product' },
  { old: 'hr_resignations', new: 'Resignation' },
  { old: 'activities', new: 'Activity' },
  { old: 'activity_logs', new: 'ActivityLog' },
  { old: 'ai_chat_messages', new: 'AIChatMessage' },
  { old: 'ai_chat_sessions', new: 'AIChatSession' }
];

modelsToRename.forEach(m => {
  const modelRegex = new RegExp(`model\\s+${m.old}\\s+{`, 'g');
  if (content.match(modelRegex)) {
    content = content.replace(modelRegex, `model ${m.new} {`);
    if (!content.includes(`@@map("${m.old}")`)) {
      // For simplicity, we assume we need to insert @@map. 
      // We'll insert it at the end of the block before the closing brace.
      // But since we are renaming types too, we'll just do a global replacement of model definitions.
    }
  }
});

// 2. Comprehensive Type Replacements
const typeMap = {
  'customers': 'Customer',
  'orders': 'Order',
  'products': 'Product',
  'affiliates': 'Affiliate',
  'affiliate_payouts': 'AffiliatePayout',
  'affiliate_products': 'AffiliateProduct',
  'affiliate_referrals': 'AffiliateReferral',
  'affiliate_settings': 'AffiliateSetting',
  'merchants': 'Merchant',
  'projects': 'Project',
  'tasks': 'Task',
  'time_entries': 'TimeEntry',
  'dev_projects': 'DevProject',
  'dev_team_members': 'DevTeamMember',
  'dev_tasks': 'DevTask',
  'dev_notifications': 'DevNotification',
  'dev_member_badges': 'DevMemberBadge',
  'hr_resignations': 'Resignation',
  'commissions': 'Commission',
  'activities': 'Activity',
  'activity_logs': 'ActivityLog',
  'ai_chat_messages': 'AIChatMessage',
  'ai_chat_sessions': 'AIChatSession'
};

content = content.split('\n').map(line => {
  if (line.trim().startsWith('model ')) return line;
  let newLine = line;
  // Match "  fieldName Type" or "  fieldName Type[]" or "  fieldName Type?"
  const typeFieldRegex = /^(\s+[a-zA-Z0-9_]+\s+)([a-zA-Z0-9_]+)(\?|\[\])?(\s+.*|)$/;
  const match = newLine.match(typeFieldRegex);
  if (match) {
    const fieldName = match[1];
    const typeName = match[2];
    const modifiers = match[3] || '';
    const attributes = match[4] || '';
    if (typeMap[typeName]) {
      return fieldName + typeMap[typeName] + modifiers + attributes;
    }
  }
  return newLine;
}).join('\n');

// 3. Fix duplicate enum
// Remove the one we manually added if it conflicts
const duplicateEnum = 'enum whatsapp_notification_templates_category';
if (content.indexOf(duplicateEnum) !== content.lastIndexOf(duplicateEnum)) {
  // We have a duplicate. Let's remove the one at the end (the one we appended).
  const lastIndex = content.lastIndexOf(duplicateEnum);
  const endOfEnum = content.indexOf('}', lastIndex) + 1;
  content = content.substring(0, lastIndex) + content.substring(endOfEnum);
}

fs.writeFileSync(schemaPath, content);
console.log('Final Schema transformation complete.');
