const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../public/brand/padhai-buddy-logo.png');
const outputDir = path.join(__dirname, '../src-tauri/icons');

const sizes = [16, 32, 48, 128, 256, 512];

async function generateIcons() {
  try {
    const buffer = fs.readFileSync(inputFile);
    
    for (const size of sizes) {
      const outputFile = path.join(outputDir, `icon-${size}.png`);
      await sharp(buffer)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(outputFile);
      console.log(`Generated ${outputFile}`);
    }
    
    console.log('All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();