import { createClient as createServerClient } from "@/utils/supabase/server";
import { batchClassifyFinanceItems } from "./ai-classifier";

export async function syncFinanceToResources(startDate?: string) {
    console.log(`[ResourceSync] Starting synchronization (Start Date: ${startDate || 'All History'})...`);
    const supabase = await createServerClient();

    // 1. Fetch Existing Catalog for Deduplication
    const { data: existingCatalog } = await supabase
        .from('pricing_resources')
        .select('name');

    const catalogNames = (existingCatalog || []).map(r => r.name);
    console.log(`[ResourceSync] Current catalog size: ${catalogNames.length}`);

    // 2. Get candidates
    const itemsToSync: any[] = [];

    // Fetch Purchasing
    let pQuery = supabase
        .from('purchasing_requests')
        .select(`*, items:purchasing_items(*)`)
        .eq('financial_status', 'PAID');

    if (startDate) {
        pQuery = pQuery.gte('created_at', startDate);
    }

    const { data: pRequests } = await pQuery;

    for (const req of (pRequests || [])) {
        if (!req.project_id) continue;
        if (req.items && req.items.length > 0) {
            for (const item of req.items) {
                itemsToSync.push({
                    sourceType: 'PURCHASING',
                    sourceId: item.id,
                    name: item.name,
                    qty: item.qty || 1,
                    unit: item.unit || 'pcs',
                    unitPrice: item.unit_price || 0,
                    projectId: req.project_id,
                    financeType: req.type || 'material'
                });
            }
        } else {
            itemsToSync.push({
                sourceType: 'PURCHASING',
                sourceId: req.id,
                name: req.description || 'Unnamed Item',
                qty: req.quantity || 1,
                unit: req.unit || 'pcs',
                unitPrice: (req.quantity && req.quantity > 0) ? (Number(req.amount) / req.quantity) : Number(req.amount),
                projectId: req.project_id,
                financeType: req.type || 'material'
            });
        }
    }

    // Fetch Reimbursement
    let rQuery = supabase
        .from('reimbursement_requests')
        .select(`*, items:reimbursement_items(*)`)
        .eq('status', 'PAID');

    if (startDate) {
        rQuery = rQuery.gte('created_at', startDate);
    }

    const { data: rRequests } = await rQuery;

    for (const req of (rRequests || [])) {
        if (!req.project_id) continue;
        if (req.items && req.items.length > 0) {
            for (const item of req.items) {
                itemsToSync.push({
                    sourceType: 'REIMBURSEMENT',
                    sourceId: item.id,
                    name: item.name,
                    qty: item.qty || 1,
                    unit: item.unit || 'pcs',
                    unitPrice: item.unit_price || 0,
                    projectId: req.project_id,
                    financeType: req.category || 'service'
                });
            }
        } else {
            itemsToSync.push({
                sourceType: 'REIMBURSEMENT',
                sourceId: req.id,
                name: req.description || 'Unnamed Reimbursement',
                qty: 1,
                unit: 'unit',
                unitPrice: Number(req.amount) || 0,
                projectId: req.project_id,
                financeType: req.category || 'service'
            });
        }
    }

    // Filter already synced
    const { data: existingLogs } = await supabase.from('resource_sync_log').select('source_id');
    const syncedIds = new Set(existingLogs?.map(l => l.source_id) || []);
    const filteredItems = itemsToSync.filter(it => !syncedIds.has(it.sourceId));

    console.log(`[ResourceSync] Processing ${filteredItems.length} new items...`);

    // 3. Batch Process
    const BATCH_SIZE = 25;
    const currentCatalog = [...catalogNames];

    for (let i = 0; i < filteredItems.length; i += BATCH_SIZE) {
        const batch = filteredItems.slice(i, i + BATCH_SIZE);
        console.log(`[ResourceSync] Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(filteredItems.length / BATCH_SIZE)}`);

        try {
            // Pass currentCatalog to the classifier
            const results = await batchClassifyFinanceItems(
                batch.map(it => ({ name: it.name, type: it.financeType })),
                currentCatalog
            );

            for (let j = 0; j < batch.length; j++) {
                const res = await finalizeSyncItem(supabase, batch[j], results[j]);
                // If a NEW resource name was created, add it to currentCatalog for subsequent batches to see
                if (res && res.newResourceName && !currentCatalog.includes(res.newResourceName)) {
                    currentCatalog.push(res.newResourceName);
                }
            }
        } catch (err) {
            console.error(`[ResourceSync] Batch error:`, err);
        }
    }

    console.log("[ResourceSync] Sync with deduplication completed.");
    return { success: true, processed: filteredItems.length };
}

async function finalizeSyncItem(supabase: any, item: any, classification: any) {
    const { sourceType, sourceId, name: originalName, qty, unit, unitPrice, projectId } = item;
    if (!projectId) return null;

    const { data: projectData } = await supabase
        .from('projects')
        .select('workspace_id')
        .eq('id', projectId)
        .maybeSingle();
    const workspaceId = projectData?.workspace_id;

    // Find or Create Resource
    let { data: resource } = await supabase
        .from('pricing_resources')
        .select('id, name')
        .eq('name', classification.canonicalName)
        .maybeSingle();

    let isNewResource = false;
    if (!resource) {
        const { data: newResource, error: nrError } = await supabase
            .from('pricing_resources')
            .insert([{
                name: classification.canonicalName,
                category: classification.category,
                unit: classification.unit || unit,
                price_default: unitPrice,
                workspace_id: workspaceId,
                description: `Automatically created from ${sourceType} sync. Original name: ${originalName}`
            }])
            .select()
            .single();

        if (nrError) {
            console.error(`[ResourceSync] Error creating resource ${classification.canonicalName}:`, nrError);
            return null;
        }
        resource = newResource;
        isNewResource = true;
    }

    // Update Inventory
    const { data: inventory } = await supabase
        .from('resource_inventory')
        .select('*')
        .eq('resource_id', resource!.id)
        .eq('project_id', projectId)
        .maybeSingle();

    if (inventory) {
        await supabase
            .from('resource_inventory')
            .update({
                quantity_in: Number(inventory.quantity_in) + Number(qty),
                updated_at: new Date().toISOString()
            })
            .eq('id', inventory.id);
    } else {
        await supabase
            .from('resource_inventory')
            .insert([{
                resource_id: resource!.id,
                project_id: projectId,
                quantity_in: qty,
                quantity_used: 0
            }]);
    }

    // Log Sync
    await supabase
        .from('resource_sync_log')
        .insert([{
            source_type: sourceType,
            source_id: sourceId,
            resource_id: resource!.id,
            project_id: projectId,
            metadata: { originalName, qty, unit, classification }
        }]);

    return {
        newResourceName: isNewResource ? classification.canonicalName : null
    };
}
