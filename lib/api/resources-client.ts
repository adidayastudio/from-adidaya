import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

export interface ResourceInventoryItem {
    id: string;
    resource_id: string;
    project_id: string;
    quantity_in: number;
    quantity_used: number;
    quantity_manual_adj: number;
    resource: {
        name: string;
        category: string;
        subcategory?: string;
        group_name?: string;
        unit: string;
        price_default: number;
    };
    project: {
        project_name: string;
        project_code: string;
    };
}

export async function fetchResourceInventory(category: string, signal?: AbortSignal) {
    const { data, error } = await supabase
        .from('resource_inventory')
        .select(`
            *,
            resource:pricing_resources(name, category, subcategory, group_name, unit, price_default),
            project:projects(project_name, project_code)
        `)
        .eq('resource.category', category)
        .abortSignal(signal as any);

    if (error) {
        if (signal?.aborted) return [];
        throw error;
    }
    return data as ResourceInventoryItem[];
}

export async function triggerResourceSync(startDate?: string) {
    const response = await fetch('/api/resources/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate })
    });
    return response.json();
}

export async function triggerResourceMerge() {
    const response = await fetch('/api/resources/merge', {
        method: 'POST'
    });
    return response.json();
}

export async function updateManualAdjustment(inventoryId: string, adjustment: number) {
    const { data, error } = await supabase
        .from('resource_inventory')
        .update({
            quantity_manual_adj: adjustment,
            updated_at: new Date().toISOString()
        })
        .eq('id', inventoryId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function fetchResourceOverviewData(signal?: AbortSignal) {
    try {
        const [matCount, toolCount, assetCount, svcCount] = await Promise.all([
            supabase.from('resource_inventory').select('id', { count: 'exact', head: true }).eq('resource.category', 'material').abortSignal(signal as any),
            supabase.from('resource_inventory').select('id', { count: 'exact', head: true }).eq('resource.category', 'tool').abortSignal(signal as any),
            supabase.from('resource_inventory').select('id', { count: 'exact', head: true }).eq('resource.category', 'asset').abortSignal(signal as any),
            supabase.from('resource_inventory').select('id', { count: 'exact', head: true }).eq('resource.category', 'service').abortSignal(signal as any),
        ]);

        const { data: inventory, error: invError } = await supabase
            .from('resource_inventory')
            .select(`
                quantity_in, quantity_used, quantity_manual_adj,
                resource:pricing_resources(name, category, subcategory, group_name, unit)
            `)
            .abortSignal(signal as any);

        if (invError && !signal?.aborted) throw invError;

        const { data: recentSyncs, error: syncError } = await supabase
            .from('resource_sync_log')
            .select(`
                *,
                project:projects(project_name)
            `)
            .order('created_at', { ascending: false })
            .limit(5)
            .abortSignal(signal as any);

        if (syncError && !signal?.aborted) throw syncError;

        const stats = {
            materials: matCount.count || 0,
            tools: toolCount.count || 0,
            assets: assetCount.count || 0,
            services: svcCount.count || 0,
            lowStock: (inventory || []).filter((i: any) => {
                const remaining = Number(i.quantity_in) - Number(i.quantity_used) + Number(i.quantity_manual_adj);
                return remaining <= 0;
            }).length
        };

        const activity = (recentSyncs || []).map((log: any) => ({
            time: new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            project: log.project?.project_name || 'Global',
            action: 'Synced',
            item: `${log.metadata?.originalName || 'Item'} (${log.metadata?.qty || 0})`
        }));

        return { stats, inventory: inventory?.slice(0, 50), activity };
    } catch (error: any) {
        const isAbort = error.name === 'AbortError' ||
            error.message?.includes('AbortError') ||
            error.message?.includes('The operation was aborted');

        if (isAbort) return null;

        console.error("Error fetching overview data:", error);
        return null;
    }
}

export interface CatalogResource {
    id: string;
    name: string;
    category: string;
    subcategory: string | null;
    group_name: string | null;
    unit: string;
    price_default: number;
    description: string | null;
}

export async function fetchCatalogResources(
    category: string,
    options?: {
        search?: string;
        subcategory?: string;
        group_name?: string;
        onlyWithStock?: boolean;
        limit?: number;
        offset?: number;
        signal?: AbortSignal;
    }
): Promise<{ data: CatalogResource[]; count: number }> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    // Base query
    let query = supabase
        .from('pricing_resources')
        .select(`
            id, name, category, subcategory, group_name, unit, price_default, description
        `, { count: 'exact' })
        .eq('category', category.toLowerCase());

    // Filtering
    if (options?.search) {
        query = query.ilike('name', `%${options.search}%`);
    }
    if (options?.subcategory && options.subcategory !== 'ALL') {
        query = query.eq('subcategory', options.subcategory);
    }
    if (options?.group_name && options.group_name !== 'ALL') {
        query = query.eq('group_name', options.group_name);
    }

    // Logic for "onlyWithStock"
    // For now, we simulate this by filtering if no other filters are present
    // To do this perfectly in SQL, we'd need a view or an RPC.
    // Client-side can also handle it for the "Overview" list.

    query = query
        .order('subcategory', { ascending: true, nullsFirst: false })
        .order('group_name', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true })
        .range(offset, offset + limit - 1);

    if (options?.signal) {
        query = query.abortSignal(options.signal as any);
    }

    const { data, error, count } = await query;
    if (error) {
        if (error.message?.includes('AbortError')) return { data: [], count: 0 };
        throw error;
    }
    return { data: (data || []) as CatalogResource[], count: count || 0 };
}

export async function fetchCatalogSubcategories(category: string): Promise<string[]> {
    const { data, error } = await supabase
        .from('pricing_resources')
        .select('subcategory')
        .eq('category', category.toLowerCase())
        .not('subcategory', 'is', null)
        .order('subcategory', { ascending: true });

    if (error) return [];
    const unique = [...new Set((data || []).map((d: any) => d.subcategory).filter(Boolean))];
    return unique as string[];
}

export async function fetchCatalogGroups(category: string, subcategory?: string): Promise<string[]> {
    let query = supabase
        .from('pricing_resources')
        .select('group_name')
        .eq('category', category.toLowerCase())
        .not('group_name', 'is', null)
        .order('group_name', { ascending: true });

    if (subcategory && subcategory !== 'ALL') {
        query = query.eq('subcategory', subcategory);
    }

    const { data, error } = await query;
    if (error) return [];
    const unique = [...new Set((data || []).map((d: any) => d.group_name).filter(Boolean))];
    return unique as string[];
}

export async function searchCatalogResources(query: string, category?: string) {
    let select = supabase
        .from('pricing_resources')
        .select('id, name, category, subcategory, group_name, unit, price_default')
        .ilike('name', `%${query}%`)
        .order('name', { ascending: true })
        .limit(10);

    if (category) {
        select = select.eq('category', category.toLowerCase());
    }

    const { data, error } = await select;
    if (error) throw error;
    return data;
}
