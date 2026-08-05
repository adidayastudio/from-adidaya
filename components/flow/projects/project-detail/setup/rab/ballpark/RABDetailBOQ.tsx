"use client";

import { useState, useEffect } from "react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { Calculator, Box, Columns, Hammer } from "lucide-react";
import { RABItem } from "./types/rab.types";

type Props = {
    item: RABItem;
    onApplyVolume: (vol: number) => void;
};

type FormulaType = "BOX" | "TRAPEZOIDAL" | "COLUMN_BEAM";

export default function RABDetailBOQ({ item, onApplyVolume }: Props) {
    // Local state for dimensions
    const [formula, setFormula] = useState<FormulaType>("BOX");

    // Box Params
    const [length, setLength] = useState(0);
    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);

    // Trapezoid Params (e.g. Foundation)
    const [topWidth, setTopWidth] = useState(0);
    const [bottomWidth, setBottomWidth] = useState(0);

    // Column/Beam Params
    const [cbWidth, setCbWidth] = useState(0.2); // m
    const [cbDepth, setCbDepth] = useState(0.4); // m
    const [cbLength, setCbLength] = useState(3); // m
    const [mainBarCount, setMainBarCount] = useState(4);
    const [mainBarDia, setMainBarDia] = useState(13); // mm
    const [stirrupDia, setStirrupDia] = useState(8); // mm
    const [stirrupSpacing, setStirrupSpacing] = useState(0.15); // m

    const [count, setCount] = useState(1); // Multiplier

    // Results
    const [calculatedVolume, setCalculatedVolume] = useState(0);
    // Advanced Results
    const [resConcrete, setResConcrete] = useState(0);
    const [resFormwork, setResFormwork] = useState(0);
    const [resRebar, setResRebar] = useState(0);


    // Auto-calculate
    useEffect(() => {
        let vol = 0;

        if (formula === "BOX") {
            vol = length * width * height * count;
        }
        else if (formula === "TRAPEZOIDAL") {
            const area = ((Number(topWidth) + Number(bottomWidth)) / 2) * height;
            vol = area * length * count;
        }
        else if (formula === "COLUMN_BEAM") {
            // 1. Concrete (m3)
            const conc = cbWidth * cbDepth * cbLength * count;
            setResConcrete(conc);

            // 2. Formwork (m2) - Assume 2 sides visible? Or Full perimeter?
            // Usually for Beam: Bottom + 2 Sides. For Column: 4 Sides.
            // Let's assume 4 sides for Column (worst case / safe) or let user edit multiplier?
            // User request: "dimensi 20x20, panjang 3m... otomatis hitung bekisting"
            // For now: Full Perimeter * Length.
            const perimeter = 2 * (cbWidth + cbDepth);
            const form = perimeter * cbLength * count;
            setResFormwork(form);

            // 3. Rebar (kg)
            // Weight per m = 0.006165 * d^2
            const wMain = 0.006165 * (mainBarDia * mainBarDia); // kg/m
            const totalLenMain = mainBarCount * cbLength;
            const weightMain = totalLenMain * wMain;

            const wStirrup = 0.006165 * (stirrupDia * stirrupDia);
            const numStirrups = Math.ceil(cbLength / stirrupSpacing) + 1;
            // Stirrup length ~ Perimeter - concrete cover?
            // Let's approximate Perimeter
            const lenStirrup = perimeter;
            const totalLenStirrup = numStirrups * lenStirrup;
            const weightStirrup = totalLenStirrup * wStirrup;

            const totalRebar = (weightMain + weightStirrup) * count;
            setResRebar(totalRebar);

            // Default "Volume" to Concrete for apply button if generic
            vol = conc;
        }

        setCalculatedVolume(vol);
    }, [formula, length, width, height, topWidth, bottomWidth, count, cbWidth, cbDepth, cbLength, mainBarCount, mainBarDia, stirrupDia, stirrupSpacing]);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* SCROLLABLE INPUTS */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
                {/* HEADER */}
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-neutral-500" />
                        Calculator
                    </h3>
                    <select
                        className="text-xs border rounded px-2 py-1"
                        value={formula}
                        onChange={(e) => setFormula(e.target.value as FormulaType)}
                    >
                        <option value="BOX">Standard Box (P x L x T)</option>
                        <option value="TRAPEZOIDAL">Trapezoid (Foundation)</option>
                        <option value="COLUMN_BEAM">Column / Beam (Advanced)</option>
                    </select>
                </div>

                {/* --- COLUMN / BEAM FORM --- */}
                {formula === "COLUMN_BEAM" && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-neutral-400">Dim (W x D) (m)</label>
                                <div className="flex gap-2">
                                    <Input type="number" value={cbWidth} onChange={e => setCbWidth(Number(e.target.value))} placeholder="W" />
                                    <Input type="number" value={cbDepth} onChange={e => setCbDepth(Number(e.target.value))} placeholder="D" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-neutral-400">Length (m)</label>
                                <Input type="number" value={cbLength} onChange={e => setCbLength(Number(e.target.value))} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-neutral-400">Main Rebar</label>
                                <div className="flex items-center gap-2">
                                    <Input type="number" className="w-12 text-center" value={mainBarCount} onChange={e => setMainBarCount(Number(e.target.value))} />
                                    <span className="text-xs text-neutral-400">D</span>
                                    <Input type="number" value={mainBarDia} onChange={e => setMainBarDia(Number(e.target.value))} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-neutral-400">Stirrups</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-neutral-400">Ø</span>
                                    <Input type="number" className="w-16" value={stirrupDia} onChange={e => setStirrupDia(Number(e.target.value))} />
                                    <span className="text-xs text-neutral-400">@</span>
                                    <Input type="number" value={stirrupSpacing} onChange={e => setStirrupSpacing(Number(e.target.value))} step={0.05} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-neutral-400">Quantity (Count)</label>
                            <Input type="number" value={count} onChange={e => setCount(Number(e.target.value))} />
                        </div>
                    </div>
                )}

                {/* --- STANDARD BOX FORM --- */}
                {formula === "BOX" && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-neutral-400">Length (m)</label>
                                <Input type="number" value={length} onChange={e => setLength(Number(e.target.value))} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-neutral-400">Width (m)</label>
                                <Input type="number" value={width} onChange={e => setWidth(Number(e.target.value))} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-neutral-400">Height (m)</label>
                                <Input type="number" value={height} onChange={e => setHeight(Number(e.target.value))} />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-neutral-400">Quantity (Count)</label>
                            <Input type="number" value={count} onChange={e => setCount(Number(e.target.value))} />
                        </div>
                    </div>
                )}

                {/* --- TRAPEZOIDAL FORM --- */}
                {formula === "TRAPEZOIDAL" && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-neutral-400">Top Width (m)</label>
                                <Input type="number" value={topWidth} onChange={e => setTopWidth(Number(e.target.value))} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-neutral-400">Bottom Width (m)</label>
                                <Input type="number" value={bottomWidth} onChange={e => setBottomWidth(Number(e.target.value))} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-neutral-400">Height (m)</label>
                                <Input type="number" value={height} onChange={e => setHeight(Number(e.target.value))} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-neutral-400">Length (m)</label>
                                <Input type="number" value={length} onChange={e => setLength(Number(e.target.value))} />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-neutral-400">Quantity (Count)</label>
                            <Input type="number" value={count} onChange={e => setCount(Number(e.target.value))} />
                        </div>
                    </div>
                )}
            </div>

            {/* STICKY RESULTS FOOTER */}
            <div className="p-6 border-t border-black/[0.04] bg-white/85 backdrop-blur-md z-10">
                {formula === "COLUMN_BEAM" ? (
                    <div className="bg-white/80 backdrop-blur-sm rounded-[24px] border border-neutral-200 overflow-hidden shadow-sm">
                        <div className="bg-neutral-50 px-4 py-2 border-b border-neutral-200">
                            <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-wider">Calculation Results</h4>
                        </div>
                        <ResultRow label="Concrete Volume" value={resConcrete} unit="m³" onApply={() => onApplyVolume(resConcrete)} />
                        <ResultRow label="Formwork Area" value={resFormwork} unit="m²" onApply={() => onApplyVolume(resFormwork)} />
                        <ResultRow label="Rebar Weight" value={resRebar} unit="kg" onApply={() => onApplyVolume(resRebar)} />
                    </div>
                ) : (
                    <div className="bg-white/80 backdrop-blur-sm p-4 rounded-[24px] flex items-center justify-between border border-neutral-200 shadow-sm gap-4">
                        <div>
                            <p className="text-[10px] text-neutral-400 font-black uppercase tracking-wider mb-0.5">Calculated Volume</p>
                            <p className="text-lg font-bold text-neutral-900 leading-tight">
                                {calculatedVolume.toLocaleString("id-ID", { maximumFractionDigits: 2 })}
                                <span className="text-xs font-normal text-neutral-400 ml-1">{item.unit || "m³"}</span>
                            </p>
                        </div>
                        <button
                            onClick={() => onApplyVolume(calculatedVolume)}
                            className="h-11 bg-brand-red hover:bg-brand-red/90 text-white rounded-full font-bold text-xs active:scale-[0.97] transition-all px-5 shadow-lg shadow-brand-red/10 flex items-center justify-center gap-1.5"
                        >
                            Use Calculated Volume
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function ResultRow({ label, value, unit, onApply }: any) {
    return (
        <div className="flex items-center justify-between px-4 py-3 border-b last:border-0 border-neutral-200 hover:bg-neutral-100/50">
            <div>
                <p className="text-xs text-neutral-500 font-medium">{label}</p>
                <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold text-neutral-900">{value.toLocaleString("id-ID", { maximumFractionDigits: 2 })}</span>
                    <span className="text-xs text-neutral-400">{unit}</span>
                </div>
            </div>
            <button
                onClick={onApply}
                className="h-8 px-4 text-xs font-bold border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 rounded-full transition-all active:scale-95 shadow-sm"
            >
                Use
            </button>
        </div>
    )
}
