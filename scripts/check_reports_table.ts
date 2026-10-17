
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load .env.local
// Load .env.local
import fs from 'fs'
if (fs.existsSync('.env.local')) {
    const envConfig = dotenv.parse(fs.readFileSync('.env.local'))
    for (const k in envConfig) {
        process.env[k] = envConfig[k]
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTable() {
    console.log('Checking project_reports table...')

    // Try to insert a dummy report to see if table exists (will fail constraint or permission but give specific error)
    // Or just select with count
    const { data, error } = await supabase
        .from('project_reports')
        .select('*')
        .limit(1)

    if (error) {
        console.error('Error fetching data:', JSON.stringify(error, null, 2))
        if (error.code === '42P01') {
            console.log('Table does NOT exist (42P01)')
        }
    } else {
        console.log('Table exists. Data length:', data?.length)
        console.log('Sample data:', data)
    }
}

checkTable()
