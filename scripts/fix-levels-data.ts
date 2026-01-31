
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables:', { supabaseUrl, hasKey: !!supabaseKey });
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateLevels() {
    console.log('Cleaning up old levels...');
    const { error: deleteError } = await supabase
        .from('organization_levels')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
        console.error('Error deleting levels:', deleteError);
        return;
    }

    const levels = [
        { code: 'IN', level_code: 0, roman_code: '0', name: 'Internship/Freelance/Outsource', order_index: 0, status: 'Active' },
        { code: 'PB', level_code: 1, roman_code: 'I', name: 'Probation', order_index: 1, status: 'Active' },
        { code: 'JR', level_code: 2, roman_code: 'II', name: 'Junior', order_index: 2, status: 'Active' },
        { code: 'MD', level_code: 3, roman_code: 'III', name: 'Middle', order_index: 3, status: 'Active' },
        { code: 'SR', level_code: 4, roman_code: 'IV', name: 'Senior', order_index: 4, status: 'Active' },
        { code: 'LD', level_code: 5, roman_code: 'V', name: 'Lead', order_index: 5, status: 'Active' }
    ];

    console.log('Inserting new levels...');
    const { error: insertError } = await supabase
        .from('organization_levels')
        .insert(levels);

    if (insertError) {
        console.error('Error inserting levels:', insertError);
    } else {
        console.log('Levels updated successfully!');
    }
}

updateLevels();
