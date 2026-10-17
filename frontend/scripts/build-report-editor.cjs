const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const tailwind = require('tailwindcss');
const root = path.resolve(__dirname, '..');
(async () => {
const out = path.join(root, 'public/report-editor'); fs.mkdirSync(out, { recursive: true });
for (const stale of ['index.html', 'editor.js']) { const file = path.join(out, stale); if (fs.existsSync(file)) fs.unlinkSync(file); }
const result = await postcss([tailwind({ darkMode: 'class', content: [path.join(root, 'report-editor/**/*.{ts,tsx}')], theme: { extend: {} }, plugins: [] })]).process(fs.readFileSync(path.join(root, 'report-editor/editor.css'), 'utf8'), { from: undefined });
fs.writeFileSync(path.join(out, 'editor.css'), result.css);
console.log('Report editor scoped styles built (React renders directly in Reports)');
})().catch(e => { console.error(e); process.exit(1); });
