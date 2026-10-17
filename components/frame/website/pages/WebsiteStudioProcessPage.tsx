"use client";

import { useState } from "react";
import { Reorder, AnimatePresence } from "framer-motion";
import { GripVertical, Trash2, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast";

type ProcessStep = {
    id: string;
    step: string;
    title: string;
    subtitle: string;
    points: string[];
};

const DEFAULT_STEPS: ProcessStep[] = [
    {
        id: "1",
        step: "01",
        title: "Discovery",
        subtitle: "Uncovering Context and Intention",
        points: [
            "Reading context, site, and human patterns",
            "Listening to the project’s vision and needs",
            "Finding an honest starting point"
        ]
    },
    {
        id: "2",
        step: "02",
        title: "Insight Forming",
        subtitle: "Shaping Meaning Into Direction",
        points: [
            "Turning findings into a design narrative",
            "Weaving intuition, ideas, and function",
            "Defining the guiding thread"
        ]
    },
    {
        id: "3",
        step: "03",
        title: "Design Crafting",
        subtitle: "Transforming Ideas Into Space",
        points: [
            "Shaping spaces, flows, and atmospheres",
            "Refining details, materials, light, and systems",
            "Aligning architecture with technical and operational needs"
        ]
    },
    {
        id: "4",
        step: "04",
        title: "Documentation",
        subtitle: "Turning Design Into Clarity",
        points: [
            "Translating design into clear drawings and specifications",
            "Preparing documents for coordination and execution",
            "Ensuring the original intent carries into construction"
        ]
    },
    {
        id: "5",
        step: "05",
        title: "Supervision",
        subtitle: "Guiding the Design to Life",
        points: [
            "Guiding implementation on site",
            "Upholding quality, detail, and design integrity",
            "Supporting the project until the space comes alive"
        ]
    }
];

export default function WebsiteStudioProcessPage() {
    const [steps, setSteps] = useState<ProcessStep[]>(DEFAULT_STEPS);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const handleAddStep = () => {
        const nextNum = steps.length + 1;
        const newStep: ProcessStep = {
            id: `temp-${Date.now()}`,
            step: nextNum.toString().padStart(2, '0'),
            title: "",
            subtitle: "",
            points: [""]
        };
        setSteps((prev) => [...prev, newStep]);
        toast.success("New step added");

        // Scroll to bottom
        setTimeout(() => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }, 100);
    };

    const confirmDelete = () => {
        if (deleteId) {
            setSteps(steps.filter(s => s.id !== deleteId));
            setDeleteId(null);
            toast.success("Step removed");
        }
    };

    const handleUpdate = (id: string, field: keyof ProcessStep, value: any) => {
        setSteps(steps.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const handlePointsUpdate = (id: string, text: string) => {
        // Split text by newline to create array
        const pointsArray = text.split('\n');
        setSteps(steps.map(s => s.id === id ? { ...s, points: pointsArray } : s));
    };

    return (
        <div className="max-w-4xl space-y-8 pb-20 relative">
            {/* STEPS LIST */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Work Process</label>
                    <button
                        onClick={handleAddStep}
                        className="text-[10px] font-bold text-red-600 uppercase tracking-wider hover:text-red-700 transition-colors flex items-center gap-1"
                    >
                        <PlusIcon className="w-3 h-3" />
                        Add Step
                    </button>
                </div>

                <Reorder.Group axis="y" values={steps} onReorder={setSteps} className="space-y-3">
                    <AnimatePresence initial={false}>
                        {steps.map((step, index) => (
                            <Reorder.Item
                                key={step.id}
                                value={step}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white border border-neutral-200 rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] group flex gap-5 items-start transition-shadow hover:shadow-md hover:border-neutral-300"
                            >
                                {/* DRAG HANDLE */}
                                <div className="mt-2 cursor-grab active:cursor-grabbing text-neutral-300 hover:text-neutral-500 transition-colors">
                                    <GripVertical className="w-5 h-5" />
                                </div>

                                {/* STEP NUMBER */}
                                <div className="shrink-0 pt-0.5">
                                    <div className="w-12 h-12 rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center font-bold text-neutral-400 relative overflow-hidden group/icon cursor-default transition-colors hover:border-neutral-300 hover:text-neutral-600 hover:bg-white">
                                        {step.step}
                                    </div>
                                </div>

                                {/* CONTENT STACK */}
                                <div className="flex-grow flex flex-col gap-2">
                                    {/* Title */}
                                    <input
                                        value={step.title}
                                        onChange={(e) => handleUpdate(step.id, "title", e.target.value)}
                                        className="font-bold text-neutral-900 bg-transparent border-none p-0 focus:ring-0 focus:outline-none text-base w-full placeholder:text-neutral-300 placeholder:font-normal h-auto leading-tight transition-colors"
                                        placeholder="Step Title"
                                    />

                                    {/* Subtitle */}
                                    <input
                                        value={step.subtitle}
                                        onChange={(e) => handleUpdate(step.id, "subtitle", e.target.value)}
                                        className="font-medium text-neutral-600 bg-transparent border-none p-0 focus:ring-0 focus:outline-none text-sm w-full placeholder:text-neutral-300 placeholder:font-normal h-auto leading-tight transition-colors italic"
                                        placeholder="Step Subtitle"
                                    />

                                    {/* Points (Textarea) */}
                                    <textarea
                                        value={(step.points || []).join('\n')}
                                        onChange={(e) => handlePointsUpdate(step.id, e.target.value)}
                                        className="w-full text-sm text-neutral-500 resize-none bg-transparent border-none p-0 focus:ring-0 focus:outline-none h-auto placeholder:text-neutral-300 leading-relaxed transition-colors mt-1"
                                        rows={Math.max(3, (step.points || []).length)}
                                        placeholder="• Point 1&#10;• Point 2&#10;• Point 3"
                                    />
                                </div>

                                {/* DELETE ACTION */}
                                <button
                                    onClick={() => setDeleteId(step.id)}
                                    className="p-2 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    title="Remove Step"
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
                                <h3 className="font-bold text-lg text-neutral-900">Delete Step?</h3>
                                <p className="text-sm text-neutral-500 px-4">This will permanently remove this step from the process.</p>
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
}

// Helper for Plus Icon
function PlusIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
        </svg>
    );
}
