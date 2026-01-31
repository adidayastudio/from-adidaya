"use client";

import { useState, useEffect } from "react";
import { ModalRoot, ModalHeader, ModalFooter } from "@/shared/ui/modal";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { Select } from "@/shared/ui/primitives/select/select";
import { Trash2, Plus, Star } from "lucide-react";
import { PeopleSkill, SkillLevel } from "@/lib/types/people-types";
import { fetchPeopleSkills, upsertPeopleSkill, deletePeopleSkill } from "@/lib/api/people";
import { toast } from "react-hot-toast";
import clsx from "clsx";

interface SkillsManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    onUpdate?: () => void;
}

export default function SkillsManagerModal({ isOpen, onClose, userId, onUpdate }: SkillsManagerModalProps) {
    const [skills, setSkills] = useState<PeopleSkill[]>([]);
    const [loading, setLoading] = useState(false);
    const [newSkillName, setNewSkillName] = useState("");
    const [newSkillLevel, setNewSkillLevel] = useState<SkillLevel>("intermediate");

    useEffect(() => {
        if (isOpen && userId) {
            loadSkills();
        }
    }, [isOpen, userId]);

    const loadSkills = async () => {
        setLoading(true);
        const data = await fetchPeopleSkills(userId);
        setSkills(data);
        setLoading(false);
    };

    const handleAddSkill = async () => {
        if (!newSkillName.trim()) return;

        try {
            const result = await upsertPeopleSkill({
                user_id: userId,
                skill_name: newSkillName.trim(),
                skill_level: newSkillLevel
            });

            if (result) {
                toast.success(`${newSkillName} added`);
                setNewSkillName("");
                loadSkills();
                onUpdate?.();
            }
        } catch (error) {
            toast.error("Failed to add skill");
        }
    };

    const handleDeleteSkill = async (id: string, name: string) => {
        if (confirm(`Remove ${name}?`)) {
            const success = await deletePeopleSkill(id);
            if (success) {
                loadSkills();
                onUpdate?.();
            }
        }
    };

    const getLevelColor = (level: SkillLevel) => {
        switch (level) {
            case "expert": return "text-purple-600 bg-purple-50 border-purple-100";
            case "advanced": return "text-blue-600 bg-blue-50 border-blue-100";
            case "intermediate": return "text-emerald-600 bg-emerald-50 border-emerald-100";
            case "beginner": return "text-neutral-600 bg-neutral-50 border-neutral-100";
        }
    };

    return (
        <ModalRoot open={isOpen} onOpenChange={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <ModalHeader title="Manage Skills" onClose={onClose} />

                <div className="p-6 space-y-6">
                    {/* ADD NEW */}
                    <div className="flex gap-2 items-end">
                        <div className="flex-1 space-y-1.5">
                            <Input
                                label="New Skill"
                                value={newSkillName}
                                onChange={(e) => setNewSkillName(e.target.value)}
                                placeholder="e.g. React Native"
                            />
                        </div>
                        <div className="w-40 space-y-1.5">
                            <Select
                                label="Level"
                                value={newSkillLevel}
                                onChange={(v) => setNewSkillLevel(v as SkillLevel)}
                                options={[
                                    { label: "Beginner", value: "beginner" },
                                    { label: "Intermediate", value: "intermediate" },
                                    { label: "Advanced", value: "advanced" },
                                    { label: "Expert", value: "expert" },
                                ]}
                            />
                        </div>
                        <Button variant="primary" size="md" iconOnly={<Plus className="w-4 h-4" />} onClick={handleAddSkill} />
                    </div>

                    <div className="border-t border-neutral-100" />

                    {/* LIST */}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {loading ? (
                            <div className="text-center text-sm text-neutral-400 py-4">Loading skills...</div>
                        ) : skills.length === 0 ? (
                            <div className="text-center text-sm text-neutral-400 py-4">No skills added yet.</div>
                        ) : (
                            skills.map((skill) => (
                                <div key={skill.id} className="flex items-center justify-between p-2 rounded-lg border border-neutral-100 hover:border-blue-100 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className={clsx("text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border", getLevelColor(skill.skill_level))}>
                                            {skill.skill_level}
                                        </div>
                                        <div className="text-sm font-medium text-neutral-700">{skill.skill_name}</div>
                                    </div>
                                    <Button
                                        variant="text"
                                        size="sm"
                                        className="text-neutral-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        iconOnly={<Trash2 className="w-4 h-4" />}
                                        onClick={() => handleDeleteSkill(skill.id, skill.skill_name)}
                                    />
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex justify-end">
                    <Button variant="outline" onClick={onClose}>Done</Button>
                </div>
            </div>
        </ModalRoot>
    );
}
