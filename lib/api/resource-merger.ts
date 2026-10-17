import { createClient as createServerClient } from "@/utils/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function identifyAndMergeDuplicates() {
    console.log("[ResourceMerger] Starting deduplication scan...");
    const supabase = await createServerClient();

    // 1. Fetch all resources
    const { data: resources, error: resErr } = await supabase
        .from('pricing_resources')
        .select('*')
        .order('name');

    if (resErr || !resources) {
        console.error("[ResourceMerger] Error fetching resources:", resErr);
        return { success: false, error: "Failed to fetch resources" };
    }

    console.log(`[ResourceMerger] Scanning ${resources.length} resources...`);

    // 2. Use AI to group similar items
    const groups = await groupSimilarResources(resources);
    console.log(`[ResourceMerger] Identified ${groups.length} merge groups.`);

    let totalMerged = 0;
    for (const group of groups) {
        try {
            const success = await mergeGroup(supabase, group);
            if (success) totalMerged += (group.duplicates.length);
        } catch (err) {
            console.error(`[ResourceMerger] Failed to merge group ${group.canonicalName}:`, err);
        }
    }

    console.log(`[ResourceMerger] Deduplication completed. Merged ${totalMerged} duplicates.`);
    return { success: true, mergedCount: totalMerged };
}

async function groupSimilarResources(resources: any[]) {
    if (resources.length < 2) return [];

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    // We process names in chunks to avoid prompt limits
    const CHUNK_SIZE = 50;
    const allGroups: { canonicalName: string, winnerId: string, duplicates: string[] }[] = [];

    for (let i = 0; i < resources.length; i += CHUNK_SIZE) {
        const chunk = resources.slice(i, i + CHUNK_SIZE);
        const prompt = `
            You are a data cleaning expert for an architecture firm catalog.
            Look at this list of resources and identify items that are EXACTLY the same thing but have slightly different names (e.g., "Paku 7" and "Paku Uk 7").

            Resources:
            ${chunk.map(r => `ID: ${r.id}, Name: "${r.name}"`).join('\n')}

            Rules:
            1. Group items that are functionally identical in real life, even if names vary.
            2. CRITICAL: Identify semantic duplicates like "Beton Decking" vs "Decking", "Ready Mix K-250" vs "Ready Mix", or "Paku Beton 7cm" vs "Paku Beton".
            3. CRITICAL: Ignore numeric suffixes (-1, -2, -10), bracketed sizes, or minor variations like "Pasir Hitam-4" vs "Pasir Hitam".
            4. CRITICAL: Ignore minor prefixes/suffixes like "Uk.", "Size", "Pcs", "Bt", "M", etc.
            5. For each group, pick ONE "ID" as the Winner (shortest/canonical name).
            6. List the "IDs" of the others as Duplicates.
            7. Return a JSON ARRAY of objects: [{"winnerId": "...", "duplicates": ["...", "..."], "canonicalName": "..."}]
            8. If no duplicates are found, return [].
            9. "canonicalName" should be the cleanest version (e.g., "Pasir Hitam", "Ready Mix").

            JSON Output:
        `;

        try {
            const result = await model.generateContent(prompt);
            const text = (await result.response).text();
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const groups = JSON.parse(jsonMatch[0]);
                allGroups.push(...groups);
            }
        } catch (err) {
            console.error("[ResourceMerger] AI Grouping Error:", err);
        }
    }

    return allGroups;
}

async function mergeGroup(supabase: any, group: { winnerId: string, duplicates: string[], canonicalName: string }) {
    const { winnerId, duplicates, canonicalName } = group;
    if (!duplicates || duplicates.length === 0) return false;

    console.log(`[ResourceMerger] Merging into "${canonicalName}" (${winnerId})...`);

    // 1. Update the winner's name to the canonical name if requested
    await supabase.from('pricing_resources').update({ name: canonicalName }).eq('id', winnerId);

    for (const duplicateId of duplicates) {
        // A. Move inventory
        const { data: dupInventory } = await supabase
            .from('resource_inventory')
            .select('*')
            .eq('resource_id', duplicateId);

        for (const entry of (dupInventory || [])) {
            // Check if winner already has entry for this project
            const { data: winEntry } = await supabase
                .from('resource_inventory')
                .select('*')
                .eq('resource_id', winnerId)
                .eq('project_id', entry.project_id)
                .maybeSingle();

            if (winEntry) {
                // Sum it up
                await supabase.from('resource_inventory')
                    .update({
                        quantity_in: Number(winEntry.quantity_in) + Number(entry.quantity_in),
                        quantity_used: Number(winEntry.quantity_used) + Number(entry.quantity_used),
                        quantity_manual_adj: Number(winEntry.quantity_manual_adj) + Number(entry.quantity_manual_adj),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', winEntry.id);

                // Delete the duplicate entry
                await supabase.from('resource_inventory').delete().eq('id', entry.id);
            } else {
                // Just move it
                await supabase.from('resource_inventory')
                    .update({ resource_id: winnerId })
                    .eq('id', entry.id);
            }
        }

        // B. Update sync logs
        await supabase.from('resource_sync_log').update({ resource_id: winnerId }).eq('resource_id', duplicateId);

        // C. Delete the duplicate resource
        const { error: delErr } = await supabase.from('pricing_resources').delete().eq('id', duplicateId);
        if (delErr) {
            console.error(`[ResourceMerger] Could not delete duplicate ${duplicateId}:`, delErr);
        }
    }

    return true;
}
