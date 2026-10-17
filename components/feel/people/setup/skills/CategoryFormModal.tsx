"use client";

import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { createClient } from "@/utils/supabase/client";
import { SkillCategory } from "./skills-types";
import { X } from "lucide-react";

interface CategoryFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    category?: SkillCategory; // If present, we are editing
    onSuccess: () => void;
    isLocked?: boolean;
}

export default function CategoryFormModal({ isOpen, onClose, category, onSuccess, isLocked }: CategoryFormModalProps) {
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    useEffect(() => {
        if (category) {
            setName(category.name);
            setDescription(category.description || "");
        } else {
            setName("");
            setDescription("");
        }
    }, [category, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        try {
            if (category) {
                // Update
                const { error } = await supabase
                    .from("skill_categories")
                    .update({ name, description })
                    .eq("id", category.id);

                if (error) throw error;
            } else {
                // Create
                const { error } = await supabase
                    .from("skill_categories")
                    .insert([{ name, description }]);

                if (error) throw error;
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            alert(err.message || "Failed to save category");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
            <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-lg ring-1 ring-black/5 flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-neutral-200/50 flex justify-between items-center bg-white/50 rounded-t-2xl shrink-0">
                    <DialogTitle>{category ? "Edit Category" : "Add Category"}</DialogTitle>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-neutral-100 transition-colors text-neutral-400 hover:text-neutral-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-1.5">
                            <Label>Category Name</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Design & Concept"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Description</Label>
                            <textarea
                                className="w-full px-3 py-2.5 bg-white/50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none min-h-[100px] text-sm"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Brief description of this capability cluster..."
                            />
                        </div>

                        <div className="pt-4 flex justify-end gap-3 border-t border-neutral-100 bg-white/50 -mx-6 -mb-6 p-6 backdrop-blur-sm sticky bottom-0">
                            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading || isLocked} className="bg-blue-600 text-white">
                                {loading ? "Saving..." : isLocked ? "Governance Locked" : category ? "Save Changes" : "Create Category"}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

// Simple internal components to replace missing primitives
function DialogTitle({ children }: { children: React.ReactNode }) {
    return <h3 className="font-bold text-lg text-neutral-900">{children}</h3>;
}

function Label({ children }: { children: React.ReactNode }) {
    return <label className="text-sm font-semibold text-neutral-700">{children}</label>;
}
