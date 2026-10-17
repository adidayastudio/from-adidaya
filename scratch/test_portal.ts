import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
    const connectionString = process.env.SUPABASE_DB_URL;
    if (!connectionString) {
        console.error("Missing SUPABASE_DB_URL");
        return;
    }
    const client = new Client({ connectionString });
    await client.connect();
    try {
        const token = '15c1afb9-c38c-44bd-8e40-b04de6655f7b';
        const portalRes = await client.query('SELECT * FROM vendor_portals WHERE token = $1', [token]);
        console.log('Portal:', portalRes.rows);
        if (portalRes.rows.length > 0) {
            const portal = portalRes.rows[0];
            const requestsRes = await client.query('SELECT id, vendor, amount, approval_status, purchase_stage, financial_status, paid_amount, vendor_portal_id FROM purchasing_requests WHERE vendor_portal_id = $1', [portal.id]);
            console.log('Requests count:', requestsRes.rows.length);
            console.log('Requests:', requestsRes.rows);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
run();
