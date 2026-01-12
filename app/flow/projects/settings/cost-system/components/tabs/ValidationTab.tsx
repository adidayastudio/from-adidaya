"use client";

import { Checkbox } from "@/shared/ui/primitives/controls/checkbox";
import { AlertTriangle, XCircle, AlertCircle } from "lucide-react";

interface ValidationTabProps {
    config?: any;
    onChange?: (config: any) => void;
}

export default function ValidationTab({ config = {}, onChange }: ValidationTabProps) {
    const rules = config.rules || {};

    // Helper to toggle rule
    const toggle = (key: string) => {
        onChange?.({ ...config, rules: { ...rules, [key]: !rules[key] } });
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className="text-lg font-semibold text-neutral-900 border-b pb-2">Validation Rules</h3>
            <p className="text-sm text-neutral-500 mb-4">
                Configure checks that run before finalizing a cost plan.
            </p>

            <div className="space-y-4 bg-white p-4 border border-neutral-200 rounded-lg">
                <div className="flex items-start gap-3">
                    <Checkbox checked={!!rules.require_total} onChange={() => toggle('require_total')} />
                    <div>
                        <label className="font-medium text-neutral-900 block">Require Total Amount Match</label>
                        <p className="text-xs text-neutral-500">Ensure the sum of children matches the parent total exactly.</p>
                    </div>
                </div>

                <div className="flex items-start gap-3">
                    <Checkbox checked={!!rules.require_volume} onChange={() => toggle('require_volume')} />
                    <div>
                        <label className="font-medium text-neutral-900 block">Mandatory Volume Input</label>
                        <p className="text-xs text-neutral-500">All cost items must have a volume quantity.</p>
                    </div>
                </div>

                <div className="flex items-start gap-3">
                    <Checkbox checked={!!rules.no_zero_price} onChange={() => toggle('no_zero_price')} />
                    <div>
                        <label className="font-medium text-neutral-900 block">Block Zero Price Items</label>
                        <p className="text-xs text-neutral-500">Prevent saving if any item has a 0 price.</p>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-neutral-50 rounded border border-neutral-100 text-xs text-neutral-500">
                <AlertCircle size={14} />
                <span>Currently these rules are soft-checks (warnings) unless mapped to a specific Strict Workflow.</span>
            </div>
        </div>
    );
}
