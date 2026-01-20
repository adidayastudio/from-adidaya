
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
import { CreditCard, Save, FileText, Send } from "lucide-react";

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
}

export function ReimburseRequestForm({
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
    const [projectCode, setProjectCode] = useState("");
    const [projects, setProjects] = useState<Project[]>([]);

    // Core Fields
    const [reimbCategory, setReimbCategory] = useState<string>("");
    const [reimbSubcategory, setReimbSubcategory] = useState<string>("");
    const [reimbDate, setReimbDate] = useState("");
    const [reimbDescription, setReimbDescription] = useState("");

    // Transport Specific
    const [transOrigin, setTransOrigin] = useState("");
    const [transDestination, setTransDestination] = useState("");
    const [transDistance, setTransDistance] = useState<number | "">("");

    const [items, setItems] = useState<LineItem[]>([
        { id: Math.random().toString(36).substr(2, 9), name: "", qty: 1, unit: "pcs", unitPrice: 0, total: 0 }
    ]);
    const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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

    useEffect(() => {
        console.log("[DEBUG] ReimburseRequestForm - savedAccounts length:", savedAccounts.length);
    }, [savedAccounts]);

    // Load Preview URL
    useEffect(() => {
        const loadPreview = async () => {
            if (initialData?.invoice_url && !invoiceFile) {
                if (initialData.invoice_url.startsWith('http')) {
                    setPreviewUrl(initialData.invoice_url);
                } else {
                    const url = await getFinanceFileUrl(initialData.invoice_url);
                    setPreviewUrl(url);
                }
            }
        };
        loadPreview();
    }, [initialData?.invoice_url, invoiceFile]);

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
            setReimbCategory(initialData.category || "");
            setReimbSubcategory(initialData.subcategory || "");
            setReimbDate(initialData.date?.split("T")[0] || "");
            setReimbDescription(initialData.description || "");

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
                    name: i.name,
                    qty: i.qty,
                    unit: i.unit,
                    unitPrice: i.unit_price,
                    total: i.total
                })));
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
        if (!reimbCategory || !reimbSubcategory || !reimbDescription || !reimbDate) return false;
        if (items.some(i => !i.name || i.qty <= 0 || i.unitPrice < 0)) return false;

        // Strict check for Transport
        // Strict check for Transport
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
            console.log("Debug Save - Projects Count:", projects.length);
            console.log("Debug Save - Project Code:", projectCode);
            // Debug: Dump first project to see structure
            if (projects.length > 0) {
                console.log("Debug Save - First Project:", projects[0]);
            }

            // Find project exactly matching the code
            const selectedProject = projects.find(p => p.projectCode === projectCode) ||
                projects.find(p => p.projectCode?.trim() === projectCode?.trim());

            if (!selectedProject) {
                console.error("Invalid project selected. Available:", projects.map(p => p.projectCode));
                throw new Error(`Invalid project selected: '${projectCode}' not found in ${projects.length} loaded projects.`);
            }

            let uploadedInvoiceUrl = null;
            if (invoiceFile) {
                uploadedInvoiceUrl = await uploadFinanceFile(invoiceFile, "reimburse");
                if (!uploadedInvoiceUrl) {
                    alert("Failed to upload proof. Continuing without it.");
                }
            }

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

                // Only save est cost for personal
                if (["MOTOR_PERSONAL", "CAR_PERSONAL"].includes(reimbSubcategory)) {
                    details.transportEstCost = transportEstCost;
                }
            }

            console.log("Debug Save - Constructed Details:", details);

            const payload = {
                project_id: selectedProject.id,
                date: reimbDate,
                description: reimbDescription,
                category: reimbCategory,
                subcategory: reimbSubcategory,
                amount: totalAmount,
                status: asDraft ? "DRAFT" : "PENDING",
                invoice_url: uploadedInvoiceUrl || (initialData?.invoice_url),
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

            // Handle Save Account
            if (saveToSaved && bankName && accountNumber && userId) {
                await saveBeneficiaryAccount({
                    bank_name: bankName,
                    account_number: accountNumber,
                    account_name: accountName,
                    alias: `${bankName} - ${accountName} (Employee)`,
                    created_by: userId
                });
            }

            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error("Error saving reimburse request:", error);
            alert("Failed to save request.");
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div className="p-6 space-y-8 pb-32">
                {/* SECTION 1: BASIC INFO */}
                <section className="space-y-4">
                    <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                        <DollarSign className="w-3.5 h-3.5" strokeWidth={1.5} /> Basic Info
                    </h3>
                    <div className="space-y-4">
                        <Select
                            label="Project *"
                            value={projectCode}
                            onChange={setProjectCode}
                            options={projectOptions}
                            placeholder="Select project..."
                            disabled={!canEdit}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                label="Category *"
                                value={reimbCategory}
                                onChange={(val) => {
                                    setReimbCategory(val as string);
                                    setReimbSubcategory("");
                                }}
                                options={REIMBURSE_CATEGORY_OPTIONS}
                                disabled={!canEdit}
                                placeholder="Select Category..."
                            />
                            <Select
                                label="Subcategory *"
                                value={reimbSubcategory}
                                onChange={(val) => setReimbSubcategory(val as string)}
                                options={subcategoryOptions}
                                disabled={!canEdit || !reimbCategory}
                                placeholder={!reimbCategory ? "Select Category first" : "Select Subcategory..."}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Date *</label>
                            <input
                                type="date"
                                value={reimbDate}
                                onChange={e => setReimbDate(e.target.value)}
                                disabled={!canEdit}
                                className={clsx(
                                    "w-full h-10 px-4 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium",
                                    !canEdit && "bg-neutral-50 text-neutral-500"
                                )}
                            />
                        </div>

                        {/* TRANSPORT DETAILS */}
                        {reimbCategory === "TRANSPORTATION" && [
                            "MOTOR_PERSONAL", "CAR_PERSONAL", "FUEL_PERSONAL",
                            "MOTOR_ONLINE", "CAR_ONLINE", "PUBLIC_TRANSPORT",
                            "TAXI", "RENTAL", "COURIER", "LOGISTICS"
                        ].includes(reimbSubcategory) && (
                                <div className="bg-red-50/50 border border-red-100 rounded-2xl p-4 space-y-4">
                                    <h4 className="text-xs font-bold text-red-800 uppercase tracking-wider flex items-center gap-2">
                                        <MapPin className="w-3.5 h-3.5" /> Trip Details
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-1">
                                            <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">From (Origin)</label>
                                            <input
                                                type="text"
                                                value={transOrigin}
                                                onChange={e => setTransOrigin(e.target.value)}
                                                disabled={!canEdit}
                                                placeholder="e.g. Office"
                                                className="w-full h-9 px-3 text-sm border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/40"
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">To (Destination)</label>
                                            <input
                                                type="text"
                                                value={transDestination}
                                                onChange={e => setTransDestination(e.target.value)}
                                                disabled={!canEdit}
                                                placeholder="e.g. Project Site A"
                                                className="w-full h-9 px-3 text-sm border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/40"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Distance (km)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={transDistance}
                                                    onChange={e => setTransDistance(parseFloat(e.target.value) || "")}
                                                    disabled={!canEdit}
                                                    placeholder="0"
                                                    className="w-full h-9 px-3 text-sm border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/40"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400 pointer-events-none">km</span>
                                            </div>
                                        </div>

                                        {/* ESTIMATED COST DISPLAY (Only for Personal Vehicles) */}
                                        {["MOTOR_PERSONAL", "CAR_PERSONAL"].includes(reimbSubcategory) && (
                                            <div className="col-span-2 bg-white rounded-xl p-3 border border-red-100 flex justify-between items-center shadow-sm">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">System Estimation</span>
                                                    <span className="text-[10px] text-neutral-400 font-medium">
                                                        {reimbSubcategory === "MOTOR_PERSONAL" ? "Rp 2.500" : "Rp 4.500"} x {typeof transDistance === "number" ? transDistance : 0} km
                                                    </span>
                                                </div>
                                                <span className="text-sm font-bold text-red-600">{formatCurrency(transportEstCost)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                        <div>
                            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Description *</label>
                            <div className="relative">
                                <textarea
                                    value={reimbDescription}
                                    onChange={(e) => setReimbDescription(e.target.value)}
                                    disabled={!canEdit}
                                    className={clsx(
                                        "w-full min-h-[100px] px-4 py-3 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium resize-none",
                                        !canEdit && "bg-neutral-50 text-neutral-500"
                                    )}
                                    placeholder="Describe clearly what this reimbursement is for..."
                                />
                                <div className="absolute top-3 right-3 pointer-events-none text-neutral-400">
                                    <FileText className="w-4 h-4 opacity-50" />
                                </div>
                            </div>
                        </div>

                        {/* BENEFICIARY ACCOUNT (Optional but recommended) */}
                        <div className="pt-2 border-t border-neutral-100 mt-2 space-y-3">
                            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                                <CreditCard className="w-3.5 h-3.5" strokeWidth={1.5} /> Transfer Destination (Your Account)
                            </h3>

                            {/* Saved Account Selector */}
                            {canEdit && savedAccounts.length > 0 && (
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
                                        disabled={!canEdit}
                                        placeholder="e.g. BCA"
                                        className={clsx(
                                            "w-full h-10 px-4 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium",
                                            !canEdit && "bg-neutral-50 text-neutral-500"
                                        )}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Account Number</label>
                                    <input
                                        type="text"
                                        value={accountNumber}
                                        onChange={e => setAccountNumber(e.target.value)}
                                        disabled={!canEdit}
                                        placeholder="e.g. 1234567890"
                                        className={clsx(
                                            "w-full h-10 px-4 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium",
                                            !canEdit && "bg-neutral-50 text-neutral-500"
                                        )}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Account Name</label>
                                    <input
                                        type="text"
                                        value={accountName}
                                        onChange={e => setAccountName(e.target.value)}
                                        disabled={!canEdit}
                                        placeholder="e.g. Adidaya Studio"
                                        className={clsx(
                                            "w-full h-10 px-4 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium",
                                            !canEdit && "bg-neutral-50 text-neutral-500"
                                        )}
                                    />
                                </div>
                            </div>
                            {canEdit && bankName && accountNumber && (
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
                    </div>
                </section>

                <hr className="border-neutral-100" />


                {/* SECTION 3: ITEMS TABLE */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                            <Package className="w-3.5 h-3.5" strokeWidth={1.5} /> Itemized Breakdown
                        </h3>
                        <button
                            onClick={addItem}
                            className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-neutral-50 transition-colors"
                        >
                            <Plus className="w-3 h-3" strokeWidth={1.5} /> Add Item
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
                                            placeholder="e.g. Lunch at Site"
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

                    {/* TOTAL SUMMARY & PROOF */}
                    <div className="bg-gradient-to-br from-red-400 to-red-500 rounded-[2rem] p-6 space-y-4 shadow-lg shadow-red-500/10 mt-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                        <div className="relative flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-red-50 uppercase tracking-widest leading-none mb-1">Total Claim Amount</span>
                                <span className="text-xs text-red-50/80 font-medium">{items.length} items summarized</span>
                            </div>
                            <span className="text-2xl font-black text-white tracking-tight">Rp {totalAmount.toLocaleString("id-ID")}</span>
                        </div>
                    </div>

                    <div
                        className={clsx(
                            "border-2 border-dashed rounded-xl p-8 text-center transition-all group relative",
                            invoiceFile ? "border-emerald-500/40 bg-emerald-50/50" : "border-neutral-200 hover:border-red-500/30 hover:bg-red-50/20 cursor-pointer"
                        )}
                    >
                        <input
                            type="file"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={e => {
                                if (e.target.files && e.target.files[0]) setInvoiceFile(e.target.files[0]);
                            }}
                        />
                        {invoiceFile ? (
                            <div>
                                <CheckCircle className="w-8 h-8 mx-auto text-emerald-600 mb-2" strokeWidth={1.5} />
                                <p className="text-sm font-bold text-emerald-700">{invoiceFile.name}</p>
                                <p className="text-xs text-emerald-600 mt-1">Proof uploaded</p>
                            </div>
                        ) : initialData?.invoice_url ? (
                            <div>
                                <CheckCircle className="w-8 h-8 mx-auto text-blue-600 mb-2" strokeWidth={1.5} />
                                <p className="text-sm font-bold text-blue-700">Existing Proof Attached</p>
                                <a
                                    href={previewUrl || "#"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 mt-1 hover:underline z-20 relative"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    View File
                                </a>
                                <p className="text-[10px] text-neutral-400 mt-2">Click box to replace</p>
                            </div>
                        ) : (
                            <div>
                                <Upload className="w-8 h-8 mx-auto text-neutral-400 mb-2 group-hover:text-red-500 transition-colors" strokeWidth={1.5} />
                                <p className="text-sm font-medium text-neutral-600 group-hover:text-neutral-900">Upload Receipt / Proof</p>
                                <p className="text-xs text-neutral-400 mt-1">Required for claim</p>
                            </div>
                        )}
                    </div>
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
                    {canEdit && (
                        <>
                            <button
                                disabled={isSubmitting} // Drafts might be less strict, but for now kept same
                                onClick={() => handleSave(true)}
                                className="flex-1 h-11 text-sm font-bold text-neutral-600 bg-white border border-neutral-200 hover:bg-neutral-50 active:scale-[0.98] rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4" /> Save Draft
                            </button>
                            <button
                                disabled={!isValid || isSubmitting}
                                onClick={() => handleSave(false)}
                                className="flex-[2] h-11 text-sm font-bold text-white bg-red-500 hover:bg-red-600 active:scale-[0.98] rounded-xl transition-all shadow-lg shadow-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
                            >
                                <Send className="w-4 h-4" /> Submit Request
                            </button>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
