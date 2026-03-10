
import { useState, useMemo, useEffect } from "react";
import { clsx } from "clsx";
import { MapPin, Car, Package, Wrench, Utensils, Home, MoreHorizontal, DollarSign, CheckCircle, Upload, X, Plus } from "lucide-react";
import { Select } from "@/shared/ui/primitives/select/select";
import { formatCurrency } from "./utils";
import {
    ReimburseCategory,
    REIMBURSE_CATEGORY_OPTIONS,
    REIMBURSE_SUBCATEGORY_OPTIONS,
    UNIT_OPTIONS
} from "./constants";
import { fetchAllProjects } from "@/lib/api/projects";
import { Project } from "@/types/project";
import { createReimburseRequest, updateReimburseRequest, fetchBeneficiaryAccounts, saveBeneficiaryAccount, BeneficiaryAccount } from "@/lib/api/finance";
import { uploadFinanceFile, getFinanceFileUrl } from "@/lib/api/storage";
import { useFinance } from "../FinanceContext";
import { FileText, Send, Trash2, Clock, Briefcase, FileSignature, ReceiptText, CreditCard, Save } from "lucide-react";
import { SearchableAccountSelect } from "./SearchableAccountSelect";
import { ResourceSearchInput } from "./ResourceSearchInput";

// Standard Mileage Rates (can be adjusted)
const MILEAGE_RATES: Record<string, number> = {
    MOTOR_PERSONAL: 3000, // Rp 3.000 / km
    CAR_PERSONAL: 6000    // Rp 6.000 / km
};

interface LineItem {
    id: string;
    name: string;
    qty: number;
    unit: string;
    unitPrice: number;
    total: number;
    subcategory?: string;
    group_name?: string;
}

export function ReimburseRequestForm({
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
    const [projectCode, setProjectCode] = useState("");
    const [projects, setProjects] = useState<Project[]>([]);

    // Core Fields
    const [reimbCategory, setReimbCategory] = useState<string>(initialData?.category || "");
    const [reimbSubcategory, setReimbSubcategory] = useState<string>(initialData?.subcategory || "");
    const [reimbDate, setReimbDate] = useState("");
    const [reimbDescription, setReimbDescription] = useState(initialData?.description || "");
    const [targetDate, setTargetDate] = useState(initialData?.target_date?.split("T")[0] || "");
    const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">(initialData?.priority || "MEDIUM");

    // Transport Specific
    const [transOrigin, setTransOrigin] = useState("");
    const [transDestination, setTransDestination] = useState("");
    const [transDistance, setTransDistance] = useState<number | "">("");

    const [items, setItems] = useState<LineItem[]>([
        { id: Math.random().toString(36).substr(2, 9), name: "", qty: 1, unit: "pcs", unitPrice: 0, total: 0 }
    ]);
    const [invoiceFiles, setInvoiceFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<{ id: string; url: string; name: string }[]>([]);
    const [existingInvoices, setExistingInvoices] = useState<any[]>([]); // To track already uploaded ones
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Beneficiary State
    const [bankName, setBankName] = useState(initialData?.beneficiary_bank || "");
    const [accountNumber, setAccountNumber] = useState(initialData?.beneficiary_number || "");
    const [accountName, setAccountName] = useState(initialData?.beneficiary_name || "");
    const [savedAccounts, setSavedAccounts] = useState<BeneficiaryAccount[]>([]);
    const [saveToSaved, setSaveToSaved] = useState(false);

    const isReadOnly = initialData && ["APPROVED", "PAID", "REJECTED", "CANCELLED"].includes(initialData.status);
    const isEditMode = !!initialData;
    const canEdit = !isReadOnly || (initialData?.status === "DRAFT" || initialData?.status === "NEED_REVISION");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        console.log("[DEBUG] ReimburseRequestForm - savedAccounts length:", savedAccounts.length);
    }, [savedAccounts]);

    // Load Preview URLs for existing invoices
    useEffect(() => {
        const loadPreviews = async () => {
            if (initialData?.existingInvoices?.length > 0) {
                const previews = await Promise.all(
                    initialData.existingInvoices.map(async (inv: any) => {
                        const url = inv.invoice_url.startsWith('http') ? inv.invoice_url : await getFinanceFileUrl(inv.invoice_url);
                        return { id: inv.id, url, name: inv.invoice_name || "Existing Document" };
                    })
                );
                setExistingInvoices(initialData.existingInvoices);
                setPreviewUrls(previews);
            }
        };
        loadPreviews();
    }, [initialData?.existingInvoices]);

    // Load Projects
    useEffect(() => {
        fetchAllProjects().then(setProjects);
        fetchBeneficiaryAccounts().then(accounts => {
            console.log("[DEBUG] ReimburseRequestForm - Loaded accounts:", accounts);
            setSavedAccounts(accounts);
        });

        if (initialData) {
            console.log("Debug Load - Initial Data:", initialData);
            setProjectCode(initialData.project_code || initialData.project?.project_code || "");
            setReimbDate(initialData.date?.split("T")[0] || "");
            setTargetDate(initialData.target_date?.split("T")[0] || "");
            setReimbDescription(initialData.description || "");

            // Fix: Category/Subcategory mapping (might be 'type' in legacy or from API)
            setReimbCategory(initialData.category || initialData.type || "");
            setReimbSubcategory(initialData.subcategory || "");

            // Restore Transport Details if available
            if (initialData.details) {
                console.log("Debug Load - Restoring Details:", initialData.details);
                setTransOrigin(initialData.details.origin || "");
                setTransDestination(initialData.details.destination || "");
                setTransDistance(initialData.details.distance || "");
            } else {
                console.log("Debug Load - No details found in initialData");
            }

            // Map items
            if (initialData.items && initialData.items.length > 0) {
                setItems(initialData.items.map((i: any) => ({
                    id: i.id || Math.random().toString(36).substr(2, 9),
                    name: i.name || i.description || "",
                    qty: i.qty || i.quantity || 1,
                    unit: i.unit || "pcs",
                    unitPrice: i.unit_price || i.unitPrice || 0,
                    total: i.total || i.amount || 0,
                    subcategory: i.subcategory,
                    group_name: i.group_name
                })));
            } else if (initialData.amount) {
                // Fallback for single item from flattened data
                setItems([{
                    id: Math.random().toString(36).substr(2, 9),
                    name: initialData.description || "",
                    qty: initialData.quantity || 1,
                    unit: initialData.unit || "pcs",
                    unitPrice: initialData.quantity > 0 ? (initialData.amount || 0) / initialData.quantity : 0,
                    total: initialData.amount || 0
                }]);
            }
        }
    }, [initialData]);

    const projectOptions = useMemo(() => {
        return projects.map(p => ({ value: p.projectCode, label: `${p.projectCode} - ${p.projectName}` }));
    }, [projects]);

    const subcategoryOptions = useMemo(() => {
        if (!reimbCategory) return [];
        return REIMBURSE_SUBCATEGORY_OPTIONS[reimbCategory] || [];
    }, [reimbCategory]);

    // -- CALCULATE ESTIMATED TRANSPORT COST (SYSTEM) --
    const transportEstCost = useMemo(() => {
        if (reimbCategory === "TRANSPORTATION" && ["MOTOR_PERSONAL", "CAR_PERSONAL"].includes(reimbSubcategory)) {
            const rate = MILEAGE_RATES[reimbSubcategory] || 0;
            const dist = typeof transDistance === 'number' ? transDistance : parseFloat(transDistance) || 0;
            return dist * rate;
        }
        return 0;
    }, [reimbCategory, reimbSubcategory, transDistance]);


    // -- ITEM ACTIONS --
    const addItem = () => {
        if (!canEdit) return;
        setItems([...items, { id: Math.random().toString(36).substr(2, 9), name: "", qty: 1, unit: "pcs", unitPrice: 0, total: 0 }]);
    };

    const removeItem = (id: string) => {
        if (!canEdit) return;
        if (items.length > 1) {
            setItems(items.filter(i => i.id !== id));
        }
    };

    const updateItem = (id: string, updates: Partial<LineItem>) => {
        if (!canEdit) return;
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
        if (!reimbCategory || !reimbSubcategory || !reimbDate) return false;
        if (items.some(i => !i.name || i.qty <= 0 || i.unitPrice < 0)) return false;

        const REQUIRE_TRIP_DETAILS = [
            "MOTOR_PERSONAL", "CAR_PERSONAL", "FUEL_PERSONAL",
            "MOTOR_ONLINE", "CAR_ONLINE", "PUBLIC_TRANSPORT",
            "TAXI", "RENTAL", "COURIER", "LOGISTICS"
        ];

        if (reimbCategory === "TRANSPORTATION" && REQUIRE_TRIP_DETAILS.includes(reimbSubcategory)) {
            if (!transOrigin || !transDestination || !transDistance) return false;
        }

        return true;
    }, [projectCode, reimbCategory, reimbSubcategory, reimbDescription, reimbDate, items, transOrigin, transDestination, transDistance]);

    const handleSave = async (asDraft: boolean = false) => {
        if (!canEdit) return;
        if ((!isValid && !asDraft) || isSubmitting) return;

        if (!isValid) {
            alert("Please fill in all required fields.");
            return;
        }

        setIsSubmitting(true);

        try {
            const selectedProject = projects.find(p => p.projectCode === projectCode);
            if (!selectedProject) throw new Error("Invalid project selected");

            // 1. Upload new files
            const uploadedInvoiceFiles = [];
            for (const file of invoiceFiles) {
                const url = await uploadFinanceFile(file, "invoices");
                if (!url) {
                    throw new Error(`Failed to upload ${file.name}. It may be too large or there is a network issue.`);
                }
                uploadedInvoiceFiles.push({ url, name: file.name });
            }

            const allInvoiceUrls = [
                ...existingInvoices.map(inv => inv.invoice_url),
                ...uploadedInvoiceFiles.map(i => i.url)
            ];
            const primaryInvoiceUrl = allInvoiceUrls[0] || null;

            if (!userId) throw new Error("User not authenticated");

            // Construct Details JSON
            const details: any = {};
            const SAVE_TRIP_DETAILS = [
                "MOTOR_PERSONAL", "CAR_PERSONAL", "FUEL_PERSONAL",
                "MOTOR_ONLINE", "CAR_ONLINE", "PUBLIC_TRANSPORT",
                "TAXI", "RENTAL", "COURIER", "LOGISTICS"
            ];

            if (reimbCategory === "TRANSPORTATION" && SAVE_TRIP_DETAILS.includes(reimbSubcategory)) {
                details.origin = transOrigin;
                details.destination = transDestination;
                details.distance = (typeof transDistance === "number" ? transDistance : parseFloat(transDistance) || 0);

                if (["MOTOR_PERSONAL", "CAR_PERSONAL"].includes(reimbSubcategory)) {
                    details.transportEstCost = transportEstCost;
                }
            }

            const payload = {
                project_id: selectedProject.id,
                date: reimbDate,
                description: reimbDescription,
                category: reimbCategory,
                subcategory: reimbSubcategory,
                priority,
                amount: totalAmount,
                target_date: targetDate || null,
                status: asDraft ? "DRAFT" : "PENDING",
                invoice_url: primaryInvoiceUrl || undefined,
                invoice_urls: uploadedInvoiceFiles.map((item) => ({
                    invoice_url: item.url,
                    invoice_name: item.name
                })),
                existing_invoice_ids: existingInvoices.map(inv => inv.id),
                created_by: userId,
                details: details,
                items: items.map(i => ({
                    name: i.name,
                    qty: i.qty,
                    unit: i.unit,
                    unitPrice: i.unitPrice,
                    total: i.total
                })),
                beneficiary_bank: bankName,
                beneficiary_number: accountNumber,
                beneficiary_name: accountName
            };

            if (initialData?.id) {
                await updateReimburseRequest(initialData.id, payload);
            } else {
                await createReimburseRequest(payload);
            }

            if (saveToSaved && bankName && accountNumber && userId) {
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
            console.error("Error saving reimburse request:", error);
            alert(error instanceof Error ? error.message : "Failed to save request.");
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div className="p-6 space-y-8 pb-32">
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
                            disabled={!canEdit}
                            className="rounded-full"
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider px-1 mb-1.5 ml-1">Invoice Date</label>
                                <input
                                    type="date"
                                    value={reimbDate}
                                    onChange={e => setReimbDate(e.target.value)}
                                    disabled={!canEdit}
                                    className={clsx(
                                        "w-full max-w-full block min-w-0 h-9 pl-3 pr-8 text-base md:text-sm border border-neutral-200 rounded-full bg-white text-neutral-900 focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium appearance-none cursor-pointer",
                                        !canEdit && "opacity-60 cursor-not-allowed"
                                    )}
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider px-1 mb-1.5 ml-1">Target Date</label>
                                <input
                                    type="date"
                                    value={targetDate}
                                    onChange={e => setTargetDate(e.target.value)}
                                    disabled={!canEdit}
                                    className={clsx(
                                        "w-full max-w-full block min-w-0 h-9 pl-3 pr-8 text-base md:text-sm border border-neutral-200 rounded-full bg-white text-neutral-900 focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium appearance-none cursor-pointer",
                                        !canEdit && "opacity-60 cursor-not-allowed"
                                    )}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                label="Category"
                                value={reimbCategory}
                                onChange={(val) => {
                                    setReimbCategory(val as string);
                                    setReimbSubcategory("");
                                }}
                                options={REIMBURSE_CATEGORY_OPTIONS}
                                disabled={!canEdit}
                                placeholder="Select category..."
                                className="rounded-full"
                            />
                            <Select
                                label="Subcategory"
                                value={reimbSubcategory}
                                onChange={(val) => setReimbSubcategory(val as string)}
                                options={subcategoryOptions}
                                disabled={!canEdit || !reimbCategory}
                                placeholder={!reimbCategory ? "Select Category first" : "Select subcategory..."}
                                className="rounded-full"
                            />
                        </div>

                        <div className="pt-2">
                            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider px-1 mb-2.5">
                                Priority Level
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {(["URGENT", "HIGH", "MEDIUM", "LOW"] as const).map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        disabled={!canEdit}
                                        onClick={() => setPriority(p)}
                                        className={clsx(
                                            "py-2.5 rounded-full text-[11px] font-bold ring-1 transition-all uppercase tracking-wider",
                                            priority === p
                                                ? p === "URGENT" ? "bg-red-500 text-white ring-red-500 shadow-md shadow-red-500/20"
                                                    : p === "HIGH" ? "bg-orange-500 text-white ring-orange-500 shadow-md shadow-orange-500/20"
                                                        : "bg-neutral-800 text-white ring-neutral-800 shadow-md"
                                                : "bg-white dark:bg-neutral-800 text-neutral-500 ring-neutral-200 dark:ring-neutral-700 hover:ring-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700",
                                            !canEdit && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>


                {/* SECTION 2: ITEM DETAILS (Trip Details + Items Table) */}
                <section className="space-y-6 pt-4">
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

                    {/* Trip Details (Context for the request) */}
                    {reimbCategory === "TRANSPORTATION" && [
                        "MOTOR_PERSONAL", "CAR_PERSONAL", "FUEL_PERSONAL",
                        "MOTOR_ONLINE", "CAR_ONLINE", "PUBLIC_TRANSPORT",
                        "TAXI", "RENTAL", "COURIER", "LOGISTICS"
                    ].includes(reimbSubcategory) && (
                            <div className="p-6 rounded-3xl bg-neutral-50/50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-700/50 space-y-4 animate-in fade-in slide-in-from-top-2 shadow-sm">
                                <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                                    <MapPin className="w-3.5 h-3.5" /> Trip Context
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-1">
                                        <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 ml-1">From (Origin)</label>
                                        <input
                                            type="text"
                                            value={transOrigin}
                                            onChange={e => setTransOrigin(e.target.value)}
                                            disabled={!canEdit}
                                            placeholder="e.g. Office"
                                            className="w-full h-11 px-5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-full bg-white dark:bg-neutral-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium placeholder:text-[11px]"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 ml-1">To (Destination)</label>
                                        <input
                                            type="text"
                                            value={transDestination}
                                            onChange={e => setTransDestination(e.target.value)}
                                            disabled={!canEdit}
                                            placeholder="e.g. Project Site A"
                                            className="w-full h-11 px-5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-full bg-white dark:bg-neutral-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium placeholder:text-[11px]"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 ml-1">Distance (km)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={transDistance}
                                                onChange={e => setTransDistance(parseFloat(e.target.value) || "")}
                                                disabled={!canEdit}
                                                placeholder="0"
                                                className="w-full h-11 px-5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-full bg-white dark:bg-neutral-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium placeholder:text-[11px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400 pointer-events-none">km</span>
                                        </div>
                                    </div>

                                    {["MOTOR_PERSONAL", "CAR_PERSONAL"].includes(reimbSubcategory) && (
                                        <div className="col-span-2 bg-white dark:bg-neutral-800 rounded-2xl p-4 border border-red-100 dark:border-red-500/20 flex justify-between items-center shadow-sm">
                                            <div className="flex flex-col">
                                                <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">System Estimation</span>
                                                <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                                                    {reimbSubcategory === "MOTOR_PERSONAL" ? "Rp 3.000" : "Rp 6.000"} x {typeof transDistance === "number" ? transDistance : 0} km
                                                </span>
                                            </div>
                                            <span className="text-sm font-bold text-red-600 dark:text-red-400">Rp {transportEstCost.toLocaleString("id-ID")}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                    <div className="space-y-4">
                        {items.map((item, index) => (
                            <div
                                key={item.id}
                                className="relative p-6 rounded-3xl bg-white/60 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-700/40 shadow-sm transition-all duration-300 space-y-5 group backdrop-blur-[2px] animate-in fade-in slide-in-from-bottom-2"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 ml-1">Item Name</label>
                                        <ResourceSearchInput
                                            value={item.name}
                                            category={reimbCategory === "PURCHASE_PROJECT" ? "material" : "material"}
                                            onSelect={(selected) => updateItem(item.id, {
                                                name: selected.name,
                                                unit: selected.unit || item.unit,
                                                unitPrice: selected.price || item.unitPrice,
                                                subcategory: selected.subcategory,
                                                group_name: selected.group_name
                                            })}
                                            placeholder="e.g. Lunch at Site"
                                            disabled={!canEdit}
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

                    {/* TOTAL SUMMARY */}
                    <div className="mt-4 p-8 rounded-3xl bg-gradient-to-br from-red-500 to-red-600 border border-red-400 shadow-xl shadow-red-500/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                        <div className="relative flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-red-100 uppercase tracking-[0.2em] leading-none mb-2">Total Claim Amount</span>
                                <span className="text-xs text-red-100/70 font-medium">{items.length} items summarized</span>
                            </div>
                            <span className="text-3xl font-black text-white tracking-tight">Rp {totalAmount.toLocaleString("id-ID")}</span>
                        </div>
                    </div>
                </section>


                {/* SECTION 3: ACCOUNT DETAILS */}
                <section className="space-y-4 pt-4">
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                        <CreditCard className="w-4 h-4" strokeWidth={2} /> Beneficiary Information
                    </h3>

                    <div className="space-y-4">
                        {/* Saved Account Selector - Searchable */}
                        {canEdit && savedAccounts.length > 0 && (
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
                                    disabled={!canEdit}
                                    placeholder="e.g. BCA"
                                    className={clsx(
                                        "w-full h-11 px-5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-full bg-white dark:bg-neutral-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium placeholder:text-[11px]",
                                        !canEdit && "bg-neutral-50 text-neutral-500"
                                    )}
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 ml-1">Account Number</label>
                                <input
                                    type="text"
                                    value={accountNumber}
                                    onChange={e => setAccountNumber(e.target.value)}
                                    disabled={!canEdit}
                                    placeholder="e.g. 1234567890"
                                    className={clsx(
                                        "w-full h-11 px-5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-full bg-white dark:bg-neutral-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium placeholder:text-[11px]",
                                        !canEdit && "bg-neutral-50 text-neutral-500"
                                    )}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 ml-1">Account Name</label>
                                <input
                                    type="text"
                                    value={accountName}
                                    onChange={e => setAccountName(e.target.value)}
                                    disabled={!canEdit}
                                    placeholder="e.g. Adidaya Studio"
                                    className={clsx(
                                        "w-full h-11 px-5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-full bg-white dark:bg-neutral-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-bold text-neutral-900 dark:text-white placeholder:text-[11px]",
                                        !canEdit && "bg-neutral-50 text-neutral-500"
                                    )}
                                />
                            </div>
                        </div>
                        {canEdit && bankName && accountNumber && !savedAccounts.some(acc => acc.account_number === accountNumber && acc.bank_name === bankName) && (
                            <div
                                onClick={() => setSaveToSaved(!saveToSaved)}
                                className="flex items-center justify-between p-4 rounded-3xl bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 cursor-pointer hover:border-red-200 transition-all group shadow-sm"
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
                                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                    saveToSaved ? "border-red-500 bg-red-500 text-white" : "border-neutral-200 dark:border-neutral-600"
                                )}>
                                    {saveToSaved && <CheckCircle className="w-4 h-4" />}
                                </div>
                            </div>
                        )}
                    </div>
                </section>


                {/* SECTION 4: DOCUMENTS (Aligned with Purchase Request) */}
                <section className="space-y-4 pt-4" >
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                        <Upload className="w-4 h-4" strokeWidth={2} /> Proof Documents
                    </h3>

                    <div className="space-y-3">
                        {/* List of existing and new documents */}
                        {[...previewUrls].map((p, idx) => (
                            <div key={p.id || idx} className="flex items-center gap-3 p-3 bg-red-50/20 dark:bg-red-500/5 border border-red-100 dark:border-red-500/20 rounded-full pr-5 transition-all hover:bg-red-50/50">
                                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center shrink-0">
                                    <ReceiptText className="w-5 h-5 text-red-600 dark:text-red-400" />
                                </div>
                                <div className="flex-1 min-w-0 px-1">
                                    <p className="text-xs font-bold text-neutral-800 dark:text-white truncate uppercase tracking-tight">{p.name}</p>
                                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-red-600 dark:text-red-400 font-bold hover:underline">View Document</a>
                                </div>
                                {canEdit && (
                                    <button
                                        onClick={() => {
                                            if (p.id) {
                                                setExistingInvoices(existingInvoices.filter(inv => inv.id !== p.id));
                                            } else {
                                                const fileIdx = idx - existingInvoices.length;
                                                setInvoiceFiles(invoiceFiles.filter((_, i) => i !== fileIdx));
                                            }
                                            setPreviewUrls(previewUrls.filter((_, i) => i !== idx));
                                        }}
                                        className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-all"
                                    >
                                        <X className="w-4 h-4" strokeWidth={2.5} />
                                    </button>
                                )}
                            </div>
                        ))}

                        {/* Dropzone matching Purchase style */}
                        {canEdit && (
                            <div className="relative border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 text-center transition-all group hover:border-red-500/30 hover:bg-red-50/20 dark:hover:bg-red-500/5 cursor-pointer">
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*,.pdf"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    onChange={async (e) => {
                                        if (e.target.files) {
                                            const newFiles = Array.from(e.target.files);
                                            setInvoiceFiles([...invoiceFiles, ...newFiles]);
                                            const newPreviews = newFiles.map(file => ({
                                                id: "",
                                                url: URL.createObjectURL(file),
                                                name: file.name
                                            }));
                                            setPreviewUrls([...previewUrls, ...newPreviews]);
                                        }
                                    }}
                                />
                                <Upload className="w-8 h-8 mx-auto mb-3 text-neutral-400 group-hover:text-red-500 transition-colors" strokeWidth={1.5} />
                                <p className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-red-600 transition-colors">
                                    {previewUrls.length > 0 ? "Add More Documents" : "Upload Receipts or Invoices"}
                                </p>
                                <p className="text-[10px] text-neutral-400 mt-1.5 uppercase tracking-widest font-bold">Securely click to select files</p>
                            </div>
                        )}
                    </div>
                </section>


                {/* SECTION 5: NOTES */}
                <section className="space-y-4 pt-4" >
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-4 h-4" strokeWidth={2} /> Additional Notes
                    </h3>
                    <div className="relative">
                        <textarea
                            value={reimbDescription}
                            onChange={(e) => setReimbDescription(e.target.value)}
                            disabled={!canEdit}
                            placeholder="Add your notes here..."
                            rows={3}
                            className="w-full px-5 py-4 text-sm border border-neutral-200 dark:border-neutral-700 rounded-3xl bg-white dark:bg-neutral-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium resize-none placeholder:text-[11px]"
                        />
                    </div>
                </section>
            </div>

            {/* BOTTOM ACTIONS */}
            <div className="sticky bottom-0 w-full px-8 py-6 z-30 mt-auto">
                <div className="flex items-center gap-3">
                    {canEdit && initialData && onDelete && (
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
                    {canEdit ? (
                        <>
                            <button
                                disabled={isSubmitting}
                                onClick={() => handleSave(true)}
                                className="flex-1 h-[56px] text-[14px] font-bold text-neutral-700 dark:text-neutral-300 bg-white/95 dark:bg-neutral-800/95 backdrop-blur-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 active:scale-[0.98] rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                            >
                                {isSubmitting ? "Saving..." : "Save as Draft"}
                            </button>

                            <button
                                disabled={!isValid || isSubmitting}
                                onClick={() => handleSave(false)}
                                className="flex-[1.5] h-[56px] bg-red-600/95 backdrop-blur-md hover:bg-red-700 text-white rounded-full font-bold text-[14px] active:scale-[0.98] transition-all shadow-lg shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? "Submitting..." : "Submit Request"}
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={onClose}
                            className="w-full h-[56px] bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full font-bold text-[14px] active:scale-[0.98] transition-all flex items-center justify-center shadow-lg"
                        >
                            Close
                        </button>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {
                showDeleteConfirm && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-[2px]" onClick={() => setShowDeleteConfirm(false)} />
                        <div className="relative w-full max-w-sm bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 shadow-2xl border border-neutral-100 dark:border-neutral-800 animate-in zoom-in-95 duration-200">
                            <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-6">
                                <Trash2 className="w-8 h-8 text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2 text-center">Delete Request?</h3>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-8 text-center font-medium leading-relaxed">
                                Are you sure you want to delete this reimburse request? This action <span className="text-red-500 font-bold underline decoration-2 underline-offset-2">cannot be undone</span>.
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={isSubmitting}
                                    className="py-3.5 text-sm font-extrabold text-neutral-500 hover:text-neutral-700 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full transition-all disabled:opacity-50"
                                >
                                    CANCEL
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
                                    className="py-3.5 text-sm font-extrabold text-white bg-red-500 hover:bg-red-600 rounded-full transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? "DELETING..." : "DELETE"}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
}
