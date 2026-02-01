"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import ProjectsSidebar from "@/components/flow/projects/ProjectsSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { Select } from "@/shared/ui/primitives/select/select";
import { ArrowLeft, Plus, Search, Pencil, Trash2, X, Check, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
    fetchRabPriceTemplates, createRabPriceTemplate, updateRabPriceTemplate, deleteRabPriceTemplate,
    fetchDisciplines, createDiscipline, updateDiscipline, deleteDiscipline,
    fetchClasses, createClass, updateClass, deleteClass,
    RabPriceTemplate, Discipline, ClassTemplate, fetchDefaultWorkspaceId
} from "@/lib/api/templates";
import clsx from "clsx";
import { GlobalLoading } from "@/components/shared/GlobalLoading";

// Fallback if no workspace found
const DEFAULT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";

type TabId = "prices" | "disciplines" | "classes";

const TABS = [
    { id: "prices" as TabId, label: "Price Templates" },
    { id: "disciplines" as TabId, label: "Disciplines" },
    { id: "classes" as TabId, label: "Classes & Multipliers" },
];

function formatCurrency(value: number) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

// ==========================================
// MODALS
// ==========================================

function PriceModal({ isOpen, item, onClose, onSave }: { isOpen: boolean, item: Partial<RabPriceTemplate> | null, onClose: () => void, onSave: (data: any) => void }) {
    const [formData, setFormData] = useState<Partial<RabPriceTemplate>>({});

    useEffect(() => {
        setFormData(item || {
            wbsCode: "", title: "", unit: "m2", unitPrice: 0,
            materialCost: 0, laborCost: 0, equipmentCost: 0, isActive: true
        });
    }, [item, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
                <h2 className="text-lg font-bold mb-4">{item?.id ? "Edit Price" : "Add Price"}</h2>
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="WBS Code" value={formData.wbsCode || ""} onChange={e => setFormData({ ...formData, wbsCode: e.target.value })} placeholder="e.g. S.1.1" />
                        <Input label="Unit" value={formData.unit || ""} onChange={e => setFormData({ ...formData, unit: e.target.value })} placeholder="e.g. m2" />
                    </div>
                    <Input label="Title" value={formData.title || ""} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Item Name" />
                    <Input label="Material Cost" type="number" value={formData.materialCost?.toString() || ""} onChange={e => setFormData({ ...formData, materialCost: parseFloat(e.target.value) || 0 })} />
                    <Input label="Labor Cost" type="number" value={formData.laborCost?.toString() || ""} onChange={e => setFormData({ ...formData, laborCost: parseFloat(e.target.value) || 0 })} />
                    <Input label="Equipment Cost" type="number" value={formData.equipmentCost?.toString() || ""} onChange={e => setFormData({ ...formData, equipmentCost: parseFloat(e.target.value) || 0 })} />
                    <div className="p-3 bg-neutral-50 rounded text-right font-medium">
                        Total: {formatCurrency((formData.materialCost || 0) + (formData.laborCost || 0) + (formData.equipmentCost || 0))}
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => onSave({
                        ...formData,
                        unitPrice: (formData.materialCost || 0) + (formData.laborCost || 0) + (formData.equipmentCost || 0)
                    })} className="bg-brand-red text-white">Save</Button>
                </div>
            </div>
        </div>
    );
}

function DisciplineModal({ isOpen, item, onClose, onSave }: { isOpen: boolean, item: Partial<Discipline> | null, onClose: () => void, onSave: (data: any) => void }) {
    const [formData, setFormData] = useState<Partial<Discipline>>({});

    useEffect(() => {
        setFormData(item || { code: "", nameEn: "", nameId: "", color: "bg-blue-500", sortOrder: 0, isActive: true });
    }, [item, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <h2 className="text-lg font-bold mb-4">{item?.id ? "Edit Discipline" : "Add Discipline"}</h2>
                <div className="space-y-3">
                    <Input label="Code" value={formData.code || ""} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="e.g. S" />
                    <Input label="Name (EN)" value={formData.nameEn || ""} onChange={e => setFormData({ ...formData, nameEn: e.target.value })} placeholder="Structure" />
                    <Input label="Name (ID)" value={formData.nameId || ""} onChange={e => setFormData({ ...formData, nameId: e.target.value })} placeholder="Struktur" />
                    <Input label="Color Class" value={formData.color || ""} onChange={e => setFormData({ ...formData, color: e.target.value })} placeholder="bg-blue-500" />
                    <Input label="Sort Order" type="number" value={formData.sortOrder?.toString() || ""} onChange={e => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => onSave(formData)} className="bg-brand-red text-white">Save</Button>
                </div>
            </div>
        </div>
    );
}

function ClassModal({ isOpen, item, onClose, onSave }: { isOpen: boolean, item: Partial<ClassTemplate> | null, onClose: () => void, onSave: (data: any) => void }) {
    const [formData, setFormData] = useState<Partial<ClassTemplate>>({});

    useEffect(() => {
        setFormData(item || {
            classCode: "", description: "", finishLevel: "Standard", sortOrder: 0, isActive: true,
            costMultiplierS: 1, costMultiplierA: 1, costMultiplierM: 1, costMultiplierI: 1, costMultiplierL: 1
        });
    }, [item, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
                <h2 className="text-lg font-bold mb-4">{item?.id ? "Edit Class" : "Add Class"}</h2>
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <Input label="Class Code" value={formData.classCode || ""} onChange={e => setFormData({ ...formData, classCode: e.target.value })} placeholder="e.g. A" />
                        <Input label="Description" value={formData.description || ""} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Premium Finish" />
                        <Input label="Finish Level" value={formData.finishLevel || ""} onChange={e => setFormData({ ...formData, finishLevel: e.target.value })} placeholder="High End" />
                        <Input label="Sort Order" type="number" value={formData.sortOrder?.toString() || ""} onChange={e => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-neutral-500">Cost Multipliers / m2</h3>
                        <Input label="Structure (S)" type="number" value={formData.costMultiplierS?.toString() || ""} onChange={e => setFormData({ ...formData, costMultiplierS: parseFloat(e.target.value) || 0 })} />
                        <Input label="Architecture (A)" type="number" value={formData.costMultiplierA?.toString() || ""} onChange={e => setFormData({ ...formData, costMultiplierA: parseFloat(e.target.value) || 0 })} />
                        <Input label="MEP (M)" type="number" value={formData.costMultiplierM?.toString() || ""} onChange={e => setFormData({ ...formData, costMultiplierM: parseFloat(e.target.value) || 0 })} />
                        <Input label="Interior (I)" type="number" value={formData.costMultiplierI?.toString() || ""} onChange={e => setFormData({ ...formData, costMultiplierI: parseFloat(e.target.value) || 0 })} />
                        <Input label="Landscape (L)" type="number" value={formData.costMultiplierL?.toString() || ""} onChange={e => setFormData({ ...formData, costMultiplierL: parseFloat(e.target.value) || 0 })} />
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => onSave(formData)} className="bg-brand-red text-white">Save</Button>
                </div>
            </div>
        </div>
    );
}

export default function SettingsRABPage() {
    const [activeTab, setActiveTab] = useState<TabId>("prices");
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [workspaceId, setWorkspaceId] = useState(DEFAULT_WORKSPACE_ID);

    const [prices, setPrices] = useState<RabPriceTemplate[]>([]);
    const [disciplines, setDisciplines] = useState<Discipline[]>([]);
    const [classes, setClasses] = useState<ClassTemplate[]>([]);

    // Modals
    const [modalOpen, setModalOpen] = useState(false);
    const [editItem, setEditItem] = useState<any>(null);

    useEffect(() => {
        loadData();
    }, [activeTab, workspaceId]); // Added workspaceId to dependencies to re-load if it changes

    const loadData = async () => {
        setIsLoading(true);
        try {
            // Get workspace ID first
            let wsId = await fetchDefaultWorkspaceId();
            if (!wsId) wsId = DEFAULT_WORKSPACE_ID;
            setWorkspaceId(wsId); // Update the state

            if (activeTab === "prices") {
                const data = await fetchRabPriceTemplates(wsId);
                setPrices(data);
            } else if (activeTab === "disciplines") {
                const data = await fetchDisciplines(wsId);
                setDisciplines(data);
            } else if (activeTab === "classes") {
                const data = await fetchClasses(wsId);
                setClasses(data);
            }
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (data: any) => {
        try {
            if (activeTab === "prices") {
                if (editItem?.id) await updateRabPriceTemplate(editItem.id, workspaceId, data);
                else await createRabPriceTemplate(workspaceId, data);
            } else if (activeTab === "disciplines") {
                if (editItem?.id) await updateDiscipline(editItem.id, workspaceId, data);
                else await createDiscipline(workspaceId, data);
            } else if (activeTab === "classes") {
                if (editItem?.id) await updateClass(editItem.id, workspaceId, data);
                else await createClass(workspaceId, data);
            }
            setModalOpen(false);
            loadData();
        } catch (error) {
            console.error("Failed to save", error);
            alert("Failed to save item. See console for details.");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this item?")) return;
        try {
            if (activeTab === "prices") await deleteRabPriceTemplate(id, workspaceId);
            else if (activeTab === "disciplines") await deleteDiscipline(id, workspaceId);
            else if (activeTab === "classes") await deleteClass(id, workspaceId);
            loadData();
        } catch (error) {
            console.error("Failed to delete", error);
        }
    };

    const openModal = (item?: any) => {
        setEditItem(item || null);
        setModalOpen(true);
    };

    // Filters
    const filteredPrices = prices.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.wbsCode.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Projects" }, { label: "Settings", href: "/flow/projects/settings" }, { label: "RAB & Master Data" }]} />
            <PageWrapper sidebar={<ProjectsSidebar />}>
                <div className="space-y-6 w-full animate-in fade-in duration-500">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Link href="/flow/projects/settings">
                                <Button variant="secondary" icon={<ArrowLeft className="w-4 h-4" />}>
                                    Back
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold text-neutral-900">RAB & Master Data</h1>
                                <p className="text-sm text-neutral-500 mt-1">Configure unit prices, disciplines, and class multipliers.</p>
                            </div>
                        </div>
                        <Button icon={<Plus className="w-4 h-4" />} onClick={() => openModal()} className="!rounded-full bg-brand-red hover:bg-brand-red-hover text-white">
                            Add Item
                        </Button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 bg-neutral-100 p-1 rounded-lg w-fit">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabId)}
                                className={clsx(
                                    "px-4 py-2 rounded-md text-sm font-medium transition-all",
                                    activeTab === tab.id ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden min-h-[400px]">
                        {isLoading ? (
                            <div className="flex items-center justify-center p-20">
                                <GlobalLoading />
                            </div>
                        ) : (
                            <>
                                {activeTab === "prices" && (
                                    <>
                                        <div className="p-4 border-b border-neutral-100">
                                            <div className="max-w-sm">
                                                <Input placeholder="Search..." iconLeft={<Search className="w-4 h-4" />} value={search} onChange={e => setSearch(e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="divide-y divide-neutral-100">
                                            {filteredPrices.map(item => (
                                                <div key={item.id} className="px-5 py-3 hover:bg-neutral-50 transition-colors flex items-center justify-between group">
                                                    <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                                                        <div className="col-span-2"><span className="px-2 py-1 bg-neutral-100 rounded text-xs font-mono">{item.wbsCode}</span></div>
                                                        <div className="col-span-4 font-medium">{item.title}</div>
                                                        <div className="col-span-2 text-sm text-neutral-500">{item.unit}</div>
                                                        <div className="col-span-4 text-right font-semibold">{formatCurrency(item.unitPrice)}</div>
                                                    </div>
                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                                                        <button onClick={() => openModal(item)} className="p-1.5 hover:bg-white rounded shadow-sm text-neutral-500"><Pencil className="w-3.5 h-3.5" /></button>
                                                        <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {activeTab === "disciplines" && (
                                    <div className="divide-y divide-neutral-100">
                                        <div className="px-5 py-3 bg-neutral-50 text-xs font-semibold text-neutral-500 uppercase grid grid-cols-12 gap-4">
                                            <div className="col-span-1">Code</div>
                                            <div className="col-span-4">Name (EN)</div>
                                            <div className="col-span-4">Name (ID)</div>
                                            <div className="col-span-2">Color</div>
                                            <div className="col-span-1"></div>
                                        </div>
                                        {disciplines.map(item => (
                                            <div key={item.id} className="px-5 py-3 hover:bg-neutral-50 transition-colors flex items-center justify-between group">
                                                <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                                                    <div className="col-span-1 font-mono font-bold">{item.code}</div>
                                                    <div className="col-span-4">{item.nameEn}</div>
                                                    <div className="col-span-4">{item.nameId}</div>
                                                    <div className="col-span-2 flex items-center gap-2">
                                                        <div className={`w-4 h-4 rounded-full ${item.color.startsWith('bg-') ? item.color : 'bg-neutral-400'}`}></div>
                                                        <span className="text-xs text-neutral-400">{item.color}</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                                                    <button onClick={() => openModal(item)} className="p-1.5 hover:bg-white rounded shadow-sm text-neutral-500"><Pencil className="w-3.5 h-3.5" /></button>
                                                    <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {activeTab === "classes" && (
                                    <div className="divide-y divide-neutral-100">
                                        <div className="px-5 py-3 bg-neutral-50 text-xs font-semibold text-neutral-500 uppercase grid grid-cols-12 gap-4">
                                            <div className="col-span-1">Code</div>
                                            <div className="col-span-3">Description</div>
                                            <div className="col-span-2 text-right">Structure</div>
                                            <div className="col-span-2 text-right">Arch</div>
                                            <div className="col-span-2 text-right">MEP</div>
                                            <div className="col-span-2"></div>
                                        </div>
                                        {classes.map(item => (
                                            <div key={item.id} className="px-5 py-3 hover:bg-neutral-50 transition-colors flex items-center justify-between group">
                                                <div className="flex-1 grid grid-cols-12 gap-4 items-center text-sm">
                                                    <div className="col-span-1 font-mono font-bold">{item.classCode}</div>
                                                    <div className="col-span-3">
                                                        <div className="font-medium text-neutral-900">{item.finishLevel}</div>
                                                        <div className="text-xs text-neutral-500">{item.description}</div>
                                                    </div>
                                                    <div className="col-span-2 text-right font-mono text-neutral-600">{formatCurrency(item.costMultiplierS)}</div>
                                                    <div className="col-span-2 text-right font-mono text-neutral-600">{formatCurrency(item.costMultiplierA)}</div>
                                                    <div className="col-span-2 text-right font-mono text-neutral-600">{formatCurrency(item.costMultiplierM)}</div>
                                                </div>
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                                                    <button onClick={() => openModal(item)} className="p-1.5 hover:bg-white rounded shadow-sm text-neutral-500"><Pencil className="w-3.5 h-3.5" /></button>
                                                    <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </PageWrapper>

            {/* Render correct modal based on active tab */}
            {activeTab === "prices" && <PriceModal isOpen={modalOpen} item={editItem} onClose={() => setModalOpen(false)} onSave={handleSave} />}
            {activeTab === "disciplines" && <DisciplineModal isOpen={modalOpen} item={editItem} onClose={() => setModalOpen(false)} onSave={handleSave} />}
            {activeTab === "classes" && <ClassModal isOpen={modalOpen} item={editItem} onClose={() => setModalOpen(false)} onSave={handleSave} />}
        </div>
    );
}
