const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '../public/icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const svgTemplate = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2563eb;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#grad)"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.4}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">CP</text>
</svg>
`;

console.log('🎨 Generating PWA icons...\n');

sizes.forEach(size => {
  const svgContent = svgTemplate(size);
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(iconsDir, filename);
  
  fs.writeFileSync(filepath, svgContent.trim());
  console.log(`✅ Created ${filename}`);
});

const badgeSvg = `
<svg width="72" height="72" viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg">
  <circle cx="36" cy="36" r="36" fill="#3b82f6"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">C</text>
</svg>
`;

fs.writeFileSync(path.join(iconsDir, 'badge-72x72.svg'), badgeSvg.trim());
console.log('✅ Created badge-72x72.svg');

const shortcutIcons = [
  { name: 'conversations', emoji: '💬' },
  { name: 'products', emoji: '📦' },
  { name: 'orders', emoji: '🛒' }
];

shortcutIcons.forEach(({ name, emoji }) => {
  const svg = `
<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
  <rect width="96" height="96" rx="14" fill="#3b82f6"/>
  <text x="50%" y="50%" font-size="48" text-anchor="middle" dominant-baseline="central">${emoji}</text>
</svg>
  `;
  
  fs.writeFileSync(path.join(iconsDir, `shortcut-${name}.svg`), svg.trim());
  console.log(`✅ Created shortcut-${name}.svg`);
});

console.log('\n✨ Icon generation complete!');
console.log('\n📝 Note: SVG icons created. For production, convert to PNG using:');
console.log('   - Online tool: https://cloudconvert.com/svg-to-png');
console.log('   - Or install sharp: npm install sharp');
console.log('   - Then use a conversion script\n');
