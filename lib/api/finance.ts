import { supabase } from "@/lib/supabaseClient";
import { FundingSource, FundingSourceType, BankProvider } from "@/lib/types/finance-types";

// -- FETCHING --

export async function fetchFundingSources(workspaceId: string): Promise<FundingSource[]> {
    const { data, error } = await supabase
        .from("funding_sources")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching funding sources:", error);
        return [];
    }

    return (data || []).map(mapDbToFundingSource);
}

// -- SAVING --

export async function upsertFundingSource(source: Partial<FundingSource> & { workspace_id: string }): Promise<FundingSource | null> {
    const dbSource: any = {
        workspace_id: source.workspace_id,
        name: source.name,
        type: source.type,
        provider: source.provider,
        currency: source.currency || "IDR",
        balance: source.balance || 0,
        account_number: source.account_number,
        position: source.position ?? 0,
        is_active: source.is_active ?? true,
        is_archived: source.is_archived ?? false,
        updated_at: new Date().toISOString()
    };

    // Add ID if updating and it's a real UUID
    if (source.id && !source.id.startsWith("fs-")) {
        dbSource.id = source.id;
    }

    let data, error;

    if (dbSource.id) {
        // UPDATE
        const result = await supabase
            .from("funding_sources")
            .update(dbSource)
            .eq("id", dbSource.id)
            .select()
            .single();
        data = result.data;
        error = result.error;
    } else {
        // INSERT
        // Remove ID from object if it's undefined to let DB handle generation
        delete dbSource.id;

        const result = await supabase
            .from("funding_sources")
            .insert(dbSource)
            .select()
            .single();
        data = result.data;
        error = result.error;
    }

    if (error) {
        console.error("Error saving funding source:", error);
        throw error;
    }

    return mapDbToFundingSource(data);
}

export async function updateFundingSourcePositions(items: { id: string; position: number }[]): Promise<boolean> {
    const updates = items.map(item => ({
        id: item.id,
        position: item.position,
        updated_at: new Date().toISOString()
    }));

    // Using upsert for batch update on ID
    const { error } = await supabase
        .from("funding_sources")
        .upsert(updates as any); // Type assertion needed for partial update

    if (error) {
        console.error("Error updating positions:", error);
        return false;
    }
    return true;
}

// -- ACTIONS --

export async function deleteFundingSource(id: string): Promise<boolean> {
    const { error } = await supabase
        .from("funding_sources")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error deleting funding source:", error);
        return false;
    }
    return true;
}

export async function toggleFundingSourceArchive(id: string, isArchived: boolean): Promise<boolean> {
    const { error } = await supabase
        .from("funding_sources")
        .update({ is_archived: isArchived })
        .eq("id", id);

    if (error) {
        console.error("Error archiving funding source:", error);
        return false;
    }
    return true;
}

export async function toggleFundingSourceActive(id: string, isActive: boolean): Promise<boolean> {
    const { error } = await supabase
        .from("funding_sources")
        .update({ is_active: isActive })
        .eq("id", id);

    if (error) {
        console.error("Error toggling funding source status:", error);
        return false;
    }
    return true;
}

// -- MAPPER --

function mapDbToFundingSource(row: any): FundingSource {
    return {
        id: row.id,
        workspace_id: row.workspace_id,
        name: row.name,
        type: row.type as FundingSourceType,
        provider: row.provider as BankProvider,
        currency: row.currency,
        balance: row.balance,
        account_number: row.account_number,
        position: row.position,
        is_active: row.is_active,
        is_archived: row.is_archived,
        created_at: row.created_at,
        updated_at: row.updated_at
    };
}
