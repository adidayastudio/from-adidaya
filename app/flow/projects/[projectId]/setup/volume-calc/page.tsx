"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import ProjectDetailSidebar from "@/components/flow/projects/project-detail/ProjectDetailSidebar";
import ProjectDetailHeader from "@/components/flow/projects/project-detail/ProjectDetailHeader";
import { Input } from "@/shared/ui/primitives/input/input";
import { Save, Plus, Trash2, Calculator, ArrowRight, ChevronDown, ChevronRight, Hash } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useProject } from "@/components/flow/project-context";
import { GlobalLoading } from "@/components/shared/GlobalLoading";
import { WBS_BALLPARK } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-ballpark";
import { RAW_WBS_ESTIMATES_DELTA } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-estimates";
import { buildEstimatesFromBallpark } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-inherit";
import { buildDetailFromEstimates } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-detail";
import { buildWBSTree, ensureMultiBuildingWBS, mergeWBSTrees } from "@/lib/flow/mappers/wbs-tree";

// Define calculation item structure
interface VolumeRow {
  id: string;
  name: string;
  formulaType: "BOX" | "TRAPEZOIDAL" | "COLUMN_BEAM" | "AREA" | "LINE" | "MANUAL";
  length: number;
  width: number;
  height: number;
  topWidth?: number;
  bottomWidth?: number;
  count: number;
  manualVolume?: number;
}

// Tree Node interface
interface TreeNode {
  id: string;
  code: string;
  nameEn: string;
  nameId: string;
  unit?: string;
  children: TreeNode[];
}

const SUPPORTED_UNITS = [
  { label: "Volume (m³)", value: "m³" },
  { label: "Luas (m²)", value: "m²" },
  { label: "Panjang (m¹)", value: "m¹" },
  { label: "Berat (kg)", value: "kg" },
  { label: "Pieces (pcs)", value: "pcs" },
  { label: "Set (set)", value: "set" },
  { label: "Lump Sum (ls)", value: "ls" },
  { label: "Lot (lot)", value: "lot" },
  { label: "Ton (ton)", value: "ton" },
];

const SAMIL_ORDER: Record<string, number> = {
  S: 1,
  A: 2,
  M: 3,
  I: 4,
  L: 5,
};

export default function VolumeCalcPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { project, isLoading, error, refresh } = useProject();

  const [dbWbsItems, setDbWbsItems] = useState<any[]>([]);
  const [selectedWbsCode, setSelectedWbsCode] = useState<string | null>(null);
  const [selectedWbsName, setSelectedWbsName] = useState<string>("");
  const [selectedWbsUnit, setSelectedWbsUnit] = useState<string>("m³");
  const [calcRows, setCalcRows] = useState<VolumeRow[]>([]);
  const [isLoadingWBS, setIsLoadingWBS] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Categorize unit for formulas (handling superscript characters like ³ and ²)
  const unitCategory = useMemo(() => {
    const u = selectedWbsUnit.toLowerCase().trim();
    if (u.includes("3") || u.includes("³") || u.includes("kub") || u.includes("m3")) return "VOLUME";
    if (u.includes("2") || u.includes("²") || u.includes("m2")) return "AREA";
    if (u === "m" || u === "m1" || u === "mtr" || u === "meter" || u === "m¹" || u === "m-1") return "LINE";
    return "COUNT"; // pcs, set, ls, lot, kg, etc.
  }, [selectedWbsUnit]);

  // Load WBS Items
  useEffect(() => {
    if (!project?.id) return;
    async function fetchWbs() {
      try {
        setIsLoadingWBS(true);
        let allRows: any[] = [];
        let page = 0;
        const pageSize = 1000;
        
        while (true) {
          const { data, error } = await supabase
            .from("project_wbs_items")
            .select("*")
            .eq("project_id", project.id)
            .range(page * pageSize, (page + 1) * pageSize - 1);
            
          if (error || !data || data.length === 0) break;
          allRows.push(...data);
          if (data.length < pageSize) break;
          page++;
        }

        setDbWbsItems(allRows);
      } catch (err) {
        console.error("Error fetching WBS:", err);
      } finally {
        setIsLoadingWBS(false);
      }
    }
    fetchWbs();
  }, [project?.id]);

  // Load saved volume calcs for the selected WBS Code
  useEffect(() => {
    if (!project?.id || !selectedWbsCode) return;

    async function loadCalcs() {
      try {
        const { data, error } = await supabase
          .from("project_volume_calcs")
          .select("*")
          .eq("project_id", project.id)
          .eq("wbs_code", selectedWbsCode);

        if (error) throw error;

        if (data && data.length > 0) {
          const mappedRows = data.map((row: any) => ({
            id: row.id,
            name: row.name,
            formulaType: row.formula_type,
            length: row.parameters?.length || 0,
            width: row.parameters?.width || 0,
            height: row.parameters?.height || 0,
            topWidth: row.parameters?.topWidth || 0,
            bottomWidth: row.parameters?.bottomWidth || 0,
            count: row.parameters?.count || 1,
            manualVolume: row.parameters?.manualVolume || 0,
          }));
          setCalcRows(mappedRows);
        } else {
          // Initialize with a formula matching unit category
          const defaultFormula =
            unitCategory === "VOLUME"
              ? "BOX"
              : unitCategory === "AREA"
              ? "AREA"
              : unitCategory === "LINE"
              ? "LINE"
              : "MANUAL";

          setCalcRows([
            {
              id: Math.random().toString(),
              name: "Kalkulasi Utama",
              formulaType: defaultFormula,
              length: 0,
              width: 0,
              height: 0,
              count: 1,
            },
          ]);
        }
      } catch (err) {
        console.error("Error loading volume calcs:", err);
      }
    }
    loadCalcs();
  }, [project?.id, selectedWbsCode, unitCategory]);

  // Dynamic calculations for each row
  const computedRows = useMemo(() => {
    return calcRows.map((row) => {
      let volume = 0;
      if (row.formulaType === "BOX") {
        volume = row.length * row.width * row.height * row.count;
      } else if (row.formulaType === "TRAPEZOIDAL") {
        const avgWidth = ((row.topWidth || 0) + (row.bottomWidth || 0)) / 2;
        volume = avgWidth * row.height * row.length * row.count;
      } else if (row.formulaType === "COLUMN_BEAM") {
        volume = row.length * row.width * row.height * row.count;
      } else if (row.formulaType === "AREA") {
        volume = row.length * row.width * row.count;
      } else if (row.formulaType === "LINE") {
        volume = row.length * row.count;
      } else if (row.formulaType === "MANUAL") {
        volume = (row.manualVolume || 0) * row.count;
      }
      return {
        ...row,
        volume: Number(volume.toFixed(3)),
      };
    });
  }, [calcRows]);

  // Aggregate total volume
  const totalVolume = useMemo(() => {
    const sum = computedRows.reduce((acc, row) => acc + row.volume, 0);
    return Number(sum.toFixed(3));
  }, [computedRows]);

  // Handle setting active WBS node
  const handleSelectNode = (code: string, name: string, unit: string) => {
    setSelectedWbsCode(code);
    setSelectedWbsName(name);

    // Try to load any overridden unit from project.meta.estimateValues[code].unit first
    const savedMetaUnit = (project?.meta as any)?.estimateValues?.[code]?.unit;
    setSelectedWbsUnit(savedMetaUnit || unit || "m³");
  };

  const handleAddRow = () => {
    const defaultFormula =
      unitCategory === "VOLUME"
        ? "BOX"
        : unitCategory === "AREA"
        ? "AREA"
        : unitCategory === "LINE"
        ? "LINE"
        : "MANUAL";

    setCalcRows((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        name: `Kalkulasi Baru ${prev.length + 1}`,
        formulaType: defaultFormula,
        length: 0,
        width: 0,
        height: 0,
        count: 1,
      },
    ]);
  };

  const handleRemoveRow = (id: string) => {
    setCalcRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateRow = (id: string, updates: Partial<VolumeRow>) => {
    setCalcRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  // Save changes and push volume back to project metadata RAB leaf node
  const handleSaveAndApply = async () => {
    if (!project || !selectedWbsCode) return;

    try {
      setIsSaving(true);

      // 1. Delete old rows for this wbs_code
      await supabase
        .from("project_volume_calcs")
        .delete()
        .eq("project_id", project.id)
        .eq("wbs_code", selectedWbsCode);

      // 2. Insert new rows
      if (computedRows.length > 0) {
        const rowsToInsert = computedRows.map((r) => ({
          project_id: project.id,
          wbs_code: selectedWbsCode,
          name: r.name,
          formula_type: r.formulaType,
          parameters: {
            length: r.length,
            width: r.width,
            height: r.height,
            topWidth: r.topWidth,
            bottomWidth: r.bottomWidth,
            count: r.count,
            manualVolume: r.manualVolume,
          },
          calculated_volume: r.volume,
        }));

        const { error: insertErr } = await supabase
          .from("project_volume_calcs")
          .insert(rowsToInsert);

        if (insertErr) throw insertErr;
      }

      // 3. Update project metadata (sync into estimateValues)
      const currentMeta = project.meta || {};
      const currentEstValues = (currentMeta as any).estimateValues || {};

      const nodeVal = currentEstValues[selectedWbsCode] || {
        unitPrice: 0,
      };

      const updatedMeta = {
        ...currentMeta,
        estimateValues: {
          ...currentEstValues,
          [selectedWbsCode]: {
            ...nodeVal,
            volume: totalVolume,
            unit: selectedWbsUnit,
          },
        },
      };

      const { error: metaErr } = await supabase
        .from("projects")
        .update({ meta: updatedMeta })
        .eq("id", project.id);

      if (metaErr) throw metaErr;

      // 4. Update the volume and unit in the work_breakdown_structure table directly
      await supabase
        .from("work_breakdown_structure")
        .update({
          volume: totalVolume,
          unit: selectedWbsUnit
        })
        .eq("workspace_id", project.workspace_id)
        .eq("code", selectedWbsCode);

      // Refresh the project context to automatically propagate the updated estimateValues across the app (like RAB page)
      if (refresh) {
        await refresh();
      }

      // Update unit in the active list directly
      setDbWbsItems(prev =>
        prev.map(item =>
          item.code === selectedWbsCode ? { ...item, unit: selectedWbsUnit } : item
        )
      );

      alert(`✅ Volume and unit saved and applied to WBS node ${selectedWbsCode} in RAB!`);
    } catch (err: any) {
      console.error(err);
      alert("❌ Failed to save volume calculations: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Build hierarchical WBS Tree with exact natural sorting matching the WBS page
  const wbsTree = useMemo(() => {
    const defaultTree = buildDetailFromEstimates(buildEstimatesFromBallpark(WBS_BALLPARK, RAW_WBS_ESTIMATES_DELTA));
    const dbTree = buildWBSTree(dbWbsItems);
    const baseTree = dbTree.length > 0 ? dbTree : defaultTree;

    return ensureMultiBuildingWBS(baseTree, project);
  }, [dbWbsItems, project]);

  // Derived properties for header
  const projectForHeader = useMemo(() => {
    if (!project) return null;
    return {
      id: project.id,
      projectNo: project.project_number || "-",
      code: project.project_code || "-",
      name: project.project_name || "Proyek Tanpa Nama",
      status: project.status || "active",
      progress: (project.meta as any)?.progress ?? 0,
      type: (project.meta as any)?.type ?? "design-build",
      stage: "sd",
    };
  }, [project]);

  // Toggle node expand/collapse state
  const toggleExpand = (nodeId: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  // Auto-expand parents of selected node on initial load
  useEffect(() => {
    if (selectedWbsCode && dbWbsItems.length) {
      const activeNode = dbWbsItems.find(n => n.code === selectedWbsCode);
      if (activeNode) {
        const toExpand: Record<string, boolean> = { ...expandedNodes };
        let current = activeNode;
        while (current.parent_id) {
          toExpand[current.parent_id] = true;
          const parent = dbWbsItems.find(n => n.id === current.parent_id);
          if (!parent) break;
          current = parent;
        }
        setExpandedNodes(toExpand);
      }
    }
  }, [selectedWbsCode, dbWbsItems]);

  // Recursive Tree Node Renderer for sidebar WBS tree selector
  const renderTreeNodes = (nodes: TreeNode[], depth = 0) => {
    return nodes.map((node) => {
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = !!expandedNodes[node.id];
      const isSelected = selectedWbsCode === node.code;

      return (
        <div key={node.id} className="space-y-0.5">
          <div
            className={`w-full flex items-start justify-between py-1.5 px-2 rounded-lg transition-all ${
              isSelected
                ? "bg-red-50 dark:bg-brand-red/10 text-brand-red dark:text-red-400 font-bold"
                : "bg-transparent text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/40"
            }`}
            style={{ paddingLeft: `${Math.max(8, depth * 12)}px` }}
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggleExpand(node.id)}
                  className={`p-0.5 rounded hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 transition-colors shrink-0 ${
                    isSelected ? "text-brand-red dark:text-red-400" : "text-neutral-400"
                  }`}
                >
                  {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                </button>
              ) : (
                <div className="w-4 h-4 flex items-center justify-center shrink-0">
                  <Hash size={9} className={isSelected ? "text-brand-red/60 dark:text-red-400/60" : "text-neutral-400"} />
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  if (!hasChildren) {
                    handleSelectNode(node.code, node.nameEn || node.nameId, node.unit || "m³");
                  } else {
                    toggleExpand(node.id);
                  }
                }}
                className="flex-1 text-left min-w-0 flex flex-col items-start py-0.5"
              >
                <div className="flex items-baseline gap-1 w-full min-w-0">
                  <span className={`font-mono text-[8px] font-bold shrink-0 select-none pr-0.5 ${isSelected ? "text-brand-red/70 dark:text-red-400/70" : "text-neutral-400"}`}>
                    {node.code}
                  </span>
                  <span className="whitespace-normal break-words text-[11px] block flex-1 leading-tight">
                    {node.nameEn}
                  </span>
                </div>
                {node.nameId && (
                  <span className={`text-[9px] italic whitespace-normal break-words block w-full leading-tight ${isSelected ? "text-brand-red/60 dark:text-red-300/70" : "text-neutral-400"}`}>
                    {node.nameId}
                  </span>
                )}
              </button>
            </div>
          </div>

          {hasChildren && isExpanded && (
            <div className="space-y-0.5">
              {renderTreeNodes(node.children, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  if (isLoading || (project?.workspace_id && isLoadingWBS)) return <GlobalLoading />;
  if (error || !project || !projectForHeader) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-900 text-neutral-500">
        {error || "Project not found."}
      </div>
    );
  }

  return (
    <PageWrapper sidebar={<ProjectDetailSidebar />} isTransparent={true}>
      <div className="space-y-6 w-full max-w-4xl mx-auto animate-in fade-in duration-500 px-4 md:px-0">
        <ProjectDetailHeader project={projectForHeader as any} />

        {/* TITLE BLOCK */}
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Volume Calculator (BOQ)</h2>
        </div>

        {/* MAIN PANEL */}
        <div className="bg-white dark:bg-neutral-900/40 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden flex h-[680px]">
          {/* LEFT PANEL - WBS Tree Selector (expanded width, support text wrap, fixed box-model margin overflow) */}
          <div className="w-[360px] border-r border-neutral-200 dark:border-neutral-800 flex flex-col bg-neutral-50/50 dark:bg-neutral-950/20 shrink-0">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100/30 dark:bg-neutral-900/30">
              <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                WBS Navigator
              </h3>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                Navigate hierarchy and select leaf items to calculate volume
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {renderTreeNodes(wbsTree)}
            </div>
          </div>

          {/* RIGHT MAIN PANEL - Grid calculator sheet */}
          <div className="flex-1 flex flex-col bg-transparent min-w-0">
            {selectedWbsCode ? (
              <>
                {/* Selected Item header (Structured into clean rows to prevent layout cramp) */}
                <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex flex-col gap-4 bg-neutral-50/20 dark:bg-neutral-950/20">
                  {/* Top Row: Code, Name, and Save button */}
                  <div className="flex items-start justify-between gap-4 w-full">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 font-mono text-[10px] font-bold text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 shrink-0">
                          {selectedWbsCode}
                        </span>
                        <h2 className="text-base font-bold text-neutral-900 dark:text-white truncate">
                          {selectedWbsName}
                        </h2>
                      </div>
                    </div>

                    <button
                      onClick={handleSaveAndApply}
                      disabled={isSaving}
                      className="bg-brand-red hover:bg-brand-red/90 text-white rounded-xl px-4 py-2 font-semibold text-xs flex items-center gap-2 transition-all shadow-lg shadow-brand-red/20 shrink-0"
                    >
                      <Save size={14} />
                      {isSaving ? "Saving..." : "Save & Apply to RAB"}
                    </button>
                  </div>

                  {/* Bottom Row: Unit selector (left) and Running Total badge (right) */}
                  <div className="flex items-center justify-between w-full border-t border-neutral-150 dark:border-neutral-800/60 pt-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-neutral-500 font-medium">Satuan Item:</span>
                      <select
                        value={selectedWbsUnit}
                        onChange={(e) => setSelectedWbsUnit(e.target.value)}
                        className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-0.5 text-[11px] text-neutral-700 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-brand-red font-semibold cursor-pointer"
                      >
                        {SUPPORTED_UNITS.map((unit) => (
                          <option key={unit.value} value={unit.value}>
                            {unit.label}
                          </option>
                        ))}
                      </select>
                      <span className="text-[10px] text-neutral-400 italic hidden sm:inline">
                        (Mempengaruhi pilihan rumus hitung di bawah)
                      </span>
                    </div>

                    {/* Running Total Badge */}
                    <div className="flex items-center gap-2 bg-neutral-100/80 dark:bg-neutral-800/80 border border-neutral-200/50 dark:border-neutral-750 px-3 py-1 rounded-xl">
                      <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
                        Running Total:
                      </span>
                      <span className="text-xs font-black text-brand-red dark:text-red-400 font-mono">
                        {totalVolume.toLocaleString("id-ID")}{" "}
                        <span className="text-[10px] font-normal text-neutral-500">{selectedWbsUnit}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Calculator Breakdown Sheet */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                      Calculation Breakdowns ({selectedWbsUnit})
                    </h4>
                    <button
                      onClick={handleAddRow}
                      className="bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-white text-[11px] font-bold px-4 py-2 flex items-center gap-1.5 rounded-xl transition-all shadow-sm shrink-0"
                    >
                      <Plus size={13} />
                      Add Space/Item
                    </button>
                  </div>

                  <div className="space-y-3">
                    {computedRows.map((row) => (
                      <div
                        key={row.id}
                        className="bg-neutral-50/50 dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800/80 rounded-2xl p-4 flex flex-col gap-4 animate-in fade-in duration-200"
                      >
                        {/* Row Top Details */}
                        <div className="flex items-center justify-between gap-4">
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) => handleUpdateRow(row.id, { name: e.target.value })}
                            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-red flex-1"
                            placeholder="Name/Location (e.g. Dinding Lt 1)"
                          />

                          <div className="flex items-center gap-3">
                            <select
                              value={row.formulaType}
                              onChange={(e: any) =>
                                handleUpdateRow(row.id, { formulaType: e.target.value })
                              }
                              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-brand-red cursor-pointer font-medium"
                            >
                              {unitCategory === "VOLUME" && (
                                <>
                                  <option value="BOX">Kotak / Ruang (P x L x T)</option>
                                  <option value="TRAPEZOIDAL">Trapesium (Pondasi)</option>
                                  <option value="COLUMN_BEAM">Kolom / Balok</option>
                                </>
                              )}
                              {unitCategory === "AREA" && (
                                <option value="AREA">Luas Area (P x L)</option>
                              )}
                              {unitCategory === "LINE" && (
                                <option value="LINE">Panjang Linier (P)</option>
                              )}
                              <option value="MANUAL">Manual Input</option>
                            </select>

                            <button
                              onClick={() => handleRemoveRow(row.id)}
                              className="p-2 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-200 dark:hover:border-red-900 hover:text-brand-red text-neutral-400 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Row Calculation Inputs */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 items-end">
                          {row.formulaType === "BOX" && (
                            <>
                              <div className="space-y-1">
                                <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">
                                  Panjang (m)
                                </label>
                                <Input
                                  type="number"
                                  value={row.length || ""}
                                  onChange={(e) =>
                                    handleUpdateRow(row.id, { length: Number(e.target.value) })
                                  }
                                  className="h-8 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-xs text-neutral-950 dark:text-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">
                                  Lebar (m)
                                </label>
                                <Input
                                  type="number"
                                  value={row.width || ""}
                                  onChange={(e) =>
                                    handleUpdateRow(row.id, { width: Number(e.target.value) })
                                  }
                                  className="h-8 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-xs text-neutral-950 dark:text-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">
                                  Tinggi (m)
                                </label>
                                <Input
                                  type="number"
                                  value={row.height || ""}
                                  onChange={(e) =>
                                    handleUpdateRow(row.id, { height: Number(e.target.value) })
                                  }
                                  className="h-8 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-xs text-neutral-950 dark:text-white"
                                />
                              </div>
                            </>
                          )}

                          {row.formulaType === "TRAPEZOIDAL" && (
                            <>
                              <div className="space-y-1">
                                <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">
                                  Lebar Atas (m)
                                </label>
                                <Input
                                  type="number"
                                  value={row.topWidth || ""}
                                  onChange={(e) =>
                                    handleUpdateRow(row.id, { topWidth: Number(e.target.value) })
                                  }
                                  className="h-8 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-xs text-neutral-950 dark:text-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">
                                  Lebar Bawah (m)
                                </label>
                                <Input
                                  type="number"
                                  value={row.bottomWidth || ""}
                                  onChange={(e) =>
                                    handleUpdateRow(row.id, {
                                      bottomWidth: Number(e.target.value),
                                    })
                                  }
                                  className="h-8 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-xs text-neutral-950 dark:text-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">
                                  Tinggi (m)
                                </label>
                                <Input
                                  type="number"
                                  value={row.height || ""}
                                  onChange={(e) =>
                                    handleUpdateRow(row.id, { height: Number(e.target.value) })
                                  }
                                  className="h-8 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-xs text-neutral-950 dark:text-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">
                                  Panjang (m)
                                </label>
                                <Input
                                  type="number"
                                  value={row.length || ""}
                                  onChange={(e) =>
                                    handleUpdateRow(row.id, { length: Number(e.target.value) })
                                  }
                                  className="h-8 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-xs text-neutral-950 dark:text-white"
                                />
                              </div>
                            </>
                          )}

                          {row.formulaType === "COLUMN_BEAM" && (
                            <>
                              <div className="space-y-1">
                                <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">
                                  Lebar Penampang (m)
                                </label>
                                <Input
                                  type="number"
                                  value={row.width || ""}
                                  onChange={(e) =>
                                    handleUpdateRow(row.id, { width: Number(e.target.value) })
                                  }
                                  className="h-8 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-xs text-neutral-950 dark:text-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">
                                  Tinggi Penampang (m)
                                </label>
                                <Input
                                  type="number"
                                  value={row.height || ""}
                                  onChange={(e) =>
                                    handleUpdateRow(row.id, { height: Number(e.target.value) })
                                  }
                                  className="h-8 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-xs text-neutral-950 dark:text-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">
                                  Panjang Total (m)
                                </label>
                                <Input
                                  type="number"
                                  value={row.length || ""}
                                  onChange={(e) =>
                                    handleUpdateRow(row.id, { length: Number(e.target.value) })
                                  }
                                  className="h-8 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-xs text-neutral-950 dark:text-white"
                                />
                              </div>
                            </>
                          )}

                          {row.formulaType === "AREA" && (
                            <>
                              <div className="space-y-1">
                                <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">
                                  Panjang (m)
                                </label>
                                <Input
                                  type="number"
                                  value={row.length || ""}
                                  onChange={(e) =>
                                    handleUpdateRow(row.id, { length: Number(e.target.value) })
                                  }
                                  className="h-8 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-xs text-neutral-950 dark:text-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">
                                  Lebar (m)
                                </label>
                                <Input
                                  type="number"
                                  value={row.width || ""}
                                  onChange={(e) =>
                                    handleUpdateRow(row.id, { width: Number(e.target.value) })
                                  }
                                  className="h-8 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-xs text-neutral-950 dark:text-white"
                                />
                              </div>
                            </>
                          )}

                          {row.formulaType === "LINE" && (
                            <div className="space-y-1 col-span-2">
                              <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">
                                Panjang (m)
                              </label>
                              <Input
                                  type="number"
                                  value={row.length || ""}
                                  onChange={(e) =>
                                    handleUpdateRow(row.id, { length: Number(e.target.value) })
                                  }
                                  className="h-8 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-xs text-neutral-950 dark:text-white"
                              />
                            </div>
                          )}

                          {row.formulaType === "MANUAL" && (
                            <div className="space-y-1 col-span-2">
                              <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">
                                Nilai Input ({selectedWbsUnit})
                              </label>
                              <Input
                                type="number"
                                value={row.manualVolume || ""}
                                onChange={(e) =>
                                  handleUpdateRow(row.id, {
                                    manualVolume: Number(e.target.value),
                                  })
                                }
                                className="h-8 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-xs text-neutral-950 dark:text-white"
                              />
                            </div>
                          )}

                          <div className="space-y-1">
                            <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">
                              Jumlah (Qty)
                            </label>
                            <Input
                              type="number"
                              value={row.count || 1}
                              onChange={(e) =>
                                  handleUpdateRow(row.id, { count: Number(e.target.value) })
                              }
                              className="h-8 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-xs text-neutral-950 dark:text-white font-mono font-semibold"
                            />
                          </div>

                          <div className="space-y-1 col-span-2 sm:col-span-1 text-right pr-2">
                            <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider block mb-2">
                              Subtotal
                            </span>
                            <span className="text-xs font-bold text-neutral-900 dark:text-white font-mono">
                              {row.volume.toLocaleString("id-ID")} {selectedWbsUnit}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary Footer */}
                <div className="p-6 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/20 dark:bg-neutral-950/20 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Aggregated Total</span>
                    <div className="text-xl font-black text-neutral-950 dark:text-white font-mono mt-0.5">
                      {totalVolume.toLocaleString("id-ID")}{" "}
                      <span className="text-xs text-neutral-400 dark:text-neutral-500 font-normal">
                        {selectedWbsUnit}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500 font-medium flex items-center gap-1">
                      Applied to RAB WBS <ArrowRight size={12} />
                    </span>
                    <span className="font-mono bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-lg text-xs font-bold text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                      {totalVolume.toLocaleString("id-ID")} {selectedWbsUnit}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-neutral-400">
                <Calculator size={40} className="text-neutral-300 dark:text-neutral-750 animate-pulse" />
                <h3 className="text-sm font-bold text-neutral-700 dark:text-neutral-300 mt-4">
                  No WBS Item Selected
                </h3>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1 max-w-xs">
                  Select a leaf node from the left WBS Navigator tree to start calculations.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
