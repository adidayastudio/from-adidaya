"use client";

import { useEffect, useState } from "react";
import { SkillCategory } from "./skills-types";
import { Edit, Archive, Plus, AlertTriangle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/shared/ui/primitives/button/button";
import CategoryFormModal from "./CategoryFormModal";

export default function SkillCategoriesTable() {
    const supabase = createClient();
    const [categories, setCategories] = useState<SkillCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<SkillCategory | undefined>(undefined);

    // Archive Modal
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
    const [categoryToArchive, setCategoryToArchive] = useState<SkillCategory | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from("skill_categories")
            .select("*, skill_library(count)")
            .order("name");

        if (error) {
            console.error("Failed to load categories", error);
        } else {
            const mapped = data.map((d: any) => ({
                ...d,
                skill_count: d.skill_library?.[0]?.count || 0
            }));
            setCategories(mapped);
        }
        setIsLoading(false);
    };

    const handleEdit = (cat: SkillCategory) => {
        setEditingCategory(cat);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditingCategory(undefined);
        setIsModalOpen(true);
    };

    const handleArchiveClick = (cat: SkillCategory) => {
        setCategoryToArchive(cat);
        setIsArchiveModalOpen(true);
    };

    const confirmArchive = async () => {
        if (!categoryToArchive) return;

        try {
            const { error } = await supabase
                .from("skill_categories")
                .update({ status: 'archived' })
                .eq("id", categoryToArchive.id);

            if (error) throw error;
            loadData();
        } catch (err: any) {
            console.error(err);
            alert("Failed to archive");
        } finally {
            setIsArchiveModalOpen(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button onClick={handleAdd} icon={<Plus className="w-4 h-4" />}>
                    Add Category
                </Button>
            </div>

            <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                            <th className="px-4 py-3 font-semibold text-neutral-700">Category Name</th>
                            <th className="px-4 py-3 font-semibold text-neutral-700">Description</th>
                            <th className="px-4 py-3 font-semibold text-neutral-700">Status</th>
                            <th className="px-4 py-3 font-semibold text-neutral-700 text-right">Skills</th>
                            <th className="px-4 py-3 font-semibold text-neutral-700 w-24"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {isLoading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-neutral-500">Loading...</td></tr>
                        ) : categories.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-neutral-500">No categories found</td></tr>
                        ) : (
                            categories.map((cat) => (
                                <tr key={cat.id} className="hover:bg-neutral-50/50 transition-colors group">
                                    <td className="px-4 py-3 font-medium text-neutral-900">{cat.name}</td>
                                    <td className="px-4 py-3 text-neutral-500 max-w-xs truncate" title={cat.description || ""}>{cat.description}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${cat.status === "active"
                                            ? "bg-green-50 text-green-700 border border-green-100"
                                            : "bg-neutral-100 text-neutral-600 border border-neutral-200"
                                            }`}>
                                            {cat.status === "active" ? "Active" : "Archived"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-neutral-500">
                                        {cat.skill_count}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEdit(cat)}
                                                className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Edit"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleArchiveClick(cat)}
                                                className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Archive"
                                                disabled={cat.status === 'archived'}
                                            >
                                                <Archive className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <CategoryFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={loadData}
                category={editingCategory}
            />

            {/* Archive Confirmation (Manual Modal) */}
            {isArchiveModalOpen && categoryToArchive && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
                    <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
                        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-neutral-900">Archive Category?</h3>
                            <p className="text-sm text-neutral-600 mt-2">
                                Are you sure you want to archive <strong>{categoryToArchive.name}</strong>?
                                <br />
                                Archiving will hide it from active selections.
                            </p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button variant="secondary" className="flex-1 rounded-xl" onClick={() => setIsArchiveModalOpen(false)}>Cancel</Button>
                            <Button variant="danger" className="flex-1 rounded-xl" onClick={confirmArchive}>Archive</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
