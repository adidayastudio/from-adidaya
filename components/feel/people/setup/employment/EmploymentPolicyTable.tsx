"use client";

import { useEffect, useState } from "react";
import { EmploymentPolicy, EmploymentType } from "@/lib/types/organization";
import { fetchEmploymentPolicies, upsertEmploymentPolicy, fetchEmploymentTypes } from "@/lib/api/employment";
import { Loader2, Save, Check } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { toast } from "sonner";

export default function EmploymentPolicyTable({ isLocked }: { isLocked?: boolean }) {
    const [policies, setPolicies] = useState<EmploymentPolicy[]>([]);
    const [types, setTypes] = useState<EmploymentType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
    const [dirtyTypeIds, setDirtyTypeIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const [policiesData, typesData] = await Promise.all([
            fetchEmploymentPolicies(),
            fetchEmploymentTypes()
        ]);
        setPolicies(policiesData);
        setTypes(typesData);
        setIsLoading(false);
    };

    const handleUpdate = (typeId: string, field: keyof EmploymentPolicy, value: any) => {
        const existingPolicy = policies.find(p => p.employment_type_id === typeId);
        
        const newPolicies = [...policies];
        if (existingPolicy) {
            const index = newPolicies.findIndex(p => p.employment_type_id === typeId);
            if (index >= 0) newPolicies[index] = { ...newPolicies[index], [field]: value };
        } else {
            const newPol: Partial<EmploymentPolicy> = {
                employment_type_id: typeId,
                default_working_hours: 40,
                overtime_eligible: false,
                benefits_eligible: false,
                [field]: value
            };
            newPolicies.push(newPol as EmploymentPolicy);
        }

        setPolicies(newPolicies);
        setDirtyTypeIds(prev => new Set(prev).add(typeId));
    };

    const handleSaveAll = async () => {
        if (dirtyTypeIds.size === 0) return;

        // Set all dirty ids as saving
        setSavingIds(dirtyTypeIds);
        
        let hasError = false;
        
        // Loop over dirty ids and save them
        for (const typeId of Array.from(dirtyTypeIds)) {
            const policy = policies.find(p => p.employment_type_id === typeId);
            if (!policy) continue;
            
            const saved = await upsertEmploymentPolicy(policy);
            if (!saved) {
                hasError = true;
            }
        }
        
        if (!hasError) {
            toast.success("All changes saved successfully!");
            setDirtyTypeIds(new Set()); // clear dirty states on full success
            setSavingIds(new Set()); // clear saving state
        } else {
            toast.error("Some changes failed to save. Please try again.");
            // We just clear the saving visual, keep them dirty if we wanted to be strict,
            // but for simplicity let's just clear saving
            setSavingIds(new Set());
        }
    };

    // savePolicy removed due to batch saving via handleSaveAll

    if (isLoading) {
        return <div className="p-8 text-center text-neutral-500">Loading...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-neutral-900">Employment Policy</h2>
                <Button 
                    variant="primary" 
                    size="sm" 
                    icon={<Save className="w-4 h-4" />}
                    onClick={handleSaveAll}
                    disabled={isLocked || savingIds.size > 0 || dirtyTypeIds.size === 0}
                    className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
                >
                    {savingIds.size > 0 ? "Saving..." : "Save Changes"}
                </Button>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white border border-neutral-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                            <th className="px-4 py-3 font-semibold text-neutral-700">Employment Type</th>
                            <th className="px-4 py-3 font-semibold text-neutral-700 w-32">Default Hours</th>
                            <th className="px-4 py-3 font-semibold text-neutral-700 w-32 text-center">Overtime</th>
                            <th className="px-4 py-3 font-semibold text-neutral-700 w-32 text-center">Benefits</th>
                            <th className="px-4 py-3 font-semibold text-neutral-700">Notes</th>
                            <th className="px-4 py-3 font-semibold text-neutral-700 w-16"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {types.map((type) => {
                            const policy = policies.find(p => p.employment_type_id === type.id);
                            const isSaving = savingIds.has(type.id);
                            const defaultHours = policy?.default_working_hours ?? 40;
                            const overtime = policy?.overtime_eligible ?? false;
                            const benefits = policy?.benefits_eligible ?? false;
                            const notes = policy?.notes ?? "";

                            return (
                                <tr key={type.id} className="hover:bg-neutral-50/50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-neutral-900">
                                        {type.name}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="relative">
                                            <input
                                                type="number"
                                                className="w-full px-2 py-1.5 border border-neutral-200 rounded-md text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-neutral-50"
                                                value={defaultHours}
                                                onChange={(e) => handleUpdate(type.id, 'default_working_hours', parseFloat(e.target.value))}
                                                disabled={isLocked}
                                            />
                                            <span className="absolute right-8 top-1.5 text-xs text-neutral-400 pointer-events-none">hrs</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={overtime}
                                                onChange={(e) => handleUpdate(type.id, 'overtime_eligible', e.target.checked)}
                                                disabled={isLocked}
                                            />
                                            <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                                        </label>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={benefits}
                                                onChange={(e) => handleUpdate(type.id, 'benefits_eligible', e.target.checked)}
                                                disabled={isLocked}
                                            />
                                            <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                                        </label>
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            type="text"
                                            className="w-full px-2 py-1.5 border border-neutral-200 rounded-md text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-neutral-50"
                                            placeholder="Add notes..."
                                            value={notes}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                handleUpdate(type.id, 'notes', val);
                                            }}
                                            disabled={isLocked}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {isSaving && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
                {types.map((type) => {
                    const policy = policies.find(p => p.employment_type_id === type.id);
                    const isSaving = savingIds.has(type.id);
                    const defaultHours = policy?.default_working_hours ?? 40;
                    const overtime = policy?.overtime_eligible ?? false;
                    const benefits = policy?.benefits_eligible ?? false;
                    const notes = policy?.notes ?? "";

                    return (
                        <div key={type.id} className="bg-white rounded-xl p-3 border border-neutral-200 shadow-sm space-y-3">
                            {/* Row 1: Name and Hours */}
                            <div className="flex justify-between items-center gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                    <h3 className="font-semibold text-neutral-900 text-sm truncate">{type.name}</h3>
                                    {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500 shrink-0" />}
                                </div>
                                <div className="relative w-24 shrink-0">
                                    <input
                                        type="number"
                                        className="w-full pl-2 pr-7 py-1.5 border border-neutral-200 rounded-lg text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-neutral-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50"
                                        value={defaultHours}
                                        onChange={(e) => handleUpdate(type.id, 'default_working_hours', parseFloat(e.target.value))}
                                        disabled={isLocked}
                                    />
                                    <span className="absolute right-2 top-1.5 text-xs text-neutral-400 pointer-events-none">hrs</span>
                                </div>
                            </div>

                            {/* Row 2: Toggles */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className={`flex justify-between items-center px-2.5 py-2 rounded-lg border transition-colors ${overtime ? 'bg-blue-50 border-blue-100' : 'bg-neutral-50 border-neutral-100'}`}>
                                    <span className={`text-xs font-medium ${overtime ? 'text-blue-700' : 'text-neutral-600'}`}>Overtime</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={overtime}
                                            onChange={(e) => handleUpdate(type.id, 'overtime_eligible', e.target.checked)}
                                            disabled={isLocked}
                                        />
                                        <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                                    </label>
                                </div>
                                <div className={`flex justify-between items-center px-2.5 py-2 rounded-lg border transition-colors ${benefits ? 'bg-blue-50 border-blue-100' : 'bg-neutral-50 border-neutral-100'}`}>
                                    <span className={`text-xs font-medium ${benefits ? 'text-blue-700' : 'text-neutral-600'}`}>Benefits</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={benefits}
                                            onChange={(e) => handleUpdate(type.id, 'benefits_eligible', e.target.checked)}
                                            disabled={isLocked}
                                        />
                                        <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                                    </label>
                                </div>
                            </div>

                            {/* Row 3: Notes */}
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white placeholder:text-neutral-400 disabled:opacity-50"
                                placeholder="Add notes..."
                                value={notes}
                                onChange={(e) => handleUpdate(type.id, 'notes', e.target.value)}
                                disabled={isLocked}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
