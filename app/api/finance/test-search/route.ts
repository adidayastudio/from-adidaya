// app/api/finance/test-search/route.ts
import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/server/supabase";
import { getAuthenticatedUser, successResponse, serverErrorResponse } from "@/lib/server/auth";

export async function GET(request: NextRequest) {
    const { user } = await getAuthenticatedUser();
    if (!user) return serverErrorResponse("Unauthorized");

    const supabase = await createServerSupabase();
    
    // Test 1: fetch from parent
    const { data: reqs } = await supabase.from("purchasing_requests").select("id, description").limit(5);
    
    // Test 2: fetch from child
    const { data: items } = await supabase.from("purchasing_items").select("*").limit(5);

    // Test 3: search child specifically
    const q = request.nextUrl.searchParams.get("q") || "grc";
    let matchingRequestIds: string[] = [];
    const { data: itemMatches } = await supabase
        .from("purchasing_items")
        .select("request_id, name")
        .ilike("name", `%${q}%`);
        
    if (itemMatches && itemMatches.length > 0) {
        matchingRequestIds = itemMatches.map(i => i.request_id);
    }

    return successResponse({
        user: user.id,
        requests: reqs,
        items: items,
        matches: itemMatches,
        q
    });
}
