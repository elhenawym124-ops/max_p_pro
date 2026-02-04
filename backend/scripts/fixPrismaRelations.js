const fs = require('fs');
const path = require('path');

const schemaDir = path.join(__dirname, '../prisma/schema');
const files = fs.readdirSync(schemaDir).filter(f => f.endsWith('.prisma'));

const pluralToSingular = {
    companies: 'company',
    users: 'user',
    customers: 'customer',
    products: 'product',
    orders: 'order',
    merchants: 'merchant',
    affiliates: 'affiliate',
    categories: 'category',
    tasks: 'task',
    currencies: 'currency',
    invoices: 'invoice',
    subscriptions: 'subscription',
    apps: 'app',
    conversations: 'conversation',
    messages: 'message',
    benefits: 'benefit',
    shifts: 'shift',
    positions: 'position',
    departments: 'department',
    branches: 'branch',
    coupons: 'coupon',
    projects: 'project',
    inventories: 'inventory',
    warehouses: 'warehouse',
    suppliers: 'supplier',
    purchases: 'purchase',
    returns: 'return',
    referrals: 'referral',
    payouts: 'payout',
    commissions: 'commission',
    settings: 'setting',
    configs: 'config',
    rules: 'rule',
    logs: 'log',
    activities: 'activity',
    attachments: 'attachment',
    comments: 'comment',
    watchers: 'watcher',
    checklists: 'checklist',
    items: 'item',
    variants: 'variant',
    reviews: 'review',
    ratings: 'rating',
    notifications: 'notification',
    broadcasts: 'broadcast',
    campaigns: 'campaign',
    pages: 'page',
    posts: 'post',
    accounts: 'account',
    sites: 'site',
    stores: 'store',
    wallets: 'wallet',
    transactions: 'transaction',
    affiliate_payouts: 'affiliate_payout',
    affiliate_products: 'affiliate_product',
    affiliate_referrals: 'affiliate_referral',
    dev_team_members: 'dev_team_member',
    dev_projects: 'dev_project',
    dev_tasks: 'dev_task',
    dev_releases: 'dev_release',
    whatsAppSessions: 'whatsAppSession',
    whatsAppMessages: 'whatsAppMessage'
};

files.forEach(file => {
    const filePath = path.join(schemaDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    const lines = content.split('\n');
    const newLines = lines.map(line => {
        // Match fields: fieldName TypeName @relation or fieldName TypeName? @relation
        // TypeName must start with Capital letter and not end with []
        const match = line.match(/^(\s+)([\w_]+)(\s+)([A-Z]\w+)(\??)(\s+)@relation/);
        if (match) {
            const indent = match[1];
            const fieldName = match[2];
            const typeName = match[4];
            const optional = match[5];
            const rest = line.substring(match[0].length);

            if (pluralToSingular[fieldName]) {
                const singularName = pluralToSingular[fieldName];
                changed = true;
                return `${indent}${singularName}${match[3]}${typeName}${optional}${match[6]}@relation${rest}`;
            }

            // Fallback for names ending in 's' that are not in the map
            if (fieldName.endsWith('s') && !fieldName.endsWith('ss')) {
                // Check if the type is singular
                const singularName = fieldName.slice(0, -1);
                if (singularName !== fieldName) {
                    // Only convert if it looks like a simple plural
                    // changed = true;
                    // return `${indent}${singularName}${match[3]}${typeName}${optional}${match[6]}@relation${rest}`;
                }
            }
        }
        return line;
    });

    if (changed) {
        fs.writeFileSync(filePath, newLines.join('\n'));
        console.log(`Fixed ${file}`);
    }
});
