"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { RotateCcw, Save, Trash2, Plus, Search, Loader2, Wrench } from "lucide-react";
import { RABItem } from "./types/rab.types";
import { supabase } from "@/lib/supabaseClient";

// --- TYPES ---

export type Resource = {
    id: string;
    name: string;
    unit: string;
    coef: number;
    price: number;
    total: number;
};

export type Analisa = {
    materials: Resource[];
    labor: Resource[];
    tools: Resource[];
};

type Props = {
    item: RABItem;
    onApplyPrice: (price: number) => void;
    onReloadWbs?: () => void;
};

export default function RABDetailAHSP({ item, onApplyPrice, onReloadWbs }: Props) {
    // Local State for Editing
    const [data, setData] = useState<Analisa | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [overheadPercent, setOverheadPercent] = useState(10);
    const [standardTotal, setStandardTotal] = useState(0);

    // Search AHSP State
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Resource selection state (for custom recipe components)
    const [resQuery, setResQuery] = useState("");
    const [resResults, setResResults] = useState<any[]>([]);
    const [activeCategory, setActiveCategory] = useState<"materials" | "labor" | "tools" | null>(null);

    // Load actual AHSP data if assigned
    useEffect(() => {
        if (!item.ahsp_id) {
            setData(null);
            setStandardTotal(0);
            return;
        }

        const loadDbAhsp = async (ahspId: string) => {
            try {
                setIsLoading(true);
                const { data: master } = await supabase
                    .from("ahsp_masters")
                    .select("id, code, name, unit, overhead_percent")
                    .eq("id", ahspId)
                    .single();

                if (!master) {
                    setData(null);
                    return;
                }

                const { data: components } = await supabase
                    .from("ahsp_components")
                    .select(`
                        id, coefficient,
                        resource:pricing_resources (id, name, unit, price_default, category)
                    `)
                    .eq("ahsp_id", ahspId);

                if (components) {
                    const materials: Resource[] = [];
                    const labor: Resource[] = [];
                    const tools: Resource[] = [];

                    components.forEach((c: any) => {
                        const r = c.resource;
                        if (!r) return;
                        const res: Resource = {
                            id: r.id,
                            name: r.name,
                            unit: r.unit || "",
                            coef: c.coefficient || 0,
                            price: r.price_default || 0,
                            total: (c.coefficient || 0) * (r.price_default || 0)
                        };
                        const cat = String(r.category || "").toLowerCase();
                        if (cat === "material") {
                            materials.push(res);
                        } else if (cat === "labor") {
                            labor.push(res);
                        } else {
                            tools.push(res);
                        }
                    });

                    setData({ materials, labor, tools });
                    setOverheadPercent(master.overhead_percent || 10);

                    // Compute standard total
                    const mat = materials.reduce((s, x) => s + (x.coef * x.price), 0);
                    const lab = labor.reduce((s, x) => s + (x.coef * x.price), 0);
                    const tl = tools.reduce((s, x) => s + (x.coef * x.price), 0);
                    const grand = mat + lab + tl;
                    setStandardTotal(grand + grand * ((master.overhead_percent || 10) / 100));
                }
            } catch (err) {
                console.error("Error loading AHSP:", err);
            } finally {
                setIsLoading(false);
            }
        };

        loadDbAhsp(item.ahsp_id);
    }, [item.ahsp_id]);

    // Derived Totals
    const totals = useMemo(() => {
        if (!data) return { mat: 0, lab: 0, tool: 0, grand: 0, overhead: 0, final: 0 };
        const mat = data.materials.reduce((s, x) => s + (x.coef * x.price), 0);
        const lab = data.labor.reduce((s, x) => s + (x.coef * x.price), 0);
        const tool = data.tools.reduce((s, x) => s + (x.coef * x.price), 0);
        const grand = mat + lab + tool;
        const overhead = grand * (overheadPercent / 100);
        return { mat, lab, tool, grand, overhead, final: grand + overhead };
    }, [data, overheadPercent]);

    // Handlers
    function updateResource(category: keyof Analisa, id: string, field: "coef" | "price", val: number) {
        if (!data) return;
        const newData = { ...data };
        const idx = newData[category].findIndex(r => r.id === id);
        if (idx === -1) return;

        newData[category][idx] = { 
            ...newData[category][idx], 
            [field]: val, 
            total: val * (field === "coef" ? newData[category][idx].price : newData[category][idx].coef) 
        };
        setData(newData);
    }

    function removeResource(category: keyof Analisa, id: string) {
        if (!data) return;
        setData({
            ...data,
            [category]: data[category].filter(r => r.id !== id)
        });
    }

    // Search AHSP Templates
    const handleSearchAHSP = async (val: string) => {
        setSearchQuery(val);
        if (!val.trim()) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const { data: masters } = await supabase
                .from("ahsp_masters")
                .select("id, code, name, unit")
                .or(`name.ilike.%${val}%,code.ilike.%${val}%`)
                .limit(8);
            setSearchResults(masters || []);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSearching(false);
        }
    };

    // Assign AHSP to WBS item
    const assignAHSP = async (ahspId: string) => {
        try {
            const { error } = await supabase
                .from("work_breakdown_structure")
                .update({ ahsp_id: ahspId })
                .eq("id", item.id);
            if (error) throw error;
            onReloadWbs?.();
        } catch (err: any) {
            alert("Failed to assign AHSP: " + err.message);
        }
    };

    // Create Custom Recipe
    const handleCreateCustom = () => {
        setData({ materials: [], labor: [], tools: [] });
    };

    // Search pricing resources
    const handleSearchResources = async (val: string) => {
        setResQuery(val);
        if (!val.trim()) {
            setResResults([]);
            return;
        }
        try {
            const { data: res } = await supabase
                .from("pricing_resources")
                .select("id, name, unit, price_default")
                .ilike("name", `%${val}%`)
                .limit(8);
            setResResults(res || []);
        } catch (err) {
            console.error(err);
        }
    };

    // Add resource to active category
    const addResourceToRecipe = (r: any) => {
        if (!activeCategory || !data) return;
        const newRes: Resource = {
            id: r.id,
            name: r.name,
            unit: r.unit || "ls",
            coef: 1,
            price: r.price_default || 0,
            total: r.price_default || 0
        };
        setData({
            ...data,
            [activeCategory]: [...data[activeCategory], newRes]
        });
        setActiveCategory(null);
        setResQuery("");
        setResResults([]);
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-neutral-400 gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
                <p className="text-xs font-medium">Loading analysis details...</p>
            </div>
        );
    }

    // --- UNASSIGNED EMPTY STATE ---
    if (!item.ahsp_id && !data) {
        return (
            <div className="flex-1 flex flex-col justify-between h-full overflow-hidden">
                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    <div className="border-2 border-dashed border-neutral-200 rounded-[32px] p-8 text-center space-y-4 max-w-md mx-auto my-auto mt-10">
                        <div className="w-12 h-12 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center mx-auto">
                            <Wrench className="w-6 h-6 text-neutral-400" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-neutral-900">No AHSP Recipe Assigned</h4>
                            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                                This work item does not have an active analysis recipe yet. Select one from your library templates or build a custom recipe.
                            </p>
                        </div>
                    </div>

                    {/* SEARCH/ASSIGN SECTION */}
                    <div className="space-y-3 max-w-md mx-auto">
                        <label className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Search AHSP Templates</label>
                        <div className="relative">
                            <input
                                type="text"
                                className="w-full pl-10 pr-4 h-11 bg-white border border-neutral-200 rounded-full text-xs focus:outline-none focus:ring-1 focus:ring-brand-red shadow-sm"
                                placeholder="Type recipe name or code..."
                                value={searchQuery}
                                onChange={(e) => handleSearchAHSP(e.target.value)}
                            />
                            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-400" />
                        </div>

                        {/* Search Results List */}
                        {searchQuery && (
                            <div className="bg-white border border-neutral-100 rounded-2xl shadow-xl overflow-hidden divide-y divide-neutral-50 text-xs">
                                {isSearching ? (
                                    <div className="p-4 text-center text-neutral-400 flex items-center justify-center gap-1.5">
                                        <Loader2 className="w-4 h-4 animate-spin" /> Searching...
                                    </div>
                                ) : searchResults.length === 0 ? (
                                    <div className="p-4 text-center text-neutral-400">No templates found</div>
                                ) : (
                                    searchResults.map((r) => (
                                        <div
                                            key={r.id}
                                            onClick={() => assignAHSP(r.id)}
                                            className="px-4 py-3 hover:bg-neutral-50 cursor-pointer flex items-center justify-between transition-colors group"
                                        >
                                            <div>
                                                <span className="font-bold text-brand-red mr-2">{r.code}</span>
                                                <span className="font-medium text-neutral-700">{r.name}</span>
                                            </div>
                                            <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider group-hover:text-brand-red transition-colors">Assign</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* BOTTOM ACTION */}
                <div className="p-6 border-t border-black/[0.04] bg-white/85 backdrop-blur-md z-10 flex justify-center">
                    <button
                        onClick={handleCreateCustom}
                        className="w-full max-w-xs h-12 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-600 rounded-full font-bold text-xs active:scale-[0.97] transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Create Custom Recipe
                    </button>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* SCROLLABLE CONTENT */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 min-h-0">
                {/* COMPARISON CARD */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-neutral-50 p-3 rounded-2xl border border-neutral-200">
                        <p className="text-[9px] uppercase font-bold text-neutral-400 mb-0.5 tracking-wider">Current Input</p>
                        <p className="text-sm font-bold text-neutral-700">
                            Rp {Math.round(item.unitPrice || 0).toLocaleString("id-ID")}
                        </p>
                    </div>
                    <div className="bg-neutral-50 p-3 rounded-2xl border border-neutral-200">
                        <p className="text-[9px] uppercase font-bold text-neutral-400 mb-0.5 tracking-wider">Standard AHSP</p>
                        <p className="text-sm font-bold text-neutral-700">
                            Rp {Math.round(standardTotal).toLocaleString("id-ID")}
                        </p>
                    </div>
                    <div className={`p-3 rounded-2xl border ${totals.final !== standardTotal ? "bg-orange-50/50 border-orange-200" : "bg-green-50/50 border-green-200"}`}>
                        <p className={`text-[9px] uppercase font-bold mb-0.5 tracking-wider ${totals.final !== standardTotal ? "text-orange-600" : "text-green-600"}`}>
                            {totals.final !== standardTotal ? "Custom Analysis" : "Analysis Price"}
                        </p>
                        <p className={`text-base font-black ${totals.final !== standardTotal ? "text-orange-700" : "text-green-700"}`}>
                            Rp {Math.round(totals.final).toLocaleString("id-ID")}
                        </p>
                    </div>
                </div>

                {/* OVERHEAD SLIDER */}
                <div className="p-4 bg-neutral-50/50 border border-neutral-100 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-neutral-500 uppercase tracking-wider">Overhead Multiplier</span>
                        <span className="font-black text-neutral-800">{overheadPercent}%</span>
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={30}
                        value={overheadPercent}
                        onChange={(e) => setOverheadPercent(Number(e.target.value))}
                        className="w-full accent-brand-red"
                    />
                </div>

                {/* SECTIONS */}
                <EditableSection
                    title="Materials"
                    category="materials"
                    items={data.materials}
                    onUpdate={(id, f, v) => updateResource("materials", id, f, v)}
                    onRemove={(id) => removeResource("materials", id)}
                    onAddClick={() => setActiveCategory("materials")}
                    total={totals.mat}
                />
                <EditableSection
                    title="Labor"
                    category="labor"
                    items={data.labor}
                    onUpdate={(id, f, v) => updateResource("labor", id, f, v)}
                    onRemove={(id) => removeResource("labor", id)}
                    onAddClick={() => setActiveCategory("labor")}
                    total={totals.lab}
                />
                <EditableSection
                    title="Tools / Equipments"
                    category="tools"
                    items={data.tools}
                    onUpdate={(id, f, v) => updateResource("tools", id, f, v)}
                    onRemove={(id) => removeResource("tools", id)}
                    onAddClick={() => setActiveCategory("tools")}
                    total={totals.tool}
                />
            </div>

            {/* RESOURCE ADD DRAWER OVERLAY */}
            {activeCategory && (
                <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm z-30 p-8 flex flex-col justify-end">
                    <div className="bg-white rounded-t-[32px] p-6 space-y-4 max-h-[80%] overflow-y-auto">
                        <div className="flex justify-between items-center">
                            <h4 className="text-xs font-black uppercase text-neutral-500 tracking-wider">Add {activeCategory} Component</h4>
                            <button onClick={() => setActiveCategory(null)} className="text-neutral-400 hover:text-neutral-600 font-bold text-xs">Cancel</button>
                        </div>
                        <input
                            type="text"
                            placeholder="Search resource database..."
                            value={resQuery}
                            onChange={(e) => handleSearchResources(e.target.value)}
                            className="w-full border rounded-full px-4 h-10 text-xs focus:outline-none focus:ring-1 focus:ring-brand-red"
                        />
                        <div className="divide-y divide-neutral-100 text-xs max-h-48 overflow-y-auto">
                            {resResults.map(r => (
                                <div
                                    key={r.id}
                                    onClick={() => addResourceToRecipe(r)}
                                    className="py-2.5 px-2 hover:bg-neutral-50 cursor-pointer flex justify-between items-center"
                                >
                                    <div>
                                        <span className="font-bold text-neutral-700">{r.name}</span>
                                        <span className="text-neutral-400 ml-2">({r.unit || "ls"})</span>
                                    </div>
                                    <span className="font-bold text-brand-red">Rp {r.price_default.toLocaleString("id-ID")}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* STICKY ACTIONS FOOTER */}
            <div className="flex justify-between items-center p-6 border-t border-black/[0.04] bg-white/85 backdrop-blur-md z-10 gap-3">
                <button
                    onClick={async () => {
                        try {
                            const { error } = await supabase
                                .from("work_breakdown_structure")
                                .update({ ahsp_id: null })
                                .eq("id", item.id);
                            if (error) throw error;
                            setData(null);
                            onReloadWbs?.();
                        } catch (err: any) {
                            alert("Failed to unassign: " + err.message);
                        }
                    }}
                    className="flex-1 h-12 rounded-full border border-neutral-200 bg-white/50 backdrop-blur-xl text-xs font-bold text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700 transition-all active:scale-[0.97] flex items-center justify-center gap-2"
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset & Unassign
                </button>
                <button
                    onClick={() => onApplyPrice(totals.final)}
                    className="flex-[1.5] h-12 bg-brand-red hover:bg-brand-red/90 text-white rounded-full font-bold text-xs active:scale-[0.97] transition-all shadow-lg shadow-brand-red/10 flex items-center justify-center gap-2"
                >
                    <Save className="w-3.5 h-3.5" strokeWidth={2} />
                    Use Update Analysis
                </button>
            </div>
        </div>
    );
}

function EditableSection({ 
    title, 
    category,
    items, 
    onUpdate, 
    onRemove,
    onAddClick,
    total 
}: { 
    title: string, 
    category: "materials" | "labor" | "tools",
    items: Resource[], 
    onUpdate: (id: string, field: "coef" | "price", val: number) => void, 
    onRemove: (id: string) => void,
    onAddClick: () => void,
    total: number 
}) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-neutral-500">{title}</h4>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-neutral-900">Rp {Math.round(total).toLocaleString("id-ID")}</span>
                    <button
                        onClick={onAddClick}
                        className="w-5 h-5 bg-neutral-100 hover:bg-neutral-200 rounded-full flex items-center justify-center text-neutral-500 active:scale-90 transition-transform"
                        title={`Add ${title}`}
                    >
                        <Plus className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {items.length === 0 ? (
                <div className="py-6 border border-dashed border-neutral-200 rounded-[20px] text-center text-[10px] text-neutral-400">
                    No components added. Click the plus button to add.
                </div>
            ) : (
                <div className="border border-neutral-200/80 rounded-[24px] overflow-hidden text-xs bg-white/50">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-medium">
                                <th className="py-2 px-3 text-left">Item</th>
                                <th className="py-2 px-3 text-right w-20">Coef</th>
                                <th className="py-2 px-3 text-right w-24">Price</th>
                                <th className="py-2 px-3 text-right w-24">Total</th>
                                <th className="w-8"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {items.map((r) => (
                                <tr key={r.id} className="hover:bg-neutral-50/50 group">
                                    <td className="py-2 px-3 text-neutral-900">
                                        <div className="font-semibold">{r.name}</div>
                                        <div className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider mt-0.5">{r.unit}</div>
                                    </td>
                                    <ClickToEditCell
                                        value={r.coef}
                                        onCommit={(v) => onUpdate(r.id, "coef", v)}
                                        isCurrency={false}
                                    />
                                    <ClickToEditCell
                                        value={r.price}
                                        onCommit={(v) => onUpdate(r.id, "price", v)}
                                        isCurrency={true}
                                    />
                                    <td className="py-2 px-3 text-right font-bold text-neutral-900">
                                        {Math.round(r.coef * r.price).toLocaleString("id-ID")}
                                    </td>
                                    <td className="py-2 px-2 text-center">
                                        <button
                                            onClick={() => onRemove(r.id)}
                                            className="text-neutral-300 hover:text-red-500 transition-colors p-1 rounded"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

// Helper for Click-to-Edit (No Arrows)
function ClickToEditCell({ value, onCommit, isCurrency }: { value: number, onCommit: (v: number) => void, isCurrency: boolean }) {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    useEffect(() => {
        setTempValue(value);
    }, [value]);

    function handleBlur() {
        setIsEditing(false);
        onCommit(tempValue);
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === "Enter") {
            inputRef.current?.blur();
        }
    }

    if (isEditing) {
        return (
            <td className="py-2 px-3 text-right">
                <input
                    ref={inputRef}
                    type="number"
                    className="w-full text-right border-b border-brand-red focus:outline-none bg-white p-0 text-xs font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={tempValue}
                    onChange={(e) => setTempValue(Number(e.target.value))}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    step={isCurrency ? 100 : 0.001}
                />
            </td>
        );
    }

    return (
        <td
            onClick={() => setIsEditing(true)}
            className="py-2 px-3 text-right cursor-pointer hover:bg-neutral-100/70 font-medium text-neutral-800 transition-colors"
        >
            {isCurrency ? Math.round(value).toLocaleString("id-ID") : value}
        </td>
    );
}
