"use client";

import { useEffect, useState } from "react";
import { Info, Loader2 } from "lucide-react";
import { Input } from "@/shared/ui/primitives/input/input";
import { Select } from "@/shared/ui/primitives/select/select";
import { Checkbox } from "@/shared/ui/primitives/controls/checkbox";
import { fetchDisciplines } from "@/lib/api/templates-extended";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";
import { CostTemplate } from "@/lib/api/cost-system";

interface GeneralTabProps {
    data: CostTemplate;
    onChange: (patch: Partial<CostTemplate>) => void;
}

export default function GeneralTab({ data, onChange }: GeneralTabProps) {
    const [disciplines, setDisciplines] = useState<any[]>([]);
    const [loadingDisciplines, setLoadingDisciplines] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                // If data is already there, we don't need to refetch default workspace, but we need it for disciplines api
                const wsId = data.workspaceId || await fetchDefaultWorkspaceId() || "00000000-0000-0000-0000-000000000001";
                const apiData = await fetchDisciplines(wsId);
                const sorted = apiData.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
                setDisciplines(sorted);
            } catch (e) {
                console.error("Failed to load disciplines", e);
            } finally {
                setLoadingDisciplines(false);
            }
        }
        load();
    }, [data.workspaceId]);

    const toggleDiscipline = (code: string) => {
        const current = data.defaultDisciplines || [];
        const exists = current.includes(code);
        let updated;
        if (exists) {
            updated = current.filter(c => c !== code);
        } else {
            updated = [...current, code];
        }
        onChange({ defaultDisciplines: updated });
    };

    const updateUnitConfig = (key: string, value: string) => {
        onChange({
            unitConfig: {
                ...data.unitConfig,
                [key]: value
            }
        });
    };

    return (
        <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">

            {/* Template Info */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-neutral-900 border-b pb-2">Template Information</h3>

                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Select
                            label="Template Type"
                            options={[
                                { label: "General (Standard)", value: "general" },
                                { label: "Typology Specific", value: "typology" }
                            ]}
                            defaultValue={data.type}
                            onChange={(val) => onChange({ type: val as any })}
                            helperText="General applies as a fallback. Typology overrides General."
                        />
                    </div>

                    <div className="space-y-2">
                        <Select
                            label="Typology Reference"
                            options={[
                                { label: "-- Not Applicable for General --", value: "" },
                                { label: "High Rise", value: "high-rise" },
                                { label: "Landed House", value: "landed-house" }
                            ]}
                            defaultValue={data.typologyId || ""}
                            onChange={(val) => onChange({ typologyId: val })}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Input
                        label="Template Name"
                        defaultValue={data.name}
                        onChange={(e) => onChange({ name: e.target.value })}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Description</label>
                    <textarea
                        className="w-full p-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-brand-red/20 hover:border-neutral-300 focus:border-brand-red outline-none h-24 resize-none transition-all duration-150 text-sm"
                        defaultValue={data.description}
                        onChange={(e) => onChange({ description: e.target.value })}
                    />
                </div>
            </div>

            {/* Defaults & Behavior */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-neutral-900 border-b pb-2">Configuration & Defaults</h3>

                <div className="space-y-2">
                    <Select
                        label="Currency"
                        options={[
                            { label: "IDR (Indonesian Rupiah)", value: "IDR" },
                            { label: "USD (US Dollar)", value: "USD" }
                        ]}
                        defaultValue={data.currency}
                        onChange={(val) => onChange({ currency: val })}
                    />
                </div>

                <div className="grid grid-cols-2 gap-6 pt-2">
                    <div className="col-span-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider border-b pb-1 mb-2">
                        Default Units Breakdown
                    </div>

                    <div className="space-y-2">
                        <Select
                            label="Length Unit"
                            options={[
                                { label: "Meter (m)", value: "m" },
                                { label: "Centimeter (cm)", value: "cm" },
                                { label: "Millimeter (mm)", value: "mm" },
                                { label: "Inch (in)", value: "in" },
                                { label: "Feet (ft)", value: "ft" },
                            ]}
                            defaultValue={data.unitConfig?.length || "m"}
                            onChange={(val) => updateUnitConfig('length', val)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Select
                            label="Area Unit"
                            options={[
                                { label: "Square Meter (m²)", value: "m2" },
                                { label: "Square Centimeter (cm²)", value: "cm2" },
                                { label: "Hectare (ha)", value: "ha" },
                                { label: "Square Feet (ft²)", value: "ft2" },
                            ]}
                            defaultValue={data.unitConfig?.area || "m2"}
                            onChange={(val) => updateUnitConfig('area', val)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Select
                            label="Volume Unit"
                            options={[
                                { label: "Cubic Meter (m³)", value: "m3" },
                                { label: "Cubic Centimeter (cm³)", value: "cm3" },
                                { label: "Liter (L)", value: "l" },
                            ]}
                            defaultValue={data.unitConfig?.volume || "m3"}
                            onChange={(val) => updateUnitConfig('volume', val)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Select
                            label="Weight Unit"
                            options={[
                                { label: "Kilogram (kg)", value: "kg" },
                                { label: "Ton (ton)", value: "ton" },
                                { label: "Gram (g)", value: "g" },
                                { label: "Pound (lb)", value: "lb" },
                            ]}
                            defaultValue={data.unitConfig?.weight || "kg"}
                            onChange={(val) => updateUnitConfig('weight', val)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Select
                            label="Quantity Unit (Global)"
                            options={[
                                { label: "Unit", value: "unit" },
                                { label: "Piece (pc)", value: "pc" },
                                { label: "Point (titik)", value: "point" },
                                { label: "Set", value: "set" },
                            ]}
                            defaultValue={data.unitConfig?.quantity || "unit"}
                            onChange={(val) => updateUnitConfig('quantity', val)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Select
                            label="Lumpsum / Time"
                            options={[
                                { label: "Lumpsum (ls)", value: "ls" },
                                { label: "Month (bln)", value: "month" },
                                { label: "Week (mgg)", value: "week" },
                                { label: "Day (hari)", value: "day" },
                            ]}
                            defaultValue={data.unitConfig?.lumpsum || "ls"}
                            onChange={(val) => updateUnitConfig('lumpsum', val)}
                        />
                    </div>
                </div>

                {/* Default Disciplines Checklist */}
                <div className="space-y-2 pt-4">
                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Default Included Disciplines</label>
                    <div className="p-4 border border-neutral-200 rounded-lg bg-neutral-50 min-h-[100px]">
                        {loadingDisciplines ? (
                            <div className="flex items-center gap-2 text-sm text-neutral-500">
                                <Loader2 className="w-4 h-4 animate-spin" /> Loading disciplines...
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {disciplines.map(d => (
                                    <div key={d.code} className="flex items-center gap-2 bg-white p-2 rounded border border-neutral-200">
                                        <Checkbox
                                            // @ts-ignore
                                            checked={data.defaultDisciplines?.includes(d.code)}
                                            onChange={() => toggleDiscipline(d.code)}
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-neutral-700">{d.code}</span>
                                            <span className="text-xs text-neutral-500 truncate max-w-[120px]" title={d.nameEn}>{d.nameEn}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-neutral-500">Select which disciplines are active by default for new projects using this template.</p>
                </div>
            </div>

            {/* Warning Box */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 text-amber-800">
                <Info className="shrink-0 mt-0.5" size={20} />
                <div>
                    <h4 className="font-semibold text-sm">Strict Rules Mode</h4>
                    <p className="text-sm mt-1">
                        This Cost System template defines <strong>RULES ONLY</strong>.
                        No specific prices, BOQ items, or AHSP data should be entered here.
                        Use the <strong>Price Library</strong> module for pricing data.
                    </p>
                </div>
            </div>

        </div>
    );
}
