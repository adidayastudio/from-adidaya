import { useState, useMemo, useEffect } from "react";
import { clsx } from "clsx";
import { Briefcase, Clock, Package, DollarSign, FileText, CheckCircle, Upload, AlertTriangle, X, AlertCircle } from "lucide-react";
import { Select } from "@/shared/ui/primitives/select/select";
import { Category, PurchaseStage, CATEGORY_OPTIONS, SUBCATEGORY_OPTIONS, UNIT_OPTIONS } from "./constants";
import { fetchAllProjects } from "@/lib/api/projects";
import { Project } from "@/types/project";
import { createPurchasingRequest, updatePurchasingRequest, fetchBeneficiaryAccounts, saveBeneficiaryAccount, BeneficiaryAccount } from "@/lib/api/finance";
import { uploadFinanceFile } from "@/lib/api/storage";
import { useFinance } from "../FinanceContext";
import { CreditCard, Save, Trash2 } from "lucide-react";

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
    const [purchaseDate, setPurchaseDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);

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
                description: items.map(i => i.name).join(', '),
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
                    <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                        <Briefcase className="w-3.5 h-3.5" strokeWidth={1.5} /> Classification
                    </h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                label="Project *"
                                value={projectCode}
                                onChange={setProjectCode}
                                options={projectOptions}
                                placeholder="Select project..."
                            />
                            <div>
                                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-1 mb-2 block">
                                    Date *
                                </label>
                                <input
                                    type="date"
                                    value={purchaseDate}
                                    onChange={(e) => setPurchaseDate(e.target.value)}
                                    className="w-full px-4 py-3 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                label="Category *"
                                value={category}
                                onChange={(v) => { setCategory(v as Category); setSubcategory(""); }}
                                options={CATEGORY_OPTIONS}
                            />
                            <Select
                                label="Subcategory *"
                                value={subcategory}
                                onChange={setSubcategory}
                                disabled={!category}
                                options={category ? SUBCATEGORY_OPTIONS[category] : []}
                                placeholder={category ? "Select..." : "Category first"}
                            />
                        </div>
                    </div>
                </section>

                <hr className="border-neutral-100" />

                {/* SECTION 2: STAGE */}
                <section className="space-y-4">
                    <h3 className="text-xs font-bold text-red-500 uppercase tracking-wider flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" strokeWidth={1.5} /> Purchase Stage
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                        {(["PLANNED", "INVOICED", "RECEIVED"] as PurchaseStage[]).map((s) => (
                            <div
                                key={s}
                                onClick={() => setStage(s)}
                                className={clsx(
                                    "relative p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-3",
                                    stage === s ? "border-red-500/40 bg-red-50/30 shadow-[0_0_15px_rgba(239,68,68,0.08)]" : "border-neutral-100/50 hover:border-red-200 bg-white/40"
                                )}
                            >
                                <div className={clsx(
                                    "w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                                    stage === s ? "border-red-500/60" : "border-neutral-300"
                                )}>
                                    {stage === s && <div className="w-2 h-2 rounded-full bg-red-500" />}
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-semibold text-neutral-900">
                                        {s === "PLANNED" && "Planned (Estimation)"}
                                        {s === "INVOICED" && "Invoiced (Tagihan Ada)"}
                                        {s === "RECEIVED" && "Received (Barang Terima)"}
                                    </div>
                                    <div className="text-xs text-neutral-700 mt-1 font-medium">
                                        {s === "PLANNED" && "Belum dibeli, belum invoice, belum barang."}
                                        {s === "INVOICED" && "Invoice sudah ada, barang mungkin belum diterima."}
                                        {s === "RECEIVED" && "Barang/jasa sudah diterima (kasbon atau post-spend)."}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <hr className="border-neutral-100" />

                {/* SECTION 3: ITEMS TABLE */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                            <Package className="w-3.5 h-3.5" strokeWidth={1.5} /> Item Details
                        </h3>
                        <button
                            onClick={addItem}
                            className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-neutral-50 transition-colors"
                        >
                            + Add Item
                        </button>
                    </div>

                    <div className="space-y-4">
                        {items.map((item, index) => (
                            <div
                                key={item.id}
                                className="relative p-5 rounded-[2rem] bg-white/60 border border-white/40 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-300 space-y-5 group backdrop-blur-[2px] animate-in fade-in slide-in-from-bottom-2"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-1.5 ml-1">Item Name *</label>
                                        <input
                                            type="text"
                                            value={item.name}
                                            onChange={e => updateItem(item.id, { name: e.target.value })}
                                            placeholder="e.g. Semen Tiga Roda"
                                            className="w-full h-11 px-4 text-sm border border-neutral-100 rounded-2xl bg-neutral-50/50 focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 focus:bg-white transition-all font-medium"
                                        />
                                    </div>
                                    {items.length > 1 && (
                                        <button
                                            onClick={() => removeItem(item.id)}
                                            className="mt-7 p-2 text-neutral-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                        >
                                            <X className="w-4 h-4" strokeWidth={1.5} />
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-12 gap-3">
                                    <div className="col-span-4">
                                        <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-1.5 ml-1">Qty *</label>
                                        <input
                                            type="number"
                                            value={item.qty}
                                            onChange={e => updateItem(item.id, { qty: parseFloat(e.target.value) || 0 })}
                                            className="w-full h-11 px-4 text-sm border border-neutral-100 rounded-2xl bg-neutral-50/50 focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 focus:bg-white transition-all font-medium"
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-1.5 ml-1">Unit *</label>
                                        <select
                                            value={item.unit}
                                            onChange={e => updateItem(item.id, { unit: e.target.value })}
                                            className="w-full h-11 px-3 text-xs border border-neutral-100 rounded-2xl bg-neutral-50/50 focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 focus:bg-white transition-all font-medium appearance-none"
                                        >
                                            {UNIT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-5">
                                        <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-1.5 ml-1">Unit Price *</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-xs font-bold font-mono">Rp</span>
                                            <input
                                                type="number"
                                                value={item.unitPrice}
                                                onChange={e => updateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                                                className="w-full h-11 pl-10 pr-4 text-sm border border-neutral-100 rounded-2xl bg-neutral-50/50 focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 focus:bg-white transition-all font-bold text-neutral-900"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-neutral-50">
                                    <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest ml-1">Subtotal Item</span>
                                    <span className="text-sm font-bold text-neutral-900 bg-neutral-50 px-3 py-1 rounded-full">Rp {item.total.toLocaleString("id-ID")}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* VENDOR (Global for all items in this request) */}
                    <div className="pt-2">
                        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5 leading-none">
                            Vendor {stage !== "PLANNED" && "*"}
                        </label>
                        <input
                            type="text"
                            value={vendor}
                            onChange={e => setVendor(e.target.value)}
                            placeholder={stage === "PLANNED" ? "Preferred vendor (Optional)" : "Vendor name (Required)"}
                            className="w-full h-10 px-4 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium"
                        />
                    </div>

                    {/* BENEFICIARY ACCOUNT */}
                    <div className="pt-4 border-t border-neutral-100 mt-4 space-y-4">
                        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                            <CreditCard className="w-3.5 h-3.5" strokeWidth={1.5} /> Vendor Account Details
                        </h3>

                        {/* Saved Account Selector */}
                        {savedAccounts.length > 0 && (
                            <Select
                                label="Quick Select (Saved Accounts)"
                                value=""
                                onChange={(val) => {
                                    const acc = savedAccounts.find(a => a.id === val);
                                    if (acc) {
                                        setBankName(acc.bank_name);
                                        setAccountNumber(acc.account_number);
                                        setAccountName(acc.account_name);
                                    }
                                }}
                                options={[
                                    { value: "", label: "Select from saved..." },
                                    ...savedAccounts.map(a => ({ value: a.id, label: `${a.bank_name} - ${a.account_number} (${a.account_name})` }))
                                ]}
                            />
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Bank Name</label>
                                <input
                                    type="text"
                                    value={bankName}
                                    onChange={e => setBankName(e.target.value)}
                                    disabled={isReadOnly}
                                    placeholder="e.g. BCA"
                                    className={clsx(
                                        "w-full h-10 px-4 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium",
                                        isReadOnly && "bg-neutral-50 text-neutral-500"
                                    )}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Account Number</label>
                                <input
                                    type="text"
                                    value={accountNumber}
                                    onChange={e => setAccountNumber(e.target.value)}
                                    disabled={isReadOnly}
                                    placeholder="e.g. 1234567890"
                                    className={clsx(
                                        "w-full h-10 px-4 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium",
                                        isReadOnly && "bg-neutral-50 text-neutral-500"
                                    )}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Account Name</label>
                                <input
                                    type="text"
                                    value={accountName}
                                    onChange={e => setAccountName(e.target.value)}
                                    disabled={isReadOnly}
                                    placeholder="e.g. PT Vendor Maju Jaya"
                                    className={clsx(
                                        "w-full h-10 px-4 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium",
                                        isReadOnly && "bg-neutral-50 text-neutral-500"
                                    )}
                                />
                            </div>
                        </div>

                        {!isReadOnly && bankName && accountNumber && (
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div className={clsx(
                                    "w-5 h-5 rounded-lg border flex items-center justify-center transition-all",
                                    saveToSaved ? "bg-red-500 border-red-500 text-white" : "border-neutral-300 bg-white group-hover:border-red-400"
                                )}>
                                    {saveToSaved && <Save className="w-3 h-3" />}
                                </div>
                                <input type="checkbox" className="hidden" checked={saveToSaved} onChange={() => setSaveToSaved(!saveToSaved)} />
                                <span className="text-xs font-bold text-neutral-600 group-hover:text-red-600 transition-colors">Save to shared accounts</span>
                            </label>
                        )}
                    </div>

                    {/* PRICE TYPE & TOTAL SUMMARY */}
                    <div className="bg-red-50/50 rounded-2xl p-5 space-y-4 border border-red-100">
                        <div className="flex items-center justify-between text-red-900">
                            <h4 className="text-xs font-bold uppercase tracking-widest">Pricing Policy</h4>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <div className={clsx("w-4 h-4 rounded-full border flex items-center justify-center transition-all", priceType === "ESTIMATION" ? "border-red-500/40 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.2)]" : "border-neutral-300 bg-white")}>
                                        {priceType === "ESTIMATION" && <div className="w-1.5 h-1.5 rounded-full bg-white animate-in zoom-in-50 duration-200" />}
                                    </div>
                                    <input type="radio" checked={priceType === "ESTIMATION"} onChange={() => setPriceType("ESTIMATION")} className="hidden" />
                                    <span className="text-xs font-bold">Estimation</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <div className={clsx("w-4 h-4 rounded-full border flex items-center justify-center transition-all", priceType === "ACTUAL" ? "border-red-500/40 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.2)]" : "border-neutral-300 bg-white")}>
                                        {priceType === "ACTUAL" && <div className="w-1.5 h-1.5 rounded-full bg-white animate-in zoom-in-50 duration-200" />}
                                    </div>
                                    <input type="radio" checked={priceType === "ACTUAL"} onChange={() => setPriceType("ACTUAL")} className="hidden" />
                                    <span className="text-xs font-bold">Actual</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-red-200/50">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest leading-none mb-1">Total Amount</span>
                                <span className="text-xs text-red-700 font-medium">{items.length} items included</span>
                            </div>
                            <span className="text-xl font-black text-red-600 tracking-tight">Rp {totalAmount.toLocaleString("id-ID")}</span>
                        </div>
                    </div>
                </section >

                <hr className="border-neutral-100" />

                {/* SECTION 5: DOCUMENTS - Multiple Invoices */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5" strokeWidth={1.5} /> Documents
                        </h3>
                        {stage === "PLANNED" && <span className="text-xs text-neutral-400 italic">Not required for planned</span>}
                        {(stage === "INVOICED" || stage === "RECEIVED") && <span className="text-xs font-bold text-amber-600">* Required</span>}
                    </div>

                    {/* Existing Invoices List */}
                    {existingInvoices.length > 0 && (
                        <div className="space-y-2">
                            {existingInvoices.map((inv, idx) => (
                                <div key={inv.id} className="flex items-center gap-3 p-3 bg-blue-50/50 border border-blue-200/50 rounded-xl">
                                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                                        <FileText className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-blue-800 truncate">{inv.invoice_name || `Invoice ${idx + 1}`}</p>
                                        <p className="text-xs text-blue-600">Already uploaded</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => window.open(inv.invoice_url, '_blank')}
                                        className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-100 hover:bg-blue-200 rounded-lg transition-all"
                                    >
                                        View
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setExistingInvoices(prev => prev.filter(i => i.id !== inv.id))}
                                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* New Invoice Files List */}
                    {invoiceFiles.length > 0 && (
                        <div className="space-y-2">
                            {invoiceFiles.map((file, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-3 bg-emerald-50/50 border border-emerald-200/50 rounded-xl">
                                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-emerald-800 truncate">{file.name}</p>
                                        <p className="text-xs text-emerald-600">Ready to upload</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setInvoiceFiles(prev => prev.filter((_, i) => i !== idx))}
                                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add More Invoices Dropzone */}
                    <div
                        className="border-2 border-dashed rounded-xl p-6 text-center transition-all group relative cursor-pointer border-neutral-200 hover:border-red-500/30 hover:bg-red-50/20"
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
                        <Upload className="w-6 h-6 mx-auto mb-2 text-neutral-400 group-hover:text-red-500 transition-colors" strokeWidth={1.5} />
                        <p className="text-sm font-medium text-neutral-600 group-hover:text-neutral-900">
                            {existingInvoices.length > 0 || invoiceFiles.length > 0 ? "Add More Invoices" : "Upload Invoice / Nota"}
                        </p>
                        <p className="text-xs text-neutral-400 mt-1">JPG, PNG, PDF {stage === "PLANNED" && "(Optional for now)"}</p>
                    </div>

                    {/* Warning if required but no invoices */}
                    {(stage === "INVOICED" || stage === "RECEIVED") && invoiceFiles.length === 0 && existingInvoices.length === 0 && (
                        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.5} />
                            Invoice wajib diunggah karena transaksi {stage === "RECEIVED" ? "sudah dibeli" : "sudah ditagihkan"}.
                        </div>
                    )}
                </section>

                {/* SECTION 6: NOTES */}
                <section className="space-y-4">
                    <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Additional Notes</h3>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Catatan tambahan untuk SPV / Finance..."
                        className="w-full px-4 py-3 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium min-h-[80px]"
                    />
                </section>
            </div >

            {/* BOTTOM ACTIONS */}
            <div className="sticky bottom-0 w-full p-5 bg-white/20 backdrop-blur-3xl border-t border-white/30 z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.06)] mt-auto">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onClose}
                        className="h-11 px-5 text-sm font-semibold text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-all"
                    >
                        Cancel
                    </button>

                    {initialData && onDelete && (
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={isSubmitting}
                            className="h-11 w-11 flex items-center justify-center text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                            title="Delete Request"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}

                    {/* Save as Draft */}
                    <button
                        disabled={isSubmitting || isReadOnly}
                        onClick={() => handleSave(true)}
                        className="flex-1 h-11 text-sm font-bold text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-50 active:scale-[0.98] rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {isSubmitting ? "Saving..." : "Save as Draft"}
                    </button>

                    {/* Submit Request */}
                    <button
                        disabled={!isValid || isSubmitting || isReadOnly}
                        onClick={() => handleSave(false)}
                        className="flex-1 h-11 text-sm font-bold text-white bg-red-500 hover:bg-red-600 active:scale-[0.98] rounded-xl transition-all shadow-lg shadow-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? "Submitting..." : "Submit Request"}
                    </button>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
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
            )}
        </>
    );
}
