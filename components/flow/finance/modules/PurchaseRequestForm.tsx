
import { useState, useMemo, useEffect } from "react";
import { clsx } from "clsx";
import { Briefcase, Clock, Package, DollarSign, FileText, CheckCircle, Upload, AlertTriangle, X } from "lucide-react";
import { Select } from "@/shared/ui/primitives/select/select";
import { Category, PurchaseStage, CATEGORY_OPTIONS, SUBCATEGORY_OPTIONS, UNIT_OPTIONS } from "./constants";
import { fetchAllProjects } from "@/lib/api/projects";
import { Project } from "@/types/project";
import { createPurchasingRequest, updatePurchasingRequest } from "@/lib/api/finance";
import { uploadFinanceFile } from "@/lib/api/storage";
import { useFinance } from "../FinanceContext";

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
    initialData
}: {
    onClose: () => void;
    onSuccess?: () => void;
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

    // Parse items from initialData (which is single item flattened) or default
    // If initialData is present, it's a single item edit usually, or we need to handle multi-item edit?
    // The current table structure flattens items. If we edit "a request", we might be editing just that item line?
    // User expectation: "Edit Request" typically implies editing the whole request.
    // However, we only passed a single flattened item.
    // For now, let's assume we are editing the single item as a request with 1 item.
    const [items, setItems] = useState<LineItem[]>(initialData ? [{
        id: initialData.id, // PurchasingItem ID (which is the item id)
        name: initialData.description,
        qty: initialData.quantity,
        unit: initialData.unit,
        unitPrice: (initialData.amount || 0) / (initialData.quantity || 1), // Approximate unit price
        total: initialData.amount || 0
    }] : [
        { id: Math.random().toString(36).substr(2, 9), name: "", qty: 1, unit: "pcs", unitPrice: 0, total: 0 }
    ]);

    const [priceType, setPriceType] = useState<"ESTIMATION" | "ACTUAL">("ESTIMATION");
    const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
    const [notes, setNotes] = useState(initialData?.notes || "");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isReadOnly = initialData && ["APPROVED", "PAID", "REJECTED"].includes(initialData.approval_status);

    // Load Projects
    useEffect(() => {
        fetchAllProjects().then(setProjects);
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
        if (items.some(i => !i.name || i.qty <= 0 || i.unitPrice < 0)) return false;

        if (stage === "INVOICED" || stage === "RECEIVED") {
            if (!vendor) return false;
            // if (!invoiceFile) return false; // Temporarily optional
        }
        return true;
    }, [projectCode, category, subcategory, items, stage, vendor, invoiceFile]);

    const handleSave = async () => {
        if (isReadOnly) return;
        if (!isValid || isSubmitting) return;
        setIsSubmitting(true);

        try {
            const selectedProject = projects.find(p => p.projectCode === projectCode);
            if (!selectedProject) throw new Error("Invalid project selected");

            let uploadedInvoiceUrl = null;
            if (invoiceFile) {
                uploadedInvoiceUrl = await uploadFinanceFile(invoiceFile, "invoices");
                if (!uploadedInvoiceUrl) {
                    const confirmContinue = window.confirm("Failed to upload invoice. Continue without it?");
                    if (!confirmContinue) throw new Error("Upload failed");
                }
            } else if (initialData?.invoice_url) {
                uploadedInvoiceUrl = initialData.invoice_url;
            }

            if (!userId) throw new Error("User not authenticated");

            const payload: any = {
                project_id: selectedProject.id,
                date: new Date().toISOString().split('T')[0],
                vendor: vendor || undefined,
                description: items.length > 1 ? `${items[0].name} + ${items.length - 1} more` : items[0].name,
                type: category as any,
                subcategory,
                amount: totalAmount,
                purchase_stage: stage,
                approval_status: initialData ? initialData.approval_status : "SUBMITTED",
                financial_status: initialData ? initialData.financial_status : "UNPAID",
                invoice_url: uploadedInvoiceUrl || undefined,
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
                {/* SECTION 1: CLASSIFICATION */}
                <section className="space-y-4">
                    <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                        <Briefcase className="w-3.5 h-3.5" strokeWidth={1.5} /> Classification
                    </h3>
                    <div className="space-y-4">
                        <Select
                            label="Project *"
                            value={projectCode}
                            onChange={setProjectCode}
                            options={projectOptions}
                            placeholder="Select project..."
                        />
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
                </section>

                <hr className="border-neutral-100" />

                {/* SECTION 5: DOCUMENTS */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5" strokeWidth={1.5} /> Documents
                        </h3>
                        {stage === "PLANNED" && <span className="text-xs text-neutral-400 italic">Not required for planned</span>}
                        {(stage === "INVOICED" || stage === "RECEIVED") && <span className="text-xs font-bold text-amber-600">* Required</span>}
                    </div>

                    <div
                        className={clsx(
                            "border-2 border-dashed rounded-xl p-8 text-center transition-all group relative",
                            invoiceFile ? "border-emerald-500/40 bg-emerald-50/50" :
                                stage === "PLANNED" ? "border-neutral-100 bg-neutral-50 opacity-60 cursor-not-allowed" : "border-neutral-200 hover:border-red-500/30 hover:bg-red-50/20 cursor-pointer"
                        )}
                    >
                        <input
                            type="file"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                            disabled={stage === "PLANNED"}
                            onChange={e => {
                                if (e.target.files && e.target.files[0]) setInvoiceFile(e.target.files[0]);
                            }}
                        />
                        {invoiceFile ? (
                            <div>
                                <CheckCircle className="w-8 h-8 mx-auto text-emerald-600 mb-2" strokeWidth={1.5} />
                                <p className="text-sm font-bold text-emerald-700">{invoiceFile.name}</p>
                                <p className="text-xs text-emerald-600 mt-1">Ready to upload</p>
                            </div>
                        ) : (
                            <div>
                                <Upload className={clsx("w-8 h-8 mx-auto mb-2 transition-colors", stage === "PLANNED" ? "text-neutral-300" : "text-neutral-400 group-hover:text-red-500")} strokeWidth={1.5} />
                                <p className={clsx("text-sm font-medium", stage === "PLANNED" ? "text-neutral-400" : "text-neutral-600 group-hover:text-neutral-900")}>
                                    {stage === "PLANNED" ? "Upload disabled" : "Upload Invoice / Nota"}
                                </p>
                                {stage !== "PLANNED" && <p className="text-xs text-neutral-400 mt-1">JPG, PNG, PDF</p>}
                            </div>
                        )}
                    </div>

                    {(stage === "INVOICED" || stage === "RECEIVED") && !invoiceFile && (
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
            </div>

            {/* BOTTOM ACTIONS */}
            <div className="sticky bottom-0 w-full p-5 bg-white/20 backdrop-blur-3xl border-t border-white/30 z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.06)] mt-auto">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 h-11 text-sm font-semibold text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        disabled={!isValid || isSubmitting || isReadOnly}
                        onClick={handleSave}
                        className="flex-[2] h-11 text-sm font-bold text-white bg-red-500 hover:bg-red-600 active:scale-[0.98] rounded-xl transition-all shadow-lg shadow-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? "Saving..." : "Save Request"}
                    </button>
                </div>
            </div>
        </>
    );
}
