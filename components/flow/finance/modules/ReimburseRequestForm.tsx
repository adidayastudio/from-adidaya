
import { useState, useMemo } from "react";
import { clsx } from "clsx";
import { Car, Package, Wrench, Utensils, Home, MoreHorizontal, DollarSign, CheckCircle, Upload, X, Plus } from "lucide-react";
import { Select } from "@/shared/ui/primitives/select/select";
import { formatCurrency } from "./utils";
import {
    ReimburseCategory,
    REIMBURSE_CATEGORY_OPTIONS,
    TRANSPORT_TYPES,
    TRANSPORT_ROUTES,
    UNIT_OPTIONS
} from "./constants";

interface LineItem {
    id: string;
    name: string;
    qty: number;
    unit: string;
    unitPrice: number;
    total: number;
}

export function ReimburseRequestForm({
    onClose
}: {
    onClose: () => void;
}) {
    // -- STATE --
    const [project, setProject] = useState("");
    const [reimbCategory, setReimbCategory] = useState<ReimburseCategory | "">("");
    const [reimbDate, setReimbDate] = useState("");
    const [reimbDescription, setReimbDescription] = useState("");
    const [items, setItems] = useState<LineItem[]>([
        { id: Math.random().toString(36).substr(2, 9), name: "", qty: 1, unit: "pcs", unitPrice: 0, total: 0 }
    ]);
    const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

    // Specific states
    const [transType, setTransType] = useState("");
    const [transRoute, setTransRoute] = useState("");
    const [transFrom, setTransFrom] = useState("");
    const [transTo, setTransTo] = useState("");
    const [transDist, setTransDist] = useState("");

    const [matPurpose, setMatPurpose] = useState("");
    const [matFor, setMatFor] = useState("");

    const [toolType, setToolType] = useState("");
    const [toolProject, setToolProject] = useState("");
    const [toolCond, setToolCond] = useState("");
    const [toolDuration, setToolDuration] = useState("");

    const [consType, setConsType] = useState("");
    const [consPax, setConsPax] = useState("");
    const [consPurpose, setConsPurpose] = useState("");
    const [consLoc, setConsLoc] = useState("");

    const [accType, setAccType] = useState("");
    const [accLoc, setAccLoc] = useState("");
    const [accIn, setAccIn] = useState("");
    const [accOut, setAccOut] = useState("");
    const [accPurpose, setAccPurpose] = useState("");

    const [otherDetail, setOtherDetail] = useState("");

    // -- ITEM ACTIONS --
    const addItem = () => {
        setItems([...items, { id: Math.random().toString(36).substr(2, 9), name: "", qty: 1, unit: "pcs", unitPrice: 0, total: 0 }]);
    };

    const removeItem = (id: string) => {
        if (items.length > 1) {
            setItems(items.filter(i => i.id !== id));
        }
    };

    const updateItem = (id: string, updates: Partial<LineItem>) => {
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

    const transportEstCost = useMemo(() => {
        if (!transDist) return 0;
        return parseFloat(transDist) * 2500;
    }, [transDist]);

    // -- VALIDATION --
    const isValid = useMemo(() => {
        if (!project) return false;
        if (!reimbCategory || !reimbDescription || !reimbDate) return false;
        if (items.some(i => !i.name || i.qty <= 0 || i.unitPrice < 0)) return false;
        if (!invoiceFile) return false; // Always required

        switch (reimbCategory) {
            case "TRANSPORTATION":
                return !!(transType && transFrom && transTo && transRoute && transDist);
            case "MATERIAL":
                return !!(matPurpose && matFor);
            case "TOOLS":
                return !!(toolType && toolProject && toolCond);
            case "CONSUMPTION":
                return !!(consType && consPax && consPurpose);
            case "ACCOMMODATION":
                return !!(accType && accLoc && accIn && accOut);
            case "OTHER":
                return !!(otherDetail);
            default:
                return false;
        }
    }, [
        project, reimbCategory, reimbDescription, reimbDate, items, invoiceFile,
        transType, transFrom, transTo, transRoute, transDist,
        matPurpose, matFor,
        toolType, toolProject, toolCond,
        consType, consPax, consPurpose,
        accType, accLoc, accIn, accOut,
        otherDetail
    ]);

    const handleSave = () => {
        if (!isValid) return;
        console.log("Saving Reimburse Request...", {
            project, reimbCategory, items, totalAmount, invoiceFile
        });
        onClose();
    };

    return (
        <>
            <div className="p-6 space-y-8 pb-32">
                {/* SECTION 1: BASIC INFO */}
                <section className="space-y-4">
                    <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                        <DollarSign className="w-3.5 h-3.5" /> Basic Info
                    </h3>
                    <div className="space-y-4">
                        <Select
                            label="Project *"
                            value={project}
                            onChange={setProject}
                            options={[
                                { value: "RKM", label: "RKM - Rumah Kemang" },
                                { value: "VLP", label: "VLP - Villa Puncak" },
                                { value: "PRG", label: "PRG - Proj Gunawarman" }
                            ]}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                label="Category *"
                                value={reimbCategory}
                                onChange={(v) => { setReimbCategory(v as ReimburseCategory); }}
                                options={REIMBURSE_CATEGORY_OPTIONS}
                            />
                            <div>
                                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Date *</label>
                                <input
                                    type="date"
                                    value={reimbDate}
                                    onChange={e => setReimbDate(e.target.value)}
                                    className="w-full h-10 px-4 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Description *</label>
                            <input
                                type="text"
                                value={reimbDescription}
                                onChange={e => setReimbDescription(e.target.value)}
                                placeholder="Overview of the expense..."
                                className="w-full h-10 px-4 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium"
                            />
                        </div>
                    </div>
                </section>

                <hr className="border-neutral-100" />

                {/* SECTION 2: CATEGORY SPECIFIC */}
                {reimbCategory && (
                    <>
                        <section className="space-y-4">
                            <h3 className="text-xs font-bold text-red-500 uppercase tracking-wider flex items-center gap-2">
                                {reimbCategory === "TRANSPORTATION" && <Car className="w-3.5 h-3.5" />}
                                {reimbCategory === "MATERIAL" && <Package className="w-3.5 h-3.5" />}
                                {reimbCategory === "TOOLS" && <Wrench className="w-3.5 h-3.5" />}
                                {reimbCategory === "CONSUMPTION" && <Utensils className="w-3.5 h-3.5" />}
                                {reimbCategory === "ACCOMMODATION" && <Home className="w-3.5 h-3.5" />}
                                {reimbCategory === "OTHER" && <MoreHorizontal className="w-3.5 h-3.5" />}
                                Detail {REIMBURSE_CATEGORY_OPTIONS.find(c => c.value === reimbCategory)?.label}
                            </h3>

                            {reimbCategory === "TRANSPORTATION" && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <Select label="Type" value={transType} onChange={setTransType} options={TRANSPORT_TYPES} />
                                        <Select label="Route Context" value={transRoute} onChange={setTransRoute} options={TRANSPORT_ROUTES} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">From</label>
                                            <input type="text" value={transFrom} onChange={e => setTransFrom(e.target.value)} className="w-full px-4 py-2.5 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium" placeholder="Origin" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">To</label>
                                            <input type="text" value={transTo} onChange={e => setTransTo(e.target.value)} className="w-full px-4 py-2.5 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium" placeholder="Destination" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Distance (km)</label>
                                            <input type="number" value={transDist} onChange={e => setTransDist(e.target.value)} className="w-full px-4 py-2.5 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium" placeholder="0" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">Est. Cost (Auto)</label>
                                            <div className="w-full px-4 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl font-bold text-neutral-700">
                                                {formatCurrency(transportEstCost)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {reimbCategory === "MATERIAL" && (
                                <div className="space-y-4 text-xs italic text-neutral-500 bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                                    Detail material (Qty, Unit, Name) sekarang diinput langsung di tabel "Item Details" di bawah.
                                    Gunakan kolom ini untuk detail alokasi tambahan.
                                    <div className="grid grid-cols-2 gap-4 mt-3 not-italic">
                                        <div>
                                            <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-1.5">Purpose / Usage</label>
                                            <input type="text" value={matPurpose} onChange={e => setMatPurpose(e.target.value)} className="w-full h-10 px-4 py-2.5 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium" placeholder="e.g. For wall plastering" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-1.5">For (Allocation)</label>
                                            <input type="text" value={matFor} onChange={e => setMatFor(e.target.value)} className="w-full h-10 px-4 py-2.5 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium" placeholder="e.g. Lantai 2 Bedroom" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {reimbCategory === "TOOLS" && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="text-xs italic text-neutral-500 bg-neutral-50 p-3 rounded-lg border border-neutral-100 flex items-center">
                                            Nama alat diinput di tabel items di bawah.
                                        </div>
                                        <Select label="Type" value={toolType} onChange={setToolType} options={[{ value: "BUY", label: "Buy (Beli)" }, { value: "RENT", label: "Rent (Sewa)" }, { value: "SERVICE", label: "Service/Repair" }]} />
                                    </div>
                                    {toolType === "RENT" && (
                                        <div>
                                            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">Duration (Days)</label>
                                            <input type="number" value={toolDuration} onChange={e => setToolDuration(e.target.value)} className="w-full h-10 px-4 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium" placeholder="0" />
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">For Project</label>
                                            <input type="text" value={toolProject} onChange={e => setToolProject(e.target.value)} className="w-full h-10 px-4 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium" placeholder="Project Name" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">Condition</label>
                                            <input type="text" value={toolCond} onChange={e => setToolCond(e.target.value)} className="w-full h-10 px-4 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium" placeholder="New / Used" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {reimbCategory === "CONSUMPTION" && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <Select label="Type" value={consType} onChange={setConsType} options={[{ value: "MEETING", label: "Meeting (Internal/Client)" }, { value: "OVERTIME", label: "Overtime Meal" }, { value: "GUEST", label: "Guest Entertainment" }]} />
                                        <div>
                                            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Pax (People)</label>
                                            <input type="number" value={consPax} onChange={e => setConsPax(e.target.value)} className="w-full px-4 py-2.5 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium" placeholder="0" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Purpose / Event</label>
                                        <input type="text" value={consPurpose} onChange={e => setConsPurpose(e.target.value)} className="w-full px-4 py-2.5 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium" placeholder="e.g. Weekly Coordination Meeting" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Location / Restaurant</label>
                                        <input type="text" value={consLoc} onChange={e => setConsLoc(e.target.value)} className="w-full px-4 py-2.5 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium" placeholder="Resto Name" />
                                    </div>
                                </div>
                            )}

                            {reimbCategory === "ACCOMMODATION" && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <Select label="Type" value={accType} onChange={setAccType} options={[{ value: "HOTEL", label: "Hotel / Penginapan" }, { value: "KOST", label: "Kost (Project)" }]} />
                                        <div>
                                            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">LocationName</label>
                                            <input type="text" value={accLoc} onChange={e => setAccLoc(e.target.value)} className="w-full px-4 py-2.5 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium" placeholder="Hotel Name" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Check In</label>
                                            <input type="date" value={accIn} onChange={e => setAccIn(e.target.value)} className="w-full px-4 py-2.5 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Check Out</label>
                                            <input type="date" value={accOut} onChange={e => setAccOut(e.target.value)} className="w-full px-4 py-2.5 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Purpose</label>
                                        <input type="text" value={accPurpose} onChange={e => setAccPurpose(e.target.value)} className="w-full px-4 py-2.5 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium" placeholder="Reason for stay" />
                                    </div>
                                </div>
                            )}

                            {reimbCategory === "OTHER" && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Detail Description</label>
                                        <textarea value={otherDetail} onChange={e => setOtherDetail(e.target.value)} className="w-full px-4 py-3 text-sm border border-neutral-200 rounded-xl min-h-[80px] focus:outline-none focus:ring-4 focus:ring-red-500/[0.08] focus:border-red-500/20 transition-all font-medium" placeholder="Explain clearly..." />
                                    </div>
                                </div>
                            )}
                        </section>
                        <hr className="border-neutral-100" />
                    </>
                )}


                {/* SECTION 3: ITEMS TABLE */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                            <Package className="w-3.5 h-3.5" /> Itemized Breakdown
                        </h3>
                        <button
                            onClick={addItem}
                            className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-neutral-50 transition-colors"
                        >
                            <Plus className="w-3 h-3" /> Add Item
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
                                            <X className="w-4 h-4" />
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
                                <CheckCircle className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
                                <p className="text-sm font-bold text-emerald-700">{invoiceFile.name}</p>
                                <p className="text-xs text-emerald-600 mt-1">Proof uploaded</p>
                            </div>
                        ) : (
                            <div>
                                <Upload className="w-8 h-8 mx-auto text-neutral-400 mb-2 group-hover:text-red-500 transition-colors" />
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
                    <button
                        disabled={!isValid}
                        onClick={handleSave}
                        className="flex-[2] h-11 text-sm font-bold text-white bg-red-500 hover:bg-red-600 active:scale-[0.98] rounded-xl transition-all shadow-lg shadow-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
                    >
                        Save Request
                    </button>
                </div>
            </div>
        </>
    );
}
