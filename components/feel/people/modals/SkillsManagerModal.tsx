"use client";

import { useState, useEffect } from "react";
import { ModalRoot } from "@/shared/ui/modal";
import { Button } from "@/shared/ui/primitives/button/button";
import { Select } from "@/shared/ui/primitives/select/select";
import { SkillLibraryItem, SkillCategory, PeopleSkill } from "@/lib/types/people-types";
import { upsertPeopleSkill, fetchSkillLibrary, fetchSkillCategories, deletePeopleSkill } from "@/lib/api/people";
import { toast } from "react-hot-toast";
import clsx from "clsx";
import * as Dialog from "@radix-ui/react-dialog";
import DeleteSkillConfirmationModal from "./DeleteSkillConfirmationModal";

interface SkillsManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    onUpdate?: () => void;
    initialSkill?: PeopleSkill | null;
}

export default function SkillsManagerModal({ isOpen, onClose, userId, onUpdate, initialSkill }: SkillsManagerModalProps) {
    const [library, setLibrary] = useState<SkillLibraryItem[]>([]);
    const [categories, setCategories] = useState<SkillCategory[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState("");
    const [selectedSkillId, setSelectedSkillId] = useState("");
    const [rating, setRating] = useState("5");
    const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    useEffect(() => {
        if (isOpen && userId) {
            loadInitialData();
        }
    }, [isOpen, userId]);

    useEffect(() => {
        if (isOpen && initialSkill) {
            setSelectedCategoryId(initialSkill.category_id || "");
            setRating(initialSkill.skill_level);
        } else if (isOpen) {
            setSelectedCategoryId("");
            setSelectedSkillId("");
            setRating("5");
        }
    }, [isOpen, initialSkill]);

    const loadInitialData = async () => {
        setLoading(true);
        const [skillLib, catLib] = await Promise.all([
            fetchSkillLibrary(),
            fetchSkillCategories()
        ]);
        setLibrary(skillLib);
        setCategories(catLib);

        if (initialSkill) {
            const skillInLib = skillLib.find(s => s.name === initialSkill.skill_name);
            if (skillInLib) {
                setSelectedSkillId(skillInLib.id);
            }
        }
        setLoading(false);
    };

    const handleAddSkill = async () => {
        const skillItem = library.find(s => s.id === selectedSkillId);
        if (!skillItem) return;

        try {
            setLoading(true);
            const result = await upsertPeopleSkill({
                user_id: userId,
                category_id: selectedCategoryId || undefined,
                skill_name: skillItem.name,
                skill_level: rating
            });

            if (result) {
                toast.success(initialSkill ? `${skillItem.name} updated` : `${skillItem.name} added`);
                onUpdate?.();
                onClose();
            }
        } catch (error) {
            toast.error(initialSkill ? "Failed to update skill" : "Failed to add skill");
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = async () => {
        if (!initialSkill) return;
        try {
            setLoading(true);
            const success = await deletePeopleSkill(initialSkill.id);
            if (success) {
                toast.success(`${initialSkill.skill_name} removed`);
                setDeleteConfirmOpen(false);
                onUpdate?.();
                onClose();
            }
        } catch (error) {
            toast.error("Failed to delete skill");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <ModalRoot open={isOpen} onOpenChange={onClose}>
                <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                    <div className="px-8 pt-8 pb-2">
                        <Dialog.Title asChild>
                            <h2 className="text-2xl font-bold text-neutral-900 leading-tight">
                                {initialSkill ? "Update Proficiency" : "Add New Skill"}
                            </h2>
                        </Dialog.Title>
                    </div>

                    <div className="p-8 space-y-8">
                        <div className="space-y-6">
                            {/* Row 1: Category */}
                            <Select
                                label="SKILL CATEGORY"
                                value={selectedCategoryId}
                                onChange={(v) => {
                                    setSelectedCategoryId(v);
                                    setSelectedSkillId("");
                                }}
                                options={categories.map(c => ({ label: c.name, value: c.id }))}
                                placeholder="Choose category..."
                                className="rounded-2xl h-12"
                                accentColor="blue"
                                searchable
                            />

                            {/* Row 2: Skill */}
                            <Select
                                label="SKILL"
                                value={selectedSkillId}
                                onChange={setSelectedSkillId}
                                options={library
                                    .filter(s => !selectedCategoryId || s.category_id === selectedCategoryId)
                                    .map(s => ({ label: s.name, value: s.id }))}
                                placeholder={selectedCategoryId ? "Select skill..." : "Choose category first"}
                                disabled={!selectedCategoryId}
                                className="rounded-2xl h-12"
                                accentColor="blue"
                                searchable
                            />

                            {/* Row 3: Rating (1-10) - 2 Row Grid for Space */}
                            <div className="space-y-3">
                                <label className="text-xs font-black text-neutral-400 uppercase tracking-widest">
                                    SKILL LEVEL / RATING (1-10)
                                </label>
                                <div className="grid grid-cols-5 gap-2">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                        <button
                                            key={num}
                                            type="button"
                                            onClick={() => setRating(num.toString())}
                                            className={clsx(
                                                "h-10 rounded-xl text-sm font-black transition-all border shadow-sm",
                                                rating === num.toString()
                                                    ? "bg-blue-600 border-blue-600 text-white scale-105 z-10"
                                                    : "bg-white border-neutral-100 text-neutral-400 hover:border-blue-200"
                                            )}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-8 pb-8 flex flex-col gap-4">
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={onClose}
                                className="flex-1 rounded-2xl h-12 font-bold text-neutral-500 border-neutral-200 hover:bg-neutral-50 transition-all"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleAddSkill}
                                disabled={!selectedSkillId || loading}
                                className={clsx(
                                    "flex-1 rounded-2xl h-12 font-bold transition-all shadow-md !border-none",
                                    selectedSkillId
                                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                                        : "bg-neutral-100 text-neutral-300 cursor-not-allowed"
                                )}
                            >
                                {loading ? (initialSkill ? "Saving..." : "Adding...") : (initialSkill ? "Update Level" : "Add Skill")}
                            </Button>
                        </div>

                        {initialSkill && (
                            <button
                                type="button"
                                onClick={() => setDeleteConfirmOpen(true)}
                                className="text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 py-2 rounded-xl transition-all uppercase tracking-widest active:scale-95"
                            >
                                Delete Skill
                            </button>
                        )}
                    </div>
                </div>
            </ModalRoot>

            <DeleteSkillConfirmationModal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                onConfirm={confirmDelete}
                skillName={initialSkill?.skill_name || ""}
            />
        </>
    );
}
