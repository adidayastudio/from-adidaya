/**
 * API Route: /api/admin/backfill-photos
 * 
 * Scans the 'attendance_photos' Supabase Storage bucket,
 * parses filenames to extract userId + type (IN/OUT) + timestamp,
 * then updates attendance_records with the public photo URL.
 * 
 * File naming convention: {userId}-{IN|OUT}-{timestamp_ms}.jpg
 * 
 * Run once via: POST /api/admin/backfill-photos
 * Protected by admin check.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const STORAGE_BUCKET = "attendance_photos";
const SUPABASE_PROJECT_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export async function POST(req: NextRequest) {
    const supabase = await createClient();

    // Verify the caller is an admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: userRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

    if (!userRole || !["admin", "superadmin", "administrator"].includes(userRole.role)) {
        return NextResponse.json({ error: "Forbidden: Admin only" }, { status: 403 });
    }

    // List all files in the bucket
    const { data: files, error: listError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .list("", { limit: 10000, sortBy: { column: "created_at", order: "desc" } });

    if (listError || !files) {
        return NextResponse.json({ error: "Failed to list storage files", details: listError }, { status: 500 });
    }

    const results = { processed: 0, updated: 0, skipped: 0, errors: 0 };

    for (const file of files) {
        const name = file.name;
        // Expected format: {userId}-{IN|OUT}-{timestamp_ms}.jpg
        // userId can contain hyphens (UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
        // So we need a smarter regex
        const match = name.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-(IN|OUT)-(\d+)\.(jpg|jpeg|png|webp)$/i);
        
        if (!match) {
            results.skipped++;
            continue;
        }

        results.processed++;
        const [, userId, type, timestampMs] = match;
        const photoDate = new Date(parseInt(timestampMs));
        const dateStr = photoDate.toLocaleDateString("en-CA"); // YYYY-MM-DD
        const publicUrl = `${SUPABASE_PROJECT_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${name}`;

        try {
            // Check if record exists
            const { data: record } = await supabase
                .from("attendance_records")
                .select("id, check_in_photo_url, check_out_photo_url")
                .eq("user_id", userId)
                .eq("date", dateStr)
                .maybeSingle();

            if (!record) {
                results.skipped++;
                continue;
            }

            // Only update if the photo URL is not already set
            if (type === "IN" && !record.check_in_photo_url) {
                await supabase
                    .from("attendance_records")
                    .update({ check_in_photo_url: publicUrl })
                    .eq("id", record.id);
                results.updated++;
            } else if (type === "OUT" && !record.check_out_photo_url) {
                await supabase
                    .from("attendance_records")
                    .update({ check_out_photo_url: publicUrl })
                    .eq("id", record.id);
                results.updated++;
            } else {
                results.skipped++; // Already has a photo URL
            }
        } catch (err) {
            console.error("Backfill error for file:", name, err);
            results.errors++;
        }
    }

    return NextResponse.json({
        success: true,
        message: `Backfill complete. ${results.updated} records updated.`,
        stats: results,
        totalFiles: files.length
    });
}
