
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

console.log("Keys in process.env:");
Object.keys(process.env).forEach(key => {
    if (key.includes('URL') || key.includes('KEY') || key.includes('DB') || key.includes('SUPABASE')) {
        const val = process.env[key] || '';
        const masked = val.length > 10 ? val.substring(0, 5) + '...' + val.slice(-5) : '***';
        console.log(`${key}: ${masked}`);
    }
});
