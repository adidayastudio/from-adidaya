"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, Search, Plus, PencilLine, Trash2, ChevronRight, Calculator, ArrowRight } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";
import { supabase } from "@/lib/supabaseClient";
import * as Dialog from "@radix-ui/react-dialog";
import clsx from "clsx";
import { X } from "lucide-react";
import { Select } from "@/shared/ui/primitives/select/select";

// Types
type AhspMaster = {
    id: string;
    code: string | null;
    name: string;
    unit: string;
    category: string | null;
    discipline_id?: string | null;
    overhead_percent?: number;
    total_price?: number; // Calculated on frontend or view
};

type AhspComponent = {
    id: string;
    ahsp_id: string;
    resource_id: string;
    coefficient: number;
    resource?: {
        name: string;
        category: string;
        unit: string;
        price_default: number;
    };
};

type Resource = {
    id: string;
    name: string;
    category: string;
    unit: string;
    price_default: number;
};

type Discipline = {
    id: string;
    name: string;
};

export default function AhspBuilderPage() {
    const [workspaceId, setWorkspaceId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Data State
    const [masters, setMasters] = useState<AhspMaster[]>([]);
    const [selectedAhspId, setSelectedAhspId] = useState<string | null>(null);
    const [components, setComponents] = useState<AhspComponent[]>([]);
    const [resources, setResources] = useState<Resource[]>([]);
    const [disciplines, setDisciplines] = useState<Discipline[]>([]);

    // UI State
    const [searchQuery, setSearchQuery] = useState("");
    const [disciplineFilter, setDisciplineFilter] = useState("ALL");
    const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);
    const [editingMaster, setEditingMaster] = useState<AhspMaster | null>(null);
    const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);

    // Add Component State
    const [activeAddCategory, setActiveAddCategory] = useState<'material' | 'labor' | 'equipment' | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Forms
    const [masterForm, setMasterForm] = useState<Partial<AhspMaster>>({ unit: "m3", overhead_percent: 10 });
    const [componentForm, setComponentForm] = useState({ resourceId: "", coefficient: 1.0 });

    // --- Loading ---

    const loadMasters = async (wsId: string) => {
        const { data, error } = await supabase
            .from('ahsp_masters')
            .select('*')
            .eq('workspace_id', wsId)
            .order('name', { ascending: true });

        if (data) setMasters(data);
    };

    const loadResources = async (wsId: string) => {
        const { data } = await supabase
            .from('pricing_resources')
            .select('id, name, category, unit, price_default')
            .eq('workspace_id', wsId)
            .order('name');

        if (data) setResources(data);
    };

    const loadDisciplines = async (wsId: string) => {
        const { data } = await supabase.from('disciplines').select('id, name:name_en').eq('workspace_id', wsId).order('name_en');
        if (data) setDisciplines(data);
    };

    const loadComponents = async (ahspId: string) => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('ahsp_components')
            .select(`
                id, ahsp_id, resource_id, coefficient,
                resource:pricing_resources (name, category, unit, price_default)
            `)
            .eq('ahsp_id', ahspId);

        if (data) {
            // Flatten the resource data for easier access
            const formatted = data.map((d: any) => ({
                ...d,
                resource: d.resource
            }));
            setComponents(formatted);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        const init = async () => {
            const wsId = await fetchDefaultWorkspaceId();
            setWorkspaceId(wsId);
            if (wsId) {
                await Promise.all([loadMasters(wsId), loadResources(wsId), loadDisciplines(wsId)]);
                setIsLoading(false);
            }
        };
        init();
    }, []);

    useEffect(() => {
        if (selectedAhspId) {
            loadComponents(selectedAhspId);
        } else {
            setComponents([]);
        }
    }, [selectedAhspId]);

    // --- Computed ---

    const filteredMasters = useMemo(() => {
        return masters.filter(m => {
            const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesDiscipline = disciplineFilter === "ALL" || m.discipline_id === disciplineFilter;
            return matchesSearch && matchesDiscipline;
        });
    }, [masters, searchQuery, disciplineFilter]);

    const selectedAhsp = useMemo(() => masters.find(m => m.id === selectedAhspId), [masters, selectedAhspId]);

    // Group calculations
    const totals = useMemo(() => {
        const labor = components.filter(c => c.resource?.category === 'labor').reduce((s, c) => s + ((c.resource?.price_default || 0) * c.coefficient), 0);
        const material = components.filter(c => c.resource?.category === 'material').reduce((s, c) => s + ((c.resource?.price_default || 0) * c.coefficient), 0);
        const equipment = components.filter(c => c.resource?.category === 'equipment').reduce((s, c) => s + ((c.resource?.price_default || 0) * c.coefficient), 0);

        const subtotal = labor + material + equipment;
        const overheadPercent = selectedAhsp?.overhead_percent || 10;
        const overhead = subtotal * (overheadPercent / 100);
        const total = subtotal + overhead;

        return { labor, material, equipment, subtotal, overhead, total };
    }, [components, selectedAhsp]);

    // --- Actions: Master ---

    const saveMaster = async () => {
        if (!workspaceId) return;
        const payload = {
            workspace_id: workspaceId,
            name: masterForm.name,
            code: masterForm.code,
            unit: masterForm.unit,
            category: masterForm.category,
            discipline_id: masterForm.discipline_id === "ALL" ? null : masterForm.discipline_id,
            overhead_percent: masterForm.overhead_percent
        };

        if (editingMaster) {
            await supabase.from('ahsp_masters').update(payload).eq('id', editingMaster.id);
        } else {
            await supabase.from('ahsp_masters').insert(payload);
        }
        await loadMasters(workspaceId);
        setIsMasterModalOpen(false);
    };

    const updateOverhead = async (percent: number) => {
        if (!selectedAhspId) return;

        // Optimistic update
        setMasters(prev => prev.map(m => m.id === selectedAhspId ? { ...m, overhead_percent: percent } : m));

        await supabase.from('ahsp_masters').update({ overhead_percent: percent }).eq('id', selectedAhspId);
    };

    const deleteMaster = async (id: string) => {
        if (!confirm("Delete this AHSP Analysis?")) return;
        await supabase.from('ahsp_masters').delete().eq('id', id);
        if (selectedAhspId === id) setSelectedAhspId(null);
        await loadMasters(workspaceId!);
    };

    // --- Actions: Components ---

    const openAddComponent = (category: 'material' | 'labor' | 'equipment') => {
        setActiveAddCategory(category);
        setComponentForm({ resourceId: "", coefficient: 1.0 });
        setIsAddComponentOpen(true);
    };

    const addComponent = async () => {
        if (!selectedAhspId || !componentForm.resourceId) return;

        const { error } = await supabase.from('ahsp_components').insert({
            ahsp_id: selectedAhspId,
            resource_id: componentForm.resourceId,
            coefficient: componentForm.coefficient
        });

        if (error) {
            alert("Error adding component");
        } else {
            loadComponents(selectedAhspId);
            setIsAddComponentOpen(false);
            setComponentForm({ resourceId: "", coefficient: 1.0 });
        }
    };

    const deleteComponent = async (id: string) => {
        await supabase.from('ahsp_components').delete().eq('id', id);
        if (selectedAhspId) loadComponents(selectedAhspId);
    };

    const updateCoefficient = async (id: string, newCoef: number) => {
        await supabase.from('ahsp_components').update({ coefficient: newCoef }).eq('id', id);
        // Optimistic update
        setComponents(prev => prev.map(c => c.id === id ? { ...c, coefficient: newCoef } : c));
    };


    return (
        <div className="flex h-[calc(100vh-140px)] gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

            {/* LEFT PANE: MASTER LIST */}
            <div className="w-1/3 flex flex-col bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden">
                <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-neutral-900">AHSP Analyses</h3>
                        <Button
                            size="sm"
                            className="bg-brand-red text-white h-8"
                            onClick={() => { setEditingMaster(null); setMasterForm({ unit: 'm3', overhead_percent: 10 }); setIsMasterModalOpen(true); }}
                        >
                            <Plus className="w-4 h-4 mr-1" /> New
                        </Button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <Input
                            className="pl-9 h-9 text-sm"
                            placeholder="Search analysis..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Select
                        placeholder="Filter by Discipline"
                        options={[
                            { label: "All Disciplines", value: "ALL" },
                            ...disciplines.map(d => ({ label: d.name, value: d.id }))
                        ]}
                        value={disciplineFilter}
                        onChange={setDisciplineFilter}
                        selectSize="sm"
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {filteredMasters.map(m => (
                        <div
                            key={m.id}
                            onClick={() => setSelectedAhspId(m.id)}
                            className={clsx(
                                "flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors text-sm border",
                                selectedAhspId === m.id
                                    ? "bg-brand-red/5 border-brand-red/20"
                                    : "bg-white border-transparent hover:bg-neutral-50 hover:border-neutral-200"
                            )}
                        >
                            <div>
                                <div className={clsx("font-medium", selectedAhspId === m.id ? "text-brand-red" : "text-neutral-900")}>
                                    {m.name}
                                </div>
                                <div className="text-xs text-neutral-500 flex gap-2">
                                    <span className="font-mono bg-neutral-100 px-1 rounded">{m.unit}</span>
                                    {m.code && <span>{m.code}</span>}
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {selectedAhspId === m.id && (
                                    <>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setEditingMaster(m); setMasterForm(m); setIsMasterModalOpen(true); }}
                                            className="p-1 hover:bg-white rounded text-neutral-400 hover:text-neutral-700"
                                        >
                                            <PencilLine className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteMaster(m.id); }}
                                            className="p-1 hover:bg-white rounded text-neutral-400 hover:text-red-600"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </>
                                )}
                                <ChevronRight className={clsx("w-4 h-4", selectedAhspId === m.id ? "text-brand-red" : "text-neutral-300")} />
                            </div>
                        </div>
                    ))}
                    {filteredMasters.length === 0 && (
                        <div className="text-center py-8 text-neutral-400 text-sm">
                            No Item Found
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT PANE: BUILDER */}
            <div className="flex-1 flex flex-col bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden relative">
                {selectedAhsp ? (
                    <>
                        {/* Header Details */}
                        <div className="p-6 border-b border-neutral-200 flex justify-between items-start bg-neutral-50/50">
                            <div>
                                <div className="text-sm font-semibold text-brand-red mb-1 tracking-wider uppercase">Analysis of Unit Price</div>
                                <h2 className="text-2xl font-bold text-neutral-900 mb-2">{selectedAhsp.name}</h2>
                                <div className="flex items-center gap-3 text-sm text-neutral-600">
                                    <span className="bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded font-mono text-xs font-bold">{selectedAhsp.code || "NO CODE"}</span>
                                    <span>Per 1.00 <strong>{selectedAhsp.unit}</strong></span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-neutral-500 mb-1">Estimated Unit Price</div>
                                <div className="text-3xl font-bold text-neutral-900 font-mono">
                                    <span className="text-base text-neutral-400 align-top mr-1">Rp</span>
                                    {new Intl.NumberFormat('id-ID').format(totals.total)}
                                </div>
                            </div>
                        </div>

                        {/* Components Tables */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">

                            {/* Group Sections */}
                            {[
                                { id: 'labor', title: <span>A. Labor <span className="text-neutral-400 font-normal italic ml-1">(Tenaga Kerja)</span></span>, buttonText: 'Add Labor' },
                                { id: 'material', title: <span>B. Material <span className="text-neutral-400 font-normal italic ml-1">(Bahan)</span></span>, buttonText: 'Add Material' },
                                { id: 'equipment', title: <span>C. Equipment <span className="text-neutral-400 font-normal italic ml-1">(Peralatan)</span></span>, buttonText: 'Add Equipment' }
                            ].map(group => {
                                const groupComponents = components.filter(c => c.resource?.category === group.id);
                                const groupTotal = groupComponents.reduce((sum, c) => sum + ((c.resource?.price_default || 0) * c.coefficient), 0);

                                return (
                                    <div key={group.id} className="border border-neutral-200 rounded-lg overflow-hidden">
                                        <div className="bg-neutral-50 px-4 py-2 border-b border-neutral-200 flex justify-between items-center">
                                            <h4 className="font-semibold text-neutral-700 text-sm">{group.title}</h4>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="bg-white hover:bg-neutral-50"
                                                icon={<Plus className="w-3 h-3" />}
                                                onClick={() => openAddComponent(group.id as any)}
                                            >
                                                {group.buttonText}
                                            </Button>
                                        </div>

                                        <table className="w-full text-sm">
                                            <thead className="bg-white border-b border-neutral-100">
                                                <tr className="text-left text-neutral-400 text-xs uppercase">
                                                    <th className="px-4 py-2 font-medium w-1/2">Description <span className="normal-case italic font-normal text-[10px] ml-0.5">(Uraian)</span></th>
                                                    <th className="px-4 py-2 font-medium text-right w-24">Unit <span className="normal-case italic font-normal text-[10px] ml-0.5">(Satuan)</span></th>
                                                    <th className="px-4 py-2 font-medium text-right w-24">Coef. <span className="normal-case italic font-normal text-[10px] ml-0.5">(Koefisien)</span></th>
                                                    <th className="px-4 py-2 font-medium text-right w-32">Price <span className="normal-case italic font-normal text-[10px] ml-0.5">(Harga Satuan)</span></th>
                                                    <th className="px-4 py-2 font-medium text-right w-32">Total <span className="normal-case italic font-normal text-[10px] ml-0.5">(Jumlah Harga)</span></th>
                                                    <th className="w-8"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-neutral-50 bg-white">
                                                {groupComponents.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} className="px-4 py-4 text-center text-xs text-neutral-400 italic">No items added.</td>
                                                    </tr>
                                                ) : (
                                                    groupComponents.map(comp => (
                                                        <tr key={comp.id} className="group hover:bg-neutral-50">
                                                            <td className="px-4 py-2 font-medium text-neutral-700">{comp.resource?.name}</td>
                                                            <td className="px-4 py-2 text-right text-neutral-500 text-xs">{comp.resource?.unit}</td>
                                                            <td className="px-4 py-2 text-right">
                                                                <input
                                                                    type="number"
                                                                    className="w-16 text-right border border-transparent hover:border-neutral-300 focus:border-brand-red rounded bg-transparent px-1 py-0.5 outline-none font-mono text-neutral-900 font-bold text-xs"
                                                                    value={comp.coefficient}
                                                                    onChange={(e) => updateCoefficient(comp.id, parseFloat(e.target.value) || 0)}
                                                                    step="0.0001"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-2 text-right text-neutral-500 tabular-nums">
                                                                {new Intl.NumberFormat('id-ID').format(comp.resource?.price_default || 0)}
                                                            </td>
                                                            <td className="px-4 py-2 text-right font-medium text-neutral-900 tabular-nums">
                                                                {new Intl.NumberFormat('id-ID').format((comp.resource?.price_default || 0) * comp.coefficient)}
                                                            </td>
                                                            <td className="px-4 py-2 text-right">
                                                                <button
                                                                    onClick={() => deleteComponent(comp.id)}
                                                                    className="opacity-0 group-hover:opacity-100 p-1 text-neutral-300 hover:text-red-500 transition-all"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                                {/* Subtotal Row */}
                                                <tr className="bg-neutral-50/50 font-medium">
                                                    <td colSpan={4} className="px-4 py-2 text-right text-neutral-600 text-xs uppercase tracking-wide">
                                                        Subtotal {group.id.charAt(0).toUpperCase() + group.id.slice(1)}
                                                    </td>
                                                    <td className="px-4 py-2 text-right text-neutral-900 tabular-nums border-t border-neutral-200">
                                                        {new Intl.NumberFormat('id-ID').format(groupTotal)}
                                                    </td>
                                                    <td></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            })}

                            {/* RECAPITULATION SECTION */}
                            <div className="border border-neutral-200 rounded-lg overflow-hidden mt-8">
                                <div className="bg-neutral-100 px-4 py-2 border-b border-neutral-200 font-bold text-neutral-800 text-sm">
                                    Summary <span className="font-normal italic text-neutral-500 ml-1">(Rekapitulasi Harga)</span>
                                </div>
                                <table className="w-full text-sm bg-white">
                                    <tbody className="divide-y divide-neutral-100">
                                        <tr>
                                            <td className="px-4 py-2 text-neutral-600">D. Total Base Price <span className="italic text-neutral-400 text-xs ml-1">(Jumlah Harga Tenaga, Bahan, dan Alat)</span></td>
                                            <td className="px-4 py-2 text-right font-medium tabular-nums w-48">
                                                {new Intl.NumberFormat('id-ID').format(totals.subtotal)}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="px-4 py-2 text-neutral-600 flex items-center justify-between">
                                                <span>E. Overhead & Profit <span className="italic text-neutral-400 text-xs ml-1">(Overhead & Profit)</span></span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-neutral-400">Rate (%):</span>
                                                    <input
                                                        type="number"
                                                        className="w-12 h-6 text-right border border-neutral-300 rounded px-1 text-xs"
                                                        value={selectedAhsp.overhead_percent || 10}
                                                        onChange={(e) => updateOverhead(parseFloat(e.target.value) || 0)}
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 text-right font-medium tabular-nums text-neutral-500">
                                                {new Intl.NumberFormat('id-ID').format(totals.overhead)}
                                            </td>
                                        </tr>
                                        <tr className="bg-brand-red/5">
                                            <td className="px-4 py-3 font-bold text-brand-red">F. Unit Price <span className="italic text-red-400 font-normal text-xs ml-1">(Harga Satuan Pekerjaan)</span></td>
                                            <td className="px-4 py-3 text-right font-bold text-brand-red text-lg tabular-nums">
                                                {new Intl.NumberFormat('id-ID').format(totals.total)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-neutral-300">
                        <Calculator className="w-8 h-8 mb-2 opacity-50" />
                        <p>No components yet.</p>
                        <p className="text-xs">Add ingredients to calculate the unit price.</p>
                    </div>
                )}
            </div>

            {/* MODAL: ADD/EDIT MASTER */}
            <Dialog.Root open={isMasterModalOpen} onOpenChange={setIsMasterModalOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg w-full max-w-sm p-6 z-50">
                        <Dialog.Title className="text-lg font-bold mb-4">{editingMaster ? 'Edit Analysis' : 'New Analysis'}</Dialog.Title>
                        <div className="space-y-4">
                            <Input label="Name" placeholder="e.g. Beton K-225" value={masterForm.name || ""} onChange={e => setMasterForm({ ...masterForm, name: e.target.value })} />
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Code" placeholder="e.g. A.2.2.1" value={masterForm.code || ""} onChange={e => setMasterForm({ ...masterForm, code: e.target.value })} />
                                <Input label="Unit" placeholder="e.g. m3" value={masterForm.unit || ""} onChange={e => setMasterForm({ ...masterForm, unit: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 block">Discipline</label>
                                <Select
                                    placeholder="Select Discipline..."
                                    options={disciplines.map(d => ({ label: d.name, value: d.id }))}
                                    value={masterForm.discipline_id || ""}
                                    onChange={val => setMasterForm({ ...masterForm, discipline_id: val })}
                                />
                            </div>
                            <Input label="Category" placeholder="e.g. Pekerjaan Beton" value={masterForm.category || ""} onChange={e => setMasterForm({ ...masterForm, category: e.target.value })} />
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant="text" onClick={() => setIsMasterModalOpen(false)}>Cancel</Button>
                            <Button onClick={saveMaster}>Save</Button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* MODAL: ADD COMPONENT */}
            <Dialog.Root open={isAddComponentOpen} onOpenChange={setIsAddComponentOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg w-full max-w-md p-6 z-50">
                        <Dialog.Title className="text-lg font-bold mb-4">Add Ingredient</Dialog.Title>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-neutral-700 mb-1 block">Resource</label>
                                <select
                                    className="w-full border border-neutral-300 rounded-md p-2 text-sm"
                                    value={componentForm.resourceId}
                                    onChange={e => setComponentForm({ ...componentForm, resourceId: e.target.value })}
                                >
                                    <option value="">Select Resource...</option>
                                    {resources
                                        .filter(r => !activeAddCategory || r.category === activeAddCategory)
                                        .map(r => (
                                            <option key={r.id} value={r.id}>
                                                {r.name} ({r.unit}) - Rp {r.price_default.toLocaleString()}
                                            </option>
                                        ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-neutral-700 mb-1 block">Coefficient</label>
                                <Input
                                    type="number"
                                    step="0.0001"
                                    placeholder="e.g. 1.25"
                                    value={componentForm.coefficient}
                                    onChange={e => setComponentForm({ ...componentForm, coefficient: parseFloat(e.target.value) })}
                                />
                                <p className="text-xs text-neutral-500 mt-1">
                                    How much of this resource is needed for 1 {selectedAhsp?.unit} of {selectedAhsp?.name}?
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant="text" onClick={() => setIsAddComponentOpen(false)}>Cancel</Button>
                            <Button onClick={addComponent} disabled={!componentForm.resourceId}>Add Ingredient</Button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

        </div >
    );
}
