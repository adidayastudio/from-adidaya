"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Shield, FileBox, Layers, AlertCircle } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { Switch } from "@/shared/ui/primitives/controls/switch";
import { StageTemplate, updateStageTemplate } from "@/lib/api/templates";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    stage: StageTemplate | null;
    workspaceId: string;
    onUpdate: () => void;
}

export default function StageDetailDrawer({ isOpen, onClose, stage, workspaceId, onUpdate }: Props) {
    const [formData, setFormData] = useState<Partial<StageTemplate>>({});
    const [isSaving, setIsSaving] = useState(false);

    // Initialize form data when stage changes
    useEffect(() => {
        if (stage) {
            setFormData({
                ...stage,
                rules: (stage as any).rules || {
                    editable_after_complete: false,
                    auto_lock: true,
                    require_approval: false,
                    allowed_work_scope: 'Both'
                }
            });
        }
    }, [stage]);

    const handleSave = async () => {
        if (!stage) return;
        setIsSaving(true);
        try {
            await updateStageTemplate(stage.id, workspaceId, {
                ...formData,
                // ensure rules is passed as JSON
                rules: (formData as any).rules
            } as any);
            onUpdate();
            onClose();
        } catch (error) {
            console.error("Failed to save stage details:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const updateRule = (key: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            rules: {
                ...(prev as any).rules,
                [key]: value
            }
        }));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-neutral-100 bg-neutral-50/50">
                            <div>
                                <h2 className="text-lg font-bold text-neutral-900">{stage?.stageName || "Stage Details"}</h2>
                                <p className="text-sm text-neutral-500 font-mono">{stage?.displayCode}</p>
                            </div>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">

                            {/* Section: General */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                                    <FileBox className="w-4 h-4 text-neutral-400" />
                                    General Info
                                </h3>
                                <div className="grid gap-4">
                                    <Input
                                        label="Description"
                                        placeholder="Brief description of this stage..."
                                        value={(formData as any).description || ""}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value } as any))}
                                    />
                                </div>
                            </div>

                            <hr className="border-neutral-100" />

                            {/* Section: Rules */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-neutral-400" />
                                    Control Rules
                                </h3>

                                <div className="space-y-3 bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-neutral-700">Editable After Complete</span>
                                        <Switch
                                            checked={(formData as any).rules?.editable_after_complete || false}
                                            onClick={() => updateRule('editable_after_complete', !(formData as any).rules?.editable_after_complete)}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-neutral-700">Auto-Lock Previous Stage</span>
                                        <Switch
                                            checked={(formData as any).rules?.auto_lock || false}
                                            onClick={() => updateRule('auto_lock', !(formData as any).rules?.auto_lock)}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-neutral-700">Require Approval</span>
                                        <Switch
                                            checked={(formData as any).rules?.require_approval || false}
                                            onClick={() => updateRule('require_approval', !(formData as any).rules?.require_approval)}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold text-neutral-500 mb-1 block">Work Scope</label>
                                        <select
                                            className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-red/20"
                                            value={(formData as any).rules?.allowed_work_scope || 'Both'}
                                            onChange={(e) => updateRule('allowed_work_scope', e.target.value)}
                                        >
                                            <option value="Design">Design Only</option>
                                            <option value="Build">Build Only</option>
                                            <option value="Both">Both</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-neutral-500 mb-1 block">Lockable</label>
                                        <select
                                            className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-red/20"
                                            value={(formData as any).lockable ? 'Yes' : 'No'}
                                            onChange={(e) => setFormData(prev => ({ ...prev, lockable: e.target.value === 'Yes' } as any))}
                                        >
                                            <option value="Yes">Yes</option>
                                            <option value="No">No</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <hr className="border-neutral-100" />

                            {/* Section: WBS */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-neutral-400" />
                                    WBS Control
                                </h3>
                                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 flex gap-3 text-yellow-800 text-xs">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    Limits how deep the WBS tree can go for this stage.
                                </div>
                                <Input
                                    label="Max WBS Depth (Level)"
                                    type="number"
                                    placeholder="e.g. 3"
                                    value={(formData as any).rules?.max_wbs_depth || ""}
                                    onChange={(e) => updateRule('max_wbs_depth', parseInt(e.target.value))}
                                />
                            </div>

                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-3">
                            <Button variant="secondary" onClick={onClose}>Cancel</Button>
                            <Button
                                className="bg-neutral-900 text-white hover:bg-neutral-800 min-w-[100px]"
                                onClick={handleSave}
                                disabled={isSaving}
                                icon={<Save className="w-4 h-4" />}
                            >
                                {isSaving ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
