const { getDefaultConfig } = require('expo/metro-config');
const fs = require('fs');
const path = require('path');

// Automatically purge macOS AppleDouble shadow files (._*) in app/ directory
function cleanDotUnderscoreFiles(dir) {
  try {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.name.startsWith('._')) {
        try { fs.unlinkSync(fullPath); } catch (e) {}
      } else if (entry.isDirectory()) {
        cleanDotUnderscoreFiles(fullPath);
      }
    }
  } catch (e) {}
}

cleanDotUnderscoreFiles(path.join(__dirname, 'app'));

const config = getDefaultConfig(__dirname);

// Block Metro from trying to process macOS AppleDouble hidden dotfiles (._*)
config.resolver.blockList = [
  /.*[\/\\]\._.*/,
  /.*[\/\\]\.__.*/,
];

module.exports = config;
