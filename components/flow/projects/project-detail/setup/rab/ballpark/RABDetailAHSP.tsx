"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { RotateCcw, Save, Trash2, Plus } from "lucide-react";
import { RABItem } from "./types/rab.types";

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
};

// --- DUMMY GENERATOR (MOVED HERE FOR NOW) ---
function getDummyAnalisa(item: RABItem): Analisa {
    const seed = item.code.charCodeAt(item.code.length - 1);

    const materials = [
        { id: "m1", name: "Semen Portland", unit: "kg", coef: 1.2 * (seed % 5 + 1), price: 1500 },
        { id: "m2", name: "Pasir Beton", unit: "m3", coef: 0.1 * (seed % 3 + 1), price: 250000 },
        { id: "m3", name: "Kerikil", unit: "m3", coef: 0.2, price: 280000 },
    ];

    const labor = [
        { id: "l1", name: "Pekerja", unit: "OH", coef: 0.5, price: 120000 },
        { id: "l2", name: "Tukang", unit: "OH", coef: 0.2, price: 150000 },
        { id: "l3", name: "Mandor", unit: "OH", coef: 0.05, price: 180000 },
    ];

    const tools = [
        { id: "t1", name: "Mixer Beton", unit: "jam", coef: 0.1, price: 50000 },
    ];

    return {
        materials: materials.map(m => ({ ...m, total: m.coef * m.price })),
        labor: labor.map(l => ({ ...l, total: l.coef * l.price })),
        tools: tools.map(t => ({ ...t, total: t.coef * t.price })),
    };
}


export default function RABDetailAHSP({ item, onApplyPrice }: Props) {
    // Local State for Editing
    const [data, setData] = useState<Analisa | null>(null);

    // Init Data
    useEffect(() => {
        setData(getDummyAnalisa(item));
    }, [item]);

    // Derived Totals
    const totals = useMemo(() => {
        if (!data) return { mat: 0, lab: 0, tool: 0, grand: 0, overhead: 0, final: 0 };
        const mat = data.materials.reduce((s, x) => s + (x.coef * x.price), 0);
        const lab = data.labor.reduce((s, x) => s + (x.coef * x.price), 0);
        const tool = data.tools.reduce((s, x) => s + (x.coef * x.price), 0);
        const grand = mat + lab + tool;
        const overhead = grand * 0.1;
        return { mat, lab, tool, grand, overhead, final: grand + overhead };
    }, [data]);

    // Standard (Baseline) Total
    const standardTotal = useMemo(() => {
        const d = getDummyAnalisa(item);
        const mat = d.materials.reduce((s, x) => s + (x.coef * x.price), 0);
        const lab = d.labor.reduce((s, x) => s + (x.coef * x.price), 0);
        const tool = d.tools.reduce((s, x) => s + (x.coef * x.price), 0);
        const grand = mat + lab + tool;
        return (mat + lab + tool) * 1.1; // +10% overhead
    }, [item]);

    // Handlers
    function updateResource(category: keyof Analisa, id: string, field: "coef" | "price", val: number) {
        if (!data) return;
        const newData = { ...data };
        const idx = newData[category].findIndex(r => r.id === id);
        if (idx === -1) return;

        newData[category][idx] = { ...newData[category][idx], [field]: val, total: val * (field === "coef" ? newData[category][idx].price : newData[category][idx].coef) };
        setData(newData);
    }

    function resetHandler() {
        setData(getDummyAnalisa(item));
    }

    if (!data) return <div>Loading...</div>;

    return (
        <div className="space-y-8">
            {/* COMPARISON CARD */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                    <p className="text-[10px] uppercase font-bold text-neutral-400 mb-1">Current Input</p>
                    <p className="text-sm font-semibold text-neutral-600">
                        Rp {Math.round(item.unitPrice || 0).toLocaleString("id-ID")}
                    </p>
                </div>
                <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                    <p className="text-[10px] uppercase font-bold text-neutral-400 mb-1">Standard AHSP</p>
                    <p className="text-sm font-semibold text-neutral-600">
                        Rp {Math.round(standardTotal).toLocaleString("id-ID")}
                    </p>
                </div>
                <div className={`p-3 rounded-lg border ${totals.final !== standardTotal ? "bg-orange-50 border-orange-200" : "bg-green-50 border-green-200"}`}>
                    <p className={`text-[10px] uppercase font-bold mb-1 ${totals.final !== standardTotal ? "text-orange-600" : "text-green-600"}`}>
                        {totals.final !== standardTotal ? "Custom Analysis" : "Analysis Price"}
                    </p>
                    <p className={`text-lg font-bold ${totals.final !== standardTotal ? "text-orange-700" : "text-green-700"}`}>
                        Rp {Math.round(totals.final).toLocaleString("id-ID")}
                    </p>
                </div>
            </div>

            {/* SECTIONS */}
            <EditableSection
                title="Materials"
                items={data.materials}
                onUpdate={(id, f, v) => updateResource("materials", id, f, v)}
                total={totals.mat}
            />
            <EditableSection
                title="Labor"
                items={data.labor}
                onUpdate={(id, f, v) => updateResource("labor", id, f, v)}
                total={totals.lab}
            />
            <EditableSection
                title="Tools"
                items={data.tools}
                onUpdate={(id, f, v) => updateResource("tools", id, f, v)}
                total={totals.tool}
            />

            {/* ACTIONS */}
            <div className="flex justify-between items-center pt-4 border-t border-neutral-100">
                <Button variant="secondary" size="sm" onClick={resetHandler} className="text-neutral-500">
                    <RotateCcw className="w-3 h-3 mr-2" />
                    Reset Default
                </Button>
                <Button size="sm" onClick={() => onApplyPrice(totals.final)}>
                    <Save className="w-3 h-3 mr-2" />
                    Use Update Analysis
                </Button>
            </div>
        </div>
    );
}

function EditableSection({ title, items, onUpdate, total }: { title: string, items: Resource[], onUpdate: (id: string, field: "coef" | "price", val: number) => void, total: number }) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wide text-neutral-500">{title}</h4>
                <span className="text-xs font-semibold text-neutral-900">Rp {Math.round(total).toLocaleString("id-ID")}</span>
            </div>

            <div className="border border-neutral-200 rounded-lg overflow-hidden text-xs">
                <table className="w-full">
                    <thead>
                        <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-medium">
                            <th className="py-2 px-3 text-left">Item</th>
                            <th className="py-2 px-3 text-right w-20">Coef</th>
                            <th className="py-2 px-3 text-right w-24">Price</th>
                            <th className="py-2 px-3 text-right w-24">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {items.map((r) => (
                            <tr key={r.id} className="hover:bg-neutral-50/50 group">
                                <td className="py-2 px-3 text-neutral-900">
                                    <div className="font-medium">{r.name}</div>
                                    <div className="text-[10px] text-neutral-400">{r.unit}</div>
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
                                <td className="py-2 px-3 text-right font-medium text-neutral-900">
                                    {Math.round(r.coef * r.price).toLocaleString("id-ID")}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
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
                />
            </td>
        );
    }

    return (
        <td
            className="py-2 px-3 text-right cursor-pointer hover:bg-neutral-100 transition-colors"
            onClick={() => setIsEditing(true)}
        >
            <div className={`text-xs ${isEditing ? 'text-transparent' : 'text-neutral-600'}`}>
                {isCurrency
                    ? value.toLocaleString("id-ID")
                    : value.toFixed(3).replace(/\.?0+$/, '') // Hide trailing zeros if any
                }
            </div>
        </td>
    );
}
