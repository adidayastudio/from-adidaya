import AsyncStorage from '@react-native-async-storage/async-storage';
import { ResourceTypeOption } from './financeSetup';
import { supabase } from '../supabase';

export interface ReceivingQueueItem {
    id: string;
    itemName: string;
    resourceType: ResourceTypeOption;
    expectedQty: number;
    receivedQty: number;
    unit: string;
    sourceDocNo: string;
    vendor: string;
    status: 'awaiting' | 'partial' | 'received';
    date: string;
    location: string;
    notes?: string;
    purchasingId?: string;
    unitPrice?: number;
    totalAmount?: number;
}

const STORAGE_KEY_RECEIVING_QUEUE = '@resources_receiving_queue_v1';

export const DEFAULT_RECEIVING_QUEUE: ReceivingQueueItem[] = [
    {
        id: 'rcv-01',
        itemName: 'Supreme Kabel NYM 3x2.5 mm²',
        resourceType: 'Material',
        expectedQty: 100,
        receivedQty: 40,
        unit: 'm',
        sourceDocNo: 'PO-2026-0412',
        vendor: 'PT Sumber Perkasa Teknik',
        status: 'partial',
        date: 'Today, 11:20 AM',
        location: 'Warehouse A',
        notes: 'First batch of 40m received, 60m remaining on backorder from supplier.',
    },
    {
        id: 'rcv-02',
        itemName: 'Semen Portland Gresik 40 kg',
        resourceType: 'Material',
        expectedQty: 100,
        receivedQty: 100,
        unit: 'sak',
        sourceDocNo: 'PO-2026-0410',
        vendor: 'TB Jaya Abadi Material',
        status: 'received',
        date: 'Today, 10:42 AM',
        location: 'Warehouse A',
        notes: 'Full delivery confirmed and unloaded in Bay B.',
    },
    {
        id: 'rcv-03',
        itemName: 'Makita Rotary Hammer HP1630 13mm',
        resourceType: 'Tools',
        expectedQty: 2,
        receivedQty: 0,
        unit: 'unit',
        sourceDocNo: 'PO-2026-0415',
        vendor: 'Mitra Makmur Industrial',
        status: 'awaiting',
        date: '12 Sep 2026',
        location: 'Central Tool Hub',
        notes: 'Invoice paid. Delivery expected via courier today.',
    },
    {
        id: 'rcv-04',
        itemName: 'Wide Flange 150x75x5x7mm 12m',
        resourceType: 'Material',
        expectedQty: 20,
        receivedQty: 0,
        unit: 'btg',
        sourceDocNo: 'PO-2026-0398',
        vendor: 'PT Baja Utama Nusantara',
        status: 'awaiting',
        date: '11 Sep 2026',
        location: 'Site Storage C',
        notes: 'Direct delivery to site pending crane staging.',
    },
    {
        id: 'rcv-05',
        itemName: 'Cat Jotun Jotashield Extreme 20L',
        resourceType: 'Material',
        expectedQty: 15,
        receivedQty: 5,
        unit: 'pail',
        sourceDocNo: 'PO-2026-0389',
        vendor: 'Depo Bangunan Sentosa',
        status: 'partial',
        date: '10 Sep 2026',
        location: 'Warehouse A',
        notes: '5 pails delivered; 10 pails scheduled for tomorrow.',
    },
    {
        id: 'rcv-06',
        itemName: 'iPad Pro 13" M4 256GB Wi-Fi',
        resourceType: 'Assets',
        expectedQty: 2,
        receivedQty: 0,
        unit: 'unit',
        sourceDocNo: 'PO-2026-0420',
        vendor: 'iBox Central Park',
        status: 'awaiting',
        date: '13 Sep 2026',
        location: 'Office 201',
        notes: 'Asset tablet for site architects; delivery scheduled this afternoon.',
    },
    {
        id: 'rcv-07',
        itemName: 'HVAC Ducting Maintenance & Filter Replace',
        resourceType: 'Services',
        expectedQty: 1,
        receivedQty: 0,
        unit: 'service',
        sourceDocNo: 'SV-2026-0044',
        vendor: 'PT Sejuk Abadi Mandiri',
        status: 'awaiting',
        date: '13 Sep 2026',
        location: 'Main Office',
        notes: 'Preventive service contract awaiting work commencement confirmation.',
    },
];

export function inferResourceType(
    itemName?: string,
    categoryName?: string,
    subcategoryName?: string
): ResourceTypeOption {
    const text = `${itemName || ''} ${categoryName || ''} ${subcategoryName || ''}`.toLowerCase();

    if (/tool|bor|drill|hammer|saw|gergaji|genset|vibrator|meteran|cutter|gerinda|tang|obeng|kunci|scaffolding|helm|rompi|sepatu safety|multimeter|kompresor|las|inverter|perkakas|impact|grinder/.test(text)) {
        return 'Tools';
    }
    if (/asset|laptop|macbook|dell|lenovo|pc|komputer|monitor|server|printer|mobil|motor|hilux|truk|kendaraan|excavator|drone|dji|ipad|tablet|camera|display|workstation|forklift|kendaraan|furniture|meja|kursi/.test(text)) {
        return 'Assets';
    }
    if (/service|jasa|layanan|perbaikan|maintenance|sewa|rental|sondir|audit|testing|cleaning|instalasi|pengiriman|ekspedisi|konsultan|desain|subcon|subcontractor|pembuangan|cuci/.test(text)) {
        return 'Services';
    }
    return 'Material';
}

export async function syncPaidPurchasingToReceivingQueue(): Promise<ReceivingQueueItem[]> {
    try {
        let existingQueue: ReceivingQueueItem[] = [];
        const json = await AsyncStorage.getItem(STORAGE_KEY_RECEIVING_QUEUE);
        if (json) {
            existingQueue = JSON.parse(json);
        } else {
            existingQueue = [...DEFAULT_RECEIVING_QUEUE];
        }

        // 1. Fetch Paid Purchasing Requests from Supabase
        const { data: paidPurchasings } = await supabase
            .from('purchasing_requests')
            .select(`
                id, request_number, vendor, description, type, subcategory, amount, 
                financial_status, payment_date, date, created_at,
                project:projects(id, project_name, project_code, project_number),
                items:purchasing_items(id, name, item_name, qty, unit, unit_price, total)
            `)
            .eq('financial_status', 'PAID')
            .order('payment_date', { ascending: false });

        // 2. Fetch Paid Reimbursement Requests from Supabase
        const { data: paidReimbursements } = await supabase
            .from('reimbursement_requests')
            .select(`
                id, request_number, vendor, description, title, category, subcategory, amount, 
                status, payment_date, date, created_at,
                project:projects(id, project_name, project_code, project_number),
                items:reimbursement_items(id, name, qty, unit, unit_price, total)
            `)
            .eq('status', 'PAID')
            .order('payment_date', { ascending: false });

        const newItemsMap = new Map<string, ReceivingQueueItem>();

        // Build items from Paid Purchasing
        (paidPurchasings || []).forEach((req: any) => {
            const docNo = req.request_number || (req.id ? `PO-${String(req.id).slice(0, 8).toUpperCase()}` : 'PO-2026-PAID');
            const vendorName = req.vendor || 'Supplier';
            const location = req.project?.project_name || req.project?.project_code || 'Warehouse A';
            const dateStr = req.payment_date
                ? new Date(req.payment_date).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
                : (req.date || 'Recent');

            const reqItems = (req.items && req.items.length > 0)
                ? req.items
                : [{
                    id: 'default',
                    name: req.description || 'Purchased Resource',
                    qty: 1,
                    unit: 'unit',
                    unit_price: req.amount || 0,
                    total: req.amount || 0
                }];

            reqItems.forEach((item: any, idx: number) => {
                const itemId = `rcv-po-${req.id}-${item.id || idx}`;
                const rawName = item.name || item.item_name || req.description || 'Purchased Resource';
                const rType = inferResourceType(rawName, req.type, req.subcategory);
                const expQty = Math.max(1, Number(item.qty || 1));

                // Find if exists in local storage
                const existing = existingQueue.find(q => q.id === itemId || (q.purchasingId === req.id && q.itemName === rawName));
                if (existing) {
                    newItemsMap.set(itemId, {
                        ...existing,
                        id: itemId,
                        sourceDocNo: docNo,
                        vendor: vendorName,
                        location: existing.location || location,
                        unitPrice: Number(item.unit_price || 0),
                        totalAmount: Number(item.total || req.amount || 0),
                        purchasingId: req.id,
                    });
                } else {
                    newItemsMap.set(itemId, {
                        id: itemId,
                        itemName: rawName,
                        resourceType: rType,
                        expectedQty: expQty,
                        receivedQty: 0,
                        unit: item.unit || 'unit',
                        sourceDocNo: docNo,
                        vendor: vendorName,
                        status: 'awaiting',
                        date: dateStr,
                        location: location,
                        notes: `Paid PO from Finance (${req.project?.project_name || 'Global Project'}).`,
                        purchasingId: req.id,
                        unitPrice: Number(item.unit_price || 0),
                        totalAmount: Number(item.total || req.amount || 0),
                    });
                }
            });
        });

        // Build items from Paid Reimbursements
        (paidReimbursements || []).forEach((req: any) => {
            const docNo = req.request_number || (req.id ? `REIMB-${String(req.id).slice(0, 8).toUpperCase()}` : 'REIMB-2026-PAID');
            const vendorName = req.vendor || 'Reimbursement';
            const location = req.project?.project_name || req.project?.project_code || 'Office & Admin';
            const dateStr = req.payment_date
                ? new Date(req.payment_date).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
                : (req.date || 'Recent');

            const reqItems = (req.items && req.items.length > 0)
                ? req.items
                : [{
                    id: 'default',
                    name: req.description || req.title || 'Reimbursed Item',
                    qty: 1,
                    unit: 'unit',
                    unit_price: req.amount || 0,
                    total: req.amount || 0
                }];

            reqItems.forEach((item: any, idx: number) => {
                const itemId = `rcv-reimb-${req.id}-${item.id || idx}`;
                const rawName = item.name || req.description || req.title || 'Reimbursed Item';
                const rType = inferResourceType(rawName, req.category, req.subcategory);
                const expQty = Math.max(1, Number(item.qty || 1));

                const existing = existingQueue.find(q => q.id === itemId || (q.purchasingId === req.id && q.itemName === rawName));
                if (existing) {
                    newItemsMap.set(itemId, {
                        ...existing,
                        id: itemId,
                        sourceDocNo: docNo,
                        vendor: vendorName,
                        location: existing.location || location,
                        unitPrice: Number(item.unit_price || 0),
                        totalAmount: Number(item.total || req.amount || 0),
                        purchasingId: req.id,
                    });
                } else {
                    newItemsMap.set(itemId, {
                        id: itemId,
                        itemName: rawName,
                        resourceType: rType,
                        expectedQty: expQty,
                        receivedQty: 0,
                        unit: item.unit || 'unit',
                        sourceDocNo: docNo,
                        vendor: vendorName,
                        status: 'awaiting',
                        date: dateStr,
                        location: location,
                        notes: `Paid Reimbursement from Finance (${req.project?.project_name || 'Global Project'}).`,
                        purchasingId: req.id,
                        unitPrice: Number(item.unit_price || 0),
                        totalAmount: Number(item.total || req.amount || 0),
                    });
                }
            });
        });

        // Retain default demo items if they don't collide
        existingQueue.forEach(item => {
            if (!newItemsMap.has(item.id)) {
                newItemsMap.set(item.id, item);
            }
        });

        const mergedQueue = Array.from(newItemsMap.values());
        await AsyncStorage.setItem(STORAGE_KEY_RECEIVING_QUEUE, JSON.stringify(mergedQueue));
        return mergedQueue;
    } catch (e) {
        console.error('Failed to sync paid finance to receiving queue:', e);
        return getReceivingQueue();
    }
}

export async function getReceivingQueue(): Promise<ReceivingQueueItem[]> {
    try {
        const json = await AsyncStorage.getItem(STORAGE_KEY_RECEIVING_QUEUE);
        if (json) {
            const parsed = JSON.parse(json);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        }
    } catch (e) {
        console.error('Failed to load receiving queue from AsyncStorage:', e);
    }
    return DEFAULT_RECEIVING_QUEUE;
}

export async function saveReceivingQueue(items: ReceivingQueueItem[]): Promise<void> {
    try {
        await AsyncStorage.setItem(STORAGE_KEY_RECEIVING_QUEUE, JSON.stringify(items));
    } catch (e) {
        console.error('Failed to save receiving queue to AsyncStorage:', e);
    }
}

export async function confirmItemReceipt(
    itemId: string,
    qtyReceivedNow: number,
    notes?: string
): Promise<ReceivingQueueItem | null> {
    const queue = await getReceivingQueue();
    const itemIndex = queue.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return null;

    const item = queue[itemIndex];
    const newReceived = item.receivedQty + qtyReceivedNow;
    const newStatus: 'awaiting' | 'partial' | 'received' =
        newReceived >= item.expectedQty ? 'received' : newReceived > 0 ? 'partial' : 'awaiting';

    const updatedItem: ReceivingQueueItem = {
        ...item,
        receivedQty: Math.min(newReceived, item.expectedQty),
        status: newStatus,
        date: 'Just now',
        notes: notes ? (item.notes ? `${item.notes}\n${notes}` : notes) : item.notes,
    };

    queue[itemIndex] = updatedItem;
    await saveReceivingQueue(queue);
    return updatedItem;
}

