"use client";

import { useState, useEffect, useMemo } from "react";
import { Person } from "../types";
import { Sparkles, Star, Brain, Trash2, ChevronDown, ListFilter } from "lucide-react";
import clsx from "clsx";
import { Button } from "@/shared/ui/primitives/button/button";
import SkillsManagerModal from "../modals/SkillsManagerModal";
import EditConfirmationModal from "../modals/EditConfirmationModal";
import DeleteSkillConfirmationModal from "../modals/DeleteSkillConfirmationModal";
import { fetchPeopleSkills, fetchSkillCategories, deletePeopleSkill } from "@/lib/api/people";
import { PeopleSkill, SkillCategory } from "@/lib/types/people-types";
import { toast } from "react-hot-toast";

const CATEGORY_COLORS: Record<string, { bg: string, text: string, border: string, bar: string, accent: string }> = {
    "DESIGN & CONCEPT": { bg: "bg-rose-50/40", text: "text-rose-600", border: "border-rose-100/50", bar: "bg-rose-400", accent: "bg-rose-100/50" },
    "DIGITAL & IT": { bg: "bg-indigo-50/40", text: "text-indigo-600", border: "border-indigo-100/50", bar: "bg-indigo-400", accent: "bg-indigo-100/50" },
    "PROJECT & MANAGEMENT": { bg: "bg-emerald-50/40", text: "text-emerald-600", border: "border-emerald-100/50", bar: "bg-emerald-400", accent: "bg-emerald-100/50" },
    "COMMUNICATION & MEDIA": { bg: "bg-blue-50/40", text: "text-blue-600", border: "border-blue-100/50", bar: "bg-blue-400", accent: "bg-blue-100/50" },
    "SOFT SKILLS": { bg: "bg-amber-50/40", text: "text-amber-600", border: "border-amber-100/50", bar: "bg-amber-400", accent: "bg-amber-100/50" },
    "LANGUAGES": { bg: "bg-cyan-50/40", text: "text-cyan-600", border: "border-cyan-100/50", bar: "bg-cyan-400", accent: "bg-cyan-100/50" },
    "GENERAL": { bg: "bg-neutral-50/50", text: "text-neutral-600", border: "border-neutral-100", bar: "bg-neutral-400", accent: "bg-neutral-100" }
};

type SortMode = "name" | "category" | "level";

export default function SkillsTab({ person, isSystem, isMe }: { person: Person, isSystem: boolean, isMe: boolean }) {
    const [skills, setSkills] = useState<PeopleSkill[]>([]);
    const [categories, setCategories] = useState<SkillCategory[]>([]);
    const [isSkillsModalOpen, setSkillsModalOpen] = useState(false);
    const [editingSkill, setEditingSkill] = useState<PeopleSkill | null>(null);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [skillToDelete, setSkillToDelete] = useState<{ id: string, name: string } | null>(null);
    const [sortBy, setSortBy] = useState<SortMode>("level");

    useEffect(() => {
        if (person.id && !isSystem) {
            fetchInitialData();
        }
    }, [person.id, isSystem]);

    const fetchInitialData = async () => {
        const [userSkills, catLib] = await Promise.all([
            fetchPeopleSkills(person.id),
            fetchSkillCategories()
        ]);
        setSkills(userSkills);
        setCategories(catLib);
    };

    const sortedSkills = useMemo(() => {
        return [...skills].sort((a, b) => {
            if (sortBy === "name") {
                return a.skill_name.localeCompare(b.skill_name);
            }
            if (sortBy === "level") {
                return parseInt(b.skill_level) - parseInt(a.skill_level);
            }
            if (sortBy === "category") {
                const catA = categories.find(c => c.id === a.category_id)?.name || "";
                const catB = categories.find(c => c.id === b.category_id)?.name || "";
                if (catA !== catB) return catA.localeCompare(catB);
                return a.skill_name.localeCompare(b.skill_name);
            }
            return 0;
        });
    }, [skills, sortBy, categories]);

    const handleAddSkill = () => {
        setEditingSkill(null);
        if (isMe) {
            setSkillsModalOpen(true);
        } else {
            setShowConfirmation(true);
        }
    };

    const handleEditSkill = (skill: PeopleSkill) => {
        if (isMe) {
            setEditingSkill(skill);
            setSkillsModalOpen(true);
        } else {
            setEditingSkill(skill);
            setShowConfirmation(true);
        }
    };

    const handleConfirmEdit = () => {
        setShowConfirmation(false);
        setSkillsModalOpen(true);
    };

    const handleDeleteClick = (id: string, name: string) => {
        setSkillToDelete({ id, name });
    };

    const confirmDelete = async () => {
        if (!skillToDelete) return;
        const success = await deletePeopleSkill(skillToDelete.id);
        if (success) {
            toast.success(`${skillToDelete.name} removed`);
            setSkillToDelete(null);
            fetchInitialData();
        }
    };

    if (isSystem) {
        return (
            <div className="p-8 text-center text-neutral-500 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
                <Brain className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                <h3 className="font-medium text-neutral-900">Skills Disabled</h3>
                <p className="text-sm mt-1">System accounts do not have skills.</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm relative overflow-hidden">
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-bl-full -z-0 opacity-50" />

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-amber-500" />
                            Skills & Capabilities
                        </h3>
                        <p className="text-sm text-neutral-500 mt-1">
                            Verified technical and professional skills tied to your role.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex bg-neutral-50 p-1 rounded-xl border border-neutral-100">
                            {[
                                { id: "level", label: "Level" },
                                { id: "name", label: "A-Z" },
                                { id: "category", label: "Category" }
                            ].map((mode) => (
                                <button
                                    key={mode.id}
                                    onClick={() => setSortBy(mode.id as SortMode)}
                                    className={clsx(
                                        "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                        sortBy === mode.id
                                            ? "bg-white text-blue-600 shadow-sm"
                                            : "text-neutral-400 hover:text-neutral-600"
                                    )}
                                >
                                    {mode.label}
                                </button>
                            ))}
                        </div>
                        <Button
                            onClick={handleAddSkill}
                            className="bg-blue-600 hover:bg-blue-700 text-white border-none rounded-xl h-9 px-4 text-xs font-bold shadow-sm active:scale-95 transition-all"
                        >
                            + Add Skill
                        </Button>
                    </div>
                </div>

                {skills.length === 0 ? (
                    <div className="text-center py-12 rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50">
                        <Star className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                        <p className="text-neutral-900 font-medium">No skills listed yet</p>
                        <p className="text-sm text-neutral-500 mb-4">Add skills to complete your profile.</p>
                        <Button variant="outline" size="sm" onClick={handleAddSkill}>Add First Skill</Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sortedSkills.map((skill) => {
                            const category = categories.find(c => c.id === skill.category_id);
                            const categoryName = category?.name || "General";
                            const color = CATEGORY_COLORS[categoryName.toUpperCase()] || CATEGORY_COLORS["GENERAL"];

                            return (
                                <div
                                    key={skill.id}
                                    onClick={() => handleEditSkill(skill)}
                                    className={clsx(
                                        "group p-4 rounded-2xl border transition-all relative cursor-pointer active:scale-[0.98] hover:shadow-lg",
                                        color.bg,
                                        color.border,
                                        "hover:border-opacity-100"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-black text-neutral-900 truncate pr-2 text-sm uppercase tracking-tight">{skill.skill_name}</div>
                                            <div className={clsx("text-[10px] font-bold uppercase tracking-widest mt-0.5", color.text)}>
                                                {categoryName}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className={clsx(
                                                "w-7 h-7 rounded-lg border flex items-center justify-center text-[11px] font-black shadow-sm",
                                                color.accent,
                                                color.text,
                                                color.border
                                            )}>
                                                {skill.skill_level}
                                            </div>
                                            {isMe && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteClick(skill.id, skill.skill_name);
                                                    }}
                                                    className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <SkillLevelBar level={skill.skill_level} colorClass={color.bar} />
                                    <div className="mt-3 flex justify-between items-center text-[9px] text-neutral-400 uppercase tracking-widest font-black">
                                        <span>Proficiency</span>
                                        <span>{skill.skill_level}/10</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <SkillsManagerModal
                isOpen={isSkillsModalOpen}
                onClose={() => setSkillsModalOpen(false)}
                userId={person.id}
                onUpdate={fetchInitialData}
                initialSkill={editingSkill}
            />

            <DeleteSkillConfirmationModal
                isOpen={!!skillToDelete}
                onClose={() => setSkillToDelete(null)}
                onConfirm={confirmDelete}
                skillName={skillToDelete?.name || ""}
            />

            <EditConfirmationModal
                isOpen={showConfirmation}
                onClose={() => setShowConfirmation(false)}
                onConfirm={handleConfirmEdit}
            />
        </div>
    );
}

function SkillLevelBar({ level, colorClass }: { level: string, colorClass: string }) {
    const numericLevel = parseInt(level) || 0;
    const percentage = `${(numericLevel / 10) * 100}%`;

    return (
        <div className="h-1.5 w-full bg-white/50 border border-black/5 rounded-full overflow-hidden">
            <div
                className={clsx("h-full rounded-full transition-all duration-700 ease-out", colorClass)}
                style={{ width: percentage }}
            />
        </div>
    );
}
