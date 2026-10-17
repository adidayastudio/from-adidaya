import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY; // Using public key for signup

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const USERS = [
    {
        email: "admin@adidayastudio.id",
        password: "password123",
        role: "admin",
    },
    {
        email: "staff@adidayastudio.id",
        password: "password123",
        role: "staff",
    },
];

async function seed() {
    console.log("🌱 Seeding Users...");

    for (const user of USERS) {
        console.log(`Processing ${user.email}...`);

        // 1. Sign Up
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: user.email,
            password: user.password,
        });

        if (authError) {
            console.error(`❌ Error creating auth for ${user.email}:`, authError.message);
            // Continue if user already exists
        } else {
            console.log(`✅ Auth created for ${user.email}`);
        }

        // Note: If email confirmation is enabled, the user won't be able to login immediately
        // unless you manually confirm them in Supabase Dashboard.

        // 2. Assign Role (requires user_id)

        if (authData.user) {
            console.log(`⚠️  User Created! ID: ${authData.user.id}`);
            console.log(`   To assign role '${user.role}', please run this SQL in Supabase Dashboard:`);
            console.log(`   INSERT INTO user_roles (user_id, role) VALUES ('${authData.user.id}', '${user.role}');`);
        } else {
            console.log(`⚠️  User creation initiated. Please check email or dashboard.`);
        }
    }
}

seed();
