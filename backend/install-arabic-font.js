// Script to download and install Arabic font for PDF generation
const fs = require('fs');
const path = require('path');
const https = require('https');

const FONT_URL = 'https://fonts.gstatic.com/s/notosansarabic/v18/nwpxtLGrOAZMl5nJ_wfgRg3DrWFZWsnVBJ_sS6tlqHHFlhQ5l3sQWIHPqzCfyGyvu3CBFQLaig.woff2';
const FONTS_DIR = path.join(__dirname, 'fonts');
const FONT_PATH = path.join(FONTS_DIR, 'NotoSansArabic-Regular.woff2');

async function downloadFont() {
  try {
    // Create fonts directory if it doesn't exist
    if (!fs.existsSync(FONTS_DIR)) {
      fs.mkdirSync(FONTS_DIR, { recursive: true });
      console.log('✅ Created fonts directory');
    }

    // Check if font already exists
    if (fs.existsSync(FONT_PATH)) {
      console.log('✅ Arabic font already exists');
      return;
    }

    console.log('📥 Downloading Arabic font...');

    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(FONT_PATH);
      
      https.get(FONT_URL, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download font: ${response.statusCode}`));
          return;
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          console.log('✅ Arabic font downloaded successfully');
          resolve();
        });

        file.on('error', (err) => {
          fs.unlink(FONT_PATH, () => {}); // Delete the file on error
          reject(err);
        });
      }).on('error', (err) => {
        reject(err);
      });
    });

  } catch (error) {
    console.error('❌ Error downloading Arabic font:', error.message);
    
    // Create a placeholder file with instructions
    const instructions = `
# Arabic Font Installation Instructions

To properly display Arabic text in PDFs, you need to install an Arabic font.

## Option 1: Download Noto Sans Arabic
1. Go to: https://fonts.google.com/noto/specimen/Noto+Sans+Arabic
2. Download the font files
3. Place the .ttf file in this directory as 'NotoSansArabic-Regular.ttf'

## Option 2: Use system fonts
The PDF service will fallback to system fonts that support Arabic:
- Arial Unicode MS
- Times New Roman

## Current Status
Arabic text processing is enabled with basic RTL support.
For best results, install a proper Arabic font.
`;

    fs.writeFileSync(path.join(FONTS_DIR, 'README.txt'), instructions);
    console.log('📝 Created font installation instructions');
  }
}

// Run the download
if (require.main === module) {
  downloadFont().catch(console.error);
}

module.exports = { downloadFont };
