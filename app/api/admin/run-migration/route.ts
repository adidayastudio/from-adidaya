/**
 * API Route: /api/admin/run-migration
 * Runs the photo columns migration SQL via Supabase RPC.
 * Protected: only callable by admin users.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
    const supabase = await createClient();

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: userRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

    if (!userRole || !["admin", "superadmin", "administrator"].includes(userRole.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Run migration via RPC (exec_sql must exist, or we do individual alters)
    const migrations = [
        `ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS photo_url TEXT`,
        `ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS photo_url TEXT`,
        `ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS check_in_photo_url TEXT`,
        `ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS check_out_photo_url TEXT`,
    ];

    const results: any[] = [];
    for (const sql of migrations) {
        const { error } = await supabase.rpc("exec_sql", { sql });
        results.push({ sql: sql.substring(0, 60) + "...", error: error?.message || null });
    }

    return NextResponse.json({ results });
}
