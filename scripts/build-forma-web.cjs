const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const frontend = path.join(root, 'frontend');
const env = { ...process.env, EXPO_PUBLIC_APP_MODE: 'adidaya', EXPO_PUBLIC_ADIDAYA_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_ADIDAYA_SUPABASE_URL, EXPO_PUBLIC_ADIDAYA_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || process.env.EXPO_PUBLIC_ADIDAYA_SUPABASE_ANON_KEY };
if (!env.EXPO_PUBLIC_ADIDAYA_SUPABASE_URL || !env.EXPO_PUBLIC_ADIDAYA_SUPABASE_ANON_KEY) {
    // Local builds can use the existing untracked dotenv configuration.
    require('dotenv').config({ path: path.join(root, '.env.local'), processEnv: env });
    env.EXPO_PUBLIC_ADIDAYA_SUPABASE_URL ||= env.NEXT_PUBLIC_SUPABASE_URL;
    env.EXPO_PUBLIC_ADIDAYA_SUPABASE_ANON_KEY ||= env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
}
if (!env.EXPO_PUBLIC_ADIDAYA_SUPABASE_URL || !env.EXPO_PUBLIC_ADIDAYA_SUPABASE_ANON_KEY) throw new Error('Existing Adidaya public configuration is missing.');
if (!fs.existsSync(path.join(frontend, 'node_modules'))) {
    const install = spawnSync('npm', ['ci', '--prefix', frontend, '--no-audit', '--no-fund'], { stdio: 'inherit', env });
    if (install.status !== 0) process.exit(install.status || 1);
}
const build = spawnSync('npm', ['run', 'build'], { cwd: frontend, stdio: 'inherit', env });
if (build.status !== 0) process.exit(build.status || 1);
const dist = path.join(frontend, 'dist');
for (const entry of fs.readdirSync(dist)) {
    const name = entry === 'index.html' ? 'forma-index.html' : entry;
    fs.cpSync(path.join(dist, entry), path.join(root, 'public', name), { recursive: true });
}
