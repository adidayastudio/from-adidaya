"use client";

import { ArrowRight } from "lucide-react";
import { Checkbox } from "@/shared/ui/primitives/controls/checkbox";
import { Select } from "@/shared/ui/primitives/select/select";

interface StageWBSTabProps {
    config?: any;
    onChange?: (config: any) => void;
}

export default function StageWBSTab({ config = {}, onChange }: StageWBSTabProps) {
    const mappings = config?.mappings || {};
    const rules = config?.rules || { inheritance: true, strict: true, protection: true };

    const updateMapping = (stageId: string, field: string, value: string) => {
        const newMappings = {
            ...mappings,
            [stageId]: {
                ...(mappings[stageId] || { target: "estimates", depth: "3" }),
                [field]: value
            }
        };
        onChange?.({ ...config, mappings: newMappings });
    };

    const toggleRule = (rule: string) => {
        const newRules = { ...rules, [rule]: !rules[rule] };
        onChange?.({ ...config, rules: newRules });
    };

    const defaults = [
        { stage: "SD", name: "Schematic Design", defaultTarget: "ballpark", defaultDepth: "2" },
        { stage: "DD", name: "Design Development", defaultTarget: "estimates", defaultDepth: "3" },
        { stage: "ED", name: "Engineering Design", defaultTarget: "detail", defaultDepth: "5" },
    ];

    const pricingLevels = [
        { label: "Ballpark Estimating", value: "ballpark" },
        { label: "Detailed Estimates", value: "estimates" },
        { label: "Detail (AHSP/BOQ)", value: "detail" },
        { label: "-- None --", value: "none" }
    ];

    const wbsDepths = [
        { label: "Level 1 (Summary)", value: "1" },
        { label: "Level 2 (Group)", value: "2" },
        { label: "Level 3 (Work Item)", value: "3" },
        { label: "Level 4 (Detail)", value: "4" },
        { label: "Level 5 (Sub-Detail)", value: "5" }
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">

            {/* Stage Mapping Configuration */}
            <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-lg font-semibold text-neutral-900">Stage to Pricing Level Mapping</h3>
                </div>
                <p className="text-sm text-neutral-500">
                    Configure which Pricing Level is active for each Project Stage.
                </p>

                <div className="grid grid-cols-1 gap-4">
                    {defaults.map((item) => {
                        const current = mappings[item.stage] || { target: item.defaultTarget, depth: item.defaultDepth };
                        return (
                            <div key={item.stage} className="flex items-start gap-4 p-4 bg-white border border-neutral-200 rounded-lg shadow-sm">
                                <div className="w-1/3 pt-2 font-medium text-neutral-900">{item.stage} ({item.name})</div>

                                <div className="flex flex-col items-center justify-center pt-3 px-2 text-neutral-300">
                                    <ArrowRight size={20} />
                                </div>

                                <div className="flex-1 grid grid-cols-2 gap-4">
                                    <Select
                                        label="Target Pricing Level"
                                        options={pricingLevels}
                                        defaultValue={current.target}
                                        onChange={(val) => updateMapping(item.stage, 'target', val)}
                                    />
                                    <Select
                                        label="Max WBS Depth"
                                        options={wbsDepths}
                                        defaultValue={current.depth}
                                        onChange={(val) => updateMapping(item.stage, 'depth', val)}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Rules Config */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-neutral-900 border-b pb-2">Inheritance & Visibility Rules</h3>

                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <Checkbox checked={!!rules.inheritance} onChange={() => toggleRule('inheritance')} />
                        <div>
                            <label className="font-medium text-neutral-900">Cascading Inheritance</label>
                            <p className="text-sm text-neutral-500">Allow pricing data to be inherited from previous stages/levels if not defined.</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <Checkbox checked={!!rules.strict} onChange={() => toggleRule('strict')} />
                        <div>
                            <label className="font-medium text-neutral-900">Strict Hierarchy Enforced</label>
                            <p className="text-sm text-neutral-500">Prevent jumping directly from Ballpark to Detail without an intermediate Estimate.</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <Checkbox checked={!!rules.protection} onChange={() => toggleRule('protection')} />
                        <div>
                            <label className="font-medium text-neutral-900">Parent Item Protection</label>
                            <p className="text-sm text-neutral-500">Prevent direct editing of Summary items (parents), necessitating child item edits.</p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
