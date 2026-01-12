"use client";

import { useState } from "react";
import clsx from "clsx";
import { Button } from "@/shared/ui/primitives/button/button";
import { Plus, Edit2, Trash2, GripVertical, FileText, Settings, Eye } from "lucide-react";

interface CultureSetupProps {
    onNavigate: (section: string) => void;
}

const MOCK_CHAPTERS = [
    { id: 1, title: "Chapter 0: Welcome", status: "PUBLISHED", modules: 3 },
    { id: 2, title: "Chapter 1: Adaptation", status: "PUBLISHED", modules: 5 },
    { id: 3, title: "Chapter 2: Contribution", status: "DRAFT", modules: 2 },
    { id: 4, title: "Chapter 3: Ownership", status: "DRAFT", modules: 0 },
];

export function CultureSetup({ onNavigate }: CultureSetupProps) {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-neutral-900">Culture Setup</h2>
                    <p className="text-sm text-neutral-500">Manage chapters, content, and quizzes.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="secondary" icon={<Eye className="w-4 h-4" />}>Preview</Button>
                    <Button variant="primary" icon={<Plus className="w-4 h-4" />}>New Chapter</Button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
                    <h3 className="font-semibold text-neutral-900">Chapters</h3>
                    <span className="text-xs text-neutral-500">Drag to reorder</span>
                </div>
                <div className="divide-y divide-neutral-100">
                    {MOCK_CHAPTERS.map((chapter) => (
                        <div key={chapter.id} className="p-4 flex items-center gap-4 hover:bg-neutral-50 group">
                            <button className="text-neutral-300 hover:text-neutral-500 cursor-grab active:cursor-grabbing">
                                <GripVertical className="w-5 h-5" />
                            </button>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium text-neutral-900">{chapter.title}</h4>
                                    <span className={clsx(
                                        "px-2 py-0.5 rounded text-[10px] font-bold tracking-wider",
                                        chapter.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"
                                    )}>
                                        {chapter.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-neutral-500">
                                    <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {chapter.modules} Modules</span>
                                    <span>•</span>
                                    <span>Last edited 2 days ago</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-2 rounded-lg hover:bg-neutral-200 text-neutral-500" title="Edit Content">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button className="p-2 rounded-lg hover:bg-neutral-200 text-neutral-500" title="Settings">
                                    <Settings className="w-4 h-4" />
                                </button>
                                <button className="p-2 rounded-lg hover:bg-red-50 text-neutral-400 hover:text-red-600" title="Delete">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-8 text-center border-t border-neutral-100 bg-neutral-50/30 border-dashed m-2 rounded-xl">
                    <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-3 text-neutral-400">
                        <Plus className="w-6 h-6" />
                    </div>
                    <p className="text-sm text-neutral-600 font-medium">Add New Chapter</p>
                    <p className="text-xs text-neutral-400 mt-1">Start a new journey phase</p>
                </div>
            </div>
        </div>
    );
}
