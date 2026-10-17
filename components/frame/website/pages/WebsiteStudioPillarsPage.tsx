"use client";

import { useState, forwardRef, useImperativeHandle } from "react";
import { Reorder, AnimatePresence } from "framer-motion";
import { Upload, Trash2, GripVertical, AlertCircle, X } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { toast } from "react-hot-toast";
import clsx from "clsx";

type Pillar = {
    id: string;
    title: string;
    description: string;
    icon_url: string | null;
    image_file?: File | null;
};

const DEFAULT_PILLARS: Pillar[] = [
    {
        id: "1",
        title: "Context-Led",
        description: "Every design begins by honoring the land and the stories already living there.",
        icon_url: null
    },
    {
        id: "2",
        title: "Experience First",
        description: "Spaces are shaped to be felt—through light, rhythm, sound, and human presence.",
        icon_url: null
    },
    {
        id: "3",
        title: "Integrated Systems",
        description: "Architecture, structure, and technology move as one cohesive system.",
        icon_url: null
    },
    {
        id: "4",
        title: "Adaptive Future",
        description: "Designs that evolve gracefully as needs shift and time unfolds.",
        icon_url: null
    },
    {
        id: "5",
        title: "Enduring Values",
        description: "Guided by durability, efficiency, and a responsibility toward the environment.",
        icon_url: null
    }
];

export type StudioPillarsRef = {
    addPillar: () => void;
};

const WebsiteStudioPillarsPage = forwardRef<StudioPillarsRef>((props, ref) => {
    const [pillars, setPillars] = useState<Pillar[]>(DEFAULT_PILLARS);
    const [intro, setIntro] = useState("At Adidaya, our work is anchored in principles that frame how spaces take shape, how systems connect, and how architecture becomes an experience to feel.");
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const handleAddPillar = () => {
        const newPillar: Pillar = {
            id: `temp-${Date.now()}`,
            title: "",
            description: "",
            icon_url: null
        };
        // Append to the end
        setPillars((prev) => [...prev, newPillar]);
        toast.success("New pillar added");

        // Scroll to bottom after render
        setTimeout(() => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }, 100);
    };

    useImperativeHandle(ref, () => ({
        addPillar: handleAddPillar
    }));

    const confirmDelete = () => {
        if (deleteId) {
            setPillars(pillars.filter(p => p.id !== deleteId));
            setDeleteId(null);
            toast.success("Pillar removed");
        }
    };

    const handleUpdate = (id: string, field: keyof Pillar, value: any) => {
        setPillars(pillars.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const handleFile = (id: string, file: File) => {
        const url = URL.createObjectURL(file);
        setPillars(pillars.map(p => p.id === id ? { ...p, icon_url: url, image_file: file } : p));
    };

    return (
        <div className="max-w-4xl space-y-8 relative pb-20">
            {/* INTRO SECTION - CLEANER, NO BOX */}
            <div className="space-y-3">
                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Introduction</label>
                <textarea
                    className="w-full min-h-[80px] p-0 bg-transparent border-0 border-b border-neutral-200 text-sm focus:outline-none focus:border-red-500 focus:ring-0 resize-y placeholder:text-neutral-300 transition-colors"
                    value={intro}
                    onChange={(e) => setIntro(e.target.value)}
                    placeholder="Write a brief introduction to your design principles..."
                />
            </div>

            {/* PILLARS LIST */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Core Pillars</label>
                    <button
                        onClick={handleAddPillar}
                        className="text-[10px] font-bold text-red-600 uppercase tracking-wider hover:text-red-700 transition-colors flex items-center gap-1"
                    >
                        <PlusIcon className="w-3 h-3" />
                        Add Pillar
                    </button>
                </div>

                <Reorder.Group axis="y" values={pillars} onReorder={setPillars} className="space-y-3">
                    <AnimatePresence initial={false}>
                        {pillars.map((pillar) => (
                            <Reorder.Item
                                key={pillar.id}
                                value={pillar}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white border border-neutral-200 rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] group flex gap-5 items-start transition-shadow hover:shadow-md hover:border-neutral-300"
                            >
                                {/* DRAG HANDLE */}
                                <div className="mt-2 cursor-grab active:cursor-grabbing text-neutral-300 hover:text-neutral-500 transition-colors">
                                    <GripVertical className="w-5 h-5" />
                                </div>

                                {/* ICON */}
                                <div className="shrink-0 pt-0.5">
                                    <div className="w-12 h-12 rounded-lg bg-neutral-50 border border-neutral-100 flex items-center justify-center relative overflow-hidden group/icon cursor-pointer transition-colors hover:border-neutral-300">
                                        {pillar.icon_url ? (
                                            <img src={pillar.icon_url} alt="icon" className="w-6 h-6 object-contain" />
                                        ) : (
                                            <Upload className="w-5 h-5 text-neutral-300" />
                                        )}

                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={(e) => e.target.files?.[0] && handleFile(pillar.id, e.target.files[0])}
                                        />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/icon:opacity-100 transition-opacity backdrop-blur-[1px]">
                                            <Upload className="w-5 h-5 text-white" />
                                        </div>
                                    </div>
                                </div>

                                {/* CONTENT STACK */}
                                <div className="flex-grow flex flex-col gap-1.5">
                                    <input
                                        value={pillar.title}
                                        onChange={(e) => handleUpdate(pillar.id, "title", e.target.value)}
                                        className="font-bold text-neutral-900 bg-transparent border-none p-0 focus:ring-0 focus:outline-none text-base w-full placeholder:text-neutral-300 placeholder:font-normal h-auto leading-tight transition-colors"
                                        placeholder="Pillar Title"
                                    />
                                    <textarea
                                        value={pillar.description}
                                        onChange={(e) => handleUpdate(pillar.id, "description", e.target.value)}
                                        className="w-full text-sm text-neutral-500 resize-none bg-transparent border-none p-0 focus:ring-0 focus:outline-none h-auto placeholder:text-neutral-300 leading-relaxed transition-colors"
                                        rows={2} // Initial height, but allows standard textarea behavior
                                        placeholder="Brief description of this principle..."
                                    />
                                </div>

                                {/* DELETE ACTION */}
                                <button
                                    onClick={() => setDeleteId(pillar.id)}
                                    className="p-2 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    title="Remove Pillar"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </Reorder.Item>
                        ))}
                    </AnimatePresence>
                </Reorder.Group>
            </div>

            {/* CUSTOM DELETE MODAL */}
            {deleteId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-neutral-900/20 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setDeleteId(null)}
                    />

                    {/* Modal Content */}
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-6 animate-in zoom-in-95 duration-200 border border-neutral-100">
                        <div className="flex flex-col items-center text-center space-y-3">
                            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-1">
                                <AlertCircle className="w-6 h-6 text-red-500" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-bold text-lg text-neutral-900">Delete Pillar?</h3>
                                <p className="text-sm text-neutral-500 px-4">This will permanently remove this pillar from your studio profile.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setDeleteId(null)}
                                className="px-4 py-2.5 rounded-lg border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2.5 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 shadow-sm shadow-red-200 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

// Helper for Plus Icon
function PlusIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
        </svg>
    );
}

WebsiteStudioPillarsPage.displayName = "WebsiteStudioPillarsPage";

export default WebsiteStudioPillarsPage;
