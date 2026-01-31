"use client";

import { useEffect, useState } from "react";
import { Skill, SkillCategory } from "./skills-types";
import { Edit, Archive, Plus, Search, AlertTriangle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import SkillFormModal from "./SkillFormModal";

export default function SkillLibraryTable() {
    const supabase = createClient();
    const [skills, setSkills] = useState<Skill[]>([]);
    const [categories, setCategories] = useState<SkillCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSkill, setEditingSkill] = useState<Skill | undefined>(undefined);

    // Archive Modal
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
    const [skillToArchive, setSkillToArchive] = useState<Skill | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const { data: catData } = await supabase.from("skill_categories").select("*").order("name");
        if (catData) setCategories(catData as any);

        const { data, error } = await supabase
            .from("skill_library")
            .select(`
                *,
                category:skill_categories(id, name),
                skill_related_departments(department_name),
                skill_related_positions(position_name)
            `)
            .order("name");

        if (error) {
            console.error("Failed to load skills", error);
        } else {
            const mapped = data.map((s: any) => ({
                ...s,
                category_name: s.category?.name,
                related_departments: s.skill_related_departments?.map((d: any) => d.department_name) || [],
                related_positions: s.skill_related_positions?.map((p: any) => p.position_name) || []
            }));
            setSkills(mapped);
        }
        setIsLoading(false);
    };

    const handleEdit = (skill: Skill) => {
        setEditingSkill(skill);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditingSkill(undefined);
        setIsModalOpen(true);
    };

    const handleArchiveClick = (skill: Skill) => {
        setSkillToArchive(skill);
        setIsArchiveModalOpen(true);
    };

    const confirmArchive = async () => {
        if (!skillToArchive) return;
        try {
            const { error } = await supabase
                .from("skill_library")
                .update({ status: 'archived' })
                .eq("id", skillToArchive.id);

            if (error) throw error;
            loadData();
        } catch (err: any) {
            console.error(err);
            alert("Failed to archive");
        } finally {
            setIsArchiveModalOpen(false);
        }
    };

    // Filter by search
    const filteredSkills = skills.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.category?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Input
                        placeholder="Search skills..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        iconLeft={<Search className="w-4 h-4" />}
                    />
                </div>
                <Button onClick={handleAdd} icon={<Plus className="w-4 h-4" />}>
                    Add Skill
                </Button>
            </div>

            <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                            <th className="px-4 py-3 font-semibold text-neutral-700">Skill Name</th>
                            <th className="px-4 py-3 font-semibold text-neutral-700">Category</th>
                            <th className="px-4 py-3 font-semibold text-neutral-700">Related To</th>
                            <th className="px-4 py-3 font-semibold text-neutral-700">Status</th>
                            <th className="px-4 py-3 font-semibold text-neutral-700 w-24"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {isLoading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-neutral-500">Loading...</td></tr>
                        ) : filteredSkills.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-neutral-500">No skills found</td></tr>
                        ) : (
                            filteredSkills.map((skill: any) => (
                                <tr key={skill.id} className="hover:bg-neutral-50/50 transition-colors group">
                                    <td className="px-4 py-3 font-medium text-neutral-900">{skill.name}</td>
                                    <td className="px-4 py-3 text-neutral-600">
                                        <span className="bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded text-xs">
                                            {skill.category_name}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-neutral-500 text-xs max-w-xs">
                                        <div className="flex flex-wrap gap-1">
                                            {skill.related_departments?.slice(0, 2).map((d: string) => (
                                                <span key={d} className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded opacity-80">{d}</span>
                                            ))}
                                            {skill.related_positions?.slice(0, 2).map((p: string) => (
                                                <span key={p} className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded opacity-80">{p}</span>
                                            ))}
                                            {(skill.related_departments.length + skill.related_positions.length) > 4 && (
                                                <span className="text-neutral-400">+{skill.related_departments.length + skill.related_positions.length - 4} more</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${skill.status === "active" ? "bg-green-50 text-green-700 border border-green-100" :
                                                skill.status === "draft" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                                                    "bg-neutral-100 text-neutral-600 border border-neutral-200"
                                            }`}>
                                            {skill.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEdit(skill)}
                                                className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Edit"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleArchiveClick(skill)}
                                                className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Archive"
                                                disabled={skill.status === 'archived'}
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

            <SkillFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={loadData}
                skill={editingSkill}
                categories={categories}
            />

            {/* Archive Confirmation */}
            {isArchiveModalOpen && skillToArchive && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
                    <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
                        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-neutral-900">Archive Skill?</h3>
                            <p className="text-sm text-neutral-600 mt-2">
                                Are you sure you want to archive <strong>{skillToArchive.name}</strong>?
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
