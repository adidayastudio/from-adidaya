"use client";

import { useState, forwardRef, useImperativeHandle } from "react";
import { Reorder, AnimatePresence } from "framer-motion";
import { GripVertical, Trash2, Plus, Search, Check, X, Mail, Linkedin, Instagram, User } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { toast } from "react-hot-toast";
import clsx from "clsx";

// TYPES
type SocialLinks = {
    email?: string;
    instagram?: string;
    linkedin?: string;
};

type Person = {
    id: string;
    name: string;
    role: string;
    image_url: string | null;
    socials: SocialLinks;
};

// MOCK "FEEL" DATA (Employee Database)
const FEEL_EMPLOYEES: Person[] = [
    {
        id: "emp-1",
        name: "John Doe",
        role: "Principal Architect",
        image_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200",
        socials: { email: "john@adidayastudio.id", instagram: "@johndoe", linkedin: "john-doe" }
    },
    {
        id: "emp-2",
        name: "Jane Smith",
        role: "Senior Interior Designer",
        image_url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200",
        socials: { email: "jane@adidayastudio.id", instagram: "@janesmith.design", linkedin: "jane-smith" }
    },
    {
        id: "emp-3",
        name: "Robert Fox",
        role: "Project Manager",
        image_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
        socials: { email: "robert@adidayastudio.id", linkedin: "robert-fox" }
    },
    {
        id: "emp-4",
        name: "Emily Davis",
        role: "3D Visualizer",
        image_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
        socials: { email: "emily@adidayastudio.id", instagram: "@emily.vis" }
    },
    {
        id: "emp-5",
        name: "Michael Brown",
        role: "Junior Architect",
        image_url: null,
        socials: { email: "michael@adidayastudio.id" }
    }
];

export type StudioPeopleRef = {
    openAddModal: () => void;
};

const WebsiteStudioPeoplePage = forwardRef<StudioPeopleRef>((props, ref) => {
    // STATE
    const [people, setPeople] = useState<Person[]>([FEEL_EMPLOYEES[0], FEEL_EMPLOYEES[1]]); // Initial website list
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState("");

    // EXPOSE MODAL TRIGGER
    useImperativeHandle(ref, () => ({
        openAddModal: () => setIsAddModalOpen(true)
    }));

    // HANDLERS
    const handleUpdate = (id: string, field: keyof Person, value: any) => {
        setPeople(people.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const handleSocialUpdate = (id: string, key: keyof SocialLinks, value: string) => {
        setPeople(people.map(p =>
            p.id === id ? { ...p, socials: { ...p.socials, [key]: value } } : p
        ));
    };

    const handleDelete = (id: string) => {
        if (confirm("Remove this person from the website display?")) {
            setPeople(people.filter(p => p.id !== id));
            toast.success("Removed from website");
        }
    };

    // MODAL LOGIC
    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleBulkAdd = () => {
        const newPeople = FEEL_EMPLOYEES.filter(emp => selectedIds.has(emp.id) && !people.find(p => p.id === emp.id));
        setPeople([...people, ...newPeople]);
        setSelectedIds(new Set());
        setIsAddModalOpen(false);
        toast.success(`Added ${newPeople.length} members`);
    };

    const filteredEmployees = FEEL_EMPLOYEES.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-5xl space-y-6 pb-20 relative">
            {/* REORDERABLE LIST */}
            <Reorder.Group axis="y" values={people} onReorder={setPeople} className="space-y-3">
                <AnimatePresence initial={false}>
                    {people.map((person) => (
                        <Reorder.Item
                            key={person.id}
                            value={person}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm flex items-center gap-4 group"
                        >
                            {/* DRAG */}
                            <div className="cursor-grab active:cursor-grabbing text-neutral-300 hover:text-neutral-500 p-1">
                                <GripVertical className="w-5 h-5" />
                            </div>

                            {/* AVATAR */}
                            <div className="shrink-0 w-12 h-12 rounded-full bg-neutral-100 overflow-hidden border border-neutral-100 relative group/avatar">
                                {person.image_url ? (
                                    <img src={person.image_url} alt={person.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-neutral-400">
                                        <User className="w-6 h-6" />
                                    </div>
                                )}
                            </div>

                            {/* NAME & ROLE */}
                            <div className="flex-1 min-w-[200px] space-y-1">
                                <input
                                    value={person.name}
                                    onChange={(e) => handleUpdate(person.id, "name", e.target.value)}
                                    className="font-bold text-neutral-900 bg-transparent border-none p-0 focus:ring-0 focus:outline-none w-full placeholder:text-neutral-300"
                                    placeholder="Name"
                                />
                                <input
                                    value={person.role}
                                    onChange={(e) => handleUpdate(person.id, "role", e.target.value)}
                                    className="text-sm text-neutral-500 bg-transparent border-none p-0 focus:ring-0 focus:outline-none w-full placeholder:text-neutral-300"
                                    placeholder="Role / Position"
                                />
                            </div>

                            {/* SOCIALS - Vertical Stack for cleaner look */}
                            <div className="flex-grow max-w-sm space-y-2">
                                <div className="flex items-center gap-2">
                                    <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                                    <input
                                        value={person.socials.email || ""}
                                        onChange={(e) => handleSocialUpdate(person.id, "email", e.target.value)}
                                        className="text-xs text-neutral-600 bg-transparent border-none p-0 focus:ring-0 focus:outline-none w-full placeholder:text-neutral-300"
                                        placeholder="Email Address"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Instagram className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                                    <input
                                        value={person.socials.instagram || ""}
                                        onChange={(e) => handleSocialUpdate(person.id, "instagram", e.target.value)}
                                        className="text-xs text-neutral-600 bg-transparent border-none p-0 focus:ring-0 focus:outline-none w-full placeholder:text-neutral-300"
                                        placeholder="Instagram Handle"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Linkedin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                                    <input
                                        value={person.socials.linkedin || ""}
                                        onChange={(e) => handleSocialUpdate(person.id, "linkedin", e.target.value)}
                                        className="text-xs text-neutral-600 bg-transparent border-none p-0 focus:ring-0 focus:outline-none w-full placeholder:text-neutral-300"
                                        placeholder="LinkedIn URL/Handle"
                                    />
                                </div>
                            </div>

                            {/* DELETE */}
                            <button
                                onClick={() => handleDelete(person.id)}
                                className="p-2 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </Reorder.Item>
                    ))}
                </AnimatePresence>
            </Reorder.Group>

            {/* ADD MEMBER MODAL */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-neutral-900/20 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)} />
                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
                        {/* HEADER */}
                        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                            <div>
                                <h3 className="font-bold text-neutral-900">Add from Team</h3>
                                <p className="text-xs text-neutral-500">Select people from the employee database.</p>
                            </div>
                            <Button variant="secondary" size="sm" icon={<X className="w-4 h-4" />} onClick={() => setIsAddModalOpen(false)}>
                                Close
                            </Button>
                        </div>

                        {/* SEARCH */}
                        <div className="p-4 border-b border-neutral-100">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                <input
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                                    placeholder="Search by name or role..."
                                />
                            </div>
                        </div>

                        {/* LIST */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {filteredEmployees.map(emp => {
                                const isAdded = people.some(p => p.id === emp.id);
                                const isSelected = selectedIds.has(emp.id);
                                return (
                                    <div
                                        key={emp.id}
                                        onClick={() => !isAdded && toggleSelection(emp.id)}
                                        className={clsx(
                                            "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                                            isAdded ? "opacity-50 bg-neutral-50 border-transparent cursor-default" :
                                                isSelected ? "bg-blue-50 border-blue-200" : "hover:bg-neutral-50 border-transparent"
                                        )}
                                    >
                                        <div className={clsx(
                                            "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                            isAdded ? "bg-neutral-200 border-neutral-300" :
                                                isSelected ? "bg-blue-500 border-blue-500" : "border-neutral-300 bg-white"
                                        )}>
                                            {(isSelected || isAdded) && <Check className="w-3 h-3 text-white" />}
                                        </div>

                                        <div className="w-10 h-10 rounded-full bg-neutral-100 overflow-hidden shrink-0">
                                            {emp.image_url ? (
                                                <img src={emp.image_url} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-neutral-400"><User className="w-5 h-5" /></div>
                                            )}
                                        </div>

                                        <div className="flex-grow">
                                            <h4 className="font-medium text-neutral-900 text-sm">{emp.name}</h4>
                                            <p className="text-xs text-neutral-500">{emp.role}</p>
                                        </div>

                                        {isAdded && <span className="text-xs text-neutral-400">Added</span>}
                                    </div>
                                );
                            })}
                        </div>

                        {/* FOOTER */}
                        <div className="p-4 border-t border-neutral-100 flex justify-between items-center bg-neutral-50">
                            <span className="text-sm text-neutral-500">
                                {selectedIds.size} selected
                            </span>
                            <Button
                                variant="primary"
                                disabled={selectedIds.size === 0}
                                onClick={handleBulkAdd}
                            >
                                Add Selected ({selectedIds.size})
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

WebsiteStudioPeoplePage.displayName = "WebsiteStudioPeoplePage";

export default WebsiteStudioPeoplePage;
