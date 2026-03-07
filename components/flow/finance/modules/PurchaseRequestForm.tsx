import { useState, useMemo, useEffect, useRef } from "react";
import { clsx } from "clsx";
import { Briefcase, Clock, Package, DollarSign, FileText, CheckCircle, Upload, AlertTriangle, X, AlertCircle, Search, Plus } from "lucide-react";
import { Select } from "@/shared/ui/primitives/select/select";
import { Category, PurchaseStage, CATEGORY_OPTIONS, SUBCATEGORY_OPTIONS, UNIT_OPTIONS } from "./constants";
import { fetchAllProjects } from "@/lib/api/projects";
import { Project } from "@/types/project";
import { createPurchasingRequest, updatePurchasingRequest, fetchBeneficiaryAccounts, saveBeneficiaryAccount, BeneficiaryAccount } from "@/lib/api/finance";
import { uploadFinanceFile } from "@/lib/api/storage";
import { useFinance } from "../FinanceContext";
import { CreditCard, Save, Trash2 } from "lucide-react";
import { SearchableAccountSelect } from "./SearchableAccountSelect";

interface LineItem {
    id: string;
    name: string;
    qty: number;
    unit: string;
    unitPrice: number;
    total: number;
}

export function PurchaseRequestForm({
    onClose,
    onSuccess,
    onDelete,
    initialData
}: {
    onClose: () => void;
    onSuccess?: () => void;
    onDelete?: () => Promise<void> | void; // Add onDelete prop
    initialData?: any;
}) {
    // -- CONTEXT & STATE --
    const { userId } = useFinance();
    const [projectCode, setProjectCode] = useState(initialData?.project_code || "");
    const [projects, setProjects] = useState<Project[]>([]);
    const [category, setCategory] = useState<Category | "">(initialData?.type || "");
    const [subcategory, setSubcategory] = useState(initialData?.subcategory || "");
    const [stage, setStage] = useState<PurchaseStage>(initialData?.purchase_stage || "PLANNED");
    const [vendor, setVendor] = useState(initialData?.vendor || "");
    const [purchaseDate, setPurchaseDate] = useState(initialData?.date?.split("T")[0] || new Date().toISOString().split('T')[0]);
    const [targetDate, setTargetDate] = useState(initialData?.target_date?.split("T")[0] || "");
    const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">(initialData?.priority || "MEDIUM");

    // Beneficiary State
    const [bankName, setBankName] = useState(initialData?.beneficiary_bank || "");
    const [accountNumber, setAccountNumber] = useState(initialData?.beneficiary_number || "");
    const [accountName, setAccountName] = useState(initialData?.beneficiary_name || "");
    const [savedAccounts, setSavedAccounts] = useState<BeneficiaryAccount[]>([]);
    const [saveToSaved, setSaveToSaved] = useState(false);

    useEffect(() => {
        console.log("[DEBUG] PurchaseRequestForm - savedAccounts length:", savedAccounts.length);
    }, [savedAccounts]);

    // Parse items from initialData - properly handle multi-item requests
    // If initialData.items exists and has items, use those. Otherwise fallback to legacy single-item format.
    const [items, setItems] = useState<LineItem[]>(() => {
        if (!initialData) {
            // New request - start with empty item
            return [{ id: Math.random().toString(36).substr(2, 9), name: "", qty: 1, unit: "pcs", unitPrice: 0, total: 0 }];
        }

        // Check if we have the items array (multi-item support)
        if (initialData.items && Array.isArray(initialData.items) && initialData.items.length > 0) {
            return initialData.items.map((item: any) => ({
                id: item.id || Math.random().toString(36).substr(2, 9),
                name: item.name || "",
                qty: item.qty || 1,
                unit: item.unit || "pcs",
                unitPrice: item.unit_price || item.unitPrice || 0,
                total: item.total || (item.qty || 1) * (item.unit_price || item.unitPrice || 0)
            }));
        }

        // Legacy fallback: single item from flattened data
        return [{
            id: initialData.id || Math.random().toString(36).substr(2, 9),
            name: initialData.description || "",
            qty: initialData.quantity || 1,
            unit: initialData.unit || "pcs",
            unitPrice: initialData.quantity > 0 ? (initialData.amount || 0) / initialData.quantity : 0,
            total: initialData.amount || 0
        }];
    });

    const [priceType, setPriceType] = useState<"ESTIMATION" | "ACTUAL">("ESTIMATION");
    const [invoiceFiles, setInvoiceFiles] = useState<File[]>([]);
    const [existingInvoices, setExistingInvoices] = useState<{ id: string; invoice_url: string; invoice_name?: string }[]>(
        initialData?.invoices || (initialData?.invoice_url ? [{ id: 'legacy', invoice_url: initialData.invoice_url, invoice_name: 'Invoice' }] : [])
    );
    const [notes, setNotes] = useState(initialData?.notes || "");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Allow editing even if APPROVED, so they can add missing invoice/beneficiary info
    const isReadOnly = initialData && ["PAID", "REJECTED", "CANCELLED"].includes(initialData.approval_status);

    // Load Projects & Accounts
    useEffect(() => {
        fetchAllProjects().then(setProjects);
        fetchBeneficiaryAccounts().then(accounts => {
            console.log("[DEBUG] PurchaseRequestForm - Loaded accounts:", accounts);
            setSavedAccounts(accounts);
        });
    }, []);

    const projectOptions = useMemo(() => {
        return projects.map(p => ({ value: p.projectCode, label: `${p.projectCode} - ${p.projectName}` }));
    }, [projects]);

    // -- ITEM ACTIONS --
    const addItem = () => {
        if (isReadOnly) return;
        setItems([...items, { id: Math.random().toString(36).substr(2, 9), name: "", qty: 1, unit: "pcs", unitPrice: 0, total: 0 }]);
    };

    const removeItem = (id: string) => {
        if (isReadOnly) return;
        if (items.length > 1) {
            setItems(items.filter(i => i.id !== id));
        }
    };

    const updateItem = (id: string, updates: Partial<LineItem>) => {
        if (isReadOnly) return;
        setItems(items.map(i => {
            if (i.id === id) {
                const updated = { ...i, ...updates };
                if ('qty' in updates || 'unitPrice' in updates) {
                    updated.total = (updated.qty || 0) * (updated.unitPrice || 0);
                }
                return updated;
            }
            return i;
        }));
    };

    // -- CALCULATIONS --
    const totalAmount = useMemo(() => {
        return items.reduce((sum, item) => sum + item.total, 0);
    }, [items]);

    // -- VALIDATION --
    const isValid = useMemo(() => {
        if (!projectCode) return false;
        if (!category || !subcategory) return false;
        if (items.some(i => !i.name || i.qty <= 0)) return false; // qty must be > 0

        // Invoiced or Received stages MUST have an invoice if not just a draft or already approved
        // Actually, as per request: "INTINYA semuanya baru bisa dibayar klo udah ada invoice yahh"
        // But for submitted, if stage is INVOICED or RECEIVED, we should ideally have it.
        if (stage === "INVOICED" || stage === "RECEIVED") {
            if (!vendor) return false;
            // Invoice is mandatory for Invoiced/Received stages when submitting
            if (invoiceFiles.length === 0 && existingInvoices.length === 0) return false;
        }

        return true;
    }, [projectCode, category, subcategory, items, stage, vendor, invoiceFiles, existingInvoices]);

    const handleSave = async (asDraft: boolean = false) => {
        if (isReadOnly) return;
        if (!isValid || isSubmitting) return;
        setIsSubmitting(true);

        try {
            const selectedProject = projects.find(p => p.projectCode === projectCode);
            if (!selectedProject) throw new Error("Invalid project selected");

            // Upload all new invoice files
            const uploadedInvoiceUrls: string[] = [];
            for (const file of invoiceFiles) {
                const url = await uploadFinanceFile(file, "invoices");
                if (url) {
                    uploadedInvoiceUrls.push(url);
                }
            }

            // Combine with existing invoices - use first one as legacy invoice_url for backward compatibility
            const allInvoiceUrls = [
                ...existingInvoices.map(inv => inv.invoice_url),
                ...uploadedInvoiceUrls
            ];
            const primaryInvoiceUrl = allInvoiceUrls[0] || null;

            if (!userId) throw new Error("User not authenticated");

            const payload: any = {
                project_id: selectedProject.id,
                date: purchaseDate,
                vendor: vendor || undefined,
                beneficiary_bank: bankName,
                beneficiary_number: accountNumber,
                beneficiary_name: accountName,
                target_date: targetDate,
                description: items.map(i => i.name).join(', '),
                priority,
                type: category as any,
                subcategory,
                amount: totalAmount,
                purchase_stage: stage,
                approval_status: asDraft ? "DRAFT" : "SUBMITTED",
                financial_status: initialData ? initialData.financial_status : "UNPAID",
                invoice_url: primaryInvoiceUrl || undefined,
                // Send all invoice URLs for the new invoices table
                invoice_urls: uploadedInvoiceUrls.map((url, idx) => ({
                    invoice_url: url,
                    invoice_name: invoiceFiles[idx]?.name || `Invoice ${idx + 1}`
                })),
                // Keep track of existing invoice IDs to preserve
                existing_invoice_ids: existingInvoices.map(inv => inv.id),
                created_by: userId,
                notes: notes,
                items: items.map(i => ({
                    name: i.name,
                    qty: i.qty,
                    unit: i.unit,
                    unitPrice: i.unitPrice,
                    total: i.total
                }))
            };

            const requestId = initialData?.request_id || initialData?.id;

            if (requestId && initialData) {
                // Update
                if (isReadOnly) return;
                await updatePurchasingRequest(requestId, payload);
            } else {
                // Create
                await createPurchasingRequest(payload);
            }

            // Handle Save Account
            if (saveToSaved && bankName && accountNumber && userId) {
                console.log("[DEBUG] PurchaseRequestForm - Saving beneficiary account...");
                await saveBeneficiaryAccount({
                    bank_name: bankName,
                    account_number: accountNumber,
                    account_name: accountName,
                    alias: `${bankName} - ${accountName}`,
                    created_by: userId
                });
            }

            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error("Error saving purchase request:", error);
            console.error("Error details:", JSON.stringify(error, null, 2));
            alert(`Failed to save request: ${error instanceof Error ? error.message : "Unknown error"}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div className="p-6 space-y-8 pb-32">
                {/* REVISION ALERT */}
                {initialData?.approval_status === "NEED_REVISION" && initialData?.revision_reason && (
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl flex gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
                        <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                        <div>
                            <div className="text-xs font-bold text-orange-800 uppercase tracking-wider mb-1">Revision Requested</div>
                            <p className="text-sm text-orange-700 font-medium leading-relaxed">
                                {initialData.revision_reason}
                            </p>
                        </div>
                    </div>
                )}

                {/* SECTION 1: CLASSIFICATION */}
                <section className="space-y-4">
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                        <Briefcase className="w-4 h-4" strokeWidth={2} /> General Information
                    </h3>
                    <div className="space-y-4">
                        <Select
                            label="Project"
                            value={projectCode}
                            onChange={setProjectCode}
                            options={projectOptions}
                            placeholder="Select project..."
                            className="rounded-full"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider px-1 mb-1.5 ml-1">Invoice Date</label>
                            <input
                                type="date"
                                value={purchaseDate}
                                onChange={e => setPurchaseDate(e.target.value)}
                                disabled={isReadOnly}
                                className={clsx(
                                    "w-full max-w-full block min-w-0 h-9 pl-3 pr-8 text-base md:text-sm border border-neutral-200 rounded-full bg-white text-neutral-900 focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium appearance-none cursor-pointer",
                                    isReadOnly && "opacity-60 cursor-not-allowed"
                                )}
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider px-1 mb-1.5 ml-1">Target Payment Date</label>
                            <input
                                type="date"
                                value={targetDate}
                                onChange={e => setTargetDate(e.target.value)}
                                disabled={isReadOnly}
                                className={clsx(
                                    "w-full max-w-full block min-w-0 h-9 pl-3 pr-8 text-base md:text-sm border border-neutral-200 rounded-full bg-white text-neutral-900 focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium appearance-none cursor-pointer",
                                    isReadOnly && "opacity-60 cursor-not-allowed"
                                )}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Category"
                            value={category}
                            onChange={(v) => { setCategory(v as Category); setSubcategory(""); }}
                            options={CATEGORY_OPTIONS}
                            className="rounded-full"
                        />
                        <Select
                            label="Subcategory"
                            value={subcategory}
                            onChange={setSubcategory}
                            disabled={!category}
                            options={category ? SUBCATEGORY_OPTIONS[category] : []}
                            placeholder={category ? "Select..." : "Category first"}
                            className="rounded-full"
                        />
                    </div>

                    {/* PRIORITY SELECTOR */}
                    <div className="pt-2">
                        <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2.5 ml-1">
                            Priority Level
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {(["URGENT", "HIGH", "MEDIUM", "LOW"] as const).map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPriority(p)}
                                    className={clsx(
                                        "py-2.5 rounded-full text-[11px] font-bold ring-1 transition-all uppercase tracking-wider",
                                        priority === p
                                            ? p === "URGENT" ? "bg-red-500 text-white ring-red-500 shadow-md shadow-red-500/20"
                                                : p === "HIGH" ? "bg-orange-500 text-white ring-orange-500 shadow-md shadow-orange-500/20"
                                                    : "bg-neutral-800 text-white ring-neutral-800 shadow-md"
                                            : "bg-white dark:bg-neutral-800 text-neutral-500 ring-neutral-200 dark:ring-neutral-700 hover:ring-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700"
                                    )}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* SECTION 2: STAGE */}
                <section className="space-y-4 pt-4">
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                        <Clock className="w-4 h-4" strokeWidth={2} /> Order Progress
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                        {(["PLANNED", "INVOICED", "RECEIVED"] as PurchaseStage[]).map((s) => (
                            <div
                                key={s}
                                onClick={() => setStage(s)}
                                className={clsx(
                                    "relative p-4 rounded-3xl border transition-all cursor-pointer flex items-center gap-4",
                                    stage === s ? "border-red-500/40 bg-red-50/30 dark:bg-red-500/10 shadow-sm" : "border-neutral-100 dark:border-neutral-800 bg-white/40 dark:bg-neutral-800/40 hover:border-neutral-200"
                                )}
                            >
                                <div className={clsx(
                                    "w-5 h-5 rounded-full border flex items-center justify-center shrink-0",
                                    stage === s ? "border-red-500 bg-red-500" : "border-neutral-300 dark:border-neutral-600"
                                )}>
                                    {stage === s && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-bold text-neutral-900 dark:text-white">
                                        {s === "PLANNED" && "Planned (Estimation)"}
                                        {s === "INVOICED" && "Invoiced"}
                                        {s === "RECEIVED" && "Received"}
                                    </div>
                                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium leading-relaxed">
                                        {s === "PLANNED" && "Not yet purchased, no invoice, no goods received."}
                                        {s === "INVOICED" && "Invoice available, payment pending."}
                                        {s === "RECEIVED" && "Goods/services already received."}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section >

                {/* SECTION 3: ITEMS TABLE */}
                <section className="space-y-4 pt-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                            <Package className="w-4 h-4" strokeWidth={2} /> Item Details
                        </h3>
                        <button
                            onClick={addItem}
                            className="text-[11px] font-bold text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 px-4 py-2 rounded-full transition-all flex items-center gap-1.5 shadow-lg shadow-red-500/25 border border-white/10"
                        >
                            <Plus className="w-3.5 h-3.5" /> Add Item
                        </button>
                    </div>

                    <div className="space-y-4">
                        {items.map((item, index) => (
                            <div
                                key={item.id}
                                className="relative p-6 rounded-[2.5rem] bg-white/60 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-700/40 shadow-sm transition-all duration-300 space-y-5 group backdrop-blur-[2px]"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 ml-1">Item Name</label>
                                        <input
                                            type="text"
                                            value={item.name}
                                            onChange={e => updateItem(item.id, { name: e.target.value })}
                                            placeholder="e.g. Semen Tiga Roda"
                                            className="w-full h-11 px-5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-full bg-white dark:bg-neutral-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium placeholder:text-[11px]"
                                        />
                                    </div>
                                    {items.length > 1 && (
                                        <button
                                            onClick={() => removeItem(item.id)}
                                            className="mt-7 p-2 text-neutral-400 dark:text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-all"
                                        >
                                            <X className="w-4 h-4" strokeWidth={2} />
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-12 gap-3">
                                    <div className="col-span-4">
                                        <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 ml-1">Qty</label>
                                        <input
                                            type="number"
                                            value={item.qty}
                                            onChange={e => updateItem(item.id, { qty: parseFloat(e.target.value) || 0 })}
                                            className="w-full h-11 px-5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-full bg-white dark:bg-neutral-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium"
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 ml-1">Unit</label>
                                        <select
                                            value={item.unit}
                                            onChange={e => updateItem(item.id, { unit: e.target.value })}
                                            className="w-full h-11 px-4 text-xs border border-neutral-200 dark:border-neutral-700 rounded-full bg-white dark:bg-neutral-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium appearance-none cursor-pointer"
                                        >
                                            {UNIT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-5">
                                        <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 ml-1">Unit Price</label>
                                        <div className="relative">
                                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-400 text-xs font-bold font-mono">Rp</span>
                                            <input
                                                type="number"
                                                value={item.unitPrice}
                                                onChange={e => updateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                                                className="w-full h-11 pl-11 pr-5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-full bg-white dark:bg-neutral-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-bold text-neutral-900 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-700">
                                    <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider ml-1">Subtotal</span>
                                    <span className="text-sm font-bold text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-700 px-4 py-1.5 rounded-full">Rp {item.total.toLocaleString("id-ID")}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* PRICING POLICY (Moved into Item Details) */}
                    <div className="p-6 rounded-3xl bg-neutral-50/50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-700/50 space-y-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5" /> Pricing Policy
                            </h4>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className={clsx("w-5 h-5 rounded-full border flex items-center justify-center transition-all", priceType === "ESTIMATION" ? "border-red-500 bg-red-500 shadow-sm" : "border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 group-hover:border-red-400")}>
                                        {priceType === "ESTIMATION" && <div className="w-2 h-2 rounded-full bg-white animate-in zoom-in-50 duration-200" />}
                                    </div>
                                    <input type="radio" checked={priceType === "ESTIMATION"} onChange={() => setPriceType("ESTIMATION")} className="hidden" />
                                    <span className={clsx("text-xs font-bold transition-colors", priceType === "ESTIMATION" ? "text-red-600" : "text-neutral-500 group-hover:text-neutral-700")}>Estimation</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className={clsx("w-5 h-5 rounded-full border flex items-center justify-center transition-all", priceType === "ACTUAL" ? "border-red-500 bg-red-500 shadow-sm" : "border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 group-hover:border-red-400")}>
                                        {priceType === "ACTUAL" && <div className="w-2 h-2 rounded-full bg-white animate-in zoom-in-50 duration-200" />}
                                    </div>
                                    <input type="radio" checked={priceType === "ACTUAL"} onChange={() => setPriceType("ACTUAL")} className="hidden" />
                                    <span className={clsx("text-xs font-bold transition-colors", priceType === "ACTUAL" ? "text-red-600" : "text-neutral-500 group-hover:text-neutral-700")}>Actual</span>
                                </label>
                            </div>
                        </div>
                        <p className="text-[10px] text-neutral-400 font-medium leading-relaxed italic ml-1">
                            * Use Estimation if you haven't purchased yet. Use Actual if you have proof of payment.
                        </p>
                    </div>

                    {/* TOTAL SUMMARY */}
                    <div className="mt-4 p-8 rounded-3xl bg-gradient-to-br from-red-500 to-red-600 border border-red-400 shadow-xl shadow-red-500/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                        <div className="relative flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-red-100 uppercase tracking-[0.2em] leading-none mb-2">Total Amount</span>
                                <span className="text-xs text-red-100/70 font-medium">{items.length} items summarized</span>
                            </div>
                            <span className="text-3xl font-black text-white tracking-tight">Rp {totalAmount.toLocaleString("id-ID")}</span>
                        </div>
                    </div>
                </section >

                {/* SECTION 4: VENDOR & ACCOUNT DETAILS */}
                < section className="space-y-4 pt-4" >
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                        <CreditCard className="w-4 h-4" strokeWidth={2} /> Vendor & Beneficiary
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 ml-1">
                                Vendor Name
                            </label>
                            <input
                                type="text"
                                value={vendor}
                                onChange={e => setVendor(e.target.value)}
                                placeholder={stage === "PLANNED" ? "Preferred vendor (Optional)" : "Vendor name (Required)"}
                                className="w-full h-11 px-5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-full bg-white dark:bg-neutral-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium placeholder:text-xs"
                            />
                        </div>

                        {/* Saved Account Selector - Searchable */}
                        {savedAccounts.length > 0 && (
                            <SearchableAccountSelect
                                accounts={savedAccounts}
                                onSelect={(acc) => {
                                    setBankName(acc.bank_name);
                                    setAccountNumber(acc.account_number);
                                    setAccountName(acc.account_name);
                                }}
                            />
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 ml-1">Bank Name</label>
                                <input
                                    type="text"
                                    value={bankName}
                                    onChange={e => setBankName(e.target.value)}
                                    disabled={isReadOnly}
                                    placeholder="e.g. BCA"
                                    className={clsx(
                                        "w-full h-11 px-5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-full bg-white dark:bg-neutral-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium placeholder:text-[11px]",
                                        isReadOnly && "bg-neutral-50 text-neutral-500"
                                    )}
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 ml-1">Account Number</label>
                                <input
                                    type="text"
                                    value={accountNumber}
                                    onChange={e => setAccountNumber(e.target.value)}
                                    disabled={isReadOnly}
                                    placeholder="e.g. 1234567890"
                                    className={clsx(
                                        "w-full h-11 px-5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-full bg-white dark:bg-neutral-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium placeholder:text-[11px]",
                                        isReadOnly && "bg-neutral-50 text-neutral-500"
                                    )}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 ml-1">Account Name</label>
                                <input
                                    type="text"
                                    value={accountName}
                                    onChange={e => setAccountName(e.target.value)}
                                    disabled={isReadOnly}
                                    placeholder="e.g. PT Vendor Maju Jaya"
                                    className={clsx(
                                        "w-full h-11 px-5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-full bg-white dark:bg-neutral-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-bold text-neutral-900 dark:text-white placeholder:text-[11px]",
                                        isReadOnly && "bg-neutral-50 text-neutral-500"
                                    )}
                                />
                            </div>
                        </div>

                        {!isReadOnly && bankName && accountNumber && !savedAccounts.some(acc => acc.account_number === accountNumber && acc.bank_name === bankName) && (
                            <div
                                onClick={() => setSaveToSaved(!saveToSaved)}
                                className="flex items-center justify-between p-4 rounded-3xl bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 cursor-pointer hover:border-red-200 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={clsx(
                                        "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                                        saveToSaved ? "bg-red-500 text-white" : "bg-neutral-50 dark:bg-neutral-700 text-neutral-400 group-hover:bg-neutral-100"
                                    )}>
                                        <Save className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-neutral-800 dark:text-white">Save Account</p>
                                        <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">Add to your shared beneficiary list</p>
                                    </div>
                                </div>
                                <div className={clsx(
                                    "w-10 h-5 rounded-full relative transition-all duration-300",
                                    saveToSaved ? "bg-red-500" : "bg-neutral-200 dark:bg-neutral-700"
                                )}>
                                    <div className={clsx(
                                        "absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300",
                                        saveToSaved ? "left-6" : "left-1"
                                    )} />
                                </div>
                                <input type="checkbox" className="hidden" checked={saveToSaved} readOnly />
                            </div>
                        )}
                    </div>
                </section>

                {/* SECTION 5: DOCUMENTS - Multiple Invoices */}
                <section className="space-y-4 pt-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                            <Upload className="w-4 h-4" strokeWidth={2} /> Invoices & Receipts
                        </h3>
                        {stage === "PLANNED" && <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider italic">Optional</span>}
                        {(stage === "INVOICED" || stage === "RECEIVED") && <span className="text-[10px] font-bold text-amber-600 mb-1 leading-none uppercase tracking-widest">Required</span>}
                    </div>

                    {/* Existing Invoices List */}
                    {
                        existingInvoices.length > 0 && (
                            <div className="space-y-2">
                                {existingInvoices.map((inv, idx) => (
                                    <div key={inv.id} className="flex items-center gap-3 p-3 bg-red-50/20 dark:bg-red-500/5 border border-red-100 dark:border-red-500/20 rounded-full pr-5 transition-all hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                                        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center shrink-0">
                                            <FileText className="w-5 h-5 text-red-600 dark:text-red-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-neutral-800 dark:text-white truncate">{inv.invoice_name || `Invoice ${idx + 1}`}</p>
                                            <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider leading-none">Already uploaded</p>
                                        </div>
                                        <a
                                            href={inv.invoice_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 text-[10px] font-bold text-red-600 bg-red-100 dark:bg-red-500/20 hover:bg-red-200 dark:hover:bg-red-500/30 rounded-full transition-all uppercase tracking-wider"
                                        >
                                            View Document
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => setExistingInvoices(prev => prev.filter(i => i.id !== inv.id))}
                                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-all"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )
                    }

                    {/* New Invoice Files List */}
                    {
                        invoiceFiles.length > 0 && (
                            <div className="space-y-2">
                                {invoiceFiles.map((file, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 bg-red-50/20 dark:bg-red-500/5 border border-red-100 dark:border-red-500/20 rounded-full pr-5 transition-all hover:bg-red-50/50">
                                        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center shrink-0">
                                            <FileText className="w-5 h-5 text-red-600 dark:text-red-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-neutral-800 dark:text-white truncate uppercase tracking-tight">{file.name}</p>
                                            <p className="text-[10px] text-red-600 dark:text-red-400 font-bold hover:underline cursor-pointer" onClick={() => {
                                                const url = URL.createObjectURL(file);
                                                window.open(url, '_blank');
                                            }}>View Document</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setInvoiceFiles(prev => prev.filter((_, i) => i !== idx))}
                                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-all"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )
                    }

                    {/* Add More Invoices Dropzone */}
                    <div
                        className="border-2 border-dashed rounded-3xl p-8 text-center transition-all group relative cursor-pointer border-neutral-200 dark:border-neutral-700 hover:border-red-500/30 hover:bg-red-50/20 dark:hover:bg-red-500/5"
                    >
                        <input
                            type="file"
                            multiple
                            accept="image/*,.pdf"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={e => {
                                if (e.target.files && e.target.files.length > 0) {
                                    setInvoiceFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                                }
                            }}
                        />
                        <Upload className="w-8 h-8 mx-auto mb-3 text-neutral-400 group-hover:text-red-500 transition-colors" strokeWidth={1.5} />
                        <p className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-red-600 transition-colors">
                            {existingInvoices.length > 0 || invoiceFiles.length > 0 ? "Add More Documents" : "Upload Receipts or Invoices"}
                        </p>
                        <p className="text-[10px] text-neutral-400 mt-1.5 uppercase tracking-widest font-bold">Securely click to select files</p>
                    </div>

                    {/* Warning if required but no invoices */}
                    {
                        (stage === "INVOICED" || stage === "RECEIVED") && invoiceFiles.length === 0 && existingInvoices.length === 0 && (
                            <div className="flex items-center gap-2 text-[10px] text-amber-600 bg-amber-50 px-4 py-3 rounded-full font-bold uppercase tracking-widest border border-amber-100">
                                <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.5} />
                                Document is required for {stage.toLowerCase()} stage
                            </div>
                        )
                    }
                </section >

                {/* SECTION 6: NOTES */}
                <section className="space-y-4 pt-4">
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-4 h-4" strokeWidth={2} /> Additional Notes
                    </h3>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Additional notes for supervisor or finance team..."
                        className="w-full px-5 py-4 text-sm border border-neutral-200 dark:border-neutral-700 rounded-3xl bg-white dark:bg-neutral-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium min-h-[100px] resize-none placeholder:text-xs"
                    />
                </section>
            </div>

            {/* BOTTOM ACTIONS - 2 buttons matching filter style */}
            <div className="sticky bottom-0 w-full px-8 py-6 z-30 mt-auto">
                <div className="flex items-center gap-3">
                    {initialData && onDelete && (
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={isSubmitting}
                            className="h-[56px] w-[56px] flex items-center justify-center text-red-500 bg-white/95 dark:bg-neutral-800/95 backdrop-blur-md border border-neutral-200 dark:border-neutral-700 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-sm"
                            title="Delete Request"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}

                    <button
                        disabled={isSubmitting || isReadOnly}
                        onClick={() => handleSave(true)}
                        className="flex-1 h-[56px] text-[14px] font-bold text-neutral-700 dark:text-neutral-300 bg-white/95 dark:bg-neutral-800/95 backdrop-blur-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 active:scale-[0.98] rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                    >
                        {isSubmitting ? "Saving..." : "Save as Draft"}
                    </button>

                    <button
                        disabled={!isValid || isSubmitting || isReadOnly}
                        onClick={() => handleSave(false)}
                        className="flex-[1.5] h-[56px] bg-red-600/95 backdrop-blur-md hover:bg-red-700 text-white rounded-full font-bold text-[14px] active:scale-[0.98] transition-all shadow-lg shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? "Submitting..." : "Submit Request"}
                    </button>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {
                showDeleteConfirm && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
                        <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl">
                            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-7 h-7 text-red-500" />
                            </div>
                            <h3 className="text-lg font-bold text-neutral-900 mb-2 text-center">Delete Request?</h3>
                            <p className="text-sm text-neutral-500 mb-6 text-center font-medium">
                                Are you sure you want to delete this request? This action <span className="text-red-500 font-bold">cannot be undone</span>.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={isSubmitting}
                                    className="flex-1 py-2.5 text-sm font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        try {
                                            setIsSubmitting(true);
                                            await onDelete?.();
                                        } catch (e) {
                                            setIsSubmitting(false);
                                            setShowDeleteConfirm(false);
                                        }
                                    }}
                                    disabled={isSubmitting}
                                    className="flex-1 py-2.5 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? "Deleting..." : "Delete"}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
}
