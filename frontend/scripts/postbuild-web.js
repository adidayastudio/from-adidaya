const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const publicDir = path.join(__dirname, '..', 'public');
const htmlFile = path.join(distDir, 'index.html');

if (fs.existsSync(distDir)) {
  // 1. Copy all optimized assets from public/ to dist/ root
  if (fs.existsSync(publicDir)) {
    const files = fs.readdirSync(publicDir);
    for (const f of files) {
      fs.cpSync(path.join(publicDir, f), path.join(distDir, f), { recursive: true });
    }
    console.log('[postbuild-web] Synced public assets to dist root');
  }

  // 2. Ensure meta tags exist in dist/index.html
  if (fs.existsSync(htmlFile)) {
    let html = fs.readFileSync(htmlFile, 'utf8');
    html = html.replace(/<title>.*?<\/title>/, '<title>Adidaya Studio</title>');
    const pwaTags = `
    <link rel="icon" type="image/png" href="/favicon.png" />
    <link rel="shortcut icon" href="/favicon.ico" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <link rel="apple-touch-icon-precomposed" href="/apple-touch-icon-precomposed.png" />
    <link rel="manifest" href="/manifest.json" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Adidaya" />
    <meta name="application-name" content="Adidaya" />
`;

    if (!html.includes('rel="manifest"')) {
      html = html.replace('</head>', `${pwaTags}</head>`);
      fs.writeFileSync(htmlFile, html, 'utf8');
      console.log('[postbuild-web] PWA tags injected into dist/index.html');
    }
  }
}
