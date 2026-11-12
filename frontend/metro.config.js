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

// Expo serves this directory in development and copies it into web exports.
const pdfPackage = path.dirname(require.resolve('pdfjs-dist/package.json'));
const pdfAssets = path.join(__dirname, 'public', 'pdfjs');
fs.mkdirSync(pdfAssets, { recursive: true });
for (const file of ['pdf', 'pdf.worker']) {
  fs.copyFileSync(path.join(pdfPackage, 'legacy', 'build', `${file}.min.mjs`), path.join(pdfAssets, `${file}.mjs`));
}
for (const entry of ['cmaps', 'iccs', 'standard_fonts', 'wasm', 'LICENSE']) {
  fs.cpSync(path.join(pdfPackage, entry), path.join(pdfAssets, entry), { recursive: true });
}

const config = getDefaultConfig(__dirname);

// Block Metro from trying to process macOS AppleDouble hidden dotfiles (._*)
config.resolver.blockList = [
  /.*[\/\\]\._.*/,
  /.*[\/\\]\.__.*/,
];

// Use the existing web adapter without rewriting component paths: wrappers
// may re-export a .ios file, so redirecting that path creates self imports.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && ['@expo/ui/swift-ui', '@expo/ui/swift-ui/modifiers'].includes(moduleName)) {
    return { type: 'sourceFile', filePath: path.join(__dirname, 'lib/swiftui.web.ts') };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
