"use client";

import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { Select } from "@/shared/ui/primitives/select/select";
import { createClient } from "@/utils/supabase/client";
import { Skill, SkillCategory } from "./skills-types";
import { X } from "lucide-react";

interface SkillFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    skill?: Skill;
    onSuccess: () => void;
    categories: SkillCategory[];
}

export default function SkillFormModal({ isOpen, onClose, skill, onSuccess, categories }: SkillFormModalProps) {
    const supabase = createClient();
    const [loading, setLoading] = useState(false);

    const [name, setName] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [status, setStatus] = useState<"active" | "draft" | "archived">("active");

    const [departments, setDepartments] = useState<string[]>([]);
    const [positions, setPositions] = useState<string[]>([]);

    const [deptInput, setDeptInput] = useState("");
    const [posInput, setPosInput] = useState("");

    useEffect(() => {
        if (skill) {
            setName(skill.name);
            setCategoryId(skill.category_id);
            setStatus(skill.status);
            setDepartments(skill.related_departments || []);
            setPositions(skill.related_positions || []);
        } else {
            setName("");
            setCategoryId(categories[0]?.id || "");
            setStatus("active");
            setDepartments([]);
            setPositions([]);
        }
    }, [skill, isOpen, categories]);

    const handleAddDept = () => {
        if (deptInput.trim() && !departments.includes(deptInput.trim())) {
            setDepartments([...departments, deptInput.trim()]);
            setDeptInput("");
        }
    };

    const handleAddPos = () => {
        if (posInput.trim() && !positions.includes(posInput.trim())) {
            setPositions([...positions, posInput.trim()]);
            setPosInput("");
        }
    };

    const removeDept = (d: string) => setDepartments(departments.filter(x => x !== d));
    const removePos = (p: string) => setPositions(positions.filter(x => x !== p));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !categoryId) return;

        setLoading(true);
        try {
            let skillId = skill?.id;

            if (skill) {
                // Update Skill
                const { error } = await supabase
                    .from("skill_library")
                    .update({ name, category_id: categoryId, status })
                    .eq("id", skill.id);
                if (error) throw error;
            } else {
                // Create Skill
                const { data, error } = await supabase
                    .from("skill_library")
                    .insert([{ name, category_id: categoryId, status }])
                    .select()
                    .single();
                if (error) throw error;
                skillId = data.id;
            }

            if (skillId) {
                // Update Relations (Delete all and re-insert for simplicity)
                await supabase.from("skill_related_departments").delete().eq("skill_id", skillId);
                if (departments.length > 0) {
                    await supabase.from("skill_related_departments").insert(
                        departments.map(d => ({ skill_id: skillId, department_name: d }))
                    );
                }

                await supabase.from("skill_related_positions").delete().eq("skill_id", skillId);
                if (positions.length > 0) {
                    await supabase.from("skill_related_positions").insert(
                        positions.map(p => ({ skill_id: skillId, position_name: p }))
                    );
                }
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            alert(err.message || "Failed to save skill");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const categoryOptions = categories.map(c => ({ label: c.name, value: c.id }));
    const statusOptions = [
        { label: "Active", value: "active" },
        { label: "Draft", value: "draft" },
        { label: "Archived", value: "archived" }
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
            <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-2xl ring-1 ring-black/5 flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-neutral-200/50 flex justify-between items-center bg-white/50 rounded-t-2xl shrink-0">
                    <h3 className="font-bold text-lg text-neutral-900">{skill ? "Edit Skill" : "Add Skill"}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-neutral-100 transition-colors text-neutral-400 hover:text-neutral-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Skill Name</Label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. React.js"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Category</Label>
                                <Select
                                    options={categoryOptions}
                                    value={categoryId}
                                    onChange={setCategoryId}
                                    placeholder="Select Category"
                                    accentColor="blue"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label>Status</Label>
                            <Select
                                options={statusOptions}
                                value={status}
                                onChange={(val: any) => setStatus(val)}
                                placeholder="Select Status"
                                accentColor="blue"
                            />
                        </div>

                        {/* Related Departments */}
                        <div className="space-y-2">
                            <Label>Related Departments</Label>
                            <div className="flex gap-2">
                                <Input
                                    className="flex-1"
                                    value={deptInput}
                                    onChange={e => setDeptInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddDept(); } }}
                                    placeholder="Add department tag and press Enter..."
                                />
                                <Button type="button" variant="secondary" onClick={handleAddDept}>Add</Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {departments.map(d => (
                                    <span key={d} className="inline-flex items-center gap-1 bg-neutral-100 px-2 py-1 rounded text-sm text-neutral-700">
                                        {d}
                                        <button type="button" onClick={() => removeDept(d)} className="text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-full h-4 w-4 flex items-center justify-center">&times;</button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Related Positions */}
                        <div className="space-y-2">
                            <Label>Related Positions</Label>
                            <div className="flex gap-2">
                                <Input
                                    className="flex-1"
                                    value={posInput}
                                    onChange={e => setPosInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddPos(); } }}
                                    placeholder="Add position tag..."
                                />
                                <Button type="button" variant="secondary" onClick={handleAddPos}>Add</Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {positions.map(p => (
                                    <span key={p} className="inline-flex items-center gap-1 bg-neutral-100 px-2 py-1 rounded text-sm text-neutral-700">
                                        {p}
                                        <button type="button" onClick={() => removePos(p)} className="text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-full h-4 w-4 flex items-center justify-center">&times;</button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-3 border-t border-neutral-100 bg-white/50 -mx-6 -mb-6 p-6 backdrop-blur-sm sticky bottom-0">
                            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading} className="bg-blue-600 text-white">
                                {loading ? "Saving..." : skill ? "Save Changes" : "Create Skill"}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

function Label({ children }: { children: React.ReactNode }) {
    return <label className="text-sm font-semibold text-neutral-700">{children}</label>;
}
