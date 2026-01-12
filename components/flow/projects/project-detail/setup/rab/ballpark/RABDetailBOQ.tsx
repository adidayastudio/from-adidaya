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
        <div className="space-y-6">
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
                            <label className="text-[10px] uppercase font-bold text-neutral-400">Stirrups (Sengkang)</label>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-neutral-400">Ø</span>
                                <Input type="number" className="w-12" value={stirrupDia} onChange={e => setStirrupDia(Number(e.target.value))} />
                                <span className="text-xs text-neutral-400">@</span>
                                <Input type="number" value={stirrupSpacing} onChange={e => setStirrupSpacing(Number(e.target.value))} />
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* --- STANDARD BOX / TRAPEZOID FORM --- */}
            {formula !== "COLUMN_BEAM" && (
                <div className="grid grid-cols-2 gap-4">
                    {formula === "TRAPEZOIDAL" && (
                        <>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-neutral-500">Top Width (m)</label>
                                <Input type="number" value={topWidth || ""} onChange={(e) => setTopWidth(Number(e.target.value))} placeholder="0.0" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-neutral-500">Bottom Width (m)</label>
                                <Input type="number" value={bottomWidth || ""} onChange={(e) => setBottomWidth(Number(e.target.value))} placeholder="0.0" />
                            </div>
                        </>
                    )}

                    {formula === "BOX" && (
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-neutral-500">Width (m)</label>
                            <Input type="number" value={width || ""} onChange={(e) => setWidth(Number(e.target.value))} placeholder="0.0" />
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-neutral-500">Height (m)</label>
                        <Input type="number" value={height || ""} onChange={(e) => setHeight(Number(e.target.value))} placeholder="0.0" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-neutral-500">Length (m)</label>
                        <Input type="number" value={length || ""} onChange={(e) => setLength(Number(e.target.value))} placeholder="0.0" />
                    </div>
                </div>
            )}

            {/* MULTIPLIER */}
            <div className="pt-2 border-t border-neutral-100">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-neutral-500">Multiplier (Count)</label>
                    <Input
                        type="number"
                        className="w-24 text-right"
                        value={count}
                        onChange={(e) => setCount(Number(e.target.value))}
                    />
                </div>
            </div>

            {/* RESULT CARD */}
            {formula === "COLUMN_BEAM" ? (
                <div className="bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden">
                    <div className="bg-neutral-100/50 px-4 py-2 border-b border-neutral-200">
                        <h4 className="text-xs font-bold text-neutral-500 uppercase">Calculation Results</h4>
                    </div>
                    <ResultRow label="Concrete Volume" value={resConcrete} unit="m³" onApply={() => onApplyVolume(resConcrete)} />
                    <ResultRow label="Formwork Area" value={resFormwork} unit="m²" onApply={() => onApplyVolume(resFormwork)} />
                    <ResultRow label="Rebar Weight" value={resRebar} unit="kg" onApply={() => onApplyVolume(resRebar)} />
                </div>
            ) : (
                <div className="bg-neutral-50 p-4 rounded-xl flex items-center justify-between border border-neutral-200">
                    <div>
                        <p className="text-xs text-neutral-500 font-medium">Calculated Volume</p>
                        <p className="text-lg font-bold text-neutral-900">
                            {calculatedVolume.toLocaleString("id-ID", { maximumFractionDigits: 2 })}
                            <span className="text-xs font-normal text-neutral-400 ml-1">{item.unit || "m3"}</span>
                        </p>
                    </div>
                    <Button size="sm" onClick={() => onApplyVolume(calculatedVolume)}>
                        Use This
                    </Button>
                </div>
            )}

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
            <Button variant="secondary" size="sm" className="h-7 text-xs border border-neutral-200 bg-white hover:bg-neutral-50" onClick={onApply}>
                Use
            </Button>
        </div>
    )
}
